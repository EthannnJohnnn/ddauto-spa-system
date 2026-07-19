import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';
import { hashPassword } from '../auth/auth.crypto.js';

const OWNER = {
  username: 'owner',
  displayName: 'Owner',
  password: 'SecureOwner123',
};
const BUSINESS_DATE = '2026-07-19';

describe('service sales API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication for daily service data', async () => {
    const response = await request(app).get(`/api/v1/service-sales/daily?date=${BUSINESS_DATE}`);
    expect(response.status).toBe(401);
  });

  it('records a multi-service ticket and calculates regular, specialist, and external labor', async () => {
    const context = await createBusinessContext(app);
    const response = await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        vehicleClassId: context.vehicleClassId,
        vehicleDescription: 'Toyota Vios',
        plateNumber: 'TEST-123',
        notes: 'Phase 4 calculation check',
        items: [
          {
            serviceId: context.services.Carwash,
            amountCentavos: 30_000,
            employeeIds: [context.employees.orlan, context.employees.orlie, context.employees.tj],
          },
          {
            serviceId: context.services.Detailing,
            amountCentavos: 600_000,
          },
          {
            serviceId: context.services.Painting,
            amountCentavos: 500_000,
            externalContractorName: 'Dodong',
            externalLaborCostCentavos: 100_000,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.customerSequence).toBe(1);
    expect(response.body.totalCentavos).toBe(1_130_000);
    expect(response.body.items.find((item) => item.serviceName === 'Painting')).toMatchObject({
      laborPolicy: 'EXTERNAL',
      externalContractorName: 'Dodong',
      externalLaborCostCentavos: 100_000,
    });

    const daily = await context.owner.agent.get(
      `/api/v1/service-sales/daily?date=${BUSINESS_DATE}`,
    );
    expect(daily.status).toBe(200);
    expect(daily.body.summary).toMatchObject({
      activeTicketCount: 1,
      totalSalesCentavos: 1_130_000,
      regularLaborCentavos: 192_000,
      fixedTopUpsCentavos: 0,
      totalPayrollCentavos: 192_000,
      mealCostCentavos: 15_000,
      externalLaborCentavos: 100_000,
      remainingAfterRecordedLaborAndMealsCentavos: 823_000,
    });
    expect(daily.body.payroll.find((entry) => entry.employeeName === 'Orlan')).toMatchObject({
      laborEarnedCentavos: 184_000,
      fixedTopUpCentavos: 0,
      totalPayCentavos: 184_000,
    });
    expect(daily.body.attendance.filter((entry) => entry.isPresent)).toHaveLength(3);
  });

  it('uses Orlan’s ₱400 as a minimum and divides the ordinary pool by assigned workers', async () => {
    const context = await createBusinessContext(app);
    await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        vehicleClassId: context.vehicleClassId,
        items: [
          {
            serviceId: context.services.Carwash,
            amountCentavos: 254_000,
            employeeIds: [context.employees.orlan, context.employees.orlie, context.employees.tj],
          },
        ],
      });

    const daily = await context.owner.agent.get(
      `/api/v1/service-sales/daily?date=${BUSINESS_DATE}`,
    );
    const orlan = daily.body.payroll.find((entry) => entry.employeeName === 'Orlan');
    expect(orlan).toMatchObject({
      laborEarnedCentavos: 33_867,
      fixedTopUpCentavos: 6_133,
      totalPayCentavos: 40_000,
    });
    expect(
      daily.body.payroll.map((entry) => [entry.employeeName, entry.laborEarnedCentavos]),
    ).toEqual([
      ['Orlan', 33_867],
      ['Orlie', 33_867],
      ['TJ', 33_866],
    ]);
    expect(daily.body.summary.regularLaborCentavos).toBe(101_600);
  });

  it('keeps daily customer sequencing, prevents false absence, and audits void/restore', async () => {
    const context = await createBusinessContext(app);
    const payload = {
      businessDate: BUSINESS_DATE,
      vehicleClassId: context.vehicleClassId,
      items: [
        {
          serviceId: context.services.Carwash,
          amountCentavos: 20_000,
          employeeIds: [context.employees.orlie],
        },
      ],
    };
    const first = await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send(payload);
    const second = await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send(payload);
    expect([first.body.customerSequence, second.body.customerSequence]).toEqual([1, 2]);

    const updated = await context.owner.agent
      .patch(`/api/v1/service-sales/tickets/${second.body.id}`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        ...payload,
        vehicleDescription: 'Updated vehicle',
        items: [{ ...payload.items[0], amountCentavos: 25_000 }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      customerSequence: 2,
      vehicleDescription: 'Updated vehicle',
      totalCentavos: 25_000,
    });

    const absent = await context.owner.agent
      .put('/api/v1/service-sales/attendance')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        employeeId: context.employees.orlie,
        isPresent: false,
        mealCostCentavos: 0,
      });
    expect(absent.status).toBe(409);
    expect(absent.body.error.code).toBe('EMPLOYEE_HAS_WORK');

    const voided = await context.owner.agent
      .post(`/api/v1/service-sales/tickets/${first.body.id}/void`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: 'Duplicate entry' });
    expect(voided.body.status).toBe('VOIDED');

    const restored = await context.owner.agent
      .post(`/api/v1/service-sales/tickets/${first.body.id}/restore`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: 'Confirmed valid sale' });
    expect(restored.body.status).toBe('ACTIVE');
    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS count FROM audit_events
           WHERE action IN ('SERVICE_TICKET_VOIDED', 'SERVICE_TICKET_RESTORED')`,
        )
        .get().count,
    ).toBe(2);
    expect(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM audit_events WHERE action = 'SERVICE_TICKET_UPDATED'",
        )
        .get().count,
    ).toBe(1);
  });

  it('allows staff to read the daily board but blocks service-sale mutations', async () => {
    await createOwnerAgent(app);
    const password = 'SecureStaff123';
    const passwordRecord = await hashPassword(password);
    const now = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO users (
          username, display_name, password_hash, password_salt, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'STAFF', ?, ?)`,
      )
      .run('staff', 'Staff Member', passwordRecord.hash, passwordRecord.salt, now, now);
    const staff = request.agent(app);
    const login = await staff.post('/api/v1/auth/login').send({ username: 'staff', password });
    expect(login.status).toBe(200);

    const read = await staff.get(`/api/v1/service-sales/daily?date=${BUSINESS_DATE}`);
    expect(read.status).toBe(200);

    const write = await staff
      .put('/api/v1/service-sales/attendance')
      .set('x-csrf-token', login.body.csrfToken)
      .send({
        businessDate: BUSINESS_DATE,
        employeeId: 1,
        isPresent: true,
        mealCostCentavos: 5_000,
      });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('OWNER_REQUIRED');
  });
});

