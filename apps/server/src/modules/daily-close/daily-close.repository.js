export class DailyCloseRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  findClosedRun(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM daily_close_runs
         WHERE business_date = ? AND status = 'CLOSED'
         ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  findActivePeriodForDate(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM period_close_runs
         WHERE status = 'CLOSED' AND ? BETWEEN start_date AND end_date
         ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  listRuns(businessDate) {
    return this.database
      .prepare('SELECT * FROM daily_close_runs WHERE business_date = ? ORDER BY id DESC')
      .all(businessDate);
  }

  createRun(input) {
    const summary = input.summary;
    const result = this.database
      .prepare(
        `INSERT INTO daily_close_runs (
          business_date, service_sales_centavos, tire_sales_centavos,
          canteen_sales_centavos, total_sales_centavos, product_cost_centavos,
          external_labor_centavos, expense_centavos, purchase_centavos,
          estimated_gross_profit_centavos, estimated_net_centavos, cash_movement_centavos,
          service_transaction_count, tire_transaction_count, canteen_transaction_count,
          payroll_run_id, payroll_centavos, meal_centavos, close_note,
          closed_by_user_id, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        summary.serviceSalesCentavos,
        summary.tireSalesCentavos,
        summary.canteenSalesCentavos,
        summary.totalSalesCentavos,
        summary.productCostCentavos,
        summary.externalLaborCentavos,
        summary.expenseCentavos,
        summary.purchaseCentavos,
        summary.estimatedGrossProfitCentavos,
        summary.estimatedNetCentavos,
        summary.cashMovementCentavos,
        summary.serviceTransactionCount,
        summary.tireTransactionCount,
        summary.canteenTransactionCount,
        input.payrollRunId,
        input.payrollCentavos,
        input.mealCentavos,
        input.closeNote,
        input.actorUserId,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  reopenRun(runId, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE daily_close_runs
         SET status = 'REOPENED', reopen_reason = ?, reopened_by_user_id = ?, reopened_at = ?
         WHERE id = ? AND status = 'CLOSED'`,
      )
      .run(reason, actorUserId, now, runId);
  }
}
