import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceTicketForm } from './ServiceTicketForm.jsx';

const catalogs = {
  employees: [
    {
      id: 1,
      displayName: 'Orlan',
      fixedDailyRateCentavos: 40_000,
      receivesLaborShare: true,
      isSpecialist: true,
      isActive: true,
    },
    {
      id: 2,
      displayName: 'Orlie',
      fixedDailyRateCentavos: 0,
      receivesLaborShare: true,
      isSpecialist: false,
      isActive: true,
    },
  ],
  vehicleClasses: [{ id: 10, name: 'Sedan', sortOrder: 10, isActive: true }],
  services: [
    {
      id: 20,
      name: 'Carwash',
      laborRule: 'ORDINARY',
      laborRateBasisPoints: 4000,
      sortOrder: 10,
      isActive: true,
    },
    {
      id: 21,
      name: 'Detailing',
      laborRule: 'SPECIALIST',
      laborRateBasisPoints: 3000,
      sortOrder: 20,
      isActive: true,
    },
    {
      id: 22,
      name: 'Painting',
      laborRule: 'EXTERNAL',
      laborRateBasisPoints: 0,
      sortOrder: 30,
      isActive: true,
    },
  ],
  prices: [
    { serviceId: 20, vehicleClassId: 10, amountCentavos: 30_000 },
    { serviceId: 22, vehicleClassId: 10, amountCentavos: 500_000 },
  ],
  setupProgress: { isComplete: true },
};

describe('ServiceTicketForm', () => {
  it('auto-fills the service price and sends assigned ordinary workers', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm(onSave);

    fireEvent.change(screen.getByLabelText('Vehicle class'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: '20' } });
    expect(screen.getByLabelText('Service 1 sale amount').value).toBe('300.00');
    fireEvent.click(screen.getByText('Orlan'));
    fireEvent.click(screen.getByText('Orlie'));
    fireEvent.click(screen.getByRole('button', { name: 'Record service transaction' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      businessDate: '2026-07-19',
      vehicleClassId: 10,
      items: [
        {
          serviceId: 20,
          amountCentavos: 30_000,
          employeeIds: [1, 2],
          externalLaborCostCentavos: 0,
        },
      ],
    });
  });

  it('captures a rare Painting job as manual external-contractor labor', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm(onSave);

    fireEvent.change(screen.getByLabelText('Vehicle class'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('External contractor'), {
      target: { value: 'Dodong' },
    });
    fireEvent.change(screen.getByLabelText('Contractor labor cost'), {
      target: { value: '1000.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record service transaction' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].items[0]).toEqual({
      serviceId: 22,
      amountCentavos: 500_000,
      employeeIds: [],
      externalContractorName: 'Dodong',
      externalLaborCostCentavos: 100_000,
    });
  });
});

function renderForm(onSave) {
  render(
    <ServiceTicketForm
      businessDate="2026-07-19"
      catalogs={catalogs}
      editingTicket={null}
      onCancel={() => {}}
      onSave={onSave}
    />,
  );
}
