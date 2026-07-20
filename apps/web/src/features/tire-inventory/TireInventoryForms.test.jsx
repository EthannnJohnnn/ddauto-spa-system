import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TireDocumentForm } from './TireDocumentForm.jsx';
import { TireProductsPanel } from './TireProductsPanel.jsx';

const product = {
  id: 1,
  name: 'RoadSafe Touring',
  category: 'FOUR_WHEEL',
  tireType: 'TUBELESS',
  size: '155/70R13',
  currentCostCentavos: 150_000,
  sellingPriceCentavos: 240_000,
  lowStockThreshold: 2,
  stockQuantity: 4,
  isActive: true,
};

describe('Phase 5 tire inventory forms', () => {
  it('creates a tire product with optional beginning inventory', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TireProductsPanel
        businessDate="2026-07-01"
        onSave={onSave}
        onStatus={() => {}}
        products={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Tire name'), {
      target: { value: 'RoadSafe Touring' },
    });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'TUBELESS' } });
    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '155/70R13' } });
    fireEvent.change(screen.getByLabelText('Current unit cost'), {
      target: { value: '1500.00' },
    });
    fireEvent.change(screen.getByLabelText('Selling price'), {
      target: { value: '2400.00' },
    });
    fireEvent.click(screen.getByLabelText('Add beginning inventory'));
    fireEvent.change(screen.getByLabelText('Beginning quantity'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Beginning unit cost'), {
      target: { value: '1500.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add tire product' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([
      undefined,
      {
        name: 'RoadSafe Touring',
        category: 'FOUR_WHEEL',
        tireType: 'TUBELESS',
        size: '155/70R13',
        currentCostCentavos: 150_000,
        sellingPriceCentavos: 240_000,
        lowStockThreshold: 1,
        beginningInventory: {
          businessDate: '2026-07-01',
          quantity: 4,
          unitCostCentavos: 150_000,
        },
      },
    ]);
  });

  it('auto-fills a tire sale price and submits a stock-reducing sale item', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TireDocumentForm
        businessDate="2026-07-03"
        documentType="SALE"
        editingDocument={null}
        onCancel={() => {}}
        onSave={onSave}
        products={[product]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Tire product'), { target: { value: '1' } });
    expect(screen.getByLabelText('Selling price').value).toBe('2400.00');
    fireEvent.change(screen.getByLabelText('Item 1 quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Vehicle'), { target: { value: 'Toyota Vios' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record tire sale' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][1]).toMatchObject({
      documentType: 'SALE',
      businessDate: '2026-07-03',
      vehicleDescription: 'Toyota Vios',
      items: [
        {
          productId: 1,
          quantity: 2,
          unitCostCentavos: 150_000,
          unitPriceCentavos: 240_000,
        },
      ],
    });
  });
});
