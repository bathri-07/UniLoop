import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { BuyRequest, IBuyRequest } from '../models/BuyRequest';
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
 * Zod validation schema for PATCH /api/v1/requests/:id/status
 */
export const updateRequestStatusSchema = z
  .object({
    status: z.enum(['accepted', 'rejected', 'cancelled'], {
      errorMap: () => ({ message: "Status must be 'accepted', 'rejected', or 'cancelled'" })
    })
  })
  .strict();

/**
 * Reconciles the reservation state of a product against its owning BuyRequest.
 * Safely recovers interrupted reservations where Write 1 succeeded on Product
 * but Write 2 on BuyRequest was interrupted or failed (e.g. process crash).
 */
export const reconcileProductReservation = async (
  productId: string | mongoose.Types.ObjectId
): Promise<void> => {
  const product = await Product.findById(productId);
  if (!product || product.status !== 'reserved') return;

  const now = new Date();

  // 1. If reservation window has expired, release back to available
  if (product.reservedUntil && product.reservedUntil < now) {
    if (product.reservedRequest) {
      await BuyRequest.findByIdAndUpdate(product.reservedRequest, {
        $set: { status: 'expired' }
      });
    }
    await Product.findOneAndUpdate(
      { _id: product._id, status: 'reserved', reservedUntil: { $lt: now } },
      {
        $set: {
          status: 'available',
          reservedUntil: null,
          reservedFor: null,
          reservedRequest: null
        }
      }
    );
    return;
  }

  // 2. Interrupted reservation recovery:
  // If product is marked 'reserved', but reservedRequest is missing or not 'accepted'
  if (!product.reservedRequest) {
    await Product.findOneAndUpdate(
      { _id: product._id, status: 'reserved', reservedRequest: null },
      {
        $set: {
          status: 'available',
          reservedUntil: null,
          reservedFor: null,
          reservedRequest: null
        }
      }
    );
    return;
  }

  const owningRequest = await BuyRequest.findById(product.reservedRequest);

  // If owning request doesn't exist, or is NOT 'accepted' (e.g. remained 'pending'
  // due to a process crash before Write 2, or was cancelled/rejected),
  // then the product reservation is orphaned and must be recovered to 'available'
  if (!owningRequest || owningRequest.status !== 'accepted') {
    await Product.findOneAndUpdate(
      { _id: product._id, reservedRequest: product.reservedRequest, status: 'reserved' },
      {
        $set: {
          status: 'available',
          reservedUntil: null,
          reservedFor: null,
          reservedRequest: null
        }
      }
    );
  }
};

/**
 * Synchronous/lazy reconciliation helper for expired product reservations and requests.
 * Evaluates whether an accepted request's reservation hold has passed its 48-hour window.
 */
export const reconcileRequestExpiry = async (
  requestId: string | mongoose.Types.ObjectId
): Promise<void> => {
  const reqDoc = await BuyRequest.findById(requestId);
  if (!reqDoc) return;

  if (reqDoc.status === 'accepted') {
    const prod = await Product.findById(reqDoc.product);
    const now = new Date();
    if (!prod) return;

    const isExpired =
      (prod.status === 'reserved' && prod.reservedUntil && prod.reservedUntil < now) ||
      (prod.status === 'available') ||
      (prod.reservedRequest && !prod.reservedRequest.equals(reqDoc._id));

    if (isExpired) {
      await BuyRequest.findByIdAndUpdate(reqDoc._id, { $set: { status: 'expired' } });
      if (
        prod.status === 'reserved' &&
        prod.reservedRequest &&
        prod.reservedRequest.equals(reqDoc._id) &&
        prod.reservedUntil &&
        prod.reservedUntil < now
      ) {
        await Product.findOneAndUpdate(
          { _id: prod._id, reservedRequest: reqDoc._id, status: 'reserved' },
          {
            $set: {
              status: 'available',
              reservedUntil: null,
              reservedFor: null,
              reservedRequest: null
            }
          }
        );
      }
    }
  }

  // Also reconcile product's reservation state
  await reconcileProductReservation(reqDoc.product);
};

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

/**
 * Seller accepts a pending purchase request.
 * Atomically reserves the product for exactly 48 hours using conditional update on Product.
 */
