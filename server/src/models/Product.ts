import { Schema, model, Document, Types } from 'mongoose';

export type ListingType = 'sell' | 'free';

// 8 Core Categories
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
  reservedRequest?: Types.ObjectId;
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
        validator: function (this: IProduct, val: number) {
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
          validator: (arr: string[]) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 5,
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
    reservedRequest: {
      type: Schema.Types.ObjectId,
      ref: 'BuyRequest'
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
productSchema.index({ reservedRequest: 1 });

export const Product = model<IProduct>('Product', productSchema);
