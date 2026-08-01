export class PeriodCloseRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  findRun(id) {
    return this.database.prepare('SELECT * FROM period_close_runs WHERE id = ?').get(id);
  }

  findActiveForDate(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM period_close_runs
         WHERE status = 'CLOSED' AND ? BETWEEN start_date AND end_date
         ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  findActiveOverlap(start, end) {
    return this.database
      .prepare(
        `SELECT * FROM period_close_runs
         WHERE status = 'CLOSED' AND start_date <= ? AND end_date >= ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(end, start);
  }

  findLegacyOverlap(start, end) {
    const daily = this.database
      .prepare(
        `SELECT id, business_date, 'DAILY_CLOSE' AS legacy_type FROM daily_close_runs
         WHERE status = 'CLOSED' AND business_date BETWEEN ? AND ?
         ORDER BY business_date LIMIT 1`,
      )
      .get(start, end);
    if (daily) return daily;
    return this.database
      .prepare(
        `SELECT id, business_date, 'PAYROLL' AS legacy_type FROM payroll_runs
         WHERE status = 'CLOSED' AND business_date BETWEEN ? AND ?
         ORDER BY business_date LIMIT 1`,
      )
      .get(start, end);
  }

  listRuns() {
    return this.database
      .prepare('SELECT * FROM period_close_runs ORDER BY start_date DESC, id DESC')
      .all();
  }

  listDays(runIds) {
    if (runIds.length === 0) return [];
    const placeholders = runIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM period_close_days
         WHERE period_close_run_id IN (${placeholders})
         ORDER BY business_date, id`,
      )
      .all(...runIds);
  }

  listEmployeeDays(runIds) {
    if (runIds.length === 0) return [];
    const placeholders = runIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM period_close_employee_days
         WHERE period_close_run_id IN (${placeholders})
         ORDER BY business_date, employee_name_snapshot COLLATE NOCASE, employee_id`,
      )
      .all(...runIds);
  }

  listLegacyRuns() {
    return this.database
      .prepare(
        `SELECT daily.id, daily.business_date, daily.status, daily.close_note,
                daily.reopen_reason, daily.closed_at, daily.reopened_at,
                daily.total_sales_centavos, daily.purchase_centavos,
                daily.expense_centavos, daily.estimated_net_centavos,
                daily.payroll_centavos, daily.meal_centavos
         FROM daily_close_runs daily
         ORDER BY daily.business_date DESC, daily.id DESC`,
      )
      .all();
  }

  findSystemCategory(systemCode) {
    return this.database
      .prepare('SELECT * FROM expense_categories WHERE system_code = ?')
      .get(systemCode);
  }

  createRun(input) {
    const result = this.database
      .prepare(
        `INSERT INTO period_close_runs (
          start_date, end_date, total_sales_centavos, total_purchase_centavos,
          total_expense_centavos, total_salary_centavos, total_meal_centavos,
          estimated_net_centavos, close_note, closed_by_user_id, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.start,
        input.end,
        input.totalSalesCentavos,
        input.totalPurchaseCentavos,
        input.totalExpenseCentavos,
        input.totalSalaryCentavos,
        input.totalMealCentavos,
        input.estimatedNetCentavos,
        input.closeNote,
        input.actorUserId,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  createDay(runId, day) {
    this.database
      .prepare(
        `INSERT INTO period_close_days (
          period_close_run_id, business_date, service_sales_centavos,
          tire_sales_centavos, canteen_sales_centavos, total_sales_centavos,
          product_cost_centavos, external_labor_centavos, expense_centavos,
          purchase_centavos, estimated_gross_profit_centavos, estimated_net_centavos,
          cash_movement_centavos, service_transaction_count, tire_transaction_count,
          canteen_transaction_count, present_employee_count, salary_centavos,
          meal_centavos, had_activity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        day.businessDate,
        day.serviceSalesCentavos,
        day.tireSalesCentavos,
        day.canteenSalesCentavos,
        day.totalSalesCentavos,
        day.productCostCentavos,
        day.externalLaborCentavos,
        day.expenseCentavos,
        day.purchaseCentavos,
        day.estimatedGrossProfitCentavos,
        day.estimatedNetCentavos,
        day.cashMovementCentavos,
        day.serviceTransactionCount,
        day.tireTransactionCount,
        day.canteenTransactionCount,
        day.presentEmployeeCount,
        day.salaryCentavos,
        day.mealCentavos,
        Number(day.hasActivity),
      );
  }

  createEmployeeDay(runId, day) {
    this.database
      .prepare(
        `INSERT INTO period_close_employee_days (
          period_close_run_id, business_date, employee_id, employee_name_snapshot,
          is_present, fixed_daily_rate_centavos_snapshot, labor_earned_centavos,
          fixed_top_up_centavos, calculated_salary_centavos,
          salary_override_centavos, final_salary_centavos, meal_cost_centavos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        day.businessDate,
        day.employeeId,
        day.employeeName,
        Number(day.isPresent),
        day.fixedDailyRateCentavos,
        day.laborEarnedCentavos,
        day.fixedTopUpCentavos,
        day.calculatedSalaryCentavos,
        day.salaryOverrideCentavos,
        day.finalSalaryCentavos,
        day.mealCostCentavos,
      );
  }

  createGeneratedExpense(input) {
    this.database
      .prepare(
        `INSERT INTO expense_transactions (
          business_date, category_id, category_name_snapshot, description, payee,
          reference_number, amount_centavos, notes, source_type,
          period_close_run_id, period_close_business_date,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        input.categoryId,
        input.categoryName,
        input.description,
        `PERIOD-CLOSE-${input.runId}-${input.businessDate}`,
        input.amountCentavos,
        input.notes,
        input.sourceType,
        input.runId,
        input.businessDate,
        input.actorUserId,
        input.actorUserId,
        input.now,
        input.now,
      );
  }

  reopenRun(runId, reason, actorUserId, now, start, end) {
    this.database
      .prepare(
        `UPDATE period_close_runs
         SET status = 'REOPENED', reopen_reason = ?, reopened_by_user_id = ?, reopened_at = ?
         WHERE id = ? AND status = 'CLOSED'`,
      )
      .run(reason || null, actorUserId, now, runId);
    this.database
      .prepare(
        `UPDATE expense_transactions
         SET status = 'VOIDED', void_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE period_close_run_id = ? AND status = 'ACTIVE'`,
      )
      .run(reason || null, actorUserId, now, runId);
    this.database
      .prepare('DELETE FROM attendance_day_reviews WHERE business_date BETWEEN ? AND ?')
      .run(start, end);
  }
}
