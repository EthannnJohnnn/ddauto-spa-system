import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogSettings } from './CatalogSettings.jsx';

const baseCatalogs = {
  employees: [],
  vehicleClasses: [],
  services: [
    {
      id: 1,
      name: 'Carwash',
      laborRule: 'ORDINARY',
      laborRateBasisPoints: 4000,
      sortOrder: 10,
      isActive: true,
    },
    {
      id: 2,
      name: 'Graphene/Ceramic',
      laborRule: 'SPECIALIST',
      laborRateBasisPoints: 3000,
      sortOrder: 20,
      isActive: true,
    },
  ],
  prices: [],
  setupProgress: {
    activeEmployees: 0,
    activeVehicleClasses: 0,
    configuredActivePrices: 0,
    isComplete: false,
  },
};

describe('CatalogSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows guided setup and the seeded service labor rules', async () => {
    mockCatalogs(baseCatalogs);
    render(<CatalogSettings csrfToken="csrf-token" />);

    expect(await screen.findByRole('heading', { name: 'Business setup' })).toBeTruthy();
    expect(screen.getByText('Complete the core setup')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Services' }));

    expect(screen.getByRole('heading', { name: 'Carwash' })).toBeTruthy();
    expect(screen.getByText('Ordinary labor · 40%')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Graphene/Ceramic' })).toBeTruthy();
    expect(screen.getByText('Specialist only · 30%')).toBeTruthy();
  });
});

function mockCatalogs(payload) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}
