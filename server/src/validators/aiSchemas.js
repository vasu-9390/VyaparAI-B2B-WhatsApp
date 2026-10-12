import { z } from 'zod';

export const extractedItemSchema = z.object({
  product_query: z.string().trim().min(1, 'Product query is required'),
  color: z.string().trim().optional().default(''),
  size: z.string().trim().optional().default(''),
  material: z.string().trim().optional().default(''),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unit: z.string().trim().default('piece'),
  target_rate: z.number().positive().optional().nullable(),
});

export const orderExtractionSchema = z.object({
  intent: z.enum([
    'quotation_request',
    'order_confirmation',
    'inquiry',
    'complaint',
    'general_greeting',
  ]),
  language: z.enum(['hi', 'gu', 'te', 'en']).default('en'),
  items: z.array(extractedItemSchema).default([]),
  missing_fields: z.array(z.string()).default([]),
  needs_clarification: z.boolean().default(false),
  clarification_question: z.string().optional().default(''),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const draftReplySchema = z.object({
  replyText: z.string().trim().min(1),
  language: z.enum(['hi', 'gu', 'te', 'en']).default('en'),
  tone: z.enum(['professional', 'warm_b2b', 'formal']).default('warm_b2b'),
});

export const conversationSummarySchema = z.object({
  summary: z.string().trim().min(1),
  keyActionItems: z.array(z.string()).default([]),
  customerSentiment: z.enum(['positive', 'neutral', 'urgent', 'frustrated']).default('neutral'),
});
