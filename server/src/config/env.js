import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Gemini AI
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  
  // WhatsApp Cloud API
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('vyapar_ai_verify_token'),
  WHATSAPP_APP_SECRET: z.string().optional().default(''),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  
  // Speech to text
  SPEECH_TO_TEXT_PROVIDER: z.enum(['mock', 'whisper', 'google']).default('mock'),
  SPEECH_TO_TEXT_API_KEY: z.string().optional().default(''),
  
  // Redis Queue (Optional)
  REDIS_URL: z.string().optional().default(''),
  
  // File storage
  STORAGE_DIR: z.string().default('./storage'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
