import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  email: z.email().max(255).trim().toLowerCase(),
  password: z.string().min(6).max(255),
  role: z.enum(['user', 'admin']).default('user'),
});

export const signInSchema = z.object({
  email: z.email().max(255).trim().toLowerCase(),
  password: z.string().min(6).max(255),
});
