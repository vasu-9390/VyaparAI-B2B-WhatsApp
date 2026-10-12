import { OrderService } from '../services/orders/orderService.js';
import { AuditLog } from '../models/AuditLog.js';

export const OrderController = {
  /**
   * POST /api/orders/from-quotation/:quotationId
   * Convert accepted quotation to order
   */
  async convertFromQuotation(req, res, next) {
    try {
      const { quotationId } = req.params;
      const { shippingAddress, deliveryNotes } = req.body;
      const organizationId = req.organizationId;
      const user = req.user;

      const order = await OrderService.convertQuotationToOrder({
        organizationId,
        quotationId,
        actor: user,
        shippingAddress,
        deliveryNotes,
      });

      await AuditLog.create({
        organizationId,
        actorId: user._id,
        actorEmail: user.email,
        action: 'ORDER_CONVERTED',
        entityType: 'Order',
        entityId: order._id.toString(),
        changes: { orderNumber: order.orderNumber, grandTotalPaise: order.grandTotalPaise },
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: `Order ${order.orderNumber} successfully created`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/orders
   * List orders with filtering
   */
  async getOrders(req, res, next) {
    try {
      const result = await OrderService.getOrders({
        organizationId: req.organizationId,
        query: req.query,
      });

      res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/orders/:id
   * Get order detail
   */
  async getOrderById(req, res, next) {
    try {
      const order = await OrderService.getOrderById({
        organizationId: req.organizationId,
        orderId: req.params.id,
      });

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/orders/:id/status
   * Update order lifecycle status
   */
  async updateStatus(req, res, next) {
    try {
      const { status, cancelReason } = req.body;
      const order = await OrderService.updateOrderStatus({
        organizationId: req.organizationId,
        orderId: req.params.id,
        status,
        cancelReason,
        actor: req.user,
      });

      res.status(200).json({
        success: true,
        message: `Order ${order.orderNumber} status updated to ${order.status}`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/orders/:id/payments
   * Record payment against an order
   */
  async recordPayment(req, res, next) {
    try {
      const { amountPaise, method, transactionReference, notes } = req.body;
      const result = await OrderService.recordPayment({
        organizationId: req.organizationId,
        orderId: req.params.id,
        amountPaise,
        method,
        transactionReference,
        notes,
        actor: req.user,
      });

      await AuditLog.create({
        organizationId: req.organizationId,
        actorId: req.user._id,
        actorEmail: req.user.email,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: result.payment._id.toString(),
        changes: {
          paymentNumber: result.payment.paymentNumber,
          amountPaise: result.payment.amountPaise,
          method: result.payment.method,
        },
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: `Payment of ₹${(result.payment.amountPaise / 100).toFixed(2)} recorded successfully`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/orders/:id/payments
   * Get payments for an order
   */
  async getOrderPayments(req, res, next) {
    try {
      const payments = await OrderService.getOrderPayments({
        organizationId: req.organizationId,
        orderId: req.params.id,
      });

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (err) {
      next(err);
    }
  },
};
