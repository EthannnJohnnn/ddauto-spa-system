import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';
import { hashPassword } from '../auth/auth.crypto.js';

const OWNER = {
  username: 'owner',
  displayName: 'Owner',
  password: 'owner123',
};

describe('purchases and expenses API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication for the overview', async () => {
    const response = await request(app).get(overviewUrl());
    expect(response.status).toBe(401);
  });

  it('manages categories and audited expense edit, void, and restore workflows', async () => {
    const owner = await createOwnerAgent(app);
    const initialOverview = await owner.agent.get(overviewUrl());
    expect(initialOverview.status).toBe(200);
    expect(initialOverview.body.categories).toHaveLength(10);

    const createdCategory = await owner.agent
      .post('/api/v1/purchases-expenses/categories')
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Security Services' });
    expect(createdCategory.status).toBe(201);
    expect(createdCategory.body).toMatchObject({ name: 'Security Services', isActive: true });

    const expense = await owner.agent
      .post('/api/v1/purchases-expenses/expenses')
      .set('x-csrf-token', owner.csrfToken)
      .send(expensePayload(createdCategory.body.id, 15_000));
    expect(expense.status).toBe(201);
    expect(expense.body).toMatchObject({
      categoryName: 'Security Services',
      amountCentavos: 15_000,
      status: 'ACTIVE',
      sourceType: 'MANUAL',
    });

    const renamedCategory = await owner.agent
      .patch(`/api/v1/purchases-expenses/categories/${createdCategory.body.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Security & Safety' });
    expect(renamedCategory.body.name).toBe('Security & Safety');

    const updatedExpense = await owner.agent
      .patch(`/api/v1/purchases-expenses/expenses/${expense.body.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send(expensePayload(createdCategory.body.id, 18_500, { notes: 'Adjusted invoice' }));
    expect(updatedExpense.body).toMatchObject({
      categoryName: 'Security Services',
      amountCentavos: 18_500,
      notes: 'Adjusted invoice',
    });

    const archivedCategory = await owner.agent
      .post(`/api/v1/purchases-expenses/categories/${createdCategory.body.id}/archive`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Not currently needed' });
    expect(archivedCategory.body.isActive).toBe(false);

    const blockedNewExpense = await owner.agent
      .post('/api/v1/purchases-expenses/expenses')
      .set('x-csrf-token', owner.csrfToken)
      .send(expensePayload(createdCategory.body.id, 1_000));
    expect(blockedNewExpense.status).toBe(409);
    expect(blockedNewExpense.body.error.code).toBe('EXPENSE_CATEGORY_ARCHIVED');

    const voided = await owner.agent
      .post(`/api/v1/purchases-expenses/expenses/${expense.body.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Invoice was duplicated' });
    expect(voided.body).toMatchObject({ status: 'VOIDED', voidReason: 'Invoice was duplicated' });
    let overview = await owner.agent.get(overviewUrl());
    expect(overview.body.summary).toMatchObject({ expenseTotalCentavos: 0, activeExpenseCount: 0 });

    const restored = await owner.agent
      .post(`/api/v1/purchases-expenses/expenses/${expense.body.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Confirmed as a valid invoice' });
    expect(restored.body).toMatchObject({ status: 'ACTIVE', voidReason: null });
    overview = await owner.agent.get(overviewUrl());
    expect(overview.body.summary).toMatchObject({
      expenseTotalCentavos: 18_500,
      activeExpenseCount: 1,
      combinedOutflowCentavos: 18_500,
    });
    expect(overview.body.summary.expensesByCategory).toEqual([
      { categoryName: 'Security Services', totalCentavos: 18_500, count: 1 },
    ]);

    const restoredCategory = await owner.agent
      .post(`/api/v1/purchases-expenses/categories/${createdCategory.body.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Services resumed' });
    expect(restoredCategory.body.isActive).toBe(true);

    const actions = database
      .prepare(
        `SELECT action FROM audit_events
         WHERE entity_type IN ('EXPENSE_CATEGORY', 'EXPENSE_TRANSACTION')
         ORDER BY id`,
      )
      .all()
      .map((row) => row.action);
    expect(actions).toEqual([
      'EXPENSE_CATEGORY_CREATED',
      'EXPENSE_CREATED',
      'EXPENSE_CATEGORY_UPDATED',
      'EXPENSE_UPDATED',
      'EXPENSE_CATEGORY_ARCHIVED',
      'EXPENSE_VOIDED',
      'EXPENSE_RESTORED',
      'EXPENSE_CATEGORY_RESTORED',
    ]);
  });

  it('aggregates tire and canteen purchases with independent filters and active totals', async () => {
    const owner = await createOwnerAgent(app);
    const tire = await createTireProduct(owner);
    const canteen = await createCanteenProduct(owner);

    const tirePurchase = await owner.agent
      .post('/api/v1/tire-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        documentType: 'PURCHASE',
        businessDate: '2026-07-10',
        counterpartyName: 'Tire Supplier',
        referenceNumber: 'T-100',
        vehicleDescription: '',
        plateNumber: '',
        notes: '',
        items: [{ productId: tire.id, quantity: 2, unitCostCentavos: 90_000 }],
      });
    expect(tirePurchase.status).toBe(201);

    const canteenPurchase = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        documentType: 'PURCHASE',
        businessDate: '2026-07-11',
        counterpartyName: 'Snack Supplier',
        referenceNumber: 'C-100',
        notes: '',
        items: [{ productId: canteen.id, quantity: 10, unitCostCentavos: 1_000 }],
      });
    expect(canteenPurchase.status).toBe(201);

    const all = await owner.agent.get(overviewUrl('ALL'));
    expect(all.status).toBe(200);
    expect(all.body.purchases.map((purchase) => purchase.source)).toEqual(['CANTEEN', 'TIRE']);
    expect(all.body.summary).toMatchObject({
      purchaseTotalCentavos: 190_000,
      activePurchaseCount: 2,
      tirePurchaseTotalCentavos: 180_000,
      tirePurchaseCount: 1,
      canteenPurchaseTotalCentavos: 10_000,
      canteenPurchaseCount: 1,
      combinedOutflowCentavos: 190_000,
    });

    const daily = await owner.agent.get(
      '/api/v1/purchases-expenses/overview?start=2026-07-10&end=2026-07-10&purchaseSource=ALL',
    );
    expect(daily.body.purchases).toHaveLength(1);
    expect(daily.body.purchases[0].source).toBe('TIRE');
    expect(daily.body.summary.purchaseTotalCentavos).toBe(180_000);

    const tiresOnly = await owner.agent.get(overviewUrl('TIRE'));
    expect(tiresOnly.body.purchases).toHaveLength(1);
    expect(tiresOnly.body.purchases[0]).toMatchObject({
      id: `TIRE:${tirePurchase.body.id}`,
      source: 'TIRE',
      supplier: 'Tire Supplier',
      totalCentavos: 180_000,
    });
    expect(tiresOnly.body.summary.canteenPurchaseTotalCentavos).toBe(0);

    const canteenOnly = await owner.agent.get(overviewUrl('CANTEEN'));
    expect(canteenOnly.body.purchases).toHaveLength(1);
    expect(canteenOnly.body.purchases[0]).toMatchObject({
      id: `CANTEEN:${canteenPurchase.body.id}`,
      source: 'CANTEEN',
      supplier: 'Snack Supplier',
      totalCentavos: 10_000,
    });

    const voided = await owner.agent
      .post(`/api/v1/canteen-inventory/documents/${canteenPurchase.body.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Supplier invoice was cancelled' });
    expect(voided.status).toBe(200);
    const afterVoid = await owner.agent.get(overviewUrl('ALL'));
    expect(afterVoid.body.purchases).toHaveLength(2);
    expect(afterVoid.body.summary).toMatchObject({
      purchaseTotalCentavos: 180_000,
      activePurchaseCount: 1,
      canteenPurchaseTotalCentavos: 0,
    });
  });

  it('allows authenticated reads but restricts mutations to the owner with CSRF', async () => {
    const owner = await createOwnerAgent(app);
    const missingCsrf = await owner.agent
      .post('/api/v1/purchases-expenses/categories')
      .send({ name: 'Insurance' });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe('INVALID_CSRF_TOKEN');

    const staff = await createStaffAgent(database, app);
    const read = await staff.agent.get(overviewUrl());
    expect(read.status).toBe(200);
    const write = await staff.agent
      .post('/api/v1/purchases-expenses/categories')
      .set('x-csrf-token', staff.csrfToken)
      .send({ name: 'Insurance' });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('OWNER_REQUIRED');
  });
});

function overviewUrl(purchaseSource = 'ALL') {
  return `/api/v1/purchases-expenses/overview?start=2026-07-01&end=2026-07-31&purchaseSource=${purchaseSource}`;
}

function expensePayload(categoryId, amountCentavos, overrides = {}) {
  return {
    businessDate: '2026-07-12',
    categoryId,
    description: 'Night security service',
    payee: 'Local Security',
    referenceNumber: 'EXP-100',
    amountCentavos,
    notes: '',
    ...overrides,
  };
}

async function createTireProduct(owner) {
  const response = await owner.agent
    .post('/api/v1/tire-inventory/products')
    .set('x-csrf-token', owner.csrfToken)
    .send({
      name: 'Test Tire',
      category: 'FOUR_WHEEL',
      tireType: 'TUBELESS',
      size: '185/65R15',
      currentCostCentavos: 90_000,
      sellingPriceCentavos: 120_000,
      lowStockThreshold: 1,
    });
  expect(response.status).toBe(201);
  return response.body;
}

async function createCanteenProduct(owner) {
  const response = await owner.agent
    .post('/api/v1/canteen-inventory/products')
    .set('x-csrf-token', owner.csrfToken)
    .send({
      name: 'Test Water',
      category: 'DRINK',
      currentCostCentavos: 1_000,
      sellingPriceCentavos: 2_000,
      lowStockThreshold: 2,
    });
  expect(response.status).toBe(201);
  return response.body;
}

async function createOwnerAgent(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
  return { agent, csrfToken: setup.body.csrfToken };
}

async function createStaffAgent(database, app) {
  const password = 'staff123';
  const passwordRecord = await hashPassword(password);
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO users (
        username, display_name, password_hash, password_salt, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'STAFF', ?, ?)`,
    )
    .run('staff', 'Staff Member', passwordRecord.hash, passwordRecord.salt, now, now);
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ username: 'staff', password });
  expect(login.status).toBe(200);
  return { agent, csrfToken: login.body.csrfToken };
}
