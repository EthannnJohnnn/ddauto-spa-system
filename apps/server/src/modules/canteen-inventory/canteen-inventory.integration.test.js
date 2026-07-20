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

describe('canteen inventory API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication for the canteen inventory overview', async () => {
    const response = await request(app).get(
      '/api/v1/canteen-inventory/overview?start=2026-07-01&end=2026-07-31',
    );
    expect(response.status).toBe(401);
  });

  it('tracks beginning inventory, purchases, sales, values, and period summaries', async () => {
    const owner = await createOwnerAgent(app);
    const product = await createProduct(owner, {
      name: 'C2 Apple',
      category: 'DRINK',
      currentCostCentavos: 1_321,
      sellingPriceCentavos: 2_500,
      lowStockThreshold: 2,
      beginningInventory: {
        businessDate: '2026-07-01',
        quantity: 4,
        unitCostCentavos: 1_321,
      },
    });
    expect(product.stockQuantity).toBe(4);

    const purchase = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('PURCHASE', product.id, 3, { unitCostCentavos: 1_400 }));
    expect(purchase.status).toBe(201);
    expect(purchase.body.totalCentavos).toBe(4_200);

    const sale = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('SALE', product.id, 2, { unitPriceCentavos: 2_500 }));
    expect(sale.status).toBe(201);
    expect(sale.body.items[0]).toMatchObject({
      stockDelta: -2,
      unitCostCentavos: 1_321,
      unitPriceCentavos: 2_500,
      lineTotalCentavos: 5_000,
    });

    const overview = await owner.agent.get(
      '/api/v1/canteen-inventory/overview?start=2026-07-01&end=2026-07-31',
    );
    expect(overview.status).toBe(200);
    expect(overview.body.products[0].stockQuantity).toBe(5);
    expect(overview.body.summary).toMatchObject({
      canteenSalesCentavos: 5_000,
      canteenUnitsSold: 2,
      estimatedCostOfGoodsCentavos: 2_642,
      estimatedGrossProfitCentavos: 2_358,
      purchaseCostCentavos: 4_200,
      purchasedUnits: 3,
      beginningUnits: 4,
      inventoryUnits: 5,
      inventoryCostValueCentavos: 6_605,
    });
  });

  it('supports owner edits and audited void/restore without allowing negative stock', async () => {
    const owner = await createOwnerAgent(app);
    const product = await createProduct(owner, {
      name: 'Sky Flakes',
      category: 'SNACK',
      currentCostCentavos: 800,
      sellingPriceCentavos: 1_500,
      lowStockThreshold: 2,
      beginningInventory: {
        businessDate: '2026-07-01',
        quantity: 4,
        unitCostCentavos: 800,
      },
    });
    const purchase = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('PURCHASE', product.id, 3));
    const sale = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('SALE', product.id, 5));

    const unsafeVoid = await owner.agent
      .post(`/api/v1/canteen-inventory/documents/${purchase.body.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Testing stock guard' });
    expect(unsafeVoid.status).toBe(409);
    expect(unsafeVoid.body.error.code).toBe('INSUFFICIENT_CANTEEN_STOCK');

    const editedSale = await owner.agent
      .patch(`/api/v1/canteen-inventory/documents/${sale.body.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('SALE', product.id, 2));
    expect(editedSale.status).toBe(200);
    expect(editedSale.body.items[0].stockDelta).toBe(-2);

    const voided = await owner.agent
      .post(`/api/v1/canteen-inventory/documents/${purchase.body.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Purchase entered twice' });
    expect(voided.status).toBe(200);
    expect(voided.body.status).toBe('VOIDED');

    const restored = await owner.agent
      .post(`/api/v1/canteen-inventory/documents/${purchase.body.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Purchase was valid' });
    expect(restored.status).toBe(200);
    expect(restored.body.status).toBe('ACTIVE');

    const adjustment = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        ...documentPayload('ADJUSTMENT', product.id, -1),
        notes: 'One damaged snack removed',
      });
    expect(adjustment.status).toBe(201);
    expect(adjustment.body.items[0].stockDelta).toBe(-1);

    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS count FROM audit_events
           WHERE action IN (
             'CANTEEN_DOCUMENT_UPDATED', 'CANTEEN_DOCUMENT_VOIDED', 'CANTEEN_DOCUMENT_RESTORED'
           )`,
        )
        .get().count,
    ).toBe(3);
  });

  it('prevents duplicate beginning inventory and protects owner-only mutations', async () => {
    const owner = await createOwnerAgent(app);
    const product = await createProduct(owner, {
      name: 'Wilkins Water',
      category: 'DRINK',
      currentCostCentavos: 1_063,
      sellingPriceCentavos: 2_500,
      lowStockThreshold: 1,
      beginningInventory: {
        businessDate: '2026-07-01',
        quantity: 1,
        unitCostCentavos: 1_063,
      },
    });

    const duplicate = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('BEGINNING', product.id, 1));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('BEGINNING_INVENTORY_EXISTS');

    const updated = await owner.agent
      .patch(`/api/v1/canteen-inventory/products/${product.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ sellingPriceCentavos: 2_600, lowStockThreshold: 2 });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ sellingPriceCentavos: 2_600, lowStockThreshold: 2 });

    const archived = await owner.agent
      .post(`/api/v1/canteen-inventory/products/${product.id}/archive`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Temporarily unavailable' });
    expect(archived.body.isActive).toBe(false);
    const archivedSale = await owner.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', owner.csrfToken)
      .send(documentPayload('SALE', product.id, 1));
    expect(archivedSale.status).toBe(409);
    expect(archivedSale.body.error.code).toBe('CANTEEN_PRODUCT_ARCHIVED');
    const restored = await owner.agent
      .post(`/api/v1/canteen-inventory/products/${product.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Product is available again' });
    expect(restored.body.isActive).toBe(true);

    const staff = await createStaffAgent(database, app);
    const read = await staff.agent.get(
      '/api/v1/canteen-inventory/overview?start=2026-07-01&end=2026-07-31',
    );
    expect(read.status).toBe(200);
    const write = await staff.agent
      .post('/api/v1/canteen-inventory/documents')
      .set('x-csrf-token', staff.csrfToken)
      .send(documentPayload('SALE', product.id, 1));
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('OWNER_REQUIRED');
  });
});

function documentPayload(documentType, productId, quantity, itemOverrides = {}) {
  const day = documentType === 'PURCHASE' ? '02' : documentType === 'SALE' ? '03' : '01';
  return {
    documentType,
    businessDate: `2026-07-${day}`,
    counterpartyName: documentType === 'SALE' ? 'Walk-in customer' : 'Local supplier',
    referenceNumber: '',
    notes: documentType === 'ADJUSTMENT' ? 'Stock count correction' : '',
    items: [{ productId, quantity, ...itemOverrides }],
  };
}

async function createProduct(owner, values) {
  const response = await owner.agent
    .post('/api/v1/canteen-inventory/products')
    .set('x-csrf-token', owner.csrfToken)
    .send(values);
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
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ username: 'staff', password });
  expect(login.status).toBe(200);
  return { agent, csrfToken: login.body.csrfToken };
}
