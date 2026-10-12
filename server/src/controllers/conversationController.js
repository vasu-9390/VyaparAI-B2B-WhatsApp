import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { Quotation } from '../models/Quotation.js';
import { WhatsAppService } from '../services/whatsapp/whatsappService.js';
import { GeminiService } from '../services/ai/geminiService.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const ConversationController = {
  /**
   * GET /api/conversations
   */
  async listConversations(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '' } = req.query;
      const query = { organizationId: req.user.organizationId };

      if (status) query.status = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [conversations, total] = await Promise.all([
        Conversation.find(query)
          .populate('customerId', 'name companyName whatsappPhone category')
          .populate('assignedTo', 'name email')
          .populate('activeQuotationId', 'quotationNumber grandTotalPaise status')
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Conversation.countDocuments(query),
      ]);

      return sendPaginated(res, conversations, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/conversations/:id/messages
   */
  async getMessages(req, res, next) {
    try {
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404, 'NOT_FOUND');
      }

      // Mark unread as 0
      conversation.unreadCount = 0;
      await conversation.save();

      const messages = await Message.find({
        conversationId: conversation._id,
        organizationId: req.user.organizationId,
      })
        .populate('quotationId', 'quotationNumber grandTotalPaise pdfStorageKey')
        .sort({ createdAt: 1 });

      return sendSuccess(res, {
        conversation,
        messages,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/conversations/:id/messages
   * Send manual outbound message or attach PDF quotation
   */
  async sendMessage(req, res, next) {
    try {
      const { text, quotationId } = req.body;
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      }).populate('customerId');

      if (!conversation) {
        throw new AppError('Conversation not found', 404, 'NOT_FOUND');
      }

      let dispatchResult;
      let messageType = 'TEXT';

      // If sending a quotation document
      if (quotationId) {
        const quotation = await Quotation.findOne({
          _id: quotationId,
          organizationId: req.user.organizationId,
        });

        if (!quotation) throw new AppError('Quotation not found', 404, 'NOT_FOUND');

        messageType = 'DOCUMENT';
        dispatchResult = await WhatsAppService.sendDocumentMessage(
          conversation.whatsappPhone,
          `/api/quotations/${quotation._id}/pdf`,
          `Quotation_${quotation.quotationNumber}.pdf`,
          text || `Quotation ${quotation.quotationNumber}`
        );
      } else {
        if (!text || !text.trim()) {
          throw new AppError('Message text cannot be empty', 400, 'EMPTY_TEXT');
        }
        dispatchResult = await WhatsAppService.sendTextMessage(conversation.whatsappPhone, text.trim());
      }

      // Persist outbound message in database
      const savedMessage = await Message.create({
        organizationId: req.user.organizationId,
        conversationId: conversation._id,
        customerId: conversation.customerId._id,
        whatsappMessageId: dispatchResult.messageId,
        direction: 'OUTBOUND',
        type: messageType,
        text: text || '',
        quotationId: quotationId || null,
        deliveryStatus: 'SENT',
        sentAt: new Date(),
      });

      conversation.lastMessageAt = new Date();
      conversation.lastMessageText = text || 'Quotation Document Sent';
      await conversation.save();

      return sendSuccess(res, savedMessage, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/conversations/:id/assign
   * Human takeover / assign conversation to a sales rep
   */
  async assignRepresentative(req, res, next) {
    try {
      const { assignedTo } = req.body;
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!conversation) {
        throw new AppError('Conversation not found', 404, 'NOT_FOUND');
      }

      const rep = await User.findOne({
        _id: assignedTo,
        organizationId: req.user.organizationId,
      });

      if (!rep) throw new AppError('Representative not found', 404, 'USER_NOT_FOUND');

      conversation.assignedTo = rep._id;
      conversation.status = 'HUMAN_TAKEOVER';
      await conversation.save();

      return sendSuccess(res, conversation);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/conversations/:id/ai-draft
   * Request an intelligent draft reply based on latest context
   */
  async generateAiDraft(req, res, next) {
    try {
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      }).populate('customerId');

      if (!conversation) {
        throw new AppError('Conversation not found', 404, 'NOT_FOUND');
      }

      const latestMessages = await Message.find({
        conversationId: conversation._id,
      })
        .sort({ createdAt: -1 })
        .limit(5);

      const latestCustomerMsg = latestMessages.find((m) => m.direction === 'INBOUND');
      const draft = await GeminiService.extractOrderRequirements(latestCustomerMsg?.text || 'Hello');

      return sendSuccess(res, {
        intent: draft.intent,
        language: draft.language,
        suggestedReply: draft.clarification_question || 'Namaste! How can we assist you with our catalog today?',
        extractedItems: draft.items,
      });
    } catch (error) {
      next(error);
    }
  },
};
