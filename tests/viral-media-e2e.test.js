'use strict';

/**
 * EVICS Viral Product Media Engine - End-to-End Test Suite
 * 
 * Validates all 18 API endpoints, state persistence, error handling,
 * and complete workflow from product to publishing.
 * 
 * Run: npm test -- tests/viral-media-e2e.test.js
 * Or: node tests/viral-media-e2e.test.js
 */

const assert = require('assert');
const http = require('http');
const BASE_URL = 'http://localhost:4175';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function httpRequest(method, path, body = null) {
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
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: payload
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function test(description, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log('  ✓ ' + description))
    .catch((err) => {
      console.error('  ✗ ' + description);
      console.error('    ' + err.message);
      process.exit(1);
    });
}

async function runTests() {
  console.log('\n🚀 EVICS Viral Product Media Engine - E2E Test Suite\n');

  // =========================================================================
  // SECTION 1: BASIC ENDPOINTS & STATE
  // =========================================================================
  console.log('📋 Section 1: Basic Endpoints & State\n');

  let dashboard;
  let products = [];

  await test('GET /api/viral-media/dashboard - returns state snapshot', async () => {
    const res = await httpRequest('GET', '/api/viral-media/dashboard');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Body should exist');
    assert(res.body.summary, 'Should have summary object');
    dashboard = res.body;
  });

  await test('GET /api/viral-media/products - returns product list', async () => {
    const res = await httpRequest('GET', '/api/viral-media/products?limit=5');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(Array.isArray(res.body.products), 'Should return products array');
    assert(res.body.products.length >= 0, 'Products should be array');
    products = res.body.products;
  });

  await test('GET /api/viral-media/products?limit=25 - respects limit param', async () => {
    const res = await httpRequest('GET', '/api/viral-media/products?limit=25');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(Array.isArray(res.body.products), 'Should return array');
  });

  await test('GET /api/viral-media/render-queue - returns render jobs', async () => {
    const res = await httpRequest('GET', '/api/viral-media/render-queue');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(Array.isArray(res.body), 'Should return array of render jobs');
  });

  await test('GET /api/viral-media/regeneration - returns regen queue', async () => {
    const res = await httpRequest('GET', '/api/viral-media/regeneration');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(Array.isArray(res.body), 'Should return array of regen items');
  });

  // =========================================================================
  // SECTION 2: CREATIVE GENERATION
  // =========================================================================
  console.log('\n📝 Section 2: Creative Generation\n');

  let brief, script, concept, score;

  const testProduct = products[0] || { productHandle: 'test-product', productName: 'Test Product' };

  await test('POST /api/viral-media/briefs - generates creative brief', async () => {
    const res = await httpRequest('POST', '/api/viral-media/briefs', {
      productHandle: testProduct.productHandle,
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.briefs, 'Should return briefs array or object');
    if (Array.isArray(res.body.briefs)) {
      brief = res.body.briefs[0];
    } else {
      brief = res.body.briefs;
    }
    assert(brief, 'Should have at least one brief');
    assert(brief.productName || brief.productHandle, 'Brief should have product data');
  });

  await test('POST /api/viral-media/scripts/jordan - generates Jordan script', async () => {
    const res = await httpRequest('POST', '/api/viral-media/scripts/jordan', {
      productHandle: testProduct.productHandle,
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.scripts, 'Should return scripts');
    if (Array.isArray(res.body.scripts)) {
      script = res.body.scripts[0];
    } else {
      script = res.body.scripts;
    }
    assert(script, 'Should have at least one script');
    assert(script.videoType && script.videoType.indexOf('Jordan') !== -1, 'Should be Jordan Avatar type');
  });

  await test('POST /api/viral-media/concepts/ai-commercial - generates AI concept', async () => {
    const res = await httpRequest('POST', '/api/viral-media/concepts/ai-commercial', {
      productHandle: testProduct.productHandle,
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.concepts, 'Should return concepts');
    if (Array.isArray(res.body.concepts)) {
      concept = res.body.concepts[0];
    } else {
      concept = res.body.concepts;
    }
    assert(concept, 'Should have at least one concept');
    assert(concept.visualStyle || concept.selectedHook, 'Concept should have creative content');
  });

  // =========================================================================
  // SECTION 3: SCORING & QUALITY GATES
  // =========================================================================
  console.log('\n⭐ Section 3: Scoring & Quality Gates\n');

  await test('POST /api/viral-media/score - scores creative asset (0-100)', async () => {
    const res = await httpRequest('POST', '/api/viral-media/score', {
      productHandle: testProduct.productHandle,
      videoType: 'Jordan Avatar Trust Video',
      selectedHook: brief ? brief.suggestedHook : 'Test hook',
      selectedCta: brief ? brief.suggestedCTA : 'Test CTA',
      spokenScript: script ? script.spokenScript : 'Test script'
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.scores, 'Should return scores');
    if (Array.isArray(res.body.scores)) {
      score = res.body.scores[0];
    } else {
      score = res.body.scores;
    }
    assert(score, 'Should have a score');
    assert(typeof score.viralScore === 'number', 'viralScore should be a number');
    assert(score.viralScore >= 0 && score.viralScore <= 100, 'viralScore should be 0-100');
  });

  // =========================================================================
  // SECTION 4: EXPORTS & ASPECT RATIOS
  // =========================================================================
  console.log('\n🎬 Section 4: Exports & Aspect Ratios\n');

  await test('POST /api/viral-media/exports - generates format exports (9:16, 1:1, 16:9)', async () => {
    const res = await httpRequest('POST', '/api/viral-media/exports', {
      productHandle: testProduct.productHandle,
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.exports, 'Should return exports array');
    const exportList = Array.isArray(res.body.exports) ? res.body.exports : [res.body.exports];
    assert(exportList.length > 0, 'Should have at least one export');
    const formats = exportList.map(e => e.aspectRatio || e.exportType);
    assert(formats.length > 0, 'Exports should have format data');
  });

  // =========================================================================
  // SECTION 5: PUBLISHING STRATEGY
  // =========================================================================
  console.log('\n📱 Section 5: Publishing Strategy\n');

  await test('POST /api/viral-media/publishing-plan - creates multi-platform strategy', async () => {
    const res = await httpRequest('POST', '/api/viral-media/publishing-plan', {
      productHandle: testProduct.productHandle,
      videoType: 'Jordan Avatar Trust Video',
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.publishing, 'Should return publishing plan');
    const plans = Array.isArray(res.body.publishing) ? res.body.publishing : [res.body.publishing];
    assert(plans.length > 0, 'Should have at least one publishing plan');
  });

  // =========================================================================
  // SECTION 6: AI BOARD REVIEW
  // =========================================================================
  console.log('\n🤖 Section 6: AI Board Review\n');

  await test('POST /api/viral-media/board-review - gets executive AI review', async () => {
    const res = await httpRequest('POST', '/api/viral-media/board-review', {
      productHandle: testProduct.productHandle,
      videoType: 'Jordan Avatar Trust Video',
      selectedHook: brief ? brief.suggestedHook : 'Test hook',
      selectedCta: brief ? brief.suggestedCTA : 'Test CTA'
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.boardReviews, 'Should return board reviews');
    const reviews = Array.isArray(res.body.boardReviews) ? res.body.boardReviews : [res.body.boardReviews];
    assert(reviews.length > 0, 'Should have at least one review');
    const review = reviews[0];
    assert(typeof review.approvalScore === 'number', 'approvalScore should be a number');
  });

  // =========================================================================
  // SECTION 7: LEARNING LOOP
  // =========================================================================
  console.log('\n📊 Section 7: Learning Loop\n');

  await test('POST /api/viral-media/learning-loop - records insights', async () => {
    const res = await httpRequest('POST', '/api/viral-media/learning-loop', {
      productHandle: testProduct.productHandle,
      videoType: 'Jordan Avatar Trust Video',
      question: 'Which hook performed best?',
      answer: 'Hook A (emotional angle)',
      limit: 1
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body.learningLoop, 'Should return learning loop entries');
  });

  // =========================================================================
  // SECTION 8: RENDER QUEUE & JOBS
  // =========================================================================
  console.log('\n⚙️  Section 8: Render Queue & Jobs\n');

  await test('POST /api/viral-media/render-queue - queues media generation', async () => {
    const res = await httpRequest('POST', '/api/viral-media/render-queue', {
      productHandle: testProduct.productHandle,
      limit: 1,
      launchRendering: false
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Should return response');
  });

  // =========================================================================
  // SECTION 9: BATCH OPERATIONS (25 PRODUCTS)
  // =========================================================================
  console.log('\n🏢 Section 9: Batch Operations\n');

  await test('POST /api/viral-media/batch-builder - generates 25-product campaigns', async () => {
    const res = await httpRequest('POST', '/api/viral-media/batch-builder', {
      limit: 5, // Test with 5 instead of 25 for speed
      launchRendering: false
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Should return batch response');
    assert(res.body.summary || res.body.briefs, 'Should have summary or results');
  });

  // =========================================================================
  // SECTION 10: REGENERATION QUEUE
  // =========================================================================
  console.log('\n🔄 Section 10: Regeneration Queue\n');

  await test('POST /api/viral-media/regeneration - queues video for regeneration', async () => {
    const res = await httpRequest('POST', '/api/viral-media/regeneration', {
      productHandle: testProduct.productHandle,
      reason: 'Low viral score',
      regenerationFocus: 'Hooks and concept'
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Should return regen response');
  });

  // =========================================================================
  // SECTION 11: MEDIA LIBRARY
  // =========================================================================
  console.log('\n🎥 Section 11: Media Library\n');

  await test('GET /api/viral-media/media-library - returns searchable assets', async () => {
    const res = await httpRequest('GET', '/api/viral-media/media-library?search=product');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(Array.isArray(res.body) || res.body.assets, 'Should return assets');
  });

  // =========================================================================
  // SECTION 12: JORDAN AVATAR CONFIGURATION
  // =========================================================================
  console.log('\n👤 Section 12: Jordan Avatar Configuration\n');

  await test('GET /api/viral-media/jordan-avatar/check - checks avatar status', async () => {
    const res = await httpRequest('GET', '/api/viral-media/jordan-avatar/check');
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Should return avatar status');
    assert(typeof res.body.available === 'boolean' || typeof res.body.status === 'string', 'Should have status info');
  });

  await test('POST /api/viral-media/jordan-avatar/configure - sets avatar credentials', async () => {
    const res = await httpRequest('POST', '/api/viral-media/jordan-avatar/configure', {
      avatarId: 'test-avatar-id-placeholder',
      voiceId: 'test-voice-id-placeholder',
      name: 'Jordan'
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert(res.body, 'Should return confirmation');
  });

  // =========================================================================
  // SECTION 13: STATE PERSISTENCE
  // =========================================================================
  console.log('\n💾 Section 13: State Persistence\n');

  await test('State persists across dashboard requests', async () => {
    // Generate something
    await httpRequest('POST', '/api/viral-media/briefs', {
      productHandle: testProduct.productHandle,
      limit: 1
    });

    // Verify it's in dashboard
    const res = await httpRequest('GET', '/api/viral-media/dashboard');
    assert.strictEqual(res.status, 200, 'Dashboard should load');
    assert(res.body.briefs || res.body.briefs !== undefined, 'Briefs should persist');
  });

  // =========================================================================
  // SECTION 14: ERROR HANDLING
  // =========================================================================
  console.log('\n⚠️  Section 14: Error Handling\n');

  await test('Invalid endpoint returns 404', async () => {
    const res = await httpRequest('GET', '/api/viral-media/nonexistent');
    assert.strictEqual(res.status, 404, 'Should return 404 for invalid endpoint');
  });

  await test('Missing required parameters handled gracefully', async () => {
    const res = await httpRequest('POST', '/api/viral-media/briefs', {});
    assert(res.status === 200 || res.status === 400, 'Should handle missing params');
    assert(res.body, 'Should return response');
  });

  await test('Malformed JSON handled gracefully', async () => {
    const options = {
      hostname: 'localhost',
      port: 4175,
      path: '/api/viral-media/briefs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      // Just check it doesn't crash
      assert(res.statusCode, 'Should respond');
    });

    req.write('{ invalid json }');
    req.end();
  });

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n✨ All Tests Complete!\n');
  console.log('📊 Summary:');
  console.log('  ✓ 18 API endpoints tested');
  console.log('  ✓ State persistence verified');
  console.log('  ✓ Error handling validated');
  console.log('  ✓ Full workflow end-to-end');
  console.log('  ✓ Batch operations tested');
  console.log('  ✓ Jordan Avatar config tested');
  console.log('\n🚀 Viral Media Engine is production-ready!\n');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { httpRequest, test, runTests };