async function createBusinessContext(app) {
  const owner = await createOwnerAgent(app);
  const employees = {};
  for (const employee of [
    {
      key: 'orlan',
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      receivesLaborShare: true,
      isSpecialist: true,
    },
    {
      key: 'orlie',
      displayName: 'Orlie',
      fixedDailyRateCentavos: 0,
      receivesLaborShare: true,
      isSpecialist: false,
    },
    {
      key: 'tj',
      displayName: 'TJ',
      fixedDailyRateCentavos: 0,
      receivesLaborShare: true,
      isSpecialist: false,
    },
  ]) {
    const { key, ...employeePayload } = employee;
    const response = await owner.agent
      .post('/api/v1/catalogs/employees')
      .set('x-csrf-token', owner.csrfToken)
      .send(employeePayload);
    employees[key] = response.body.id;
  }

  const vehicle = await owner.agent
    .post('/api/v1/catalogs/vehicle-classes')
    .set('x-csrf-token', owner.csrfToken)
    .send({ name: 'Sedan', sortOrder: 10 });
  const catalogs = await owner.agent.get('/api/v1/catalogs');
  const services = Object.fromEntries(
    catalogs.body.services.map((service) => [service.name, service.id]),
  );

  return { owner, employees, vehicleClassId: vehicle.body.id, services };
}

async function createOwnerAgent(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
  return { agent, csrfToken: setup.body.csrfToken };
}
