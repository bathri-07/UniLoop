# UniLoop — Implementation Roadmap & Execution Timeline

**Target Deadline:** Tomorrow Night  
**Total Development Window:** ~20-24 Hours  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`)  

---

## 1. Hourly Execution Timeline

```
[Phase 1: Hours 1-2.5]   Scaffold, College Model & Cloudinary (Multer, Mongo, Helmet, CORS)
         │
[Phase 2: Hours 2.5-5]   Domain-Validated Auth (Domain Whitelisting, Verification Link, Suspension Gates)
         │
[Phase 3: Hours 5-9]     Catalog, Cloudinary Upload & Detail View (8 Categories, INR ₹, MRP, Privacy Filters)
         │
[Phase 4: Hours 9-13]    Atomic 48h Reservation & Transactions (Session Transactions, findOneAndUpdate, PIN)
         │
[Phase 5: Hours 13-16]   Dual Handover & Dashboard (Seller PIN Entry, Buyer Confirm Button, 5-Attempt Lockout)
         │
[Phase 6: Hours 16-18]   Seed Data, DEMO_MODE & Dark UI (IIT Bombay, 1-Click Logins, Tailwind Semantic Tokens)
         │
[Phase 7: Hours 18-20]   Security & Concurrency Testing (Automated Tests & 5-Min Viva Rehearsal)
         │
[Buffer:  Hours 20-24]   Viva Slides, Demo Video Backup & Rest
```

---

## 2. Phase-by-Phase Implementation Tasks

### Phase 1: Scaffolding, College Model & Security Baseline (Hours 1 - 2.5)
- [ ] Initialize monorepo structure (`/server` and `/client`).
- [ ] Setup Express with `helmet()`, strict `cors()`, and Zod `.strict()` validation helper.
- [ ] Implement `College` schema with `allowedEmailDomains` and `pickupLocations`.
- [ ] Setup Cloudinary upload route (`POST /api/v1/upload/images`) with Multer memory storage and 5MB ceiling.
- [ ] Setup rate limiters for auth, requests, uploads, and handover PIN verification.

### Phase 2: Domain-Validated Auth & Verification (Hours 2.5 - 5)
- [ ] Implement `User` model with password min 8 chars, `role`, `isSuspended`, `isVerified`, and Indian phone regex (`+91`).
- [ ] Build `POST /api/v1/auth/register` with domain validation; support `DEMO_MODE=true` to display verification link in UI.
- [ ] Implement `GET /api/v1/auth/verify-email`.
- [ ] Build auth middleware that checks and blocks suspended accounts (`isSuspended: true`).
- [ ] Build frontend login with 1-click Demo Login buttons (`Priya S.` and `Rahul M.`).

### Phase 3: Product Catalog & Listing Management (Hours 5 - 9)
- [ ] Implement `Product` model with `listingType` (`sell`|`free`), `originalPrice`, `courseCode`, `isbn`, conditions (`New`|`Like New`|`Good`|`Fair`), and the 8 standardized categories.
- [ ] Build `POST /api/v1/products` deriving `product.college = req.user.college` and validating pickup locations.
- [ ] Build `GET /api/v1/products` with text search and multi-facet filtering.
- [ ] Build `GET /api/v1/products/:id` with strict privacy projection: **never** expose seller phone/email.
- [ ] Build `GET /api/v1/users/me/listings` and status toggle (`PATCH /api/v1/products/:id/status` to pause/resume).
- [ ] Block deletion when `product.status === 'reserved'`.

### Phase 4: Transactional 48-Hour Reservation Hold (Hours 9 - 13)
- [ ] Add partial unique index on `BuyRequest`: `{ product: 1, buyer: 1 }` for `['pending', 'accepted']`.
- [ ] Implement `PATCH /api/v1/requests/:id/status` inside a MongoDB session transaction.
- [ ] Conditional reservation treats expired holds (`reservedUntil < now`) as available.
- [ ] Generate 4-digit `handoverPin` at accept time via `crypto.randomInt` with `select: false`.
- [ ] Reveal seller contact and `handoverPin` in `GET /api/v1/requests/outgoing` **only** for the buyer of an accepted request.

### Phase 5: Dual Handover Confirmation & Dashboard (Hours 13 - 16)
- [ ] Implement `POST /api/v1/requests/:id/confirm-handover`.
- [ ] Buyer confirms via button; Seller confirms by entering 4-digit PIN.
- [ ] Implement 5-failed-attempt PIN lockout.
- [ ] Atomically finalize to `sold` and `completed` when both confirm; reject if reservation has expired.
- [ ] Build `GET /api/v1/dashboard/stats` and Student Dashboard UI tabs.

### Phase 6: Seed Script & UI System Polish (Hours 16 - 18)
- [ ] Build `npm run seed` with IIT Bombay, demo accounts, 8 design categories, listings with INR prices.
- [ ] Implement dark Canvas (`bg-canvas`) & Surface (`bg-surface`) theme using semantic Tailwind tokens (no raw hex in JSX).
- [ ] Apply dark text on emerald buttons (`text-slate-950` on `bg-brand-emerald`) and lighter muted slate (`text-slate-400`).
- [ ] Hide Messages icon in header navigation.

### Phase 7: Verification & Evaluation Defense (Hours 18 - 20)
- [ ] Run test suites in `tests/`:
  - `tests/auth.test.ts` (rejection of unauthorized domain, suspended account block).
  - `tests/privacy.test.ts` (contact and PIN hidden until accept).
  - `tests/concurrency.test.ts` (concurrent accept yields exactly one 200 and one 409).
  - `tests/handover.test.ts` (buyer button confirm, seller PIN verify, 5-attempt lockout).
- [ ] Rehearse the 5-minute live viva runbook.
