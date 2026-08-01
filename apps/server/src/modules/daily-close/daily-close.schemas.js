import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a valid calendar date.');

export const dailyCloseQuerySchema = z.object({ date: businessDate }).strict();
export const closeBusinessDateSchema = z
  .object({ businessDate, closeNote: z.string().trim().max(300).default('') })
  .strict();
export const reopenBusinessDateSchema = z
  .object({ businessDate, reason: z.string().trim().max(200).default('') })
  .strict();
