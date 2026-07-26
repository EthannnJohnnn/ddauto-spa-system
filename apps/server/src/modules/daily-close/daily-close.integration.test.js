import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const BUSINESS_DATE = '2026-07-26';
const OWNER = { username: 'owner', displayName: 'Owner', password: 'SecureOwner123' };

describe('daily close API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication to view a business date', async () => {
    const response = await request(app).get(`/api/v1/daily-close/daily?date=${BUSINESS_DATE}`);
    expect(response.status).toBe(401);
  });

  it('snapshots finalized totals, locks source ledgers, and preserves reopen history', async () => {
    const context = await createContext(app);
    const ticket = await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        vehicleClassId: context.vehicleClassId,
        items: [
          {
            serviceId: context.serviceId,
            amountCentavos: 50_000,
            employeeIds: [context.employeeId],
          },
        ],
      });
    expect(ticket.status).toBe(201);

    const blockedBeforePayroll = await context.owner.agent
      .post('/api/v1/daily-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE });
    expect(blockedBeforePayroll.status).toBe(409);
    expect(blockedBeforePayroll.body.error.code).toBe('DAILY_CLOSE_PAYROLL_OPEN');

    const payroll = await context.owner.agent
      .post('/api/v1/payroll/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, closeNote: 'Paid' });
    expect(payroll.status).toBe(201);

    const expense = await context.owner.agent
      .post('/api/v1/purchases-expenses/expenses')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        categoryId: context.utilityCategoryId,
        description: 'Water bill',
        amountCentavos: 1_000,
      });
    expect(expense.status).toBe(201);

    const closed = await context.owner.agent
      .post('/api/v1/daily-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, closeNote: 'Owner reconciled the day' });
    expect(closed.status).toBe(201);
    expect(closed.body).toMatchObject({ businessDate: BUSINESS_DATE, isClosed: true });
    expect(closed.body.runs[0]).toMatchObject({
      status: 'CLOSED',
      payrollCentavos: 40_000,
      mealCentavos: 5_000,
      closeNote: 'Owner reconciled the day',
      summary: {
        serviceSalesCentavos: 50_000,
        totalSalesCentavos: 50_000,
        expenseCentavos: 46_000,
        cashMovementCentavos: 4_000,
      },
    });

    const lockedTicket = await context.owner.agent
      .post(`/api/v1/service-sales/tickets/${ticket.body.id}/void`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: 'Correction' });
    expect(lockedTicket.status).toBe(409);
    expect(lockedTicket.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');

    const lockedExpense = await context.owner.agent
      .post(`/api/v1/purchases-expenses/expenses/${expense.body.id}/void`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: 'Correction' });
    expect(lockedExpense.status).toBe(409);
    expect(lockedExpense.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');

    const lockedTireDocument = await context.owner.agent
      .post('/api/v1/tire-inventory/documents')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        documentType: 'SALE',
        businessDate: BUSINESS_DATE,
        items: [{ productId: context.tireProductId, quantity: 1 }],
      });
    expect(lockedTireDocument.status).toBe(409);
    expect(lockedTireDocument.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');

    const lockedCanteenDocument = await context.owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        documentType: 'SALE',
        businessDate: BUSINESS_DATE,
        items: [{ productId: context.canteenProductId, quantity: 1 }],
      });
    expect(lockedCanteenDocument.status).toBe(409);
    expect(lockedCanteenDocument.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');

    const lockedPayroll = await context.owner.agent
      .post('/api/v1/payroll/reopen')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, reason: 'Correction' });
    expect(lockedPayroll.status).toBe(409);
    expect(lockedPayroll.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');

    const reopened = await context.owner.agent
      .post('/api/v1/daily-close/reopen')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, reason: 'Correct the water bill' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.isClosed).toBe(false);
    expect(reopened.body.runs[0]).toMatchObject({
      status: 'REOPENED',
      reopenReason: 'Correct the water bill',
    });

    const payrollReopened = await context.owner.agent
      .post('/api/v1/payroll/reopen')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, reason: 'Correct assignment' });
    expect(payrollReopened.status).toBe(200);
    expect(payrollReopened.body.isClosed).toBe(false);

    const auditActions = database
      .prepare("SELECT action FROM audit_events WHERE action LIKE 'DAILY_CLOSE_%' ORDER BY id")
      .all()
      .map((row) => row.action);
    expect(auditActions).toEqual(['DAILY_CLOSE_COMPLETED', 'DAILY_CLOSE_REOPENED']);
  });
});

async function createContext(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  const owner = { agent, csrfToken: setup.body.csrfToken };
  const employee = await agent
    .post('/api/v1/catalogs/employees')
    .set('x-csrf-token', owner.csrfToken)
    .send({
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      receivesLaborShare: true,
      isSpecialist: true,
    });
  const vehicle = await agent
    .post('/api/v1/catalogs/vehicle-classes')
    .set('x-csrf-token', owner.csrfToken)
    .send({ name: 'Sedan', sortOrder: 10 });
  const catalogs = await agent.get('/api/v1/catalogs');
  const service = catalogs.body.services.find((entry) => entry.name === 'Carwash');
  const expenses = await agent.get(
    `/api/v1/purchases-expenses/overview?start=${BUSINESS_DATE}&end=${BUSINESS_DATE}&purchaseSource=ALL`,
  );
  const tireProduct = await agent
    .post('/api/v1/tire-inventory/products')
    .set('x-csrf-token', owner.csrfToken)
    .send({
      name: 'Test Tire',
      category: 'FOUR_WHEEL',
      tireType: 'Tubeless',
      size: '155/70R13',
      currentCostCentavos: 20_000,
      sellingPriceCentavos: 30_000,
      lowStockThreshold: 1,
    });
  const canteenProduct = await agent
    .post('/api/v1/canteen-inventory/products')
    .set('x-csrf-token', owner.csrfToken)
    .send({
      name: 'Water',
      category: 'DRINK',
      currentCostCentavos: 1_000,
      sellingPriceCentavos: 2_000,
      lowStockThreshold: 5,
    });
  return {
    owner,
    employeeId: employee.body.id,
    vehicleClassId: vehicle.body.id,
    serviceId: service.id,
    utilityCategoryId: expenses.body.categories.find((entry) => entry.name === 'Utilities').id,
    tireProductId: tireProduct.body.id,
    canteenProductId: canteenProduct.body.id,
  };
}
