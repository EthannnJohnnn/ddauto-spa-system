import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const OWNER = {
  username: 'owner',
  displayName: 'Owner',
  password: 'SecureOwner123',
};

describe('combined reports API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication and validates the reporting range', async () => {
    const unauthenticated = await request(app).get(
      '/api/v1/reports/overview?start=2026-07-01&end=2026-07-31',
    );
    expect(unauthenticated.status).toBe(401);

    const owner = await createOwnerAgent(app);
    const invalid = await owner.get('/api/v1/reports/overview?start=2026-07-31&end=2026-07-01');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('combines source ledgers without double-counting purchases or voided records', async () => {
    const owner = await createOwnerAgent(app);
    seedReportData(database);

    const response = await owner.get('/api/v1/reports/overview?start=2026-07-20&end=2026-07-21');

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      serviceSalesCentavos: 100_000,
      tireSalesCentavos: 50_000,
      canteenSalesCentavos: 10_000,
      totalSalesCentavos: 160_000,
      productCostCentavos: 34_000,
      externalLaborCentavos: 10_000,
      purchaseCentavos: 25_000,
      expenseCentavos: 48_000,
      estimatedGrossProfitCentavos: 116_000,
      estimatedNetCentavos: 68_000,
      cashMovementCentavos: 77_000,
      serviceTransactionCount: 1,
      tireTransactionCount: 1,
      canteenTransactionCount: 1,
    });
    expect(response.body.dailyBreakdown).toHaveLength(2);
    expect(response.body.dailyBreakdown[0]).toMatchObject({
      businessDate: '2026-07-21',
      totalSalesCentavos: 0,
      hasActivity: false,
    });
    expect(response.body.dailyBreakdown[1]).toMatchObject({
      businessDate: '2026-07-20',
      totalSalesCentavos: 160_000,
      estimatedNetCentavos: 68_000,
      hasActivity: true,
    });
    expect(response.body.transactions.serviceSales).toHaveLength(1);
    expect(response.body.transactions.tireSales).toHaveLength(2);
    expect(response.body.transactions.canteenSales).toHaveLength(1);
    expect(response.body.operationalAlerts.tireLowStock).toEqual([
      expect.objectContaining({ name: 'Test Tire', stockQuantity: -1 }),
    ]);
    expect(response.body.operationalAlerts.canteenLowStock).toEqual([
      expect.objectContaining({ name: 'Water', stockQuantity: -1 }),
    ]);
    expect(response.body.operationalAlerts.equipmentAttention).toEqual([]);
    expect(response.body.activityDayCount).toBe(1);
  });
});

async function createOwnerAgent(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
  return agent;
}

