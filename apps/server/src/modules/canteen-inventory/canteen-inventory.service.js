import { AppError } from '../../errors/app-error.js';

export class CanteenInventoryService {
  constructor(repository, auditRepository, { clock = () => new Date(), dateGuard = null } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
    this.dateGuard = dateGuard;
  }

  getOverview({ start, end }) {
    const products = this.repository.listProductsWithStock(end).map(mapProduct);
    const documents = this.hydrateDocuments(start, end);
    const activeDocuments = documents.filter((document) => document.status === 'ACTIVE');
    const saleItems = itemsForType(activeDocuments, 'SALE');
    const purchaseItems = itemsForType(activeDocuments, 'PURCHASE');
    const beginningItems = itemsForType(activeDocuments, 'BEGINNING');
    const adjustmentItems = itemsForType(activeDocuments, 'ADJUSTMENT');

    return {
      period: { start, end },
      products,
      documents,
      summary: {
        canteenSalesCentavos: sum(saleItems.map((item) => item.lineTotalCentavos)),
        canteenUnitsSold: sum(saleItems.map((item) => item.quantity)),
        estimatedCostOfGoodsCentavos: sum(
          saleItems.map((item) => item.quantity * item.unitCostCentavos),
        ),
        estimatedGrossProfitCentavos:
          sum(saleItems.map((item) => item.lineTotalCentavos)) -
          sum(saleItems.map((item) => item.quantity * item.unitCostCentavos)),
        purchaseCostCentavos: sum(purchaseItems.map((item) => item.lineTotalCentavos)),
        purchasedUnits: sum(purchaseItems.map((item) => item.quantity)),
        beginningUnits: sum(beginningItems.map((item) => item.quantity)),
        netAdjustmentUnits: sum(adjustmentItems.map((item) => item.stockDelta)),
        inventoryUnits: sum(products.map((product) => product.stockQuantity)),
        inventoryCostValueCentavos: sum(
          products.map((product) => product.stockQuantity * product.currentCostCentavos),
        ),
        lowStockProductCount: products.filter(
          (product) =>
            product.isActive &&
            product.stockQuantity > 0 &&
            product.stockQuantity <= product.lowStockThreshold,
        ).length,
        outOfStockProductCount: products.filter(
          (product) => product.isActive && product.stockQuantity === 0,
        ).length,
      },
    };
  }

  createProduct(input, actorUserId) {
    if (input.beginningInventory) this.dateGuard?.assertOpen(input.beginningInventory.businessDate);
    this.assertProductNameAvailable(input.name);
    const now = this.now();
    let productId;

    this.repository.transaction(() => {
      productId = this.repository.createProduct({ ...input, now });
      if (input.beginningInventory) {
        const product = this.repository.findProduct(productId);
        const documentId = this.repository.createDocument({
          documentType: 'BEGINNING',
          businessDate: input.beginningInventory.businessDate,
          documentSequence: this.repository.nextDocumentSequence(
            input.beginningInventory.businessDate,
            'BEGINNING',
          ),
          counterpartyName: '',
          referenceNumber: '',
          notes: 'Beginning inventory entered with product setup',
          actorUserId,
          now,
        });
        this.repository.replaceDocumentItems(
          documentId,
          [
            normalizeDocumentItem({
              documentType: 'BEGINNING',
              item: {
                productId,
                quantity: input.beginningInventory.quantity,
                unitCostCentavos: input.beginningInventory.unitCostCentavos,
              },
              product,
            }),
          ],
          now,
        );
      }
      this.auditRepository.record({
        actorUserId,
        action: 'CANTEEN_PRODUCT_CREATED',
        entityType: 'CANTEEN_PRODUCT',
        entityId: String(productId),
        metadata: { after: input },
        now,
      });
    });

    return this.getProductWithStock(productId);
  }

