import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { BuyRequest } from '../models/BuyRequest';
import { Product } from '../models/Product';

/**
 * Zod validation schema for POST /api/v1/requests
 * Uses .strict() to reject undeclared payload properties per AGENTS.md § 2.3 & docs/security.md § 3.1
 */
export const createBuyRequestSchema = z
  .object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid product ID format'
      }),
    offeredPrice: z
      .number({ invalid_type_error: 'Offered price must be a number' })
      .min(0, 'Offered price cannot be negative')
      .optional(),
    message: z
      .string()
      .trim()
      .max(500, 'Message cannot exceed 500 characters')
      .optional(),
    buyerContact: z
      .string()
      .trim()
      .max(100, 'Contact information cannot exceed 100 characters')
      .optional()
  })
  .strict();

/**
 * POST /api/v1/requests
 * Create a new purchase request for an eligible listing.
 * Authenticated & verified student only.
 */
export const createBuyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const {
      productId,
      offeredPrice: customPrice,
      message: customMessage,
      buyerContact: customContact
    } = req.body;

    // 1. Fetch target product listing
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // 2. Reject buyer requesting their own product
    if (product.seller.equals(user._id)) {
      res.status(400).json({
        success: false,
        message: 'You cannot submit a purchase request for your own listing.'
      });
      return;
    }

    // 3. Same-College Guard (AGENTS.md § 3.1 & docs/api.md § 7.1)
    if (!user.college.equals(product.college)) {
      res.status(403).json({
        success: false,
        message: 'Cross-campus requests are not permitted.'
      });
      return;
    }

    // 4. Product eligibility checks
    if (product.status === 'paused') {
      res.status(400).json({
        success: false,
        message: 'This product listing is paused and cannot receive requests.'
      });
      return;
    }

    if (product.status === 'sold') {
      res.status(400).json({
        success: false,
        message: 'This product has already been sold.'
      });
      return;
    }

    if (product.status === 'reserved') {
      const isHoldActive = product.reservedUntil && product.reservedUntil.getTime() > Date.now();
      if (isHoldActive) {
        res.status(400).json({
          success: false,
          message: 'This product is currently reserved by another buyer.'
        });
        return;
      }
    } else if (product.status !== 'available') {
      res.status(400).json({
        success: false,
        message: 'This product is not eligible for purchase requests.'
      });
      return;
    }

    // 5. Active duplicate request check (pending or accepted)
    const existingActiveRequest = await BuyRequest.findOne({
      product: product._id,
      buyer: user._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingActiveRequest) {
      res.status(409).json({
        success: false,
        message: 'You already have an active purchase request for this product.'
      });
      return;
    }

    // 6. Default fields if not specified in client payload
    const offeredPrice = customPrice !== undefined ? customPrice : product.price;
    const message =
      customMessage && customMessage.trim().length > 0
        ? customMessage.trim()
        : 'Hi, I would like to reserve and collect this item on campus.';
    const buyerContact =
      customContact && customContact.trim().length > 0
        ? customContact.trim()
        : user.phone;

    // 7. Atomic insert protected by partial unique index
    const buyRequest = await BuyRequest.create({
      product: product._id,
      buyer: user._id,
      seller: product.seller,
      offeredPrice,
      message,
      buyerContact,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Purchase request submitted successfully',
      data: {
        request: buyRequest
      }
    });
  } catch (error: any) {
    // Catch database-level partial unique index collisions (E11000) for concurrency safety
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'You already have an active purchase request for this product.'
      });
      return;
    }
    next(error);
  }
};
