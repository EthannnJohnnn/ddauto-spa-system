export class EquipmentRepository {
  constructor(database) {
    this.database = database;
  }
  transaction(work) {
    return this.database.transaction(work)();
  }
  listCategories() {
    return this.database
      .prepare(
        'SELECT * FROM equipment_categories ORDER BY is_active DESC, name COLLATE NOCASE, id',
      )
      .all();
  }
  findCategory(id) {
    return this.database.prepare('SELECT * FROM equipment_categories WHERE id = ?').get(id);
  }
  findCategoryByName(name, excludeId = 0) {
    return this.database
      .prepare('SELECT * FROM equipment_categories WHERE name = ? COLLATE NOCASE AND id <> ?')
      .get(name, excludeId);
  }
  createCategory(name, now) {
    return Number(
      this.database
        .prepare('INSERT INTO equipment_categories (name, created_at, updated_at) VALUES (?, ?, ?)')
        .run(name, now, now).lastInsertRowid,
    );
  }
  updateCategory(id, name, now) {
    this.database
      .prepare('UPDATE equipment_categories SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, id);
  }
  setCategoryActive(id, isActive, now) {
    this.database
      .prepare('UPDATE equipment_categories SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, id);
  }

  listItems({ search, categoryId, condition, includeArchived }) {
    return this.database
      .prepare(
        `SELECT item.*, batch.business_date AS purchase_date,
      batch.unit_cost_centavos, batch.supplier, batch.reference_number,
      category.name AS category_name
      FROM equipment_items item
      JOIN equipment_purchase_batches batch ON batch.id = item.purchase_batch_id
      JOIN equipment_categories category ON category.id = item.category_id
      WHERE (? = 1 OR item.is_active = 1)
        AND (? IS NULL OR item.category_id = ?)
        AND (? IS NULL OR item.condition = ?)
        AND (? = '' OR item.name LIKE '%' || ? || '%' COLLATE NOCASE OR item.asset_code LIKE '%' || ? || '%' COLLATE NOCASE)
      ORDER BY item.is_active DESC, item.name COLLATE NOCASE, item.asset_code COLLATE NOCASE`,
      )
      .all(
        Number(includeArchived),
        categoryId ?? null,
        categoryId ?? null,
        condition ?? null,
        condition ?? null,
        search,
        search,
        search,
      );
  }
  findItem(id) {
    return this.database
      .prepare(
        `SELECT item.*, batch.business_date AS purchase_date, batch.unit_cost_centavos, batch.supplier, batch.reference_number, category.name AS category_name FROM equipment_items item JOIN equipment_purchase_batches batch ON batch.id = item.purchase_batch_id JOIN equipment_categories category ON category.id = item.category_id WHERE item.id = ?`,
      )
      .get(id);
  }
  findItemByCode(code, excludeId = 0) {
    return this.database
      .prepare('SELECT * FROM equipment_items WHERE asset_code = ? COLLATE NOCASE AND id <> ?')
      .get(code, excludeId);
  }
  codeExists(code) {
    return Boolean(
      this.database
        .prepare('SELECT 1 FROM equipment_items WHERE asset_code = ? COLLATE NOCASE')
        .get(code),
    );
  }
  createBatch(input) {
    return Number(
      this.database
        .prepare(
          `INSERT INTO equipment_purchase_batches (business_date, category_id, category_name_snapshot, item_name_snapshot, quantity, unit_cost_centavos, supplier, reference_number, notes, created_by_user_id, updated_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.businessDate,
          input.categoryId,
          input.categoryName,
          input.name,
          input.quantity,
          input.unitCostCentavos,
          input.supplier,
          input.referenceNumber,
          input.notes,
          input.actorUserId,
          input.actorUserId,
          input.now,
          input.now,
        ).lastInsertRowid,
    );
  }
  findBatch(id) {
    return this.database.prepare('SELECT * FROM equipment_purchase_batches WHERE id = ?').get(id);
  }
  updateBatch(id, input) {
    this.database
      .prepare(
        `UPDATE equipment_purchase_batches SET business_date = ?, unit_cost_centavos = ?, supplier = ?, reference_number = ?, notes = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.businessDate,
        input.unitCostCentavos,
        input.supplier,
        input.referenceNumber,
        input.notes,
        input.actorUserId,
        input.now,
        id,
      );
  }
  createItem(input) {
    return Number(
      this.database
        .prepare(
          `INSERT INTO equipment_items (purchase_batch_id, category_id, name, asset_code, description, condition, condition_checked_on, notes, created_by_user_id, updated_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.batchId,
          input.categoryId,
          input.name,
          input.assetCode,
          input.description,
          input.condition,
          input.conditionCheckedOn,
          input.notes,
          input.actorUserId,
          input.actorUserId,
          input.now,
          input.now,
        ).lastInsertRowid,
    );
  }
  updateItem(id, input) {
    this.database
      .prepare(
        `UPDATE equipment_items SET category_id = ?, name = ?, asset_code = ?, description = ?, condition = ?, condition_checked_on = ?, notes = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.categoryId,
        input.name,
        input.assetCode,
        input.description,
        input.condition,
        input.conditionCheckedOn,
        input.notes,
        input.actorUserId,
        input.now,
        id,
      );
  }
  updateItemCondition(id, condition, checkedOn, actorUserId, now) {
    this.database
      .prepare(
        'UPDATE equipment_items SET condition = ?, condition_checked_on = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?',
      )
      .run(condition, checkedOn, actorUserId, now, id);
  }
  setItemActive(id, isActive, now, actorUserId) {
    this.database
      .prepare(
        'UPDATE equipment_items SET is_active = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?',
      )
      .run(Number(isActive), actorUserId, now, id);
  }

  listRepairs() {
    return this.database
      .prepare(
        `SELECT repair.*, item.name AS equipment_name, item.asset_code, expense.id AS expense_id, expense.status AS expense_status FROM equipment_repairs repair JOIN equipment_items item ON item.id = repair.equipment_item_id LEFT JOIN expense_transactions expense ON expense.equipment_repair_id = repair.id ORDER BY repair.business_date DESC, repair.id DESC`,
      )
      .all();
  }
  findRepair(id) {
    return this.database
      .prepare(
        `SELECT repair.*, item.name AS equipment_name, item.asset_code, expense.id AS expense_id, expense.status AS expense_status FROM equipment_repairs repair JOIN equipment_items item ON item.id = repair.equipment_item_id LEFT JOIN expense_transactions expense ON expense.equipment_repair_id = repair.id WHERE repair.id = ?`,
      )
      .get(id);
  }
  createRepair(input) {
    return Number(
      this.database
        .prepare(
          `INSERT INTO equipment_repairs (equipment_item_id, business_date, amount_centavos, description, payee, reference_number, notes, resulting_condition, created_by_user_id, updated_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.equipmentItemId,
          input.businessDate,
          input.amountCentavos,
          input.description,
          input.payee,
          input.referenceNumber,
          input.notes,
          input.resultingCondition,
          input.actorUserId,
          input.actorUserId,
          input.now,
          input.now,
        ).lastInsertRowid,
    );
  }
  updateRepair(id, input) {
    this.database
      .prepare(
        `UPDATE equipment_repairs SET business_date = ?, amount_centavos = ?, description = ?, payee = ?, reference_number = ?, notes = ?, resulting_condition = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.businessDate,
        input.amountCentavos,
        input.description,
        input.payee,
        input.referenceNumber,
        input.notes,
        input.resultingCondition,
        input.actorUserId,
        input.now,
        id,
      );
  }
  setRepairStatus(id, status, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE equipment_repairs SET status = ?, void_reason = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(status, status === 'VOIDED' ? reason : null, actorUserId, now, id);
  }

  getExpenseSettings() {
    return this.database
      .prepare(
        `SELECT settings.*, purchase.name AS purchase_category_name, repair.name AS repair_category_name FROM equipment_expense_settings settings JOIN expense_categories purchase ON purchase.id = settings.purchase_category_id JOIN expense_categories repair ON repair.id = settings.repair_category_id WHERE settings.id = 1`,
      )
      .get();
  }
  findPurchaseExpense(batchId) {
    return this.database
      .prepare('SELECT * FROM expense_transactions WHERE equipment_purchase_batch_id = ?')
      .get(batchId);
  }
  createGeneratedExpense(input) {
    return Number(
      this.database
        .prepare(
          `INSERT INTO expense_transactions (business_date, category_id, category_name_snapshot, description, payee, reference_number, amount_centavos, notes, source_type, equipment_purchase_batch_id, equipment_repair_id, created_by_user_id, updated_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.businessDate,
          input.categoryId,
          input.categoryName,
          input.description,
          input.payee,
          input.referenceNumber,
          input.amountCentavos,
          input.notes,
          input.sourceType,
          input.purchaseBatchId ?? null,
          input.repairId ?? null,
          input.actorUserId,
          input.actorUserId,
          input.now,
          input.now,
        ).lastInsertRowid,
    );
  }
  updateGeneratedExpense(id, input) {
    this.database
      .prepare(
        `UPDATE expense_transactions SET business_date = ?, category_id = ?, category_name_snapshot = ?, description = ?, payee = ?, reference_number = ?, amount_centavos = ?, notes = ?, status = 'ACTIVE', void_reason = NULL, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.businessDate,
        input.categoryId,
        input.categoryName,
        input.description,
        input.payee,
        input.referenceNumber,
        input.amountCentavos,
        input.notes,
        input.actorUserId,
        input.now,
        id,
      );
  }
  setGeneratedExpenseStatus(id, status, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE expense_transactions SET status = ?, void_reason = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(status, status === 'VOIDED' ? reason : null, actorUserId, now, id);
  }
}