  updateProduct(productId, input, actorUserId) {
    const current = this.requireProduct(productId);
    const updated = {
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      currentCostCentavos: input.currentCostCentavos ?? current.current_cost_centavos,
      sellingPriceCentavos: input.sellingPriceCentavos ?? current.selling_price_centavos,
      lowStockThreshold: input.lowStockThreshold ?? current.low_stock_threshold,
    };
    this.assertProductNameAvailable(updated.name, productId);
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateProduct(productId, { ...updated, now });
      this.auditRepository.record({
        actorUserId,
        action: 'CANTEEN_PRODUCT_UPDATED',
        entityType: 'CANTEEN_PRODUCT',
        entityId: String(productId),
        metadata: { before: mapProduct(current), after: updated },
        now,
      });
    });
    return this.getProductWithStock(productId);
  }

  setProductActive(productId, isActive, reason, actorUserId) {
    const current = this.requireProduct(productId);
    if (Boolean(current.is_active) === isActive) {
      throw new AppError(
        409,
        'CANTEEN_PRODUCT_STATUS_UNCHANGED',
        'The product already has that status.',
      );
    }
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setProductActive(productId, isActive, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'CANTEEN_PRODUCT_RESTORED' : 'CANTEEN_PRODUCT_ARCHIVED',
        entityType: 'CANTEEN_PRODUCT',
        entityId: String(productId),
        metadata: { reason },
        now,
      });
    });
    return this.getProductWithStock(productId);
  }

  createDocument(input, actorUserId) {
    this.dateGuard?.assertOpen(input.businessDate);
    const normalized = this.normalizeDocument(input);
    if (input.documentType === 'BEGINNING') {
      this.assertBeginningEntriesAvailable(normalized.items);
    }
    const now = this.now();
    let documentId;

    this.repository.transaction(() => {
      documentId = this.repository.createDocument({
        ...normalized.header,
        documentSequence: this.repository.nextDocumentSequence(
          input.businessDate,
          input.documentType,
        ),
        actorUserId,
        now,
      });
      this.repository.replaceDocumentItems(documentId, normalized.items, now);
      this.assertStockNonnegative(normalized.productIds);
      this.auditRepository.record({
        actorUserId,
        action: 'CANTEEN_DOCUMENT_CREATED',
        entityType: 'CANTEEN_INVENTORY_DOCUMENT',
        entityId: String(documentId),
        metadata: { after: input },
        now,
      });
    });

    return this.requireHydratedDocument(documentId);
  }

  updateDocument(documentId, input, actorUserId) {
    const current = this.requireDocument(documentId);
    this.dateGuard?.assertOpen(current.business_date);
    if (input.businessDate !== current.business_date)
      this.dateGuard?.assertOpen(input.businessDate);
    if (current.status !== 'ACTIVE') {
      throw new AppError(409, 'CANTEEN_DOCUMENT_VOIDED', 'Restore the document before editing it.');
    }
    const before = this.requireHydratedDocument(documentId);
    const normalized = this.normalizeDocument(input);
    if (input.documentType === 'BEGINNING') {
      this.assertBeginningEntriesAvailable(normalized.items, documentId);
    }
    const sameSequenceGroup =
      current.business_date === input.businessDate && current.document_type === input.documentType;
    const documentSequence = sameSequenceGroup
      ? current.document_sequence
      : this.repository.nextDocumentSequence(input.businessDate, input.documentType);
    const affectedProductIds = [
      ...new Set([...before.items.map((item) => item.productId), ...normalized.productIds]),
    ];
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.updateDocument(documentId, {
        ...normalized.header,
        documentSequence,
        actorUserId,
        now,
      });
      this.repository.replaceDocumentItems(documentId, normalized.items, now);
      this.assertStockNonnegative(affectedProductIds);
      this.auditRepository.record({
        actorUserId,
        action: 'CANTEEN_DOCUMENT_UPDATED',
        entityType: 'CANTEEN_INVENTORY_DOCUMENT',
        entityId: String(documentId),
        metadata: { before, after: input },
        now,
      });
    });

    return this.requireHydratedDocument(documentId);
  }

  setDocumentActive(documentId, isActive, reason, actorUserId) {
    const current = this.requireDocument(documentId);
    this.dateGuard?.assertOpen(current.business_date);
    const targetStatus = isActive ? 'ACTIVE' : 'VOIDED';
    if (current.status === targetStatus) {
      throw new AppError(
        409,
        'CANTEEN_DOCUMENT_STATUS_UNCHANGED',
        'The document already has that status.',
      );
    }
    const before = this.requireHydratedDocument(documentId);
    if (isActive && current.document_type === 'BEGINNING') {
      this.assertBeginningEntriesAvailable(
        before.items.map((item) => ({ productId: item.productId })),
        documentId,
      );
    }
    const productIds = before.items.map((item) => item.productId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setDocumentStatus(documentId, targetStatus, reason, actorUserId, now);
      this.assertStockNonnegative(productIds);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'CANTEEN_DOCUMENT_RESTORED' : 'CANTEEN_DOCUMENT_VOIDED',
        entityType: 'CANTEEN_INVENTORY_DOCUMENT',
        entityId: String(documentId),
        metadata: { reason },
        now,
      });
    });

    return this.requireHydratedDocument(documentId);
  }

  normalizeDocument(input) {
    const items = input.items.map((item) => {
      const product = this.requireProduct(item.productId);
      if (!product.is_active) {
        throw new AppError(
          409,
          'CANTEEN_PRODUCT_ARCHIVED',
          `Restore ${product.name} before using it in a new document.`,
        );
      }
      return normalizeDocumentItem({ documentType: input.documentType, item, product });
    });

    return {
      header: {
        documentType: input.documentType,
        businessDate: input.businessDate,
        counterpartyName: input.counterpartyName,
        referenceNumber: input.referenceNumber,
        notes: input.notes,
      },
      items,
      productIds: items.map((item) => item.productId),
    };
  }

  hydrateDocuments(start, end) {
    const rows = this.repository.listDocumentsBetween(start, end);
    const itemRows = this.repository.listItemsForDocuments(rows.map((row) => row.id));
    const itemsByDocument = groupBy(itemRows, (row) => row.document_id);
    return rows.map((row) => mapDocument(row, itemsByDocument.get(row.id) ?? []));
  }

  requireHydratedDocument(documentId) {
    const row = this.requireDocument(documentId);
    const items = this.repository.listItemsForDocuments([documentId]);
    return mapDocument(row, items);
  }

  requireDocument(documentId) {
    const document = this.repository.findDocument(documentId);
    if (!document) {
      throw new AppError(404, 'CANTEEN_DOCUMENT_NOT_FOUND', 'The canteen document was not found.');
    }
    return document;
  }

  requireProduct(productId) {
    const product = this.repository.findProduct(productId);
    if (!product) {
      throw new AppError(404, 'CANTEEN_PRODUCT_NOT_FOUND', 'The canteen product was not found.');
    }
    return product;
  }

  getProductWithStock(productId) {
    const product = this.repository
      .listProductsWithStock('9999-12-31')
      .find((entry) => entry.id === productId);
    return mapProduct(product);
  }

  assertProductNameAvailable(name, excludeId = 0) {
    if (this.repository.findProductByName(name, excludeId)) {
      throw new AppError(
        409,
        'CANTEEN_PRODUCT_DUPLICATE',
        'A canteen product with that name already exists.',
      );
    }
  }

  assertBeginningEntriesAvailable(items, excludeDocumentId = 0) {
    for (const item of items) {
      if (this.repository.hasOtherActiveBeginning(item.productId, excludeDocumentId)) {
        throw new AppError(
          409,
          'BEGINNING_INVENTORY_EXISTS',
          'That product already has an active beginning-inventory entry.',
        );
      }
    }
  }

  assertStockNonnegative(productIds) {
    const runningByProduct = new Map();
    for (const row of this.repository.listDailyStockDeltas([...new Set(productIds)])) {
      const running = (runningByProduct.get(row.product_id) ?? 0) + row.stock_delta;
      if (running < 0) {
        throw new AppError(
          409,
          'INSUFFICIENT_CANTEEN_STOCK',
          `${row.name} would have negative stock on ${row.business_date}.`,
        );
      }
      runningByProduct.set(row.product_id, running);
    }
  }

  now() {
    return this.clock().toISOString();
  }
}

