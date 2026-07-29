import { AppError } from '../../errors/app-error.js';

export class EquipmentService {
  constructor(repository, auditRepository, { clock = () => new Date(), dateGuard = null } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
    this.dateGuard = dateGuard;
  }

  getOverview(filters) {
    const items = this.repository.listItems(filters).map(mapItem);
    const repairs = this.repository.listRepairs().map(mapRepair);
    const active = items.filter((item) => item.isActive);
    return {
      filters,
      categories: this.repository.listCategories().map(mapCategory),
      items,
      repairs,
      summary: {
        activeCount: active.length,
        goodCount: active.filter((item) => item.condition === 'GOOD').length,
        needsAttentionCount: active.filter((item) => item.condition === 'NEEDS_ATTENTION').length,
        underRepairCount: active.filter((item) => item.condition === 'UNDER_REPAIR').length,
        damagedCount: active.filter((item) => item.condition === 'DAMAGED').length,
        acquisitionValueCentavos: sum(active.map((item) => item.unitCostCentavos)),
        activeRepairCostCentavos: sum(
          repairs
            .filter((repair) => repair.status === 'ACTIVE')
            .map((repair) => repair.amountCentavos),
        ),
      },
    };
  }

  createCategory(input, actorUserId) {
    this.assertCategoryNameAvailable(input.name);
    const now = this.now();
    let id;
    this.repository.transaction(() => {
      id = this.repository.createCategory(input.name, now);
      this.audit(
        'EQUIPMENT_CATEGORY_CREATED',
        'EQUIPMENT_CATEGORY',
        id,
        actorUserId,
        { after: input },
        now,
      );
    });
    return mapCategory(this.requireCategory(id));
  }

