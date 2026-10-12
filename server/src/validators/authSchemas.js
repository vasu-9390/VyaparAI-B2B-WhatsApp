import { z } from 'zod';

export const registerSchema = z.object({
  orgName: z.string().trim().min(2, 'Organization name must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Business handle/slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  industry: z.enum(['textiles', 'ceramics', 'hardware', 'pharma', 'general_b2b']).default('general_b2b'),
  gstin: z.string().trim().toUpperCase().optional().default(''),
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().trim().optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_REP', 'INVENTORY_MANAGER']),
  phone: z.string().trim().optional().default(''),
});
