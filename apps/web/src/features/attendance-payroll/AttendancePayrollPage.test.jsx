import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PayrollSummary } from './AttendancePayrollPage.jsx';

describe('Phase 10 attendance and payroll interface', () => {
  it('shows present employees and finalized payroll amounts', () => {
    render(
      <PayrollSummary
        daily={{
          attendance: [
            { employeeId: 1, isPresent: true },
            { employeeId: 2, isPresent: false },
          ],
          summary: { totalPayrollCentavos: 30_000, mealCostCentavos: 5_000 },
        }}
        payrollState={{
          isClosed: true,
          runs: [{ status: 'CLOSED', totalSalaryCentavos: 40_000, totalMealCentavos: 5_000 }],
        }}
      />,
    );

    expect(screen.getByText('Present employees')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/400\.00/)).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
