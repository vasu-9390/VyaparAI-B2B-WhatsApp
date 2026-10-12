import { GeminiService } from '../services/ai/geminiService.js';
import { AiOrchestrator } from '../services/ai/aiOrchestrator.js';
import { Quotation } from '../models/Quotation.js';
import { Customer } from '../models/Customer.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const AiController = {
  /**
   * POST /api/ai/extract
   * Extract order requirements from unstructured text
   */
  async extractRequirements(req, res, next) {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        throw new AppError('Message text is required for AI extraction', 400, 'INVALID_INPUT');
      }

      const result = await GeminiService.extractOrderRequirements(message);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ai/process-message
   * Run end-to-end AI tool-calling pipeline
   */
  async processMessage(req, res, next) {
    try {
      const { customerId, messageText } = req.body;
      if (!customerId || !messageText) {
        throw new AppError('Both customerId and messageText are required', 400, 'MISSING_FIELDS');
      }

      const result = await AiOrchestrator.processCustomerMessage({
        organizationId: req.user.organizationId,
        customerId,
        messageText,
        actor: req.user,
      });

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ai/draft-reply
   */
  async draftReply(req, res, next) {
    try {
      const { quotationId, language = 'hi' } = req.body;
      const quotation = await Quotation.findOne({
        _id: quotationId,
        organizationId: req.user.organizationId,
      }).populate('customerId');

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      const reply = await GeminiService.draftQuotationReply(quotation, quotation.customerId, language);
      return sendSuccess(res, reply);
    } catch (error) {
      next(error);
    }
  },
};
