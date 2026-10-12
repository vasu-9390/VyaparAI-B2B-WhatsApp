import mongoose from 'mongoose';

export const MOVEMENT_TYPES = {
  INITIAL_STOCK: 'INITIAL_STOCK',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  SALE_DEDUCTION: 'SALE_DEDUCTION',
  ORDER_RESERVED: 'ORDER_RESERVED',
  ORDER_RELEASED: 'ORDER_RELEASED',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  RETURN: 'RETURN',
};

const inventoryMovementSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variantSku: {
      type: String,
      default: '',
    },
    movementType: {
      type: String,
      enum: Object.values(MOVEMENT_TYPES),
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    referenceId: {
      type: String,
      default: '',
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable ledger
  }
);

inventoryMovementSchema.index({ organizationId: 1, productId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);
