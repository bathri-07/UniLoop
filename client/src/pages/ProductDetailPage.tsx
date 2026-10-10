import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Tag, 
  ArrowLeft, 
  Calendar, 
  BookOpen, 
  UserCheck, 
  Lock, 
  AlertCircle,
  Pause,
  Play,
  Trash2,
  Sparkles
} from 'lucide-react';
import { productService, ProductItem } from '../services/productService';
import { useAuth } from '../context/AuthContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchProduct = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProductById(id);
      if (res.success && res.data?.product) {
        setProduct(res.data.product);
      } else {
        setError(res.message || 'Product not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const isOwner = user && product && product.seller?._id === user._id;

  const handleToggleStatus = async () => {
    if (!product) return;
    const nextStatus = product.status === 'available' ? 'paused' : 'available';
    setActionLoading(true);
    try {
      const res = await productService.updateStatus(product._id, nextStatus);
      if (res.success) {
        setProduct({ ...product, status: nextStatus });
      } else {
        alert(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    setActionLoading(true);
    try {
      const res = await productService.deleteProduct(product._id);
      if (res.success) {
        alert('Listing deleted successfully');
        navigate('/marketplace');
      } else {
        alert(res.message || 'Failed to delete listing');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete listing');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <span className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-sm">Loading product details...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Product Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This listing may have been deleted or expired.'}</p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 bg-brand-emerald text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition-colors mt-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>

      {/* Main Grid: Gallery on left, Info on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-border-subtle shadow-xl">
            <img
              src={product.images[activeImageIndex] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {/* Condition Pill */}
            <span className="absolute top-4 left-4 bg-canvas/80 backdrop-blur-md text-emerald-400 text-xs px-3 py-1 rounded-full font-medium border border-border-subtle">
              Condition: {product.condition}
            </span>

            {/* Status Pill */}
            <span
              className={`absolute top-4 right-4 text-xs px-3 py-1 rounded-full font-bold shadow-md ${
                product.status === 'available'
                  ? 'bg-emerald-500/90 text-slate-950'
                  : product.status === 'reserved'
                  ? 'bg-amber-500/90 text-slate-950'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {product.status.toUpperCase()}
            </span>
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImageIndex === idx
                      ? 'border-brand-emerald ring-2 ring-emerald-500/20'
                      : 'border-border-subtle opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description Section */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-3 shadow-md">
            <h3 className="font-bold text-white text-base">Listing Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>

        {/* Right Column: Listing Details & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-7 space-y-6 shadow-xl">
            {/* Title & Category */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-400 bg-surface-elevated px-2.5 py-1 rounded-lg border border-border-subtle">
                {product.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Price Presentation */}
            <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted block">Campus Exchange Price</span>
                {product.listingType === 'free' ? (
                  <span className="text-2xl font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <Tag className="w-5 h-5" /> FREE GIVEAWAY (₹0)
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-extrabold text-white">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-slate-500 line-through">
                        MRP ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {discountPercent && (
                <div className="text-right">
                  <span className="bg-red-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    {discountPercent}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Academic & Pickup Details */}
            <div className="space-y-3 text-xs border-y border-border-subtle py-4">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-brand-emerald" /> Designated Safe Pickup Spot:
                </span>
                <span className="font-semibold text-white text-right">
                  {product.campusPickupLocation}
                </span>
              </div>

              {product.courseCode && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen className="w-4 h-4 text-brand-emerald" /> Academic Course Code:
                  </span>
                  <span className="font-mono bg-surface-elevated px-2 py-0.5 rounded text-emerald-300 border border-border-subtle font-bold">
                    {product.courseCode}
                  </span>
                </div>
              )}

              {product.isbn && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Textbook ISBN:</span>
                  <span className="font-mono text-slate-200">{product.isbn}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-4 h-4 text-brand-emerald" /> Listed Date:
                </span>
                <span className="text-slate-300">
                  {new Date(product.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Seller Profile Card (Contact Privacy Enforced) */}
            <div className="bg-surface-elevated/40 border border-border-subtle rounded-xl p-4 space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Seller Verified Identity
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-highlight flex items-center justify-center text-sm text-white font-bold">
                  {product.seller.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {product.seller.name}
                    <UserCheck className="w-3.5 h-3.5 text-brand-emerald" />
                  </h4>
                  <span className="text-xs text-muted">
                    {product.college.name} • {product.seller.role}
                  </span>
                </div>
              </div>

              {/* Privacy Shield Notice */}
              <div className="bg-canvas/60 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-slate-400 border border-border-subtle">
                <Lock className="w-3.5 h-3.5 text-brand-emerald shrink-0 mt-0.5" />
                <span>
                  Seller phone and WhatsApp contact are securely masked and revealed only when your purchase request is accepted.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {isOwner ? (
                <div className="space-y-2.5">
                  <span className="text-xs text-amber-400 font-medium block text-center">
                    You are the seller of this listing
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleToggleStatus}
                      className="bg-surface-elevated border border-border-highlight hover:border-brand-emerald text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {product.status === 'available' ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause Listing
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Resume Listing
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleDelete}
                      className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ) : user ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={product.status !== 'available'}
                    onClick={() =>
                      alert('Buy Request & Atomic 48-Hour Reservation protocol will be enabled in Phase 4!')
                    }
                    className="w-full bg-brand-emerald text-slate-950 font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Request to Buy (48h Campus Hold)
                  </button>
                  <p className="text-[11px] text-center text-muted">
                    Locks product for 48 hours upon seller acceptance with in-person PIN handover.
                  </p>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="w-full bg-brand-emerald text-slate-950 font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  Sign in to Request Item ↗
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
