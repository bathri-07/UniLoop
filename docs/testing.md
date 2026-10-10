# UniLoop — Testing Strategy & Verification Guide

**Goal:** Bulletproof evaluation defense and 100% bug-free viva demonstration.  
**Stack:** Vitest / Jest + Supertest (Backend), React Testing Library (Frontend)  
**Locale / Currency:** Indian Campus Context (INR `₹`, Phone `+91`)  

---

## 1. Automated Integration Test Suite Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Critical Test Suites                            │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Domain Validation & Auth (Rejection of foreign/unverified domains)  │
│ 2. Privacy Leak Prevention (Seller phone/email never exposed in detail)│
│ 3. Atomic Concurrent Reservation (Zero race conditions on accept)      │
│ 4. Dual Handover Confirmation (Item marked 'sold' only upon mutual PIN)│
│ 5. Account Suspension Gate (Suspended users blocked immediately)       │
│ 6. Cross-Campus Guard (Rejection of requests from outside colleges)    │
│ 7. PIN Lockout Defense (Locks after 5 failed attempts)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dedicated Security & Concurrency Test Specifications

### 2.1 Test Suite 1: Unauthorized Domain & Email Verification (`tests/auth.test.ts`)
```typescript
describe('POST /api/v1/auth/register', () => {
  it('should REJECT registration with a non-campus public domain (e.g., gmail.com)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Intruder',
        email: 'intruder@gmail.com',
        password: 'StrongPassword123!',
        collegeId: iitbCollegeId,
        phone: '+919820000000'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email domain is not authorized for selected campus');
  });

  it('should ACCEPT registration with authorized campus domain and send verification link', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Rahul Mehra',
        email: 'rahul.mech26@iitb.ac.in',
        password: 'StrongPassword123!',
        collegeId: iitbCollegeId,
        phone: '+919819876543'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isVerified).toBe(false);
    expect(res.body.message).toBe('Registration successful. Please verify your campus email.');
  });

  it('should BLOCK suspended user from logging in or calling protected endpoints', async () => {
    await User.findByIdAndUpdate(rahulUserId, { isSuspended: true });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rahul.mech26@iitb.ac.in',
        password: 'StrongPassword123!'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Account is suspended. Please contact campus administration.');
  });
});
```

---

