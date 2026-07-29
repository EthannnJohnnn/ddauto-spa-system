import { z } from 'zod';

const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate, 'Enter a valid date.');
const condition = z.enum(['GOOD', 'NEEDS_ATTENTION', 'UNDER_REPAIR', 'DAMAGED']);
const money = z.number().int().min(0).max(100_000_000);
const assetCode = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes, or underscores.');

export const equipmentIdParamsSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();
export const equipmentOverviewQuerySchema = z
  .object({
    search: z.string().trim().max(80).default(''),
    categoryId: z.coerce.number().int().positive().optional(),
    condition: condition.optional(),
    includeArchived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .strict();
export const equipmentCategorySchema = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();
export const equipmentReasonSchema = z
  .object({ reason: z.string().trim().min(3).max(200) })
  .strict();

export const createEquipmentBatchSchema = z
  .object({
    businessDate,
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(2).max(100),
    quantity: z.number().int().min(1).max(500),
    assetCodePrefix: z
      .string()
      .trim()
      .max(20)
      .regex(/^[A-Za-z0-9_-]*$/),
    description: z.string().trim().max(300).default(''),
    condition: condition.default('GOOD'),
    conditionCheckedOn: businessDate,
    unitCostCentavos: money,
    supplier: z.string().trim().max(100).default(''),
    referenceNumber: z.string().trim().max(60).default(''),
    notes: z.string().trim().max(500).default(''),
  })
  .strict();

export const updateEquipmentBatchSchema = z
  .object({
    businessDate,
    unitCostCentavos: money,
    supplier: z.string().trim().max(100).default(''),
    referenceNumber: z.string().trim().max(60).default(''),
    notes: z.string().trim().max(500).default(''),
  })
  .strict();

export const updateEquipmentItemSchema = z
  .object({
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(2).max(100),
    assetCode,
    description: z.string().trim().max(300).default(''),
    condition,
    conditionCheckedOn: businessDate,
    notes: z.string().trim().max(500).default(''),
  })
  .strict();

export const equipmentRepairSchema = z
  .object({
    businessDate,
    amountCentavos: money.positive(),
    description: z.string().trim().min(2).max(160),
    payee: z.string().trim().max(100).default(''),
    referenceNumber: z.string().trim().max(60).default(''),
    notes: z.string().trim().max(500).default(''),
    resultingCondition: condition,
  })
  .strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
