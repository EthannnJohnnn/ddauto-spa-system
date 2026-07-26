import { AppError } from '../../errors/app-error.js';

export class PayrollService {
  constructor(
    repository,
    serviceSalesService,
    auditRepository,
    { clock = () => new Date(), dateGuard = null } = {},
  ) {
    this.repository = repository;
    this.serviceSalesService = serviceSalesService;
    this.auditRepository = auditRepository;
    this.clock = clock;
    this.dateGuard = dateGuard;
  }

  getDailyPayroll(businessDate) {
    const preview = this.serviceSalesService.getDailySales(businessDate);
    const runs = this.repository.listRuns(businessDate);
    const items = this.repository.listItems(runs.map((run) => run.id));
    const expenses = this.repository.listGeneratedExpenses(runs.map((run) => run.id));
    return {
      businessDate,
      isClosed: runs.some((run) => run.status === 'CLOSED'),
      preview: {
        payroll: preview.payroll,
        summary: preview.summary,
      },
      runs: runs.map((run) => mapRun(run, items, expenses)),
    };
  }

  close(input, actorUserId) {
    this.dateGuard?.assertOpen(input.businessDate);
    if (this.repository.findClosedRun(input.businessDate)) {
      throw new AppError(409, 'PAYROLL_ALREADY_CLOSED', 'Payroll is already closed for this date.');
    }
    const daily = this.serviceSalesService.getDailySales(input.businessDate);
    if (daily.payroll.length === 0) {
      throw new AppError(
        409,
        'PAYROLL_NO_ATTENDANCE',
        'Mark at least one employee present before closing payroll.',
      );
    }

    const attendanceByEmployee = new Map(
      daily.attendance.map((entry) => [entry.employeeId, entry]),
    );
    const items = daily.payroll.map((entry) => ({
      ...entry,
      mealCostCentavos: attendanceByEmployee.get(entry.employeeId)?.mealCostCentavos ?? 0,
    }));
    const totalSalaryCentavos = sum(items.map((item) => item.totalPayCentavos));
    const totalMealCentavos = sum(items.map((item) => item.mealCostCentavos));
    const salaryCategory = this.requireSystemCategory('PAYROLL');
    const mealCategory = this.requireSystemCategory('STAFF_MEAL');
    const now = this.now();
    let runId;

    this.repository.transaction(() => {
      if (this.repository.findClosedRun(input.businessDate)) {
        throw new AppError(
          409,
          'PAYROLL_ALREADY_CLOSED',
          'Payroll is already closed for this date.',
        );
      }
      runId = this.repository.createRun({
        ...input,
        totalSalaryCentavos,
        totalMealCentavos,
        actorUserId,
        now,
      });
      for (const item of items) this.repository.createRunItem(runId, item);
      if (totalSalaryCentavos > 0) {
        this.repository.createGeneratedExpense({
          businessDate: input.businessDate,
          categoryId: salaryCategory.id,
          categoryName: salaryCategory.name,
          description: 'Finalized employee payroll',
          amountCentavos: totalSalaryCentavos,
          notes: input.closeNote,
          sourceType: 'PAYROLL',
          payrollRunId: runId,
          actorUserId,
          now,
        });
      }
      if (totalMealCentavos > 0) {
        this.repository.createGeneratedExpense({
          businessDate: input.businessDate,
          categoryId: mealCategory.id,
          categoryName: mealCategory.name,
          description: 'Finalized staff meals',
          amountCentavos: totalMealCentavos,
          notes: input.closeNote,
          sourceType: 'STAFF_MEAL',
          payrollRunId: runId,
          actorUserId,
          now,
        });
      }
      this.auditRepository.record({
        actorUserId,
        action: 'PAYROLL_CLOSED',
        entityType: 'PAYROLL_RUN',
        entityId: String(runId),
        metadata: {
          businessDate: input.businessDate,
          totalSalaryCentavos,
          totalMealCentavos,
          employeeCount: items.length,
          closeNote: input.closeNote,
        },
        now,
      });
    });

    return this.getDailyPayroll(input.businessDate);
  }

  reopen(input, actorUserId) {
    this.dateGuard?.assertOpen(input.businessDate);
    const run = this.repository.findClosedRun(input.businessDate);
    if (!run) {
      throw new AppError(409, 'PAYROLL_NOT_CLOSED', 'Payroll is not closed for this date.');
    }
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.reopenRun(run.id, input.reason, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: 'PAYROLL_REOPENED',
        entityType: 'PAYROLL_RUN',
        entityId: String(run.id),
        metadata: { businessDate: input.businessDate, reason: input.reason },
        now,
      });
    });
    return this.getDailyPayroll(input.businessDate);
  }

  requireSystemCategory(systemCode) {
    const category = this.repository.findExpenseCategoryBySystemCode(systemCode);
    if (!category) {
      throw new AppError(
        500,
        'PAYROLL_CATEGORY_MISSING',
        `The ${systemCode} expense category is missing.`,
      );
    }
    return category;
  }

  now() {
    return this.clock().toISOString();
  }
}

function mapRun(run, items, expenses) {
  return {
    id: run.id,
    businessDate: run.business_date,
    status: run.status,
    totalSalaryCentavos: run.total_salary_centavos,
    totalMealCentavos: run.total_meal_centavos,
    closeNote: run.close_note,
    reopenReason: run.reopen_reason,
    closedAt: run.closed_at,
    reopenedAt: run.reopened_at,
    items: items
      .filter((item) => item.payroll_run_id === run.id)
      .map((item) => ({
        employeeId: item.employee_id,
        employeeName: item.employee_name_snapshot,
        fixedDailyRateCentavos: item.fixed_daily_rate_centavos_snapshot,
        laborEarnedCentavos: item.labor_earned_centavos,
        fixedTopUpCentavos: item.fixed_top_up_centavos,
        totalPayCentavos: item.total_pay_centavos,
        mealCostCentavos: item.meal_cost_centavos,
      })),
    generatedExpenses: expenses
      .filter((expense) => expense.payroll_run_id === run.id)
      .map((expense) => ({
        id: expense.id,
        sourceType: expense.source_type,
        categoryName: expense.category_name_snapshot,
        amountCentavos: expense.amount_centavos,
        status: expense.status,
        voidReason: expense.void_reason,
      })),
  };
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
