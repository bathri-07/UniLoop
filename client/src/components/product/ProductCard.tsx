import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Tag } from 'lucide-react';
import { ProductItem } from '../../services/productService';

interface ProductCardProps {
  product: ProductItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <Link
      to={`/products/${product._id}`}
      className="group relative bg-surface border border-border-subtle hover:border-border-highlight rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 block shadow-md"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Condition Badge */}
        <span className="absolute top-2.5 left-2.5 bg-canvas/80 backdrop-blur-sm text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-border-subtle">
          {product.condition}
        </span>

        {/* Status or Discount Badge */}
        {product.status === 'reserved' ? (
          <span className="absolute top-2.5 right-2.5 bg-amber-500/90 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            48h Hold
          </span>
        ) : product.status === 'sold' ? (
          <span className="absolute top-2.5 right-2.5 bg-slate-800/90 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
            SOLD
          </span>
        ) : discountPercent ? (
          <span className="absolute top-2.5 right-2.5 bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            {discountPercent}% OFF
          </span>
        ) : null}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-2.5">
        {/* Pickup spot & course code */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
          <span className="truncate">{product.campusPickupLocation}</span>
          {product.courseCode && (
            <span className="ml-auto bg-surface-elevated px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300 border border-border-subtle font-semibold shrink-0">
              {product.courseCode}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors text-sm md:text-base">
          {product.title}
        </h3>

        {/* Price & Action */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2">
            {product.listingType === 'free' ? (
              <span className="text-base md:text-lg font-bold text-emerald-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> FREE (₹0)
              </span>
            ) : (
              <>
                <span className="text-lg md:text-xl font-bold text-white">
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

          <span className="text-xs bg-surface-elevated group-hover:bg-brand-emerald group-hover:text-slate-950 text-slate-300 px-3 py-1.5 rounded-lg transition-colors font-medium border border-border-subtle">
            View ↗
          </span>
        </div>
      </div>
    </Link>
  );
};
