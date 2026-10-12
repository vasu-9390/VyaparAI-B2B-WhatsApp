import { z } from 'zod';

const customPricingRuleInput = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  customPricePaise: z.number().nonnegative().nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().optional().default(''),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer contact name must be at least 2 characters'),
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters'),
  whatsappPhone: z
    .string()
    .trim()
    .min(10, 'WhatsApp phone number must be at least 10 digits')
    .regex(/^[+]?[0-9\s-]+$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  gstin: z.string().trim().toUpperCase().optional().default(''),
  address: z
    .object({
      street: z.string().optional().default(''),
      city: z.string().optional().default('Surat'),
      state: z.string().optional().default('Gujarat'),
      pincode: z.string().optional().default(''),
      country: z.string().optional().default('India'),
    })
    .optional()
    .default({}),
  category: z.enum(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER', 'DIRECT']).default('WHOLESALER'),
  creditLimitPaise: z.number().nonnegative().default(0),
  creditDays: z.number().nonnegative().default(30),
  customPricingRules: z.array(customPricingRuleInput).optional().default([]),
  tags: z.array(z.string().trim()).optional().default([]),
  notes: z.string().optional().default(''),
});

export const updateCustomerSchema = createCustomerSchema.partial();
