import { AppError } from '../../errors/app-error.js';

export class PurchasesExpensesService {
  constructor(repository, auditRepository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  getOverview({ start, end, purchaseSource }) {
    const categories = this.repository.listCategories().map(mapCategory);
    const expenses = this.repository.listExpensesBetween(start, end).map(mapExpense);
    const purchases = this.listPurchases(start, end, purchaseSource);
    const activeExpenses = expenses.filter((expense) => expense.status === 'ACTIVE');
    const activePurchases = purchases.filter((purchase) => purchase.status === 'ACTIVE');
    const tirePurchases = activePurchases.filter((purchase) => purchase.source === 'TIRE');
    const canteenPurchases = activePurchases.filter((purchase) => purchase.source === 'CANTEEN');
    const expenseTotalCentavos = sum(activeExpenses.map((expense) => expense.amountCentavos));
    const purchaseTotalCentavos = sum(activePurchases.map((purchase) => purchase.totalCentavos));

    return {
      period: { start, end },
      purchaseSource,
      categories,
      expenses,
      purchases,
      summary: {
        expenseTotalCentavos,
        activeExpenseCount: activeExpenses.length,
        purchaseTotalCentavos,
        activePurchaseCount: activePurchases.length,
        tirePurchaseTotalCentavos: sum(tirePurchases.map((purchase) => purchase.totalCentavos)),
        tirePurchaseCount: tirePurchases.length,
        canteenPurchaseTotalCentavos: sum(
          canteenPurchases.map((purchase) => purchase.totalCentavos),
        ),
        canteenPurchaseCount: canteenPurchases.length,
        combinedOutflowCentavos: expenseTotalCentavos + purchaseTotalCentavos,
        expensesByCategory: summarizeExpensesByCategory(activeExpenses),
      },
    };
  }

  createCategory(input, actorUserId) {
    this.assertCategoryNameAvailable(input.name);
    const now = this.now();
    let categoryId;
    this.repository.transaction(() => {
      categoryId = this.repository.createCategory({ name: input.name, now });
      this.auditRepository.record({
        actorUserId,
        action: 'EXPENSE_CATEGORY_CREATED',
        entityType: 'EXPENSE_CATEGORY',
        entityId: String(categoryId),
        metadata: { after: input },
        now,
      });
    });
    return mapCategory(this.requireCategory(categoryId));
  }

  updateCategory(categoryId, input, actorUserId) {
    const current = this.requireCategory(categoryId);
    this.assertCategoryNameAvailable(input.name, categoryId);
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateCategory(categoryId, input.name, now);
      this.auditRepository.record({
        actorUserId,
        action: 'EXPENSE_CATEGORY_UPDATED',
        entityType: 'EXPENSE_CATEGORY',
        entityId: String(categoryId),
        metadata: { before: mapCategory(current), after: input },
        now,
      });
    });
    return mapCategory(this.requireCategory(categoryId));
  }

  setCategoryActive(categoryId, isActive, reason, actorUserId) {
    const current = this.requireCategory(categoryId);
    if (Boolean(current.is_active) === isActive) {
      throw new AppError(
        409,
        'EXPENSE_CATEGORY_STATUS_UNCHANGED',
        'The expense category already has that status.',
      );
    }
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setCategoryActive(categoryId, isActive, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'EXPENSE_CATEGORY_RESTORED' : 'EXPENSE_CATEGORY_ARCHIVED',
        entityType: 'EXPENSE_CATEGORY',
        entityId: String(categoryId),
        metadata: { reason },
        now,
      });
    });
    return mapCategory(this.requireCategory(categoryId));
  }

  createExpense(input, actorUserId) {
    const category = this.requireCategory(input.categoryId);
    if (!category.is_active) {
      throw new AppError(
        409,
        'EXPENSE_CATEGORY_ARCHIVED',
        'Restore the expense category before using it.',
      );
    }
    const now = this.now();
    let expenseId;
    this.repository.transaction(() => {
      expenseId = this.repository.createExpense({
        ...input,
        categoryNameSnapshot: category.name,
        actorUserId,
        now,
      });
      this.auditRepository.record({
        actorUserId,
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE_TRANSACTION',
        entityId: String(expenseId),
        metadata: { after: input },
        now,
      });
    });
    return mapExpense(this.requireExpense(expenseId));
  }

  updateExpense(expenseId, input, actorUserId) {
    const current = this.requireEditableExpense(expenseId);
    const category = this.requireCategory(input.categoryId);
    if (!category.is_active && category.id !== current.category_id) {
      throw new AppError(
        409,
        'EXPENSE_CATEGORY_ARCHIVED',
        'Restore the expense category before using it.',
      );
    }
    const categoryNameSnapshot =
      category.id === current.category_id ? current.category_name_snapshot : category.name;
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.updateExpense(expenseId, {
        ...input,
        categoryNameSnapshot,
        actorUserId,
        now,
      });
      this.auditRepository.record({
        actorUserId,
        action: 'EXPENSE_UPDATED',
        entityType: 'EXPENSE_TRANSACTION',
        entityId: String(expenseId),
        metadata: { before: mapExpense(current), after: input },
        now,
      });
    });
    return mapExpense(this.requireExpense(expenseId));
  }

  setExpenseActive(expenseId, isActive, reason, actorUserId) {
    const current = this.requireExpense(expenseId);
    if (current.source_type !== 'MANUAL') {
      throw new AppError(
        409,
        'SYSTEM_EXPENSE_LOCKED',
        'System-generated expenses must be changed from their source workflow.',
      );
    }
    const targetStatus = isActive ? 'ACTIVE' : 'VOIDED';
    if (current.status === targetStatus) {
      throw new AppError(409, 'EXPENSE_STATUS_UNCHANGED', 'The expense already has that status.');
    }
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.setExpenseStatus(expenseId, targetStatus, reason, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'EXPENSE_RESTORED' : 'EXPENSE_VOIDED',
        entityType: 'EXPENSE_TRANSACTION',
        entityId: String(expenseId),
        metadata: { reason },
        now,
      });
    });
    return mapExpense(this.requireExpense(expenseId));
  }

  listPurchases(start, end, source) {
    const purchases = [];
    if (source === 'ALL' || source === 'TIRE') {
      const documents = this.repository.listTirePurchasesBetween(start, end);
      const items = this.repository.listTirePurchaseItems(documents.map((row) => row.id));
      purchases.push(...mapPurchases('TIRE', documents, items));
    }
    if (source === 'ALL' || source === 'CANTEEN') {
      const documents = this.repository.listCanteenPurchasesBetween(start, end);
      const items = this.repository.listCanteenPurchaseItems(documents.map((row) => row.id));
      purchases.push(...mapPurchases('CANTEEN', documents, items));
    }
    return purchases.sort(
      (left, right) =>
        right.businessDate.localeCompare(left.businessDate) ||
        left.source.localeCompare(right.source) ||
        right.documentId - left.documentId,
    );
  }

  requireEditableExpense(expenseId) {
    const expense = this.requireExpense(expenseId);
    if (expense.status !== 'ACTIVE') {
      throw new AppError(409, 'EXPENSE_VOIDED', 'Restore the expense before editing it.');
    }
    if (expense.source_type !== 'MANUAL') {
      throw new AppError(
        409,
        'SYSTEM_EXPENSE_LOCKED',
        'System-generated expenses must be changed from their source workflow.',
      );
    }
    return expense;
  }

  requireExpense(expenseId) {
    const expense = this.repository.findExpense(expenseId);
    if (!expense) {
      throw new AppError(404, 'EXPENSE_NOT_FOUND', 'The expense was not found.');
    }
    return expense;
  }

  requireCategory(categoryId) {
    const category = this.repository.findCategory(categoryId);
    if (!category) {
      throw new AppError(404, 'EXPENSE_CATEGORY_NOT_FOUND', 'The expense category was not found.');
    }
    return category;
  }

  assertCategoryNameAvailable(name, excludeId = 0) {
    const duplicate = this.repository.findCategoryByName(name, excludeId);
    if (duplicate) {
      throw new AppError(
        409,
        'EXPENSE_CATEGORY_DUPLICATE',
        duplicate.is_active
          ? 'An expense category with that name already exists.'
          : 'Restore the archived expense category with that name.',
      );
    }
  }

  now() {
    return this.clock().toISOString();
  }
}

