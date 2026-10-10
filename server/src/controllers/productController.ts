import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Product, ProductCategory, ProductCondition, ListingType } from '../models/Product';
import { College } from '../models/College';

// Zod Validation Schemas - docs/security.md § 3.1
export const createProductSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100).trim(),
    description: z.string().min(1, 'Description is required').max(1500).trim(),
    listingType: z.enum(['sell', 'free']),
    category: z.enum([
      'Textbooks & Notes',
      'Electronics & Calculators',
      'Hostel Essentials',
      'Lab Gear & Coats',
      'Dorm Furniture',
      'Sports Gear',
      'Bicycles & Commute',
      'Maker & Arduino'
    ]),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair']),
    price: z.number().min(0, 'Price cannot be negative'),
    originalPrice: z.number().min(0).optional(),
    isbn: z
      .string()
      .trim()
      .regex(/^(?:\d{9}[\dX]|\d{13})$/, 'Please provide a valid 10- or 13-digit ISBN')
      .optional()
      .or(z.literal('')),
    courseCode: z.string().max(12).trim().toUpperCase().optional().or(z.literal('')),
    images: z
      .array(z.string().url('Must provide valid image URLs'))
      .min(1, 'At least 1 product image is required')
      .max(5, 'Maximum 5 images allowed'),
    campusPickupLocation: z.string().min(1, 'Pickup location is required').trim()
  })
  .strict();

export const updateProductSchema = z
  .object({
    title: z.string().min(3).max(100).trim().optional(),
    description: z.string().min(1).max(1500).trim().optional(),
    listingType: z.enum(['sell', 'free']).optional(),
    category: z
      .enum([
        'Textbooks & Notes',
        'Electronics & Calculators',
        'Hostel Essentials',
        'Lab Gear & Coats',
        'Dorm Furniture',
        'Sports Gear',
        'Bicycles & Commute',
        'Maker & Arduino'
      ])
      .optional(),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair']).optional(),
    price: z.number().min(0).optional(),
    originalPrice: z.number().min(0).optional(),
    isbn: z
      .string()
      .trim()
      .regex(/^(?:\d{9}[\dX]|\d{13})$/, 'Please provide a valid 10- or 13-digit ISBN')
      .optional()
      .or(z.literal('')),
    courseCode: z.string().max(12).trim().toUpperCase().optional().or(z.literal('')),
    images: z
      .array(z.string().url())
      .min(1)
      .max(5)
      .optional(),
    campusPickupLocation: z.string().min(1).trim().optional()
  })
  .strict();

export const updateStatusSchema = z
  .object({
    status: z.enum(['available', 'paused'])
  })
  .strict();