function seedReportData(database) {
  const now = '2026-07-20T12:00:00.000Z';
  const ownerId = database.prepare("SELECT id FROM users WHERE username = 'owner'").get().id;
  const vehicleClassId = Number(
    database
      .prepare(
        `INSERT INTO vehicle_classes (name, sort_order, created_at, updated_at)
         VALUES ('Sedan', 10, ?, ?)`,
      )
      .run(now, now).lastInsertRowid,
  );
  const carwashId = database.prepare("SELECT id FROM services WHERE name = 'Carwash'").get().id;
  const paintingId = database.prepare("SELECT id FROM services WHERE name = 'Painting'").get().id;
  const ticketId = Number(
    database
      .prepare(
        `INSERT INTO service_tickets (
          business_date, customer_sequence, vehicle_class_id, vehicle_class_name_snapshot,
          vehicle_description, created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES ('2026-07-20', 1, ?, 'Sedan', 'Test vehicle', ?, ?, ?, ?)`,
      )
      .run(vehicleClassId, ownerId, ownerId, now, now).lastInsertRowid,
  );
  const insertServiceItem = database.prepare(
    `INSERT INTO service_ticket_items (
      ticket_id, service_id, service_name_snapshot, labor_policy_snapshot,
      labor_rate_basis_points_snapshot, amount_centavos, labor_pool_centavos,
      external_contractor_name, external_labor_cost_centavos, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertServiceItem.run(
    ticketId,
    carwashId,
    'Carwash',
    'ORDINARY',
    4000,
    70_000,
    28_000,
    '',
    0,
    now,
  );
  insertServiceItem.run(
    ticketId,
    paintingId,
    'Painting',
    'EXTERNAL',
    0,
    30_000,
    10_000,
    'Painter',
    10_000,
    now,
  );

  const tireProductId = Number(
    database
      .prepare(
        `INSERT INTO tire_products (
          name, category, current_cost_centavos, selling_price_centavos, created_at, updated_at
        ) VALUES ('Test Tire', 'FOUR_WHEEL', 15000, 25000, ?, ?)`,
      )
      .run(now, now).lastInsertRowid,
  );
  const tireSaleId = insertInventoryDocument(database, 'tire_inventory_documents', {
    type: 'SALE',
    sequence: 1,
    ownerId,
    now,
  });
  insertTireItem(database, tireSaleId, tireProductId, 2, -2, 15_000, 25_000, 50_000, now);
  const voidedTireSaleId = insertInventoryDocument(database, 'tire_inventory_documents', {
    type: 'SALE',
    sequence: 2,
    status: 'VOIDED',
    ownerId,
    now,
  });
  insertTireItem(database, voidedTireSaleId, tireProductId, 1, -1, 15_000, 99_000, 99_000, now);
  const tirePurchaseId = insertInventoryDocument(database, 'tire_inventory_documents', {
    type: 'PURCHASE',
    sequence: 1,
    ownerId,
    now,
  });
  insertTireItem(database, tirePurchaseId, tireProductId, 1, 1, 20_000, 0, 20_000, now);

  const canteenProductId = Number(
    database
      .prepare(
        `INSERT INTO canteen_products (
          name, category, current_cost_centavos, selling_price_centavos, created_at, updated_at
        ) VALUES ('Water', 'DRINK', 2000, 5000, ?, ?)`,
      )
      .run(now, now).lastInsertRowid,
  );
  const canteenSaleId = insertInventoryDocument(database, 'canteen_inventory_documents', {
    type: 'SALE',
    sequence: 1,
    ownerId,
    now,
  });
  insertCanteenItem(database, canteenSaleId, canteenProductId, 2, -2, 2_000, 5_000, 10_000, now);
  const canteenPurchaseId = insertInventoryDocument(database, 'canteen_inventory_documents', {
    type: 'PURCHASE',
    sequence: 1,
    ownerId,
    now,
  });
  insertCanteenItem(database, canteenPurchaseId, canteenProductId, 1, 1, 5_000, 0, 5_000, now);

  insertExpense(database, ownerId, 'Salaries', 'PAYROLL', 40_000, 'ACTIVE', now);
  insertExpense(database, ownerId, 'Staff Meals', 'STAFF_MEAL', 5_000, 'ACTIVE', now);
  insertExpense(database, ownerId, 'Utilities', 'MANUAL', 3_000, 'ACTIVE', now);
  insertExpense(database, ownerId, 'Other', 'MANUAL', 9_000, 'VOIDED', now);
}

function insertInventoryDocument(database, tableName, input) {
  return Number(
    database
      .prepare(
        `INSERT INTO ${tableName} (
          document_type, business_date, document_sequence, status,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, '2026-07-20', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.type,
        input.sequence,
        input.status ?? 'ACTIVE',
        input.ownerId,
        input.ownerId,
        input.now,
        input.now,
      ).lastInsertRowid,
  );
}

function insertTireItem(database, documentId, productId, quantity, delta, cost, price, total, now) {
  database
    .prepare(
      `INSERT INTO tire_inventory_document_items (
        document_id, product_id, product_name_snapshot, category_snapshot,
        quantity, stock_delta, unit_cost_centavos_snapshot, unit_price_centavos_snapshot,
        line_total_centavos, created_at
      ) VALUES (?, ?, 'Test Tire', 'FOUR_WHEEL', ?, ?, ?, ?, ?, ?)`,
    )
    .run(documentId, productId, quantity, delta, cost, price, total, now);
}

function insertCanteenItem(
  database,
  documentId,
  productId,
  quantity,
  delta,
  cost,
  price,
  total,
  now,
) {
  database
    .prepare(
      `INSERT INTO canteen_inventory_document_items (
        document_id, product_id, product_name_snapshot, category_snapshot,
        quantity, stock_delta, unit_cost_centavos_snapshot, unit_price_centavos_snapshot,
        line_total_centavos, created_at
      ) VALUES (?, ?, 'Water', 'DRINK', ?, ?, ?, ?, ?, ?)`,
    )
    .run(documentId, productId, quantity, delta, cost, price, total, now);
}

function insertExpense(database, ownerId, categoryName, sourceType, amount, status, now) {
  const category = database
    .prepare('SELECT id, name FROM expense_categories WHERE name = ?')
    .get(categoryName);
  database
    .prepare(
      `INSERT INTO expense_transactions (
        business_date, category_id, category_name_snapshot, description, amount_centavos,
        source_type, status, created_by_user_id, updated_by_user_id, created_at, updated_at
      ) VALUES ('2026-07-20', ?, ?, 'Report fixture', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(category.id, category.name, amount, sourceType, status, ownerId, ownerId, now, now);
}
