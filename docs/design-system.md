# UniLoop — Design System Specification

**Derived from:** [`docs/design-adaptation.md`](file:///e:/Internship/second-hand-campus-exchange/docs/design-adaptation.md) & Design Mockups  
**Framework:** Tailwind CSS + React 18/19 + Lucide Icons  
**Theme:** Collegiate Dark Mode (Canvas Obsidian & Emerald Accents)  
**Locale:** Indian Campus Context (INR `₹`, Indian Mobile `+91`)  

---

## 1. Tailwind CSS Theme Token Configuration

All components consume semantic Tailwind tokens rather than arbitrary raw hex values in JSX:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F12',       // Ultra-deep background
        surface: {
          DEFAULT: '#131920',    // Standard card & container background
          elevated: '#1A232E',   // Modals, dropdowns, popovers
          input: '#10161D',      // Input fields
        },
        border: {
          subtle: '#1F2937',     // Inactive borders and dividers
          highlight: '#374151',  // Hover and focused borders
        },
        brand: {
          emerald: '#10B981',    // Primary emerald accent
          hover: '#059669',      // Hover state
          dark: '#064E3B',       // Badges & pill background tint
        }
      },
      textColor: {
        primary: '#F9FAFB',      // Headings & high-contrast titles
        secondary: '#E2E8F0',    // Body text & descriptions
        muted: '#94A3B8',        // Lighter muted gray (slate-400) for readability
        dimmed: '#64748B',       // Strikethrough MRP and timestamps (slate-500)
      }
    }
  }
};
```

---

## 2. Standardized 8-Category Taxonomy

*Note:* `Free Giveaways` is removed from the category list because free items are filtered via the **Listing Type filter (`listingType: 'free' | 'sell'`)**. `Study Notes` is unified under **`Textbooks & Notes`**.

| Category Key | Label | Lucide Icon | Description |
| :--- | :--- | :--- | :--- |
| `textbooks-notes` | **Textbooks & Notes** | `BookOpen` | Course textbooks, reference books, handwritten notes, GATE prep |
| `electronics` | **Electronics & Calculators** | `Laptop` | Scientific calculators, monitors, keyboards, headphones |
| `hostel-essentials` | **Hostel Essentials** | `Home` | Study lamps, electric kettles, buckets, clothes drying racks |
| `lab-gear` | **Lab Gear & Coats** | `FlaskConical` | White lab coats, chemical goggles, engineering drawing sets |
| `dorm-furniture` | **Dorm Furniture** | `Armchair` | Study tables, ergonomic mesh chairs, shoe racks |
| `sports-gear` | **Sports Gear** | `Trophy` | Badminton rackets, gym dumbbells, sports equipment |
| `bicycles-commute` | **Bicycles & Commute** | `Bike` | Campus mountain bikes, cycle locks, baskets |
| `maker-arduino` | **Maker & Arduino** | `Cpu` | Arduino, Raspberry Pi, sensor kits, breadboards |

---

## 3. Core Component Library

### 3.1 Buttons
- **Primary Emerald Button:**
  - **Rule:** Uses **dark text on emerald** for high-contrast legibility.
  - Class: `bg-brand-emerald text-slate-950 font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-colors shadow-sm flex items-center justify-center gap-2`
- **Secondary Surface Button:**
  - Class: `bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-4 py-2.5 rounded-xl transition-colors`
- **Outline Action Button:**
  - Class: `border border-brand-emerald/50 text-emerald-400 hover:bg-brand-emerald/10 px-3.5 py-2 rounded-xl transition-colors font-medium`

### 3.2 Navigation Header Blueprint (Messages Icon Hidden)
- **Campus Selector:** Dropdown showing `IIT Bombay / Powai Campus`.
- **Search Bar:** Quick search with `⌘K` keyboard shortcut.
- **Action CTA:** `Post an Item (+ Earn)`.
- **User Profile Pill & Notifications:** Avatar and alert badge.
- *(Note: Messages/Chat icon is hidden from the header since MVP relies on direct phone/WhatsApp contact exchange upon request acceptance).*

```tsx
<header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border-subtle">
  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
    {/* Logo */}
    <div className="flex items-center gap-3">
      <span className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse" />
        UniLoop
      </span>
      <span className="text-xs bg-surface-elevated text-emerald-400 px-2.5 py-1 rounded-full border border-border-subtle font-mono">
        IIT Bombay
      </span>
    </div>

    {/* Center Nav Links */}
    <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
      <a href="/marketplace" className="hover:text-emerald-400 transition-colors">Marketplace</a>
      <a href="/categories" className="hover:text-emerald-400 transition-colors">Categories</a>
      <a href="/how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
    </nav>

    {/* Right Actions */}
    <div className="flex items-center gap-3">
      <button className="bg-brand-emerald text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-emerald-400 transition-colors flex items-center gap-1.5">
        <Plus className="w-4 h-4" />
        Post Item
      </button>
      <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border-highlight flex items-center justify-center text-xs text-slate-200 font-semibold">
        PS
      </div>
    </div>
  </div>
