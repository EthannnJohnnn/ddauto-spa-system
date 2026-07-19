import { AppError } from '../../errors/app-error.js';

export class CatalogsService {
  constructor(repository, auditRepository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  listCatalogs() {
    const employees = this.repository.listEmployees().map(mapEmployee);
    const vehicleClasses = this.repository.listVehicleClasses().map(mapVehicleClass);
    const services = this.repository.listServices().map(mapService);
    const prices = this.repository.listServicePrices().map(mapPrice);
    const activeServiceIds = new Set(
      services.filter((service) => service.isActive).map(({ id }) => id),
    );
    const activeVehicleClassIds = new Set(
      vehicleClasses.filter((vehicleClass) => vehicleClass.isActive).map(({ id }) => id),
    );
    const configuredActivePrices = prices.filter(
      (price) =>
        activeServiceIds.has(price.serviceId) && activeVehicleClassIds.has(price.vehicleClassId),
    ).length;

    return {
      employees,
      vehicleClasses,
      services,
      prices,
      setupProgress: {
        activeEmployees: employees.filter((employee) => employee.isActive).length,
        activeVehicleClasses: vehicleClasses.filter((vehicleClass) => vehicleClass.isActive).length,
        configuredActivePrices,
        isComplete:
          employees.some((employee) => employee.isActive) &&
          vehicleClasses.some((vehicleClass) => vehicleClass.isActive) &&
          configuredActivePrices > 0,
      },
    };
  }

  createEmployee(input, actorUserId) {
    this.assertSpecialistAvailable(input.isSpecialist, true);
    const now = this.now();
    let employeeId;

    this.repository.transaction(() => {
      employeeId = this.repository.createEmployee({ ...input, now });
      this.auditRepository.record({
        actorUserId,
        action: 'EMPLOYEE_CREATED',
        entityType: 'EMPLOYEE',
        entityId: String(employeeId),
        metadata: { after: input },
        now,
      });
    });

    return mapEmployee(this.repository.findEmployee(employeeId));
  }

  updateEmployee(employeeId, input, actorUserId) {
    const current = this.requireEmployee(employeeId);
    const updated = {
      displayName: input.displayName ?? current.display_name,
      fixedDailyRateCentavos: input.fixedDailyRateCentavos ?? current.fixed_daily_rate_centavos,
      receivesLaborShare: input.receivesLaborShare ?? Boolean(current.receives_labor_share),
      isSpecialist: input.isSpecialist ?? Boolean(current.is_specialist),
    };
    this.assertSpecialistAvailable(updated.isSpecialist, Boolean(current.is_active), employeeId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.updateEmployee(employeeId, updated, now);
      this.auditRepository.record({
        actorUserId,
        action: 'EMPLOYEE_UPDATED',
        entityType: 'EMPLOYEE',
        entityId: String(employeeId),
        metadata: { before: mapEmployee(current), after: updated },
        now,
      });
    });

    return mapEmployee(this.repository.findEmployee(employeeId));
  }

