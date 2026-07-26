import { AppError } from '../../errors/app-error.js';

const DEFAULT_MEAL_COST_CENTAVOS = 5_000;

export class ServiceSalesService {
  constructor(repository, auditRepository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  getDailySales(businessDate) {
    const tickets = this.hydrateTickets(businessDate);
    const attendance = this.repository.listAttendance(businessDate).map(mapAttendance);
    const laborByEmployee = new Map(
      this.repository
        .listLaborEarnings(businessDate)
        .map((row) => [row.employee_id, row.labor_earned_centavos]),
    );
    const payroll = attendance
      .filter((entry) => entry.isPresent || laborByEmployee.has(entry.employeeId))
      .map((entry) => {
        const laborEarnedCentavos = laborByEmployee.get(entry.employeeId) ?? 0;
        const fixedTopUpCentavos = entry.isPresent
          ? Math.max(0, entry.fixedDailyRateCentavos - laborEarnedCentavos)
          : 0;
        return {
          ...entry,
          laborEarnedCentavos,
          fixedTopUpCentavos,
          totalPayCentavos: laborEarnedCentavos + fixedTopUpCentavos,
        };
      });
    const activeTickets = tickets.filter((ticket) => ticket.status === 'ACTIVE');
    const totalSalesCentavos = sum(
      activeTickets.flatMap((ticket) => ticket.items.map((item) => item.amountCentavos)),
    );
    const regularLaborCentavos = sum(payroll.map((entry) => entry.laborEarnedCentavos));
    const fixedTopUpsCentavos = sum(payroll.map((entry) => entry.fixedTopUpCentavos));
    const mealCostCentavos = sum(
      attendance.filter((entry) => entry.isPresent).map((entry) => entry.mealCostCentavos),
    );
    const externalLaborCentavos = sum(
      activeTickets.flatMap((ticket) => ticket.items.map((item) => item.externalLaborCostCentavos)),
    );
    const totalPayrollCentavos = regularLaborCentavos + fixedTopUpsCentavos;

    return {
      businessDate,
      tickets,
      attendance,
      payroll,
      summary: {
        activeTicketCount: activeTickets.length,
        voidedTicketCount: tickets.length - activeTickets.length,
        totalSalesCentavos,
        regularLaborCentavos,
        fixedTopUpsCentavos,
        totalPayrollCentavos,
        mealCostCentavos,
        externalLaborCentavos,
        remainingAfterRecordedLaborAndMealsCentavos:
          totalSalesCentavos - totalPayrollCentavos - mealCostCentavos - externalLaborCentavos,
      },
    };
  }

  createTicket(input, actorUserId) {
    this.assertPayrollOpen(input.businessDate);
    const normalized = this.normalizeTicket(input);
    const now = this.now();
    let ticketId;

    this.repository.transaction(() => {
      ticketId = this.repository.createTicket({
        ...normalized.header,
        customerSequence: this.repository.nextCustomerSequence(input.businessDate),
        actorUserId,
        now,
      });
      this.repository.replaceTicketItems(ticketId, normalized.items, now);
      this.ensureWorkerAttendance(input.businessDate, normalized.employees, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: 'SERVICE_TICKET_CREATED',
        entityType: 'SERVICE_TICKET',
        entityId: String(ticketId),
        metadata: { after: input },
        now,
      });
    });

    return this.requireHydratedTicket(ticketId);
  }

  updateTicket(ticketId, input, actorUserId) {
    const current = this.requireTicket(ticketId);
    this.assertPayrollOpen(current.business_date);
    if (input.businessDate !== current.business_date) {
      this.assertPayrollOpen(input.businessDate);
    }
    if (current.status !== 'ACTIVE') {
      throw new AppError(409, 'TICKET_VOIDED', 'Restore the transaction before editing it.');
    }
    const before = this.requireHydratedTicket(ticketId);
    const normalized = this.normalizeTicket(input);
    const now = this.now();
    const customerSequence =
      current.business_date === input.businessDate
        ? current.customer_sequence
        : this.repository.nextCustomerSequence(input.businessDate);

    this.repository.transaction(() => {
      this.repository.updateTicket(ticketId, {
        ...normalized.header,
        customerSequence,
        actorUserId,
        now,
      });
      this.repository.replaceTicketItems(ticketId, normalized.items, now);
      this.ensureWorkerAttendance(input.businessDate, normalized.employees, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: 'SERVICE_TICKET_UPDATED',
        entityType: 'SERVICE_TICKET',
        entityId: String(ticketId),
        metadata: { before, after: input },
        now,
      });
    });

