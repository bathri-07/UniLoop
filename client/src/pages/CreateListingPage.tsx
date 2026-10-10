import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Tag, 
  BookOpen, 
  AlertCircle, 
  Upload, 
  X, 
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { productService } from '../services/productService';

const CATEGORIES = [
  'Textbooks & Notes',
  'Electronics & Calculators',
  'Hostel Essentials',
  'Lab Gear & Coats',
  'Dorm Furniture',
  'Sports Gear',
  'Bicycles & Commute',
  'Maker & Arduino'
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export const CreateListingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pickupLocations, setPickupLocations] = useState<string[]>([
    'Central Library Steps',
    'Student Activity Center (SAC)',
    'Main Canteen / Nescafe Hub',
    'Hostel Gate Foyer'
  ]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<'sell' | 'free'>('sell');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState(CONDITIONS[1]); // Like New
  const [price, setPrice] = useState<number>(350);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(999);
  const [courseCode, setCourseCode] = useState('');
  const [isbn, setIsbn] = useState('');
  const [campusPickupLocation, setCampusPickupLocation] = useState(pickupLocations[0]);

  // Image Management
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Populate user's college approved safe spots if available
    if (user && typeof user.college === 'object' && user.college?.pickupLocations) {
      setPickupLocations(user.college.pickupLocations);
      if (user.college.pickupLocations.length > 0) {
        setCampusPickupLocation(user.college.pickupLocations[0]);
      }
    } else {
      // Fallback query active colleges
      api.get('/colleges')
        .then((res) => {
          if (res.data?.success && res.data.data?.colleges?.length > 0) {
            const defaultCollege = res.data.data.colleges[0];
            if (defaultCollege.pickupLocations?.length > 0) {
              setPickupLocations(defaultCollege.pickupLocations);
              setCampusPickupLocation(defaultCollege.pickupLocations[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (imageUrls.length >= 5) {
      setErrorMsg('Maximum 5 images allowed per listing.');
      return;
    }
    setImageUrls([...imageUrls, newImageUrl.trim()]);
    setNewImageUrl('');
    setErrorMsg(null);
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imageUrls.length + files.length > 5) {
      setErrorMsg('Maximum 5 images allowed per listing.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      const fileArray = Array.from(files);
      const res = await productService.uploadImages(fileArray);
      if (res.success && res.data?.images) {
        setImageUrls([...imageUrls, ...res.data.images]);
      } else {
        setErrorMsg(res.message || 'Image upload failed');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
        'Live Cloudinary upload is currently unavailable without credentials. You can add image URLs directly below.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (imageUrls.length === 0) {
      setErrorMsg('Please provide at least 1 image URL or photo upload.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await productService.createProduct({
        title,
        description,
        listingType,
        category,
        condition,
        price: listingType === 'free' ? 0 : Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        courseCode: courseCode.trim() || undefined,
        isbn: isbn.trim() || undefined,
        images: imageUrls,
        campusPickupLocation
      });

      if (res.success && res.data?.product) {
        navigate(`/products/${res.data.product._id}`);
      } else {
        setErrorMsg(res.message || 'Failed to create product listing');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error creating product listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Student Sign-In Required</h2>
        <p className="text-sm text-slate-400">
          You must be signed in with a verified campus email to list an item on UniLoop.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-brand-emerald text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition-colors mt-2"
        >
          <span>Sign In to Post Item</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1.5 border-b border-border-subtle pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-brand-dark/40 px-2.5 py-1 rounded-full border border-brand-emerald/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Campus Circular Economy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Post an Item to Campus Exchange
        </h1>
        <p className="text-sm text-muted">
          Your listing will be instantly visible to enrolled students at {typeof user.college === 'object' ? user.college.name : 'IIT Bombay'}.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        {/* 1. Listing Type Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Listing Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setListingType('sell');
                if (price === 0) setPrice(350);
              }}
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                listingType === 'sell'
                  ? 'bg-brand-emerald text-slate-950 border-brand-emerald shadow-sm'
                  : 'bg-surface-elevated text-slate-300 border-border-subtle hover:border-border-highlight'
              }`}
            >
              <span>Direct Sale (In INR ₹)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setListingType('free');
                setPrice(0);
              }}
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                listingType === 'free'
                  ? 'bg-brand-emerald text-slate-950 border-brand-emerald shadow-sm'
                  : 'bg-surface-elevated text-slate-300 border-border-subtle hover:border-border-highlight'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Free Pass-Down Giveaway (₹0)</span>
            </button>
          </div>
        </div>

        {/* 2. Title */}
        <div className="space-y-1.5">
          <label htmlFor="product-title" className="text-xs font-semibold text-slate-300">
            Product Title
          </label>
          <input
            id="product-title"
            type="text"
            required
            minLength={3}
            maxLength={100}
            placeholder="e.g. Casio FX-991CW Advanced ClassWiz Calculator"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
          />
        </div>

        {/* 3. Category & Condition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="product-category" className="text-xs font-semibold text-slate-300">
              Category (8 Standard)
            </label>
            <select
              id="product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-surface">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="product-condition" className="text-xs font-semibold text-slate-300">
              Physical Condition
            </label>
            <select
              id="product-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c} className="bg-surface">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="selling-price" className="text-xs font-semibold text-slate-300">
              Selling Price (INR ₹)
            </label>
            <input
              id="selling-price"
              type="number"
              min={0}
              required
              disabled={listingType === 'free'}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors disabled:opacity-50"
            />
            {listingType === 'free' && (
              <p className="text-[11px] text-emerald-400">Fixed at ₹0 for free senior pass-down items.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="original-price" className="text-xs font-semibold text-slate-300">
              Original MRP / Store Price (Optional)
            </label>
            <input
              id="original-price"
              type="number"
              min={0}
              placeholder="e.g. 1395"
              value={originalPrice ?? ''}
              onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
            {originalPrice && originalPrice > price && (
              <p className="text-[11px] text-emerald-400 font-mono">
                Calculated discount: -{Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
              </p>
            )}
          </div>
        </div>

        {/* 5. Academic Details (Course Code & ISBN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="course-code" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-emerald" />
              <span>Course Code (Optional)</span>
            </label>
            <input
              id="course-code"
              type="text"
              maxLength={12}
              placeholder="e.g. CS201, EE101"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition-colors uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="textbook-isbn" className="text-xs font-semibold text-slate-300">
              Textbook ISBN (Optional)
            </label>
            <input
              id="textbook-isbn"
              type="text"
              placeholder="e.g. 9780262033848"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* 6. Designated Campus Safe Pickup Spot */}
        <div className="space-y-1.5">
          <label htmlFor="pickup-location" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Designated Campus Safe Pickup Location</span>
          </label>
          <select
            id="pickup-location"
            value={campusPickupLocation}
            onChange={(e) => setCampusPickupLocation(e.target.value)}
            className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors"
          >
            {pickupLocations.map((loc) => (
              <option key={loc} value={loc} className="bg-surface">
                {loc}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted">
            Campus security recommendation: All exchanges should occur at approved landmark spots.
          </p>
        </div>

        {/* 7. Detailed Description */}
        <div className="space-y-1.5">
          <label htmlFor="product-description" className="text-xs font-semibold text-slate-300">
            Detailed Description
          </label>
          <textarea
            id="product-description"
            required
            rows={4}
            maxLength={1500}
            placeholder="Describe functionality, notes markings, battery status, or inclusion of accessories..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors resize-y"
          />
        </div>

        {/* 8. Image Management */}
        <div className="space-y-3 border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-brand-emerald" />
              <span>Listing Images (1 - 5 Photos)</span>
            </label>
            <span className="text-[11px] text-muted font-mono">{imageUrls.length}/5 photos added</span>
          </div>

          {/* Previews Grid */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle group bg-slate-900">
                  <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-red-400 hover:text-red-300 transition-colors"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Image URL or Upload Local Files */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste direct HTTPS photo URL..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="bg-surface-elevated hover:bg-brand-emerald hover:text-slate-950 text-slate-200 border border-border-subtle px-3 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0"
              >
                Add URL
              </button>
            </div>

            <div className="relative">
              <label className="cursor-pointer bg-surface-input hover:bg-surface-elevated border border-dashed border-border-highlight rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <Upload className="w-4 h-4 text-brand-emerald" />
                <span>{uploading ? 'Uploading to storage...' : 'Upload local photos (JPG/PNG/WebP, max 5MB each)'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 9. Publish Button */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-brand-emerald text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4 focus-ring"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              <span>Publishing Listing...</span>
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Publish Listing to Campus</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
