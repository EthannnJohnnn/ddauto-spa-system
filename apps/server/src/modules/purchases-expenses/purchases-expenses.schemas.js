import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const purchasesExpensesIdParamsSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const purchasesExpensesOverviewQuerySchema = z
  .object({
    start: businessDate,
    end: businessDate,
    purchaseSource: z.enum(['ALL', 'TIRE', 'CANTEEN']).default('ALL'),
  })
  .strict()
  .refine((value) => value.start <= value.end, {
    path: ['end'],
    message: 'The end date must be on or after the start date.',
  });

export const createExpenseCategorySchema = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();

export const updateExpenseCategorySchema = createExpenseCategorySchema;

export const expenseTransactionSchema = z
  .object({
    businessDate,
    categoryId: z.number().int().positive(),
    description: z.string().trim().max(160).default(''),
    payee: z.string().trim().max(100).default(''),
    referenceNumber: z.string().trim().max(60).default(''),
    amountCentavos: z.number().int().positive().max(100_000_000),
    notes: z.string().trim().max(500).default(''),
  })
  .strict();

export const purchasesExpensesStatusReasonSchema = z
  .object({ reason: z.string().trim().max(200).default('') })
  .strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
