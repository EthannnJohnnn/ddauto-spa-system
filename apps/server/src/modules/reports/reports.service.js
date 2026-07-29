export class ReportsService {
  constructor(repository) {
    this.repository = repository;
  }

  getOverview({ start, end }) {
    const serviceTickets = this.repository.listServiceTickets(start, end);
    const serviceItems = this.repository.listServiceItems(serviceTickets.map((row) => row.id));
    const tireDocuments = this.repository.listTireSales(start, end);
    const tireItems = this.repository.listTireSaleItems(tireDocuments.map((row) => row.id));
    const canteenDocuments = this.repository.listCanteenSales(start, end);
    const canteenItems = this.repository.listCanteenSaleItems(
      canteenDocuments.map((row) => row.id),
    );
    const tirePurchases = this.repository.listTirePurchases(start, end);
    const tirePurchaseItems = this.repository.listTirePurchaseItems(
      tirePurchases.map((row) => row.id),
    );
    const canteenPurchases = this.repository.listCanteenPurchases(start, end);
    const canteenPurchaseItems = this.repository.listCanteenPurchaseItems(
      canteenPurchases.map((row) => row.id),
    );
    const expenses = this.repository.listExpenses(start, end).map(mapExpense);
    const operationalAlerts = {
      equipmentAttention: this.repository.listEquipmentAttention().map(mapEquipmentAttention),
      tireLowStock: this.repository.listTireLowStock(end).map((row) => mapLowStock(row, true)),
      canteenLowStock: this.repository
        .listCanteenLowStock(end)
        .map((row) => mapLowStock(row, false)),
    };

    const transactions = {
      serviceSales: mapServiceTransactions(serviceTickets, serviceItems),
      tireSales: mapInventorySales(tireDocuments, tireItems, 'TIRE'),
      canteenSales: mapInventorySales(canteenDocuments, canteenItems, 'CANTEEN'),
    };
    const purchases = [
      ...mapPurchases(tirePurchases, tirePurchaseItems, 'TIRE'),
      ...mapPurchases(canteenPurchases, canteenPurchaseItems, 'CANTEEN'),
    ];
    const dailyBreakdown = buildDailyBreakdown(start, end, transactions, purchases, expenses);
    const activeDays = dailyBreakdown.filter((day) => day.hasActivity);

    return {
      period: { start, end },
      summary: summarizeDays(dailyBreakdown),
      dailyBreakdown,
      transactions,
      purchases: purchases.sort(compareTransactions),
      expenses,
      operationalAlerts,
      activityDayCount: activeDays.length,
    };
  }
}

function mapEquipmentAttention(row) {
  return {
    id: row.id,
    name: row.name,
    assetCode: row.asset_code,
    categoryName: row.category_name,
    condition: row.condition,
    conditionCheckedOn: row.condition_checked_on,
  };
}

function mapLowStock(row, includeTireDetails) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    ...(includeTireDetails ? { size: row.size, tireType: row.tire_type } : {}),
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold,
  };
}

function mapServiceTransactions(tickets, items) {
  const itemsByTicket = groupBy(items, (item) => item.ticket_id);
  return tickets.map((ticket) => {
    const mappedItems = (itemsByTicket.get(ticket.id) ?? []).map((item) => ({
      id: item.id,
      name: item.service_name_snapshot,
      amountCentavos: item.amount_centavos,
      externalLaborCentavos: item.external_labor_cost_centavos,
    }));
    return {
      id: ticket.id,
      source: 'SERVICE',
      businessDate: ticket.business_date,
      sequence: ticket.customer_sequence,
      description: ticket.vehicle_description || ticket.vehicle_class_name_snapshot,
      secondaryDescription: ticket.plate_number,
      status: ticket.status,
      voidReason: ticket.void_reason,
      totalCentavos: sum(mappedItems.map((item) => item.amountCentavos)),
      costCentavos: sum(mappedItems.map((item) => item.externalLaborCentavos)),
      items: mappedItems,
    };
  });
}

function mapInventorySales(documents, items, source) {
  const itemsByDocument = groupBy(items, (item) => item.document_id);
  return documents.map((document) => {
    const mappedItems = (itemsByDocument.get(document.id) ?? []).map((item) => ({
      id: item.id,
      name: item.product_name_snapshot,
      quantity: item.quantity,
      amountCentavos: item.line_total_centavos,
      costCentavos: item.quantity * item.unit_cost_centavos_snapshot,
    }));
    return {
      id: document.id,
      source,
      businessDate: document.business_date,
      sequence: document.document_sequence,
      description: document.counterparty_name || (source === 'TIRE' ? 'Tire sale' : 'Canteen sale'),
      secondaryDescription: document.reference_number,
      status: document.status,
      voidReason: document.void_reason,
      totalCentavos: sum(mappedItems.map((item) => item.amountCentavos)),
      costCentavos: sum(mappedItems.map((item) => item.costCentavos)),
      items: mappedItems,
    };
  });
}

