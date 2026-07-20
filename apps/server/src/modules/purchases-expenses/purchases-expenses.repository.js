export class PurchasesExpensesRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  listCategories() {
    return this.database
      .prepare(
        `SELECT * FROM expense_categories
         ORDER BY is_active DESC, name COLLATE NOCASE, id`,
      )
      .all();
  }

  findCategory(id) {
    return this.database.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
  }

  findCategoryByName(name, excludeId = 0) {
    return this.database
      .prepare(
        `SELECT * FROM expense_categories
         WHERE name = ? COLLATE NOCASE AND id <> ?`,
      )
      .get(name, excludeId);
  }

  createCategory({ name, now }) {
    const result = this.database
      .prepare(
        `INSERT INTO expense_categories (name, created_at, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run(name, now, now);
    return Number(result.lastInsertRowid);
  }

  updateCategory(id, name, now) {
    this.database
      .prepare('UPDATE expense_categories SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, id);
  }

  setCategoryActive(id, isActive, now) {
    this.database
      .prepare('UPDATE expense_categories SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, id);
  }

  listExpensesBetween(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM expense_transactions
         WHERE business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, id DESC`,
      )
      .all(start, end);
  }

  findExpense(id) {
    return this.database.prepare('SELECT * FROM expense_transactions WHERE id = ?').get(id);
  }

  createExpense(input) {
    const result = this.database
      .prepare(
        `INSERT INTO expense_transactions (
          business_date, category_id, category_name_snapshot, description, payee,
          reference_number, amount_centavos, notes, source_type,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        input.categoryId,
        input.categoryNameSnapshot,
        input.description,
        input.payee,
        input.referenceNumber,
        input.amountCentavos,
        input.notes,
        input.actorUserId,
        input.actorUserId,
        input.now,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  updateExpense(id, input) {
    this.database
      .prepare(
        `UPDATE expense_transactions
         SET business_date = ?, category_id = ?, category_name_snapshot = ?,
             description = ?, payee = ?, reference_number = ?, amount_centavos = ?,
             notes = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.businessDate,
        input.categoryId,
        input.categoryNameSnapshot,
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

  setExpenseStatus(id, status, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE expense_transactions
         SET status = ?, void_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, status === 'VOIDED' ? reason : null, actorUserId, now, id);
  }

  listTirePurchasesBetween(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM tire_inventory_documents
         WHERE document_type = 'PURCHASE' AND business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, document_sequence DESC, id DESC`,
      )
      .all(start, end);
  }

  listTirePurchaseItems(documentIds) {
    return this.listPurchaseItems('tire_inventory_document_items', documentIds);
  }

  listCanteenPurchasesBetween(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM canteen_inventory_documents
         WHERE document_type = 'PURCHASE' AND business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, document_sequence DESC, id DESC`,
      )
      .all(start, end);
  }

  listCanteenPurchaseItems(documentIds) {
    return this.listPurchaseItems('canteen_inventory_document_items', documentIds);
  }

  listPurchaseItems(tableName, documentIds) {
    if (documentIds.length === 0) return [];
    const allowedTables = new Set([
      'tire_inventory_document_items',
      'canteen_inventory_document_items',
    ]);
    if (!allowedTables.has(tableName)) throw new Error('Unsupported purchase item table.');
    const placeholders = documentIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM ${tableName}
         WHERE document_id IN (${placeholders})
         ORDER BY document_id, id`,
      )
      .all(...documentIds);
  }
}
