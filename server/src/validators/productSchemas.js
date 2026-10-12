import { z } from 'zod';

const variantInputSchema = z.object({
  sku: z.string().trim().min(1, 'Variant SKU is required'),
  name: z.string().trim().min(1, 'Variant name is required'),
  attributes: z
    .object({
      color: z.string().optional().default(''),
      size: z.string().optional().default(''),
      material: z.string().optional().default(''),
      grade: z.string().optional().default(''),
    })
    .optional()
    .default({}),
  costPricePaise: z.number().nonnegative('Cost price must be non-negative').default(0),
  sellingPricePaise: z.number().nonnegative('Selling price must be non-negative'),
  availableQuantity: z.number().nonnegative().default(0),
});

export const createProductSchema = z.object({
  sku: z.string().trim().min(1, 'Product SKU is required'),
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  description: z.string().trim().optional().default(''),
  category: z.string().trim().min(2, 'Category is required'),
  brand: z.string().trim().optional().default(''),
  uom: z.enum(['meter', 'piece', 'roll', 'box', 'kg', 'set']).default('meter'),
  hsnCode: z.string().trim().optional().default(''),
  taxRatePercent: z
    .union([z.enum(['0', '5', '12', '18', '28']).transform(Number), z.number()])
    .refine((n) => [0, 5, 12, 18, 28].includes(n), { message: 'Tax rate must be 0, 5, 12, 18, or 28' })
    .default(12),
  costPricePaise: z.number().nonnegative('Cost price cannot be negative').default(0),
  defaultSellingPricePaise: z.number().positive('Selling price must be greater than 0'),
  wholesalePricePaise: z.number().nonnegative().optional(),
  minSellingPricePaise: z.number().nonnegative().optional(),
  availableQuantity: z.number().nonnegative().default(0),
  reorderThreshold: z.number().nonnegative().default(50),
  variants: z.array(variantInputSchema).optional().default([]),
  images: z.array(z.string().url()).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const stockAdjustmentSchema = z.object({
  variantSku: z.string().trim().optional(),
  quantity: z.number().refine((n) => n !== 0, 'Adjustment quantity cannot be 0'),
  movementType: z.enum([
    'INITIAL_STOCK',
    'PURCHASE_RECEIPT',
    'SALE_DEDUCTION',
    'ORDER_RESERVED',
    'ORDER_RELEASED',
    'MANUAL_ADJUSTMENT',
    'RETURN',
  ]).default('MANUAL_ADJUSTMENT'),
  reason: z.string().trim().min(2, 'Reason for stock adjustment is required'),
});
