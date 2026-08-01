import { z } from 'zod';

const moneyCentavos = z.number().int().min(0).max(100_000_000);
const sortOrder = z.number().int().min(0).max(10_000).default(0);
const laborRateBasisPoints = z.number().int().min(0).max(10_000);

export const idParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createEmployeeSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    fixedDailyRateCentavos: moneyCentavos.default(0),
    receivesLaborShare: z.boolean().default(true),
    isSpecialist: z.boolean().default(false),
  })
  .strict();

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export const createVehicleClassSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    sortOrder,
  })
  .strict();

export const updateVehicleClassSchema = createVehicleClassSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    laborRule: z.enum(['ORDINARY', 'SPECIALIST', 'EXTERNAL']),
    laborRateBasisPoints,
    sortOrder,
  })
  .strict();

export const createServiceSchema = serviceSchema.superRefine(validateServiceLaborPolicy);

export const updateServiceSchema = serviceSchema
  .partial()
  .superRefine(validateServiceLaborPolicy)
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export const archiveSchema = z
  .object({
    reason: z.string().trim().max(200).default(''),
  })
  .strict();

export const setServicePriceSchema = z
  .object({
    serviceId: z.number().int().positive(),
    vehicleClassId: z.number().int().positive(),
    amountCentavos: moneyCentavos,
  })
  .strict();

function validateServiceLaborPolicy(value, context) {
  if (value.laborRule === 'EXTERNAL' && value.laborRateBasisPoints !== 0) {
    context.addIssue({
      code: 'custom',
      path: ['laborRateBasisPoints'],
      message: 'External contractor services use a manually entered labor cost.',
    });
  }
}
