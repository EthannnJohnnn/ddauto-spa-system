import { z } from 'zod';

const moneyCentavos = z.number().int().min(0).max(100_000_000);
const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const ticketIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const dailySalesQuerySchema = z.object({ date: businessDate }).strict();

const ticketItemSchema = z
  .object({
    serviceId: z.number().int().positive(),
    amountCentavos: moneyCentavos,
    employeeIds: z.array(z.number().int().positive()).max(20).default([]),
    externalContractorName: z.string().trim().max(80).default(''),
    externalLaborCostCentavos: moneyCentavos.default(0),
  })
  .strict()
  .refine((item) => new Set(item.employeeIds).size === item.employeeIds.length, {
    path: ['employeeIds'],
    message: 'Each employee can be assigned only once per service.',
  });

export const serviceTicketSchema = z
  .object({
    businessDate,
    vehicleClassId: z.number().int().positive(),
    vehicleDescription: z.string().trim().max(80).default(''),
    plateNumber: z.string().trim().max(20).default(''),
    notes: z.string().trim().max(300).default(''),
    items: z.array(ticketItemSchema).min(1).max(20),
  })
  .strict()
  .refine(
    (ticket) => new Set(ticket.items.map((item) => item.serviceId)).size === ticket.items.length,
    {
      path: ['items'],
      message: 'Add each service only once to a transaction.',
    },
  );

export const attendanceSchema = z
  .object({
    businessDate,
    employeeId: z.number().int().positive(),
    isPresent: z.boolean(),
    mealCostCentavos: moneyCentavos.default(5_000),
  })
  .strict();

export const statusReasonSchema = z.object({ reason: z.string().trim().min(3).max(200) }).strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
