import { GeminiService } from './geminiService.js';
import { CatalogMatcher } from './catalogMatcher.js';
import { InventoryService } from '../inventory/inventoryService.js';
import { PricingEngine } from '../pricing/pricingEngine.js';
import { Quotation } from '../../models/Quotation.js';
import { Customer } from '../../models/Customer.js';
import { Organization } from '../../models/Organization.js';
import { Lead } from '../../models/Lead.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

export const AiOrchestrator = {
  /**
   * Process incoming customer WhatsApp message end-to-end through the controlled AI tool-calling pipeline
   */
  async processCustomerMessage({ organizationId, customerId, messageText, actor = null }) {
    logger.info(`Processing message through AI Orchestrator for customer ${customerId}`);

    const [organization, customer] = await Promise.all([
      Organization.findById(organizationId),
      Customer.findOne({ _id: customerId, organizationId }),
    ]);

    if (!organization) throw new AppError('Organization not found', 404, 'ORG_NOT_FOUND');
    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    // 1. Tool Call: Extract Order Requirements with Gemini
    const extraction = await GeminiService.extractOrderRequirements(messageText);

    // If customer just sent a greeting or enquiry needing clarification
    if (extraction.needs_clarification || extraction.items.length === 0) {
      const clarification = await GeminiService.generateClarification(
        extraction.missing_fields,
        extraction.language,
        customer.name
      );

      return {
        actionTaken: 'CLARIFICATION_REQUIRED',
        extraction,
        proposedReply: clarification,
        quotation: null,
      };
    }

    // 2. Tool Call: Match extracted items against active product catalog
    const matchedItems = [];
    for (const item of extraction.items) {
      const matchResult = await CatalogMatcher.matchProduct({
        organizationId,
        productQuery: item.product_query,
        color: item.color,
        size: item.size,
        material: item.material,
      });

      if (!matchResult.matchFound) {
        // Unknown product in catalog -> request clarification
        const clarification = `Namaste ${customer.name} bhai, aapne "${item.product_query}" pucha hai jo hamare active catalog me match nahi ho raha. Kya aap SKU ya description specify kar sakte hain?`;
        return {
          actionTaken: 'PRODUCT_NOT_FOUND',
          extraction,
          proposedReply: clarification,
          quotation: null,
        };
      }

      // 3. Tool Call: Check stock availability
      const availability = await InventoryService.checkAvailability(
        organizationId,
        matchResult.candidate._id,
        matchResult.variant?.sku,
        item.quantity
      );

      matchedItems.push({
        productId: matchResult.candidate._id,
        variantSku: matchResult.variant ? matchResult.variant.sku : '',
        quantity: item.quantity,
        isAvailable: availability.isAvailable,
        netAvailableQuantity: availability.netAvailableQuantity,
      });
    }

    // 4. Tool Call: Deterministic Quotation Calculation
    const quoteCalculation = await PricingEngine.calculateQuotation({
      organization,
      customerId,
      items: matchedItems,
      shippingPaise: 0,
      validityDays: 7,
    });

    // 5. Tool Call: Create Quotation Draft
    const year = new Date().getFullYear();
    const count = await Quotation.countDocuments({ organizationId });
    const prefix = organization.settings?.quotePrefix || 'QT-';
    const quotationNumber = `${prefix}${year}-${String(count + 1).padStart(4, '0')}`;

    const quotation = await Quotation.create({
      organizationId,
      customerId,
      quotationNumber,
      version: 1,
      status: quoteCalculation.status,
      approvalRequired: quoteCalculation.requiresApproval,
      approvalReason: quoteCalculation.approvalReason,
      lineItems: quoteCalculation.lineItems,
      subtotalPaise: quoteCalculation.subtotalPaise,
      discountTotalPaise: quoteCalculation.discountTotalPaise,
      taxTotalPaise: quoteCalculation.taxTotalPaise,
      grandTotalPaise: quoteCalculation.grandTotalPaise,
      totalCostPaise: quoteCalculation.totalCostPaise,
      overallMarginPercent: quoteCalculation.overallMarginPercent,
      validUntil: quoteCalculation.validUntil,
      history: [
        {
          action: 'AI_DRAFTED',
          actorId: actor ? actor.id : null,
          actorName: 'VyaparAI Engine',
          note: `Extracted from customer message via Gemini: "${messageText.substring(0, 80)}"`,
          timestamp: new Date(),
        },
      ],
    });

    // 6. Tool Call: Draft Professional Customer Reply
    const draftReply = await GeminiService.draftQuotationReply(quotation, customer, extraction.language);

    return {
      actionTaken: quoteCalculation.requiresApproval ? 'DRAFT_CREATED_APPROVAL_PENDING' : 'DRAFT_CREATED_READY',
      extraction,
      quotation,
      proposedReply: draftReply.replyText,
      requiresApproval: quoteCalculation.requiresApproval,
      approvalReason: quoteCalculation.approvalReason,
    };
  },
};
