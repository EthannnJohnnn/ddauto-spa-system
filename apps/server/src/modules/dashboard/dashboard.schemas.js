import { z } from 'zod';

export const dashboardNoteIdParamsSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const dashboardNotesQuerySchema = z
  .object({
    includeArchived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .strict();

export const dashboardNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(1000),
  })
  .strict();

export const dashboardNoteReasonSchema = z
  .object({ reason: z.string().trim().max(200).default('') })
  .strict();
