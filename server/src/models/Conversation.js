import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
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
    whatsappPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'WAITING_AI', 'HUMAN_TAKEOVER', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    latestAiIntent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ organizationId: 1, whatsappPhone: 1 }, { unique: true });
conversationSchema.index({ organizationId: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
