import fs from 'fs';
import { Quotation, QUOTATION_STATUSES } from '../models/Quotation.js';
import { Organization } from '../models/Organization.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { PricingEngine } from '../services/pricing/pricingEngine.js';
import { PdfService } from '../services/pdf/pdfService.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const QuotationController = {
  /**
   * Helper to strip internal cost and profit margins for unprivileged sales reps
   */
  sanitizeQuotation(quotation, userRole) {
    const isPrivileged = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER'].includes(userRole);
    if (isPrivileged) return quotation;

    const safe = quotation.toObject ? quotation.toObject() : { ...quotation };
    delete safe.totalCostPaise;
    delete safe.overallMarginPercent;

    if (safe.lineItems && Array.isArray(safe.lineItems)) {
      safe.lineItems = safe.lineItems.map((item) => {
        delete item.unitCostPricePaise;
        delete item.lineCostPaise;
        return item;
      });
    }
    return safe;
  },

  /**
   * GET /api/quotations
   */
  async listQuotations(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '', customerId = '' } = req.query;
      const query = { organizationId: req.user.organizationId };

      if (status) query.status = status;
      if (customerId) query.customerId = customerId;

      const skip = (Number(page) - 1) * Number(limit);
      const [quotations, total] = await Promise.all([
        Quotation.find(query)
          .populate('customerId', 'name companyName whatsappPhone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Quotation.countDocuments(query),
      ]);

      const sanitized = quotations.map((q) => QuotationController.sanitizeQuotation(q, req.user.role));
      return sendPaginated(res, sanitized, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/quotations
   * Create quotation with deterministic pricing engine calculation
   */
  async createQuotation(req, res, next) {
    try {
      const { customerId, leadId, items, shippingPaise, validityDays, paymentTerms, deliveryTerms, notes } = req.body;

      const organization = await Organization.findById(req.user.organizationId);
      if (!organization) {
        throw new AppError('Organization profile not found', 404, 'ORG_NOT_FOUND');
      }

      // 1. Run Pricing Engine
      const calculation = await PricingEngine.calculateQuotation({
        organization,
        customerId,
        items,
        shippingPaise,
        validityDays,
      });

      // 2. Generate sequential unique quotation number
      const year = new Date().getFullYear();
      const count = await Quotation.countDocuments({ organizationId: organization._id });
      const prefix = organization.settings?.quotePrefix || 'QT-';
      const quotationNumber = `${prefix}${year}-${String(count + 1).padStart(4, '0')}`;

      // 3. Create Quotation Record
      const quotation = await Quotation.create({
        organizationId: organization._id,
        customerId,
        leadId: leadId || null,
        quotationNumber,
        version: 1,
        status: calculation.status,
        approvalRequired: calculation.requiresApproval,
        approvalReason: calculation.approvalReason,
        lineItems: calculation.lineItems,
        subtotalPaise: calculation.subtotalPaise,
        discountTotalPaise: calculation.discountTotalPaise,
        taxTotalPaise: calculation.taxTotalPaise,
        shippingPaise: calculation.shippingPaise,
        grandTotalPaise: calculation.grandTotalPaise,
        totalCostPaise: calculation.totalCostPaise,
        overallMarginPercent: calculation.overallMarginPercent,
        paymentTerms: paymentTerms || '30 Days Net from Invoice',
        deliveryTerms: deliveryTerms || 'Ex-Mill Surat / Standard Transport',
        validityDays: calculation.validityDays,
        validUntil: calculation.validUntil,
        notes: notes || '',
        history: [
          {
            action: 'CREATED',
            actorId: req.user.id,
            actorName: req.user.name,
            note: calculation.requiresApproval
              ? `Created and queued for approval: ${calculation.approvalReason}`
              : 'Quotation drafted successfully',
            timestamp: new Date(),
          },
        ],
      });

      // If linked to lead, update lead status
      if (leadId) {
        await Lead.findByIdAndUpdate(leadId, {
          status: 'QUOTATION_SENT',
          lastContactAt: new Date(),
        });
      }

      const populated = await Quotation.findById(quotation._id).populate('customerId');
      const sanitized = QuotationController.sanitizeQuotation(populated, req.user.role);

      return sendSuccess(res, sanitized, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/quotations/:id
   */
  async getQuotationById(req, res, next) {
    try {
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      })
        .populate('customerId')
        .populate('approvedBy', 'name email');

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      const sanitized = QuotationController.sanitizeQuotation(quotation, req.user.role);
      return sendSuccess(res, sanitized);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/quotations/:id/approve
   * Authorize quotation with high discount / low margin
   */
  async approveQuotation(req, res, next) {
    try {
      const { note = 'Approved by manager/owner' } = req.body;
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      if (quotation.status !== QUOTATION_STATUSES.PENDING_APPROVAL) {
        throw new AppError(`Cannot approve quote currently in status '${quotation.status}'`, 400, 'INVALID_STATE');
      }

      quotation.status = QUOTATION_STATUSES.APPROVED;
      quotation.approvalRequired = false;
      quotation.approvedBy = req.user.id;
      quotation.approvedAt = new Date();
      quotation.history.push({
        action: 'APPROVED',
        actorId: req.user.id,
        actorName: req.user.name,
        note,
        timestamp: new Date(),
      });

      await quotation.save();
      const sanitized = QuotationController.sanitizeQuotation(quotation, req.user.role);
      return sendSuccess(res, sanitized);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/quotations/:id/send
   * Generate PDF & dispatch quotation
   */
  async sendQuotation(req, res, next) {
    try {
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      }).populate('customerId');

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      if (quotation.status === QUOTATION_STATUSES.PENDING_APPROVAL) {
        throw new AppError('Quotation is pending manager approval and cannot be sent yet', 403, 'APPROVAL_REQUIRED');
      }

      const organization = await Organization.findById(req.user.organizationId);

      // Generate PDF if not yet created
      const pdfPath = await PdfService.generateQuotationPdf(quotation, organization, quotation.customerId);
      quotation.pdfStorageKey = pdfPath;
      quotation.pdfGeneratedAt = new Date();
      quotation.status = QUOTATION_STATUSES.SENT;
      quotation.sentAt = new Date();
      quotation.history.push({
        action: 'SENT',
        actorId: req.user.id,
        actorName: req.user.name,
        note: 'Quotation PDF generated and dispatched',
        timestamp: new Date(),
      });

      await quotation.save();
      const sanitized = QuotationController.sanitizeQuotation(quotation, req.user.role);
      return sendSuccess(res, sanitized);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/quotations/:id/accept
   */
  async acceptQuotation(req, res, next) {
    try {
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      if (new Date() > new Date(quotation.validUntil)) {
        quotation.status = QUOTATION_STATUSES.EXPIRED;
        await quotation.save();
        throw new AppError('Cannot accept quotation because its validity period has expired', 400, 'QUOTE_EXPIRED');
      }

      quotation.status = QUOTATION_STATUSES.ACCEPTED;
      quotation.acceptedAt = new Date();
      quotation.history.push({
        action: 'ACCEPTED',
        actorId: req.user.id,
        actorName: req.user.name,
        note: 'Customer confirmed and accepted quotation terms',
        timestamp: new Date(),
      });

      await quotation.save();
      const sanitized = QuotationController.sanitizeQuotation(quotation, req.user.role);
      return sendSuccess(res, sanitized);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/quotations/:id/reject
   */
  async rejectQuotation(req, res, next) {
    try {
      const { reason } = req.body;
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      quotation.status = QUOTATION_STATUSES.REJECTED;
      quotation.rejectedReason = reason;
      quotation.history.push({
        action: 'REJECTED',
        actorId: req.user.id,
        actorName: req.user.name,
        note: `Customer rejected quotation: ${reason}`,
        timestamp: new Date(),
      });

      await quotation.save();
      const sanitized = QuotationController.sanitizeQuotation(quotation, req.user.role);
      return sendSuccess(res, sanitized);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/quotations/:id/pdf
   * Stream the generated PDF directly to the browser
   */
  async getPdf(req, res, next) {
    try {
      const quotation = await Quotation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      }).populate('customerId');

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      const organization = await Organization.findById(req.user.organizationId);

      // Always ensure PDF exists
      let pdfPath = quotation.pdfStorageKey;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        pdfPath = await PdfService.generateQuotationPdf(quotation, organization, quotation.customerId);
        quotation.pdfStorageKey = pdfPath;
        quotation.pdfGeneratedAt = new Date();
        await quotation.save();
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Quotation_${quotation.quotationNumber}.pdf"`);
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  },
};
