export class CanteenInventoryRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  listProducts() {
    return this.database
      .prepare(
        `SELECT * FROM canteen_products
         ORDER BY is_active DESC, category, name COLLATE NOCASE, id`,
      )
      .all();
  }

  listProductsWithStock(asOfDate) {
    return this.database
      .prepare(
        `SELECT product.*, COALESCE(SUM(
           CASE WHEN document.status = 'ACTIVE' AND document.business_date <= ?
             THEN item.stock_delta ELSE 0 END
         ), 0) AS stock_quantity
         FROM canteen_products product
         LEFT JOIN canteen_inventory_document_items item ON item.product_id = product.id
         LEFT JOIN canteen_inventory_documents document ON document.id = item.document_id
         GROUP BY product.id
         ORDER BY product.is_active DESC, product.category,
                  product.name COLLATE NOCASE, product.id`,
      )
      .all(asOfDate);
  }

  findProduct(id) {
    return this.database.prepare('SELECT * FROM canteen_products WHERE id = ?').get(id);
  }

  findProductByName(name, excludeId = 0) {
    return this.database
      .prepare(
        `SELECT id FROM canteen_products
         WHERE name = ? COLLATE NOCASE AND id <> ?`,
      )
      .get(name, excludeId);
  }

  createProduct(input) {
    const result = this.database
      .prepare(
        `INSERT INTO canteen_products (
          name, category, current_cost_centavos,
          selling_price_centavos, low_stock_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.category,
        input.currentCostCentavos,
        input.sellingPriceCentavos,
        input.lowStockThreshold,
        input.now,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  updateProduct(id, input) {
    this.database
      .prepare(
        `UPDATE canteen_products
         SET name = ?, category = ?, current_cost_centavos = ?,
             selling_price_centavos = ?, low_stock_threshold = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.name,
        input.category,
        input.currentCostCentavos,
        input.sellingPriceCentavos,
        input.lowStockThreshold,
        input.now,
        id,
      );
  }

  setProductActive(id, isActive, now) {
    this.database
      .prepare('UPDATE canteen_products SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, id);
  }

  nextDocumentSequence(businessDate, documentType) {
    return this.database
      .prepare(
        `SELECT COALESCE(MAX(document_sequence), 0) + 1 AS next_sequence
         FROM canteen_inventory_documents
         WHERE business_date = ? AND document_type = ?`,
      )
      .get(businessDate, documentType).next_sequence;
  }

  createDocument(input) {
    const result = this.database
      .prepare(
        `INSERT INTO canteen_inventory_documents (
          document_type, business_date, document_sequence, counterparty_name,
          reference_number, notes,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.documentType,
        input.businessDate,
        input.documentSequence,
        input.counterpartyName,
        input.referenceNumber,
        input.notes,
        input.actorUserId,
        input.actorUserId,
        input.now,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  updateDocument(id, input) {
    this.database
      .prepare(
        `UPDATE canteen_inventory_documents
         SET document_type = ?, business_date = ?, document_sequence = ?,
             counterparty_name = ?, reference_number = ?, notes = ?,
             updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.documentType,
        input.businessDate,
        input.documentSequence,
        input.counterpartyName,
        input.referenceNumber,
        input.notes,
        input.actorUserId,
        input.now,
        id,
      );
  }

  replaceDocumentItems(documentId, items, now) {
    this.database
      .prepare('DELETE FROM canteen_inventory_document_items WHERE document_id = ?')
      .run(documentId);
    for (const item of items) {
      this.database
        .prepare(
          `INSERT INTO canteen_inventory_document_items (
            document_id, product_id, product_name_snapshot, category_snapshot,
            quantity, stock_delta,
            unit_cost_centavos_snapshot, unit_price_centavos_snapshot,
            line_total_centavos, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          documentId,
          item.productId,
          item.productNameSnapshot,
          item.categorySnapshot,
          item.quantity,
          item.stockDelta,
          item.unitCostCentavosSnapshot,
          item.unitPriceCentavosSnapshot,
          item.lineTotalCentavos,
          now,
        );
    }
  }

  findDocument(id) {
    return this.database.prepare('SELECT * FROM canteen_inventory_documents WHERE id = ?').get(id);
  }

  listDocumentsBetween(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM canteen_inventory_documents
         WHERE business_date BETWEEN ? AND ?
         ORDER BY business_date DESC, document_type, document_sequence DESC, id DESC`,
      )
      .all(start, end);
  }

  listItemsForDocuments(documentIds) {
    if (documentIds.length === 0) return [];
    const placeholders = documentIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM canteen_inventory_document_items
         WHERE document_id IN (${placeholders})
         ORDER BY document_id, id`,
      )
      .all(...documentIds);
  }

  setDocumentStatus(id, status, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE canteen_inventory_documents
         SET status = ?, void_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, status === 'VOIDED' ? reason : null, actorUserId, now, id);
  }

  hasOtherActiveBeginning(productId, excludeDocumentId = 0) {
    return Boolean(
      this.database
        .prepare(
          `SELECT 1
           FROM canteen_inventory_document_items item
           JOIN canteen_inventory_documents document ON document.id = item.document_id
           WHERE item.product_id = ? AND document.document_type = 'BEGINNING'
             AND document.status = 'ACTIVE' AND document.id <> ?
           LIMIT 1`,
        )
        .get(productId, excludeDocumentId),
    );
  }

  listDailyStockDeltas(productIds) {
    if (productIds.length === 0) return [];
    const placeholders = productIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT item.product_id, product.name, document.business_date,
                SUM(item.stock_delta) AS stock_delta
         FROM canteen_inventory_document_items item
         JOIN canteen_inventory_documents document ON document.id = item.document_id
         JOIN canteen_products product ON product.id = item.product_id
         WHERE document.status = 'ACTIVE' AND item.product_id IN (${placeholders})
         GROUP BY item.product_id, document.business_date
         ORDER BY item.product_id, document.business_date`,
      )
      .all(...productIds);
  }
}