function mapCategory(row) {
  return { id: row.id, name: row.name, isActive: Boolean(row.is_active) };
}

function mapExpense(row) {
  return {
    id: row.id,
    businessDate: row.business_date,
    categoryId: row.category_id,
    categoryName: row.category_name_snapshot,
    description: row.description,
    payee: row.payee,
    referenceNumber: row.reference_number,
    amountCentavos: row.amount_centavos,
    notes: row.notes,
    sourceType: row.source_type,
    status: row.status,
    voidReason: row.void_reason,
  };
}

function mapPurchases(source, documents, items) {
  const itemsByDocument = groupBy(items, (item) => item.document_id);
  return documents.map((document) => {
    const mappedItems = (itemsByDocument.get(document.id) ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      category: item.category_snapshot,
      tireType: source === 'TIRE' ? item.tire_type_snapshot : undefined,
      size: source === 'TIRE' ? item.size_snapshot : undefined,
      quantity: item.quantity,
      unitCostCentavos: item.unit_cost_centavos_snapshot,
      lineTotalCentavos: item.line_total_centavos,
    }));
    return {
      id: `${source}:${document.id}`,
      source,
      documentId: document.id,
      businessDate: document.business_date,
      documentSequence: document.document_sequence,
      supplier: document.counterparty_name,
      referenceNumber: document.reference_number,
      notes: document.notes,
      status: document.status,
      voidReason: document.void_reason,
      totalCentavos: sum(mappedItems.map((item) => item.lineTotalCentavos)),
      items: mappedItems,
    };
  });
}

function summarizeExpensesByCategory(expenses) {
  const totals = new Map();
  for (const expense of expenses) {
    const current = totals.get(expense.categoryName) ?? { totalCentavos: 0, count: 0 };
    totals.set(expense.categoryName, {
      totalCentavos: current.totalCentavos + expense.amountCentavos,
      count: current.count + 1,
    });
  }
  return [...totals.entries()]
    .map(([categoryName, values]) => ({ categoryName, ...values }))
    .sort(
      (left, right) =>
        right.totalCentavos - left.totalCentavos ||
        left.categoryName.localeCompare(right.categoryName),
    );
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
