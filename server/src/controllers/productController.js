import { Product } from '../models/Product.js';
import { InventoryService } from '../services/inventory/inventoryService.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';
import { Money } from '../utils/money.js';

export const ProductController = {
  /**
   * GET /api/products
   * List catalog items with pagination, filtering, and search
   */
  async listProducts(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', category = '', uom = '', minPrice, maxPrice } = req.query;
      const query = { organizationId: req.user.organizationId, isActive: true };

      if (category) {
        query.category = category;
      }
      if (uom) {
        query.uom = uom;
      }
      if (minPrice || maxPrice) {
        query.defaultSellingPricePaise = {};
        if (minPrice) query.defaultSellingPricePaise.$gte = Number(minPrice);
        if (maxPrice) query.defaultSellingPricePaise.$lte = Number(maxPrice);
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ name: regex }, { sku: regex }, { category: regex }, { brand: regex }];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [products, total] = await Promise.all([
        Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Product.countDocuments(query),
      ]);

      // Strip internal costPrice if user is a standard Sales Rep
      const isPrivileged = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'].includes(req.user.role);
      const safeProducts = isPrivileged
        ? products
        : products.map((p) => {
            const obj = p.toObject();
            delete obj.costPricePaise;
            if (obj.variants) {
              obj.variants = obj.variants.map((v) => {
                delete v.costPricePaise;
                return v;
              });
            }
            return obj;
          });

      return sendPaginated(res, safeProducts, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/products
   * Create a new product with optional variants
   */
  async createProduct(req, res, next) {
    try {
      const {
        sku,
        name,
        description,
        category,
        brand,
        uom,
        hsnCode,
        taxRatePercent,
        costPricePaise,
        defaultSellingPricePaise,
        wholesalePricePaise,
        minSellingPricePaise,
        availableQuantity,
        reorderThreshold,
        variants = [],
        images = [],
      } = req.body;

      // Check SKU uniqueness in organization
      const existing = await Product.findOne({
        organizationId: req.user.organizationId,
        sku: sku.toUpperCase(),
      });
      if (existing) {
        throw new AppError(`A product with SKU '${sku}' already exists in your catalog`, 409, 'DUPLICATE_SKU');
      }

      // Check minSellingPrice integrity
      const floorPrice = minSellingPricePaise || costPricePaise;
      if (floorPrice > defaultSellingPricePaise) {
        throw new AppError('Minimum selling price cannot exceed the default selling price', 400, 'INVALID_PRICING');
      }

      // Compute total availableQuantity from variants if provided
      const totalAvailable = variants.length > 0 ? variants.reduce((acc, v) => acc + (v.availableQuantity || 0), 0) : availableQuantity || 0;

      const product = await Product.create({
        organizationId: req.user.organizationId,
        sku: sku.toUpperCase(),
        name,
        description,
        category,
        brand,
        uom,
        hsnCode,
        taxRatePercent,
        costPricePaise: costPricePaise || 0,
        defaultSellingPricePaise,
        wholesalePricePaise: wholesalePricePaise || defaultSellingPricePaise,
        minSellingPricePaise: floorPrice,
        availableQuantity: totalAvailable,
        reorderThreshold: reorderThreshold || 50,
        variants,
        images,
      });

      return sendSuccess(res, product, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/products/:id
   */
  async getProductById(req, res, next) {
    try {
      const product = await Product.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
      }

      const isPrivileged = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'].includes(req.user.role);
      const safeProduct = product.toObject();
      if (!isPrivileged) {
        delete safeProduct.costPricePaise;
        if (safeProduct.variants) {
          safeProduct.variants = safeProduct.variants.map((v) => {
            delete v.costPricePaise;
            return v;
          });
        }
      }

      return sendSuccess(res, safeProduct);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const product = await Product.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
      });

      if (!product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
      }

      Object.assign(product, req.body);
      if (req.body.sku) {
        product.sku = req.body.sku.toUpperCase();
      }

      await product.save();
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/products/:id
   * Soft delete product
   */
  async deleteProduct(req, res, next) {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { isActive: false },
        { new: true }
      );

      if (!product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, { message: 'Product archived successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/products/:id/availability
   */
  async getAvailability(req, res, next) {
    try {
      const { variantSku, quantity = 1 } = req.query;
      const availability = await InventoryService.checkAvailability(
        req.user.organizationId,
        req.params.id,
        variantSku,
        Number(quantity)
      );

      return sendSuccess(res, availability);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/products/:id/adjust-stock
   */
  async adjustStock(req, res, next) {
    try {
      const { variantSku, quantity, movementType, reason } = req.body;
      const result = await InventoryService.adjustStock({
        organizationId: req.user.organizationId,
        productId: req.params.id,
        variantSku,
        quantity,
        movementType,
        reason,
        actor: req.user,
      });

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/products/export-csv
   */
  async exportCsv(req, res, next) {
    try {
      const products = await Product.find({
        organizationId: req.user.organizationId,
        isActive: true,
      });

      const header = 'SKU,Name,Category,UOM,HSN,SellingPriceINR,AvailableQty,ReservedQty\n';
      const rows = products.map((p) => {
        const price = Money.toRupees(p.defaultSellingPricePaise);
        return `"${p.sku}","${p.name}","${p.category}","${p.uom}","${p.hsnCode || ''}",${price},${p.availableQuantity},${p.reservedQuantity}`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products_catalog.csv"');
      return res.status(200).send(header + rows.join('\n'));
    } catch (error) {
      next(error);
    }
  },
};
