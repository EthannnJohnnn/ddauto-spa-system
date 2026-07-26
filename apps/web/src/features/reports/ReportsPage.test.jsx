import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyBreakdownTable, periodRange, TransactionList } from './ReportsPage.jsx';

describe('Phase 9 reports interface', () => {
  it('calculates daily, Monday-to-Sunday weekly, and monthly ranges', () => {
    expect(periodRange('DAILY', '2026-07-20')).toEqual({
      start: '2026-07-20',
      end: '2026-07-20',
    });
    expect(periodRange('WEEKLY', '2026-07-22')).toEqual({
      start: '2026-07-20',
      end: '2026-07-26',
    });
    expect(periodRange('MONTHLY', '2026-07-22')).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    });
  });

  it('shows each day and its separated sales totals', () => {
    render(
      <DailyBreakdownTable
        days={[
          {
            businessDate: '2026-07-20',
            serviceSalesCentavos: 70_000,
            tireSalesCentavos: 50_000,
            canteenSalesCentavos: 10_000,
            totalSalesCentavos: 130_000,
            expenseCentavos: 20_000,
            estimatedNetCentavos: 96_000,
            hasActivity: true,
          },
        ]}
      />,
    );

    expect(screen.getByText('Jul 20, 2026')).toBeInTheDocument();
    expect(screen.getByText('₱700.00')).toBeInTheDocument();
    expect(screen.getByText('₱500.00')).toBeInTheDocument();
    expect(screen.getByText('₱100.00')).toBeInTheDocument();
    expect(screen.getByText('₱1,300.00')).toBeInTheDocument();
    expect(screen.getByText('₱960.00')).toBeInTheDocument();
  });

  it('keeps voided source transactions visible but clearly marked', () => {
    render(
      <TransactionList
        source="TIRE"
        transactions={[
          {
            id: 9,
            source: 'TIRE',
            businessDate: '2026-07-20',
            sequence: 2,
            description: 'Tire sale',
            secondaryDescription: '',
            status: 'VOIDED',
            voidReason: 'Duplicate transaction',
            totalCentavos: 50_000,
            items: [{ id: 1, name: 'Test Tire', quantity: 1 }],
          },
        ]}
      />,
    );

    expect(screen.getByText('Voided')).toBeInTheDocument();
    expect(screen.getByText('Reason: Duplicate transaction')).toBeInTheDocument();
    expect(screen.getByText('Test Tire × 1')).toBeInTheDocument();
  });
});
