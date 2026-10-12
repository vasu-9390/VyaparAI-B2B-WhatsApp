import mongoose from 'mongoose';

const customPricingRuleSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    customPricePaise: {
      type: Number,
      min: 0,
      default: null,
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer contact name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    whatsappPhone: {
      type: String,
      required: [true, 'WhatsApp phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Surat' },
      state: { type: String, default: 'Gujarat' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    category: {
      type: String,
      enum: ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER', 'DIRECT'],
      default: 'WHOLESALER',
    },
    creditLimitPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    customPricingRules: [customPricingRuleSchema],
    tags: [{ type: String, trim: true }],
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index ensuring unique phone per organization
customerSchema.index({ organizationId: 1, whatsappPhone: 1 }, { unique: true });

// Text search index for customer directory search
customerSchema.index({ name: 'text', companyName: 'text', whatsappPhone: 'text', email: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