    return this.requireHydratedTicket(ticketId);
  }

  setTicketStatus(ticketId, isActive, reason, actorUserId) {
    const current = this.requireTicket(ticketId);
    this.assertPayrollOpen(current.business_date);
    const targetStatus = isActive ? 'ACTIVE' : 'VOIDED';
    if (current.status === targetStatus) {
      throw new AppError(
        409,
        'TICKET_STATUS_UNCHANGED',
        'The transaction already has that status.',
      );
    }
    const before = this.requireHydratedTicket(ticketId);
    const now = this.now();

    this.repository.transaction(() => {
      this.repository.setTicketStatus(ticketId, targetStatus, reason, actorUserId, now);
      if (isActive) {
        const employees = new Map();
        for (const item of before.items) {
          for (const worker of item.workers) {
            const employee = this.repository.findEmployee(worker.employeeId);
            if (employee) employees.set(employee.id, employee);
          }
        }
        this.ensureWorkerAttendance(current.business_date, employees, actorUserId, now);
      }
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'SERVICE_TICKET_RESTORED' : 'SERVICE_TICKET_VOIDED',
        entityType: 'SERVICE_TICKET',
        entityId: String(ticketId),
        metadata: { reason },
        now,
      });
    });

    return this.requireHydratedTicket(ticketId);
  }

  setAttendance(input, actorUserId) {
    this.assertPayrollOpen(input.businessDate);
    const employee = this.requireEmployee(input.employeeId);
    if (input.isPresent && !employee.is_active) {
      throw new AppError(409, 'EMPLOYEE_ARCHIVED', 'Restore the employee before marking present.');
    }
    if (
      !input.isPresent &&
      this.repository.hasActiveWorkAssignment(input.businessDate, input.employeeId)
    ) {
      throw new AppError(
        409,
        'EMPLOYEE_HAS_WORK',
        'This employee is assigned to an active service transaction on that date.',
      );
    }
    const now = this.now();
    this.repository.transaction(() => {
      this.repository.upsertAttendance({
        ...input,
        mealCostCentavos: input.isPresent ? input.mealCostCentavos : 0,
        employee,
        actorUserId,
        now,
      });
      this.auditRepository.record({
        actorUserId,
        action: input.isPresent ? 'EMPLOYEE_MARKED_PRESENT' : 'EMPLOYEE_MARKED_ABSENT',
        entityType: 'DAILY_ATTENDANCE',
        entityId: `${input.businessDate}:${input.employeeId}`,
        metadata: {
          employeeName: employee.display_name,
          mealCostCentavos: input.isPresent ? input.mealCostCentavos : 0,
        },
        now,
      });
    });

    return this.getDailySales(input.businessDate);
  }

  normalizeTicket(input) {
    const vehicleClass = this.repository.findVehicleClass(input.vehicleClassId);
    if (!vehicleClass || !vehicleClass.is_active) {
      throw new AppError(
        409,
        'VEHICLE_CLASS_UNAVAILABLE',
        'Select an active vehicle class for the transaction.',
      );
    }

    const employees = new Map();
    const items = input.items.map((item) => {
      const service = this.repository.findService(item.serviceId);
      if (!service || !service.is_active) {
        throw new AppError(409, 'SERVICE_UNAVAILABLE', 'Select only active services.');
      }
      const laborPolicy = service.labor_policy;
      const laborRateBasisPoints = service.labor_rate_basis_points;

      if (laborPolicy === 'EXTERNAL') {
        if (item.employeeIds.length > 0) {
          throw new AppError(
            400,
            'EXTERNAL_SERVICE_HAS_EMPLOYEES',
            'External contractor services cannot include regular employee shares.',
          );
        }
        if (item.externalContractorName.length < 2) {
          throw new AppError(
            400,
            'CONTRACTOR_REQUIRED',
            'Enter the external contractor name for this service.',
          );
        }
        return normalizeItem({
          item,
          service,
          laborPolicy,
          laborRateBasisPoints,
          laborPoolCentavos: item.externalLaborCostCentavos,
          workers: [],
        });
      }

      let assignedEmployees;
      if (laborPolicy === 'SPECIALIST') {
        const specialist = this.repository.findActiveSpecialist();
        if (!specialist) {
          throw new AppError(
            409,
            'SPECIALIST_REQUIRED',
            'Add an active graphene/detailing specialist before recording this service.',
          );
        }
        if (
          item.employeeIds.length > 0 &&
          (item.employeeIds.length !== 1 || item.employeeIds[0] !== specialist.id)
        ) {
          throw new AppError(
            400,
            'SPECIALIST_ASSIGNMENT_REQUIRED',
            'Specialist services can only be assigned to the active specialist.',
          );
        }
        assignedEmployees = [specialist];
      } else {
        if (item.employeeIds.length === 0) {
          throw new AppError(
            400,
            'WORKER_REQUIRED',
            'Assign at least one employee to each ordinary service.',
          );
        }
        assignedEmployees = item.employeeIds.map((id) => this.requireEmployee(id));
        for (const employee of assignedEmployees) {
          if (!employee.is_active || !employee.receives_labor_share) {
            throw new AppError(
              409,
              'EMPLOYEE_UNAVAILABLE',
              `${employee.display_name} cannot receive a labor share.`,
            );
          }
        }
      }

      assignedEmployees.sort((left, right) => left.id - right.id);
      for (const employee of assignedEmployees) employees.set(employee.id, employee);
      const laborPoolCentavos = percentageOf(item.amountCentavos, laborRateBasisPoints);
      const shares = splitCentavos(laborPoolCentavos, assignedEmployees.length);
      const workers = assignedEmployees.map((employee, index) => ({
        employeeId: employee.id,
        employeeNameSnapshot: employee.display_name,
        laborShareCentavos: shares[index],
      }));

      return normalizeItem({
        item,
        service,
        laborPolicy,
        laborRateBasisPoints,
        laborPoolCentavos,
        workers,
      });
    });

    return {
      header: {
        businessDate: input.businessDate,
        vehicleClassId: vehicleClass.id,
        vehicleClassNameSnapshot: vehicleClass.name,
        vehicleDescription: input.vehicleDescription,
        plateNumber: input.plateNumber,
        notes: input.notes,
      },
      items,
      employees,
    };
  }

  hydrateTickets(businessDate) {
    const ticketRows = this.repository.listTicketRows(businessDate);
    const itemRows = this.repository.listItemRowsForTickets(ticketRows.map((row) => row.id));
    const workerRows = this.repository.listWorkerRowsForItems(itemRows.map((row) => row.id));
    const workersByItem = groupBy(workerRows, (row) => row.item_id);
    const itemsByTicket = groupBy(itemRows, (row) => row.ticket_id);
    return ticketRows.map((ticket) =>
      mapTicket(
        ticket,
        (itemsByTicket.get(ticket.id) ?? []).map((item) =>
          mapItem(item, workersByItem.get(item.id) ?? []),
        ),
      ),
    );
  }

  requireHydratedTicket(ticketId) {
    const ticket = this.requireTicket(ticketId);
    return this.hydrateTickets(ticket.business_date).find((entry) => entry.id === ticketId);
  }

  requireTicket(ticketId) {
    const ticket = this.repository.findTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'SERVICE_TICKET_NOT_FOUND', 'The service transaction was not found.');
    }
    return ticket;
  }

  requireEmployee(employeeId) {
    const employee = this.repository.findEmployee(employeeId);
    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'The employee was not found.');
    }
    return employee;
  }

  ensureWorkerAttendance(businessDate, employees, actorUserId, now) {
    for (const employee of employees.values()) {
      this.repository.ensureAttendancePresent({ businessDate, employee, actorUserId, now });
    }
  }

  assertPayrollOpen(businessDate) {
    if (this.repository.isPayrollDateClosed(businessDate)) {
      throw new AppError(
        409,
        'PAYROLL_DATE_CLOSED',
        'Reopen payroll for this date before changing service transactions or attendance.',
      );
    }
  }

  now() {
    return this.clock().toISOString();
  }
}

