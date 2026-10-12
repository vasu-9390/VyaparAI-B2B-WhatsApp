import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

export function verifyWebhookSignature(req, res, next) {
  // In development, mock mode, or test without secret, proceed
  if (
    env.NODE_ENV === 'test' ||
    !env.WHATSAPP_APP_SECRET ||
    env.WHATSAPP_APP_SECRET === 'mock_app_secret' ||
    env.WHATSAPP_APP_SECRET === 'your_meta_app_secret_for_hmac_verification'
  ) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.warn('Incoming webhook rejected: Missing X-Hub-Signature-256 header');
    return sendError(res, 'Missing webhook signature header', 401, 'INVALID_SIGNATURE');
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const expectedHash = crypto
      .createHmac('sha256', env.WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest('hex');

    const expectedSignature = `sha256=${expectedHash}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      logger.warn('Incoming webhook rejected: Invalid signature mismatch');
      return sendError(res, 'Invalid webhook signature', 403, 'FORBIDDEN_SIGNATURE');
    }

    next();
  } catch (err) {
    logger.error('Error during signature verification', err);
    return sendError(res, 'Signature verification failed', 403, 'FORBIDDEN_SIGNATURE');
  }
}
