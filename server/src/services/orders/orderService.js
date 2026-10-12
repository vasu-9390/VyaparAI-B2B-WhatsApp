import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '../../models/Order.js';
import { Payment, PAYMENT_METHODS, PAYMENT_RECORD_STATUSES } from '../../models/Payment.js';
import { Quotation, QUOTATION_STATUSES } from '../../models/Quotation.js';
import { Organization } from '../../models/Organization.js';
import { Customer } from '../../models/Customer.js';
import { InventoryService } from '../inventory/inventoryService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

export const OrderService = {
  /**
   * Convert an approved or accepted quotation into a confirmed sales order idempotently
   */
  async convertQuotationToOrder({ organizationId, quotationId, actor = null, shippingAddress = null, deliveryNotes = '' }) {
    const quotation = await Quotation.findOne({ _id: quotationId, organizationId });
    if (!quotation) {
      throw new AppError('Quotation not found in organization', 404, 'QUOTATION_NOT_FOUND');
    }

    // Idempotency: Return existing order if already converted
    if (quotation.convertedToOrderId) {
      const existingOrder = await Order.findOne({ _id: quotation.convertedToOrderId, organizationId });
      if (existingOrder) {
        logger.info(`Quotation ${quotation.quotationNumber} already converted to Order ${existingOrder.orderNumber}`);
        return existingOrder;
      }
    }

    // Require manager approval check
    if (quotation.status === QUOTATION_STATUSES.PENDING_APPROVAL) {
      throw new AppError('Quotation is pending manager approval and cannot be converted to order', 400, 'APPROVAL_PENDING');
    }
    if (quotation.status === QUOTATION_STATUSES.REJECTED || quotation.status === QUOTATION_STATUSES.EXPIRED) {
      throw new AppError(`Cannot convert ${quotation.status} quotation to an order`, 400, 'INVALID_QUOTATION_STATUS');
    }

    const organization = await Organization.findById(organizationId);
    const year = new Date().getFullYear();
    const orderCount = await Order.countDocuments({ organizationId });
    const prefix = organization?.settings?.orderPrefix || 'ORD-';
    const orderNumber = `${prefix}${year}-${String(orderCount + 1).padStart(4, '0')}`;

    // Map line items directly from snapshot
    const lineItems = quotation.lineItems.map((item) => ({
      productId: item.productId,
      variantSku: item.variantSku || '',
      productName: item.productName,
      sku: item.sku,
      hsnCode: item.hsnCode || '',
      uom: item.uom || 'meter',
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      discountPercent: item.discountPercent || 0,
      discountAmountPaise: item.discountAmountPaise || 0,
      taxRatePercent: item.taxRatePercent || 12,
      taxAmountPaise: item.taxAmountPaise || 0,
      lineTotalPaise: item.lineTotalPaise,
    }));

    // Deduct stock for each line item (atomic concurrency protection)
    for (const item of lineItems) {
      await InventoryService.deductStock({
        organizationId,
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        referenceId: orderNumber,
        actor,
      });
    }

    const order = await Order.create({
      organizationId,
      customerId: quotation.customerId,
      quotationId: quotation._id,
      orderNumber,
      status: ORDER_STATUSES.CONFIRMED,
      paymentStatus: PAYMENT_STATUSES.PENDING,
      lineItems,
      subtotalPaise: quotation.subtotalPaise,
      discountTotalPaise: quotation.discountTotalPaise,
      taxTotalPaise: quotation.taxTotalPaise,
      shippingPaise: quotation.shippingPaise,
      grandTotalPaise: quotation.grandTotalPaise,
      amountPaidPaise: 0,
      dueAmountPaise: quotation.grandTotalPaise,
      shippingAddress: shippingAddress || {
        street: '',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '',
        country: 'India',
      },
      deliveryNotes,
      confirmedAt: new Date(),
      history: [
        {
          action: 'CONVERTED_FROM_QUOTATION',
          actorId: actor ? actor.id : null,
          actorName: actor ? actor.name : 'System',
          note: `Converted from quotation ${quotation.quotationNumber}`,
          timestamp: new Date(),
        },
      ],
    });

    // Update quotation status
    quotation.status = QUOTATION_STATUSES.ACCEPTED;
    quotation.acceptedAt = new Date();
    quotation.convertedToOrderId = order._id;
    quotation.history.push({
      action: 'CONVERTED_TO_ORDER',
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
      note: `Converted to order ${order.orderNumber}`,
      timestamp: new Date(),
    });
    await quotation.save();

    logger.info(`Successfully created order ${order.orderNumber} from quote ${quotation.quotationNumber}`);
    return order;
  },

  /**
   * List orders with filtering and pagination
   */
  async getOrders({ organizationId, query = {} }) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { organizationId };

    if (query.status) {
      filter.status = query.status.toUpperCase();
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus.toUpperCase();
    }
    if (query.customerId) {
      filter.customerId = query.customerId;
    }
    if (query.search) {
      filter.orderNumber = { $regex: query.search.trim(), $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name companyName whatsappPhone gstin')
        .populate('quotationId', 'quotationNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get single order by ID
   */
  async getOrderById({ organizationId, orderId }) {
    const order = await Order.findOne({ _id: orderId, organizationId })
      .populate('customerId', 'name companyName whatsappPhone gstin email creditLimitPaise currentOutstandingPaise')
      .populate('quotationId', 'quotationNumber status version grandTotalPaise');

    if (!order) {
      throw new AppError('Order not found in organization', 404, 'ORDER_NOT_FOUND');
    }

    return order;
  },

  /**
   * Update order status with inventory rollback if cancelled
   */
  async updateOrderStatus({ organizationId, orderId, status, cancelReason = '', actor = null }) {
    const order = await Order.findOne({ _id: orderId, organizationId });
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    const targetStatus = status.toUpperCase();
    if (!Object.values(ORDER_STATUSES).includes(targetStatus)) {
      throw new AppError(`Invalid order status '${status}'`, 400, 'INVALID_STATUS');
    }

    if (order.status === ORDER_STATUSES.CANCELLED) {
      throw new AppError('Cannot update status of an already cancelled order', 400, 'ORDER_ALREADY_CANCELLED');
    }

    // If cancelling, restore inventory
    if (targetStatus === ORDER_STATUSES.CANCELLED) {
      for (const item of order.lineItems) {
        await InventoryService.restoreStock({
          organizationId,
          productId: item.productId,
          variantSku: item.variantSku,
          quantity: item.quantity,
          referenceId: order.orderNumber,
          actor,
        });
      }
      order.cancelledAt = new Date();
      order.cancelReason = cancelReason || 'Order cancelled by user';
    } else if (targetStatus === ORDER_STATUSES.SHIPPED) {
      order.shippedAt = new Date();
    } else if (targetStatus === ORDER_STATUSES.DELIVERED) {
      order.deliveredAt = new Date();
    }

    order.status = targetStatus;
    order.history.push({
      action: `STATUS_CHANGE_TO_${targetStatus}`,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
      note: cancelReason ? `Status changed to ${targetStatus}: ${cancelReason}` : `Status changed to ${targetStatus}`,
      timestamp: new Date(),
    });

    await order.save();
    return order;
  },

  /**
   * Record a verified payment against an order
   */
  async recordPayment({ organizationId, orderId, amountPaise, method = 'UPI', transactionReference = '', notes = '', actor = null }) {
    const order = await Order.findOne({ _id: orderId, organizationId });
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === ORDER_STATUSES.CANCELLED) {
      throw new AppError('Cannot record payment against a cancelled order', 400, 'ORDER_CANCELLED');
    }

    const numAmountPaise = parseInt(amountPaise, 10);
    if (!numAmountPaise || numAmountPaise < 100) {
      throw new AppError('Payment amount must be at least ₹1.00 (100 paise)', 400, 'INVALID_AMOUNT');
    }

    const year = new Date().getFullYear();
    const count = await Payment.countDocuments({ organizationId });
    const paymentNumber = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;

    const payment = await Payment.create({
      organizationId,
      orderId: order._id,
      customerId: order.customerId,
      paymentNumber,
      amountPaise: numAmountPaise,
      method: (method || 'UPI').toUpperCase(),
      status: PAYMENT_RECORD_STATUSES.SUCCESS,
      transactionReference: transactionReference.trim(),
      notes,
      verifiedBy: actor ? actor.id : null,
      verifiedAt: new Date(),
    });

    // Update order paid amount and due amount
    order.amountPaidPaise = (order.amountPaidPaise || 0) + numAmountPaise;
    order.dueAmountPaise = Math.max(0, order.grandTotalPaise - order.amountPaidPaise);

    if (order.dueAmountPaise === 0) {
      order.paymentStatus = PAYMENT_STATUSES.PAID;
    } else {
      order.paymentStatus = PAYMENT_STATUSES.PARTIALLY_PAID;
    }

    order.history.push({
      action: 'PAYMENT_RECORDED',
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
      note: `Payment ${payment.paymentNumber} received: ₹${(numAmountPaise / 100).toFixed(2)} (${payment.method}${transactionReference ? `, Ref: ${transactionReference}` : ''})`,
      timestamp: new Date(),
    });

    await order.save();

    // Optionally update customer outstanding
    await Customer.updateOne(
      { _id: order.customerId, organizationId },
      { $inc: { currentOutstandingPaise: -numAmountPaise } }
    );

    return { order, payment };
  },

  /**
   * Get payments recorded for an order
   */
  async getOrderPayments({ organizationId, orderId }) {
    const payments = await Payment.find({ organizationId, orderId })
      .populate('verifiedBy', 'name email role')
      .sort({ createdAt: -1 });

    return payments;
  },
};
