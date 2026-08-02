import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const periodClosePreviewQuerySchema = z
  .object({ start: businessDate, end: businessDate })
  .strict();

export const periodCloseInputSchema = z
  .object({
    start: businessDate,
    end: businessDate,
    note: z.string().trim().max(500).default(''),
  })
  .strict();

export const periodCloseIdParamsSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const periodCloseVoidSchema = z
  .object({ reason: z.string().trim().max(200).default('') })
  .strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