</header>
```

---

### 3.3 Product Card Blueprint (Semantic Tokens)
```tsx
<div className="group relative bg-surface border border-border-subtle hover:border-border-highlight rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1">
  {/* Image Container */}
  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
    <img 
      src={product.images[0]} 
      alt={product.title} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
    />
    {product.originalPrice && product.originalPrice > product.price && (
      <span className="absolute top-2.5 right-2.5 bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
      </span>
    )}
    <span className="absolute top-2.5 left-2.5 bg-canvas/80 backdrop-blur-sm text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-border-subtle">
      {product.condition}
    </span>
  </div>

  {/* Card Content */}
  <div className="p-4 space-y-2.5">
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <MapPin className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
      <span className="truncate">{product.campusPickupLocation}</span>
      {product.courseCode && (
        <span className="ml-auto bg-surface-elevated px-2 py-0.5 rounded text-[11px] font-mono text-slate-300 border border-border-subtle">
          {product.courseCode}
        </span>
      )}
    </div>

    <h3 className="font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
      {product.title}
    </h3>

    <div className="flex items-baseline gap-2 pt-1">
      {product.listingType === 'free' ? (
        <span className="text-lg font-bold text-emerald-400">FREE (₹0)</span>
      ) : (
        <>
          <span className="text-xl font-bold text-white">₹{product.price.toLocaleString('en-IN')}</span>
          {product.originalPrice && (
            <span className="text-xs text-slate-500 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
          )}
        </>
      )}
      <button className="ml-auto text-xs bg-surface-elevated hover:bg-brand-emerald hover:text-slate-950 text-slate-300 px-3 py-1.5 rounded-lg transition-colors font-medium border border-border-subtle">
        Request ↗
      </button>
    </div>
  </div>
</div>
```

---

### 3.4 In-Person Handover Modal Blueprint
```tsx
<div className="bg-surface-elevated border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
  <div className="flex items-center justify-between border-b border-border-subtle pb-3">
    <h3 className="text-lg font-semibold text-white">Safe Campus Handover</h3>
    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
      48h Hold
    </span>
  </div>

  {/* Buyer View */}
  {isBuyer && (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Show this 4-digit verification PIN to the seller during your in-person meetup at the designated pickup spot:
      </p>
      <div className="bg-canvas border border-brand-emerald/40 rounded-xl p-4 text-center">
        <span className="font-mono text-3xl font-bold tracking-widest text-emerald-400">
          {request.handoverPin}
        </span>
      </div>
      <button 
        onClick={confirmBuyerHandover}
        className="w-full bg-brand-emerald text-slate-950 font-semibold py-2.5 rounded-xl hover:bg-emerald-400 transition-colors">
        Confirm Item Received
      </button>
    </div>
  )}

  {/* Seller View */}
  {isSeller && (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Enter the 4-digit PIN provided by the buyer to verify the physical transaction:
      </p>
      <input 
        type="text" 
        maxLength={4} 
        placeholder="Enter 4-digit PIN"
        value={pinInput}
        onChange={(e) => setPinInput(e.target.value)}
        className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl p-3 text-center text-xl font-mono text-white outline-none"
      />
      <button 
        onClick={submitSellerPin}
        className="w-full bg-brand-emerald text-slate-950 font-semibold py-2.5 rounded-xl hover:bg-emerald-400 transition-colors">
        Verify PIN & Complete Handover
      </button>
    </div>
  )}
</div>
```
