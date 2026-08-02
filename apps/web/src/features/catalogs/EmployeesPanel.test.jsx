import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmployeesPanel } from './EmployeesPanel.jsx';

describe('EmployeesPanel', () => {
  it('converts the owner-entered fixed daily peso rate to integer centavos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EmployeesPanel employees={[]} onSave={onSave} onStatus={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Orlan' } });
    fireEvent.change(screen.getByLabelText('Fixed full-day rate'), {
      target: { value: '400.00' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Graphene\/detailing specialist/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(undefined, {
        displayName: 'Orlan',
        fixedDailyRateCentavos: 40_000,
        receivesLaborShare: true,
        isSpecialist: true,
      });
    });
  });
});
