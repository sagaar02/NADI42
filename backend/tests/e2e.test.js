require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const connectDB = require('../src/config/db');
const errorMiddleware = require('../src/middleware/errorMiddleware');
const authMiddleware = require('../src/middleware/authMiddleware');
const roleMiddleware = require('../src/middleware/roleMiddleware');
const { getAshaDashboard, getPhcDashboard } = require('../src/controllers/caseController');
const { seedDemoData } = require('../src/seed/seedDemoData');
const calculateRisk = require('../src/services/riskEngine');
const User = require('../src/models/User');
const Mother = require('../src/models/Mother');
const CheckIn = require('../src/models/CheckIn');
const Case = require('../src/models/Case');
const FollowUp = require('../src/models/FollowUp');
const Facility = require('../src/models/Facility');

// Create test express app
function createTestApp() {
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());

  app.use('/api/auth', require('../src/routes/authRoutes'));
  app.use('/api/mothers', require('../src/routes/motherRoutes'));
  app.use('/api/checkins', require('../src/routes/checkinRoutes'));
  app.use('/api/cases', require('../src/routes/caseRoutes'));
  app.use('/api/followups', require('../src/routes/followupRoutes'));
  app.use('/api/facilities', require('../src/routes/facilityRoutes'));
  app.use('/api/asha', require('../src/routes/ashaRoutes'));
  app.use('/api/phc', require('../src/routes/phcRoutes'));

  app.get('/api/asha/dashboard', authMiddleware, roleMiddleware('asha'), getAshaDashboard);
  app.get('/api/phc/dashboard', authMiddleware, roleMiddleware('phc'), getPhcDashboard);
  app.get('/api/cases/asha/dashboard', authMiddleware, roleMiddleware('asha'), getAshaDashboard);
  app.get('/api/cases/phc/dashboard', authMiddleware, roleMiddleware('phc'), getPhcDashboard);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Nadi42 API is running',
      database: 'connected'
    });
  });

  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use(errorMiddleware);
  return app;
}