function normalizeDocumentItem({ documentType, item, product }) {
  const stockDelta =
    documentType === 'SALE'
      ? -item.quantity
      : documentType === 'ADJUSTMENT'
        ? item.quantity
        : item.quantity;
  const quantity = Math.abs(item.quantity);
  const unitCostCentavos = item.unitCostCentavos ?? product.current_cost_centavos;
  const unitPriceCentavos = item.unitPriceCentavos ?? product.selling_price_centavos;
  const lineTotalCentavos =
    documentType === 'SALE'
      ? quantity * unitPriceCentavos
      : documentType === 'PURCHASE' || documentType === 'BEGINNING'
        ? quantity * unitCostCentavos
        : 0;

  return {
    productId: product.id,
    productNameSnapshot: product.name,
    categorySnapshot: product.category,
    quantity,
    stockDelta,
    unitCostCentavosSnapshot: unitCostCentavos,
    unitPriceCentavosSnapshot: unitPriceCentavos,
    lineTotalCentavos,
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    currentCostCentavos: row.current_cost_centavos,
    sellingPriceCentavos: row.selling_price_centavos,
    lowStockThreshold: row.low_stock_threshold,
    stockQuantity: row.stock_quantity ?? 0,
    isActive: Boolean(row.is_active),
  };
}

function mapDocument(row, itemRows) {
  const items = itemRows.map((item) => ({
    id: item.id,
    productId: item.product_id,
    productName: item.product_name_snapshot,
    category: item.category_snapshot,
    quantity: item.quantity,
    stockDelta: item.stock_delta,
    unitCostCentavos: item.unit_cost_centavos_snapshot,
    unitPriceCentavos: item.unit_price_centavos_snapshot,
    lineTotalCentavos: item.line_total_centavos,
  }));
  return {
    id: row.id,
    documentType: row.document_type,
    businessDate: row.business_date,
    documentSequence: row.document_sequence,
    counterpartyName: row.counterparty_name,
    referenceNumber: row.reference_number,
    notes: row.notes,
    status: row.status,
    voidReason: row.void_reason,
    totalCentavos: sum(items.map((item) => item.lineTotalCentavos)),
    items,
  };
}

function itemsForType(documents, type) {
  return documents
    .filter((document) => document.documentType === type)
    .flatMap((document) => document.items);
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = key(row);
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
