import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const DATE = '2026-07-29';
const OWNER = { username: 'owner', displayName: 'Owner', password: 'SecureOwner123' };

describe('equipment API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });
  afterEach(() => database.close());

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/equipment/overview');
    expect(response.status).toBe(401);
  });

  it('manages individual assets, categories, and synchronized protected expenses', async () => {
    const owner = await setupOwner(app);
    const initial = await owner.agent.get('/api/v1/equipment/overview');
    const towels = initial.body.categories.find((category) => category.name === 'Towels');

    const batch = await owner.agent
      .post('/api/v1/equipment/batches')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        businessDate: DATE,
        categoryId: towels.id,
        name: 'Microfiber Towel',
        quantity: 3,
        assetCodePrefix: 'TOWEL',
        description: 'Blue drying towel',
        condition: 'GOOD',
        conditionCheckedOn: DATE,
        unitCostCentavos: 1_000,
        supplier: 'Local Supplier',
        referenceNumber: 'INV-1',
        notes: 'Opening equipment batch',
      });
    expect(batch.status).toBe(201);
    expect(batch.body.items.map((item) => item.assetCode)).toEqual([
      'TOWEL-001',
      'TOWEL-002',
      'TOWEL-003',
    ]);

    const overview = await owner.agent.get('/api/v1/equipment/overview');
    expect(overview.body.summary).toMatchObject({
      activeCount: 3,
      goodCount: 3,
      acquisitionValueCentavos: 3_000,
    });
    const first = overview.body.items[0];

    const edited = await owner.agent
      .patch(`/api/v1/equipment/items/${first.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({
        categoryId: towels.id,
        name: first.name,
        assetCode: 'TOWEL-BLUE-01',
        description: first.description,
        condition: 'NEEDS_ATTENTION',
        conditionCheckedOn: DATE,
        notes: 'Small tear',
      });
    expect(edited.body).toMatchObject({ assetCode: 'TOWEL-BLUE-01', condition: 'NEEDS_ATTENTION' });

    const repair = await owner.agent
      .post(`/api/v1/equipment/items/${first.id}/repairs`)
      .set('x-csrf-token', owner.csrfToken)
      .send({
        businessDate: DATE,
        amountCentavos: 5_000,
        description: 'Repaired towel stitching',
        payee: 'Repair Shop',
        referenceNumber: 'REP-1',
        notes: '',
        resultingCondition: 'GOOD',
      });
    expect(repair.status).toBe(201);
    expect(repair.body).toMatchObject({ amountCentavos: 5_000, expenseStatus: 'ACTIVE' });

    const expenses = await owner.agent.get(
      `/api/v1/purchases-expenses/overview?start=${DATE}&end=${DATE}&purchaseSource=ALL`,
    );
    expect(expenses.body.expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: 'EQUIPMENT_PURCHASE', amountCentavos: 3_000 }),
        expect.objectContaining({ sourceType: 'EQUIPMENT_REPAIR', amountCentavos: 5_000 }),
      ]),
    );

    const purchaseExpense = expenses.body.expenses.find(
      (expense) => expense.sourceType === 'EQUIPMENT_PURCHASE',
    );
    const blockedManualEdit = await owner.agent
      .post(`/api/v1/purchases-expenses/expenses/${purchaseExpense.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Wrong workflow' });
    expect(blockedManualEdit.status).toBe(409);
    expect(blockedManualEdit.body.error.code).toBe('SYSTEM_EXPENSE_LOCKED');

    const batchEdited = await owner.agent
      .patch(`/api/v1/equipment/batches/${batch.body.batchId}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({
        businessDate: DATE,
        unitCostCentavos: 1_200,
        supplier: 'Local Supplier',
        referenceNumber: 'INV-1-CORRECTED',
        notes: 'Corrected unit cost',
      });
    expect(batchEdited.status).toBe(200);
    expect(
      database
        .prepare('SELECT amount_centavos FROM expense_transactions WHERE id = ?')
        .get(purchaseExpense.id).amount_centavos,
    ).toBe(3_600);

    const archived = await owner.agent
      .post(`/api/v1/equipment/items/${first.id}/archive`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Retired from use' });
    expect(archived.body.isActive).toBe(false);
    const restored = await owner.agent
      .post(`/api/v1/equipment/items/${first.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Returned to service' });
    expect(restored.body.isActive).toBe(true);

    const voidedRepair = await owner.agent
      .post(`/api/v1/equipment/repairs/${repair.body.id}/void`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Duplicate repair record' });
    expect(voidedRepair.body).toMatchObject({ status: 'VOIDED', expenseStatus: 'VOIDED' });

    const actions = database
      .prepare("SELECT action FROM audit_events WHERE action LIKE 'EQUIPMENT_%'")
      .all()
      .map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'EQUIPMENT_BATCH_CREATED',
        'EQUIPMENT_ITEM_UPDATED',
        'EQUIPMENT_REPAIR_CREATED',
        'EQUIPMENT_ITEM_ARCHIVED',
        'EQUIPMENT_ITEM_RESTORED',
        'EQUIPMENT_REPAIR_VOIDED',
      ]),
    );
  });

  it('blocks dated equipment costs after Daily Close', async () => {
    const owner = await setupOwner(app);
    const overview = await owner.agent.get('/api/v1/equipment/overview');
    const category = overview.body.categories[0];
    await owner.agent
      .post('/api/v1/daily-close/close')
      .set('x-csrf-token', owner.csrfToken)
      .send({ businessDate: DATE });
    const blocked = await owner.agent
      .post('/api/v1/equipment/batches')
      .set('x-csrf-token', owner.csrfToken)
      .send({
        businessDate: DATE,
        categoryId: category.id,
        name: 'Pressure Washer',
        quantity: 1,
        assetCodePrefix: 'PW',
        description: '',
        condition: 'GOOD',
        conditionCheckedOn: DATE,
        unitCostCentavos: 50_000,
        supplier: '',
        referenceNumber: '',
        notes: '',
      });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('DAILY_CLOSE_DATE_CLOSED');
  });
});

async function setupOwner(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
  return { agent, csrfToken: setup.body.csrfToken };
}
