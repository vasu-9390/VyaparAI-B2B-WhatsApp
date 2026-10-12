import mongoose from 'mongoose';

export const QUOTATION_STATUSES = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVISED: 'REVISED',
};

const quotationLineItemSchema = new mongoose.Schema(
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
    unitCostPricePaise: {
      type: Number,
      default: 0,
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
      enum: [0, 5, 12, 18, 28],
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
    lineCostPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const quotationHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
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
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(QUOTATION_STATUSES),
      default: QUOTATION_STATUSES.DRAFT,
      index: true,
    },
    approvalRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvalReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedReason: {
      type: String,
      default: '',
    },
    lineItems: [quotationLineItemSchema],
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
    totalCostPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    overallMarginPercent: {
      type: Number,
      default: 0,
    },
    paymentTerms: {
      type: String,
      default: '30 Days Net from Invoice',
    },
    deliveryTerms: {
      type: String,
      default: 'Ex-Mill Surat / Standard Transport',
    },
    validityDays: {
      type: Number,
      default: 7,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    pdfStorageKey: {
      type: String,
      default: '',
    },
    pdfGeneratedAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    convertedToOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    history: [quotationHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound unique index per organization for quotation numbering & version
quotationSchema.index({ organizationId: 1, quotationNumber: 1, version: 1 }, { unique: true });
quotationSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const Quotation = mongoose.model('Quotation', quotationSchema);
