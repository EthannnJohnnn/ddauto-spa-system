import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const dailyPayrollQuerySchema = z.object({ date: businessDate }).strict();

export const closePayrollSchema = z
  .object({
    businessDate,
    closeNote: z.string().trim().max(300).default(''),
  })
  .strict();

export const reopenPayrollSchema = z
  .object({
    businessDate,
    reason: z.string().trim().min(3).max(200),
  })
  .strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
