import mongoose from 'mongoose';

export const PAYMENT_METHODS = {
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  CREDIT: 'CREDIT',
};

export const PAYMENT_RECORD_STATUSES = {
  INITIATED: 'INITIATED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

const paymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    paymentNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: [100, 'Minimum payment amount is 100 paise (₹1.00)'],
    },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.UPI,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_RECORD_STATUSES),
      default: PAYMENT_RECORD_STATUSES.SUCCESS,
      index: true,
    },
    transactionReference: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ organizationId: 1, paymentNumber: 1 }, { unique: true });
paymentSchema.index({ organizationId: 1, orderId: 1 });
paymentSchema.index({ organizationId: 1, customerId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