  updateCategory(id, input, actorUserId) {
    const before = this.requireCategory(id);
    this.assertCategoryNameAvailable(input.name, id);
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateCategory(id, input.name, now);
      this.audit(
        'EQUIPMENT_CATEGORY_UPDATED',
        'EQUIPMENT_CATEGORY',
        id,
        actorUserId,
        { before: mapCategory(before), after: input },
        now,
      );
    });
    return mapCategory(this.requireCategory(id));
  }

  setCategoryActive(id, isActive, reason, actorUserId) {
    const category = this.requireCategory(id);
    if (Boolean(category.is_active) === isActive)
      throw new AppError(
        409,
        'EQUIPMENT_CATEGORY_STATUS_UNCHANGED',
        'The category already has that status.',
      );
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setCategoryActive(id, isActive, now);
      this.audit(
        isActive ? 'EQUIPMENT_CATEGORY_RESTORED' : 'EQUIPMENT_CATEGORY_ARCHIVED',
        'EQUIPMENT_CATEGORY',
        id,
        actorUserId,
        { reason },
        now,
      );
    });
    return mapCategory(this.requireCategory(id));
  }

  createBatch(input, actorUserId) {
    this.dateGuard?.assertOpen(input.businessDate);
    const category = this.requireActiveCategory(input.categoryId);
    const prefix = normalizePrefix(input.assetCodePrefix || input.name);
    const codes = this.generateCodes(prefix, input.quantity);
    const settings = this.repository.getExpenseSettings();
    const now = this.now();
    let batchId;
    const itemIds = [];
    this.repository.transaction(() => {
      batchId = this.repository.createBatch({
        ...input,
        categoryName: category.name,
        actorUserId,
        now,
      });
      for (const assetCode of codes) {
        itemIds.push(
          this.repository.createItem({ ...input, batchId, assetCode, actorUserId, now }),
        );
      }
      const total = input.quantity * input.unitCostCentavos;
      if (total > 0)
        this.createPurchaseExpense({ batchId, input, total, settings, actorUserId, now });
      this.audit(
        'EQUIPMENT_BATCH_CREATED',
        'EQUIPMENT_PURCHASE_BATCH',
        batchId,
        actorUserId,
        {
          quantity: input.quantity,
          itemIds,
          assetCodes: codes,
          unitCostCentavos: input.unitCostCentavos,
        },
        now,
      );
    });
    return { batchId, items: itemIds.map((id) => mapItem(this.requireItem(id))) };
  }

  updateBatch(id, input, actorUserId) {
    const batch = this.requireBatch(id);
    this.dateGuard?.assertOpen(batch.business_date);
    if (input.businessDate !== batch.business_date) this.dateGuard?.assertOpen(input.businessDate);
    const settings = this.repository.getExpenseSettings();
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateBatch(id, { ...input, actorUserId, now });
      this.syncPurchaseExpense({ batch, input, settings, actorUserId, now });
      this.audit(
        'EQUIPMENT_BATCH_UPDATED',
        'EQUIPMENT_PURCHASE_BATCH',
        id,
        actorUserId,
        { before: batch, after: input },
        now,
      );
    });
    return this.requireBatch(id);
  }

  updateItem(id, input, actorUserId) {
    const before = this.requireItem(id);
    this.requireCategory(input.categoryId);
    const duplicate = this.repository.findItemByCode(input.assetCode, id);
    if (duplicate)
      throw new AppError(
        409,
        'EQUIPMENT_ASSET_CODE_DUPLICATE',
        'That asset code is already in use.',
      );
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateItem(id, { ...input, actorUserId, now });
      this.audit(
        'EQUIPMENT_ITEM_UPDATED',
        'EQUIPMENT_ITEM',
        id,
        actorUserId,
        { before: mapItem(before), after: input },
        now,
      );
    });
    return mapItem(this.requireItem(id));
  }

  setItemActive(id, isActive, reason, actorUserId) {
    const item = this.requireItem(id);
    if (Boolean(item.is_active) === isActive)
      throw new AppError(
        409,
        'EQUIPMENT_ITEM_STATUS_UNCHANGED',
        'The equipment already has that status.',
      );
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setItemActive(id, isActive, now, actorUserId);
      this.audit(
        isActive ? 'EQUIPMENT_ITEM_RESTORED' : 'EQUIPMENT_ITEM_ARCHIVED',
        'EQUIPMENT_ITEM',
        id,
        actorUserId,
        { reason },
        now,
      );
    });
    return mapItem(this.requireItem(id));
  }

  createRepair(itemId, input, actorUserId) {
    this.dateGuard?.assertOpen(input.businessDate);
    const item = this.requireItem(itemId);
    if (!item.is_active)
      throw new AppError(
        409,
        'EQUIPMENT_ITEM_ARCHIVED',
        'Restore the equipment before recording a repair.',
      );
    const settings = this.repository.getExpenseSettings();
    const now = this.now();
    let repairId;
    this.repository.transaction(() => {
      repairId = this.repository.createRepair({
        ...input,
        equipmentItemId: itemId,
        actorUserId,
        now,
      });
      this.createRepairExpense({ repairId, item, input, settings, actorUserId, now });
      this.repository.updateItemCondition(
        itemId,
        input.resultingCondition,
        input.businessDate,
        actorUserId,
        now,
      );
      this.audit(
        'EQUIPMENT_REPAIR_CREATED',
        'EQUIPMENT_REPAIR',
        repairId,
        actorUserId,
        { equipmentItemId: itemId, after: input },
        now,
      );
    });
    return mapRepair(this.requireRepair(repairId));
  }

  updateRepair(id, input, actorUserId) {
    const repair = this.requireRepair(id);
    if (repair.status !== 'ACTIVE')
      throw new AppError(409, 'EQUIPMENT_REPAIR_VOIDED', 'Restore the repair before editing it.');
    this.dateGuard?.assertOpen(repair.business_date);
    if (input.businessDate !== repair.business_date) this.dateGuard?.assertOpen(input.businessDate);
    const item = this.requireItem(repair.equipment_item_id);
    const settings = this.repository.getExpenseSettings();
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateRepair(id, { ...input, actorUserId, now });
      this.repository.updateGeneratedExpense(
        repair.expense_id,
        repairExpenseInput({ repairId: id, item, input, settings, actorUserId, now }),
      );
      this.repository.updateItemCondition(
        item.id,
        input.resultingCondition,
        input.businessDate,
        actorUserId,
        now,
      );
      this.audit(
        'EQUIPMENT_REPAIR_UPDATED',
        'EQUIPMENT_REPAIR',
        id,
        actorUserId,
        { before: mapRepair(repair), after: input },
        now,
      );
    });
    return mapRepair(this.requireRepair(id));
  }

  setRepairActive(id, isActive, reason, actorUserId) {
    const repair = this.requireRepair(id);
    const target = isActive ? 'ACTIVE' : 'VOIDED';
    if (repair.status === target)
      throw new AppError(
        409,
        'EQUIPMENT_REPAIR_STATUS_UNCHANGED',
        'The repair already has that status.',
      );
    this.dateGuard?.assertOpen(repair.business_date);
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setRepairStatus(id, target, reason, actorUserId, now);
      this.repository.setGeneratedExpenseStatus(
        repair.expense_id,
        target,
        reason,
        actorUserId,
        now,
      );
      if (isActive)
        this.repository.updateItemCondition(
          repair.equipment_item_id,
          repair.resulting_condition,
          repair.business_date,
          actorUserId,
          now,
        );
      this.audit(
        isActive ? 'EQUIPMENT_REPAIR_RESTORED' : 'EQUIPMENT_REPAIR_VOIDED',
        'EQUIPMENT_REPAIR',
        id,
        actorUserId,
        { reason },
        now,
      );
    });
    return mapRepair(this.requireRepair(id));
  }

  createPurchaseExpense({ batchId, input, total, settings, actorUserId, now }) {
    this.repository.createGeneratedExpense({
      businessDate: input.businessDate,
      categoryId: settings.purchase_category_id,
      categoryName: settings.purchase_category_name,
      description: `Equipment purchase: ${input.name} × ${input.quantity}`,
      payee: input.supplier,
      referenceNumber: input.referenceNumber,
      amountCentavos: total,
      notes: input.notes,
      sourceType: 'EQUIPMENT_PURCHASE',
      purchaseBatchId: batchId,
      actorUserId,
      now,
    });
  }

  syncPurchaseExpense({ batch, input, settings, actorUserId, now }) {
    const expense = this.repository.findPurchaseExpense(batch.id);
    const total = batch.quantity * input.unitCostCentavos;
    if (total === 0) {
      if (expense?.status === 'ACTIVE')
        this.repository.setGeneratedExpenseStatus(
          expense.id,
          'VOIDED',
          'Purchase cost corrected to zero',
          actorUserId,
          now,
        );
      return;
    }
    const values = {
      businessDate: input.businessDate,
      categoryId: settings.purchase_category_id,
      categoryName: settings.purchase_category_name,
      description: `Equipment purchase: ${batch.item_name_snapshot} × ${batch.quantity}`,
      payee: input.supplier,
      referenceNumber: input.referenceNumber,
      amountCentavos: total,
      notes: input.notes,
      sourceType: 'EQUIPMENT_PURCHASE',
      purchaseBatchId: batch.id,
      actorUserId,
      now,
    };
    if (expense) this.repository.updateGeneratedExpense(expense.id, values);
    else this.repository.createGeneratedExpense(values);
  }

  createRepairExpense(values) {
    this.repository.createGeneratedExpense(repairExpenseInput(values));
  }
  requireCategory(id) {
    const row = this.repository.findCategory(id);
    if (!row)
      throw new AppError(
        404,
        'EQUIPMENT_CATEGORY_NOT_FOUND',
        'The equipment category was not found.',
      );
    return row;
  }
  requireActiveCategory(id) {
    const row = this.requireCategory(id);
    if (!row.is_active)
      throw new AppError(
        409,
        'EQUIPMENT_CATEGORY_ARCHIVED',
        'Restore the category before using it.',
      );
    return row;
  }
  requireItem(id) {
    const row = this.repository.findItem(id);
    if (!row) throw new AppError(404, 'EQUIPMENT_ITEM_NOT_FOUND', 'The equipment was not found.');
    return row;
  }
  requireBatch(id) {
    const row = this.repository.findBatch(id);
    if (!row)
      throw new AppError(404, 'EQUIPMENT_BATCH_NOT_FOUND', 'The purchase batch was not found.');
    return row;
  }
  requireRepair(id) {
    const row = this.repository.findRepair(id);
    if (!row) throw new AppError(404, 'EQUIPMENT_REPAIR_NOT_FOUND', 'The repair was not found.');
    return row;
  }
  assertCategoryNameAvailable(name, excludeId = 0) {
    if (this.repository.findCategoryByName(name, excludeId))
      throw new AppError(
        409,
        'EQUIPMENT_CATEGORY_DUPLICATE',
        'An equipment category with that name already exists.',
      );
  }
  generateCodes(prefix, quantity) {
    const codes = [];
    let sequence = 1;
    while (codes.length < quantity) {
      const code = `${prefix}-${String(sequence).padStart(3, '0')}`;
      if (!this.repository.codeExists(code)) codes.push(code);
      sequence += 1;
    }
    return codes;
  }
  audit(action, entityType, id, actorUserId, metadata, now) {
    this.auditRepository.record({
      actorUserId,
      action,
      entityType,
      entityId: String(id),
      metadata,
      now,
    });
  }
  now() {
    return this.clock().toISOString();
  }
}