  setEmployeeActive(employeeId, isActive, reason, actorUserId) {
    const current = this.requireEmployee(employeeId);
    if (Boolean(current.is_active) === isActive) {
      throw new AppError(409, 'EMPLOYEE_STATUS_UNCHANGED', 'The employee already has that status.');
    }
    this.assertSpecialistAvailable(Boolean(current.is_specialist), isActive, employeeId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setEmployeeActive(employeeId, isActive, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'EMPLOYEE_RESTORED' : 'EMPLOYEE_ARCHIVED',
        entityType: 'EMPLOYEE',
        entityId: String(employeeId),
        metadata: { reason },
        now,
      });
    });

    return mapEmployee(this.repository.findEmployee(employeeId));
  }

  createVehicleClass(input, actorUserId) {
    this.assertVehicleClassNameAvailable(input.name);
    const now = this.now();
    let vehicleClassId;

    this.repository.transaction(() => {
      vehicleClassId = this.repository.createVehicleClass({ ...input, now });
      this.auditRepository.record({
        actorUserId,
        action: 'VEHICLE_CLASS_CREATED',
        entityType: 'VEHICLE_CLASS',
        entityId: String(vehicleClassId),
        metadata: { after: input },
        now,
      });
    });

    return mapVehicleClass(this.repository.findVehicleClass(vehicleClassId));
  }

  updateVehicleClass(vehicleClassId, input, actorUserId) {
    const current = this.requireVehicleClass(vehicleClassId);
    const updated = {
      name: input.name ?? current.name,
      sortOrder: input.sortOrder ?? current.sort_order,
    };
    this.assertVehicleClassNameAvailable(updated.name, vehicleClassId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.updateVehicleClass(vehicleClassId, updated, now);
      this.auditRepository.record({
        actorUserId,
        action: 'VEHICLE_CLASS_UPDATED',
        entityType: 'VEHICLE_CLASS',
        entityId: String(vehicleClassId),
        metadata: { before: mapVehicleClass(current), after: updated },
        now,
      });
    });

    return mapVehicleClass(this.repository.findVehicleClass(vehicleClassId));
  }

  setVehicleClassActive(vehicleClassId, isActive, reason, actorUserId) {
    const current = this.requireVehicleClass(vehicleClassId);
    if (Boolean(current.is_active) === isActive) {
      throw new AppError(
        409,
        'VEHICLE_CLASS_STATUS_UNCHANGED',
        'The vehicle class already has that status.',
      );
    }
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setVehicleClassActive(vehicleClassId, isActive, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'VEHICLE_CLASS_RESTORED' : 'VEHICLE_CLASS_ARCHIVED',
        entityType: 'VEHICLE_CLASS',
        entityId: String(vehicleClassId),
        metadata: { reason },
        now,
      });
    });

    return mapVehicleClass(this.repository.findVehicleClass(vehicleClassId));
  }

  createService(input, actorUserId) {
    this.assertServiceNameAvailable(input.name);
    const now = this.now();
    let serviceId;

    this.repository.transaction(() => {
      serviceId = this.repository.createService({ ...input, now });
      this.auditRepository.record({
        actorUserId,
        action: 'SERVICE_CREATED',
        entityType: 'SERVICE',
        entityId: String(serviceId),
        metadata: { after: input },
        now,
      });
    });

    return mapService(this.repository.findService(serviceId));
  }

  updateService(serviceId, input, actorUserId) {
    const current = this.requireService(serviceId);
    const updated = {
      name: input.name ?? current.name,
      laborRule: input.laborRule ?? current.labor_rule,
      sortOrder: input.sortOrder ?? current.sort_order,
    };
    this.assertServiceNameAvailable(updated.name, serviceId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.updateService(serviceId, updated, now);
      this.auditRepository.record({
        actorUserId,
        action: 'SERVICE_UPDATED',
        entityType: 'SERVICE',
        entityId: String(serviceId),
        metadata: { before: mapService(current), after: updated },
        now,
      });
    });

    return mapService(this.repository.findService(serviceId));
  }

  setServiceActive(serviceId, isActive, reason, actorUserId) {
    const current = this.requireService(serviceId);
    if (Boolean(current.is_active) === isActive) {
      throw new AppError(409, 'SERVICE_STATUS_UNCHANGED', 'The service already has that status.');
    }
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setServiceActive(serviceId, isActive, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'SERVICE_RESTORED' : 'SERVICE_ARCHIVED',
        entityType: 'SERVICE',
        entityId: String(serviceId),
        metadata: { reason },
        now,
      });
    });

    return mapService(this.repository.findService(serviceId));
  }

  setServicePrice(input, actorUserId) {
    const service = this.requireService(input.serviceId);
    const vehicleClass = this.requireVehicleClass(input.vehicleClassId);

    if (!service.is_active || !vehicleClass.is_active) {
      throw new AppError(
        409,
        'INACTIVE_PRICE_TARGET',
        'Restore the service and vehicle class before setting its price.',
      );
    }

    const before = this.repository.findServicePrice(input.serviceId, input.vehicleClassId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setServicePrice({ ...input, now });
      this.auditRepository.record({
        actorUserId,
        action: before ? 'SERVICE_PRICE_UPDATED' : 'SERVICE_PRICE_CREATED',
        entityType: 'SERVICE_PRICE',
        entityId: `${input.serviceId}:${input.vehicleClassId}`,
        metadata: { before: before ? mapPrice(before) : null, after: input },
        now,
      });
    });

    return mapPrice(this.repository.findServicePrice(input.serviceId, input.vehicleClassId));
  }

  requireEmployee(employeeId) {
    const employee = this.repository.findEmployee(employeeId);
    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'The employee was not found.');
    }
    return employee;
  }

  requireVehicleClass(vehicleClassId) {
    const vehicleClass = this.repository.findVehicleClass(vehicleClassId);
    if (!vehicleClass) {
      throw new AppError(404, 'VEHICLE_CLASS_NOT_FOUND', 'The vehicle class was not found.');
    }
    return vehicleClass;
  }

  requireService(serviceId) {
    const service = this.repository.findService(serviceId);
    if (!service) {
      throw new AppError(404, 'SERVICE_NOT_FOUND', 'The service was not found.');
    }
    return service;
  }

  assertSpecialistAvailable(isSpecialist, isActive, excludeEmployeeId = 0) {
    if (!isSpecialist || !isActive) {
      return;
    }
    const existing = this.repository.findActiveSpecialist(excludeEmployeeId);
    if (existing) {
      throw new AppError(
        409,
        'ACTIVE_SPECIALIST_EXISTS',
        `${existing.display_name} is already the active graphene/detailing specialist.`,
      );
    }
  }

  assertVehicleClassNameAvailable(name, excludeId = 0) {
    if (this.repository.findVehicleClassByName(name, excludeId)) {
      throw new AppError(409, 'VEHICLE_CLASS_NAME_EXISTS', 'That vehicle class already exists.');
    }
  }

  assertServiceNameAvailable(name, excludeId = 0) {
    if (this.repository.findServiceByName(name, excludeId)) {
      throw new AppError(409, 'SERVICE_NAME_EXISTS', 'That service already exists.');
    }
  }

  now() {
    return this.clock().toISOString();
  }
}

function mapEmployee(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    fixedDailyRateCentavos: row.fixed_daily_rate_centavos,
    receivesLaborShare: Boolean(row.receives_labor_share),
    isSpecialist: Boolean(row.is_specialist),
    isActive: Boolean(row.is_active),
  };
}

function mapVehicleClass(row) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
  };
}

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    laborRule: row.labor_rule,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
  };
}

function mapPrice(row) {
  return {
    serviceId: row.service_id,
    vehicleClassId: row.vehicle_class_id,
    amountCentavos: row.amount_centavos,
  };
}
