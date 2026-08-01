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

describe('business catalogs API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({
      database,
      runtimeConfig: { nodeEnv: 'test', secureCookies: false },
    });
  });

  afterEach(() => {
    database.close();
  });

  it('requires authentication and starts with the workbook service categories', async () => {
    const unauthorized = await request(app).get('/api/v1/catalogs');
    expect(unauthorized.status).toBe(401);

    const owner = await createOwnerAgent(app);
    const response = await owner.agent.get('/api/v1/catalogs');

    expect(response.status).toBe(200);
    expect(response.body.services.map((service) => service.name)).toEqual([
      'Carwash',
      'Graphene/Ceramic',
      'Painting',
      'Detailing',
      'Vulcanizing/Tire Change',
    ]);
    expect(
      response.body.services.filter((service) => service.laborRule === 'SPECIALIST'),
    ).toHaveLength(2);
    expect(response.body.setupProgress.isComplete).toBe(false);
  });

  it('creates the employee, vehicle class, and price foundation with audit history', async () => {
    const owner = await createOwnerAgent(app);
    const employee = await owner.agent
      .post('/api/v1/catalogs/employees')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        displayName: 'Orlan',
        fixedDailyRateCentavos: 40_000,
        receivesLaborShare: true,
        isSpecialist: true,
      });
    expect(employee.status).toBe(201);
    expect(employee.body).toMatchObject({
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      isSpecialist: true,
    });

    const duplicateSpecialist = await owner.agent
      .post('/api/v1/catalogs/employees')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        displayName: 'Another Specialist',
        fixedDailyRateCentavos: 0,
        receivesLaborShare: true,
        isSpecialist: true,
      });
    expect(duplicateSpecialist.status).toBe(409);
    expect(duplicateSpecialist.body.error.code).toBe('ACTIVE_SPECIALIST_EXISTS');

    const vehicleClass = await owner.agent
      .post('/api/v1/catalogs/vehicle-classes')
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Sedan', sortOrder: 10 });
    expect(vehicleClass.status).toBe(201);

    const catalogs = await owner.agent.get('/api/v1/catalogs');
    const carwash = catalogs.body.services.find((service) => service.name === 'Carwash');
    const price = await owner.agent
      .put('/api/v1/catalogs/service-prices')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        serviceId: carwash.id,
        vehicleClassId: vehicleClass.body.id,
        amountCentavos: 15_000,
      });
    expect(price.status).toBe(200);
    expect(price.body.amountCentavos).toBe(15_000);

    const completed = await owner.agent.get('/api/v1/catalogs');
    expect(completed.body.setupProgress).toMatchObject({
      activeEmployees: 1,
      activeVehicleClasses: 1,
      configuredActivePrices: 1,
      isComplete: true,
    });
    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS count
           FROM audit_events
           WHERE action IN ('EMPLOYEE_CREATED', 'VEHICLE_CLASS_CREATED', 'SERVICE_PRICE_CREATED')`,
        )
        .get().count,
    ).toBe(3);
  });

  it('edits and archives/restores catalogs instead of deleting records', async () => {
    const owner = await createOwnerAgent(app);
    const created = await owner.agent
      .post('/api/v1/catalogs/vehicle-classes')
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'SUV', sortOrder: 20 });

    const updated = await owner.agent
      .patch(`/api/v1/catalogs/vehicle-classes/${created.body.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Large SUV' });
    expect(updated.body.name).toBe('Large SUV');

    const archived = await owner.agent
      .post(`/api/v1/catalogs/vehicle-classes/${created.body.id}/archive`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: '' });
    expect(archived.status).toBe(200);
    expect(archived.body.isActive).toBe(false);

    const restored = await owner.agent
      .post(`/api/v1/catalogs/vehicle-classes/${created.body.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: '' });
    expect(restored.body.isActive).toBe(true);
    expect(database.prepare('SELECT COUNT(*) AS count FROM vehicle_classes').get().count).toBe(1);
  });

  it('allows staff to read catalogs but blocks every owner mutation', async () => {
    await createOwnerAgent(app);
    const staffPassword = 'SecureStaff123';
    const passwordRecord = await hashPassword(staffPassword);
    const now = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO users (
          username, display_name, password_hash, password_salt, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'STAFF', ?, ?)`,
      )
      .run('staff', 'Staff Member', passwordRecord.hash, passwordRecord.salt, now, now);

    const staffAgent = request.agent(app);
    const login = await staffAgent.post('/api/v1/auth/login').send({
      username: 'staff',
      password: staffPassword,
    });
    expect(login.status).toBe(200);

    const read = await staffAgent.get('/api/v1/catalogs');
    expect(read.status).toBe(200);

    const write = await staffAgent
      .post('/api/v1/catalogs/vehicle-classes')
      .set('x-csrf-token', login.body.csrfToken)
      .send({ name: 'Sedan', sortOrder: 10 });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('OWNER_REQUIRED');
  });
});

async function createOwnerAgent(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);

  expect(setup.status).toBe(201);
  return { agent, csrfToken: setup.body.csrfToken };
}
