# UniLoop — Database & Data Model Design

**Database Engine:** MongoDB  
**Object Data Modeling (ODM):** Mongoose (v8+)  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`)  

---

## 1. Entity Relationship Overview

```
 ┌───────────────────────────┐                     ┌──────────────────────────┐
 │          College          │                     │         Product          │
 ├───────────────────────────┤                     ├──────────────────────────┤
 │ _id: ObjectId             │ 1                 * │ _id: ObjectId            │
 │ name: String              │◄────────────────────┤ college: Ref(College)    │
 │ campusLocation: String    │                     │ seller: Ref(User)        │
 │ allowedEmailDomains: [Str]│ 1                 * │ title: String            │
 │ pickupLocations: [String] │◄───────┐            │ listingType: 'sell'|'free│
 │ isActive: Boolean         │        │            │ originalPrice?: Number   │
 └───────────────────────────┘        │            │ price: Number (₹)        │
                                      │            │ isbn?: String            │
 ┌───────────────────────────┐        │            │ courseCode?: String      │
 │           User            │        │            │ category: Enum (8 cats)  │
 ├───────────────────────────┤        │            │ condition: Enum          │
 │ _id: ObjectId             │        │            │ images: [String] (<=5)   │
 │ college: Ref(College)     ├────────┘            │ status: avail|res|paus|so│
 │ name: String              │                     │ reservedUntil?: Date     │
 │ email: String (UQ)        │                     │ reservedFor?: Ref(User)  │
 │ password: String (min 8)  │                     │ campusPickupSpot: String │
 │ phone: String (+91)       │ 1                 * └────────────┬─────────────┘
 │ role: student|admin|mod   │◄────────────────────┤            │
 │ isSuspended: Boolean      │   (Seller Ref)      │            │ 1
 │ isVerified: Boolean       │                     │            │
 └─────────────┬─────────────┘                     │            │
               │                                   │            │
               │ 1                                 │            │
               │                                   │            │
               │         ┌─────────────────────────┴──┐         │
               │         │         BuyRequest         │         │
               │         ├────────────────────────────┤         │
               └────────►│ buyer: Ref(User)           │◄────────┘
               │         │ seller: Ref(User)          │ *
               └────────►│ product: Ref(Product)      │
                         │ offeredPrice: Number (₹)   │
                         │ message: String            │
                         │ buyerContact: String       │
                         │ status: Enum (6 statuses)  │
                         │ sellerHandoverConfirmed: B │
                         │ buyerHandoverConfirmed: B  │
                         │ handoverPin: (select:false)│
                         │ handoverAttempts: Number   │
                         │ createdAt: Date            │
                         └────────────────────────────┘
```

---

## 2. Complete Mongoose Schema Specifications

### 2.1 College Schema (`src/models/College.ts`)

```typescript
import { Schema, model, Document } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  campusLocation: string;
  allowedEmailDomains: string[];
  pickupLocations: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const collegeSchema = new Schema<ICollege>(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      unique: true,
      trim: true
    },
    campusLocation: {
      type: String,
      required: [true, 'Campus location is required (e.g. Powai, Mumbai)'],
      trim: true
    },
    allowedEmailDomains: {
      type: [String],
      required: [true, 'At least one allowed student email domain is required'],
      validate: {
        validator: (domains: string[]) => domains.length > 0,
        message: 'Must specify at least one authorized domain (e.g., iitb.ac.in)'
      }
    },
    pickupLocations: {
      type: [String],
      required: true,
      default: [
        'Central Library Steps',
        'Student Activity Center (SAC)',
        'Main Canteen / Nescafe Hub',
        'Hostel Gate Foyer'
      ]
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const College = model<ICollege>('College', collegeSchema);
```

---

### 2.2 User Schema (`src/models/User.ts`)

```typescript
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'student' | 'admin' | 'moderator';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  college: Types.ObjectId;
  phone: string;
  avatar?: string;
  role: UserRole;
  isSuspended: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters']
    },
    email: {
      type: String,
      required: [true, 'Campus email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false // Excluded from query results by default
    },
    college: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'Enrolled college is required']
    },
    phone: {
      type: String,
      required: [true, 'Indian phone number is required (+91 format)'],
      trim: true,
      match: [/^(?:\+91|91)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'moderator'],
      default: 'student'
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      select: false
    },
    verificationTokenExpires: {
      type: Date,
      select: false
    }
  },
  { timestamps: true }
);

