import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardNotes } from './DashboardNotes.jsx';
import { archiveDashboardNote, createDashboardNote, getDashboardNotes } from './dashboard-api.js';

vi.mock('./dashboard-api.js', () => ({
  archiveDashboardNote: vi.fn(),
  createDashboardNote: vi.fn(),
  getDashboardNotes: vi.fn(),
  updateDashboardNote: vi.fn(),
}));

describe('dashboard owner notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardNotes.mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates a persistent owner note from the dashboard button', async () => {
    createDashboardNote.mockResolvedValue({
      id: 1,
      title: 'Call supplier',
      body: 'Ask about towel delivery.',
      status: 'ACTIVE',
      updatedAt: '2026-07-29T05:00:00.000Z',
    });
    render(<DashboardNotes csrfToken="csrf-token" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add note' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Call supplier' } });
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Ask about towel delivery.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(createDashboardNote).toHaveBeenCalledWith(
        { title: 'Call supplier', body: 'Ask about towel delivery.' },
        'csrf-token',
      ),
    );
    expect(await screen.findByText('Call supplier')).toBeInTheDocument();
  });

  it('removes a note from view only after owner confirmation', async () => {
    getDashboardNotes.mockResolvedValue([
      {
        id: 2,
        title: 'Check machine',
        body: 'Inspect pressure washer.',
        status: 'ACTIVE',
        updatedAt: '2026-07-29T05:00:00.000Z',
      },
    ]);
    archiveDashboardNote.mockResolvedValue({ id: 2, status: 'ARCHIVED' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DashboardNotes csrfToken="csrf-token" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Check machine' }));
    await waitFor(() => expect(archiveDashboardNote).toHaveBeenCalledWith(2, 'csrf-token'));
    expect(screen.queryByText('Check machine')).not.toBeInTheDocument();
  });
});
