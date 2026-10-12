import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      enum: ['textiles', 'ceramics', 'hardware', 'pharma', 'general_b2b'],
      default: 'general_b2b',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Surat' },
      state: { type: String, default: 'Gujarat' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    settings: {
      minMarginPercent: {
        type: Number,
        default: 15,
        min: 0,
        max: 100,
      },
      maxDiscountPercentWithoutApproval: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
      quotePrefix: {
        type: String,
        default: 'QT-',
      },
      orderPrefix: {
        type: String,
        default: 'ORD-',
      },
      defaultQuoteValidityDays: {
        type: Number,
        default: 7,
      },
      upiVpa: {
        type: String,
        default: '',
        trim: true,
      },
      autoApproveQuotes: {
        type: Boolean,
        default: false,
      },
    },
    whatsappConfig: {
      phoneNumberId: { type: String, default: '' },
      wabaId: { type: String, default: '' },
      verifyToken: { type: String, default: '' },
      isConnected: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', organizationSchema);
