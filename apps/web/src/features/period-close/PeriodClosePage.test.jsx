import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeriodClosePage } from './PeriodClosePage.jsx';

vi.mock('./period-close-api.js', () => ({
  getPeriodCloseHistory: vi.fn(),
  getPeriodClosePreview: vi.fn(),
  closePeriod: vi.fn(),
  reopenPeriod: vi.fn(),
}));

import { getPeriodCloseHistory, getPeriodClosePreview } from './period-close-api.js';

describe('Period Close interface', () => {
  beforeEach(() => {
    getPeriodCloseHistory.mockResolvedValue({ periods: [], legacyDailyCloses: [] });
    getPeriodClosePreview.mockResolvedValue({
      period: { start: '2026-08-01', end: '2026-08-01', dayCount: 1 },
      canClose: true,
      unreviewedDates: [],
      summary: {
        totalSalesCentavos: 50_000,
        purchaseCentavos: 0,
        expenseCentavos: 45_000,
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
          totalSalesCentavos: 50_000,
          salaryCentavos: 40_000,
          serviceSalesCentavos: 50_000,
          tireSalesCentavos: 0,
          canteenSalesCentavos: 0,
          purchaseCentavos: 0,
          expenseCentavos: 45_000,
          mealCentavos: 5_000,
        },
      ],
    });
  });

  it('shows one close action for the selected range', async () => {
    render(<PeriodClosePage csrfToken="csrf" onNavigate={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Period Close' })).toBeInTheDocument();
    expect(await screen.findByText('Employee totals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close 1 day(s)' })).toBeEnabled();
    expect(screen.queryByText('Daily Close')).not.toBeInTheDocument();
  });
});
