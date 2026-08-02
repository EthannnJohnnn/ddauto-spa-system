import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const reportsOverviewQuerySchema = z
  .object({ start: businessDate, end: businessDate })
  .strict()
  .refine((value) => value.start <= value.end, {
    message: 'The start date must not be after the end date.',
    path: ['end'],
  })
  .refine((value) => daysBetween(value.start, value.end) <= 365, {
    message: 'Reports can cover at most 366 days at a time.',
    path: ['end'],
  });

export const reportsExcelQuerySchema = reportsOverviewQuerySchema;

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function daysBetween(start, end) {
  return (new Date(`${end}T00:00:00.000Z`) - new Date(`${start}T00:00:00.000Z`)) / 86_400_000;
}
