import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './AttendancePayrollPage.jsx';

describe('Attendance interface', () => {
  it('distinguishes unpaid review state from paid history', () => {
    const { rerender } = render(
      <StatusBadge day={{ status: 'OPEN', reviewed: false, requiresReview: true }} />,
    );
    expect(screen.getByText('Needs review')).toBeInTheDocument();

    rerender(<StatusBadge day={{ status: 'OPEN', reviewed: true, requiresReview: true }} />);
    expect(screen.getByText('Reviewed')).toBeInTheDocument();

    rerender(<StatusBadge day={{ status: 'PAID', reviewed: false, requiresReview: true }} />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
