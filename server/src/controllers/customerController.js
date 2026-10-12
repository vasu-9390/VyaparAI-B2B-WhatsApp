import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const CustomerController = {
  /**
   * GET /api/customers
   */
  async listCustomers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', category = '', tag = '' } = req.query;
      const query = { organizationId: req.user.organizationId, isActive: true };

      if (category) query.category = category;
      if (tag) query.tags = tag;

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ name: regex }, { companyName: regex }, { whatsappPhone: regex }, { email: regex }];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [customers, total] = await Promise.all([
        Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Customer.countDocuments(query),
      ]);

      return sendPaginated(res, customers, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/customers
   */
  async createCustomer(req, res, next) {
    try {
      const {
        name,
        companyName,
        whatsappPhone,
        email,
        gstin,
        address,
        category,
        creditLimitPaise,
        creditDays,
        customPricingRules = [],
        tags = [],
        notes = '',
      } = req.body;

      // Ensure WhatsApp phone number uniqueness within this organization
      const existing = await Customer.findOne({
        organizationId: req.user.organizationId,
        whatsappPhone: whatsappPhone.trim(),
      });
      if (existing) {
        throw new AppError(
          `A customer with phone '${whatsappPhone}' already exists in your account (${existing.companyName})`,
          409,
          'DUPLICATE_PHONE'
        );
      }

      const customer = await Customer.create({
        organizationId: req.user.organizationId,
        name,
        companyName,
        whatsappPhone: whatsappPhone.trim(),
        email: email || '',
        gstin: gstin || '',
        address,
        category,
        creditLimitPaise: creditLimitPaise || 0,
        creditDays: creditDays || 30,
        customPricingRules,
        tags,
        notes,
      });

      return sendSuccess(res, customer, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/customers/:id
   */
  async getCustomerById(req, res, next) {
    try {
      const customer = await Customer.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      }).populate('customPricingRules.productId', 'sku name category defaultSellingPricePaise');

      if (!customer) {
        throw new AppError('Customer not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/customers/:id
   */
  async updateCustomer(req, res, next) {
    try {
      const customer = await Customer.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!customer) {
        throw new AppError('Customer not found', 404, 'NOT_FOUND');
      }

      Object.assign(customer, req.body);
      await customer.save();

      return sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/customers/:id
   */
  async deleteCustomer(req, res, next) {
    try {
      const customer = await Customer.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { isActive: false },
        { new: true }
      );

      if (!customer) {
        throw new AppError('Customer not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, { message: 'Customer archived successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/customers/:id/pricing/:productId
   * Determine customer-specific negotiated price or discount
   */
  async getPricingForProduct(req, res, next) {
    try {
      const customer = await Customer.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });
      if (!customer) {
        throw new AppError('Customer not found', 404, 'NOT_FOUND');
      }

      const product = await Product.findOne({
        _id: req.params.productId,
        organizationId: req.user.organizationId,
      });
      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Check if custom rule exists
      const rule = customer.customPricingRules.find(
        (r) => r.productId.toString() === product._id.toString()
      );

      let effectivePricePaise = product.defaultSellingPricePaise;
      let appliedDiscountPercent = 0;
      let isSpecialPricing = false;

      if (rule) {
        isSpecialPricing = true;
        if (rule.customPricePaise !== null && rule.customPricePaise !== undefined) {
          effectivePricePaise = rule.customPricePaise;
        } else if (rule.discountPercent) {
          appliedDiscountPercent = rule.discountPercent;
          const discountAmt = Math.round((product.defaultSellingPricePaise * rule.discountPercent) / 100);
          effectivePricePaise = product.defaultSellingPricePaise - discountAmt;
        }
      }

      return sendSuccess(res, {
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        catalogPricePaise: product.defaultSellingPricePaise,
        minSellingPricePaise: product.minSellingPricePaise,
        effectivePricePaise,
        appliedDiscountPercent,
        isSpecialPricing,
        creditLimitPaise: customer.creditLimitPaise,
        creditDays: customer.creditDays,
      });
    } catch (error) {
      next(error);
    }
  },
};
