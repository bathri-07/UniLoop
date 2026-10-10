import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  MapPin, 
  Tag, 
  BookOpen, 
  AlertCircle, 
  Upload, 
  X, 
  Sparkles,
  ArrowLeft,
  Image as ImageIcon
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
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'
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
      setErrorMsg('Maximum 5 images allowed per listing');
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
      setErrorMsg('Maximum 5 images allowed per listing');
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
      // Reset input
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
          Sign In to Post Item ↗
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
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1.5 border-b border-border-subtle pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-brand-dark/40 px-2.5 py-1 rounded-full border border-brand-emerald/30">
          <Sparkles className="w-3.5 h-3.5" />
          Campus Circular Economy
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
        {/* Listing Type Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Listing Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setListingType('sell');
                if (price === 0) setPrice(350);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                listingType === 'sell'
                  ? 'bg-brand-emerald text-slate-950 border-brand-emerald shadow-sm'
                  : 'bg-surface-elevated text-slate-300 border-border-subtle hover:border-border-highlight'
              }`}
            >
              Direct Sale (In INR ₹)
            </button>
            <button
              type="button"
              onClick={() => {
                setListingType('free');
                setPrice(0);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                listingType === 'free'
                  ? 'bg-brand-emerald text-slate-950 border-brand-emerald shadow-sm'
                  : 'bg-surface-elevated text-slate-300 border-border-subtle hover:border-border-highlight'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Free Pass-Down Giveaway (₹0)
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Product Title</label>
          <input
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

        {/* Category & Condition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Category (8 Standard)</label>
            <select
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
            <label className="text-xs font-semibold text-slate-300">Physical Condition</label>
            <select
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

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Selling Price (INR ₹)
            </label>
            <input
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
            <label className="text-xs font-semibold text-slate-300">
              Original MRP / Store Price (Optional)
            </label>
            <input
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

        {/* Academic Details (Course Code & ISBN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-emerald" />
              Course Code (Optional)
            </label>
            <input
              type="text"
              maxLength={12}
              placeholder="e.g. CS201, EE101"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition-colors uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Textbook ISBN (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 9780262033848"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Designated Campus Safe Pickup Spot */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-emerald" />
            Designated Campus Safe Pickup Location
          </label>
          <select
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

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Detailed Description</label>
          <textarea
            required
            rows={4}
            maxLength={1500}
            placeholder="Describe functionality, notes markings, battery status, or inclusion of accessories..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors resize-y"
          />
        </div>

        {/* Image Management */}
        <div className="space-y-3 border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-brand-emerald" />
              Listing Images (1 - 5 Images)
            </label>
            <span className="text-[11px] text-muted font-mono">{imageUrls.length}/5 images added</span>
          </div>

          {/* Image Previews */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle group bg-slate-900">
                  <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Image URL or Upload File */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste direct HTTPS image URL..."
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

            {/* File Upload Option */}
            <div className="relative">
              <label className="cursor-pointer bg-surface-input hover:bg-surface-elevated border border-dashed border-border-highlight rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <Upload className="w-4 h-4 text-brand-emerald" />
                <span>{uploading ? 'Uploading to Cloudinary...' : 'Upload local photos (JPG/PNG/WebP, max 5MB)'}</span>
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-brand-emerald text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
        >
          {submitting ? (
            'Publishing Listing...'
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Publish Listing to Campus
            </>
          )}
        </button>
      </form>
    </div>
  );
};
