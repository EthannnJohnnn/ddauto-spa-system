import { AppError } from '../../errors/app-error.js';

const MAX_PERIOD_DAYS = 31;

export class PeriodCloseService {
  constructor(
    repository,
    reportsService,
    attendanceService,
    auditRepository,
    { clock = () => new Date() } = {},
  ) {
    this.repository = repository;
    this.reportsService = reportsService;
    this.attendanceService = attendanceService;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  preview({ start, end }) {
    this.validateRange(start, end);
    this.assertNoOverlap(start, end);
    const report = this.reportsService.getOverview({ start, end });
    const financialByDate = new Map(report.dailyBreakdown.map((day) => [day.businessDate, day]));
    const days = dateRange(start, end).map((businessDate) => {
      const workforce = this.attendanceService.getDay(businessDate);
      const financial = financialByDate.get(businessDate) ?? emptyFinancialDay(businessDate);
      const payrollCost = workforce.salaryCentavos + workforce.mealCentavos;
      return {
        ...financial,
        presentEmployeeCount: workforce.presentEmployeeCount,
        salaryCentavos: workforce.salaryCentavos,
        mealCentavos: workforce.mealCentavos,
        employees: workforce.employees,
        reviewed: workforce.reviewed,
        requiresReview: workforce.requiresReview,
        hasActivity: financial.hasActivity || workforce.requiresReview,
        expenseCentavos: financial.expenseCentavos + payrollCost,
        estimatedNetCentavos: financial.estimatedNetCentavos - payrollCost,
        cashMovementCentavos: financial.cashMovementCentavos - payrollCost,
      };
    });
    const activeDays = days.filter((day) => day.hasActivity);
    if (activeDays.length === 0) {
      throw new AppError(
        409,
        'PERIOD_CLOSE_NO_ACTIVITY',
        'The selected period has no activity or attendance.',
      );
    }
    const unreviewedDates = activeDays
      .filter((day) => day.requiresReview && !day.reviewed)
      .map((day) => day.businessDate);
    const employeeTotals = aggregateEmployees(days);

    return {
      period: { start, end, dayCount: days.length },
      canClose: unreviewedDates.length === 0,
      unreviewedDates,
      summary: {
        ...report.summary,
        expenseCentavos: sum(days.map((day) => day.expenseCentavos)),
        estimatedNetCentavos: sum(days.map((day) => day.estimatedNetCentavos)),
        cashMovementCentavos: sum(days.map((day) => day.cashMovementCentavos)),
        totalSalaryCentavos: sum(days.map((day) => day.salaryCentavos)),
        totalMealCentavos: sum(days.map((day) => day.mealCentavos)),
        presentEmployeeDays: sum(days.map((day) => day.presentEmployeeCount)),
      },
      employeeTotals,
      days,
    };
  }

  history() {
    const runs = this.repository.listRuns();
    const days = this.repository.listDays(runs.map((run) => run.id));
    const employeeDays = this.repository.listEmployeeDays(runs.map((run) => run.id));
    return {
      periods: runs.map((run) => mapRun(run, days, employeeDays)),
      legacyDailyCloses: this.repository.listLegacyRuns().map(mapLegacyRun),
    };
  }

  close(input, actorUserId) {
    const preview = this.preview(input);
    if (!preview.canClose) {
      throw new AppError(
        409,
        'PERIOD_CLOSE_REVIEW_REQUIRED',
        `Review attendance for: ${preview.unreviewedDates.join(', ')}.`,
      );
    }
    const salaryCategory = this.requireSystemCategory('PAYROLL');
    const mealCategory = this.requireSystemCategory('STAFF_MEAL');
    const now = this.clock().toISOString();
    let runId;
    this.repository.transaction(() => {
      this.assertNoOverlap(input.start, input.end);
      runId = this.repository.createRun({
        ...input,
        totalSalesCentavos: preview.summary.totalSalesCentavos,
        totalPurchaseCentavos: preview.summary.purchaseCentavos,
        totalExpenseCentavos: preview.summary.expenseCentavos,
        totalSalaryCentavos: preview.summary.totalSalaryCentavos,
        totalMealCentavos: preview.summary.totalMealCentavos,
        estimatedNetCentavos: preview.summary.estimatedNetCentavos,
        actorUserId,
        now,
      });
      for (const day of preview.days) {
        this.repository.createDay(runId, day);
        for (const employee of day.employees) {
          this.repository.createEmployeeDay(runId, { ...employee, businessDate: day.businessDate });
        }
        if (day.salaryCentavos > 0) {
          this.repository.createGeneratedExpense({
            runId,
            businessDate: day.businessDate,
            categoryId: salaryCategory.id,
            categoryName: salaryCategory.name,
            description: 'Period Close employee payroll',
            amountCentavos: day.salaryCentavos,
            notes: input.closeNote,
            sourceType: 'PAYROLL',
            actorUserId,
            now,
          });
        }
        if (day.mealCentavos > 0) {
          this.repository.createGeneratedExpense({
            runId,
            businessDate: day.businessDate,
            categoryId: mealCategory.id,
            categoryName: mealCategory.name,
            description: 'Period Close staff meals',
            amountCentavos: day.mealCentavos,
            notes: input.closeNote,
            sourceType: 'STAFF_MEAL',
            actorUserId,
            now,
          });
        }
      }
      this.auditRepository.record({
        actorUserId,
        action: 'PERIOD_CLOSE_COMPLETED',
        entityType: 'PERIOD_CLOSE_RUN',
        entityId: String(runId),
        metadata: {
          start: input.start,
          end: input.end,
          employeeCount: preview.employeeTotals.length,
          totalSalaryCentavos: preview.summary.totalSalaryCentavos,
          totalMealCentavos: preview.summary.totalMealCentavos,
          closeNote: input.closeNote,
        },
        now,
      });
    });
    return this.history().periods.find((run) => run.id === runId);
  }

  reopen(id, reason, actorUserId) {
    const run = this.repository.findRun(id);
    if (!run) throw new AppError(404, 'PERIOD_CLOSE_NOT_FOUND', 'The Period Close was not found.');
    if (run.status !== 'CLOSED') {
      throw new AppError(
        409,
        'PERIOD_CLOSE_ALREADY_REOPENED',
        'This Period Close is already reopened.',
      );
    }
    const now = this.clock().toISOString();
    this.repository.transaction(() => {
      this.repository.reopenRun(run.id, reason, actorUserId, now, run.start_date, run.end_date);
      this.auditRepository.record({
        actorUserId,
        action: 'PERIOD_CLOSE_REOPENED',
        entityType: 'PERIOD_CLOSE_RUN',
        entityId: String(run.id),
        metadata: { start: run.start_date, end: run.end_date, reason },
        now,
      });
    });
    return this.history().periods.find((entry) => entry.id === id);
  }

  validateRange(start, end) {
    const dates = dateRange(start, end);
    if (start > end || dates.length === 0) {
      throw new AppError(
        400,
        'PERIOD_CLOSE_INVALID_RANGE',
        'Start date must be on or before end date.',
      );
    }
    if (dates.length > MAX_PERIOD_DAYS) {
      throw new AppError(
        400,
        'PERIOD_CLOSE_TOO_LONG',
        'A Period Close can include at most 31 days.',
      );
    }
    if (end > localDate(this.clock())) {
      throw new AppError(400, 'PERIOD_CLOSE_FUTURE_DATE', 'The end date cannot be in the future.');
    }
  }

  assertNoOverlap(start, end) {
    if (this.repository.findActiveOverlap(start, end)) {
      throw new AppError(
        409,
        'PERIOD_CLOSE_OVERLAP',
        'The selected dates overlap an active Period Close.',
      );
    }
    const legacy = this.repository.findLegacyOverlap(start, end);
    if (legacy) {
      throw new AppError(
        409,
        'PERIOD_CLOSE_LEGACY_OVERLAP',
        `${legacy.business_date} is still closed in legacy ${legacy.legacy_type.toLowerCase().replace('_', ' ')} history.`,
      );
    }
  }

  requireSystemCategory(systemCode) {
    const category = this.repository.findSystemCategory(systemCode);
    if (!category) {
      throw new AppError(
        500,
        'PERIOD_CLOSE_CATEGORY_MISSING',
        `The ${systemCode} expense category is missing.`,
      );
    }
    return category;
  }
}

function aggregateEmployees(days) {
  const totals = new Map();
  for (const day of days) {
    for (const employee of day.employees) {
      const current = totals.get(employee.employeeId) ?? {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        salaryCentavos: 0,
        mealCentavos: 0,
        dayCount: 0,
      };
      current.salaryCentavos += employee.finalSalaryCentavos;
      current.mealCentavos += employee.mealCostCentavos;
      current.dayCount += 1;
      totals.set(employee.employeeId, current);
    }
  }
  return [...totals.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

function mapRun(run, days, employeeDays) {
  const runDays = days.filter((day) => day.period_close_run_id === run.id).map(mapDaySnapshot);
  const runEmployees = employeeDays
    .filter((day) => day.period_close_run_id === run.id)
    .map(mapEmployeeSnapshot);
  return {
    id: run.id,
    start: run.start_date,
    end: run.end_date,
    status: run.status,
    totalSalesCentavos: run.total_sales_centavos,
    totalPurchaseCentavos: run.total_purchase_centavos,
    totalExpenseCentavos: run.total_expense_centavos,
    totalSalaryCentavos: run.total_salary_centavos,
    totalMealCentavos: run.total_meal_centavos,
    estimatedNetCentavos: run.estimated_net_centavos,
    closeNote: run.close_note,
    reopenReason: run.reopen_reason,
    closedAt: run.closed_at,
    reopenedAt: run.reopened_at,
    employeeTotals: aggregateSnapshotEmployees(runEmployees),
    days: runDays.map((day) => ({
      ...day,
      employees: runEmployees.filter((employee) => employee.businessDate === day.businessDate),
    })),
  };
}

function mapDaySnapshot(row) {
  return {
    businessDate: row.business_date,
    serviceSalesCentavos: row.service_sales_centavos,
    tireSalesCentavos: row.tire_sales_centavos,
    canteenSalesCentavos: row.canteen_sales_centavos,
    totalSalesCentavos: row.total_sales_centavos,
    productCostCentavos: row.product_cost_centavos,
    externalLaborCentavos: row.external_labor_centavos,
    expenseCentavos: row.expense_centavos,
    purchaseCentavos: row.purchase_centavos,
    estimatedGrossProfitCentavos: row.estimated_gross_profit_centavos,
    estimatedNetCentavos: row.estimated_net_centavos,
    cashMovementCentavos: row.cash_movement_centavos,
    serviceTransactionCount: row.service_transaction_count,
    tireTransactionCount: row.tire_transaction_count,
    canteenTransactionCount: row.canteen_transaction_count,
    presentEmployeeCount: row.present_employee_count,
    salaryCentavos: row.salary_centavos,
    mealCentavos: row.meal_centavos,
    hasActivity: Boolean(row.had_activity),
  };
}

function mapEmployeeSnapshot(row) {
  return {
    businessDate: row.business_date,
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    isPresent: Boolean(row.is_present),
    fixedDailyRateCentavos: row.fixed_daily_rate_centavos_snapshot,
    laborEarnedCentavos: row.labor_earned_centavos,
    fixedTopUpCentavos: row.fixed_top_up_centavos,
    calculatedSalaryCentavos: row.calculated_salary_centavos,
    salaryOverrideCentavos: row.salary_override_centavos,
    finalSalaryCentavos: row.final_salary_centavos,
    mealCostCentavos: row.meal_cost_centavos,
  };
}

function aggregateSnapshotEmployees(employees) {
  return aggregateEmployees(
    [...groupBy(employees, (employee) => employee.businessDate)].map(([, dayEmployees]) => ({
      employees: dayEmployees,
    })),
  );
}

function mapLegacyRun(run) {
  return {
    id: run.id,
    start: run.business_date,
    end: run.business_date,
    status: run.status,
    totalSalesCentavos: run.total_sales_centavos,
    totalPurchaseCentavos: run.purchase_centavos,
    totalExpenseCentavos: run.expense_centavos,
    totalSalaryCentavos: run.payroll_centavos,
    totalMealCentavos: run.meal_centavos,
    estimatedNetCentavos: run.estimated_net_centavos,
    closeNote: run.close_note,
    reopenReason: run.reopen_reason,
    closedAt: run.closed_at,
    reopenedAt: run.reopened_at,
  };
}

function emptyFinancialDay(businessDate) {
  return {
    businessDate,
    serviceSalesCentavos: 0,
    tireSalesCentavos: 0,
    canteenSalesCentavos: 0,
    totalSalesCentavos: 0,
    productCostCentavos: 0,
    externalLaborCentavos: 0,
    expenseCentavos: 0,
    purchaseCentavos: 0,
    estimatedGrossProfitCentavos: 0,
    estimatedNetCentavos: 0,
    cashMovementCentavos: 0,
    serviceTransactionCount: 0,
    tireTransactionCount: 0,
    canteenTransactionCount: 0,
    hasActivity: false,
  };
}

function dateRange(start, end) {
  if (start > end) return [];
  const dates = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const final = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= final) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export const periodCloseInternals = { dateRange, MAX_PERIOD_DAYS };
