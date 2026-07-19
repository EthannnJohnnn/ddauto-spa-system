import { z } from 'zod';

const username = z
  .string()
  .trim()
  .min(3, 'Username must contain at least 3 characters.')
  .max(50, 'Username cannot exceed 50 characters.')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Use only letters, numbers, periods, underscores, and hyphens.')
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(12, 'Password must contain at least 12 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .refine((value) => /[a-z]/.test(value), 'Password must include a lowercase letter.')
  .refine((value) => /[A-Z]/.test(value), 'Password must include an uppercase letter.')
  .refine((value) => /[0-9]/.test(value), 'Password must include a number.');

export const setupSchema = z
  .object({
    username,
    password,
    displayName: z.string().trim().min(2).max(80).optional().default('Owner'),
  })
  .strict();

export const loginSchema = z
  .object({
    username,
    password: z.string().min(1).max(128),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    username,
    recoveryCode: z.string().trim().min(8).max(100),
    newPassword: password,
  })
  .strict();