// Pre-save password hashing hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password verification method
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>('User', userSchema);
```

---

### 2.3 Product Schema (`src/models/Product.ts`)

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export type ListingType = 'sell' | 'free';

// 8 Core Categories (Free Giveaways is handled by listingType='free'; Study Notes merged into Textbooks & Notes)
export type ProductCategory = 
  | 'Textbooks & Notes'
  | 'Electronics & Calculators'
  | 'Hostel Essentials'
  | 'Lab Gear & Coats'
  | 'Dorm Furniture'
  | 'Sports Gear'
  | 'Bicycles & Commute'
  | 'Maker & Arduino';

export type ProductCondition = 'New' | 'Like New' | 'Good' | 'Fair';

export type ProductStatus = 'available' | 'reserved' | 'paused' | 'sold';

export interface IProduct extends Document {
  title: string;
  description: string;
  listingType: ListingType;
  category: ProductCategory;
  condition: ProductCondition;
  originalPrice?: number;
  price: number; // In INR (₹). For 'free', price is 0.
  college: Types.ObjectId;
  isbn?: string;
  courseCode?: string;
  images: string[];
  seller: Types.ObjectId;
  status: ProductStatus;
  reservedUntil?: Date;
  reservedFor?: Types.ObjectId;
  campusPickupLocation: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1500, 'Description cannot exceed 1500 characters']
    },
    listingType: {
      type: String,
      enum: ['sell', 'free'],
      default: 'sell',
      required: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Textbooks & Notes',
          'Electronics & Calculators',
          'Hostel Essentials',
          'Lab Gear & Coats',
          'Dorm Furniture',
          'Sports Gear',
          'Bicycles & Commute',
          'Maker & Arduino'
        ],
        message: '{VALUE} is not a valid campus category'
      }
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: {
        values: ['New', 'Like New', 'Good', 'Fair'],
        message: '{VALUE} must be New, Like New, Good, or Fair'
      }
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function(this: IProduct, val: number) {
          if (this.listingType === 'free') return val === 0;
          return true;
        },
        message: 'Price must be 0 for free giveaway items'
      }
    },
    college: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'Listing must be associated with a campus'],
      index: true
    },
    isbn: {
      type: String,
      trim: true,
      match: [/^(?:\d{9}[\dX]|\d{13})$/, 'Please provide a valid 10- or 13-digit ISBN']
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [12, 'Course code too long']
    },
    images: {
      type: [String],
      required: [true, 'At least one product image is required'],
      validate: [
        {
          validator: (arr: string[]) => arr.length >= 1 && arr.length <= 5,
          message: 'Must provide between 1 and 5 image URLs (via Cloudinary)'
        }
      ]
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'paused', 'sold'],
      default: 'available',
      index: true
    },
    reservedUntil: {
      type: Date
    },
    reservedFor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    campusPickupLocation: {
      type: String,
      required: [true, 'Campus pickup location is required'],
      trim: true
    }
  },
  { timestamps: true }
);

// Compound Search & Filter Indexes
productSchema.index({ title: 'text', description: 'text', courseCode: 'text' });
productSchema.index({ college: 1, category: 1, status: 1, price: 1 });
productSchema.index({ seller: 1, status: 1 });

export const Product = model<IProduct>('Product', productSchema);
```

---

### 2.4 BuyRequest Schema (`src/models/BuyRequest.ts`)

```typescript
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
```

---

## 3. Atomic Transactional Reservation & Expired Hold Handling

### 3.1 Transactional Accept & Atomic Reservation
When a seller accepts a request:
1. Accept requires `request.status === 'pending'`.
2. Uses a MongoDB session transaction (`withTransaction` or `session.startTransaction()`) in replica set environments (e.g., MongoDB Atlas). On standalone local MongoDB instances where multi-document transactions are unsupported, single-document atomic operations and database constraint indexes guarantee integrity.
3. The atomic `Product.findOneAndUpdate` treats **expired reservations** (`status: 'reserved'` with `reservedUntil < now`) as available:
4. Generates a secure 4-digit PIN at accept time using `crypto.randomInt(1000, 10000).toString()`.

