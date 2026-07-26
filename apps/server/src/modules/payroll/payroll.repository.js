export class PayrollRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  findClosedRun(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM payroll_runs
         WHERE business_date = ? AND status = 'CLOSED'
         ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
  }

  listRuns(businessDate) {
    return this.database
      .prepare('SELECT * FROM payroll_runs WHERE business_date = ? ORDER BY id DESC')
      .all(businessDate);
  }

  listItems(runIds) {
    if (runIds.length === 0) return [];
    const placeholders = runIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM payroll_run_items
         WHERE payroll_run_id IN (${placeholders})
         ORDER BY payroll_run_id DESC, employee_id`,
      )
      .all(...runIds);
  }

  listGeneratedExpenses(runIds) {
    if (runIds.length === 0) return [];
    const placeholders = runIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM expense_transactions
         WHERE payroll_run_id IN (${placeholders})
         ORDER BY payroll_run_id DESC, id`,
      )
      .all(...runIds);
  }

  findExpenseCategoryBySystemCode(systemCode) {
    return this.database
      .prepare('SELECT * FROM expense_categories WHERE system_code = ?')
      .get(systemCode);
  }

  createRun(input) {
    const result = this.database
      .prepare(
        `INSERT INTO payroll_runs (
          business_date, total_salary_centavos, total_meal_centavos, close_note,
          closed_by_user_id, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        input.totalSalaryCentavos,
        input.totalMealCentavos,
        input.closeNote,
        input.actorUserId,
        input.now,
      );
    return Number(result.lastInsertRowid);
  }

  createRunItem(runId, item) {
    this.database
      .prepare(
        `INSERT INTO payroll_run_items (
          payroll_run_id, employee_id, employee_name_snapshot,
          fixed_daily_rate_centavos_snapshot, labor_earned_centavos,
          fixed_top_up_centavos, total_pay_centavos, meal_cost_centavos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        item.employeeId,
        item.employeeName,
        item.fixedDailyRateCentavos,
        item.laborEarnedCentavos,
        item.fixedTopUpCentavos,
        item.totalPayCentavos,
        item.mealCostCentavos,
      );
  }

  createGeneratedExpense(input) {
    this.database
      .prepare(
        `INSERT INTO expense_transactions (
          business_date, category_id, category_name_snapshot, description, payee,
          reference_number, amount_centavos, notes, source_type, payroll_run_id,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        input.categoryId,
        input.categoryName,
        input.description,
        `PAYROLL-${input.payrollRunId}`,
        input.amountCentavos,
        input.notes,
        input.sourceType,
        input.payrollRunId,
        input.actorUserId,
        input.actorUserId,
        input.now,
        input.now,
      );
  }

  reopenRun(runId, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE payroll_runs
         SET status = 'REOPENED', reopen_reason = ?, reopened_by_user_id = ?, reopened_at = ?
         WHERE id = ? AND status = 'CLOSED'`,
      )
      .run(reason, actorUserId, now, runId);
    this.database
      .prepare(
        `UPDATE expense_transactions
         SET status = 'VOIDED', void_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE payroll_run_id = ? AND status = 'ACTIVE'`,
      )
      .run(reason, actorUserId, now, runId);
  }
}
