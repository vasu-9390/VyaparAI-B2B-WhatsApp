import mongoose from 'mongoose';

export const LEAD_STATUSES = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUOTATION_SENT: 'QUOTATION_SENT',
  NEGOTIATING: 'NEGOTIATING',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
};

const leadRequestedProductSchema = new mongoose.Schema(
  {
    query: { type: String, trim: true, default: '' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    quantity: { type: Number, min: 1, default: 1 },
    estimatedBudgetPaise: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const leadNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Sales Rep' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
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
    source: {
      type: String,
      enum: ['WHATSAPP', 'REFERRAL', 'DIRECT_CALL', 'TRADE_SHOW', 'WEBSITE'],
      default: 'WHATSAPP',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(LEAD_STATUSES),
      default: LEAD_STATUSES.NEW,
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    requestedProducts: [leadRequestedProductSchema],
    notes: [leadNoteSchema],
    tags: [{ type: String, trim: true }],
    lastContactAt: { type: Date, default: Date.now },
    followUpDate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ organizationId: 1, status: 1, followUpDate: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
