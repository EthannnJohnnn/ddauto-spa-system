import { z } from 'zod';

const moneyCentavos = z.number().int().min(0).max(100_000_000);
const sortOrder = z.number().int().min(0).max(10_000).default(0);

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

export const createServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    laborRule: z.enum(['ORDINARY', 'SPECIALIST']),
    sortOrder,
  })
  .strict();

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export const archiveSchema = z
  .object({
    reason: z.string().trim().min(3).max(200),
  })
  .strict();

export const setServicePriceSchema = z
  .object({
    serviceId: z.number().int().positive(),
    vehicleClassId: z.number().int().positive(),
    amountCentavos: moneyCentavos,
  })
  .strict();
