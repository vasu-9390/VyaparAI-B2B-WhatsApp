import mongoose from 'mongoose';

export const ORDER_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

const orderLineItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantSku: {
      type: String,
      default: '',
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    hsnCode: {
      type: String,
      default: '',
    },
    uom: {
      type: String,
      default: 'meter',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRatePercent: {
      type: Number,
      default: 12,
    },
    taxAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotalPaise: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const orderHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.CONFIRMED,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
      index: true,
    },
    lineItems: [orderLineItemSchema],
    subtotalPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotalPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxTotalPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotalPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaidPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmountPaise: {
      type: Number,
      default: function () {
        return this && this.grandTotalPaise != null
          ? Math.max(0, this.grandTotalPaise - (this.amountPaidPaise || 0))
          : 0;
      },
      min: 0,
    },
    shippingAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    confirmedAt: {
      type: Date,
      default: Date.now,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: '',
    },
    history: [orderHistorySchema],
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ organizationId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
orderSchema.index({ organizationId: 1, paymentStatus: 1 });

export const Order = mongoose.model('Order', orderSchema);
