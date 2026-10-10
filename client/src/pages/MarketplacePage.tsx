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
  RefreshCw, 
  Tag, 
  AlertCircle,
  X,
  MapPin,
  Leaf,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { productService, ProductItem } from '../services/productService';
import { ProductCard } from '../components/product/ProductCard';

const CATEGORIES = [
  { key: 'all', label: 'All Categories', icon: Layers },
  { key: 'Textbooks & Notes', label: 'Textbooks & Notes', icon: BookOpen },
  { key: 'Electronics & Calculators', label: 'Electronics & Calculators', icon: Laptop },
  { key: 'Hostel Essentials', label: 'Hostel Essentials', icon: Home },
  { key: 'Lab Gear & Coats', label: 'Lab Gear & Coats', icon: FlaskConical },
  { key: 'Dorm Furniture', label: 'Dorm Furniture', icon: Armchair },
  { key: 'Sports Gear', label: 'Sports Gear', icon: Trophy },
  { key: 'Bicycles & Commute', label: 'Bicycles & Commute', icon: Bike },
  { key: 'Maker & Arduino', label: 'Maker & Arduino', icon: Cpu }
];

const CONDITIONS = ['all', 'New', 'Like New', 'Good', 'Fair'];

const PICKUP_SPOTS = [
  'all',
  'Central Library Steps',
  'Student Activity Center (SAC)',
  'Main Canteen / Nescafe Hub',
  'Hostel Gate Foyer'
];

