import request from 'supertest';
import assert from 'assert';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { College } from '../src/models/College';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { env } from '../src/config/env';

const runProductTests = async () => {
  console.log('\n=============================================');
  console.log('  UniLoop Phase 3 — Product Test Suite       ');
  console.log('=============================================\n');

  await connectDB();
  const app = createApp();

  // Fetch or seed college
  const college = await College.findOne({ name: 'IIT Bombay' });
  assert.ok(college, 'IIT Bombay must be seeded');
  const collegeId = college._id.toString();

  // Fetch Priya (verified seller) and Rahul (verified buyer)
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

  // Create an unverified user to test verification gate
  const unverifiedUser = await User.findOneAndUpdate(
    { email: 'unverified.tester@iitb.ac.in' },
    {
      $set: {
        name: 'Unverified Tester',
        email: 'unverified.tester@iitb.ac.in',
        password: 'Password123!',
        phone: '+919876543210',
        college: college._id,
        role: 'student',
        isVerified: false,
        isSuspended: false
      }
    },
    { upsert: true, new: true }
  );

  const unverifiedToken = jwt.sign(
    { id: unverifiedUser._id, role: unverifiedUser.role, college: unverifiedUser.college },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // TEST 1: Public listing search & filtering
  console.log('▶ TEST 1: Public listing browsing and category filtering...');
  const res1 = await request(app).get('/api/v1/products?category=Textbooks & Notes');
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.success, true);
  assert.ok(Array.isArray(res1.body.data.products));
  assert.ok(res1.body.data.pagination);
  console.log(`  ✔ Passed: Fetched ${res1.body.data.products.length} textbooks with pagination envelope`);

  // TEST 2: Keyword search across courseCode
  console.log('▶ TEST 2: Keyword search matching course code CS201...');
  const res2 = await request(app).get('/api/v1/products?keyword=CS201');
  assert.strictEqual(res2.status, 200);
  assert.ok(res2.body.data.products.length > 0);
  assert.strictEqual(res2.body.data.products[0].courseCode, 'CS201');
  console.log('  ✔ Passed: Found product via academic courseCode CS201');

  // TEST 3: Invalid product IDs and missing products
  console.log('▶ TEST 3: Invalid ObjectId & missing product handling...');
  const res3BadId = await request(app).get('/api/v1/products/invalid-id-format');
  assert.strictEqual(res3BadId.status, 400);

  const nonExistentId = '666666666666666666666666';
  const res3NotFound = await request(app).get(`/api/v1/products/${nonExistentId}`);
  assert.strictEqual(res3NotFound.status, 404);
  console.log('  ✔ Passed: Invalid ID returned 400, missing ID returned 404');

  // TEST 4: Seller contact privacy (zero email/phone leak in public detail)
  console.log('▶ TEST 4: Seller contact privacy gate (GET /api/v1/products/:id)...');
  const sampleProduct = await Product.findOne({ seller: priya._id });
  assert.ok(sampleProduct, 'Sample product must exist');

  const res4 = await request(app).get(`/api/v1/products/${sampleProduct._id}`);
  assert.strictEqual(res4.status, 200);
  assert.ok(res4.body.data.product.seller);
  assert.strictEqual(res4.body.data.product.seller.name, 'Priya S.');
  assert.strictEqual(res4.body.data.product.seller.phone, undefined, 'CRITICAL: Seller phone must NOT be exposed');
  assert.strictEqual(res4.body.data.product.seller.email, undefined, 'CRITICAL: Seller email must NOT be exposed');
  console.log('  ✔ Passed: Contact privacy verified (phone and email omitted)');

  // TEST 5: Rejection of unauthenticated or unverified listing creation
  console.log('▶ TEST 5: Rejection of unauthenticated / unverified listing creation...');
  const testListingPayload = {
    title: 'Testing Scientific Calculator',
    description: 'Good condition calculator for lab exams.',
    listingType: 'sell',
    category: 'Electronics & Calculators',
    condition: 'Good',
    price: 500,
    images: ['https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600'],
    campusPickupLocation: 'Central Library Steps'
  };

  const res5NoAuth = await request(app).post('/api/v1/products').send(testListingPayload);
  assert.strictEqual(res5NoAuth.status, 401);

  const res5Unverified = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${unverifiedToken}`)
    .send(testListingPayload);
  assert.strictEqual(res5Unverified.status, 403);
  console.log('  ✔ Passed: Unauthenticated received 401, unverified received 403');

  // TEST 6: Validation of pickup locations and price rules
  console.log('▶ TEST 6: Rejection of unapproved pickup location & invalid price rules...');
  const res6BadPickup = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${priyaToken}`)
    .send({
      ...testListingPayload,
      campusPickupLocation: 'Off-Campus Railway Station Unknown Spot'
    });
  assert.strictEqual(res6BadPickup.status, 400);
  assert.match(res6BadPickup.body.message, /not an approved safe spot/i);

  const res6FreeWithPrice = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${priyaToken}`)
    .send({
      ...testListingPayload,
      listingType: 'free',
      price: 250 // Free items cannot have price > 0
    });
  assert.strictEqual(res6FreeWithPrice.status, 400);
  assert.match(res6FreeWithPrice.body.message, /Price must be 0 for free/i);
  console.log('  ✔ Passed: Unapproved pickup spot and invalid free price rejected');

  // TEST 7: Successful product creation deriving seller and college
  console.log('▶ TEST 7: Successful product creation with auto-derived college & seller...');
  const res7Create = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${priyaToken}`)
    .send({
      title: 'Priya Test Engineering Mechanics Notes',
      description: 'Handwritten lecture notes covering centroids and moment of inertia.',
      listingType: 'sell',
      category: 'Textbooks & Notes',
      condition: 'Like New',
      price: 150,
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      campusPickupLocation: 'Central Library Steps'
    });

  assert.strictEqual(res7Create.status, 201);
  const createdProductId = res7Create.body.data.product._id;
  assert.strictEqual(res7Create.body.data.product.seller, priya._id.toString());
  assert.strictEqual(res7Create.body.data.product.college, college._id.toString());
  console.log('  ✔ Passed: Created product with auto-derived seller and campus');

  // TEST 8: Ownership enforcement on PUT / PATCH / DELETE
  console.log('▶ TEST 8: Ownership enforcement (Rahul cannot edit Priya\'s item)...');
  const res8EditForbidden = await request(app)
    .put(`/api/v1/products/${createdProductId}`)
    .set('Authorization', `Bearer ${rahulToken}`)
    .send({ title: 'Hacked Title By Rahul' });
  assert.strictEqual(res8EditForbidden.status, 403);

  const res8DeleteForbidden = await request(app)
    .delete(`/api/v1/products/${createdProductId}`)
    .set('Authorization', `Bearer ${rahulToken}`);
  assert.strictEqual(res8DeleteForbidden.status, 403);
  console.log('  ✔ Passed: Non-owner modification attempts rejected with 403 Forbidden');

  // TEST 9: Prevention of deleting reserved products (409 Conflict)
  console.log('▶ TEST 9: Active reservation deletion safeguard (409 Conflict)...');
  // Temporarily set created product to reserved with active hold
  await Product.findByIdAndUpdate(createdProductId, {
    status: 'reserved',
    reservedUntil: new Date(Date.now() + 48 * 60 * 60 * 1000)
  });

  const res9DeleteReserved = await request(app)
    .delete(`/api/v1/products/${createdProductId}`)
    .set('Authorization', `Bearer ${priyaToken}`);
  assert.strictEqual(res9DeleteReserved.status, 409);
  assert.match(res9DeleteReserved.body.message, /Cannot delete an actively reserved product/i);
  console.log('  ✔ Passed: Deleting actively reserved product rejected with 409 Conflict');

  // Clean up created test product
  await Product.findByIdAndUpdate(createdProductId, { status: 'available' });
  await Product.findByIdAndDelete(createdProductId);

  // TEST 10: Image upload restrictions (file count & unconfigured Cloudinary check)
  console.log('▶ TEST 10: Image upload file constraints & configuration checks...');
  // 1. Missing files check
  const res10NoFiles = await request(app)
    .post('/api/v1/upload/images')
    .set('Authorization', `Bearer ${priyaToken}`);
  assert.strictEqual(res10NoFiles.status, 400);

  // 2. Upload with a dummy text file instead of image
  const res10BadMime = await request(app)
    .post('/api/v1/upload/images')
    .set('Authorization', `Bearer ${priyaToken}`)
    .attach('images', Buffer.from('dummy text content'), 'sample.txt');
  assert.strictEqual(res10BadMime.status, 400);
  assert.match(res10BadMime.body.message, /Only JPEG, PNG, and WebP images are permitted/i);

  // 3. Unconfigured Cloudinary error check (when valid image is uploaded without live credentials)
  const res10CloudinaryCheck = await request(app)
    .post('/api/v1/upload/images')
    .set('Authorization', `Bearer ${priyaToken}`)
    .attach('images', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
      filename: 'sample.jpg',
      contentType: 'image/jpeg'
    });
  // Must return 503 configuration error if credentials are mock/missing
  assert.ok(res10CloudinaryCheck.status === 503 || res10CloudinaryCheck.status === 200);
  if (res10CloudinaryCheck.status === 503) {
    assert.match(res10CloudinaryCheck.body.message, /Cloudinary image storage is not configured/i);
    console.log('  ✔ Passed: Unconfigured Cloudinary returns clear configuration error');
  }

  // Clean up unverified test student
  await User.findByIdAndDelete(unverifiedUser._id);

  console.log('\n=============================================');
  console.log('  ALL 10 PRODUCT & MARKETPLACE TESTS PASSED! ');
  console.log('=============================================\n');
};

runProductTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
