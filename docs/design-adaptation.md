# UniLoop — Design Adaptation & UI/UX Audit

**Reference Sources:** `design/Html → Body.png` (Landing & Discovery) and `design/Html → Body (1).png` (Catalog & Filter View)  
**Campus Context:** Indian Campus Environment (e.g., IIT Bombay / Powai Campus, BITS Pilani, Delhi University)  
**Theme:** Collegiate Dark Mode (`#0B0F12` / `#131920`) with Emerald Green (`#10B981`) Accents & Indian Rupee (`₹`) Pricing  

---

## 1. Visual Theme & Color Palette Extraction

From the high-fidelity UI mockups in `design/`, UniLoop uses a sleek, high-contrast dark aesthetic tailored for collegiate students:

### 1.1 Color Tokens
- **Canvas Base:** `#0B0F12` (Ultra-deep obsidian black)
- **Surface / Card Background:** `#131920` (Dark slate card surface)
- **Elevated Surface:** `#1A232E` (Modals, dropdowns, input backgrounds)
- **Card Border:** `#1F2937` / `#374151` (Subtle 1px border for clean separation)
- **Primary Accent (Emerald):** `#10B981` (Buttons, verified checks, badges, price highlights)
- **Button Typography:** High-contrast dark text (`text-slate-950`) on emerald background.
- **Text Palette:** High-contrast white (`#F9FAFB`), lighter readable muted slate (`#94A3B8`), and dimmed slate (`#64748B`).

---

## 2. Standardized 8-Category Taxonomy

*Architecture Adaptation Note:*
- **Free Giveaways** is removed from the category enum and implemented as a primary **`listingType: 'free' | 'sell'`** filter toggle.
- **Study Notes** is integrated under **`Textbooks & Notes`**.

| # | Category Slug | Display Name | Sample Campus Items |
| :- | :--- | :--- | :--- |
| 1 | `textbooks-notes` | **Textbooks & Notes** | Engineering Mathematics, CS201 Algorithms, Handwritten Lecture Notes, GATE Prep |
| 2 | `electronics` | **Electronics & Calculators** | Casio FX-991CW/EX, Logitech K380, Raspberry Pi 4, ANC Headphones |
| 3 | `hostel-essentials` | **Hostel Essentials** | Foldable wooden study table, electric kettle (1.2L), desk fans, laundry racks |
| 4 | `lab-gear` | **Lab Gear & Coats** | White cotton lab coat (Size M/L), chemical safety goggles, drafting tools |
| 5 | `dorm-furniture` | **Dorm Furniture** | Ergonomic mesh study chair, shoe rack, mattress topper |
| 6 | `sports-gear` | **Sports Gear** | Badminton rackets, gym dumbbells, football boots |
| 7 | `bicycles-commute` | **Bicycles & Commute** | Hero Sprint 26T, Firefox Road Runner, cycle locks & baskets |
| 8 | `maker-arduino` | **Maker & Arduino** | Arduino Mega 2560, breadboards, jumper wires, sensor starter kit |

---

## 3. Product Deal Models & Condition Grades

### 3.1 Listing Types (`listingType`)
- `sell`: Direct peer-to-peer sale at a specified price in INR (₹).
- `free`: Senior pass-down / free giveaway (price fixed to ₹0).

### 3.2 Standard Condition Ratings (`condition`)
1. **`New`**: Sealed / unused (e.g., unopened lab goggles, new notebook).
2. **`Like New`**: Used for 1 semester without markings, mint battery/appearance.
3. **`Good`**: Fully functional, minor cosmetic wear, clean pages.
4. **`Fair`**: Visible wear, highlighting or scratches, but 100% working.

---

## 4. Hyper-Local Campus Context & Header Design

- **Campus Selector:** Header dropdown: `"IIT Bombay / Powai Campus"`.
- **Course Code Tags:** Tagging listings with academic codes (e.g., `CS201`, `MATH201`, `EE204`).
- **Textbook ISBN:** Optional ISBN-10 / ISBN-13 field.
- **Header Actions:** Quick search `⌘K`, Post an Item CTA, User avatar. *(Messages icon is hidden in MVP)*.
- **Designated Safe Pickup Spots:**
  - Central Library Steps
  - Student Activity Center (SAC) Quad
  - Main Canteen / Nescafe Hub
  - Hostel Gate Foyer

---

## 5. Trust & Handover 4-Step Architecture

```
[STEP 01: Verify Campus Email]
Institutional .edu / .ac.in email check. Rejects outside domains. Zero bot activity.
       │
       ▼
[STEP 02: Discover & Request Nearby]
Search by Course Code (CS201), ISBN, or Hostel. Filter by Sell / Free.
       │
       ▼
[STEP 03: Lock & Safe Landmark Hold (48h)]
Atomic reservation locks product for 48 hours. Prevents ghosting & double booking.
       │
       ▼
[STEP 04: Inspect & Handover PIN]
In-person inspection at designated campus safe spot.
Buyer presents 4-digit PIN generated at accept time; seller enters PIN to confirm transaction.
```