function mapPurchases(documents, items, source) {
  const itemsByDocument = groupBy(items, (item) => item.document_id);
  return documents.map((document) => ({
    id: document.id,
    source,
    businessDate: document.business_date,
    sequence: document.document_sequence,
    status: document.status,
    totalCentavos: sum(
      (itemsByDocument.get(document.id) ?? []).map((item) => item.line_total_centavos),
    ),
  }));
}

function mapExpense(row) {
  return {
    id: row.id,
    businessDate: row.business_date,
    categoryName: row.category_name_snapshot,
    sourceType: row.source_type,
    status: row.status,
    amountCentavos: row.amount_centavos,
  };
}

function buildDailyBreakdown(start, end, transactions, purchases, expenses) {
  const serviceByDate = groupBy(transactions.serviceSales, (entry) => entry.businessDate);
  const tireByDate = groupBy(transactions.tireSales, (entry) => entry.businessDate);
  const canteenByDate = groupBy(transactions.canteenSales, (entry) => entry.businessDate);
  const purchasesByDate = groupBy(purchases, (entry) => entry.businessDate);
  const expensesByDate = groupBy(expenses, (entry) => entry.businessDate);

  return dateRange(start, end)
    .map((businessDate) => {
      const services = active(serviceByDate.get(businessDate));
      const tires = active(tireByDate.get(businessDate));
      const canteen = active(canteenByDate.get(businessDate));
      const dayPurchases = active(purchasesByDate.get(businessDate));
      const dayExpenses = active(expensesByDate.get(businessDate));
      const serviceSalesCentavos = sum(services.map((entry) => entry.totalCentavos));
      const tireSalesCentavos = sum(tires.map((entry) => entry.totalCentavos));
      const canteenSalesCentavos = sum(canteen.map((entry) => entry.totalCentavos));
      const totalSalesCentavos = serviceSalesCentavos + tireSalesCentavos + canteenSalesCentavos;
      const productCostCentavos = sum([...tires, ...canteen].map((entry) => entry.costCentavos));
      const externalLaborCentavos = sum(services.map((entry) => entry.costCentavos));
      const expenseCentavos = sum(dayExpenses.map((entry) => entry.amountCentavos));
      const purchaseCentavos = sum(dayPurchases.map((entry) => entry.totalCentavos));
      const estimatedGrossProfitCentavos =
        totalSalesCentavos - productCostCentavos - externalLaborCentavos;
      return {
        businessDate,
        serviceSalesCentavos,
        tireSalesCentavos,
        canteenSalesCentavos,
        totalSalesCentavos,
        productCostCentavos,
        externalLaborCentavos,
        expenseCentavos,
        purchaseCentavos,
        estimatedGrossProfitCentavos,
        estimatedNetCentavos: estimatedGrossProfitCentavos - expenseCentavos,
        cashMovementCentavos:
          totalSalesCentavos - purchaseCentavos - expenseCentavos - externalLaborCentavos,
        serviceTransactionCount: services.length,
        tireTransactionCount: tires.length,
        canteenTransactionCount: canteen.length,
        hasActivity:
          services.length +
            tires.length +
            canteen.length +
            dayPurchases.length +
            dayExpenses.length >
          0,
      };
    })
    .reverse();
}

function summarizeDays(days) {
  const fields = [
    'serviceSalesCentavos',
    'tireSalesCentavos',
    'canteenSalesCentavos',
    'totalSalesCentavos',
    'productCostCentavos',
    'externalLaborCentavos',
    'expenseCentavos',
    'purchaseCentavos',
    'estimatedGrossProfitCentavos',
    'estimatedNetCentavos',
    'cashMovementCentavos',
    'serviceTransactionCount',
    'tireTransactionCount',
    'canteenTransactionCount',
  ];
  return Object.fromEntries(fields.map((field) => [field, sum(days.map((day) => day[field]))]));
}

function dateRange(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const final = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= final) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function active(entries = []) {
  return entries.filter((entry) => entry.status === 'ACTIVE');
}

function compareTransactions(left, right) {
  return (
    right.businessDate.localeCompare(left.businessDate) ||
    left.source.localeCompare(right.source) ||
    right.sequence - left.sequence
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
