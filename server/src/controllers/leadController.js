import { Lead, LEAD_STATUSES } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const LeadController = {
  /**
   * GET /api/leads
   */
  async listLeads(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '', priority = '', assignedTo = '', search = '' } = req.query;
      const query = { organizationId: req.user.organizationId };

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assignedTo) query.assignedTo = assignedTo;

      // If sales rep, only show assigned leads unless manager/owner
      if (req.user.role === 'SALES_REP') {
        query.assignedTo = req.user.id;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [leads, total] = await Promise.all([
        Lead.find(query)
          .populate('customerId', 'name companyName whatsappPhone email category')
          .populate('assignedTo', 'name email role')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Lead.countDocuments(query),
      ]);

      return sendPaginated(res, leads, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/leads
   */
  async createLead(req, res, next) {
    try {
      const { customerId, source, status, priority, assignedTo, requestedProducts = [], tags = [], followUpDate } = req.body;

      // Verify customer belongs to organization
      const customer = await Customer.findOne({
        _id: customerId,
        organizationId: req.user.organizationId,
      });
      if (!customer) {
        throw new AppError('Referenced customer does not exist in your account', 404, 'CUSTOMER_NOT_FOUND');
      }

      const lead = await Lead.create({
        organizationId: req.user.organizationId,
        customerId,
        source: source || 'WHATSAPP',
        status: status || LEAD_STATUSES.NEW,
        priority: priority || 'MEDIUM',
        assignedTo: assignedTo || (req.user.role === 'SALES_REP' ? req.user.id : null),
        requestedProducts,
        tags,
        followUpDate: followUpDate || null,
        notes: [
          {
            text: 'Enquiry initialized',
            authorId: req.user.id,
            authorName: req.user.name,
            createdAt: new Date(),
          },
        ],
      });

      const populated = await Lead.findById(lead._id)
        .populate('customerId', 'name companyName whatsappPhone')
        .populate('assignedTo', 'name email');

      return sendSuccess(res, populated, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/leads/:id
   */
  async getLeadById(req, res, next) {
    try {
      const lead = await Lead.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      })
        .populate('customerId')
        .populate('assignedTo', 'name email role phone')
        .populate('requestedProducts.productId', 'sku name category defaultSellingPricePaise');

      if (!lead) {
        throw new AppError('Lead enquiry not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, lead);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/leads/:id
   */
  async updateLead(req, res, next) {
    try {
      const lead = await Lead.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!lead) {
        throw new AppError('Lead not found', 404, 'NOT_FOUND');
      }

      Object.assign(lead, req.body);
      lead.lastContactAt = new Date();
      await lead.save();

      return sendSuccess(res, lead);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/leads/:id/notes
   * Append an activity note to the lead's history
   */
  async addNote(req, res, next) {
    try {
      const { text } = req.body;
      const lead = await Lead.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!lead) {
        throw new AppError('Lead not found', 404, 'NOT_FOUND');
      }

      lead.notes.push({
        text,
        authorId: req.user.id,
        authorName: req.user.name,
        createdAt: new Date(),
      });
      lead.lastContactAt = new Date();

      await lead.save();
      return sendSuccess(res, lead.notes);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/leads/:id/assign
   */
  async assignLead(req, res, next) {
    try {
      const { assignedTo } = req.body;

      const user = await User.findOne({
        _id: assignedTo,
        organizationId: req.user.organizationId,
      });
      if (!user) {
        throw new AppError('Assignee user not found in organization', 404, 'USER_NOT_FOUND');
      }

      const lead = await Lead.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });
      if (!lead) {
        throw new AppError('Lead not found', 404, 'NOT_FOUND');
      }

      lead.assignedTo = user._id;
      lead.notes.push({
        text: `Lead reassigned to ${user.name} (${user.role})`,
        authorId: req.user.id,
        authorName: req.user.name,
        createdAt: new Date(),
      });

      await lead.save();
      return sendSuccess(res, lead);
    } catch (error) {
      next(error);
    }
  },
};
