import { z } from 'zod';

const quotationItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantSku: z.string().trim().optional().default(''),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unitPricePaise: z.number().nonnegative('Unit price must be non-negative').optional(),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  leadId: z.string().nullable().optional(),
  items: z.array(quotationItemInputSchema).min(1, 'At least one line item is required'),
  shippingPaise: z.number().nonnegative().default(0),
  validityDays: z.number().positive().default(7),
  paymentTerms: z.string().optional().default('30 Days Net from Invoice'),
  deliveryTerms: z.string().optional().default('Ex-Mill Surat / Standard Transport'),
  notes: z.string().optional().default(''),
});

export const updateQuotationSchema = createQuotationSchema.partial();

export const approveQuotationSchema = z.object({
  note: z.string().optional().default('Approved by manager/owner'),
});

export const rejectQuotationSchema = z.object({
  reason: z.string().trim().min(2, 'Rejection reason is required'),
});
