// Automated Test for Live Visitor Analytics API & Service with Password Protection
import { default as analyticsHandler } from './api/analytics.js';
import { ADMIN_PASSWORD } from './src/services/analyticsService.js';
import { formatAndroidModel, resolveIPhoneModel } from './src/services/deviceResolver.js';
import assert from 'node:assert';

console.log('--- STARTING ANALYTICS & PASSWORD TESTS ---');

// Mock helpers
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  // 1. Test Password constant
  console.log('1. Checking Admin Password configuration...');
  assert.strictEqual(ADMIN_PASSWORD, 'Atlera@2009');
  console.log('✓ Admin password verified as "Atlera@2009"');

  // 2. Test Mobile Device Name Resolution Engine
  console.log('2. Testing Mobile Device Name Resolver...');
  const iPhoneName = resolveIPhoneModel(393, 852, 3);
  assert.strictEqual(iPhoneName, 'iPhone 15 Pro / 15 / 14 Pro');

  const s23Name = formatAndroidModel('SM-S918B');
  assert.strictEqual(s23Name, 'Samsung Galaxy S23 Ultra');

  const pixelName = formatAndroidModel('Pixel 7');
  assert.strictEqual(pixelName, 'Google Pixel 7');
  console.log('✓ Mobile resolvers working cleanly');

  // 3. Test unauthorized GET (no email or password)
  console.log('3. Testing GET without credentials (should be 403)...');
  const reqNoAuth = { method: 'GET', url: '/api/analytics', headers: {}, query: {} };
  const resNoAuth = createMockRes();
  await analyticsHandler(reqNoAuth, resNoAuth);
  assert.strictEqual(resNoAuth.statusCode, 403);
  assert.strictEqual(resNoAuth.body.ok, false);
  console.log('✓ Missing credentials correctly rejected with 403');

  // 4. Test unauthorized GET (correct email, WRONG password)
  console.log('4. Testing GET with correct email but WRONG password (should be 403)...');
  const reqWrongPass = {
    method: 'GET',
    url: '/api/analytics?email=teamalumorg@gmail.com&key=wrongpass',
    headers: {},
    query: { email: 'teamalumorg@gmail.com', key: 'wrongpass' }
  };
  const resWrongPass = createMockRes();
  await analyticsHandler(reqWrongPass, resWrongPass);
  assert.strictEqual(resWrongPass.statusCode, 403);
  assert.strictEqual(resWrongPass.body.ok, false);
  console.log('✓ Wrong password correctly rejected with 403');

  // 5. Test unauthorized GET (correct email, NO password)
  console.log('5. Testing GET with correct email but NO password (should be 403)...');
  const reqNoPass = {
    method: 'GET',
    url: '/api/analytics?email=teamalumorg@gmail.com',
    headers: {},
    query: { email: 'teamalumorg@gmail.com' }
  };
  const resNoPass = createMockRes();
  await analyticsHandler(reqNoPass, resNoPass);
  assert.strictEqual(resNoPass.statusCode, 403);
  assert.strictEqual(resNoPass.body.ok, false);
  console.log('✓ Email without password correctly rejected with 403');

  // 6. Test authorized GET (correct email AND correct password Atlera@2009)
  console.log('6. Testing GET with correct email AND password Atlera@2009 (should be 200)...');
  const reqAdmin = {
    method: 'GET',
    url: '/api/analytics?email=teamalumorg@gmail.com&key=Atlera@2009',
    headers: {},
    query: { email: 'teamalumorg@gmail.com', key: 'Atlera@2009' }
  };
  const resAdmin = createMockRes();
  await analyticsHandler(reqAdmin, resAdmin);
  assert.strictEqual(resAdmin.statusCode, 200);
  assert.strictEqual(resAdmin.body.ok, true);
  console.log('✓ Authorized admin with Atlera@2009 granted 200 access');

  // 7. Test POST real visit
  console.log('7. Testing live visitor tracking POST...');
  const reqPost = {
    method: 'POST',
    url: '/api/analytics',
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)'
    },
    body: {
      visitorId: 'real_visitor_abc',
      sessionId: 'sess_1',
      path: '/focus',
      device: 'mobile',
      deviceName: 'iPhone 15 Pro',
      browser: 'Safari',
      os: 'iOS',
      referrer: 'https://google.com',
      timestamp: new Date().toISOString()
    }
  };
  const resPost = createMockRes();
  await analyticsHandler(reqPost, resPost);
  assert.strictEqual(resPost.statusCode, 200);
  assert.strictEqual(resPost.body.ok, true);
  console.log('✓ Real visitor logged');

  console.log('\n--- ALL PASSWORD & ANALYTICS TESTS PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
