// Automated Test for Live Visitor Analytics API & Service
import { default as analyticsHandler } from './api/analytics.js';
import { isAdminEmail } from './src/services/analyticsService.js';
import assert from 'node:assert';

console.log('--- STARTING ANALYTICS TESTS ---');

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
  // 1. Test isAdminEmail logic
  console.log('1. Testing isAdminEmail helper...');
  assert.strictEqual(isAdminEmail('teamalumorg@gmail.com'), true);
  assert.strictEqual(isAdminEmail('  TEAMALUMORG@GMAIL.COM  '), true);
  assert.strictEqual(isAdminEmail('user@gmail.com'), false);
  assert.strictEqual(isAdminEmail(''), false);
  assert.strictEqual(isAdminEmail(null), false);
  console.log('✓ isAdminEmail tests passed');

  // 2. Test unauthorized GET (no email)
  console.log('2. Testing GET without email (should be 403)...');
  const reqNoAuth = {
    method: 'GET',
    url: '/api/analytics',
    headers: {},
    query: {}
  };
  const resNoAuth = createMockRes();
  await analyticsHandler(reqNoAuth, resNoAuth);
  assert.strictEqual(resNoAuth.statusCode, 403);
  assert.strictEqual(resNoAuth.body.ok, false);
  console.log('✓ Unauthorized GET without email correctly rejected with 403');

  // 3. Test unauthorized GET (wrong email)
  console.log('3. Testing GET with non-admin email (should be 403)...');
  const reqWrongAuth = {
    method: 'GET',
    url: '/api/analytics?email=randomuser@example.com',
    headers: {},
    query: { email: 'randomuser@example.com' }
  };
  const resWrongAuth = createMockRes();
  await analyticsHandler(reqWrongAuth, resWrongAuth);
  assert.strictEqual(resWrongAuth.statusCode, 403);
  assert.strictEqual(resWrongAuth.body.ok, false);
  console.log('✓ Non-admin email correctly rejected with 403');

  // 4. Test POST record visit (Desktop user)
  console.log('4. Testing POST recording desktop visit...');
  const reqPost1 = {
    method: 'POST',
    url: '/api/analytics',
    headers: {
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-city': 'San Francisco',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: {
      visitorId: 'test_vid_123',
      sessionId: 'test_sid_1',
      path: '/focus',
      device: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrer: 'https://google.com',
      timestamp: new Date().toISOString()
    }
  };
  const resPost1 = createMockRes();
  await analyticsHandler(reqPost1, resPost1);
  assert.strictEqual(resPost1.statusCode, 200);
  assert.strictEqual(resPost1.body.ok, true);
  console.log('✓ Desktop visit successfully recorded');

  // 5. Test POST record visit (Mobile user)
  console.log('5. Testing POST recording mobile visit...');
  const reqPost2 = {
    method: 'POST',
    url: '/api/analytics',
    headers: {
      'x-vercel-ip-country': 'IN',
      'x-vercel-ip-city': 'Bengaluru',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'
    },
    body: {
      visitorId: 'test_vid_456',
      sessionId: 'test_sid_2',
      path: '/settings',
      device: 'mobile',
      browser: 'Safari',
      os: 'iOS',
      referrer: '',
      timestamp: new Date().toISOString()
    }
  };
  const resPost2 = createMockRes();
  await analyticsHandler(reqPost2, resPost2);
  assert.strictEqual(resPost2.statusCode, 200);
  assert.strictEqual(resPost2.body.ok, true);
  console.log('✓ Mobile visit successfully recorded');

  // 6. Test GET analytics with authorized admin email
  console.log('6. Testing GET with authorized admin email (teamalumorg@gmail.com)...');
  const reqAdmin = {
    method: 'GET',
    url: '/api/analytics?email=teamalumorg@gmail.com',
    headers: {},
    query: { email: 'teamalumorg@gmail.com' }
  };
  const resAdmin = createMockRes();
  await analyticsHandler(reqAdmin, resAdmin);
  assert.strictEqual(resAdmin.statusCode, 200);
  assert.strictEqual(resAdmin.body.ok, true);
  const data = resAdmin.body.data;
  assert(data.totalViews >= 2, 'Total views should be at least 2');
  assert(data.uniqueVisitorsCount >= 2, 'Unique visitors should be at least 2');
  assert(data.devices.desktop >= 1, 'Should record Desktop visit');
  assert(data.devices.mobile >= 1, 'Should record Mobile visit');
  assert(Array.isArray(data.recentVisits), 'recentVisits should be an array');
  assert(data.recentVisits.length >= 2, 'recentVisits should have at least 2 items');

  console.log('✓ Admin analytics returned real metrics:');
  console.log('   Total views:', data.totalViews);
  console.log('   Unique visitors:', data.uniqueVisitorsCount);
  console.log('   Today views:', data.todayViews);
  console.log('   Devices:', JSON.stringify(data.devices));
  console.log('   Browsers:', JSON.stringify(data.browsers));
  console.log('   Recent live visit:', data.recentVisits[0]);

  console.log('\n--- ALL ANALYTICS TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