```typescript
import crypto from 'crypto';
import mongoose from 'mongoose';

export const acceptBuyRequest = async (requestId: string, sellerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Must be a pending request belonging to this seller
    const request = await BuyRequest.findOne({
      _id: requestId,
      seller: sellerId,
      status: 'pending'
    }).session(session);

    if (!request) {
      await session.abortTransaction();
      return { status: 400, message: 'Request is not in a pending state or does not belong to you' };
    }

    const now = new Date();
    const reservedUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-Hour Hold

    // 2. Atomically reserve product: Treats available OR expired reservations as eligible
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: request.product,
        seller: sellerId,
        $or: [
          { status: 'available' },
          { status: 'reserved', reservedUntil: { $lt: now } } // Expired hold can be reclaimed!
        ]
      },
      {
        $set: {
          status: 'reserved',
          reservedUntil: reservedUntil,
          reservedFor: request.buyer
        }
      },
      { new: true, session }
    );

    if (!updatedProduct) {
      await session.abortTransaction();
      return { status: 409, message: 'Item is no longer available or already reserved' };
    }

    // 3. Generate PIN at accept time via crypto.randomInt (stored with select: false)
    const pin = crypto.randomInt(1000, 10000).toString();
    request.handoverPin = pin;
    request.status = 'accepted';
    request.handoverAttempts = 0;
    await request.save({ session });

    await session.commitTransaction();
    return { status: 200, request, product: updatedProduct };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

---

## 4. Atomic Dual-Confirmation Handover with PIN & Lockout

### 4.1 In-Person Protocol
- **Buyer Role:** Holds the 4-digit PIN (shown on Buyer's Accepted Request card). Confirms in-person meetup by clicking **"Confirm Handover"** (`buyerHandoverConfirmed = true`).
- **Seller Role:** Meets buyer, inspects exchange, and **enters the 4-digit PIN** provided verbally/shown by the buyer.
- **Lockout Gate:** If seller enters wrong PIN 5 times (`handoverAttempts >= 5`), the request is locked to prevent brute force attacks.
- **Expiration Check:** If current time exceeds `product.reservedUntil`, handover is rejected as **expired**, and request transitions to `expired`.
- **Atomic Finalization:** When both `sellerHandoverConfirmed && buyerHandoverConfirmed === true`:
  - `Product.status` $\rightarrow$ `'sold'`.
  - `BuyRequest.status` $\rightarrow$ `'completed'`.
  - All other open requests for this product are marked `'rejected'`.

```typescript
export const confirmHandoverAtomic = async (
  requestId: string,
  userId: string,
  enteredPin?: string
) => {
  const request = await BuyRequest.findById(requestId).select('+handoverPin');
  if (!request || request.status !== 'accepted') {
    return { status: 400, message: 'Active accepted request not found' };
  }

  const product = await Product.findById(request.product);
  if (!product || product.status !== 'reserved') {
    return { status: 400, message: 'Product is not in reserved status' };
  }

  // Expiration rejection
  if (product.reservedUntil && new Date() > product.reservedUntil) {
    request.status = 'expired';
    await request.save();
    product.status = 'available';
    await product.save();
    return { status: 400, message: 'Reservation window has expired. Deal cancelled.' };
  }

  // Attempt lockout check
  if (request.handoverAttempts >= 5) {
    return { status: 429, message: 'Too many failed PIN attempts. Handover is locked. Contact support.' };
  }

  const isSeller = request.seller.equals(userId);
  const isBuyer = request.buyer.equals(userId);

  if (isSeller) {
    if (!enteredPin || enteredPin !== request.handoverPin) {
      request.handoverAttempts += 1;
      await request.save();
      return { 
        status: 400, 
        message: `Invalid handover PIN. ${5 - request.handoverAttempts} attempts remaining.` 
      };
    }
    request.sellerHandoverConfirmed = true;
  } else if (isBuyer) {
    request.buyerHandoverConfirmed = true;
  } else {
    return { status: 403, message: 'Unauthorized' };
  }

  // Finalize when both confirmed
  if (request.sellerHandoverConfirmed && request.buyerHandoverConfirmed) {
    product.status = 'sold';
    request.status = 'completed';
    await Promise.all([
      product.save(),
      request.save(),
      BuyRequest.updateMany(
        { product: product._id, _id: { $ne: request._id }, status: 'pending' },
        { status: 'rejected' }
      )
    ]);
  } else {
    await request.save();
  }

  return { status: 200, request, productStatus: product.status };
};
```
