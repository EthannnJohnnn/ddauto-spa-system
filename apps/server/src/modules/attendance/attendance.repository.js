export class AttendanceRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  listRelevantDates(through) {
    return this.database
      .prepare(
        `SELECT business_date FROM daily_attendance WHERE business_date <= ?
         UNION
         SELECT business_date FROM service_tickets
          WHERE business_date <= ? AND status = 'ACTIVE'
         ORDER BY business_date`,
      )
      .all(through, through)
      .map((row) => row.business_date);
  }

  hasAttendanceRecord(businessDate) {
    return Boolean(
      this.database
        .prepare('SELECT 1 FROM daily_attendance WHERE business_date = ? LIMIT 1')
        .get(businessDate),
    );
  }

  findReview(businessDate) {
    return this.database
      .prepare('SELECT * FROM attendance_day_reviews WHERE business_date = ?')
      .get(businessDate);
  }

  setReviewed(businessDate, actorUserId, now) {
    this.database
      .prepare(
        `INSERT INTO attendance_day_reviews (business_date, reviewed_by_user_id, reviewed_at)
         VALUES (?, ?, ?)
         ON CONFLICT (business_date) DO UPDATE SET
           reviewed_by_user_id = excluded.reviewed_by_user_id,
           reviewed_at = excluded.reviewed_at`,
      )
      .run(businessDate, actorUserId, now);
  }

  clearReview(businessDate) {
    this.database
      .prepare('DELETE FROM attendance_day_reviews WHERE business_date = ?')
      .run(businessDate);
  }

  findCloseForDate(businessDate) {
    const period = this.database
      .prepare(
        `SELECT run.id, run.start_date, run.end_date, run.closed_at
         FROM period_close_runs run
         JOIN period_close_days day ON day.period_close_run_id = run.id
         WHERE run.status = 'CLOSED' AND day.business_date = ?
         ORDER BY run.id DESC LIMIT 1`,
      )
      .get(businessDate);
    if (period) return { type: 'SALARY_PAYMENT', ...period };

    const daily = this.database
      .prepare(
        `SELECT id, business_date AS start_date, business_date AS end_date, closed_at
         FROM daily_close_runs
         WHERE status = 'CLOSED' AND business_date = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
    if (daily) return { type: 'LEGACY_DAILY_CLOSE', ...daily };

    const payroll = this.database
      .prepare(
        `SELECT id, business_date AS start_date, business_date AS end_date, closed_at
         FROM payroll_runs
         WHERE status = 'CLOSED' AND business_date = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(businessDate);
    return payroll ? { type: 'LEGACY_PAYROLL', ...payroll } : null;
  }
}