### 2.2 Test Suite 2: Contact Privacy Leak Prevention (`tests/privacy.test.ts`)
```typescript
describe('GET /api/v1/products/:id - Seller Privacy', () => {
  it('must NEVER leak seller phone or email to public catalog visitors', async () => {
    const res = await request(app).get(`/api/v1/products/${sampleProduct._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.product.seller).toBeDefined();
    expect(res.body.data.product.seller.name).toBe('Priya S.');
    
    // CRITICAL ASSERTIONS: Must not be exposed
    expect(res.body.data.product.seller.phone).toBeUndefined();
    expect(res.body.data.product.seller.email).toBeUndefined();
  });

  it('reveals contact details and PIN ONLY to the buyer of an ACCEPTED buy request', async () => {
    // 1. Pending request: contact and PIN remain hidden
    let outgoingRes = await request(app)
      .get('/api/v1/requests/outgoing')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(outgoingRes.body.data.requests[0].sellerContact).toBeUndefined();
    expect(outgoingRes.body.data.requests[0].handoverPin).toBeUndefined();

    // 2. Seller accepts request
    await request(app)
      .patch(`/api/v1/requests/${sampleRequestId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    // 3. Accepted request: buyer can now view seller phone and the generated PIN
    outgoingRes = await request(app)
      .get('/api/v1/requests/outgoing')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(outgoingRes.body.data.requests[0].sellerContact).toBe('+919820123456');
    expect(outgoingRes.body.data.requests[0].handoverPin).toMatch(/^\d{4}$/);
  });
});
```

---

### 2.3 Test Suite 3: Atomic Concurrent Reservation Race Condition (`tests/concurrency.test.ts`)
```typescript
describe('Atomic Reservation via findOneAndUpdate and Transactions', () => {
  it('should accept EXACTLY ONE request when seller triggers concurrent accepts, returning 409 to the other', async () => {
    const [reqA, reqB] = await Promise.all([
      createBuyRequest({ productId, buyerId: buyerAId, offeredPrice: 420 }),
      createBuyRequest({ productId, buyerId: buyerBId, offeredPrice: 400 })
    ]);

    // Simultaneous accept attempts
    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/v1/requests/${reqA._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'accepted' }),
      request(app)
        .patch(`/api/v1/requests/${reqB._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'accepted' })
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200); // Exactly one succeeds
    expect(statuses).toContain(409); // The other receives 409 Conflict

    const conflictRes = resA.status === 409 ? resA : resB;
    expect(conflictRes.body.message).toBe('Item is no longer available or already reserved');

    // Check product state: must be reserved with 48h timer
    const product = await Product.findById(productId);
    expect(product.status).toBe('reserved');
    expect(product.reservedUntil).toBeDefined();
  });
});
```

---

### 2.4 Test Suite 4: Dual Handover Confirmation & Lockout (`tests/handover.test.ts`)
```typescript
describe('POST /api/v1/requests/:id/confirm-handover', () => {
  it('buyer confirms with button, seller enters PIN to finalize', async () => {
    // 1. Buyer confirms with button
    const buyerRes = await request(app)
      .post(`/api/v1/requests/${requestId}/confirm-handover`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({});
    expect(buyerRes.status).toBe(200);
    expect(buyerRes.body.data.buyerHandoverConfirmed).toBe(true);
    expect(buyerRes.body.data.productStatus).toBe('reserved'); // Still reserved

    // 2. Seller enters correct PIN
    const sellerRes = await request(app)
      .post(`/api/v1/requests/${requestId}/confirm-handover`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ handoverPin: correctPin });
    expect(sellerRes.status).toBe(200);
    expect(sellerRes.body.data.productStatus).toBe('sold');
    expect(sellerRes.body.data.requestStatus).toBe('completed');
  });

  it('locks handover after 5 invalid PIN attempts', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post(`/api/v1/requests/${requestId}/confirm-handover`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ handoverPin: '0000' });
      expect(res.status).toBe(400);
    }

    // 5th failed attempt locks
    const lockedRes = await request(app)
      .post(`/api/v1/requests/${requestId}/confirm-handover`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ handoverPin: '0000' });
    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.message).toMatch(/Too many failed PIN attempts/i);
  });
});
```

---

## 3. DEMO_MODE Configuration & 5-Minute Viva Runbook

### 3.1 DEMO_MODE Features (`.env: DEMO_MODE=true`)
To ensure evaluations go smoothly without reliance on external SMTP or manual credential typing:
1. **1-Click Demo Login Buttons:**
   - The login page renders two quick action buttons:
     - `[Demo Login: Priya S. (Senior Seller)]`
     - `[Demo Login: Rahul M. (Fresher Buyer)]`
2. **On-Screen Email Verification Banner:**
   - Registering a new student in demo mode immediately displays the email verification link in a banner and browser toast (`"Click here to instantly verify account in Demo Mode"`).
3. **Pre-Seeded College:**
   - Pre-configures `IIT Bombay (Powai Campus)` with active campus listings.

### 3.2 The 5-Minute Live Viva Runbook
1. **Launch Stack:**
   ```bash
   npm run seed  # Seeds IIT Bombay, demo accounts, 8 design categories, listings
   npm run dev   # Starts Vite client (:5173) and Express server (:5000)
   ```
2. **Demo Step 1 (Guest View & Privacy Check - 1 Min):**
   - Open `http://localhost:5173`. Show catalog items in INR (`₹`).
   - Click on *Introduction to Algorithms (CS201)*.
   - Show evaluators that the seller's email and phone are **completely absent** from the network response and UI.
3. **Demo Step 2 (Domain Security Check - 1 Min):**
   - Click Register $\rightarrow$ enter `test@gmail.com`.
   - Click Submit $\rightarrow$ Show immediate error: `"Email domain is not authorized for selected campus"`.
   - Register with `test.cs26@iitb.ac.in` $\rightarrow$ Show Demo Mode verification link banner $\rightarrow$ Click to verify!
4. **Demo Step 3 (1-Click Login & 48h Reservation - 1.5 Mins):**
   - Use `[Demo Login: Rahul M. (Buyer)]`.
   - Open ₹420 CLRS book $\rightarrow$ click **"Request to Buy"**.
   - Switch to Seller session using `[Demo Login: Priya S. (Seller)]`.
   - Go to Dashboard $\rightarrow$ Click **"Accept Offer"**.
   - Show evaluators that the product status flips to **`reserved` (48h countdown)**.
   - Switch back to Rahul's dashboard: Rahul can now see Priya's WhatsApp number and his **4-digit Handover PIN**!
5. **Demo Step 4 (Mutual Handover & Sale - 1.5 Mins):**
   - Buyer clicks **"Confirm Handover"** button.
   - Seller enters Rahul's 4-digit PIN into the modal.
   - On submit: Product status updates to **`sold`**, and competing offers are closed.
