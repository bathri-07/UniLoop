# UniLoop — REST API Specification & Contracts

**Base URL:** `/api/v1`  
**Protocol:** HTTPS (Production) / HTTP (Local Development)  
**Standard Payload Format:** `application/json`  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`)  

---

## 1. Global Conventions & Response Envelope

### Standard Success Response:
```json
{
  "success": true,
  "message": "Operation successful description",
  "data": { ... }
}
```

### Standard Error Response:
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Email domain is not authorized for selected campus" }
  ]
}
```

---

## 2. College & Campus Discovery Endpoints

### 2.1 Get Active Colleges & Approved Pickup Locations
- **Method & Path:** `GET /api/v1/colleges`
- **Access:** Public
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "colleges": [
      {
        "_id": "6704a1b0f89e1a0012345601",
        "name": "IIT Bombay",
        "campusLocation": "Powai, Mumbai",
        "allowedEmailDomains": ["iitb.ac.in", "student.iitb.ac.in"],
        "pickupLocations": [
          "Central Library Steps",
          "Student Activity Center (SAC)",
          "Main Canteen / Nescafe Hub",
          "Hostel Gate Foyer"
        ]
      }
    ]
  }
}
```

---

## 3. Authentication & Account Management Endpoints

### 3.1 Register Student (Domain Validated)
- **Method & Path:** `POST /api/v1/auth/register`
- **Access:** Public
- **Validation Rules:**
  - Password minimum **8** characters.
  - Validates domain against `college.allowedEmailDomains`.
  - Rejects non-campus domains with `400 Bad Request` (`"Email domain is not authorized for selected campus"`).
  - Validates 10-digit Indian phone (`+91` format).
  - Creates account with `isVerified: false`.
  - In `DEMO_MODE=true`, returns verification link directly in the response payload for instant testing.
- **Request Body:**
```json
{
  "name": "Rahul Mehra",
  "email": "rahul.mech26@iitb.ac.in",
  "password": "StrongPassword123!",
  "collegeId": "6704a1b0f89e1a0012345601",
  "phone": "+919819876543"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your campus email.",
  "data": {
    "user": {
      "id": "6704b2baf89e1a0012345672",
      "name": "Rahul Mehra",
      "email": "rahul.mech26@iitb.ac.in",
      "college": "6704a1b0f89e1a0012345601",
      "isVerified": false,
      "role": "student"
    },
    "verificationUrl": "http://localhost:5000/api/v1/auth/verify-email?token=abc123demo"
  }
}
```

### 3.2 Verify Campus Email Link
- **Method & Path:** `GET /api/v1/auth/verify-email?token=<token_string>`
- **Access:** Public
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Campus email successfully verified! You may now log in and trade."
}
```

### 3.3 Login Student
- **Method & Path:** `POST /api/v1/auth/login`
- **Access:** Public
- **Behavior:**
  - Blocks suspended accounts (`isSuspended: true`) $\rightarrow$ returns `403 Forbidden: Account is suspended`.
  - Returns JWT Bearer token upon valid credentials.
- **Response `200 OK`:** Returns `{ success: true, token, user }`.

### 3.4 Get Current Profile
- **Method & Path:** `GET /api/v1/auth/me`
- **Access:** Protected (`Bearer Token`)

---

## 4. Cloudinary Image Upload Endpoint

### 4.1 Upload Listing Images
- **Method & Path:** `POST /api/v1/upload/images`
- **Access:** Protected (`Bearer Token`)
- **Content-Type:** `multipart/form-data`
- **Form Key:** `images` (Array of files)
- **Constraints:** Max 5 images, max 5MB each, types: `image/jpeg`, `image/png`, `image/webp`.

---

## 5. Product Catalog & Listings Endpoints

