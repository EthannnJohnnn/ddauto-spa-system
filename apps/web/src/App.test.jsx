import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.jsx';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the first-time owner setup when the database is new', async () => {
    mockStatus({ needsSetup: true, authenticated: false, user: null, csrfToken: null });
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Create the owner account/i })).toBeTruthy();
    expect(screen.getByLabelText(/Username/i)).toBeTruthy();
  });

  it('shows username and password login for a signed-out configured system', async () => {
    mockStatus({ needsSetup: false, authenticated: false, user: null, csrfToken: null });
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeTruthy();
    expect(screen.getByLabelText(/Username/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Password$/i)).toBeTruthy();
  });

  it('opens the protected single-page dashboard for the owner', async () => {
    mockStatus({
      needsSetup: false,
      authenticated: true,
      user: { id: 1, username: 'owner', displayName: 'Owner', role: 'OWNER' },
      csrfToken: 'csrf-token',
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Good day, Owner/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /Main navigation/i })).toBeTruthy();
  });
});

function mockStatus(payload) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    }),
  );
}
