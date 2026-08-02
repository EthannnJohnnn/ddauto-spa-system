import { AppError } from '../../errors/app-error.js';

export class DailyCloseService {
  constructor(
    repository,
    reportsService,
    payrollService,
    auditRepository,
    { clock = () => new Date() } = {},
  ) {
    this.repository = repository;
    this.reportsService = reportsService;
    this.payrollService = payrollService;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  getDailyClose(businessDate) {
    const report = this.reportsService.getOverview({ start: businessDate, end: businessDate });
    const payroll = this.payrollService.getDailyPayroll(businessDate);
    const runs = this.repository.listRuns(businessDate).map(mapRun);
    return {
      businessDate,
      isClosed: runs.some((run) => run.status === 'CLOSED'),
      preview: { summary: report.summary, hasActivity: report.activityDayCount > 0 },
      payroll: {
        isClosed: payroll.isClosed,
        hasEmployees: payroll.preview.payroll.length > 0,
      },
      runs,
    };
  }

  close(input, actorUserId) {
    if (this.repository.findClosedRun(input.businessDate)) {
      throw new AppError(
        409,
        'DAILY_CLOSE_ALREADY_CLOSED',
        'This business date is already closed.',
      );
    }
    const payroll = this.payrollService.getDailyPayroll(input.businessDate);
    if (payroll.preview.payroll.length > 0 && !payroll.isClosed) {
      throw new AppError(
        409,
        'DAILY_CLOSE_PAYROLL_OPEN',
        'Close payroll for this date before completing the daily close.',
      );
    }
    const report = this.reportsService.getOverview({
      start: input.businessDate,
      end: input.businessDate,
    });
    const activePayrollRun = payroll.runs.find((run) => run.status === 'CLOSED');
    const now = this.clock().toISOString();
    let runId;
    this.repository.transaction(() => {
      if (this.repository.findClosedRun(input.businessDate)) {
        throw new AppError(
          409,
          'DAILY_CLOSE_ALREADY_CLOSED',
          'This business date is already closed.',
        );
      }
      runId = this.repository.createRun({
        ...input,
        summary: report.summary,
        payrollRunId: activePayrollRun?.id ?? null,
        payrollCentavos: activePayrollRun?.totalSalaryCentavos ?? 0,
        mealCentavos: activePayrollRun?.totalMealCentavos ?? 0,
        actorUserId,
        now,
      });
      this.auditRepository.record({
        actorUserId,
        action: 'DAILY_CLOSE_COMPLETED',
        entityType: 'DAILY_CLOSE_RUN',
        entityId: String(runId),
        metadata: {
          businessDate: input.businessDate,
          summary: report.summary,
          closeNote: input.closeNote,
        },
        now,
      });
    });
    return this.getDailyClose(input.businessDate);
  }

  reopen(input, actorUserId) {
    const run = this.repository.findClosedRun(input.businessDate);
    if (!run) {
      throw new AppError(409, 'DAILY_CLOSE_NOT_CLOSED', 'This business date is not closed.');
    }
    const now = this.clock().toISOString();
    this.repository.transaction(() => {
      this.repository.reopenRun(run.id, input.reason, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: 'DAILY_CLOSE_REOPENED',
        entityType: 'DAILY_CLOSE_RUN',
        entityId: String(run.id),
        metadata: { businessDate: input.businessDate, reason: input.reason },
        now,
      });
    });
    return this.getDailyClose(input.businessDate);
  }
}

export class BusinessDateGuard {
  constructor(repository) {
    this.repository = repository;
  }

  assertOpen(businessDate) {
    if (this.repository.findClosedRun(businessDate)) {
      throw new AppError(
        409,
        'DAILY_CLOSE_DATE_CLOSED',
        'Reopen Daily Close for this date before changing its business records.',
      );
    }
  }
}

function mapRun(row) {
  return {
    id: row.id,
    businessDate: row.business_date,
    status: row.status,
    summary: {
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
    },
    payrollRunId: row.payroll_run_id,
    payrollCentavos: row.payroll_centavos,
    mealCentavos: row.meal_centavos,
    closeNote: row.close_note,
    reopenReason: row.reopen_reason,
    closedAt: row.closed_at,
    reopenedAt: row.reopened_at,
  };
}
