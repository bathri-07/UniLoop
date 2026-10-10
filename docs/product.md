# UniLoop — Product Specification & Requirements (MVP)

**Project Name:** UniLoop  
**Tagline:** Smart, Secure, Second-Hand Campus Exchange  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`, College Institutional Domain Auth)  
**Target Milestone:** Working MVP Evaluation (Deadline: Tomorrow Night)  

---

## 1. Executive Summary & Problem Statement

College students in India frequently need course-specific textbooks, scientific calculators, dorm accessories, lab coats, and bicycles. Concurrently, graduating or moving students discard or sell these items at steep losses because traditional platforms (OLX, Quickr, WhatsApp groups, Facebook Marketplace):
1. **Lack Trust & Proximity:** High risk of scams, non-students entering campus, and unsafe meetups.
2. **Lack Campus Context:** Cannot easily filter by course code (`CS201`, `CE102`), textbook ISBN, hostel blocks, or campus landmark pickup spots.
3. **Have High Friction & Ghosting:** Buyers claim items and never show up; sellers double-promise items to multiple students.

**UniLoop** solves this through a **campus-exclusive verified circular economy platform** featuring institutional email validation, atomic 48-hour reservation holds, privacy-preserving seller contacts, and dual mutual PIN handovers.

---

## 2. Target Personas

### Persona A: Priya — The Graduating Senior Seller (B.Tech CSE, Final Year)
- **Goal:** Hand over her CLRS Algorithms textbook, lab coat, and study desk before hostel vacation.
- **Pain Point:** Tired of strangers spamming her WhatsApp; wants guaranteed student-only handoffs inside campus premises.
- **Desired UniLoop Flow:** Posts listing with course code `CS201` and original MRP $\rightarrow$ accepts request (PIN generated, item locks for 48h) $\rightarrow$ enters buyer's 4-digit PIN at Central Library Steps to complete sale.

### Persona B: Rahul — The Fresher Buyer (B.Tech Mechanical, 1st Year)
- **Goal:** Buy an authentic Casio FX-991CW calculator and engineering mechanics textbook within a tight student budget.
- **Pain Point:** New bookstore prices are prohibitive; online deliveries take 5 days.
- **Desired UniLoop Flow:** Selects college (IIT Bombay) $\rightarrow$ verifies campus email $\rightarrow$ discovers textbook with 70% off MRP $\rightarrow$ sends offer $\rightarrow$ receives seller contact and 4-digit PIN upon acceptance $\rightarrow$ confirms meetup in app and shows PIN to seller.

---

## 3. Core MVP Feature Scope

### 3.1 College & Campus Verification
- Multi-college support via `College` collection with institutional `allowedEmailDomains` (e.g. `iitb.ac.in`).
- Registration automatically checks email domain; rejects non-campus domains (`@gmail.com`).
- Email verification link sent upon registration (`isVerified: false` $\rightarrow$ `isVerified: true`).
- Accounts flagged with `isSuspended: true` are blocked from trading.
- Same-college trading guard: Students can only request products listed in their own college.

### 3.2 Product Listings & Catalog
- **Listing Types:** `sell` (P2P direct sale in INR `₹`) or `free` (senior pass-downs at ₹0).
- **Pricing & Discounts:** Stored in INR (`₹`), with optional `originalPrice` displaying calculated discount (e.g., `-72% OFF`).
- **Academic Context:** Optional course code (`CS201`, `EE204`) and textbook `isbn`.
- **Condition Grading:** `New`, `Like New`, `Good`, `Fair`.
- **8 Core Categories:**
  1. Textbooks & Notes
  2. Electronics & Calculators
  3. Hostel Essentials
  4. Lab Gear & Coats
  5. Dorm Furniture
  6. Sports Gear
  7. Bicycles & Commute
  8. Maker & Arduino
  *(Free listings are filtered via `listingType: 'free'`, not a separate category).*
- **Listing Statuses:** `available`, `reserved`, `paused`, `sold`.
- **Images:** Up to 5 Cloudinary images (JPG/PNG/WEBP, 5MB each).
- **Deletion Safeguard:** Products actively in `reserved` status cannot be deleted until the hold expires or is cancelled.

### 3.3 Atomic Reservation & Privacy-Preserving Handover
- **Seller Privacy:** Public catalog and product details **never** expose seller phone or email.
- **Contact & PIN Disclosure:** Seller contact and the 4-digit `handoverPin` are revealed **only** to the buyer whose request was accepted.
- **Atomic 48-Hour Reservation:** Accepting an offer conditionally updates the product to `reserved` (`reservedUntil = 48h`) via atomic transactional `findOneAndUpdate`. Expired holds are treated as available.
- **Dual Confirmation Handover:**
  - Buyer clicks **"Confirm Handover"** in their app.
  - Seller **enters the 4-digit PIN** provided by the buyer.
  - Lockout protection: 5 failed PIN attempts locks the handover.
  - When both confirmed, product transitions to `sold` and request to `completed`.
- **DEMO_MODE:**
  - `DEMO_MODE=true` enables 1-click logins for Priya (Seller) and Rahul (Buyer), and displays verification links on screen.
