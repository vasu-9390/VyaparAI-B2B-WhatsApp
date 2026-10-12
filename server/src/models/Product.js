import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    attributes: {
      color: { type: String, default: '' },
      size: { type: String, default: '' },
      material: { type: String, default: '' },
      grade: { type: String, default: '' },
    },
    costPricePaise: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sellingPricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    uom: {
      type: String,
      enum: ['meter', 'piece', 'roll', 'box', 'kg', 'set'],
      default: 'meter',
    },
    hsnCode: {
      type: String,
      trim: true,
      default: '',
    },
    taxRatePercent: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 12,
    },
    // Financial values in integer minor currency units (Paise)
    costPricePaise: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    defaultSellingPricePaise: {
      type: Number,
      required: [true, 'Default selling price is required'],
      min: 0,
    },
    wholesalePricePaise: {
      type: Number,
      min: 0,
      default: function () {
        return this ? this.defaultSellingPricePaise : 0;
      },
    },
    minSellingPricePaise: {
      type: Number,
      required: true,
      min: 0,
      default: function () {
        return this ? this.costPricePaise : 0;
      },
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderThreshold: {
      type: Number,
      default: 50,
      min: 0,
    },
    variants: [variantSchema],
    images: [{ type: String }],
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

// Compound index guaranteeing SKU uniqueness per organization
productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

// Text search index for fast product and category catalog search
productSchema.index({ name: 'text', category: 'text', brand: 'text', description: 'text', sku: 'text' });

// Virtual to calculate total effective unreserved stock
productSchema.virtual('netAvailableQuantity').get(function () {
  return Math.max(0, this.availableQuantity - this.reservedQuantity);
});

export const Product = mongoose.model('Product', productSchema);
