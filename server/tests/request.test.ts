import request from 'supertest';
import assert from 'assert';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { College } from '../src/models/College';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { BuyRequest } from '../src/models/BuyRequest';
import { env } from '../src/config/env';

const runRequestTests = async () => {
  console.log('\n=============================================');
  console.log('  UniLoop Phase 4 — Buy Request Test Suite   ');
  console.log('=============================================\n');

  await connectDB();
  const app = createApp();

  // Ensure BuyRequest schema indexes (including partial unique index) are initialized
  await BuyRequest.init();

  // 1. Fetch IIT Bombay campus
  const college = await College.findOne({ name: 'IIT Bombay' });
  assert.ok(college, 'IIT Bombay must be seeded in the database');
  const collegeId = college._id.toString();

  // 2. Fetch Priya (seller) and Rahul (buyer)
  const priya = await User.findOne({ email: 'priya.senior@iitb.ac.in' });
  const rahul = await User.findOne({ email: 'rahul.mech26@iitb.ac.in' });
  assert.ok(priya && rahul, 'Priya and Rahul must exist in database');

  const priyaToken = jwt.sign(
    { id: priya._id, role: priya.role, college: priya.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const rahulToken = jwt.sign(
    { id: rahul._id, role: rahul.role, college: rahul.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 3. Create isolated test product owned by Priya
  const testProduct = await Product.create({
    title: 'Phase 4 Mechanics Textbook Test Listing',
    description: 'Clean isolated test listing for Phase 4 buy request verification suite',
    listingType: 'sell',
    category: 'Textbooks & Notes',
    condition: 'Good',
    price: 350,
    campusPickupLocation: 'Central Library Steps',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
    seller: priya._id,
    college: college._id,
    status: 'available'
  });
  const testProductId = testProduct._id.toString();

  // 4. Create second verified buyer in same college
  const secondBuyer = await User.findOneAndUpdate(
    { email: 'second.buyer.test@iitb.ac.in' },
    {
      $set: {
        name: 'Second Buyer',
        email: 'second.buyer.test@iitb.ac.in',
        password: 'Password123!',
        phone: '+919876543299',
        college: college._id,
        role: 'student',
        isVerified: true,
        isSuspended: false
      }
    },
    { upsert: true, new: true }
  );
  const secondBuyerToken = jwt.sign(
    { id: secondBuyer._id, role: secondBuyer.role, college: secondBuyer.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 5. Create cross-campus buyer in different college
  const otherCollege = await College.findOneAndUpdate(
    { name: 'BITS Pilani Test' },
    {
      $set: {
        name: 'BITS Pilani Test',
        campusLocation: 'Pilani, Rajasthan',
        allowedEmailDomains: ['pilani.bits-pilani.ac.in'],
        pickupLocations: ['Student Activity Center (SAC)'],
        isActive: true
      }
    },
    { upsert: true, new: true }
  );
  const crossBuyer = await User.findOneAndUpdate(
    { email: 'cross.buyer.test@pilani.bits-pilani.ac.in' },
    {
      $set: {
        name: 'Cross Campus Buyer',
        email: 'cross.buyer.test@pilani.bits-pilani.ac.in',
        password: 'Password123!',
        phone: '+919876543288',
        college: otherCollege._id,
        role: 'student',
        isVerified: true,
        isSuspended: false
      }
    },
    { upsert: true, new: true }
  );
  const crossBuyerToken = jwt.sign(
    { id: crossBuyer._id, role: crossBuyer.role, college: crossBuyer.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 6. Create unverified student in same college
  const unverifiedBuyer = await User.findOneAndUpdate(
    { email: 'unverified.buyer.test@iitb.ac.in' },
    {
      $set: {
        name: 'Unverified Buyer',
        email: 'unverified.buyer.test@iitb.ac.in',
        password: 'Password123!',
        phone: '+919876543277',
        college: college._id,
        role: 'student',
        isVerified: false,
        isSuspended: false
      }
    },
    { upsert: true, new: true }
  );
  const unverifiedBuyerToken = jwt.sign(
    { id: unverifiedBuyer._id, role: unverifiedBuyer.role, college: unverifiedBuyer.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Clean any prior test requests on test product
  await BuyRequest.deleteMany({ product: testProduct._id });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Successful request creation
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Successful request creation by verified buyer...');
    const res1 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ productId: testProductId });

    assert.strictEqual(res1.status, 201, `Expected 201, got ${res1.status}`);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.message, 'Purchase request submitted successfully');
    assert.ok(res1.body.data.request, 'Response must include created request');
    assert.strictEqual(res1.body.data.request.status, 'pending');
    assert.strictEqual(res1.body.data.request.offeredPrice, 350, 'Price must default to listing price');
    assert.strictEqual(res1.body.data.request.buyerContact, rahul.phone, 'Contact must default to buyer phone');
    console.log('  ✔ Passed: Verified buyer created buy request with 201 Created');

    // -------------------------------------------------------------------------
    // TEST 2: Unauthenticated request rejection
    // -------------------------------------------------------------------------
    console.log('▶ TEST 2: Unauthenticated request rejection...');
    const res2 = await request(app)
      .post('/api/v1/requests')
      .send({ productId: testProductId });

    assert.strictEqual(res2.status, 401, `Expected 401, got ${res2.status}`);
    assert.strictEqual(res2.body.success, false);
    assert.match(res2.body.message, /authentication required/i);
    console.log('  ✔ Passed: Missing token rejected with 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 3: Invalid product ID
    // -------------------------------------------------------------------------
    console.log('▶ TEST 3: Invalid product ID format handling...');
    const res3 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ productId: 'invalid-id-xyz' });

    assert.strictEqual(res3.status, 400, `Expected 400, got ${res3.status}`);
    assert.strictEqual(res3.body.success, false);
    console.log('  ✔ Passed: Invalid ObjectId format rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 4: Non-existent product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 4: Non-existent product handling...');
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res4 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ productId: fakeId });

    assert.strictEqual(res4.status, 404, `Expected 404, got ${res4.status}`);
    assert.strictEqual(res4.body.success, false);
    assert.strictEqual(res4.body.message, 'Product not found');
    console.log('  ✔ Passed: Non-existent product returned 404 Not Found');

    // -------------------------------------------------------------------------
    // TEST 5: Buyer requesting their own product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 5: Buyer requesting own product rejection...');
    const res5 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ productId: testProductId });

    assert.strictEqual(res5.status, 400, `Expected 400, got ${res5.status}`);
    assert.strictEqual(res5.body.success, false);
    assert.match(res5.body.message, /cannot submit a purchase request for your own listing/i);
    console.log('  ✔ Passed: Own-listing buy request blocked with 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 6: Paused or otherwise unavailable product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 6: Paused, sold, and actively reserved product rejection...');
    // 6a. Paused product
    await Product.findByIdAndUpdate(testProductId, { status: 'paused' });
    const res6Paused = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${secondBuyerToken}`)
      .send({ productId: testProductId });
    assert.strictEqual(res6Paused.status, 400, `Expected 400 for paused, got ${res6Paused.status}`);
    assert.match(res6Paused.body.message, /paused/i);

    // 6b. Sold product
    await Product.findByIdAndUpdate(testProductId, { status: 'sold' });
    const res6Sold = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${secondBuyerToken}`)
      .send({ productId: testProductId });
    assert.strictEqual(res6Sold.status, 400, `Expected 400 for sold, got ${res6Sold.status}`);
    assert.match(res6Sold.body.message, /sold/i);

    // 6c. Actively reserved product
    await Product.findByIdAndUpdate(testProductId, {
      status: 'reserved',
      reservedUntil: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });
    const res6Reserved = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${secondBuyerToken}`)
      .send({ productId: testProductId });
    assert.strictEqual(res6Reserved.status, 400, `Expected 400 for reserved, got ${res6Reserved.status}`);
    assert.match(res6Reserved.body.message, /reserved/i);

    // Restore product back to available
    await Product.findByIdAndUpdate(testProductId, { status: 'available', reservedUntil: null });
    console.log('  ✔ Passed: Ineligible product statuses properly rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 7: Duplicate active request rejection
    // -------------------------------------------------------------------------
    console.log('▶ TEST 7: Duplicate active request rejection (409 Conflict)...');
    // Rahul already has a pending request from Test 1
    const res7 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ productId: testProductId });

    assert.strictEqual(res7.status, 409, `Expected 409, got ${res7.status}`);
    assert.strictEqual(res7.body.success, false);
    assert.match(res7.body.message, /already have an active purchase request/i);
    console.log('  ✔ Passed: Duplicate active request rejected with 409 Conflict');

    // -------------------------------------------------------------------------
    // TEST 8: A different buyer can request the same eligible product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 8: A different buyer can request the same eligible product...');
    const res8 = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${secondBuyerToken}`)
      .send({
        productId: testProductId,
        offeredPrice: 320,
        message: 'Can collect this evening outside SAC.',
        buyerContact: '+919876543299 (Hostel 12)'
      });

    assert.strictEqual(res8.status, 201, `Expected 201, got ${res8.status}`);
    assert.strictEqual(res8.body.success, true);
    assert.strictEqual(res8.body.data.request.offeredPrice, 320);
    assert.strictEqual(res8.body.data.request.message, 'Can collect this evening outside SAC.');

    // Verify both Rahul and Second Buyer have active pending requests
    const activeRequests = await BuyRequest.find({
      product: testProductId,
      status: 'pending'
    });
    assert.strictEqual(activeRequests.length, 2, 'Both buyers should have active pending requests');
    console.log('  ✔ Passed: Second buyer successfully created concurrent request (2 pending requests coexist)');

    // -------------------------------------------------------------------------
    // TEST 9: Request data correctly associates authenticated buyer and product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 9: Request data associations and secrecy verification...');
    const createdRequest = res8.body.data.request;
    assert.strictEqual(createdRequest.buyer.toString(), secondBuyer._id.toString());
    assert.strictEqual(createdRequest.product.toString(), testProduct._id.toString());
    assert.strictEqual(createdRequest.seller.toString(), priya._id.toString());
    assert.strictEqual(createdRequest.status, 'pending');
    assert.strictEqual(createdRequest.sellerHandoverConfirmed, false);
    assert.strictEqual(createdRequest.buyerHandoverConfirmed, false);
    assert.strictEqual(createdRequest.handoverPin, undefined, 'handoverPin must never be exposed or pre-generated');
    assert.strictEqual((createdRequest as any).password, undefined, 'Zero secret leak');
    console.log('  ✔ Passed: Associated buyer, seller, and product correctly without secret leaks');

    // -------------------------------------------------------------------------
    // TEST 10: Appropriate status codes and response format & security gates
    // -------------------------------------------------------------------------
    console.log('▶ TEST 10: Security gates (cross-campus, unverified, strict payload)...');

    // 10a. Cross-campus rejection (403 Forbidden)
    const res10Cross = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${crossBuyerToken}`)
      .send({ productId: testProductId });
    assert.strictEqual(res10Cross.status, 403, `Expected 403 for cross-campus, got ${res10Cross.status}`);
    assert.match(res10Cross.body.message, /cross-campus/i);

    // 10b. Unverified student rejection (403 Forbidden)
    const res10Unverified = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${unverifiedBuyerToken}`)
      .send({ productId: testProductId });
    assert.strictEqual(res10Unverified.status, 403, `Expected 403 for unverified student, got ${res10Unverified.status}`);
    assert.match(res10Unverified.body.message, /verify your campus email/i);

    // 10c. Strict payload validation (undeclared key rejected with 400 Bad Request)
    const res10Strict = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        productId: testProductId,
        injectedBogusField: 'malicious payload'
      });
    assert.strictEqual(res10Strict.status, 400, `Expected 400 for strict schema violation, got ${res10Strict.status}`);
    assert.strictEqual(res10Strict.body.success, false);

    console.log('  ✔ Passed: Cross-campus (403), unverified (403), and strict Zod validation (400) verified');
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up all isolated test data
    // -------------------------------------------------------------------------
    await BuyRequest.deleteMany({ product: testProduct._id });
    await Product.findByIdAndDelete(testProduct._id);
    await User.findByIdAndDelete(secondBuyer._id);
    await User.findByIdAndDelete(crossBuyer._id);
    await User.findByIdAndDelete(unverifiedBuyer._id);
    await College.findByIdAndDelete(otherCollege._id);
  }

  console.log('\n=============================================');
  console.log('  ALL 10 BUY REQUEST TESTS PASSED!          ');
  console.log('=============================================\n');
};

runRequestTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
