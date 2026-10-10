import { Schema, model, Document, Types } from 'mongoose';

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'expired';

export interface IBuyRequest extends Document {
  product: Types.ObjectId;
  buyer: Types.ObjectId;
  seller: Types.ObjectId;
  offeredPrice: number; // In INR (₹)
  message: string;
  buyerContact: string;
  status: RequestStatus;
  sellerHandoverConfirmed: boolean;
  buyerHandoverConfirmed: boolean;
  handoverPin?: string; // 4-digit PIN generated at ACCEPT time (select: false)
  handoverAttempts: number; // Locked after 5 failed attempts
  createdAt: Date;
  updatedAt: Date;
}

const buyRequestSchema = new Schema<IBuyRequest>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    offeredPrice: {
      type: Number,
      required: [true, 'Offered price is required'],
      min: [0, 'Offered price cannot be negative']
    },
    message: {
      type: String,
      trim: true,
      default: 'Hi, I would like to reserve and collect this item on campus.'
    },
    buyerContact: {
      type: String,
      required: [true, 'Indian contact number or campus room details required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired'],
      default: 'pending',
      index: true
    },
    sellerHandoverConfirmed: {
      type: Boolean,
      default: false
    },
    buyerHandoverConfirmed: {
      type: Boolean,
      default: false
    },
    handoverPin: {
      type: String,
      select: false // NEVER returned by default; revealed ONLY to buyer upon request acceptance
    },
    handoverAttempts: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// CRITICAL PARTIAL UNIQUE INDEX:
// Prevents duplicate active requests by the same buyer on the same product
buyRequestSchema.index(
  { product: 1, buyer: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'accepted'] } }
  }
);

buyRequestSchema.index({ seller: 1, status: 1 });

export const BuyRequest = model<IBuyRequest>('BuyRequest', buyRequestSchema);
