import { api } from './api';

export interface ProductItem {
  _id: string;
  title: string;
  description: string;
  listingType: 'sell' | 'free';
  category:
    | 'Textbooks & Notes'
    | 'Electronics & Calculators'
    | 'Hostel Essentials'
    | 'Lab Gear & Coats'
    | 'Dorm Furniture'
    | 'Sports Gear'
    | 'Bicycles & Commute'
    | 'Maker & Arduino';
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  price: number;
  originalPrice?: number;
  courseCode?: string;
  isbn?: string;
  images: string[];
  status: 'available' | 'reserved' | 'paused' | 'sold';
  reservedUntil?: string;
  campusPickupLocation: string;
  seller: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
    college: string;
  };
  college: {
    _id: string;
    name: string;
    campusLocation: string;
    pickupLocations?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilterParams {
  college?: string;
  keyword?: string;
  category?: string;
  listingType?: 'sell' | 'free' | 'all';
  condition?: string;
  courseCode?: string;
  isbn?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export const productService = {
  // Get all products with filters
  getProducts: async (params: ProductFilterParams = {}) => {
    const query = new URLSearchParams();

    if (params.college) query.append('college', params.college);
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.listingType && params.listingType !== 'all') query.append('listingType', params.listingType);
    if (params.condition && params.condition !== 'all') query.append('condition', params.condition);
    if (params.courseCode) query.append('courseCode', params.courseCode);
    if (params.isbn) query.append('isbn', params.isbn);
    if (params.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await api.get(`/products?${query.toString()}`);
    return res.data;
  },

  // Get single product details
  getProductById: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  // Create product
  createProduct: async (payload: {
    title: string;
    description: string;
    listingType: 'sell' | 'free';
    category: string;
    condition: string;
    price: number;
    originalPrice?: number;
    isbn?: string;
    courseCode?: string;
    images: string[];
    campusPickupLocation: string;
  }) => {
    const res = await api.post('/products', payload);
    return res.data;
  },

  // Update product
  updateProduct: async (id: string, payload: Partial<ProductItem>) => {
    const res = await api.put(`/products/${id}`, payload);
    return res.data;
  },

  // Toggle status
  updateStatus: async (id: string, status: 'available' | 'paused') => {
    const res = await api.patch(`/products/${id}/status`, { status });
    return res.data;
  },

  // Delete product
  deleteProduct: async (id: string) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },

  // Upload images
  uploadImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    const res = await api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};
