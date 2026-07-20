import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseCategoriesPanel } from './ExpenseCategoriesPanel.jsx';
import { ExpenseForm } from './ExpenseForm.jsx';
import { PurchaseHistory } from './PurchaseHistory.jsx';

const categories = [
  { id: 1, name: 'Utilities', isActive: true },
  { id: 2, name: 'Repairs', isActive: true },
];

describe('Phase 7 purchases and expenses forms', () => {
  it('records a manual expense using integer centavos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseForm
        businessDate="2026-07-20"
        categories={categories}
        editingExpense={null}
        onCancel={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Electric bill' },
    });
    fireEvent.change(screen.getByLabelText('Payee'), { target: { value: 'Electric Company' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1250.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record expense' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(undefined, {
      businessDate: '2026-07-20',
      categoryId: 1,
      description: 'Electric bill',
      payee: 'Electric Company',
      referenceNumber: '',
      amountCentavos: 125_075,
      notes: '',
    });
  });

  it('submits category edits and exposes owner delete controls', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();
    render(<ExpenseCategoriesPanel categories={categories} onSave={onSave} onStatus={onStatus} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'Electricity & Water' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save category changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(1, { name: 'Electricity & Water' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(onStatus).toHaveBeenCalledWith(categories[0]);
  });

  it('filters purchase sources and routes edit/delete actions to the source ledger', () => {
    const purchase = {
      id: 'TIRE:7',
      source: 'TIRE',
      documentId: 7,
      businessDate: '2026-07-20',
      documentSequence: 1,
      supplier: 'Tire Supplier',
      referenceNumber: 'INV-7',
      notes: '',
      status: 'ACTIVE',
      voidReason: null,
      totalCentavos: 180_000,
      items: [
        {
          id: 1,
          productName: 'Test Tire',
          size: '185/65R15',
          quantity: 2,
          unitCostCentavos: 90_000,
          lineTotalCentavos: 180_000,
        },
      ],
    };
    const onSourceChange = vi.fn();
    const onManage = vi.fn();
    const onStatus = vi.fn();
    render(
      <PurchaseHistory
        onManage={onManage}
        onSourceChange={onSourceChange}
        onStatus={onStatus}
        purchaseSource="ALL"
        purchases={[purchase]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Canteen' }));
    expect(onSourceChange).toHaveBeenCalledWith('CANTEEN');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onManage).toHaveBeenCalledWith(purchase);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onStatus).toHaveBeenCalledWith(purchase);
  });
});
