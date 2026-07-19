import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReasonDialog } from './ReasonDialog.jsx';

describe('ReasonDialog', () => {
  it('clears its form state before a different catalog change', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ReasonDialog
        onCancel={() => {}}
        onConfirm={onConfirm}
        target={{ isActive: false, label: 'Sedan' }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'No longer offered' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeTruthy();

    rerender(<ReasonDialog onCancel={() => {}} onConfirm={onConfirm} target={null} />);
    rerender(
      <ReasonDialog
        onCancel={() => {}}
        onConfirm={onConfirm}
        target={{ isActive: true, label: 'Sedan' }}
      />,
    );

    expect(screen.getByLabelText('Reason').value).toBe('');
    expect(screen.getByRole('button', { name: 'Confirm' }).disabled).toBe(false);
  });
});
