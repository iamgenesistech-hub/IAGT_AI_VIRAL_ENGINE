#!/usr/bin/env node
'use strict';

/**
 * EVICS Viral Product Media Engine - Comprehensive E2E Test Suite
 * All 18 Endpoints Validated
 * 
 * Run: node tests/viral-media-e2e-verified.js
 */

const http = require('http');
const BASE_URL = 'http://localhost:4175';

function httpRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const payload = JSON.parse(data);
          resolve({ status: res.statusCode, body: payload });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ productHandle: 'test-product', limit: 1, launchRendering: false }));
    req.end();
  });
}

function test(description, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log('  ✓ ' + description))
    .catch((err) => {
      console.error('  ✗ ' + description);
      console.error('    Error: ' + err.message);
      return { failed: true };
    });
}

async function runTests() {
  console.log('\n🚀 EVICS Viral Media Engine - E2E Test Suite\n');
  console.log('Testing all 18 API endpoints...\n');

  let passCount = 0;
  let failCount = 0;

  // =========================================================================
  // GET ENDPOINTS (No body needed)
  // =========================================================================
  console.log('📋 GET Endpoints:\n');

  const tests = [
    { method: 'GET', path: '/api/viral-media/dashboard', desc: 'GET /api/viral-media/dashboard' },
    { method: 'GET', path: '/api/viral-media/products?limit=5', desc: 'GET /api/viral-media/products' },
    { method: 'GET', path: '/api/viral-media/render-queue', desc: 'GET /api/viral-media/render-queue' },
    { method: 'GET', path: '/api/viral-media/regeneration', desc: 'GET /api/viral-media/regeneration' },
    { method: 'GET', path: '/api/viral-media/media-library', desc: 'GET /api/viral-media/media-library' },
    { method: 'GET', path: '/api/viral-media/jordan-avatar/check', desc: 'GET /api/viral-media/jordan-avatar/check' }
  ];

  for (const t of tests) {
    const result = await test(t.desc, async () => {
      const res = await httpRequest(t.method, t.path);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
      if (!res.body) {
        throw new Error('No response body');
      }
    });
    if (result && result.failed) failCount++;
    else passCount++;
  }

  // =========================================================================
  // POST ENDPOINTS (18 total)
  // =========================================================================
  console.log('\n📝 POST Endpoints:\n');

  const postTests = [
    { path: '/api/viral-media/briefs', desc: 'POST /api/viral-media/briefs - Generate creative brief' },
    { path: '/api/viral-media/scripts/jordan', desc: 'POST /api/viral-media/scripts/jordan - Generate Jordan script' },
    { path: '/api/viral-media/concepts/ai-commercial', desc: 'POST /api/viral-media/concepts/ai-commercial - Generate AI concept' },
    { path: '/api/viral-media/score', desc: 'POST /api/viral-media/score - Score creative' },
    { path: '/api/viral-media/exports', desc: 'POST /api/viral-media/exports - Generate exports' },
    { path: '/api/viral-media/publishing-plan', desc: 'POST /api/viral-media/publishing-plan - Create publishing plan' },
    { path: '/api/viral-media/board-review', desc: 'POST /api/viral-media/board-review - Get board review' },
    { path: '/api/viral-media/learning-loop', desc: 'POST /api/viral-media/learning-loop - Record learning insight' },
    { path: '/api/viral-media/render-queue', desc: 'POST /api/viral-media/render-queue - Queue render job' },
    { path: '/api/viral-media/regeneration', desc: 'POST /api/viral-media/regeneration - Queue regeneration' },
    { path: '/api/viral-media/batch-builder', desc: 'POST /api/viral-media/batch-builder - Build 25-product batch' },
    { path: '/api/viral-media/jordan-avatar/configure', desc: 'POST /api/viral-media/jordan-avatar/configure - Configure avatar' }
  ];

  for (const t of postTests) {
    const result = await test(t.desc, async () => {
      const res = await httpRequest('POST', t.path);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
      if (!res.body) {
        throw new Error('No response body');
      }
    });
    if (result && result.failed) failCount++;
    else passCount++;
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n✨ Test Summary:\n`);
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  📊 Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Viral Media Engine is operational!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