/**
 * GET /api/v1/products
 * Public browse and search with multi-facet filters.
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      college,
      keyword,
      category,
      listingType,
      condition,
      courseCode,
      isbn,
      status = 'available',
      minPrice,
      maxPrice,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: Record<string, any> = {};

    // 1. College filter
    if (college && typeof college === 'string' && mongoose.Types.ObjectId.isValid(college)) {
      filter.college = new mongoose.Types.ObjectId(college);
    }

    // 2. Status filter (defaults to 'available')
    if (status && typeof status === 'string' && status !== 'all') {
      filter.status = status;
    }

    // 3. Category filter
    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = category;
    }

    // 4. Listing type filter ('sell' vs 'free')
    if (listingType && (listingType === 'sell' || listingType === 'free')) {
      filter.listingType = listingType;
    }

    // 5. Condition filter
    if (condition && typeof condition === 'string' && condition !== 'all') {
      filter.condition = condition;
    }

    // 6. Course code exact/prefix
    if (courseCode && typeof courseCode === 'string') {
      filter.courseCode = new RegExp(`^${courseCode.trim()}`, 'i');
    }

    // 7. ISBN exact match
    if (isbn && typeof isbn === 'string') {
      filter.isbn = isbn.trim();
    }

    // 8. Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // 9. Keyword search (regex match on title, description, courseCode)
    if (keyword && typeof keyword === 'string' && keyword.trim().length > 0) {
      const kw = keyword.trim();
      const regex = new RegExp(kw, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { courseCode: regex }
      ];
    }

    // Sort order
    let sortOption: Record<string, any> = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1, createdAt: -1 };
    else if (sort === 'price_desc') sortOption = { price: -1, createdAt: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('seller', '_id name avatar role college') // Privacy Gate: strictly omit phone & email
        .populate('college', '_id name campusLocation')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/:id
 * Single product detail view with strict seller contact privacy projection.
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid product identifier format'
      });
      return;
    }

    const product = await Product.findById(id)
      .populate('seller', '_id name avatar role college') // Contact Privacy: Zero email/phone leak
      .populate('college', '_id name campusLocation pickupLocations');

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/products
 * Create product listing. Derives college and seller from authenticated user.
 */
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      listingType,
      category,
      condition,
      price,
      originalPrice,
      isbn,
      courseCode,
      images,
      campusPickupLocation
    } = req.body;

    // Free items price rule
    if (listingType === 'free' && price !== 0) {
      res.status(400).json({
        success: false,
        message: 'Price must be 0 for free giveaway items'
      });
      return;
    }

    // Validate campus pickup location against user's college approved spots
    const college = await College.findById(user.college);
    if (!college) {
      res.status(400).json({
        success: false,
        message: 'Enrolled college not found'
      });
      return;
    }

    if (!college.pickupLocations.includes(campusPickupLocation)) {
      res.status(400).json({
        success: false,
        message: `Pickup location '${campusPickupLocation}' is not an approved safe spot for your campus.`
      });
      return;
    }

    // Auto-derive college and seller from authenticated user - AGENTS.md § 3.1
    const product = await Product.create({
      title,
      description,
      listingType,
      category,
      condition,
      price: listingType === 'free' ? 0 : price,
      originalPrice,
      isbn: isbn || undefined,
      courseCode: courseCode || undefined,
      images,
      campusPickupLocation,
      seller: user._id,
      college: user.college,
      status: 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Product listing created successfully',
      data: {
        product
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/products/:id
 * Edit product listing (Owner only).
 */
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid product identifier format'
      });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Ownership check
    if (!product.seller.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this listing'
      });
      return;
    }

    if (product.status === 'sold') {
      res.status(400).json({
        success: false,
        message: 'Cannot edit a sold product'
      });
      return;
    }

    // Validate pickup location if modified
    if (req.body.campusPickupLocation) {
      const college = await College.findById(user.college);
      if (!college || !college.pickupLocations.includes(req.body.campusPickupLocation)) {
        res.status(400).json({
          success: false,
          message: 'Selected pickup location is not approved for your campus.'
        });
        return;
      }
    }

    // Free items price rule
    const finalListingType = req.body.listingType || product.listingType;
    if (finalListingType === 'free') {
      req.body.price = 0;
    }

    Object.assign(product, req.body);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product listing updated successfully',
      data: {
        product
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/products/:id/status
 * Toggle listing between 'available' and 'paused' (Owner only).
 */
export const updateProductStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid product identifier format'
      });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Ownership check
    if (!product.seller.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this listing status'
      });
      return;
    }

    if (product.status === 'sold') {
      res.status(400).json({
        success: false,
        message: 'Cannot toggle status of a sold product'
      });
      return;
    }

    if (product.status === 'reserved' && product.reservedUntil && product.reservedUntil > new Date()) {
      res.status(409).json({
        success: false,
        message: 'Cannot change status of an actively reserved product'
      });
      return;
    }

    product.status = status;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product listing status updated to '${status}'`,
      data: {
        product
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/products/:id
 * Delete listing (Owner only). Blocked when actively reserved.
 */
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid product identifier format'
      });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Ownership check
    if (!product.seller.equals(user._id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this listing'
      });
      return;
    }

    // Active reservation safeguard - AGENTS.md § 3.5 & docs/api.md § 5.6
    if (product.status === 'reserved' && product.reservedUntil && product.reservedUntil > new Date()) {
      res.status(409).json({
        success: false,
        message: 'Cannot delete an actively reserved product. Wait for 48-hour hold to expire or cancel reservation.'
      });
      return;
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/me/listings
 * Get all listings created by the authenticated student.
 */
export const getMyListings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    const listings = await Product.find({ seller: user._id })
      .populate('college', 'name campusLocation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        listings
      }
    });
  } catch (error) {
    next(error);
  }
};
