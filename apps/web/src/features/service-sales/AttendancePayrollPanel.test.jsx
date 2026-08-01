import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttendancePayrollPanel } from './AttendancePayrollPanel.jsx';

describe('Phase 8 attendance payroll panel', () => {
  it('uses the ₱50 meal default when an absent employee is marked present', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AttendancePayrollPanel
        attendance={[
          {
            employeeId: 1,
            employeeName: 'Orlan',
            isPresent: false,
            mealCostCentavos: 0,
          },
        ]}
        businessDate="2026-07-26"
        onSave={onSave}
        payroll={[]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Orlan' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        businessDate: '2026-07-26',
        employeeId: 1,
        isPresent: true,
        mealCostCentavos: 5_000,
        salaryOverrideCentavos: null,
      }),
    );
  });
});
