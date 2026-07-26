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
}

function assertAllowedTable(tableName) {
  const allowed = new Set([
    'service_ticket_items',
    'tire_inventory_documents',
    'tire_inventory_document_items',
    'canteen_inventory_documents',
    'canteen_inventory_document_items',
  ]);
  if (!allowed.has(tableName)) throw new Error('Unsupported report table.');
}
