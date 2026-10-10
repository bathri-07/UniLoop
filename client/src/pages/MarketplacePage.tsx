import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Laptop, 
  Home, 
  FlaskConical, 
  Armchair, 
  Trophy, 
  Bike, 
  Cpu, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  Sparkles,
  RefreshCw,
  Tag,
  AlertCircle
} from 'lucide-react';
import { productService, ProductItem } from '../services/productService';
import { ProductCard } from '../components/product/ProductCard';

const CATEGORIES = [
  { key: 'all', label: 'All Categories', icon: Sparkles },
  { key: 'Textbooks & Notes', label: 'Textbooks & Notes', icon: BookOpen },
  { key: 'Electronics & Calculators', label: 'Electronics & Calculators', icon: Laptop },
  { key: 'Hostel Essentials', label: 'Hostel Essentials', icon: Home },
  { key: 'Lab Gear & Coats', label: 'Lab Gear & Coats', icon: FlaskConical },
  { key: 'Dorm Furniture', label: 'Dorm Furniture', icon: Armchair },
  { key: 'Sports Gear', label: 'Sports Gear', icon: Trophy },
  { key: 'Bicycles & Commute', label: 'Bicycles & Commute', icon: Bike },
  { key: 'Maker & Arduino', label: 'Maker & Arduino', icon: Cpu }
];

export const MarketplacePage: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [listingType, setListingType] = useState<'all' | 'sell' | 'free'>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [condition, setCondition] = useState<string>('all');
  const [sort, setSort] = useState<string>('newest');

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        listingType: listingType,
        keyword: keyword.trim() || undefined,
        condition: condition === 'all' ? undefined : condition,
        sort: sort
      });

      if (res.success && res.data?.products) {
        setProducts(res.data.products);
      } else {
        setError(res.message || 'Failed to load catalog');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error connecting to marketplace service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, listingType, condition, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-8">
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-brand-dark/40 px-2.5 py-1 rounded-full border border-brand-emerald/30">
            <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
            IIT Bombay Verified Circular Exchange
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Campus Marketplace
          </h1>
          <p className="text-muted text-sm md:text-base">
            Discover verified peer-to-peer textbooks, lab gear, and dorm essentials inside campus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/create-listing"
            className="bg-brand-emerald text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post Item (+ Earn)
          </Link>
        </div>
      </div>

      {/* 2. 8-Category Taxonomy Bar - docs/design-system.md § 2 */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Browse by Campus Category
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-brand-emerald text-slate-950 border-brand-emerald shadow-sm font-semibold'
                    : 'bg-surface hover:bg-surface-elevated text-slate-300 border-border-subtle hover:border-border-highlight'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search and Multi-Facet Filter Controls */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, course code (e.g. CS201), or ISBN..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            className="bg-surface-elevated hover:bg-brand-emerald hover:text-slate-950 text-slate-200 border border-border-subtle hover:border-brand-emerald px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle/60 text-xs">
          {/* Listing Type Filter (Sell vs Free Giveaway) */}
          <div className="flex items-center gap-1.5 bg-surface-input p-1 rounded-xl border border-border-subtle">
            <button
              onClick={() => setListingType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                listingType === 'all'
                  ? 'bg-surface-elevated text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setListingType('sell')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                listingType === 'sell'
                  ? 'bg-brand-emerald text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Sale (₹)
            </button>
            <button
              onClick={() => setListingType('free')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1 ${
                listingType === 'free'
                  ? 'bg-brand-emerald text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3 h-3" />
              Free Giveaways (₹0)
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Condition Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Condition:</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="all">All Conditions</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Products Grid / States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-pulse space-y-3 p-4"
            >
              <div className="aspect-video bg-surface-elevated rounded-xl" />
              <div className="h-4 bg-surface-elevated rounded w-3/4" />
              <div className="h-4 bg-surface-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface border border-red-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Unable to Load Products</h3>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
          <button
            onClick={fetchProducts}
            className="bg-surface-elevated border border-border-highlight hover:border-brand-emerald px-4 py-2 rounded-xl text-xs text-slate-200 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Query
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto text-slate-500">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Listings Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No campus listings match your current filters. Try resetting the category or post the first listing yourself!
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setListingType('all');
                setKeyword('');
                setCondition('all');
              }}
              className="bg-surface-elevated border border-border-subtle hover:border-border-highlight px-4 py-2 rounded-xl text-xs text-slate-300 transition-colors"
            >
              Reset Filters
            </button>
            <Link
              to="/create-listing"
              className="bg-brand-emerald text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 transition-colors"
            >
              Post an Item ↗
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {products.length} campus item{products.length === 1 ? '' : 's'}</span>
            <span className="font-mono text-emerald-400">All prices in INR (₹)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