### 5.1 Browse & Search Products
- **Method & Path:** `GET /api/v1/products`
- **Access:** Public
- **Query Parameters:**
  - `college`: Campus ObjectId
  - `keyword`: Search across title, description, courseCode
  - `category`: One of the 8 standardized categories:
    `Textbooks & Notes`, `Electronics & Calculators`, `Hostel Essentials`, `Lab Gear & Coats`, `Dorm Furniture`, `Sports Gear`, `Bicycles & Commute`, `Maker & Arduino`
  - `listingType`: `sell` | `free` (free listings have price = ₹0)
  - `condition`: `New` | `Like New` | `Good` | `Fair`
  - `courseCode`: e.g. `CS201`
  - `status`: `available` (default), `reserved`, `paused`, `sold`
  - `minPrice`, `maxPrice`, `sort`, `page`, `limit`
- **Response `200 OK`:** Returns paginated product list.

### 5.2 Get Single Product Details (Privacy Preserving)
- **Method & Path:** `GET /api/v1/products/:id`
- **Access:** Public
- **PRIVACY RULE:** Projections **strictly exclude** `seller.email` and `seller.phone`.

### 5.3 Create Product Listing
- **Method & Path:** `POST /api/v1/products`
- **Access:** Protected (`isVerified: true`, non-suspended)
- **Business Rules:**
  - **College Derived From User:** Do NOT provide `college` in request body; backend automatically assigns `product.college = req.user.college`.
  - **Pickup Location Validated:** `campusPickupLocation` must be present in the user's `college.pickupLocations`.
- **Request Body:**
```json
{
  "title": "Casio FX-991CW Advanced ClassWiz Calculator",
  "description": "Purchased fresh in Jan, all QR functions intact. Battery mint.",
  "listingType": "sell",
  "category": "Electronics & Calculators",
  "condition": "Like New",
  "price": 650,
  "originalPrice": 1395,
  "images": ["https://res.cloudinary.com/uniloop/image/upload/v1728500000/campus/casio.webp"],
  "campusPickupLocation": "Central Library Steps"
}
```
- **Response `201 Created`:** Returns created product object.

### 5.4 Update Listing
- **Method & Path:** `PUT /api/v1/products/:id`
- **Access:** Protected (Listing Owner Only)

### 5.5 Toggle Listing Status (Pause / Resume)
- **Method & Path:** `PATCH /api/v1/products/:id/status`
- **Access:** Protected (Listing Owner Only)
- **Request Body:**
```json
{
  "status": "paused"
}
```
*(Can toggle between `available` and `paused`. Cannot manually force to `reserved` or `sold` via this endpoint).*

### 5.6 Delete Listing (Blocked When Reserved)
- **Method & Path:** `DELETE /api/v1/products/:id`
- **Access:** Protected (Listing Owner Only)
- **Business Rule:**
  - If `product.status === 'reserved'` and `reservedUntil > Date.now()`, delete is **blocked** $\rightarrow$ returns `409 Conflict: Cannot delete an actively reserved product. Wait for 48-hour hold to expire or cancel reservation.`

### 5.7 Get Logged-in User's Listings
- **Method & Path:** `GET /api/v1/users/me/listings`
- **Access:** Protected (`Bearer Token`)
- **Response `200 OK`:** Returns array of all listings created by the logged-in student, including `available`, `reserved`, `paused`, and `sold`.

---

## 6. Student Dashboard Summary Endpoint