// Helper to make HTTP requests to test server
function makeRequest(server, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Test Runner
const results = [];
let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    passedCount++;
    results.push({ name, status: 'PASSED' });
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    failedCount++;
    results.push({ name, status: 'FAILED', error: err.message });
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message ? message + ' - ' : ''}Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('NADI42 COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('============================================================\n');

  // Connect to DB and seed
  await connectDB();
  await seedDemoData();

  const app = createTestApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));

  try {
    console.log('--- 1. HEALTH & SYSTEM TESTS ---');
    await test('GET /api/health returns 200 and connected status', async () => {
      const res = await makeRequest(server, 'GET', '/api/health');
      assertEqual(res.status, 200, 'Status should be 200');
      assertEqual(res.body.success, true, 'success should be true');
      assertEqual(res.body.database, 'connected', 'database should be connected');
    });

    await test('GET /api/invalid-route returns 404', async () => {
      const res = await makeRequest(server, 'GET', '/api/invalid-route');
      assertEqual(res.status, 404, 'Status should be 404');
      assertEqual(res.body.success, false, 'success should be false');
    });

    console.log('\n--- 2. RISK ENGINE UNIT TESTS ---');
    await test('RiskEngine: Normal symptoms -> GREEN', async () => {
      const r = calculateRisk({ bleeding: 'normal', fever: false, severeHeadache: false, visionChanges: false, emotionalDistress: false, feedingDifficulty: false });
      assertEqual(r.level, 'green');
      assert(r.reasons.includes('No warning signs detected'));
    });

    await test('RiskEngine: Increased bleeding -> AMBER', async () => {
      const r = calculateRisk({ bleeding: 'more', fever: false, severeHeadache: false, visionChanges: false, emotionalDistress: false, feedingDifficulty: false });
      assertEqual(r.level, 'amber');
      assert(r.reasons.includes('Increased bleeding'));
    });

    await test('RiskEngine: Emotional distress & Feeding difficulty -> AMBER with both reasons', async () => {
      const r = calculateRisk({ bleeding: 'normal', fever: false, severeHeadache: false, visionChanges: false, emotionalDistress: true, feedingDifficulty: true });
      assertEqual(r.level, 'amber');
      assert(r.reasons.includes('Emotional distress'), 'Should contain Emotional distress');
      assert(r.reasons.includes('Feeding difficulty'), 'Should contain Feeding difficulty');
    });

    await test('RiskEngine: Heavy bleeding -> RED', async () => {
      const r = calculateRisk({ bleeding: 'heavy', fever: false, severeHeadache: false, visionChanges: false, emotionalDistress: false, feedingDifficulty: false });
      assertEqual(r.level, 'red');
      assert(r.reasons.includes('Heavy bleeding'));
    });

    await test('RiskEngine: Fever + Vision changes -> RED with multiple reasons', async () => {
      const r = calculateRisk({ bleeding: 'normal', fever: true, severeHeadache: false, visionChanges: true, emotionalDistress: false, feedingDifficulty: false });
      assertEqual(r.level, 'red');
      assert(r.reasons.includes('Fever'));
      assert(r.reasons.includes('Vision changes'));
    });

    console.log('\n--- 3. AUTHENTICATION & RBAC TESTS ---');
    let motherToken = '';
    let ashaToken = '';
    let phcToken = '';

    await test('POST /api/auth/login with valid Mother credentials', async () => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', { email: 'meena@nadi42.demo', password: 'Demo@123' });
      assertEqual(res.status, 200);
      assert(res.body.token, 'Token should be returned');
      motherToken = res.body.token;
      assertEqual(res.body.data.role, 'mother');
    });

    await test('POST /api/auth/login with valid ASHA credentials', async () => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', { email: 'priya@nadi42.demo', password: 'Demo@123' });
      assertEqual(res.status, 200);
      ashaToken = res.body.token;
      assertEqual(res.body.data.role, 'asha');
    });

    await test('POST /api/auth/login with valid PHC credentials', async () => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', { email: 'phc@nadi42.demo', password: 'Demo@123' });
      assertEqual(res.status, 200);
      phcToken = res.body.token;
      assertEqual(res.body.data.role, 'phc');
    });

    await test('POST /api/auth/login with invalid password returns 401', async () => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', { email: 'meena@nadi42.demo', password: 'WrongPassword' });
      assertEqual(res.status, 401);
      assertEqual(res.body.success, false);
    });

    await test('GET /api/auth/me with Mother token returns user details', async () => {
      const res = await makeRequest(server, 'GET', '/api/auth/me', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.user.role, 'mother');
      assertEqual(res.body.data.user.email, 'meena@nadi42.demo');
    });

    await test('RBAC: Mother cannot access /api/asha/dashboard (403 Forbidden)', async () => {
      const res = await makeRequest(server, 'GET', '/api/asha/dashboard', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 403);
      assertEqual(res.body.success, false);
    });

    await test('RBAC: ASHA cannot submit check-in to /api/checkins (403 Forbidden)', async () => {
      const res = await makeRequest(server, 'POST', '/api/checkins', { bleeding: 'normal' }, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 403);
    });

    await test('RBAC: Mother cannot access /api/phc/dashboard (403 Forbidden)', async () => {
      const res = await makeRequest(server, 'GET', '/api/phc/dashboard', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 403);
    });

    console.log('\n--- 4. MOTHER WORKFLOW TESTS ---');
    await test('GET /api/mothers/me returns mother profile & postpartum day', async () => {
      const res = await makeRequest(server, 'GET', '/api/mothers/me', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assert(res.body.data.name.includes('Meena'), 'Name should match Meena');
      assert(res.body.data.postpartumDay >= 0, 'Postpartum day should be >= 0');
      assert(res.body.data.asha !== null, 'ASHA should be linked');
    });

    await test('GET /api/mothers/me/timeline returns chronological events', async () => {
      const res = await makeRequest(server, 'GET', '/api/mothers/me/timeline', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assert(Array.isArray(res.body.data.events), 'Events should be an array');
      assert(res.body.data.events.length > 0, 'Should have timeline events');
      assertEqual(res.body.data.events[0].type, 'delivery', 'First event should be delivery');
    });

    await test('POST /api/checkins with normal bleeding -> saves checkin & green risk', async () => {
      const res = await makeRequest(server, 'POST', '/api/checkins', {
        bleeding: 'normal',
        fever: false,
        severeHeadache: false,
        visionChanges: false,
        emotionalDistress: false,
        feedingDifficulty: false
      }, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 201);
      assertEqual(res.body.data.risk.level, 'green');
      assertEqual(res.body.data.checkIn.riskLevel, 'green');
    });

    await test('GET /api/checkins/latest returns latest check-in', async () => {
      const res = await makeRequest(server, 'GET', '/api/checkins/latest', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.riskLevel, 'green');
    });

    let meenaCaseId = '';
    await test('POST /api/checkins with RED symptoms -> creates urgent case for ASHA', async () => {
      const res = await makeRequest(server, 'POST', '/api/checkins', {
        bleeding: 'heavy',
        fever: true,
        severeHeadache: true,
        visionChanges: false,
        emotionalDistress: false,
        feedingDifficulty: false
      }, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 201);
      assertEqual(res.body.data.risk.level, 'red');
      assert(res.body.data.case !== null, 'Case should be created');
      assertEqual(res.body.data.case.riskLevel, 'red');
      assertEqual(res.body.data.case.status, 'open');
      meenaCaseId = res.body.data.case._id;
    });

    console.log('\n--- 5. ASHA WORKFLOW & CASE MANAGEMENT TESTS ---');
    let urgentCaseId = '';
    await test('GET /api/asha/dashboard returns metrics, urgent cases, and follow-ups', async () => {
      const res = await makeRequest(server, 'GET', '/api/asha/dashboard', null, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 200);
      assert(res.body.data.metrics.totalMothers > 0, 'totalMothers should be > 0');
      assert(res.body.data.urgentCases.length > 0, 'urgentCases should exist');
      urgentCaseId = meenaCaseId || res.body.data.urgentCases[0]._id;
    });

    await test('GET /api/cases/:id returns case detail with populated mother & ASHA', async () => {
      const res = await makeRequest(server, 'GET', `/api/cases/${urgentCaseId}`, null, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.case._id, urgentCaseId);
      assert(res.body.data.case.motherId !== null, 'motherId should be populated');
      assert(res.body.data.case.trigger.length > 0, 'Trigger reasons should be populated');
    });

    await test('PATCH /api/cases/:id/acknowledge updates case status to acknowledged', async () => {
      const res = await makeRequest(server, 'PATCH', `/api/cases/${urgentCaseId}/acknowledge`, {}, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.status, 'acknowledged');
    });

    let followUpId = '';
    await test('POST /api/followups schedules a follow-up visit', async () => {
      const res = await makeRequest(server, 'POST', '/api/followups', {
        caseId: urgentCaseId,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Priority home visit scheduled'
      }, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 201);
      assertEqual(res.body.data.followUp.status, 'scheduled');
      assertEqual(res.body.data.case.status, 'follow_up');
      followUpId = res.body.data.followUp._id;
    });

    await test('PATCH /api/followups/:id/complete marks follow-up completed', async () => {
      const res = await makeRequest(server, 'PATCH', `/api/followups/${followUpId}/complete`, {}, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.status, 'completed');
    });

    await test('PATCH /api/cases/:id/resolve resolves the case & resets Mother risk to GREEN', async () => {
      const res = await makeRequest(server, 'PATCH', `/api/cases/${urgentCaseId}/resolve`, {}, { Authorization: `Bearer ${ashaToken}` });
      assertEqual(res.status, 200);
      assertEqual(res.body.data.status, 'resolved');

      // Verify mother's risk status is now green
      const motherProfileRes = await makeRequest(server, 'GET', '/api/mothers/me', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(motherProfileRes.body.data.risk, 'green', 'Mother risk should reset to green upon case resolution');
    });

    console.log('\n--- 6. PHC DASHBOARD & OPERATIONAL SUPERVISION TESTS ---');
    await test('GET /api/phc/dashboard returns network metrics & populated open cases', async () => {
      const res = await makeRequest(server, 'GET', '/api/phc/dashboard', null, { Authorization: `Bearer ${phcToken}` });
      assertEqual(res.status, 200);
      assert(res.body.data.metrics.total > 0, 'Total metric should exist');
      assert(res.body.data.metrics.green >= 0, 'Green metric should exist');
      assert(res.body.data.metrics.amber >= 0, 'Amber metric should exist');
      assert(res.body.data.metrics.red >= 0, 'Red metric should exist');
      assert(res.body.data.metrics.resolvedCases > 0, 'Resolved cases count should reflect resolved case');
      assert(Array.isArray(res.body.data.recentCases), 'Recent cases should be an array');
    });

    console.log('\n--- 7. FACILITIES & GEO-DISTANCE TESTS ---');
    await test('GET /api/facilities returns facility network list', async () => {
      const res = await makeRequest(server, 'GET', '/api/facilities', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assert(res.body.facilities.length >= 3, 'Should return all registered facilities');
    });

    await test('GET /api/facilities/nearest returns closest facility with distanceKm', async () => {
      const res = await makeRequest(server, 'GET', '/api/facilities/nearest?lat=12.9716&lng=77.5946', null, { Authorization: `Bearer ${motherToken}` });
      assertEqual(res.status, 200);
      assert(res.body.data.facility !== null, 'Nearest facility should be returned');
      assert(res.body.data.distanceKm >= 0, 'Distance should be >= 0 km');
      assertEqual(res.body.data.facility.name, 'Kaveri PHC');
    });

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log('============================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
