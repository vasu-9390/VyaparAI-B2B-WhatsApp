import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let aiClient = null;

const isMock =
  !env.GEMINI_API_KEY ||
  env.GEMINI_API_KEY === 'your_gemini_api_key_here' ||
  env.GEMINI_API_KEY === 'mock_gemini_key_for_development' ||
  env.NODE_ENV === 'test';

if (!isMock) {
  try {
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    logger.info(`Google GenAI client initialized with model: ${env.GEMINI_MODEL}`);
  } catch (err) {
    logger.warn('Failed to initialize GoogleGenAI client, falling back to mock adapter', err);
    aiClient = null;
  }
} else {
  logger.info('Gemini AI Service operating in mock/development mode for offline reliability');
}

export { aiClient, isMock };
