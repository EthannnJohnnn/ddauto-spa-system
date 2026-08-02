import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaryPaymentsPage } from './PeriodClosePage.jsx';

vi.mock('./period-close-api.js', () => ({
  getSalaryPaymentHistory: vi.fn(),
  getSalaryPaymentPreview: vi.fn(),
  paySalaries: vi.fn(),
  voidSalaryPayment: vi.fn(),
}));

import { getSalaryPaymentHistory, getSalaryPaymentPreview } from './period-close-api.js';

describe('Salary Payments interface', () => {
  beforeEach(() => {
    getSalaryPaymentHistory.mockResolvedValue({ periods: [], legacyDailyCloses: [] });
    getSalaryPaymentPreview.mockResolvedValue({
      period: { start: '2026-08-01', end: '2026-08-01', dayCount: 1 },
      canPay: true,
      payableDayCount: 1,
      unreviewedDates: [],
      summary: {
        totalSalesCentavos: 50_000,
        purchaseCentavos: 0,
        expenseAfterPaymentCentavos: 45_000,
        totalSalaryCentavos: 40_000,
        totalMealCentavos: 5_000,
      },
      employeeTotals: [
        { employeeId: 1, employeeName: 'Orlan', dayCount: 1, salaryCentavos: 40_000 },
      ],
      days: [
        {
          businessDate: '2026-08-01',
          presentEmployeeCount: 1,
          reviewed: true,
          requiresReview: true,
          alreadyPaid: false,
          totalSalesCentavos: 50_000,
          salaryCentavos: 40_000,
          serviceSalesCentavos: 50_000,
          tireSalesCentavos: 0,
          canteenSalesCentavos: 0,
          purchaseCentavos: 0,
          expenseAfterPaymentCentavos: 45_000,
          mealCentavos: 5_000,
        },
      ],
    });
  });

  it('shows one payment action for the selected range', async () => {
    render(<SalaryPaymentsPage csrfToken="csrf" onNavigate={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Salary Payments' })).toBeInTheDocument();
    expect(await screen.findByText('Employee totals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay 1 day(s)' })).toBeEnabled();
    expect(screen.queryByText('Daily Close')).not.toBeInTheDocument();
  });
});
