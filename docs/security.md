# UniLoop — Security Architecture & Access Control Rules

**Document Version:** 3.0  
**Focus:** Defense-in-Depth, Strict Input Boundaries, Rate Limiting, and Concurrency Guardrails  

---

## 1. Security Infrastructure & Baseline Configuration

### 1.1 HTTP Security Headers (Helmet)
Express must mount `helmet()` at the very top of the middleware pipeline:
```typescript
import helmet from 'helmet';
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows serving Cloudinary images
  contentSecurityPolicy: false // Allows Vite dev hot-reloading
}));
```

### 1.2 Strict CORS Origin Whitelisting
CORS must reject unauthorized foreign origins:
```typescript
import cors from 'cors';
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy: Unauthorized origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));
```

### 1.3 JWT Secret & Expiry Rules
1. **Startup Check:** The application must refuse to start if `JWT_SECRET` is undefined or less than 32 characters long:
   ```typescript
   if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
     console.error('FATAL: JWT_SECRET environment variable is missing or insecure (<32 chars)');
     process.exit(1);
   }
   ```
2. **Algorithm & Expiry:** Token signed using `HS256` with strict expiration (`7d` in development).

---

## 2. Granular Rate Limiting Policies (`express-rate-limit`)

| Endpoint Category | Window | Max Attempts | Trigger & Behavior |
| :--- | :--- | :--- | :--- |
| **Auth Login (`/api/v1/auth/login`)** | 15 mins | 10 requests / IP | Prevents credential stuffing; returns `429 Too Many Requests`. |
| **Buy Requests (`/api/v1/requests`)** | 15 mins | 30 requests / User | Prevents spamming sellers with fraudulent offers. |
| **Cloudinary Upload (`/api/v1/upload/images`)** | 60 mins | 10 uploads / User | Prevents quota exhaustion and bandwidth abuse. |
| **Handover PIN (`/confirm-handover`)** | 15 mins | 5 attempts / Request | Prevents PIN brute forcing; ties into database-level 5-attempt lockout. |

---

## 3. Input Validation & Strict Schema Boundaries (Zod & ObjectIds)

### 3.1 Strict Body Parsing (`.strict()`)
All input schemas defined with Zod must call `.strict()` to reject any undeclared or unexpected properties:
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  collegeId: z.string().min(1),
  phone: z.string().regex(/^(?:\+91|91)?[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number')
}).strict(); // Rejects unexpected payload keys!
```

### 3.2 ObjectId Validation Middleware
All route parameters matching `:id` or `:collegeId` must pass ObjectId sanity checks before controller execution:
```typescript
export const validateObjectId = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        success: false,
        message: `Invalid identifier format for parameter '${paramName}'`
      });
    }
    next();
  };
};
```

---

## 4. Account Lifecycle & Suspension Enforcement

1. **Mandatory Campus Email Whitelist:**
   - Registration verifies email against `College.allowedEmailDomains`.
   - Rejects public domains (`@gmail.com`) with `400 Bad Request`.
2. **Suspension Check (`isSuspended`):**
   - The `protect` middleware fetches `user.isSuspended`.
   - If `true`, immediately halts the request with `403 Forbidden: Account is suspended`.
3. **Verification Check (`isVerified`):**
   - Creating listings or submitting buy requests strictly requires `isVerified: true`.

---

## 5. Contact Privacy & Handover PIN Security

1. **Zero Contact Leaks in Public Catalog:**
   - `GET /api/v1/products/:id` projects only `_id`, `name`, `avatar`, `role`, and `college` of the seller.
   - `phone` and `email` are omitted from the Mongoose projection query.
2. **Accept-Time PIN Generation:**
   - `handoverPin` is generated **only when the seller accepts** using `crypto.randomInt(1000, 10000).toString()`.
   - Stored in MongoDB with `{ select: false }`.
   - Revealed **only to the buyer** in their outgoing request detail.
3. **Lockout Against PIN Guessing:**
   - Sellers must input the PIN to confirm receipt.
   - Failed attempts increment `handoverAttempts`.
   - At 5 failed attempts, the request is locked (`429: Too many failed PIN attempts. Handover is locked.`).
