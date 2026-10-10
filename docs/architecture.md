# UniLoop — System Architecture & Technical Design

**Document Version:** 3.0  
**Stack:** React, Vite, TypeScript, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Cloudinary  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`)  

---

## 1. High-Level Architecture Overview

UniLoop follows a decoupled Client-Server architecture designed for high developer velocity, strict type safety, and defensive security:

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│  React 18/19 SPA + Vite + TypeScript + Tailwind CSS         │
│  - React Router DOM (v6/v7)                                 │
│  - AuthContext (Session state & DEMO_MODE login shortcuts) │
│  - Axios Client with JWT Interceptors & Error Handlers     │
│  - Tailwind Semantic Theme (Canvas, Surface, Emerald CTA)   │
│  - Cloudinary Image Upload Uploader Component               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Server Tier                           │
│  Node.js + Express + TypeScript                             │
│  - Security: Helmet, Strict CORS Whitelist, Rate Limiters  │
│  - Request Validation: Zod .strict() & ObjectId Validator   │
│  - Domain Whitelist: College.allowedEmailDomains Check     │
│  - JWT Bearer Authentication & Suspension Gate Middleware   │
│  - Cloudinary File Upload Stream (Multer Memory Storage)    │
│  - Transactional Concurrency: MongoDB Session Transactions  │
│  - Handover PIN Protocol: Accept-time crypto.randomInt      │
│  - Contact Privacy Filter: Seller email/phone projection gate│
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM / Driver
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Tier                             │
│  MongoDB (Local / MongoDB Atlas M0 Cluster)                 │
│  - Collections: Colleges, Users, Products, BuyRequests      │
│  - Partial Unique Index: { product: 1, buyer: 1 } on active │
│  - Compound Indexes: { college: 1, category: 1, status: 1 } │
│  - Text Indexes: { title: 'text', description: 'text', ... }│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Image Storage Architecture: Cloudinary Integration

1. **Frontend Uploader:** Direct multipart upload via form input (up to 5 images).
2. **Backend Route (`POST /api/v1/upload/images`):**
   - Multer parses files into memory buffer (`multer.memoryStorage()`).
   - File filter enforces: `image/jpeg`, `image/png`, `image/webp` and `5MB` size limit.
   - Uploads directly to Cloudinary folder `campus_exchange/listings`.
   - Returns secure HTTPS image URLs stored in `Product.images`.

---

## 3. Concurrency & Handover Protocol

### 3.1 Transactional Reservation
- State transitions from `available` (or expired hold) $\rightarrow$ `reserved` use a MongoDB session transaction with `Product.findOneAndUpdate`.
- Expired reservations (`reservedUntil < now`) are reclaimed automatically.
- Generates 4-digit PIN at accept time with `crypto.randomInt(1000, 10000).toString()`, stored with `{ select: false }`.

### 3.2 In-Person Dual Handshake
```
   [Product: reserved (48h Hold)]
                 │
   Buyer: Clicks "Confirm Received" ──┐
                                     ├──► When both true ──► [Product: sold]
   Seller: Enters Buyer's 4-digit PIN ─┘                      [Request: completed]
   (5-attempt lockout defense)
```

---

## 4. Repository Directory Blueprint

```
second-hand-campus-exchange/
├── docs/                     # Full architectural & implementation blueprints
│   ├── product.md
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── security.md
│   ├── testing.md
│   ├── roadmap.md
│   ├── design-adaptation.md
│   └── design-system.md
├── AGENTS.md                 # Agent orchestration & coding guidelines
├── package.json              # Root package config (concurrently scripts)
│
├── server/                   # Backend Application
│   ├── src/
│   │   ├── config/           # DB, Cloudinary & env config
│   │   │   ├── db.ts
│   │   │   ├── cloudinary.ts
│   │   │   └── env.ts
│   │   ├── controllers/      # Route handlers
│   │   │   ├── authController.ts
│   │   │   ├── collegeController.ts
│   │   │   ├── productController.ts
│   │   │   ├── requestController.ts
│   │   │   ├── userController.ts
│   │   │   └── uploadController.ts
│   │   ├── middleware/       # Reusable middleware
│   │   │   ├── auth.ts       # JWT & suspension checks
│   │   │   ├── rateLimiter.ts # Login, request, upload & PIN limiters
│   │   │   ├── validate.ts   # Zod strict validator & ObjectId validator
│   │   │   ├── upload.ts     # Multer 5MB / 5 image filter
│   │   │   └── errorHandler.ts
│   │   ├── models/           # Mongoose schemas
│   │   │   ├── College.ts
│   │   │   ├── User.ts
│   │   │   ├── Product.ts
│   │   │   └── BuyRequest.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── collegeRoutes.ts
│   │   │   ├── productRoutes.ts
│   │   │   ├── requestRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── uploadRoutes.ts
│   │   ├── utils/
│   │   │   ├── email.ts      # Verification link mailer (with DEMO_MODE link return)
│   │   │   └── seed.ts       # IIT Bombay seed dataset
│   │   └── app.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── client/                   # Frontend SPA
    ├── src/
    │   ├── components/
    │   │   ├── common/       # Navbar, Footer, Badges, Modals, DemoBanner
    │   │   ├── product/      # ProductCard, ProductGrid, FilterBar
    │   │   ├── handover/     # HandoverPinModal, Timer48h
    │   │   └── dashboard/    # ListingRow, RequestCard, StatBox
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── pages/
    │   │   ├── MarketplacePage.tsx
    │   │   ├── ProductDetailPage.tsx
    │   │   ├── CreateListingPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── DashboardPage.tsx
    │   ├── services/         # Axios API clients
    │   │   ├── api.ts
    │   │   ├── authService.ts
    │   │   ├── collegeService.ts
    │   │   ├── productService.ts
    │   │   └── requestService.ts
    │   └── index.css         # Dark theme & Tailwind tokens
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```
