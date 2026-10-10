# AGENTS.md — Development Guidelines for AI Agents & Collaborators

**Project:** UniLoop — Campus Second-Hand Exchange  
**Tech Stack:** React 18/19, Vite, TypeScript, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Cloudinary  
**Locale / Context:** Indian Campus Environment (INR `₹`, Phone `+91`, College Institutional Domain Auth)  

---

## 1. Core Operating Principles

1. **Pragmatic Scope Discipline:** The deadline is tomorrow night. Follow `docs/roadmap.md` strictly. Do not introduce unrequested dependencies.
2. **Modular, Sequential Implementation:** Implement features phase-by-phase. Do NOT write all backend and frontend code in a single massive pass. Verify each phase before progressing.
3. **Type Safety Across the Stack:** All backend routes, models, and controllers must be fully typed in TypeScript. Do not use `any` unless absolutely unavoidable. All frontend API services must define and consume TypeScript interfaces matching `docs/api.md`.
4. **Uniform API Response Envelope:** Every Express route must return the standard envelope:
   - Success: `{ "success": true, "message"?: string, "data"?: any }`
   - Failure: `{ "success": false, "message": string, "errors"?: any }`
5. **Compile Checks:** After changes to `server/` or `client/`, verify type correctness by running `tsc --noEmit`.

---

## 2. Security Infrastructure & Defensive Guardrails

1. **Helmet & CORS Whitelist:**
   - Mount `helmet()` at the top of the Express middleware stack.
   - Configure strict `cors()` with origin whitelisting (`process.env.CLIENT_URL || 'http://localhost:5173'`) and `credentials: true`.
2. **Granular Rate Limiting (`express-rate-limit`):**
   - **Login (`/auth/login`):** Max 10 attempts per 15 minutes per IP.
   - **Requests (`/requests`):** Max 30 requests per 15 minutes per user.
   - **Upload (`/upload/images`):** Max 10 uploads per hour per user.
   - **Confirm Handover (`/confirm-handover`):** Max 5 attempts per 15 minutes per request/IP.
3. **Input Validation (Zod & ObjectIds):**
   - All controller input schemas must use Zod `.strict()` to reject undeclared payload properties.
   - All route parameter IDs (`:id`) must be validated via `mongoose.Types.ObjectId.isValid()`.
4. **Password & JWT Security:**
   - Passwords must be at least **8 characters long** and hashed using `bcryptjs` (10 salt rounds).
   - `JWT_SECRET` must be set in `.env` (server must crash on startup if missing or <32 chars). Tokens signed with `HS256` and standard `7d` expiration.
5. **Account Gatekeepers:**
   - Auth middleware (`protect`) MUST check `user.isSuspended`. If `true`, return `403 Forbidden: Account is suspended`.
   - Users must have `isVerified: true` to create listings or submit/accept buy requests.
   - Registration MUST validate email domain against `College.allowedEmailDomains`. Public/unauthorized domains receive `400 Bad Request`.

---

## 3. Critical Business Logic & Handover Concurrency

1. **Same-College & Campus Derivation:**
   - On `POST /api/v1/products`: Derive `product.college = req.user.college` automatically. Do NOT accept college from client body.
   - Validate `campusPickupLocation` against `College.pickupLocations`.
   - On `POST /api/v1/requests`: Verify buyer and product belong to the same college (`buyer.college.equals(product.college)`). Cross-campus requests receive `403 Forbidden`.
2. **Atomic 48-Hour Reservation:**
   - Accepting a buy request MUST run in a MongoDB session transaction (`startSession()`, `withTransaction()`).
   - Requires `request.status === 'pending'`.
   - Queries `Product.findOneAndUpdate` with:
     `{ _id: request.product, seller: req.user._id, $or: [{ status: 'available' }, { status: 'reserved', reservedUntil: { $lt: new Date() } }] }`
     *(Treats expired holds as available!)*
   - If not available, return `409 Conflict`.
   - Sets `status: 'reserved'` and `reservedUntil: Date.now() + 48h`.
   - `BuyRequest` MUST have a partial unique index on `{ product: 1, buyer: 1 }` for `status: ['pending', 'accepted']`.
3. **Accept-Time PIN Generation & Seller Privacy:**
   - Generate `handoverPin` **only at accept time** using `crypto.randomInt(1000, 10000).toString()`.
   - `handoverPin` in Mongoose has `select: false`.
   - Revealed **only to the buyer** in their accepted request view.
   - `GET /api/v1/products/:id` MUST NEVER project seller `email` or `phone`.
4. **Dual Handover Confirmation & Lockout:**
   - Item CANNOT become `sold` purely on request acceptance.
   - **Seller** confirms by entering the 4-digit PIN provided by the buyer.
   - **Buyer** confirms by clicking the confirmation button.
   - Track `handoverAttempts`: lock out request after **5 failed PIN attempts** (`429 Too Many Requests`).
   - Confirmation must be atomic: reject if `product.reservedUntil < Date.now()` (expired).
   - When both flags are true: atomically update `product.status = 'sold'` and `request.status = 'completed'`.
5. **Delete Protection:**
   - If `product.status === 'reserved'` and not expired, `DELETE /api/v1/products/:id` MUST return `409 Conflict`.
6. **DEMO_MODE:**
   - Supported via `DEMO_MODE=true` in `.env`.
   - Seed script pre-seeds `IIT Bombay` with demo student logins (`Priya S.` and `Rahul M.`).
   - UI provides 1-Click Demo Login buttons and renders the verification link directly in the UI banner upon registration.

---

## 4. UI/UX & Design System Standards

1. **Design Tokens & Tailwind (No Inline Hex in JSX):**
   - Consume semantic Tailwind classes (`bg-canvas`, `bg-surface`, `bg-surface-elevated`, `border-border-subtle`, `text-slate-100`, `text-slate-400`).
   - Do NOT hardcode `#0B0F12` or `#131920` in JSX.
2. **Buttons & Contrast:**
   - Primary emerald buttons must use **dark text on emerald** (`bg-brand-emerald text-slate-950 font-semibold hover:bg-emerald-400`).
   - Lighter muted text: use `text-slate-400` / `text-slate-300` for clear contrast against dark surfaces.
3. **8-Category Taxonomy:**
   - Standard categories:
     1. `Textbooks & Notes`
     2. `Electronics & Calculators`
     3. `Hostel Essentials`
     4. `Lab Gear & Coats`
     5. `Dorm Furniture`
     6. `Sports Gear`
     7. `Bicycles & Commute`
     8. `Maker & Arduino`
   - Free giveaway items are filtered via `listingType: 'free' | 'sell'`, NOT a separate category.
   - Messages / chat icon is hidden from the header navigation.

---

## 5. Standard Command Reference

When executing commands in the workspace:
- Root dev script (runs frontend and backend concurrently):
  ```bash
  npm run dev
  ```
- Backend dev server:
  ```bash
  cd server && npm run dev
  ```
- Frontend dev server:
  ```bash
  cd client && npm run dev
  ```
- Database Seeder (critical for viva demo):
  ```bash
  npm run seed # or cd server && npm run seed
  ```
- Type checking:
  ```bash
  cd server && npx tsc --noEmit
  cd client && npx tsc --noEmit
  ```
