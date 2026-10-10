import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Tag, ArrowUpRight, ShieldCheck, Clock } from 'lucide-react';
import { ProductItem } from '../../services/productService';

interface ProductCardProps {
  product: ProductItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  // Seller initials
  const sellerInitials = product.seller?.name
    ? product.seller.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'PS';

  return (
    <article className="group relative bg-surface border border-border-subtle hover:border-border-highlight rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 flex flex-col shadow-lg">
      <Link
        to={`/products/${product._id}`}
        className="block focus-ring rounded-2xl h-full flex flex-col"
        aria-label={`View details for ${product.title}`}
      >
        {/* 1. Image Container with Badges */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            src={product.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Top-Left: Condition Badge */}
          <span className="absolute top-2.5 left-2.5 bg-canvas/80 backdrop-blur-md text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-border-subtle">
            {product.condition}
          </span>

          {/* Top-Right: Hold, Sold, or Discount Badge */}
          {product.status === 'reserved' ? (
            <span className="absolute top-2.5 right-2.5 bg-amber-500/90 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              48h Hold
            </span>
          ) : product.status === 'sold' ? (
            <span className="absolute top-2.5 right-2.5 bg-slate-900/90 text-slate-400 text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
              SOLD
            </span>
          ) : discountPercent ? (
            <span className="absolute top-2.5 right-2.5 bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm font-mono">
              -{discountPercent}% OFF
            </span>
          ) : null}

          {/* Bottom Overlay on Image: Pickup Spot */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-slate-200 bg-canvas/75 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border-subtle/80">
            <span className="flex items-center gap-1 truncate max-w-[70%]">
              <MapPin className="w-3 h-3 text-brand-emerald shrink-0" />
              <span className="truncate">{product.campusPickupLocation}</span>
            </span>
            {product.courseCode && (
              <span className="bg-surface-elevated px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-300 border border-border-subtle font-semibold shrink-0">
                {product.courseCode}
              </span>
            )}
          </div>
        </div>

        {/* 2. Card Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            {/* Category tag */}
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="truncate">{product.category}</span>
              {product.seller?.name && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                  <span className="w-4 h-4 rounded-full bg-surface-elevated border border-border-subtle inline-flex items-center justify-center text-[9px] text-slate-300 font-semibold">
                    {sellerInitials}
                  </span>
                  <span className="truncate max-w-[80px]">{product.seller.name.split(' ')[0]}</span>
                  <ShieldCheck className="w-2.5 h-2.5 text-brand-emerald shrink-0" />
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors text-sm md:text-base tracking-tight">
              {product.title}
            </h3>
          </div>

          {/* 3. Price & Action Row */}
          <div className="flex items-end justify-between pt-1 border-t border-border-subtle/60">
            <div className="flex items-baseline gap-2">
              {product.listingType === 'free' ? (
                <span className="text-base font-bold text-emerald-400 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  FREE (₹0)
                </span>
              ) : (
                <>
                  <span className="text-lg md:text-xl font-extrabold text-white">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-slate-500 line-through">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-300 bg-surface-elevated group-hover:bg-brand-emerald group-hover:text-slate-950 px-2.5 py-1.5 rounded-lg transition-colors font-medium border border-border-subtle">
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};
