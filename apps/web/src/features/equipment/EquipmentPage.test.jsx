import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BatchForm, Summary } from './EquipmentPage.jsx';

describe('Phase 11 equipment interface', () => {
  it('summarizes active equipment and condition warnings', () => {
    render(
      <Summary
        summary={{
          activeCount: 12,
          goodCount: 8,
          needsAttentionCount: 2,
          underRepairCount: 1,
          damagedCount: 1,
          acquisitionValueCentavos: 150_000,
        }}
      />,
    );

    expect(screen.getByText('Active equipment')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Needs action')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/1,500\.00/)).toBeInTheDocument();
  });

  it('submits the category that is visibly selected by default', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <BatchForm
        categories={[
          { id: 7, name: 'Cleaning Tools', isActive: true },
          { id: 8, name: 'Towels', isActive: true },
        ]}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Towel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 7 }));
  });
});
