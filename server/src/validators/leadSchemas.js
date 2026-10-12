import { z } from 'zod';

export const createLeadSchema = z.object({
  customerId: z.string().min(1, 'Customer reference is required'),
  source: z.enum(['WHATSAPP', 'REFERRAL', 'DIRECT_CALL', 'TRADE_SHOW', 'WEBSITE']).default('WHATSAPP'),
  status: z.enum(['NEW', 'CONTACTED', 'QUOTATION_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST']).default('NEW'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedTo: z.string().nullable().optional(),
  requestedProducts: z
    .array(
      z.object({
        query: z.string().optional().default(''),
        productId: z.string().nullable().optional(),
        quantity: z.number().positive().default(1),
        estimatedBudgetPaise: z.number().nonnegative().default(0),
      })
    )
    .optional()
    .default([]),
  tags: z.array(z.string().trim()).optional().default([]),
  followUpDate: z.string().datetime().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const addLeadNoteSchema = z.object({
  text: z.string().trim().min(1, 'Note text cannot be empty'),
});

export const assignLeadSchema = z.object({
  assignedTo: z.string().min(1, 'Sales representative ID is required'),
});
