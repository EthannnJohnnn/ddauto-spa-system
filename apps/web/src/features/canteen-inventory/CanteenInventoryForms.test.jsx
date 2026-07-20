import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanteenDocumentForm } from './CanteenDocumentForm.jsx';
import { CanteenProductsPanel } from './CanteenProductsPanel.jsx';

const product = {
  id: 1,
  name: 'Wilkins Water',
  category: 'DRINK',
  currentCostCentavos: 1_063,
  sellingPriceCentavos: 2_500,
  lowStockThreshold: 2,
  stockQuantity: 4,
  isActive: true,
};

describe('Phase 6 canteen inventory forms', () => {
  it('creates a canteen product with optional beginning inventory', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CanteenProductsPanel
        businessDate="2026-07-01"
        onSave={onSave}
        onStatus={() => {}}
        products={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Item name'), {
      target: { value: 'Wilkins Water' },
    });
    fireEvent.change(screen.getByLabelText('Current unit cost'), {
      target: { value: '10.63' },
    });
    fireEvent.change(screen.getByLabelText('Selling price'), {
      target: { value: '25.00' },
    });
    fireEvent.click(screen.getByLabelText('Add beginning inventory'));
    fireEvent.change(screen.getByLabelText('Beginning quantity'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Beginning unit cost'), {
      target: { value: '10.63' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add canteen product' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toEqual([
      undefined,
      {
        name: 'Wilkins Water',
        category: 'DRINK',
        currentCostCentavos: 1_063,
        sellingPriceCentavos: 2_500,
        lowStockThreshold: 5,
        beginningInventory: {
          businessDate: '2026-07-01',
          quantity: 4,
          unitCostCentavos: 1_063,
        },
      },
    ]);
  });

  it('auto-fills a canteen sale price and submits a stock-reducing sale item', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CanteenDocumentForm
        businessDate="2026-07-03"
        documentType="SALE"
        editingDocument={null}
        onCancel={() => {}}
        onSave={onSave}
        products={[product]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Canteen product'), { target: { value: '1' } });
    expect(screen.getByLabelText('Selling price').value).toBe('25.00');
    fireEvent.change(screen.getByLabelText('Item 1 quantity'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record canteen sale' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][1]).toMatchObject({
      documentType: 'SALE',
      businessDate: '2026-07-03',
      items: [
        {
          productId: 1,
          quantity: 2,
          unitCostCentavos: 1_063,
          unitPriceCentavos: 2_500,
        },
      ],
    });
  });
});
