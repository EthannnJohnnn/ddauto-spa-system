export class CatalogsRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  listEmployees() {
    return this.database
      .prepare(
        `SELECT
          id, display_name, fixed_daily_rate_centavos, receives_labor_share,
          is_specialist, is_active, created_at, updated_at
        FROM employees
        ORDER BY is_active DESC, display_name COLLATE NOCASE, id`,
      )
      .all();
  }

  findEmployee(employeeId) {
    return this.database.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  }

  findActiveSpecialist(excludeEmployeeId = 0) {
    return this.database
      .prepare(
        `SELECT id, display_name
         FROM employees
         WHERE is_specialist = 1 AND is_active = 1 AND id != ?`,
      )
      .get(excludeEmployeeId);
  }

  createEmployee({ displayName, fixedDailyRateCentavos, receivesLaborShare, isSpecialist, now }) {
    const result = this.database
      .prepare(
        `INSERT INTO employees (
          display_name, fixed_daily_rate_centavos, receives_labor_share,
          is_specialist, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        displayName,
        fixedDailyRateCentavos,
        Number(receivesLaborShare),
        Number(isSpecialist),
        now,
        now,
      );

    return Number(result.lastInsertRowid);
  }

  updateEmployee(
    employeeId,
    { displayName, fixedDailyRateCentavos, receivesLaborShare, isSpecialist },
    now,
  ) {
    this.database
      .prepare(
        `UPDATE employees
         SET display_name = ?, fixed_daily_rate_centavos = ?, receives_labor_share = ?,
             is_specialist = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        displayName,
        fixedDailyRateCentavos,
        Number(receivesLaborShare),
        Number(isSpecialist),
        now,
        employeeId,
      );
  }

  setEmployeeActive(employeeId, isActive, now) {
    this.database
      .prepare('UPDATE employees SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, employeeId);
  }

  listVehicleClasses() {
    return this.database
      .prepare(
        `SELECT id, name, sort_order, is_active, created_at, updated_at
         FROM vehicle_classes
         ORDER BY is_active DESC, sort_order, name COLLATE NOCASE, id`,
      )
      .all();
  }

  findVehicleClass(vehicleClassId) {
    return this.database.prepare('SELECT * FROM vehicle_classes WHERE id = ?').get(vehicleClassId);
  }

  findVehicleClassByName(name, excludeId = 0) {
    return this.database
      .prepare('SELECT id FROM vehicle_classes WHERE name = ? COLLATE NOCASE AND id != ?')
      .get(name, excludeId);
  }

  createVehicleClass({ name, sortOrder, now }) {
    const result = this.database
      .prepare(
        `INSERT INTO vehicle_classes (name, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(name, sortOrder, now, now);

    return Number(result.lastInsertRowid);
  }

  updateVehicleClass(vehicleClassId, { name, sortOrder }, now) {
    this.database
      .prepare(
        `UPDATE vehicle_classes
         SET name = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(name, sortOrder, now, vehicleClassId);
  }

  setVehicleClassActive(vehicleClassId, isActive, now) {
    this.database
      .prepare('UPDATE vehicle_classes SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, vehicleClassId);
  }

  listServices() {
    return this.database
      .prepare(
        `SELECT id, name, labor_rule, labor_policy, labor_rate_basis_points,
                sort_order, is_active, created_at, updated_at
         FROM services
         ORDER BY is_active DESC, sort_order, name COLLATE NOCASE, id`,
      )
      .all();
  }

  findService(serviceId) {
    return this.database.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
  }

  findServiceByName(name, excludeId = 0) {
    return this.database
      .prepare('SELECT id FROM services WHERE name = ? COLLATE NOCASE AND id != ?')
      .get(name, excludeId);
  }

  createService({ name, laborRule, laborRateBasisPoints, sortOrder, now }) {
    const result = this.database
      .prepare(
        `INSERT INTO services (
          name, labor_rule, labor_policy, labor_rate_basis_points,
          sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, legacyLaborRule(laborRule), laborRule, laborRateBasisPoints, sortOrder, now, now);

    return Number(result.lastInsertRowid);
  }

  updateService(serviceId, { name, laborRule, laborRateBasisPoints, sortOrder }, now) {
    this.database
      .prepare(
        `UPDATE services
         SET name = ?, labor_rule = ?, labor_policy = ?, labor_rate_basis_points = ?,
             sort_order = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        name,
        legacyLaborRule(laborRule),
        laborRule,
        laborRateBasisPoints,
        sortOrder,
        now,
        serviceId,
      );
  }

  setServiceActive(serviceId, isActive, now) {
    this.database
      .prepare('UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(Number(isActive), now, serviceId);
  }

  listServicePrices() {
    return this.database
      .prepare(
        `SELECT service_id, vehicle_class_id, amount_centavos, created_at, updated_at
         FROM service_prices
         ORDER BY service_id, vehicle_class_id`,
      )
      .all();
  }

  findServicePrice(serviceId, vehicleClassId) {
    return this.database
      .prepare(
        `SELECT service_id, vehicle_class_id, amount_centavos
         FROM service_prices
         WHERE service_id = ? AND vehicle_class_id = ?`,
      )
      .get(serviceId, vehicleClassId);
  }

  setServicePrice({ serviceId, vehicleClassId, amountCentavos, now }) {
    this.database
      .prepare(
        `INSERT INTO service_prices (
          service_id, vehicle_class_id, amount_centavos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (service_id, vehicle_class_id)
        DO UPDATE SET amount_centavos = excluded.amount_centavos, updated_at = excluded.updated_at`,
      )
      .run(serviceId, vehicleClassId, amountCentavos, now, now);
  }
}

function legacyLaborRule(laborRule) {
  return laborRule === 'SPECIALIST' ? 'SPECIALIST' : 'ORDINARY';
}
