import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const OWNER = {
  username: 'owner',
  displayName: 'Owner',
  password: 'owner123',
};
const BUSINESS_DATE = '2026-07-21';

describe('payroll closing API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication to read payroll', async () => {
    const response = await request(app).get(`/api/v1/payroll/daily?date=${BUSINESS_DATE}`);
    expect(response.status).toBe(401);
  });

  it('snapshots payroll, creates protected expenses, locks the date, and reopens safely', async () => {
    const context = await createBusinessContext(app);
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

    const categories = await context.owner.agent.get(
      `/api/v1/purchases-expenses/overview?start=${BUSINESS_DATE}&end=${BUSINESS_DATE}&purchaseSource=ALL`,
    );
    const salaryCategory = categories.body.categories.find(
      (category) => category.name === 'Salaries',
    );
    const renamedCategory = await context.owner.agent
      .patch(`/api/v1/purchases-expenses/categories/${salaryCategory.id}`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ name: 'Employee Wages' });
    expect(renamedCategory.status).toBe(200);

    const manualPayrollExpense = await context.owner.agent
      .post('/api/v1/purchases-expenses/expenses')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        categoryId: salaryCategory.id,
        description: 'Duplicate payroll',
        amountCentavos: 40_000,
      });
    expect(manualPayrollExpense.status).toBe(409);
    expect(manualPayrollExpense.body.error.code).toBe('SYSTEM_EXPENSE_CATEGORY_RESERVED');

    const closed = await context.owner.agent
      .post('/api/v1/payroll/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, closeNote: 'Owner checked payroll' });

    expect(closed.status).toBe(201);
    expect(closed.body).toMatchObject({ businessDate: BUSINESS_DATE, isClosed: true });
    expect(closed.body.runs[0]).toMatchObject({
      status: 'CLOSED',
      totalSalaryCentavos: 40_000,
      totalMealCentavos: 5_000,
      closeNote: 'Owner checked payroll',
    });
    expect(closed.body.runs[0].items[0]).toMatchObject({
      employeeName: 'Orlan',
      laborEarnedCentavos: 20_000,
      fixedTopUpCentavos: 20_000,
      totalPayCentavos: 40_000,
      mealCostCentavos: 5_000,
    });
    expect(closed.body.runs[0].generatedExpenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'PAYROLL',
          categoryName: 'Employee Wages',
          amountCentavos: 40_000,
          status: 'ACTIVE',
        }),
        expect.objectContaining({
          sourceType: 'STAFF_MEAL',
          amountCentavos: 5_000,
          status: 'ACTIVE',
        }),
      ]),
    );

    const duplicateClose = await context.owner.agent
      .post('/api/v1/payroll/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE });
    expect(duplicateClose.status).toBe(409);
    expect(duplicateClose.body.error.code).toBe('PAYROLL_ALREADY_CLOSED');

    const editLocked = await context.owner.agent
      .patch(`/api/v1/service-sales/tickets/${ticket.body.id}`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        vehicleClassId: context.vehicleClassId,
        items: [
          {
            serviceId: context.serviceId,
            amountCentavos: 60_000,
            employeeIds: [context.employeeId],
          },
        ],
      });
    expect(editLocked.status).toBe(409);
    expect(editLocked.body.error.code).toBe('PAYROLL_DATE_CLOSED');

    const overview = await context.owner.agent.get(
      `/api/v1/purchases-expenses/overview?start=${BUSINESS_DATE}&end=${BUSINESS_DATE}&purchaseSource=ALL`,
    );
    expect(overview.body.summary.expenseTotalCentavos).toBe(45_000);

    const payrollExpense = closed.body.runs[0].generatedExpenses.find(
      (expense) => expense.sourceType === 'PAYROLL',
    );
    const protectedMutation = await context.owner.agent
      .post(`/api/v1/purchases-expenses/expenses/${payrollExpense.id}/void`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: 'Wrong workflow' });
    expect(protectedMutation.status).toBe(409);
    expect(protectedMutation.body.error.code).toBe('SYSTEM_EXPENSE_LOCKED');

    const reopened = await context.owner.agent
      .post('/api/v1/payroll/reopen')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE, reason: 'Correct employee assignment' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.isClosed).toBe(false);
    expect(reopened.body.runs[0].status).toBe('REOPENED');
    expect(
      reopened.body.runs[0].generatedExpenses.every((expense) => expense.status === 'VOIDED'),
    ).toBe(true);

    const editAfterReopen = await context.owner.agent
      .patch(`/api/v1/service-sales/tickets/${ticket.body.id}`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        vehicleClassId: context.vehicleClassId,
        items: [
          {
            serviceId: context.serviceId,
            amountCentavos: 60_000,
            employeeIds: [context.employeeId],
          },
        ],
      });
    expect(editAfterReopen.status).toBe(200);

    const reclosed = await context.owner.agent
      .post('/api/v1/payroll/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ businessDate: BUSINESS_DATE });
    expect(reclosed.status).toBe(201);
    expect(reclosed.body.runs).toHaveLength(2);
    expect(reclosed.body.runs[0].status).toBe('CLOSED');
    expect(reclosed.body.runs[1].status).toBe('REOPENED');
    expect(database.prepare('SELECT COUNT(*) AS count FROM payroll_runs').get().count).toBe(2);
  });
});

async function createBusinessContext(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
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

  return {
    owner,
    employeeId: employee.body.id,
    vehicleClassId: vehicle.body.id,
    serviceId: service.id,
  };
}