export const acceptRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const buyRequest = await BuyRequest.findById(id);
    if (!buyRequest) {
      res.status(404).json({
        success: false,
        message: 'Purchase request not found'
      });
      return;
    }

    // 1. Seller Ownership Guard
    if (!buyRequest.seller.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to accept this request.'
      });
      return;
    }

    // 2. Status Transition Guard: Only pending requests can be accepted
    if (buyRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot accept a request with status '${buyRequest.status}'.`
      });
      return;
    }

    // Reconcile any prior expired or interrupted orphaned hold
    await reconcileProductReservation(buyRequest.product);

    // 3. Product Existence & Ineligibility Checks
    const product = await Product.findById(buyRequest.product);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    if (product.status === 'sold') {
      res.status(400).json({
        success: false,
        message: 'Cannot accept request for a sold listing.'
      });
      return;
    }

    if (product.status === 'paused') {
      res.status(400).json({
        success: false,
        message: 'Cannot accept request for a paused listing.'
      });
      return;
    }

    // 4. Conditional Atomic Product Update (Write 1 — Concurrency Anchor)
    // Treats available OR expired reservations as claimable.
    const now = new Date();
    const RESERVATION_WINDOW_MS = 48 * 60 * 60 * 1000; // Exactly 48 hours
    const reservedUntil = new Date(now.getTime() + RESERVATION_WINDOW_MS);

    const claimedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        seller: user._id,
        $or: [
          { status: 'available' },
          { status: 'reserved', reservedUntil: { $lt: now } },
          { status: 'reserved', reservedRequest: buyRequest._id } // Idempotent retry recovery
        ]
      },
      {
        $set: {
          status: 'reserved',
          reservedUntil,
          reservedFor: buyRequest.buyer,
          reservedRequest: buyRequest._id
        }
      },
      { new: true }
    );

    if (!claimedProduct) {
      res.status(409).json({
        success: false,
        message: 'Item is no longer available or already reserved'
      });
      return;
    }

    // If product previously had an expired reservation from another request,
    // transition that prior request to 'expired'
    if (
      product.status === 'reserved' &&
      product.reservedRequest &&
      !product.reservedRequest.equals(buyRequest._id)
    ) {
      await BuyRequest.findByIdAndUpdate(product.reservedRequest, {
        $set: { status: 'expired' }
      });
    }

    // 5. Request Status Update (Write 2)
    let updatedRequest;
    try {
      updatedRequest = await BuyRequest.findOneAndUpdate(
        {
          _id: buyRequest._id,
          status: 'pending'
        },
        {
          $set: { status: 'accepted' }
        },
        { new: true }
      );

      if (!updatedRequest) {
        // Concurrently modified / cancelled: rollback product claim
        await Product.findOneAndUpdate(
          { _id: product._id, reservedRequest: buyRequest._id },
          {
            $set: {
              status: 'available',
              reservedUntil: null,
              reservedFor: null,
              reservedRequest: null
            }
          }
        );
        res.status(409).json({
          success: false,
          message: 'Request is no longer pending.'
        });
        return;
      }
    } catch (writeErr) {
      // Reconcile on Write 2 failure: rollback product reservation
      await Product.findOneAndUpdate(
        { _id: product._id, reservedRequest: buyRequest._id },
        {
          $set: {
            status: 'available',
            reservedUntil: null,
            reservedFor: null,
            reservedRequest: null
          }
        }
      );
      throw writeErr;
    }

    res.status(200).json({
      success: true,
      message: 'Request accepted. Item is now reserved for 48 hours.',
      data: {
        requestId: updatedRequest._id,
        status: 'accepted',
        reservedUntil: claimedProduct.reservedUntil,
        request: updatedRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller rejects a pending purchase request.
 */
export const rejectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const buyRequest = await BuyRequest.findById(id);
    if (!buyRequest) {
      res.status(404).json({
        success: false,
        message: 'Purchase request not found'
      });
      return;
    }

    // 1. Seller Ownership Guard
    if (!buyRequest.seller.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this request.'
      });
      return;
    }

    // 2. Status Transition Guard: Only pending requests can be rejected
    if (buyRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot reject a request with status '${buyRequest.status}'.`
      });
      return;
    }

    // Conditional atomic update on BuyRequest to prevent concurrent transition races
    const updatedRequest = await BuyRequest.findOneAndUpdate(
      { _id: buyRequest._id, status: 'pending' },
      { $set: { status: 'rejected' } },
      { new: true }
    );

    if (!updatedRequest) {
      res.status(409).json({
        success: false,
        message: 'Request is no longer pending.'
      });
      return;
    }

    // Defensive: ONLY release product reservation if THIS request held it
    await Product.findOneAndUpdate(
      { _id: buyRequest.product, reservedRequest: buyRequest._id, status: 'reserved' },
      {
        $set: {
          status: 'available',
          reservedUntil: null,
          reservedFor: null,
          reservedRequest: null
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Purchase request has been rejected.',
      data: {
        requestId: updatedRequest._id,
        status: 'rejected',
        request: updatedRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer cancels their own eligible pending request.
 */
export const cancelRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const buyRequest = await BuyRequest.findById(id);
    if (!buyRequest) {
      res.status(404).json({
        success: false,
        message: 'Purchase request not found'
      });
      return;
    }

    // 1. Buyer Ownership Guard
    if (!buyRequest.buyer.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this request.'
      });
      return;
    }

    // 2. Status Transition Guard: Can only cancel pending or accepted requests
    if (buyRequest.status !== 'pending' && buyRequest.status !== 'accepted') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel a request with status '${buyRequest.status}'.`
      });
      return;
    }

    // Conditional atomic update on BuyRequest to prevent concurrent transition races
    const updatedRequest = await BuyRequest.findOneAndUpdate(
      { _id: buyRequest._id, status: { $in: ['pending', 'accepted'] } },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!updatedRequest) {
      res.status(409).json({
        success: false,
        message: 'Request is no longer eligible for cancellation.'
      });
      return;
    }

    // Defensive: ONLY release product reservation if THIS request held it
    await Product.findOneAndUpdate(
      { _id: buyRequest.product, reservedRequest: buyRequest._id, status: 'reserved' },
      {
        $set: {
          status: 'available',
          reservedUntil: null,
          reservedFor: null,
          reservedRequest: null
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Purchase request has been cancelled.',
      data: {
        requestId: updatedRequest._id,
        status: 'cancelled',
        request: updatedRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/requests/:id/status
 * Unified status transition dispatcher based on body status:
 * - 'accepted' -> acceptRequest
 * - 'rejected' -> rejectRequest
 * - 'cancelled' -> cancelRequest
 */
export const updateRequestStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { status } = req.body;
  if (status === 'accepted') {
    return acceptRequest(req, res, next);
  } else if (status === 'rejected') {
    return rejectRequest(req, res, next);
  } else if (status === 'cancelled') {
    return cancelRequest(req, res, next);
  } else {
    res.status(400).json({
      success: false,
      message: `Invalid target status '${status}'. Must be 'accepted', 'rejected', or 'cancelled'.`
    });
  }
};

/**
 * GET /api/v1/requests/incoming
 * Returns incoming purchase requests for listings owned by the authenticated seller.
 */
export const getIncomingRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const requests = await BuyRequest.find({ seller: user._id })
      .populate('product', 'title price images campusPickupLocation status reservedUntil')
      .populate('buyer', 'name avatar role college')
      .sort({ createdAt: -1 });

    // Reconcile expiry on accepted items
    for (const r of requests) {
      if (r.status === 'accepted') {
        await reconcileRequestExpiry(r._id);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        requests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/requests/outgoing
 * Returns outgoing purchase requests submitted by the authenticated buyer.
 */
export const getOutgoingRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const requests = await BuyRequest.find({ buyer: user._id })
      .populate('product', 'title price images campusPickupLocation status reservedUntil')
      .populate('seller', 'name avatar role college')
      .sort({ createdAt: -1 });

    // Reconcile expiry on accepted items
    for (const r of requests) {
      if (r.status === 'accepted') {
        await reconcileRequestExpiry(r._id);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        requests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/requests/:id
 * Returns a specific buy request by ID (must be buyer or seller).
 */
export const getRequestById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    await reconcileRequestExpiry(id);

    const buyRequest = await BuyRequest.findById(id)
      .populate('product', 'title price images campusPickupLocation status reservedUntil')
      .populate('seller', 'name avatar role college')
      .populate('buyer', 'name avatar role college');

    if (!buyRequest) {
      res.status(404).json({
        success: false,
        message: 'Purchase request not found'
      });
      return;
    }

    // Access check: only buyer or seller can view request
    const buyerId = (buyRequest.buyer as any)._id || buyRequest.buyer;
    const sellerId = (buyRequest.seller as any)._id || buyRequest.seller;
    if (!user._id.equals(buyerId) && !user._id.equals(sellerId)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to view this request'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        request: buyRequest
      }
    });
  } catch (error) {
    next(error);
  }
};
