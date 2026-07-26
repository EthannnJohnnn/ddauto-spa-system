import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PayrollClosingPanel } from './PayrollClosingPanel.jsx';

const openPayroll = {
  isClosed: false,
  preview: { payroll: [{ employeeId: 1 }] },
  runs: [],
};

describe('Phase 8 payroll closing panel', () => {
  it('closes payroll with an optional owner note', async () => {
    const onClose = vi.fn().mockResolvedValue(undefined);
    render(
      <PayrollClosingPanel
        businessDate="2026-07-21"
        onClose={onClose}
        onRequestReopen={() => {}}
        payrollState={openPayroll}
      />,
    );

    fireEvent.change(screen.getByLabelText('Closing note (optional)'), {
      target: { value: 'Payroll checked and paid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close payroll for this day' }));

    await waitFor(() =>
      expect(onClose).toHaveBeenCalledWith({
        businessDate: '2026-07-21',
        closeNote: 'Payroll checked and paid',
      }),
    );
  });

  it('shows finalized totals and requests a controlled reopen', () => {
    const onRequestReopen = vi.fn();
    render(
      <PayrollClosingPanel
        businessDate="2026-07-21"
        onClose={() => {}}
        onRequestReopen={onRequestReopen}
        payrollState={{
          ...openPayroll,
          isClosed: true,
          runs: [
            {
              status: 'CLOSED',
              totalSalaryCentavos: 40_000,
              totalMealCentavos: 5_000,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('₱400.00')).toBeInTheDocument();
    expect(screen.getByText('₱50.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen payroll' }));
    expect(onRequestReopen).toHaveBeenCalledTimes(1);
  });
});
