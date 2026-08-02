import { buildReportsWorkbook } from './reports-excel.js';

export class ReportsService {
  constructor(repository, { attendanceService = null } = {}) {
    this.repository = repository;
    this.attendanceService = attendanceService;
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
    const financialDays = buildDailyBreakdown(start, end, transactions, purchases, expenses);
    const dailyBreakdown = financialDays.map((day) => {
      const workforce = this.getWorkforceDay(day.businessDate);
      return {
        ...day,
        ...workforce,
        hasActivity:
          day.hasActivity ||
          workforce.hasActivity ||
          workforce.presentEmployeeCount > 0 ||
          workforce.salaryCentavos > 0 ||
          workforce.mealCentavos > 0,
      };
    });
    const activeDays = dailyBreakdown.filter((day) => day.hasActivity);
    const reportBoard = this.buildReportBoard({
      start,
      end,
      transactions,
      purchases,
      expenses,
      summary: summarizeDays(dailyBreakdown),
    });

    return {
      period: { start, end },
      summary: reportBoard.totals,
      reportBoard,
      dailyBreakdown,
      transactions,
      purchases: purchases.sort(compareTransactions),
      expenses,
      operationalAlerts,
      activityDayCount: activeDays.length,
    };
  }

  async exportExcel({ start, end }, options) {
    return buildReportsWorkbook(this.getOverview({ start, end }), options);
  }

  getWorkforceDay(businessDate) {
    const periodDay = this.repository.findActivePeriodDay(businessDate);
    if (periodDay) {
      return {
        presentEmployeeCount: periodDay.present_employee_count,
        salaryCentavos: periodDay.salary_centavos,
        earnedSalaryCentavos: periodDay.salary_centavos,
        paidSalaryCentavos: periodDay.salary_centavos,
        unpaidSalaryCentavos: 0,
        mealCentavos: periodDay.meal_centavos,
        salaryPaymentStatus: 'PAID',
        salaryPaymentId: periodDay.close_id,
        salaryPaymentStart: periodDay.start_date,
        salaryPaymentEnd: periodDay.end_date,
      };
    }
    const legacy = this.repository.findLegacyPayrollDay(businessDate);
    if (legacy) {
      return {
        presentEmployeeCount: legacy.employee_count,
        salaryCentavos: legacy.total_salary_centavos,
        earnedSalaryCentavos: legacy.total_salary_centavos,
        paidSalaryCentavos: legacy.total_salary_centavos,
        unpaidSalaryCentavos: 0,
        mealCentavos: legacy.total_meal_centavos,
        salaryPaymentStatus: 'PAID (legacy)',
        salaryPaymentId: legacy.close_id,
        salaryPaymentStart: businessDate,
        salaryPaymentEnd: businessDate,
      };
    }
    const attendance = this.attendanceService?.getDay(businessDate);
    return {
      presentEmployeeCount: attendance?.presentEmployeeCount ?? 0,
      salaryCentavos: attendance?.salaryCentavos ?? 0,
      earnedSalaryCentavos: attendance?.salaryCentavos ?? 0,
      paidSalaryCentavos: 0,
      unpaidSalaryCentavos: attendance?.salaryCentavos ?? 0,
      mealCentavos: attendance?.mealCentavos ?? 0,
      salaryPaymentStatus: 'OPEN',
      salaryPaymentId: null,
      salaryPaymentStart: null,
      salaryPaymentEnd: null,
    };
  }

