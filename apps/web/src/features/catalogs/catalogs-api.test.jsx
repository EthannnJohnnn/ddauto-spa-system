import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmployee } from './catalogs-api.js';

describe('catalogs API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('protects employee creation with the owner CSRF token', async () => {
    const values = {
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      receivesLaborShare: true,
      isSpecialist: true,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, ...values }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await createEmployee(values, 'csrf-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/catalogs/employees', {
      credentials: 'same-origin',
      method: 'POST',
      body: JSON.stringify(values),
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'csrf-token',
      },
    });
  });
});
