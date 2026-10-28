// Automated Test for Live Visitor Analytics API & Service
import { default as analyticsHandler } from './api/analytics.js';
import { isAdminEmail } from './src/services/analyticsService.js';
import { parseDeviceName, formatAndroidModel, resolveIPhoneModel } from './src/services/deviceResolver.js';
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
  // 1. Test Mobile Device Name Resolution Engine
  console.log('1. Testing Mobile Device Name Resolver...');
  const iPhoneName = resolveIPhoneModel(393, 852, 3);
  assert.strictEqual(iPhoneName, 'iPhone 15 Pro / 15 / 14 Pro');

  const s23Name = formatAndroidModel('SM-S918B');
  assert.strictEqual(s23Name, 'Samsung Galaxy S23 Ultra');

  const pixelName = formatAndroidModel('Pixel 7');
  assert.strictEqual(pixelName, 'Google Pixel 7');

  const onePlusName = formatAndroidModel('OnePlus 11');
  assert.strictEqual(onePlusName, 'OnePlus 11');

  const parsedSamsung = parseDeviceName('Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36');
  assert.strictEqual(parsedSamsung, 'Samsung Galaxy S23 Ultra');

  const parsedPixel = parseDeviceName('Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002) AppleWebKit/537.36');
  assert.strictEqual(parsedPixel, 'Google Pixel 7');

  const parsedWindows = parseDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  assert.strictEqual(parsedWindows, 'Windows PC');

  const parsedMac = parseDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  assert.strictEqual(parsedMac, 'MacBook / Mac');
  console.log('✓ All device and mobile model resolvers passed!');

  // 2. Test isAdminEmail logic
  console.log('2. Testing isAdminEmail helper...');
  assert.strictEqual(isAdminEmail('teamalumorg@gmail.com'), true);
  assert.strictEqual(isAdminEmail('  TEAMALUMORG@GMAIL.COM  '), true);
  assert.strictEqual(isAdminEmail('user@gmail.com'), false);
  assert.strictEqual(isAdminEmail(''), false);
  assert.strictEqual(isAdminEmail(null), false);
  console.log('✓ isAdminEmail tests passed');

  // 3. Test unauthorized GET (no email)
  console.log('3. Testing GET without email (should be 403)...');
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

  // 4. Test unauthorized GET (wrong email)
  console.log('4. Testing GET with non-admin email (should be 403)...');
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

  // 5. Test POST record visit (Desktop user)
  console.log('5. Testing POST recording desktop visit...');
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
  assert.strictEqual(resPost1.body.deviceName, 'Windows PC');
  console.log('✓ Desktop visit successfully recorded with deviceName: "Windows PC"');

  // 6. Test POST record visit (Samsung Galaxy S23 Mobile user)
  console.log('6. Testing POST recording Samsung Galaxy S23 mobile visit...');
  const reqPost2 = {
    method: 'POST',
    url: '/api/analytics',
    headers: {
      'x-vercel-ip-country': 'IN',
      'x-vercel-ip-city': 'Bengaluru',
      'user-agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36'
    },
    body: {
      visitorId: 'test_vid_456',
      sessionId: 'test_sid_2',
      path: '/settings',
      device: 'mobile',
      browser: 'Chrome',
      os: 'Android',
      referrer: '',
      timestamp: new Date().toISOString()
    }
  };
  const resPost2 = createMockRes();
  await analyticsHandler(reqPost2, resPost2);
  assert.strictEqual(resPost2.statusCode, 200);
  assert.strictEqual(resPost2.body.ok, true);
  assert.strictEqual(resPost2.body.deviceName, 'Samsung Galaxy S23 Ultra');
  console.log('✓ Mobile visit successfully recorded with exact mobile name: "Samsung Galaxy S23 Ultra"');

  // 7. Test GET analytics with authorized admin email
  console.log('7. Testing GET with authorized admin email (teamalumorg@gmail.com)...');
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
  assert(data.deviceModels['Samsung Galaxy S23 Ultra'] >= 1, 'Should record Samsung Galaxy S23 Ultra in deviceModels');
  assert.strictEqual(data.recentVisits[0].deviceName, 'Samsung Galaxy S23 Ultra', 'Recent visit should show deviceName');
  assert(Array.isArray(data.recentVisits), 'recentVisits should be an array');

  console.log('✓ Admin analytics returned real mobile names:');
  console.log('   Total views:', data.totalViews);
  console.log('   Device models:', JSON.stringify(data.deviceModels));
  console.log('   Recent live visit device name:', data.recentVisits[0].deviceName);

  console.log('\n--- ALL ANALYTICS & DEVICE NAME TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