export const MarketplacePage: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [listingType, setListingType] = useState<'all' | 'sell' | 'free'>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [courseCodeFilter, setCourseCodeFilter] = useState<string>('');
  const [isbnFilter, setIsbnFilter] = useState<string>('');
  const [condition, setCondition] = useState<string>('all');
  const [pickupSpot, setPickupSpot] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('newest');

  // Mobile filters drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // If course code or ISBN is filled, search with them or combine with keyword
      const effectiveKeyword = courseCodeFilter.trim() 
        ? courseCodeFilter.trim() 
        : isbnFilter.trim() 
        ? isbnFilter.trim() 
        : keyword.trim() || undefined;

      const res = await productService.getProducts({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        listingType: listingType,
        keyword: effectiveKeyword,
        condition: condition === 'all' ? undefined : condition,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort: sort
      });

      if (res.success && res.data?.products) {
        let list = res.data.products;
        // Filter by pickup spot client-side if selected
        if (pickupSpot !== 'all') {
          list = list.filter((p: ProductItem) => p.campusPickupLocation === pickupSpot);
        }
        setProducts(list);
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
  }, [selectedCategory, listingType, condition, sort, pickupSpot]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleClearAllFilters = () => {
    setSelectedCategory('all');
    setListingType('all');
    setKeyword('');
    setCourseCodeFilter('');
    setIsbnFilter('');
    setCondition('all');
    setPickupSpot('all');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    listingType !== 'all' ||
    keyword.trim() !== '' ||
    courseCodeFilter.trim() !== '' ||
    isbnFilter.trim() !== '' ||
    condition !== 'all' ||
    pickupSpot !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '';

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
      {/* 1. Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span>Campus Hub</span>
          <span>/</span>
          <span className="text-white font-medium">Marketplace</span>
          <span>/</span>
          <span className="text-emerald-400 font-mono">IIT Bombay Live Loop</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-surface px-3 py-1 rounded-full border border-border-subtle w-fit">
          <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
          <span>Active Campus Feed • Peer Verified</span>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Filter Sidebar (Desktop lg:col-span-4 xl:col-span-3) */}
        <aside
          className={`lg:col-span-4 xl:col-span-3 bg-surface border border-border-subtle rounded-2xl p-5 space-y-6 shadow-xl ${
            mobileFilterOpen ? 'fixed inset-x-4 top-20 z-40 max-h-[85vh] overflow-y-auto block' : 'hidden lg:block'
          }`}
          aria-label="Marketplace Filters"
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <SlidersHorizontal className="w-4 h-4 text-brand-emerald" />
              <span>Filter Refinements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-brand-dark text-emerald-300 font-mono px-2 py-0.5 rounded">
                Live IIT-B
              </span>
              {mobileFilterOpen && (
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Course / ISBN Quick Match */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Course / Academic Match
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Course code (e.g. CS201)"
                value={courseCodeFilter}
                onChange={(e) => setCourseCodeFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none uppercase transition-colors"
              />
              <input
                type="text"
                placeholder="Textbook ISBN (978-...)"
                value={isbnFilter}
                onChange={(e) => setIsbnFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Categories Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span>Categories</span>
              <span className="text-[10px] text-muted font-normal">8 Standard</span>
            </div>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-emerald text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <IconComponent className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deal Model (Sell vs Free Giveaway) */}
          <div className="space-y-2.5 border-t border-border-subtle/80 pt-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Deal Model
            </span>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  checked={listingType === 'all'}
                  onChange={() => setListingType('all')}
                  className="accent-emerald-500"
                />
                <span>All Listing Types</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  checked={listingType === 'sell'}
                  onChange={() => setListingType('sell')}
                  className="accent-emerald-500"
                />
                <span>Direct Sale (In INR ₹)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  checked={listingType === 'free'}
                  onChange={() => setListingType('free')}
                  className="accent-emerald-500"
                />
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Tag className="w-3 h-3" /> Free Giveaways (₹0)
                </span>
              </label>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2.5 border-t border-border-subtle/80 pt-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Price Range (₹)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-1/2 bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-1/2 bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={fetchProducts}
              className="w-full bg-surface-elevated hover:bg-surface-elevated/80 border border-border-subtle text-slate-300 text-xs py-1.5 rounded-lg transition-colors font-medium"
            >
              Apply Price Filter
            </button>
          </div>

          {/* Condition Filter */}
          <div className="space-y-2.5 border-t border-border-subtle/80 pt-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Item Condition
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    condition === c
                      ? 'bg-brand-emerald text-slate-950 font-semibold'
                      : 'bg-surface-input text-slate-300 hover:bg-surface-elevated border border-border-subtle'
                  }`}
                >
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Campus Pickup Spot Filter */}
          <div className="space-y-2.5 border-t border-border-subtle/80 pt-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-emerald" />
              Safe Pickup Spot
            </span>
            <select
              value={pickupSpot}
              onChange={(e) => setPickupSpot(e.target.value)}
              className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="all">All Campus Landmarks</option>
              {PICKUP_SPOTS.slice(1).map((spot) => (
                <option key={spot} value={spot} className="bg-surface">
                  {spot}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Sustainability Widget */}
          <div className="bg-brand-dark/30 border border-brand-emerald/20 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Leaf className="w-3.5 h-3.5" />
              <span>Campus Circular Impact</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every book and lab gear item exchanged inside IIT Bombay eliminates shipping freight and prevents campus e-waste.
            </p>
          </div>

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="w-full text-xs text-slate-400 hover:text-white py-2 border-t border-border-subtle flex items-center justify-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </aside>

        {/* RIGHT COLUMN: Search Header & Product Feed (lg:col-span-8 xl:col-span-9) */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* Search Bar & Sort Dropdown */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-3.5 md:p-4 space-y-3 shadow-lg">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search listings by title, keywords, or description..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-8 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      fetchProducts();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="lg:hidden bg-surface-elevated text-slate-300 border border-border-subtle px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </button>

                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-surface-elevated border border-border-subtle focus:border-brand-emerald text-slate-200 text-xs font-medium rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                  aria-label="Sort listings"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="oldest">Oldest First</option>
                </select>

                <button
                  type="submit"
                  className="bg-brand-emerald text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition-colors shrink-0 shadow-sm"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Active Filter Chips Strip */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle/60 text-xs">
                <span className="text-slate-400 text-[11px]">Active Filters:</span>
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-surface-elevated text-slate-200 px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')}>
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {listingType !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-surface-elevated text-slate-200 px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]">
                    {listingType === 'free' ? 'Free Giveaways' : 'Direct Sale'}
                    <button onClick={() => setListingType('all')}>
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {condition !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-surface-elevated text-slate-200 px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]">
                    Condition: {condition}
                    <button onClick={() => setCondition('all')}>
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {pickupSpot !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-surface-elevated text-slate-200 px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]">
                    Pickup: {pickupSpot}
                    <button onClick={() => setPickupSpot('all')}>
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {(courseCodeFilter || isbnFilter) && (
                  <span className="inline-flex items-center gap-1 bg-surface-elevated text-emerald-300 font-mono px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]">
                    Academic: {courseCodeFilter || isbnFilter}
                    <button
                      onClick={() => {
                        setCourseCodeFilter('');
                        setIsbnFilter('');
                      }}
                    >
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearAllFilters}
                  className="text-[11px] text-emerald-400 hover:underline ml-auto font-medium"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Active Listings Header Metric */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {products.length} active listing{products.length === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="truncate">IIT Bombay Live Campus Feed</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3 text-brand-emerald" />
                Avg Handover &lt; 2 hrs
              </span>
              <span>•</span>
              <span className="font-mono text-emerald-400">All prices in ₹</span>
            </div>
          </div>

          {/* Product Feed Grid / States */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-pulse p-4 space-y-3"
                >
                  <div className="aspect-video bg-surface-elevated rounded-xl" />
                  <div className="h-4 bg-surface-elevated rounded w-3/4" />
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                  <div className="h-6 bg-surface-elevated rounded w-1/3 pt-2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface border border-red-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Unable to Load Products</h3>
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
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">No Campus Listings Match Filters</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try broadening your search keywords or resetting filters to discover all peer items.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleClearAllFilters}
                  className="bg-surface-elevated border border-border-subtle hover:border-border-highlight px-4 py-2 rounded-xl text-xs text-slate-300 transition-colors"
                >
                  Reset Filters
                </button>
                <Link
                  to="/create-listing"
                  className="bg-brand-emerald text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Post First Item in Category
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Bottom Campus Community Banner */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white">
                Looking for a specific course book or hostel gadget?
              </h4>
              <p className="text-xs text-muted">
                Post an item to pass down senior gear or reach out directly to campus peers.
              </p>
            </div>
            <Link
              to="/create-listing"
              className="bg-surface-elevated hover:bg-brand-emerald hover:text-slate-950 text-slate-200 border border-border-subtle hover:border-brand-emerald px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <span>Post an Item (+ Earn)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};
