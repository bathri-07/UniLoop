import request from 'supertest';
import assert from 'assert';
import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { College } from '../src/models/College';
import { User } from '../src/models/User';

const runTests = async () => {
  console.log('\n========================================');
  console.log('  UniLoop Phase 2 — Auth Test Suite    ');
  console.log('========================================\n');

  await connectDB();
  const app = createApp();

  // Ensure IIT Bombay test college exists
  const college = await College.findOneAndUpdate(
    { name: 'IIT Bombay' },
    {
      $set: {
        name: 'IIT Bombay',
        campusLocation: 'Powai, Mumbai',
        allowedEmailDomains: ['iitb.ac.in', 'student.iitb.ac.in'],
        pickupLocations: [
          'Central Library Steps',
          'Student Activity Center (SAC)',
          'Main Canteen / Nescafe Hub',
          'Hostel Gate Foyer'
        ],
        isActive: true
      }
    },
    { upsert: true, new: true }
  );

  const collegeId = college._id.toString();

  // Clean up any previous test student
  const testEmail = 'fresh.student.test@iitb.ac.in';
  await User.deleteOne({ email: testEmail });

  let rawToken: string = '';
  let authToken: string = '';

  // TEST 1: Reject public email domain (e.g., gmail.com)
  console.log('▶ TEST 1: Reject unauthorized public email domain (@gmail.com)...');
  const res1 = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Intruder Public',
      email: 'intruder@gmail.com',
      password: 'StrongPassword123!',
      collegeId: collegeId,
      phone: '+919820000000'
    });

  assert.strictEqual(res1.status, 400, `Expected 400, got ${res1.status}`);
  assert.strictEqual(res1.body.success, false);
  assert.strictEqual(
    res1.body.message,
    'Email domain is not authorized for selected campus'
  );
  console.log('  ✔ Passed: Non-campus email rejected with 400 Bad Request');

  // TEST 2: Register with authorized campus domain
  console.log('▶ TEST 2: Register with authorized campus domain (@iitb.ac.in)...');
  const res2 = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Fresh Student',
      email: testEmail,
      password: 'StrongPassword123!',
      collegeId: collegeId,
      phone: '+919819876543'
    });

  assert.strictEqual(res2.status, 201, `Expected 201, got ${res2.status}`);
  assert.strictEqual(res2.body.success, true);
  assert.strictEqual(res2.body.data.user.isVerified, false);
  assert.ok(res2.body.data.rawToken, 'rawToken must be returned in demo mode');
  rawToken = res2.body.data.rawToken;
  console.log('  ✔ Passed: Campus domain registration succeeded with unverified state');

  // TEST 3: Block login for unverified account
  console.log('▶ TEST 3: Block login for unverified account...');
  const res3 = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: testEmail,
      password: 'StrongPassword123!'
    });

  assert.strictEqual(res3.status, 403, `Expected 403, got ${res3.status}`);
  assert.strictEqual(res3.body.success, false);
  assert.match(res3.body.message, /verify your campus email/i);
  console.log('  ✔ Passed: Unverified login blocked with 403 Forbidden');

  // TEST 4: Verify email using valid token
  console.log('▶ TEST 4: Verify campus email using valid token...');
  const res4 = await request(app)
    .get(`/api/v1/auth/verify-email?token=${rawToken}`);

  assert.strictEqual(res4.status, 200, `Expected 200, got ${res4.status}`);
  assert.strictEqual(res4.body.success, true);
  assert.match(res4.body.message, /successfully verified/i);

  const verifiedUser = await User.findOne({ email: testEmail }).select('+verificationToken');
  assert.strictEqual(verifiedUser?.isVerified, true);
  assert.strictEqual(verifiedUser?.verificationToken, undefined, 'Verification token must be cleared after use');
  console.log('  ✔ Passed: Account verified, token wiped for one-time use protection');

  // TEST 5: Reject reused verification token
  console.log('▶ TEST 5: Reject reused verification token (replay protection)...');
  const res5 = await request(app)
    .get(`/api/v1/auth/verify-email?token=${rawToken}`);

  assert.strictEqual(res5.status, 400, `Expected 400, got ${res5.status}`);
  assert.strictEqual(res5.body.success, false);
  assert.strictEqual(res5.body.message, 'Invalid or expired verification token.');
  console.log('  ✔ Passed: Token reuse rejected with 400 Bad Request');

  // TEST 6: Reject arbitrary invalid token
  console.log('▶ TEST 6: Reject arbitrary invalid token...');
  const res6 = await request(app)
    .get('/api/v1/auth/verify-email?token=bogus_random_token_12345');

  assert.strictEqual(res6.status, 400);
  console.log('  ✔ Passed: Invalid token rejected with 400 Bad Request');

  // TEST 7: Login successfully with verified account
  console.log('▶ TEST 7: Login successfully with verified account...');
  const res7 = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: testEmail,
      password: 'StrongPassword123!'
    });

  assert.strictEqual(res7.status, 200, `Expected 200, got ${res7.status}`);
  assert.strictEqual(res7.body.success, true);
  assert.ok(res7.body.data.token, 'JWT token must be present');
  assert.strictEqual(res7.body.data.user.password, undefined, 'Password must never leak in login response');
  authToken = res7.body.data.token;
  console.log('  ✔ Passed: Verified user logged in and received JWT');

  // TEST 8: Reject incorrect password
  console.log('▶ TEST 8: Reject incorrect password...');
  const res8 = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: testEmail,
      password: 'WrongPassword999!'
    });

  assert.strictEqual(res8.status, 401, `Expected 401, got ${res8.status}`);
  assert.strictEqual(res8.body.success, false);
  console.log('  ✔ Passed: Bad credentials rejected with 401 Unauthorized');

  // TEST 9: Block suspended user from logging in
  console.log('▶ TEST 9: Block suspended account from logging in...');
  const res9 = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'suspended.student@iitb.ac.in',
      password: 'DemoPassword123!'
    });

  assert.strictEqual(res9.status, 403, `Expected 403, got ${res9.status}`);
  assert.strictEqual(res9.body.success, false);
  assert.strictEqual(
    res9.body.message,
    'Account is suspended. Please contact campus administration.'
  );
  console.log('  ✔ Passed: Suspended user blocked with 403 Forbidden');

  // TEST 10: GET /api/v1/auth/me with valid Bearer token
  console.log('▶ TEST 10: Access protected GET /api/v1/auth/me with Bearer token...');
  const res10 = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(res10.status, 200, `Expected 200, got ${res10.status}`);
  assert.strictEqual(res10.body.success, true);
  assert.strictEqual(res10.body.data.user.email, testEmail);
  assert.strictEqual(res10.body.data.user.password, undefined);
  assert.strictEqual(res10.body.data.user.verificationToken, undefined);
  console.log('  ✔ Passed: Profile returned cleanly without secret leaks');

  // TEST 11: Real-time suspension gate on protected route
  console.log('▶ TEST 11: Enforce real-time suspension gate on protected route...');
  await User.updateOne({ email: testEmail }, { isSuspended: true });

  const res11 = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(res11.status, 403, `Expected 403, got ${res11.status}`);
  assert.strictEqual(
    res11.body.message,
    'Account is suspended. Please contact campus administration.'
  );
  console.log('  ✔ Passed: Token holder blocked immediately upon account suspension');

  // Clean up test student
  await User.deleteOne({ email: testEmail });

  console.log('\n========================================');
  console.log('  ALL 11 AUTHENTICATION TESTS PASSED!   ');
  console.log('========================================\n');
};

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
