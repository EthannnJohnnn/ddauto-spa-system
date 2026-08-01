import { AppError } from '../../errors/app-error.js';

export class AttendanceService {
  constructor(repository, serviceSalesService, auditRepository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.serviceSalesService = serviceSalesService;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  getOpenAttendance(through) {
    const relevantDates = this.repository.listRelevantDates(through);
    const openDates = relevantDates.filter((date) => !this.repository.findCloseForDate(date));
    const start = relevantDates[0] ?? through;
    const days = dateRange(start, through).map((businessDate) => this.getDay(businessDate));
    const unpaidDays = days.filter((day) => day.status === 'OPEN');
    const employeeTotals = buildEmployeeTotals(unpaidDays);

    return {
      through,
      start,
      earliestUnpaidDate: openDates[0] ?? null,
      days,
      employeeTotals,
      unpaidSalaryCentavos: sum(employeeTotals.map((employee) => employee.unpaidSalaryCentavos)),
      unpaidMealCentavos: sum(unpaidDays.map((day) => day.mealCentavos)),
    };
  }

  getDay(businessDate) {
    const daily = this.serviceSalesService.getDailySales(businessDate);
    const close = this.repository.findCloseForDate(businessDate);
    const review = this.repository.findReview(businessDate);
    const hasAttendance = this.repository.hasAttendanceRecord(businessDate);
    const activeServiceCount = daily.summary.activeTicketCount;
    const requiresReview = hasAttendance || activeServiceCount > 0 || daily.payroll.length > 0;
    const employees = daily.payroll.map((employee) => ({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      isPresent: employee.isPresent,
      fixedDailyRateCentavos: employee.fixedDailyRateCentavos,
      laborEarnedCentavos: employee.laborEarnedCentavos,
      fixedTopUpCentavos: employee.fixedTopUpCentavos,
      calculatedSalaryCentavos: employee.calculatedSalaryCentavos,
      salaryOverrideCentavos: employee.salaryOverrideCentavos,
      finalSalaryCentavos: employee.totalPayCentavos,
      mealCostCentavos: employee.isPresent ? employee.mealCostCentavos : 0,
    }));

    return {
      businessDate,
      status: close ? 'PAID' : 'OPEN',
      close: close
        ? {
            id: close.id,
            type: close.type,
            start: close.start_date,
            end: close.end_date,
            closedAt: close.closed_at,
          }
        : null,
      reviewed: Boolean(review) && !close,
      reviewedAt: review?.reviewed_at ?? null,
      requiresReview,
      presentEmployeeCount: employees.filter((employee) => employee.isPresent).length,
      salaryCentavos: sum(employees.map((employee) => employee.finalSalaryCentavos)),
      mealCentavos: sum(employees.map((employee) => employee.mealCostCentavos)),
      employees,
    };
  }

  review(input, actorUserId) {
    const close = this.repository.findCloseForDate(input.businessDate);
    if (close) {
      throw new AppError(
        409,
        'ATTENDANCE_DATE_CLOSED',
        'Reopen the period before reviewing this date.',
      );
    }
    const day = this.getDay(input.businessDate);
    if (input.reviewed && !day.requiresReview) {
      throw new AppError(
        409,
        'ATTENDANCE_NOTHING_TO_REVIEW',
        'This date has no attendance or service activity.',
      );
    }
    const now = this.clock().toISOString();
    this.repository.transaction(() => {
      if (input.reviewed) this.repository.setReviewed(input.businessDate, actorUserId, now);
      else this.repository.clearReview(input.businessDate);
      this.auditRepository.record({
        actorUserId,
        action: input.reviewed ? 'ATTENDANCE_DAY_REVIEWED' : 'ATTENDANCE_REVIEW_CLEARED',
        entityType: 'ATTENDANCE_DAY_REVIEW',
        entityId: input.businessDate,
        metadata: { businessDate: input.businessDate },
        now,
      });
    });
    return this.getDay(input.businessDate);
  }
}

function buildEmployeeTotals(days) {
  const totals = new Map();
  for (const day of days) {
    for (const employee of day.employees) {
      const current = totals.get(employee.employeeId) ?? {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        unpaidSalaryCentavos: 0,
        dayCount: 0,
      };
      current.unpaidSalaryCentavos += employee.finalSalaryCentavos;
      current.dayCount += 1;
      totals.set(employee.employeeId, current);
    }
  }
  return [...totals.values()].sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName),
  );
}

function dateRange(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const final = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= final) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