function repairExpenseInput({ repairId, item, input, settings, actorUserId, now }) {
  return {
    businessDate: input.businessDate,
    categoryId: settings.repair_category_id,
    categoryName: settings.repair_category_name,
    description: `Equipment repair: ${item.name} (${item.asset_code})`,
    payee: input.payee,
    referenceNumber: input.referenceNumber,
    amountCentavos: input.amountCentavos,
    notes: input.notes || input.description,
    sourceType: 'EQUIPMENT_REPAIR',
    repairId,
    actorUserId,
    now,
  };
}
function normalizePrefix(value) {
  const prefix = value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 20);
  return prefix || 'EQUIP';
}
function mapCategory(row) {
  return { id: row.id, name: row.name, isActive: Boolean(row.is_active) };
}
function mapItem(row) {
  return {
    id: row.id,
    purchaseBatchId: row.purchase_batch_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    assetCode: row.asset_code,
    description: row.description,
    condition: row.condition,
    conditionCheckedOn: row.condition_checked_on,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    purchaseDate: row.purchase_date,
    unitCostCentavos: row.unit_cost_centavos,
    supplier: row.supplier,
    referenceNumber: row.reference_number,
  };
}
function mapRepair(row) {
  return {
    id: row.id,
    equipmentItemId: row.equipment_item_id,
    equipmentName: row.equipment_name,
    assetCode: row.asset_code,
    businessDate: row.business_date,
    amountCentavos: row.amount_centavos,
    description: row.description,
    payee: row.payee,
    referenceNumber: row.reference_number,
    notes: row.notes,
    resultingCondition: row.resulting_condition,
    status: row.status,
    voidReason: row.void_reason,
    expenseId: row.expense_id,
    expenseStatus: row.expense_status,
  };
}
function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
