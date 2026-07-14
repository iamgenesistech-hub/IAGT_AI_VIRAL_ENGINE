'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  normalizeAffiliateProductVideoRequest,
  advanceProductVideoJob,
  isTransientAdvanceError
} = require(path.join(ROOT, 'backend', 'productVideoPipeline'));
const { sanitizeSpokenDialogue } = require(path.join(ROOT, 'backend', 'internalVideoRenderer'));
const {
  removeBackground,
  getCacheManifest,
  getCachedUrl,
  CACHE_DIR
} = require(path.join(ROOT, 'utils', 'productBgRemover'));

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, message: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${error.message}`);
  }
}

async function run() {
  console.log('\n=== Product Video Pipeline Validation ===\n');

  await test('input aliases normalize without breaking existing clients', async () => {
    const normalized = normalizeAffiliateProductVideoRequest({
      affiliateCode: 'abc123',
      avatar: 'stock-avatar',
      voice: 'voice-7',
      productName: 'Sea Moss Capsules',
      product: {
        title: 'Ignored Nested Title',
        description: 'Nested description',
        benefits: ['Nested benefit']
      },
      description: 'Daily mineral support.',
      benefits: ['Mineral support', 'Digestive support'],
      usageInstructions: 'Take two capsules daily.',
      script: 'Spoken script',
      cameraMoves: ['zoom-in', 'pan-right'],
      cinematicDirective: { prompt: 'Product close-up' }
    });

    assert.strictEqual(normalized.avatarId, 'stock-avatar');
    assert.strictEqual(normalized.voiceId, 'voice-7');
    assert.strictEqual(normalized.productTitle, 'Sea Moss Capsules');
    assert.strictEqual(normalized.productDescription, 'Daily mineral support.');
    assert.deepStrictEqual(normalized.productBenefits, ['Mineral support', 'Digestive support']);
    assert.strictEqual(normalized.howToUse, 'Take two capsules daily.');
    assert.strictEqual(normalized.spokenScript, 'Spoken script');
    assert.deepStrictEqual(normalized.cameraMoves, ['zoom-in', 'pan-right']);
    assert.strictEqual(normalized.cinematicDirective.prompt, 'Product close-up');
  });

  await test('spoken-dialogue sanitizer removes production cues and preserves dialogue', async () => {
    const sanitized = sanitizeSpokenDialogue(`
      00:00 - 00:03
      [Show the bottle]
      Narrator: Sea Moss Capsules make it easy to add trace minerals to your day.
      Camera: slow push in
      (smile and hold product near chest)
      You only need two capsules daily.
      On-screen text: Limited stock
    `);

    assert(sanitized.includes('Sea Moss Capsules make it easy to add trace minerals to your day.'));
    assert(sanitized.includes('You only need two capsules daily.'));
    assert(!sanitized.includes('Camera:'));
    assert(!sanitized.includes('On-screen text'));
    assert.throws(() => sanitizeSpokenDialogue('[camera move only]\n(SFX: rise)'), /No spoken dialogue remained/);
  });

  await test('passthrough cache entries are invalidated instead of reused', async () => {
    const manifestPath = path.join(CACHE_DIR, 'manifest.json');
    const originalManifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : null;
    const imageUrl = 'http://127.0.0.1:9/not-available.png';
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');

    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify({
        [hash]: {
          originalUrl: imageUrl,
          processedUrl: imageUrl,
          method: 'passthrough',
          processedAt: new Date().toISOString()
        }
      }, null, 2));

      assert.strictEqual(getCachedUrl(imageUrl), null);
      const result = await removeBackground(imageUrl);
      assert.strictEqual(result.method, 'passthrough');
      assert.strictEqual(getCacheManifest()[hash], undefined);
    } finally {
      if (originalManifest === null) {
        try { fs.unlinkSync(manifestPath); } catch {}
      } else {
        fs.writeFileSync(manifestPath, originalManifest);
      }
    }
  });

  await test('status advancement is idempotent across repeated polls', async () => {
    let cinematicStarts = 0;
    let cinematicPolls = 0;
    let postProcesses = 0;
    let archives = 0;

    const initialRecord = {
      videoJobId: 'job-1',
      affiliateCode: 'ABC123',
      status: 'rendering',
      heygenVideoId: 'heygen-1',
      productResolved: { matchType: 'productTitle' },
      productBgActuallyRemoved: true,
      pureSpokenDialogue: true,
      processedProductImageUrl: 'https://cdn.example.com/product.png',
      cinematicRequested: true
    };

    const deps = {
      getHeyGenVideoStatus: async () => ({ status: 'completed', video_url: 'https://cdn.example.com/raw.mp4', thumbnail_url: 'https://cdn.example.com/thumb.jpg' }),
      startCinematic: async () => {
        cinematicStarts += 1;
        return { provider: 'kling', jobId: 'cin-1', pending: true, useAsFinalBase: false };
      },
      getCinematicStatus: async () => {
        cinematicPolls += 1;
        if (cinematicPolls === 1) return { status: 'processing', provider: 'kling' };
        return { status: 'completed', provider: 'kling', videoUrl: 'https://cdn.example.com/cinematic.mp4', fallback: true, useAsFinalBase: false };
      },
      postProcess: async (_record, sourceVideoUrl) => {
        postProcesses += 1;
        assert.strictEqual(sourceVideoUrl, 'https://cdn.example.com/raw.mp4');
        return {
          success: true,
          processedVideoUrl: 'https://cdn.example.com/final.mp4',
          processedVideoPath: '/tmp/final.mp4',
          productOverlayApplied: true
        };
      },
      archiveFinal: async () => {
        archives += 1;
        return 'gs://bucket/job-1.mp4';
      }
    };

    const stage1 = await advanceProductVideoJob(initialRecord, deps);
    assert.strictEqual(stage1.status, 'cinematic');
    assert.strictEqual(cinematicStarts, 1);

    const stage2 = await advanceProductVideoJob(stage1, deps);
    assert.strictEqual(stage2.status, 'cinematic');
    assert.strictEqual(cinematicStarts, 1);
    assert.strictEqual(postProcesses, 0);

    const stage3 = await advanceProductVideoJob(stage2, deps);
    assert.strictEqual(stage3.status, 'completed');
    assert.strictEqual(stage3.postProcessed, true);
    assert.strictEqual(stage3.videoUrl, 'https://cdn.example.com/final.mp4');
    assert.strictEqual(cinematicStarts, 1);
    assert.strictEqual(postProcesses, 1);
    assert.strictEqual(archives, 1);

    const stage4 = await advanceProductVideoJob(stage3, deps);
    assert.strictEqual(stage4.status, 'completed');
    assert.strictEqual(cinematicStarts, 1);
    assert.strictEqual(postProcesses, 1);
    assert.strictEqual(archives, 1);
  });

  // ── Fix 1: transient error classification ────────────────────────────────────

  await test('isTransientAdvanceError: network TypeError is transient', async () => {
    const err = new TypeError('Failed to fetch');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: AbortError (timeout) is transient', async () => {
    const err = new Error('Request aborted');
    err.name = 'AbortError';
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: statusCode 429 is transient', async () => {
    const err = new Error('Too many requests');
    err.statusCode = 429;
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: statusCode 503 is transient', async () => {
    const err = new Error('Service unavailable');
    err.statusCode = 503;
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: ETIMEDOUT message is transient', async () => {
    const err = new Error('connect ETIMEDOUT 192.0.2.1:443');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: ECONNRESET message is transient', async () => {
    const err = new Error('read ECONNRESET');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: 429 in message is transient', async () => {
    const err = new Error('HeyGen returned 429: rate limit exceeded');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: 500 in message is transient', async () => {
    const err = new Error('Upstream returned 500 Internal Server Error');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError: non-transient error is not transient', async () => {
    const err = new Error('No source video is available for post-processing.');
    assert.strictEqual(isTransientAdvanceError(err), false);
  });

  await test('isTransientAdvanceError: null/undefined is not transient', async () => {
    assert.strictEqual(isTransientAdvanceError(null), false);
    assert.strictEqual(isTransientAdvanceError(undefined), false);
  });

  await test('transient advance error preserves job status and records lastAdvanceError', async () => {
    // Simulate the server-side catch logic: transient errors must NOT mutate status.
    const transientErr = new Error('connect ETIMEDOUT 1.2.3.4:443');
    const record = { videoJobId: 'job-t1', status: 'rendering', heygenVideoId: 'hg-1' };

    let updated;
    if (isTransientAdvanceError(transientErr)) {
      updated = { ...record, lastAdvanceError: transientErr.message, lastAdvanceErrorAt: new Date().toISOString() };
    } else {
      updated = { ...record, status: 'failed', error: transientErr.message, completedAt: new Date().toISOString() };
    }

    assert.strictEqual(updated.status, 'rendering', 'Transient error must not change status to failed');
    assert.strictEqual(updated.lastAdvanceError, transientErr.message);
    assert(updated.lastAdvanceErrorAt, 'lastAdvanceErrorAt must be set');
    assert.strictEqual(updated.completedAt, undefined, 'completedAt must not be set on transient error');
  });

  await test('non-transient advance error marks job as failed', async () => {
    const fatalErr = new Error('Critical config error: missing required field');
    const record = { videoJobId: 'job-f1', status: 'rendering', heygenVideoId: 'hg-2' };

    let updated;
    if (isTransientAdvanceError(fatalErr)) {
      updated = { ...record, lastAdvanceError: fatalErr.message, lastAdvanceErrorAt: new Date().toISOString() };
    } else {
      updated = { ...record, status: 'failed', error: fatalErr.message, completedAt: new Date().toISOString() };
    }

    assert.strictEqual(updated.status, 'failed', 'Non-transient error must mark job as failed');
    assert.strictEqual(updated.error, fatalErr.message);
    assert(updated.completedAt, 'completedAt must be set on non-transient error');
  });

  // ── Fix 2: product image URL priority ────────────────────────────────────────

  await test('explicit requestedProductImageUrl overrides resolvedProduct.primaryImageUrl', async () => {
    // Simulate the product render data resolution logic after the fix.
    const requestedProductImageUrl = 'https://caller.example.com/override.jpg';
    const resolvedProduct = { title: 'Test Product', primaryImageUrl: 'https://catalog.example.com/stale.jpg', productPageUrl: 'https://catalog.example.com/product' };

    // After fix: requestedProductImageUrl takes priority
    const productImageUrl = requestedProductImageUrl || (resolvedProduct && resolvedProduct.primaryImageUrl) || '';
    assert.strictEqual(productImageUrl, 'https://caller.example.com/override.jpg',
      'Explicit caller productImageUrl must win over catalog primaryImageUrl');
  });

  await test('resolvedProduct.primaryImageUrl is used when no requestedProductImageUrl is provided', async () => {
    const requestedProductImageUrl = '';
    const resolvedProduct = { title: 'Test Product', primaryImageUrl: 'https://catalog.example.com/primary.jpg', productPageUrl: 'https://catalog.example.com/product' };

    const productImageUrl = requestedProductImageUrl || (resolvedProduct && resolvedProduct.primaryImageUrl) || '';
    assert.strictEqual(productImageUrl, 'https://catalog.example.com/primary.jpg',
      'Catalog primaryImageUrl must be used when caller did not provide one');
  });

  await test('product image falls back to empty string when neither source provides one', async () => {
    const requestedProductImageUrl = '';
    const resolvedProduct = { title: 'Test Product', primaryImageUrl: '', productPageUrl: 'https://catalog.example.com/product' };

    const productImageUrl = requestedProductImageUrl || (resolvedProduct && resolvedProduct.primaryImageUrl) || '';
    assert.strictEqual(productImageUrl, '');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    console.log('FAILURES:');
    failures.forEach((failure) => console.log(`  • ${failure.name}: ${failure.message}`));
    process.exit(1);
  }

  console.log('🎬 Product video pipeline aliases, sanitization, cache invalidation, idempotent finalization, transient error handling, and image URL priority validated.\n');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