### 6.1 Get Dashboard Statistics
- **Method & Path:** `GET /api/v1/dashboard/stats`
- **Access:** Protected
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "activeListingsCount": 3,
    "reservedListingsCount": 1,
    "soldListingsCount": 2,
    "pendingIncomingRequests": 4,
    "activeOutgoingRequests": 1,
    "completedTrades": 2
  }
}
```

---

## 7. Buy Requests & Atomic Reservation Endpoints

### 7.1 Create Buy Request (Verification & Campus Guard)
- **Method & Path:** `POST /api/v1/requests`
- **Access:** Protected (Buyer != Seller)
- **Business Rules:**
  - **Requires `isVerified: true`:** Unverified students receive `403 Forbidden: Please verify your campus email before submitting buy requests.`
  - **Same-College Only:** Buyer's `college` must match Product's `college`. If mismatched, returns `403 Forbidden: Cross-campus requests are not permitted.`
  - **Partial Unique Index:** Returns `409 Conflict` if buyer already has an active (`pending` or `accepted`) request on this product.
- **Request Body:**
```json
{
  "productId": "6704b3caf89e1a0012345680",
  "offeredPrice": 420,
  "message": "Can meet outside library at 4 PM.",
  "buyerContact": "+919819876543 (WhatsApp)"
}
```
- **Response `201 Created`:** Returns created request (Notice: PIN is NOT generated yet; PIN is generated at accept time).

### 7.2 Get Incoming Requests (For Seller)
- **Method & Path:** `GET /api/v1/requests/incoming`
- **Access:** Protected

### 7.3 Get Outgoing Requests (For Buyer)
- **Method & Path:** `GET /api/v1/requests/outgoing`
- **Access:** Protected
- **PRIVACY & PIN DISCLOSURE:**
  - If `status === 'accepted'`, this response returns:
    1. Seller verified contact (`+919820123456`).
    2. The 4-digit `handoverPin` (generated at accept time via `crypto.randomInt`).
  - If `status === 'pending'`, seller contact and PIN are undefined.

### 7.4 Transactional Accept Request (48-Hour Hold)
- **Method & Path:** `PATCH /api/v1/requests/:id/status`
- **Access:** Protected (Seller Only for `accepted`/`rejected`, Buyer for `cancelled`)
- **Transactional Operation:**
  - Requires `request.status === 'pending'`.
  - Runs in a MongoDB session transaction.
  - Queries `Product.findOneAndUpdate` matching `{ status: 'available' }` OR `{ status: 'reserved', reservedUntil: { $lt: now } }` (treats expired holds as available).
  - Generates 4-digit `handoverPin` via `crypto.randomInt(1000, 10000).toString()`.
  - Sets product `status: 'reserved'` and `reservedUntil: Date.now() + 48h`.
- **Request Body:**
```json
{
  "status": "accepted"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Request accepted. Item is now reserved for 48 hours.",
  "data": {
    "requestId": "6704b5f9f89e1a0012345701",
    "status": "accepted",
    "reservedUntil": "2026-10-11T22:30:00.000Z"
  }
}
```
- **Response `409 Conflict` (Race Condition):**
```json
{
  "success": false,
  "message": "Item is no longer available or already reserved"
}
```

---

## 8. Dual Handover Confirmation Endpoint

### 8.1 Confirm In-Person Handover
- **Method & Path:** `POST /api/v1/requests/:id/confirm-handover`
- **Access:** Protected (Buyer or Seller of this request)
- **Handshake Logic:**
  - **If Buyer:** Confirms with a button click. Request body can be `{}`. Backend sets `buyerHandoverConfirmed = true`.
  - **If Seller:** Must enter the 4-digit PIN provided by the buyer. Request body: `{ "handoverPin": "4829" }`.
    - If PIN matches: sets `sellerHandoverConfirmed = true`.
    - If PIN fails: increments `handoverAttempts`. If `handoverAttempts >= 5`, returns `429: Too many failed PIN attempts. Handover is locked.`
  - **Expiration Gate:** If `product.reservedUntil < Date.now()`, request is rejected with `400: Reservation window has expired. Deal cancelled.`
  - **Final Transition:** When both flags are true:
    - Product status transitions to `sold`.
    - BuyRequest status transitions to `completed`.
- **Response `200 OK` (Partial confirmation):**
```json
{
  "success": true,
  "message": "Handover confirmed on your side. Awaiting other party's confirmation.",
  "data": {
    "sellerHandoverConfirmed": false,
    "buyerHandoverConfirmed": true,
    "productStatus": "reserved"
  }
}
```
- **Response `200 OK` (Both confirmed - Complete):**
```json
{
  "success": true,
  "message": "Mutual handover verified! Item status updated to SOLD.",
  "data": {
    "sellerHandoverConfirmed": true,
    "buyerHandoverConfirmed": true,
    "productStatus": "sold",
    "requestStatus": "completed"
  }
}
```