function normalizeItem({
  item,
  service,
  laborPolicy,
  laborRateBasisPoints,
  laborPoolCentavos,
  workers,
}) {
  return {
    serviceId: service.id,
    serviceNameSnapshot: service.name,
    laborPolicySnapshot: laborPolicy,
    laborRateBasisPointsSnapshot: laborRateBasisPoints,
    amountCentavos: item.amountCentavos,
    laborPoolCentavos,
    externalContractorName: laborPolicy === 'EXTERNAL' ? item.externalContractorName : '',
    externalLaborCostCentavos: laborPolicy === 'EXTERNAL' ? item.externalLaborCostCentavos : 0,
    workers,
  };
}

function mapTicket(row, items) {
  return {
    id: row.id,
    businessDate: row.business_date,
    customerSequence: row.customer_sequence,
    vehicleClassId: row.vehicle_class_id,
    vehicleClassName: row.vehicle_class_name_snapshot,
    vehicleDescription: row.vehicle_description,
    plateNumber: row.plate_number,
    notes: row.notes,
    status: row.status,
    voidReason: row.void_reason,
    totalCentavos: sum(items.map((item) => item.amountCentavos)),
    items,
  };
}

function mapItem(row, workers) {
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name_snapshot,
    laborPolicy: row.labor_policy_snapshot,
    laborRateBasisPoints: row.labor_rate_basis_points_snapshot,
    amountCentavos: row.amount_centavos,
    laborPoolCentavos: row.labor_pool_centavos,
    externalContractorName: row.external_contractor_name,
    externalLaborCostCentavos: row.external_labor_cost_centavos,
    workers: workers.map((worker) => ({
      employeeId: worker.employee_id,
      employeeName: worker.employee_name_snapshot,
      laborShareCentavos: worker.labor_share_centavos,
    })),
  };
}

function mapAttendance(row) {
  return {
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    employeeIsActive: Boolean(row.employee_is_active),
    fixedDailyRateCentavos: row.fixed_daily_rate_centavos_snapshot,
    isPresent: Boolean(row.is_present),
    mealCostCentavos: row.meal_cost_centavos,
  };
}

function percentageOf(amountCentavos, basisPoints) {
  return Math.round((amountCentavos * basisPoints) / 10_000);
}

function splitCentavos(totalCentavos, count) {
  const base = Math.floor(totalCentavos / count);
  const remainder = totalCentavos % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
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

export const serviceSalesInternals = { percentageOf, splitCentavos, DEFAULT_MEAL_COST_CENTAVOS };
