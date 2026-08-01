import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const DATES = ['2026-07-01', '2026-07-02', '2026-07-03'];
const OWNER = {
  username: 'owner',
  displayName: 'Owner',
  password: 'SecureOwner123',
};

describe('Period Close API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('closes reviewed employee days as one paid period and reopens the whole range', async () => {
    const context = await createContext(app);
    await createDays(context);

    const adjusted = await context.owner.agent
      .put('/api/v1/service-sales/attendance')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: DATES[1],
        employeeId: context.employeeId,
        isPresent: true,
        mealCostCentavos: 5_000,
        salaryOverrideCentavos: 45_000,
      });
    expect(adjusted.status).toBe(200);
    const needsReview = await context.owner.agent.get(
      '/api/v1/period-close/preview?start=2026-07-01&end=2026-07-03',
    );
    expect(needsReview.body.canClose).toBe(false);
    expect(needsReview.body.unreviewedDates).toEqual([DATES[1]]);
    await reviewDate(context, DATES[1]);

    const preview = await context.owner.agent.get(
      '/api/v1/period-close/preview?start=2026-07-01&end=2026-07-03',
    );
    expect(preview.status).toBe(200);
    expect(preview.body.canClose).toBe(true);
    expect(preview.body.summary.totalSalaryCentavos).toBe(135_000);
    expect(preview.body.employeeTotals[0]).toMatchObject({
      employeeName: 'Orlan',
      salaryCentavos: 135_000,
      dayCount: 3,
    });

    const closed = await context.owner.agent
      .post('/api/v1/period-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ start: DATES[0], end: DATES[2], closeNote: '' });
    expect(closed.status).toBe(201);
    expect(closed.body).toMatchObject({
      status: 'CLOSED',
      start: DATES[0],
      end: DATES[2],
      totalSalaryCentavos: 135_000,
      totalMealCentavos: 15_000,
    });

    const attendance = await context.owner.agent.get('/api/v1/attendance/open?through=2026-07-03');
    expect(attendance.body.unpaidSalaryCentavos).toBe(0);
    expect(attendance.body.days.every((day) => day.status === 'PAID')).toBe(true);

    const expenses = database
      .prepare(
        `SELECT business_date, source_type, amount_centavos, status
         FROM expense_transactions WHERE period_close_run_id = ?
         ORDER BY business_date, source_type`,
      )
      .all(closed.body.id);
    expect(expenses.filter((expense) => expense.source_type === 'PAYROLL')).toEqual([
      expect.objectContaining({
        business_date: DATES[0],
        amount_centavos: 40_000,
        status: 'ACTIVE',
      }),
      expect.objectContaining({
        business_date: DATES[1],
        amount_centavos: 45_000,
        status: 'ACTIVE',
      }),
      expect.objectContaining({
        business_date: DATES[2],
        amount_centavos: 50_000,
        status: 'ACTIVE',
      }),
    ]);

    const report = await context.owner.agent.get(
      '/api/v1/reports/overview?start=2026-07-01&end=2026-07-03',
    );
    expect(report.body.summary).toMatchObject({
      salaryCentavos: 135_000,
      mealCentavos: 15_000,
      expenseCentavos: 150_000,
    });
    expect(report.body.dailyBreakdown.every((day) => day.periodCloseStatus === 'PAID')).toBe(true);

    const locked = await context.owner.agent
      .put('/api/v1/service-sales/attendance')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate: DATES[1],
        employeeId: context.employeeId,
        isPresent: true,
        mealCostCentavos: 5_000,
        salaryOverrideCentavos: 60_000,
      });
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe('PERIOD_CLOSE_DATE_CLOSED');

    const reopened = await context.owner.agent
      .post(`/api/v1/period-close/${closed.body.id}/reopen`)
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ reason: '' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.status).toBe('REOPENED');
    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS count FROM expense_transactions
           WHERE period_close_run_id = ? AND status = 'ACTIVE'`,
        )
        .get(closed.body.id).count,
    ).toBe(0);

    const openAgain = await context.owner.agent.get('/api/v1/attendance/open?through=2026-07-03');
    expect(openAgain.body.unpaidSalaryCentavos).toBe(135_000);
    expect(openAgain.body.days.every((day) => !day.reviewed)).toBe(true);
  });

  it('requires review, supports a partial close, and leaves other dates unpaid', async () => {
    const context = await createContext(app);
    await createDays(context, { review: false });

    const blocked = await context.owner.agent
      .post('/api/v1/period-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ start: DATES[0], end: DATES[0] });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PERIOD_CLOSE_REVIEW_REQUIRED');

    await reviewDate(context, DATES[0]);
    const partial = await context.owner.agent
      .post('/api/v1/period-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ start: DATES[0], end: DATES[0] });
    expect(partial.status).toBe(201);

    const attendance = await context.owner.agent.get('/api/v1/attendance/open?through=2026-07-03');
    expect(attendance.body.unpaidSalaryCentavos).toBe(95_000);
    expect(attendance.body.days.find((day) => day.businessDate === DATES[0]).status).toBe('PAID');
    expect(attendance.body.days.find((day) => day.businessDate === DATES[1]).status).toBe('OPEN');
  });

  it('accepts salary overrides above, below, equal to, and at zero', async () => {
    const context = await createContext(app);
    await createDays(context, { review: false });
    const values = [0, 30_000, 40_000];
    for (let index = 0; index < DATES.length; index += 1) {
      const updated = await context.owner.agent
        .put('/api/v1/service-sales/attendance')
        .set('x-csrf-token', context.owner.csrfToken)
        .send({
          businessDate: DATES[index],
          employeeId: context.employeeId,
          isPresent: true,
          mealCostCentavos: 5_000,
          salaryOverrideCentavos: values[index],
        });
      expect(updated.status).toBe(200);
      expect(updated.body.payroll[0]).toMatchObject({
        calculatedSalaryCentavos: 40_000,
        salaryOverrideCentavos: values[index],
        totalPayCentavos: values[index],
      });
    }
  });

  it('rejects ranges longer than 31 days and overlapping active closes', async () => {
    const context = await createContext(app);
    await createDays(context);
    for (const [end, dayCount] of [
      ['2026-07-05', 5],
      ['2026-07-07', 7],
      ['2026-07-31', 31],
    ]) {
      const range = await context.owner.agent.get(
        `/api/v1/period-close/preview?start=2026-07-01&end=${end}`,
      );
      expect(range.status).toBe(200);
      expect(range.body.period.dayCount).toBe(dayCount);
    }
    const closed = await context.owner.agent
      .post('/api/v1/period-close/close')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({ start: DATES[0], end: DATES[2] });
    expect(closed.status).toBe(201);

    const overlap = await context.owner.agent.get(
      '/api/v1/period-close/preview?start=2026-07-02&end=2026-07-04',
    );
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('PERIOD_CLOSE_OVERLAP');

    const tooLong = await context.owner.agent.get(
      '/api/v1/period-close/preview?start=2026-06-01&end=2026-07-02',
    );
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('PERIOD_CLOSE_TOO_LONG');

    const future = await context.owner.agent.get(
      '/api/v1/period-close/preview?start=2026-08-02&end=2026-08-02',
    );
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe('PERIOD_CLOSE_FUTURE_DATE');
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
  return {
    owner,
    employeeId: employee.body.id,
    vehicleClassId: vehicle.body.id,
    serviceId: catalogs.body.services.find((service) => service.name === 'Carwash').id,
  };
}

async function createDays(context, { review = true } = {}) {
  const overrides = [null, 45_000, 50_000];
  for (let index = 0; index < DATES.length; index += 1) {
    const businessDate = DATES[index];
    const ticket = await context.owner.agent
      .post('/api/v1/service-sales/tickets')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate,
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
    const attendance = await context.owner.agent
      .put('/api/v1/service-sales/attendance')
      .set('x-csrf-token', context.owner.csrfToken)
      .send({
        businessDate,
        employeeId: context.employeeId,
        isPresent: true,
        mealCostCentavos: 5_000,
        salaryOverrideCentavos: overrides[index],
      });
    expect(attendance.status).toBe(200);
    if (review) await reviewDate(context, businessDate);
  }
}

async function reviewDate(context, businessDate) {
  const response = await context.owner.agent
    .post('/api/v1/attendance/review')
    .set('x-csrf-token', context.owner.csrfToken)
    .send({ businessDate, reviewed: true });
  expect(response.status).toBe(200);
}
