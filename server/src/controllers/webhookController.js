import { env } from '../config/env.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Organization } from '../models/Organization.js';
import { AiOrchestrator } from '../services/ai/aiOrchestrator.js';
import { WhatsAppService } from '../services/whatsapp/whatsappService.js';
import { transcriptionService } from '../services/transcription/transcriptionService.js';
import { logger } from '../utils/logger.js';

export const WebhookController = {
  /**
   * GET /api/webhooks/whatsapp
   * Meta Webhook Verification Handshake
   */
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('Meta WhatsApp Webhook subscription handshake verified successfully');
      return res.status(200).send(challenge);
    }

    logger.warn('Meta WhatsApp Webhook handshake failed: token mismatch');
    return res.status(403).send('Verification token mismatch');
  },

  /**
   * POST /api/webhooks/whatsapp
   * Ingest incoming WhatsApp events (messages and delivery statuses)
   */
  async handleWebhookEvent(req, res) {
    // 1. Prompt 200 OK acknowledgment within 500ms
    res.status(200).send('EVENT_RECEIVED');

    // 2. Asynchronous processing in background
    try {
      const body = req.body;
      if (!body || body.object !== 'whatsapp_business_account') {
        return;
      }

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value) continue;

          // A. Process incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              await WebhookController.processIncomingMessage(msg, value.metadata);
            }
          }

          // B. Process message delivery statuses
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await WebhookController.processDeliveryStatus(status);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error during async webhook processing', err);
    }
  },

  /**
   * Process individual incoming message with deduplication & AI orchestration
   */
  async processIncomingMessage(msg, metadata = {}) {
    const messageId = msg.id;
    const fromPhone = `+${msg.from}`;

    // 1. Idempotency Check: Prevent duplicate processing
    const existingEvent = await WebhookEvent.findOne({ eventId: messageId });
    if (existingEvent) {
      logger.info(`Duplicate webhook message event ignored: ${messageId}`);
      return;
    }

    await WebhookEvent.create({
      provider: 'WHATSAPP',
      eventId: messageId,
      payload: msg,
      status: 'RECEIVED',
    });

    // 2. Resolve Organization (match by phoneNumberId or default active org)
    let organization = null;
    if (metadata.phone_number_id) {
      organization = await Organization.findOne({
        'whatsappConfig.phoneNumberId': metadata.phone_number_id,
      });
    }
    if (!organization) {
      organization = await Organization.findOne({ status: 'active' });
    }
    if (!organization) {
      logger.warn('No active organization found to bind incoming WhatsApp message');
      return;
    }

    // 3. Find or create Customer
    let customer = await Customer.findOne({
      organizationId: organization._id,
      whatsappPhone: fromPhone,
    });

    if (!customer) {
      customer = await Customer.create({
        organizationId: organization._id,
        name: `WhatsApp User (${fromPhone.slice(-4)})`,
        companyName: `Enquiry ${fromPhone}`,
        whatsappPhone: fromPhone,
        category: 'WHOLESALER',
      });
    }

    // 4. Find or create Conversation
    let conversation = await Conversation.findOne({
      organizationId: organization._id,
      whatsappPhone: fromPhone,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        organizationId: organization._id,
        customerId: customer._id,
        whatsappPhone: fromPhone,
        status: 'ACTIVE',
      });
    }

    // 5. Determine Message Content & Type
    const messageType = (msg.type || 'text').toUpperCase();
    let textContent = '';
    let mediaId = '';
    let transcriptionMeta = null;

    if (msg.type === 'text') {
      textContent = msg.text?.body || '';
    } else if (msg.type === 'audio' || msg.type === 'voice') {
      mediaId = msg.audio?.id || msg.voice?.id || '';
      // Transcribe through configured STT service
      const sttResult = await transcriptionService.transcribeAudio({
        audioBuffer: Buffer.from('mock_audio_stream'),
        mimeType: msg.audio?.mime_type || 'audio/ogg',
        sampleText: msg.audio?.caption || msg.text?.body || '',
      });
      textContent = sttResult.transcript;
      transcriptionMeta = sttResult;
    } else if (msg.type === 'document') {
      mediaId = msg.document?.id || '';
      textContent = msg.document?.caption || `[Document: ${msg.document?.filename || 'File'}]`;
    }

    // 6. Save Inbound Message
    const savedMessage = await Message.create({
      organizationId: organization._id,
      conversationId: conversation._id,
      customerId: customer._id,
      whatsappMessageId: messageId,
      direction: 'INBOUND',
      type: messageType === 'AUDIO' || messageType === 'VOICE' ? 'AUDIO' : messageType === 'DOCUMENT' ? 'DOCUMENT' : 'TEXT',
      text: textContent,
      mediaId,
      deliveryStatus: 'READ',
      sentAt: new Date(Number(msg.timestamp) * 1000 || Date.now()),
      aiExtractedData: transcriptionMeta ? { transcription: transcriptionMeta } : null,
    });

    // Update conversation state
    conversation.lastMessageAt = new Date();
    conversation.lastMessageText = textContent;
    conversation.unreadCount += 1;
    await conversation.save();

    // 7. If text or transcribed audio message, trigger AI Orchestrator
    if (textContent && (messageType === 'TEXT' || messageType === 'AUDIO' || messageType === 'VOICE')) {
      try {
        const orchestratorResult = await AiOrchestrator.processCustomerMessage({
          organizationId: organization._id,
          customerId: customer._id,
          messageText: textContent,
        });

        // Save AI extraction on message alongside any transcription metadata
        savedMessage.aiExtractedData = {
          ...(transcriptionMeta ? { transcription: transcriptionMeta } : {}),
          ...orchestratorResult.extraction,
        };
        await savedMessage.save();

        conversation.latestAiIntent = orchestratorResult.extraction?.intent || 'inquiry';
        if (orchestratorResult.quotation) {
          conversation.activeQuotationId = orchestratorResult.quotation._id;
        }
        await conversation.save();

        // If organization configured autoApproveQuotes or needs clarification, send immediate reply
        if (orchestratorResult.actionTaken === 'CLARIFICATION_REQUIRED' && orchestratorResult.proposedReply) {
          await WhatsAppService.sendTextMessage(fromPhone, orchestratorResult.proposedReply);
          
          await Message.create({
            organizationId: organization._id,
            conversationId: conversation._id,
            customerId: customer._id,
            whatsappMessageId: `wamid.autoClarify_${Date.now()}`,
            direction: 'OUTBOUND',
            type: 'TEXT',
            text: orchestratorResult.proposedReply,
            deliveryStatus: 'SENT',
          });
        }
      } catch (aiErr) {
        logger.error('Error during AI processing of inbound message', aiErr);
      }
    }

    // Mark event as processed
    await WebhookEvent.findOneAndUpdate({ eventId: messageId }, { status: 'PROCESSED', processedAt: new Date() });
  },

  /**
   * Process delivery receipt updates (sent, delivered, read, failed)
   */
  async processDeliveryStatus(status) {
    const messageId = status.id;
    const newStatus = (status.status || '').toUpperCase();

    const updateFields = { deliveryStatus: newStatus };
    if (newStatus === 'DELIVERED') updateFields.deliveredAt = new Date();
    if (newStatus === 'READ') updateFields.readAt = new Date();

    await Message.findOneAndUpdate({ whatsappMessageId: messageId }, updateFields);
  },
};
