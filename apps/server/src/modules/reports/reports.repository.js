export class ReportsRepository {
  constructor(database) {
    this.database = database;
  }

  listServiceTickets(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM service_tickets
         WHERE business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, customer_sequence DESC, id DESC`,
      )
      .all(start, end);
  }

  listServiceItems(ticketIds) {
    return this.listItems('service_ticket_items', 'ticket_id', ticketIds);
  }

  listTireSales(start, end) {
    return this.listInventoryDocuments('tire_inventory_documents', 'SALE', start, end);
  }

  listTireSaleItems(documentIds) {
    return this.listItems('tire_inventory_document_items', 'document_id', documentIds);
  }

  listCanteenSales(start, end) {
    return this.listInventoryDocuments('canteen_inventory_documents', 'SALE', start, end);
  }

  listCanteenSaleItems(documentIds) {
    return this.listItems('canteen_inventory_document_items', 'document_id', documentIds);
  }

  listTirePurchases(start, end) {
    return this.listInventoryDocuments('tire_inventory_documents', 'PURCHASE', start, end);
  }

  listTirePurchaseItems(documentIds) {
    return this.listItems('tire_inventory_document_items', 'document_id', documentIds);
  }

  listCanteenPurchases(start, end) {
    return this.listInventoryDocuments('canteen_inventory_documents', 'PURCHASE', start, end);
  }

  listCanteenPurchaseItems(documentIds) {
    return this.listItems('canteen_inventory_document_items', 'document_id', documentIds);
  }

  listExpenses(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM expense_transactions
         WHERE business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, id DESC`,
      )
      .all(start, end);
  }

  findActivePeriodDay(businessDate) {
    return this.database
      .prepare(
        `SELECT day.*, run.id AS close_id, run.start_date, run.end_date
         FROM period_close_days day
         JOIN period_close_runs run ON run.id = day.period_close_run_id
         WHERE run.status = 'CLOSED' AND day.business_date = ?
         ORDER BY run.id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  findLegacyPayrollDay(businessDate) {
    return this.database
      .prepare(
        `SELECT run.id AS close_id, run.business_date, run.total_salary_centavos,
                run.total_meal_centavos, COUNT(item.id) AS employee_count
         FROM payroll_runs run
         LEFT JOIN payroll_run_items item ON item.payroll_run_id = run.id
         WHERE run.status = 'CLOSED' AND run.business_date = ?
         GROUP BY run.id
         ORDER BY run.id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  findLegacyDailyCloseDay(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM daily_close_runs
         WHERE status = 'CLOSED' AND business_date = ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  listTireLowStock(asOfDate) {
    return this.listLowStock(
      'tire_products',
      'tire_inventory_documents',
      'tire_inventory_document_items',
      asOfDate,
    );
  }

  listCanteenLowStock(asOfDate) {
    return this.listLowStock(
      'canteen_products',
      'canteen_inventory_documents',
      'canteen_inventory_document_items',
      asOfDate,
    );
  }

  listEquipmentAttention() {
    return this.database
      .prepare(
        `SELECT item.id, item.name, item.asset_code, item.condition,
                item.condition_checked_on, category.name AS category_name
         FROM equipment_items item
         JOIN equipment_categories category ON category.id = item.category_id
         WHERE item.is_active = 1 AND item.condition <> 'GOOD'
         ORDER BY CASE item.condition
           WHEN 'DAMAGED' THEN 1
           WHEN 'UNDER_REPAIR' THEN 2
           ELSE 3
         END, item.condition_checked_on, item.name COLLATE NOCASE, item.id
         LIMIT 5`,
      )
      .all();
  }

  listInventoryDocuments(tableName, documentType, start, end) {
    assertAllowedTable(tableName);
    return this.database
      .prepare(
        `SELECT * FROM ${tableName}
         WHERE document_type = ? AND business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, document_sequence DESC, id DESC`,
      )
      .all(documentType, start, end);
  }

  listItems(tableName, foreignKey, ids) {
    if (ids.length === 0) return [];
    assertAllowedTable(tableName);
    if (!new Set(['ticket_id', 'document_id']).has(foreignKey)) {
      throw new Error('Unsupported report item foreign key.');
    }
    const placeholders = ids.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM ${tableName}
         WHERE ${foreignKey} IN (${placeholders})
         ORDER BY ${foreignKey}, id`,
      )
      .all(...ids);
  }

  listLowStock(productTable, documentTable, itemTable, asOfDate) {
    for (const tableName of [productTable, documentTable, itemTable]) assertAllowedTable(tableName);
    return this.database
      .prepare(
        `SELECT product.*, COALESCE(SUM(
           CASE WHEN document.status = 'ACTIVE' AND document.business_date <= ?
             THEN item.stock_delta ELSE 0 END
         ), 0) AS stock_quantity
         FROM ${productTable} product
         LEFT JOIN ${itemTable} item ON item.product_id = product.id
         LEFT JOIN ${documentTable} document ON document.id = item.document_id
         GROUP BY product.id
         HAVING product.is_active = 1
            AND stock_quantity <= product.low_stock_threshold
         ORDER BY stock_quantity, product.low_stock_threshold DESC,
                  product.name COLLATE NOCASE, product.id
         LIMIT 5`,
      )
      .all(asOfDate);
  }
}

function assertAllowedTable(tableName) {
  const allowed = new Set([
    'service_ticket_items',
    'tire_inventory_documents',
    'tire_inventory_document_items',
    'canteen_inventory_documents',
    'canteen_inventory_document_items',
    'tire_products',
    'canteen_products',
  ]);
  if (!allowed.has(tableName)) throw new Error('Unsupported report table.');
}
