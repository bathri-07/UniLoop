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
import { reconcileProductReservation } from '../src/controllers/requestController';

const runRequestTests = async () => {
  console.log('\n=============================================');
  console.log('  UniLoop Phase 4 — Buy Request Test Suite   ');
  console.log('=============================================\n');

  await connectDB();
  const app = createApp();

  // Ensure BuyRequest and Product schema indexes are initialized
  await BuyRequest.init();
  await Product.init();

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

  // Tracking array for clean teardown of all test items created across suites
  const extraProductIds: mongoose.Types.ObjectId[] = [];
  const extraRequestIds: mongoose.Types.ObjectId[] = [];

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

    // =========================================================================
    // PHASE 4 STEP 2 — LIFECYCLE TESTS
    // =========================================================================

    // -------------------------------------------------------------------------
    // TEST 11: Seller successfully accepts a pending request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 11: Seller accepts pending request & creates atomic reservation...');
    const rahulRequest = await BuyRequest.findOne({ product: testProductId, buyer: rahul._id, status: 'pending' });
    assert.ok(rahulRequest, 'Rahul request must exist');

    const res11 = await request(app)
      .patch(`/api/v1/requests/${rahulRequest._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });

    assert.strictEqual(res11.status, 200, `Expected 200, got ${res11.status}`);
    assert.strictEqual(res11.body.success, true);
    assert.strictEqual(res11.body.data.status, 'accepted');

    // Database assertions
    const dbReq11 = await BuyRequest.findById(rahulRequest._id);
    const dbProd11 = await Product.findById(testProductId);
    assert.strictEqual(dbReq11?.status, 'accepted');
    assert.strictEqual(dbProd11?.status, 'reserved');
    assert.strictEqual(dbProd11?.reservedFor?.toString(), rahul._id.toString());
    console.log('  ✔ Passed: Seller accepted request, product reserved atomically');

    // -------------------------------------------------------------------------
    // TEST 12: Accepted request and product reservation agree on the owning request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 12: Product reservation and request mutually agree on owning request...');
    assert.ok(dbProd11?.reservedRequest, 'Product must store reservedRequest ObjectId');
    assert.strictEqual(
      dbProd11?.reservedRequest?.toString(),
      rahulRequest._id.toString(),
      'Product reservedRequest must match accepted BuyRequest ID'
    );
    console.log('  ✔ Passed: Product and Request documents agree on owning request ID');

    // -------------------------------------------------------------------------
    // TEST 13: Reservation duration is approximately 48 hours (with time tolerance)
    // -------------------------------------------------------------------------
    console.log('▶ TEST 13: Reservation duration is exactly 48 hours within tolerance...');
    const expectedExpiry = Date.now() + 48 * 60 * 60 * 1000;
    const actualExpiry = new Date(dbProd11!.reservedUntil!).getTime();
    const diffMs = Math.abs(actualExpiry - expectedExpiry);
    assert.ok(diffMs < 5000, `Expected expiry within 5s of 48h, got difference of ${diffMs}ms`);
    console.log(`  ✔ Passed: Reservation duration is 48 hours (measured drift: ${diffMs}ms)`);

    // -------------------------------------------------------------------------
    // TEST 14: Seller rejects a pending request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 14: Seller rejects a pending request...');
    const prod14 = await Product.create({
      title: 'Reject Test Book',
      description: 'Test product for rejection test',
      listingType: 'sell',
      category: 'Textbooks & Notes',
      condition: 'Good',
      price: 200,
      campusPickupLocation: 'Central Library Steps',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod14._id);

    const req14 = await BuyRequest.create({
      product: prod14._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 200,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(req14._id);

    const res14 = await request(app)
      .patch(`/api/v1/requests/${req14._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'rejected' });

    assert.strictEqual(res14.status, 200);
    assert.strictEqual(res14.body.data.status, 'rejected');

    // Database assertions
    const dbReq14 = await BuyRequest.findById(req14._id);
    const dbProd14 = await Product.findById(prod14._id);
    assert.strictEqual(dbReq14?.status, 'rejected');
    assert.strictEqual(dbProd14?.status, 'available');
    assert.strictEqual(dbProd14?.reservedRequest, undefined);
    console.log('  ✔ Passed: Request rejected, product remains available');

    // -------------------------------------------------------------------------
    // TEST 15: Buyer cancels their own pending request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 15: Buyer cancels their own pending request...');
    const prod15 = await Product.create({
      title: 'Cancel Test Calculator',
      description: 'Test product for cancellation test',
      listingType: 'sell',
      category: 'Electronics & Calculators',
      condition: 'Like New',
      price: 500,
      campusPickupLocation: 'Student Activity Center (SAC)',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod15._id);

    const req15 = await BuyRequest.create({
      product: prod15._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 500,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(req15._id);

    const res15 = await request(app)
      .patch(`/api/v1/requests/${req15._id}/status`)
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ status: 'cancelled' });

    assert.strictEqual(res15.status, 200);
    assert.strictEqual(res15.body.data.status, 'cancelled');

    // Database assertions
    const dbReq15 = await BuyRequest.findById(req15._id);
    assert.strictEqual(dbReq15?.status, 'cancelled');
    console.log('  ✔ Passed: Buyer successfully cancelled their pending request');

    // -------------------------------------------------------------------------
    // TEST 16: Buyer cannot cancel another buyer's request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 16: Buyer cannot cancel another buyer request (403 Forbidden)...');
    const req16 = await BuyRequest.create({
      product: prod15._id,
      buyer: secondBuyer._id,
      seller: priya._id,
      offeredPrice: 480,
      buyerContact: '+919876543299',
      status: 'pending'
    });
    extraRequestIds.push(req16._id);

    // Rahul tries to cancel Second Buyer's request
    const res16 = await request(app)
      .patch(`/api/v1/requests/${req16._id}/status`)
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ status: 'cancelled' });

    assert.strictEqual(res16.status, 403);
    assert.match(res16.body.message, /permission to cancel/i);

    const dbReq16 = await BuyRequest.findById(req16._id);
    assert.strictEqual(dbReq16?.status, 'pending', 'Status must remain pending');
    console.log('  ✔ Passed: Non-owner cancellation rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 17: Non-owner cannot accept or reject a request
    // -------------------------------------------------------------------------
    console.log('▶ TEST 17: Non-owner cannot accept or reject a request (403 Forbidden)...');
    // Rahul (not the seller) tries to accept req16
    const res17Accept = await request(app)
      .patch(`/api/v1/requests/${req16._id}/status`)
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res17Accept.status, 403);
    assert.match(res17Accept.body.message, /permission to accept/i);

    // Rahul tries to reject req16
    const res17Reject = await request(app)
      .patch(`/api/v1/requests/${req16._id}/status`)
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ status: 'rejected' });
    assert.strictEqual(res17Reject.status, 403);
    assert.match(res17Reject.body.message, /permission to reject/i);

    const dbReq17 = await BuyRequest.findById(req16._id);
    assert.strictEqual(dbReq17?.status, 'pending', 'Status must remain pending');
    console.log('  ✔ Passed: Non-owner accept/reject rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 18: Invalid status transitions are rejected
    // -------------------------------------------------------------------------
    console.log('▶ TEST 18: Invalid status transitions are rejected (400 Bad Request)...');
    // req14 is already 'rejected' from TEST 14
    const res18AcceptRejected = await request(app)
      .patch(`/api/v1/requests/${req14._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res18AcceptRejected.status, 400);
    assert.match(res18AcceptRejected.body.message, /Cannot accept a request with status 'rejected'/i);

    // req14 is rejected, Rahul tries to cancel it
    const res18CancelRejected = await request(app)
      .patch(`/api/v1/requests/${req14._id}/status`)
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ status: 'cancelled' });
    assert.strictEqual(res18CancelRejected.status, 400);

    const dbReq18 = await BuyRequest.findById(req14._id);
    assert.strictEqual(dbReq18?.status, 'rejected');
    console.log('  ✔ Passed: Invalid transitions on finalized requests rejected with 400');

    // -------------------------------------------------------------------------
    // TEST 19: Sold and paused products cannot be accepted
    // -------------------------------------------------------------------------
    console.log('▶ TEST 19: Sold and paused products cannot be accepted (400 Bad Request)...');
    const prod19 = await Product.create({
      title: 'Status Test Lab Coat',
      description: 'Test product for paused and sold checks',
      listingType: 'sell',
      category: 'Lab Gear & Coats',
      condition: 'Good',
      price: 250,
      campusPickupLocation: 'Central Library Steps',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'sold'
    });
    extraProductIds.push(prod19._id);

    const req19 = await BuyRequest.create({
      product: prod19._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 250,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(req19._id);

    // 19a. Product is sold
    const res19Sold = await request(app)
      .patch(`/api/v1/requests/${req19._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res19Sold.status, 400);
    assert.match(res19Sold.body.message, /sold/i);

    // 19b. Product is paused
    await Product.findByIdAndUpdate(prod19._id, { status: 'paused' });
    const res19Paused = await request(app)
      .patch(`/api/v1/requests/${req19._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res19Paused.status, 400);
    assert.match(res19Paused.body.message, /paused/i);

    const dbReq19 = await BuyRequest.findById(req19._id);
    assert.strictEqual(dbReq19?.status, 'pending', 'Request must remain pending');
    console.log('  ✔ Passed: Sold and paused listings cannot be accepted');

    // -------------------------------------------------------------------------
    // TEST 20: An expired reservation can be claimed again safely
    // -------------------------------------------------------------------------
    console.log('▶ TEST 20: Expired reservation can be claimed safely by another buyer...');
    const prod20 = await Product.create({
      title: 'Expired Hold Dorm Chair',
      description: 'Chair test for expired hold claim',
      listingType: 'sell',
      category: 'Dorm Furniture',
      condition: 'Fair',
      price: 600,
      campusPickupLocation: 'Main Canteen / Nescafe Hub',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'reserved',
      reservedUntil: new Date(Date.now() - 3600 * 1000) // Expired 1 hour ago!
    });
    extraProductIds.push(prod20._id);

    // Old request that held the expired hold
    const reqOld = await BuyRequest.create({
      product: prod20._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 600,
      buyerContact: '+919876543210',
      status: 'accepted'
    });
    extraRequestIds.push(reqOld._id);
    await Product.findByIdAndUpdate(prod20._id, { reservedRequest: reqOld._id, reservedFor: rahul._id });

    // New competing pending request from Second Buyer
    const reqNew = await BuyRequest.create({
      product: prod20._id,
      buyer: secondBuyer._id,
      seller: priya._id,
      offeredPrice: 600,
      buyerContact: '+919876543299',
      status: 'pending'
    });
    extraRequestIds.push(reqNew._id);

    // Priya accepts the new request
    const res20 = await request(app)
      .patch(`/api/v1/requests/${reqNew._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });

    assert.strictEqual(res20.status, 200);

    // Database assertions:
    // 1. Old request transitioned to 'expired'
    const dbReqOld = await BuyRequest.findById(reqOld._id);
    assert.strictEqual(dbReqOld?.status, 'expired', 'Old accepted request must be reconciled to expired');

    // 2. New request is accepted
    const dbReqNew = await BuyRequest.findById(reqNew._id);
    assert.strictEqual(dbReqNew?.status, 'accepted', 'New request must become accepted');

    // 3. Product reservation points to new request and has fresh 48h hold
    const dbProd20 = await Product.findById(prod20._id);
    assert.strictEqual(dbProd20?.status, 'reserved');
    assert.strictEqual(dbProd20?.reservedRequest?.toString(), reqNew._id.toString());
    assert.strictEqual(dbProd20?.reservedFor?.toString(), secondBuyer._id.toString());
    assert.ok(dbProd20!.reservedUntil!.getTime() > Date.now(), 'Must have fresh future reservation');
    console.log('  ✔ Passed: Expired hold re-claimed safely; prior request transitioned to expired');

    // -------------------------------------------------------------------------
    // TEST 21: Concurrency race: two buyers race to reserve the same product
    // -------------------------------------------------------------------------
    console.log('▶ TEST 21: Concurrency race: two buyers race to reserve same product...');
    const prod21 = await Product.create({
      title: 'Race Condition Test Bicycle',
      description: 'Single bicycle sought by two competing buyers',
      listingType: 'sell',
      category: 'Bicycles & Commute',
      condition: 'Good',
      price: 1500,
      campusPickupLocation: 'Central Library Steps',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod21._id);

    const raceReq1 = await BuyRequest.create({
      product: prod21._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 1500,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(raceReq1._id);

    const raceReq2 = await BuyRequest.create({
      product: prod21._id,
      buyer: secondBuyer._id,
      seller: priya._id,
      offeredPrice: 1500,
      buyerContact: '+919876543299',
      status: 'pending'
    });
    extraRequestIds.push(raceReq2._id);

    // Fire simultaneous accept calls
    const [resRace1, resRace2] = await Promise.all([
      request(app)
        .patch(`/api/v1/requests/${raceReq1._id}/status`)
        .set('Authorization', `Bearer ${priyaToken}`)
        .send({ status: 'accepted' }),
      request(app)
        .patch(`/api/v1/requests/${raceReq2._id}/status`)
        .set('Authorization', `Bearer ${priyaToken}`)
        .send({ status: 'accepted' })
    ]);

    const statuses = [resRace1.status, resRace2.status].sort();
    assert.deepStrictEqual(statuses, [200, 409], 'Exactly one must succeed (200) and one must conflict (409)');

    const conflictRes = resRace1.status === 409 ? resRace1 : resRace2;
    assert.match(conflictRes.body.message, /already reserved|no longer available/i);

    // Database assertions: exactly one is accepted, one is pending
    const dbRaceReq1 = await BuyRequest.findById(raceReq1._id);
    const dbRaceReq2 = await BuyRequest.findById(raceReq2._id);
    const reqStatuses = [dbRaceReq1?.status, dbRaceReq2?.status].sort();
    assert.deepStrictEqual(reqStatuses, ['accepted', 'pending']);

    const dbProd21 = await Product.findById(prod21._id);
    assert.strictEqual(dbProd21?.status, 'reserved');
    const winningReqId = dbRaceReq1?.status === 'accepted' ? raceReq1._id : raceReq2._id;
    assert.strictEqual(dbProd21?.reservedRequest?.toString(), winningReqId.toString());
    console.log('  ✔ Passed: Concurrent reservation race resolved deterministically (1 won, 1 got 409 Conflict)');

    // -------------------------------------------------------------------------
    // TEST 22: Simulated Write 2 failure triggers product rollback (failure injection)
    // -------------------------------------------------------------------------
    console.log('▶ TEST 22: Simulated Write 2 failure triggers product rollback...');
    const prod22 = await Product.create({
      title: 'Rollback Safety Test Arduino Kit',
      description: 'Testing rollback when Write 2 throws simulated database failure',
      listingType: 'sell',
      category: 'Maker & Arduino',
      condition: 'New',
      price: 800,
      campusPickupLocation: 'Student Activity Center (SAC)',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod22._id);

    const req22 = await BuyRequest.create({
      product: prod22._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 800,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(req22._id);

    // Stub BuyRequest.findOneAndUpdate specifically for req22 acceptance write
    const originalFindOneAndUpdate = BuyRequest.findOneAndUpdate.bind(BuyRequest);
    try {
      (BuyRequest as any).findOneAndUpdate = function (...args: any[]) {
        const filter = args[0];
        const update = args[1];
        // Intercept specifically Write 2 of acceptance for req22
        if (
          filter &&
          filter._id &&
          filter._id.toString() === req22._id.toString() &&
          update &&
          update.$set &&
          update.$set.status === 'accepted'
        ) {
          throw new Error('SIMULATED_DATABASE_WRITE_FAILURE: Error updating request status to accepted');
        }
        return originalFindOneAndUpdate(...args);
      };

      const res22 = await request(app)
        .patch(`/api/v1/requests/${req22._id}/status`)
        .set('Authorization', `Bearer ${priyaToken}`)
        .send({ status: 'accepted' });

      // Must receive server error 500 from the pipeline
      assert.strictEqual(res22.status, 500);
      assert.strictEqual(res22.body.success, false);
    } finally {
      // Restore original findOneAndUpdate immediately
      BuyRequest.findOneAndUpdate = originalFindOneAndUpdate;
    }

    // Database assertions: product was rolled back to available, reservation fields cleared
    const dbProd22 = await Product.findById(prod22._id);
    assert.strictEqual(dbProd22?.status, 'available', 'Product must be rolled back to available');
    assert.ok(!dbProd22?.reservedRequest, 'reservedRequest must be cleared');
    assert.ok(!dbProd22?.reservedFor, 'reservedFor must be cleared');
    assert.ok(!dbProd22?.reservedUntil, 'reservedUntil must be cleared');

    // Assert request remained pending
    const dbReq22 = await BuyRequest.findById(req22._id);
    assert.strictEqual(dbReq22?.status, 'pending', 'Request must remain pending because acceptance write failed');
    console.log('  ✔ Passed: Write 2 database failure correctly rolled back product reservation to available and preserved pending request');

    // -------------------------------------------------------------------------
    // TEST 23: Previously cancelled request cannot be accepted
    // -------------------------------------------------------------------------
    console.log('▶ TEST 23: Previously cancelled request cannot be accepted (400 Bad Request)...');
    const prod23 = await Product.create({
      title: 'Cancelled Request Product',
      description: 'Test that cancelled request cannot be accepted',
      listingType: 'sell',
      category: 'Textbooks & Notes',
      condition: 'Good',
      price: 150,
      campusPickupLocation: 'Central Library Steps',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod23._id);

    const req23 = await BuyRequest.create({
      product: prod23._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 150,
      buyerContact: '+919876543210',
      status: 'cancelled'
    });
    extraRequestIds.push(req23._id);

    const res23 = await request(app)
      .patch(`/api/v1/requests/${req23._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });

    assert.strictEqual(res23.status, 400);
    assert.match(res23.body.message, /Cannot accept a request with status 'cancelled'/i);

    const dbProd23 = await Product.findById(prod23._id);
    assert.strictEqual(dbProd23?.status, 'available');
    assert.strictEqual(dbProd23?.reservedRequest, undefined);
    console.log('  ✔ Passed: Previously cancelled request cannot be accepted; product remains available');

    // -------------------------------------------------------------------------
    // TEST 24: Rejecting or cancelling competing requests does NOT release another buyer's active reservation
    // -------------------------------------------------------------------------
    console.log('▶ TEST 24: Reject or cancel on pending request does NOT release an active reservation held by another request...');
    const prod24 = await Product.create({
      title: 'Multi-Request Reservation Protection Product',
      description: 'Testing that non-holding request reject/cancel does not touch active hold',
      listingType: 'sell',
      category: 'Electronics & Calculators',
      condition: 'Good',
      price: 900,
      campusPickupLocation: 'Student Activity Center (SAC)',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod24._id);

    // Request 1 is accepted and holds the reservation
    const req24Winner = await BuyRequest.create({
      product: prod24._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 900,
      buyerContact: '+919876543210',
      status: 'pending'
    });
    extraRequestIds.push(req24Winner._id);

    const res24Accept = await request(app)
      .patch(`/api/v1/requests/${req24Winner._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res24Accept.status, 200);

    // Competing pending requests from secondBuyer
    const req24Comp1 = await BuyRequest.create({
      product: prod24._id,
      buyer: secondBuyer._id,
      seller: priya._id,
      offeredPrice: 850,
      buyerContact: '+919876543299',
      status: 'pending'
    });
    extraRequestIds.push(req24Comp1._id);

    // Case 24a: Seller rejects competing pending request req24Comp1
    const res24Reject = await request(app)
      .patch(`/api/v1/requests/${req24Comp1._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'rejected' });
    assert.strictEqual(res24Reject.status, 200);

    // Product must STILL be reserved for req24Winner!
    const dbProd24AfterReject = await Product.findById(prod24._id);
    assert.strictEqual(dbProd24AfterReject?.status, 'reserved');
    assert.strictEqual(dbProd24AfterReject?.reservedRequest?.toString(), req24Winner._id.toString());
    assert.strictEqual(dbProd24AfterReject?.reservedFor?.toString(), rahul._id.toString());

    // Case 24b: secondBuyer creates another pending request req24Comp2 and then cancels it
    const req24Comp2 = await BuyRequest.create({
      product: prod24._id,
      buyer: secondBuyer._id,
      seller: priya._id,
      offeredPrice: 800,
      buyerContact: '+919876543299',
      status: 'pending'
    });
    extraRequestIds.push(req24Comp2._id);

    const res24Cancel = await request(app)
      .patch(`/api/v1/requests/${req24Comp2._id}/status`)
      .set('Authorization', `Bearer ${secondBuyerToken}`)
      .send({ status: 'cancelled' });
    assert.strictEqual(res24Cancel.status, 200);

    // Product must STILL be reserved for req24Winner!
    const dbProd24AfterCancel = await Product.findById(prod24._id);
    assert.strictEqual(dbProd24AfterCancel?.status, 'reserved');
    assert.strictEqual(dbProd24AfterCancel?.reservedRequest?.toString(), req24Winner._id.toString());
    assert.strictEqual(dbProd24AfterCancel?.reservedFor?.toString(), rahul._id.toString());
    console.log('  ✔ Passed: Rejecting or cancelling competing requests never releases another buyer active reservation');

    // -------------------------------------------------------------------------
    // TEST 25: Interrupted reservation recovery via lazy reconciliation
    // -------------------------------------------------------------------------
    console.log('▶ TEST 25: Interrupted reservation recovery via reconcileProductReservation...');
    const prod25 = await Product.create({
      title: 'Interrupted Write Crash Recovery Product',
      description: 'Simulating interrupted write where Product is reserved but request remained pending',
      listingType: 'sell',
      category: 'Lab Gear & Coats',
      condition: 'New',
      price: 450,
      campusPickupLocation: 'Central Library Steps',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      seller: priya._id,
      college: college._id,
      status: 'available'
    });
    extraProductIds.push(prod25._id);

    const req25Interrupted = await BuyRequest.create({
      product: prod25._id,
      buyer: rahul._id,
      seller: priya._id,
      offeredPrice: 450,
      buyerContact: '+919876543210',
      status: 'pending' // Write 2 was never executed
    });
    extraRequestIds.push(req25Interrupted._id);

    // Manually inject the orphaned reservation state into Product (as if Write 1 committed right before a process kill)
    await Product.findByIdAndUpdate(prod25._id, {
      status: 'reserved',
      reservedRequest: req25Interrupted._id,
      reservedFor: rahul._id,
      reservedUntil: new Date(Date.now() + 48 * 3600 * 1000)
    });

    // Run reconciliation on the product
    await reconcileProductReservation(prod25._id);

    // Assert: Product reservation was safely recovered back to available because req25 was never accepted!
    const dbProd25 = await Product.findById(prod25._id);
    assert.strictEqual(dbProd25?.status, 'available', 'Orphaned hold must be recovered to available');
    assert.ok(!dbProd25?.reservedRequest, 'reservedRequest must be cleared');
    assert.ok(!dbProd25?.reservedFor, 'reservedFor must be cleared');
    assert.ok(!dbProd25?.reservedUntil, 'reservedUntil must be cleared');

    // And now a normal accept can claim it cleanly!
    const res25Accept = await request(app)
      .patch(`/api/v1/requests/${req25Interrupted._id}/status`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ status: 'accepted' });
    assert.strictEqual(res25Accept.status, 200);

    const dbProd25After = await Product.findById(prod25._id);
    assert.strictEqual(dbProd25After?.status, 'reserved');
    assert.strictEqual(dbProd25After?.reservedRequest?.toString(), req25Interrupted._id.toString());
    const dbReq25After = await BuyRequest.findById(req25Interrupted._id);
    assert.strictEqual(dbReq25After?.status, 'accepted');
    console.log('  ✔ Passed: Interrupted reservation safely recovered and re-claimed cleanly');

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up all isolated test data
    // -------------------------------------------------------------------------
    await BuyRequest.deleteMany({ product: testProduct._id });
    if (extraRequestIds.length > 0) {
      await BuyRequest.deleteMany({ _id: { $in: extraRequestIds } });
    }
    await Product.findByIdAndDelete(testProduct._id);
    if (extraProductIds.length > 0) {
      await Product.deleteMany({ _id: { $in: extraProductIds } });
    }
    await User.findByIdAndDelete(secondBuyer._id);
    await User.findByIdAndDelete(crossBuyer._id);
    await User.findByIdAndDelete(unverifiedBuyer._id);
    await College.findByIdAndDelete(otherCollege._id);
  }

  console.log('\n=============================================');
  console.log('  ALL 25 BUY REQUEST TESTS PASSED!          ');
  console.log('=============================================\n');
};

runRequestTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
