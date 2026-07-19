export class ServiceSalesRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  findVehicleClass(id) {
    return this.database.prepare('SELECT * FROM vehicle_classes WHERE id = ?').get(id);
  }

  findService(id) {
    return this.database.prepare('SELECT * FROM services WHERE id = ?').get(id);
  }

  findEmployee(id) {
    return this.database.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  }

  findActiveSpecialist() {
    return this.database
      .prepare('SELECT * FROM employees WHERE is_active = 1 AND is_specialist = 1')
      .get();
  }

  nextCustomerSequence(businessDate) {
    return this.database
      .prepare(
        `SELECT COALESCE(MAX(customer_sequence), 0) + 1 AS next_sequence
           FROM service_tickets
           WHERE business_date = ?`,
      )
      .get(businessDate).next_sequence;
  }

  createTicket(input) {
    const result = this.database
      .prepare(
        `INSERT INTO service_tickets (
          business_date, customer_sequence, vehicle_class_id,
          vehicle_class_name_snapshot, vehicle_description, plate_number, notes,
          created_by_user_id, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.businessDate,
        input.customerSequence,
        input.vehicleClassId,
        input.vehicleClassNameSnapshot,
        input.vehicleDescription,
        input.plateNumber,
        input.notes,
        input.actorUserId,
        input.actorUserId,
        input.now,
        input.now,
      );

    return Number(result.lastInsertRowid);
  }

  updateTicket(ticketId, input) {
    this.database
      .prepare(
        `UPDATE service_tickets
         SET business_date = ?, customer_sequence = ?, vehicle_class_id = ?,
             vehicle_class_name_snapshot = ?, vehicle_description = ?, plate_number = ?,
             notes = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.businessDate,
        input.customerSequence,
        input.vehicleClassId,
        input.vehicleClassNameSnapshot,
        input.vehicleDescription,
        input.plateNumber,
        input.notes,
        input.actorUserId,
        input.now,
        ticketId,
      );
  }

  replaceTicketItems(ticketId, items, now) {
    this.database.prepare('DELETE FROM service_ticket_items WHERE ticket_id = ?').run(ticketId);
    for (const item of items) {
      const result = this.database
        .prepare(
          `INSERT INTO service_ticket_items (
            ticket_id, service_id, service_name_snapshot, labor_policy_snapshot,
            labor_rate_basis_points_snapshot, amount_centavos, labor_pool_centavos,
            external_contractor_name, external_labor_cost_centavos, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          ticketId,
          item.serviceId,
          item.serviceNameSnapshot,
          item.laborPolicySnapshot,
          item.laborRateBasisPointsSnapshot,
          item.amountCentavos,
          item.laborPoolCentavos,
          item.externalContractorName,
          item.externalLaborCostCentavos,
          now,
        );
      const itemId = Number(result.lastInsertRowid);
      for (const worker of item.workers) {
        this.database
          .prepare(
            `INSERT INTO service_ticket_item_workers (
              item_id, employee_id, employee_name_snapshot, labor_share_centavos
            ) VALUES (?, ?, ?, ?)`,
          )
          .run(itemId, worker.employeeId, worker.employeeNameSnapshot, worker.laborShareCentavos);
      }
    }
  }

  findTicket(ticketId) {
    return this.database.prepare('SELECT * FROM service_tickets WHERE id = ?').get(ticketId);
  }

  setTicketStatus(ticketId, status, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE service_tickets
         SET status = ?, void_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, status === 'VOIDED' ? reason : null, actorUserId, now, ticketId);
  }

  listTicketRows(businessDate) {
    return this.database
      .prepare(
        `SELECT * FROM service_tickets
         WHERE business_date = ?
         ORDER BY customer_sequence, id`,
      )
      .all(businessDate);
  }

  listItemRowsForTickets(ticketIds) {
    if (ticketIds.length === 0) return [];
    const placeholders = ticketIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM service_ticket_items
         WHERE ticket_id IN (${placeholders})
         ORDER BY ticket_id, id`,
      )
      .all(...ticketIds);
  }

  listWorkerRowsForItems(itemIds) {
    if (itemIds.length === 0) return [];
    const placeholders = itemIds.map(() => '?').join(',');
    return this.database
      .prepare(
        `SELECT * FROM service_ticket_item_workers
         WHERE item_id IN (${placeholders})
         ORDER BY item_id, employee_id`,
      )
      .all(...itemIds);
  }

  listAttendance(businessDate) {
    return this.database
      .prepare(
        `SELECT
          e.id AS employee_id,
          e.display_name AS current_display_name,
          e.fixed_daily_rate_centavos AS current_fixed_daily_rate_centavos,
          e.is_active AS employee_is_active,
          COALESCE(da.employee_name_snapshot, e.display_name) AS employee_name_snapshot,
          COALESCE(da.fixed_daily_rate_centavos_snapshot, e.fixed_daily_rate_centavos)
            AS fixed_daily_rate_centavos_snapshot,
          COALESCE(da.is_present, 0) AS is_present,
          COALESCE(da.meal_cost_centavos, 0) AS meal_cost_centavos
         FROM employees e
         LEFT JOIN daily_attendance da
           ON da.employee_id = e.id AND da.business_date = ?
         WHERE e.is_active = 1 OR da.employee_id IS NOT NULL
         ORDER BY e.is_active DESC, e.display_name COLLATE NOCASE, e.id`,
      )
      .all(businessDate);
  }

  upsertAttendance({ businessDate, employee, isPresent, mealCostCentavos, actorUserId, now }) {
    this.database
      .prepare(
        `INSERT INTO daily_attendance (
          business_date, employee_id, employee_name_snapshot,
          fixed_daily_rate_centavos_snapshot, is_present, meal_cost_centavos,
          updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (business_date, employee_id) DO UPDATE SET
          employee_name_snapshot = excluded.employee_name_snapshot,
          fixed_daily_rate_centavos_snapshot = excluded.fixed_daily_rate_centavos_snapshot,
          is_present = excluded.is_present,
          meal_cost_centavos = excluded.meal_cost_centavos,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = excluded.updated_at`,
      )
      .run(
        businessDate,
        employee.id,
        employee.display_name,
        employee.fixed_daily_rate_centavos,
        Number(isPresent),
        isPresent ? mealCostCentavos : 0,
        actorUserId,
        now,
        now,
      );
  }

  ensureAttendancePresent({ businessDate, employee, actorUserId, now }) {
    this.database
      .prepare(
        `INSERT INTO daily_attendance (
          business_date, employee_id, employee_name_snapshot,
          fixed_daily_rate_centavos_snapshot, is_present, meal_cost_centavos,
          updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 5000, ?, ?, ?)
        ON CONFLICT (business_date, employee_id) DO UPDATE SET
          is_present = 1,
          meal_cost_centavos = CASE
            WHEN daily_attendance.is_present = 1 THEN daily_attendance.meal_cost_centavos
            ELSE 5000
          END,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = excluded.updated_at`,
      )
      .run(
        businessDate,
        employee.id,
        employee.display_name,
        employee.fixed_daily_rate_centavos,
        actorUserId,
        now,
        now,
      );
  }

  hasActiveWorkAssignment(businessDate, employeeId) {
    return Boolean(
      this.database
        .prepare(
          `SELECT 1
           FROM service_ticket_item_workers worker
           JOIN service_ticket_items item ON item.id = worker.item_id
           JOIN service_tickets ticket ON ticket.id = item.ticket_id
           WHERE ticket.business_date = ? AND ticket.status = 'ACTIVE'
             AND worker.employee_id = ?
           LIMIT 1`,
        )
        .get(businessDate, employeeId),
    );
  }

  listLaborEarnings(businessDate) {
    return this.database
      .prepare(
        `SELECT worker.employee_id, SUM(worker.labor_share_centavos) AS labor_earned_centavos
         FROM service_ticket_item_workers worker
         JOIN service_ticket_items item ON item.id = worker.item_id
         JOIN service_tickets ticket ON ticket.id = item.ticket_id
         WHERE ticket.business_date = ? AND ticket.status = 'ACTIVE'
         GROUP BY worker.employee_id`,
      )
      .all(businessDate);
  }
}