  buildReportBoard({ start, end, transactions, purchases, expenses, summary }) {
    const serviceAmounts = new Map(
      this.repository.listActiveServices().map((service) => [service.name, 0]),
    );
    let totalServiced = 0;
    for (const ticket of active(transactions.serviceSales)) {
      for (const item of ticket.items) {
        serviceAmounts.set(item.name, (serviceAmounts.get(item.name) ?? 0) + item.amountCentavos);
        totalServiced += 1;
      }
    }
    const incomeBreakdown = [
      ...[...serviceAmounts].map(([label, amountCentavos]) => ({
        key: `SERVICE:${label}`,
        label,
        amountCentavos,
      })),
      { key: 'TIRE', label: 'Tire Sales', amountCentavos: summary.tireSalesCentavos },
      { key: 'CANTEEN', label: 'Canteen Sales', amountCentavos: summary.canteenSalesCentavos },
    ];
    const expenseAmounts = new Map();
    for (const expense of active(expenses)) {
      expenseAmounts.set(
        expense.categoryName,
        (expenseAmounts.get(expense.categoryName) ?? 0) + expense.amountCentavos,
      );
    }
    const expenseBreakdown = [...expenseAmounts]
      .map(([label, amountCentavos]) => ({ label, amountCentavos }))
      .sort(
        (left, right) =>
          right.amountCentavos - left.amountCentavos || left.label.localeCompare(right.label),
      );
    const employeeSalaryBreakdown = this.buildEmployeeSalaryBreakdown(start, end);
    const operatingProfitCentavos = summary.totalSalesCentavos - summary.expenseCentavos;
    const totalSales = summary.totalSalesCentavos;
    const totals = {
      ...summary,
      operatingProfitCentavos,
      expenseRateBasisPoints: ratioBasisPoints(summary.expenseCentavos, totalSales),
      profitRateBasisPoints: ratioBasisPoints(operatingProfitCentavos, totalSales),
      totalServiced,
    };
    return {
      totalServiced,
      incomeBreakdown,
      expenseBreakdown,
      employeeSalaryBreakdown,
      purchasesCentavos: sum(active(purchases).map((entry) => entry.totalCentavos)),
      directProductCostCentavos: summary.productCostCentavos,
      externalContractorCostCentavos: summary.externalLaborCentavos,
      totals,
    };
  }

  buildEmployeeSalaryBreakdown(start, end) {
    const totals = new Map();
    const add = (employee, field) => {
      const current = totals.get(employee.employee_id) ?? {
        employeeId: employee.employee_id,
        employeeName: employee.employee_name_snapshot,
        paidSalaryCentavos: 0,
        unpaidSalaryCentavos: 0,
      };
      current[field] += employee.final_salary_centavos;
      totals.set(employee.employee_id, current);
    };
    for (const employee of this.repository.listPaidEmployeeDays(start, end)) {
      add(employee, 'paidSalaryCentavos');
    }
    for (const employee of this.repository.listLegacyPaidEmployeeDays(start, end)) {
      add(employee, 'paidSalaryCentavos');
    }
    for (const businessDate of dateRange(start, end)) {
      const attendance = this.attendanceService?.getDay(businessDate);
      if (!attendance || attendance.status !== 'OPEN') continue;
      for (const employee of attendance.employees) {
        add(
          {
            employee_id: employee.employeeId,
            employee_name_snapshot: employee.employeeName,
            final_salary_centavos: employee.finalSalaryCentavos,
          },
          'unpaidSalaryCentavos',
        );
      }
    }
    return [...totals.values()]
      .map((employee) => ({
        ...employee,
        earnedSalaryCentavos: employee.paidSalaryCentavos + employee.unpaidSalaryCentavos,
      }))
      .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
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
  return documents.map((document) => {
    const mappedItems = (itemsByDocument.get(document.id) ?? []).map((item) => ({
      id: item.id,
      name: item.product_name_snapshot,
      quantity: item.quantity,
      unitCostCentavos: item.unit_cost_centavos_snapshot,
      totalCentavos: item.line_total_centavos,
    }));
    return {
      id: document.id,
      source,
      businessDate: document.business_date,
      sequence: document.document_sequence,
      status: document.status,
      items: mappedItems,
      totalCentavos: sum(mappedItems.map((item) => item.totalCentavos)),
    };
  });
}

function mapExpense(row) {
  return {
    id: row.id,
    businessDate: row.business_date,
    categoryName: row.category_name_snapshot,
    sourceType: row.source_type,
    status: row.status,
    description: row.description,
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
    'presentEmployeeCount',
    'salaryCentavos',
    'earnedSalaryCentavos',
    'paidSalaryCentavos',
    'unpaidSalaryCentavos',
    'mealCentavos',
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

function ratioBasisPoints(amount, total) {
  return total === 0 ? 0 : Math.round((amount * 10_000) / total);
}
