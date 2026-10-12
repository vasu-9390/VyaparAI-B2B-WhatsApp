import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';
import { verifyWebhookSignature } from '../middleware/webhookSignature.js';

const router = Router();

// Meta Webhook Verification Handshake
router.get('/whatsapp', WebhookController.verifyWebhook);

// Meta Inbound Events (HMAC Signature Verified)
router.post('/whatsapp', verifyWebhookSignature, WebhookController.handleWebhookEvent);

export default router;
