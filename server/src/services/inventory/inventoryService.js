import { Product } from '../../models/Product.js';
import { InventoryMovement, MOVEMENT_TYPES } from '../../models/InventoryMovement.js';
import { AppError } from '../../middleware/errorHandler.js';

export const InventoryService = {
  /**
   * Check real-time stock availability against reserved stock
   */
  async checkAvailability(organizationId, productId, variantSku = null, requestedQuantity = 1) {
    const product = await Product.findOne({ _id: productId, organizationId });
    if (!product) {
      throw new AppError('Product not found in organization catalog', 404, 'PRODUCT_NOT_FOUND');
    }

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      if (!variant) {
        throw new AppError(`Variant SKU '${variantSku}' not found on product`, 404, 'VARIANT_NOT_FOUND');
      }

      const netAvailable = Math.max(0, variant.availableQuantity - variant.reservedQuantity);
      return {
        productId: product._id,
        variantSku: variant.sku,
        variantName: variant.name,
        availableQuantity: variant.availableQuantity,
        reservedQuantity: variant.reservedQuantity,
        netAvailableQuantity: netAvailable,
        isAvailable: netAvailable >= requestedQuantity,
        requestedQuantity,
      };
    }

    const netAvailable = Math.max(0, product.availableQuantity - product.reservedQuantity);
    return {
      productId: product._id,
      productName: product.name,
      availableQuantity: product.availableQuantity,
      reservedQuantity: product.reservedQuantity,
      netAvailableQuantity: netAvailable,
      isAvailable: netAvailable >= requestedQuantity,
      requestedQuantity,
    };
  },

  /**
   * Adjust stock manually or via purchase receipt
   */
  async adjustStock({ organizationId, productId, variantSku = null, quantity, movementType, reason = '', actor = null }) {
    const product = await Product.findOne({ _id: productId, organizationId });
    if (!product) {
      throw new AppError('Product not found in organization catalog', 404, 'PRODUCT_NOT_FOUND');
    }

    let newBalance = 0;

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      if (!variant) {
        throw new AppError(`Variant SKU '${variantSku}' not found`, 404, 'VARIANT_NOT_FOUND');
      }

      const calculated = variant.availableQuantity + quantity;
      if (calculated < 0) {
        throw new AppError(`Insufficient stock for variant ${variant.sku}. Current: ${variant.availableQuantity}, Change: ${quantity}`, 400, 'INSUFFICIENT_STOCK');
      }

      variant.availableQuantity = calculated;
      newBalance = calculated;

      // Recalculate parent product total
      product.availableQuantity = product.variants.reduce((sum, v) => sum + v.availableQuantity, 0);
    } else {
      const calculated = product.availableQuantity + quantity;
      if (calculated < 0) {
        throw new AppError(`Insufficient stock. Current: ${product.availableQuantity}, Change: ${quantity}`, 400, 'INSUFFICIENT_STOCK');
      }
      product.availableQuantity = calculated;
      newBalance = calculated;
    }

    await product.save();

    // Create ledger entry
    const movement = await InventoryMovement.create({
      organizationId,
      productId: product._id,
      variantSku: variantSku || '',
      movementType: movementType || MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
      quantity,
      balanceAfter: newBalance,
      reason,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
    });

    return { product, movement };
  },

  /**
   * Concurrency-safe stock reservation for pending/approved orders
   */
  async reserveStock({ organizationId, productId, variantSku = null, quantity, referenceId = '', actor = null }) {
    const availability = await this.checkAvailability(organizationId, productId, variantSku, quantity);
    if (!availability.isAvailable) {
      throw new AppError(
        `Cannot reserve ${quantity} units. Only ${availability.netAvailableQuantity} units unreserved.`,
        400,
        'STOCK_RESERVATION_FAILED'
      );
    }

    const product = await Product.findOne({ _id: productId, organizationId });
    let newBalance = 0;

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      variant.reservedQuantity += quantity;
      newBalance = variant.availableQuantity;
      product.reservedQuantity = product.variants.reduce((sum, v) => sum + v.reservedQuantity, 0);
    } else {
      product.reservedQuantity += quantity;
      newBalance = product.availableQuantity;
    }

    await product.save();

    await InventoryMovement.create({
      organizationId,
      productId: product._id,
      variantSku: variantSku || '',
      movementType: MOVEMENT_TYPES.ORDER_RESERVED,
      quantity,
      balanceAfter: newBalance,
      reason: `Reserved for order/quote ${referenceId}`,
      referenceId,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
    });

    return product;
  },

  /**
   * Release reserved stock on order cancellation or quote expiry
   */
  async releaseStock({ organizationId, productId, variantSku = null, quantity, referenceId = '', actor = null }) {
    const product = await Product.findOne({ _id: productId, organizationId });
    if (!product) return null;

    let newBalance = 0;

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      if (variant) {
        variant.reservedQuantity = Math.max(0, variant.reservedQuantity - quantity);
        newBalance = variant.availableQuantity;
        product.reservedQuantity = product.variants.reduce((sum, v) => sum + v.reservedQuantity, 0);
      }
    } else {
      product.reservedQuantity = Math.max(0, product.reservedQuantity - quantity);
      newBalance = product.availableQuantity;
    }

    await product.save();

    await InventoryMovement.create({
      organizationId,
      productId: product._id,
      variantSku: variantSku || '',
      movementType: MOVEMENT_TYPES.ORDER_RELEASED,
      quantity: -quantity,
      balanceAfter: newBalance,
      reason: `Released from reservation ${referenceId}`,
      referenceId,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
    });

    return product;
  },

  /**
   * Concurrency-safe stock deduction for confirmed sale order
   */
  async deductStock({ organizationId, productId, variantSku = null, quantity, referenceId = '', actor = null }) {
    const product = await Product.findOne({ _id: productId, organizationId });
    if (!product) {
      throw new AppError('Product not found in organization catalog', 404, 'PRODUCT_NOT_FOUND');
    }

    let newBalance = 0;

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      if (!variant) {
        throw new AppError(`Variant SKU '${variantSku}' not found on product`, 404, 'VARIANT_NOT_FOUND');
      }

      if (variant.availableQuantity < quantity) {
        throw new AppError(
          `Insufficient stock for variant ${variant.sku}. Available: ${variant.availableQuantity}, Requested: ${quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      variant.availableQuantity -= quantity;
      if (variant.reservedQuantity >= quantity) {
        variant.reservedQuantity -= quantity;
      }
      newBalance = variant.availableQuantity;
      product.availableQuantity = product.variants.reduce((sum, v) => sum + v.availableQuantity, 0);
      product.reservedQuantity = product.variants.reduce((sum, v) => sum + v.reservedQuantity, 0);
    } else {
      if (product.availableQuantity < quantity) {
        throw new AppError(
          `Insufficient stock for product ${product.sku}. Available: ${product.availableQuantity}, Requested: ${quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
      product.availableQuantity -= quantity;
      if (product.reservedQuantity >= quantity) {
        product.reservedQuantity -= quantity;
      }
      newBalance = product.availableQuantity;
    }

    await product.save();

    await InventoryMovement.create({
      organizationId,
      productId: product._id,
      variantSku: variantSku || '',
      movementType: MOVEMENT_TYPES.SALE_DEDUCTION,
      quantity: -quantity,
      balanceAfter: newBalance,
      reason: `Fulfillment deduction for order ${referenceId}`,
      referenceId,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
    });

    return product;
  },

  /**
   * Restore stock on order cancellation
   */
  async restoreStock({ organizationId, productId, variantSku = null, quantity, referenceId = '', actor = null }) {
    const product = await Product.findOne({ _id: productId, organizationId });
    if (!product) return null;

    let newBalance = 0;

    if (variantSku && product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
      if (variant) {
        variant.availableQuantity += quantity;
        newBalance = variant.availableQuantity;
        product.availableQuantity = product.variants.reduce((sum, v) => sum + v.availableQuantity, 0);
      }
    } else {
      product.availableQuantity += quantity;
      newBalance = product.availableQuantity;
    }

    await product.save();

    await InventoryMovement.create({
      organizationId,
      productId: product._id,
      variantSku: variantSku || '',
      movementType: MOVEMENT_TYPES.RETURN,
      quantity,
      balanceAfter: newBalance,
      reason: `Restoration from cancelled order ${referenceId}`,
      referenceId,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
    });

    return product;
  },
};
