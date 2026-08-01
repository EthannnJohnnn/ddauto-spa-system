import { z } from 'zod';

const moneyCentavos = z.number().int().min(0).max(100_000_000);
const quantity = z
  .number()
  .int()
  .min(-100_000)
  .max(100_000)
  .refine((value) => value !== 0, {
    message: 'Quantity cannot be zero.',
  });
const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine(isRealDate, 'Enter a valid calendar date.');

export const canteenIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const canteenOverviewQuerySchema = z
  .object({ start: businessDate, end: businessDate })
  .strict()
  .refine((value) => value.start <= value.end, {
    path: ['end'],
    message: 'The end date must be on or after the start date.',
  });

const beginningInventorySchema = z
  .object({
    businessDate,
    quantity: z.number().int().positive().max(100_000),
    unitCostCentavos: moneyCentavos,
  })
  .strict();

const productSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    category: z.enum(['DRINK', 'SNACK', 'OTHER']),
    currentCostCentavos: moneyCentavos,
    sellingPriceCentavos: moneyCentavos,
    lowStockThreshold: z.number().int().min(0).max(100_000).default(5),
  })
  .strict();

export const createCanteenProductSchema = productSchema.extend({
  beginningInventory: beginningInventorySchema.optional(),
});

export const updateCanteenProductSchema = productSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const documentItemSchema = z
  .object({
    productId: z.number().int().positive(),
    quantity,
    unitCostCentavos: moneyCentavos.optional(),
    unitPriceCentavos: moneyCentavos.optional(),
  })
  .strict();

export const canteenDocumentSchema = z
  .object({
    documentType: z.enum(['BEGINNING', 'PURCHASE', 'SALE', 'ADJUSTMENT']),
    businessDate,
    counterpartyName: z.string().trim().max(100).default(''),
    referenceNumber: z.string().trim().max(60).default(''),
    notes: z.string().trim().max(300).default(''),
    items: z.array(documentItemSchema).min(1).max(50),
  })
  .strict()
  .superRefine((document, context) => {
    if (new Set(document.items.map((item) => item.productId)).size !== document.items.length) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Add each canteen product only once per document.',
      });
    }
    if (
      document.documentType !== 'ADJUSTMENT' &&
      document.items.some((item) => item.quantity < 1)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Beginning inventory, purchases, and sales require positive quantities.',
      });
    }
  });

export const canteenStatusReasonSchema = z
  .object({ reason: z.string().trim().max(200).default('') })
  .strict();

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
