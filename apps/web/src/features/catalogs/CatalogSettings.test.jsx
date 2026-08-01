import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('converts the owner-entered fixed daily peso rate to integer centavos', async () => {
    let catalogs = structuredClone(baseCatalogs);
    const fetchMock = vi.fn().mockImplementation(async (url, options = {}) => {
      if (url === '/api/v1/catalogs' && !options.method) {
        return jsonResponse(catalogs);
      }

      if (url === '/api/v1/catalogs/employees' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        const employee = { id: 1, ...body, isActive: true };
        catalogs = {
          ...catalogs,
          employees: [employee],
          setupProgress: { ...catalogs.setupProgress, activeEmployees: 1 },
        };
        return jsonResponse(employee, 201);
      }

      throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CatalogSettings csrfToken="csrf-token" />);

    await screen.findByRole('heading', { name: 'Business setup' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Orlan' } });
    fireEvent.change(screen.getByLabelText('Fixed full-day rate'), {
      target: { value: '400.00' },
    });
    fireEvent.click(screen.getByText('Graphene/detailing specialist'));
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) => url === '/api/v1/catalogs/employees' && options.method === 'POST',
        ),
      ).toBe(true);
    });
    const createCall = fetchMock.mock.calls.find(
      ([url, options]) => url === '/api/v1/catalogs/employees' && options.method === 'POST',
    );
    expect(JSON.parse(createCall[1].body)).toMatchObject({
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      receivesLaborShare: true,
      isSpecialist: true,
    });
    expect(createCall[1].headers['x-csrf-token']).toBe('csrf-token');
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
