import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CloseSummary } from './DailyClosePage.jsx';

describe('Phase 10 Daily Close interface', () => {
  it('shows the final sales, outflow, and cash-movement totals', () => {
    render(
      <CloseSummary
        summary={{
          totalSalesCentavos: 125_000,
          purchaseCentavos: 20_000,
          expenseCentavos: 45_000,
          cashMovementCentavos: 60_000,
        }}
      />,
    );

    expect(screen.getByText('Combined sales')).toBeInTheDocument();
    expect(screen.getByText(/1,250\.00/)).toBeInTheDocument();
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/450\.00/)).toBeInTheDocument();
    expect(screen.getByText(/600\.00/)).toBeInTheDocument();
  });
});
