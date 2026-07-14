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
  await test('isTransientAdvanceError — TypeError fetch is transient', async () => {
    const err = new TypeError('Failed to fetch');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — AbortError is transient', async () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — statusCode 429 is transient', async () => {
    const err = Object.assign(new Error('Too Many Requests'), { statusCode: 429 });
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — statusCode 503 is transient', async () => {
    const err = Object.assign(new Error('Service Unavailable'), { statusCode: 503 });
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — ETIMEDOUT message is transient', async () => {
    const err = new Error('connect ETIMEDOUT 10.0.0.1:443');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — ECONNRESET message is transient', async () => {
    const err = new Error('read ECONNRESET');
    assert.strictEqual(isTransientAdvanceError(err), true);
  });

  await test('isTransientAdvanceError — non-transient error returns false', async () => {
    const err = new Error('Product not found');
    assert.strictEqual(isTransientAdvanceError(err), false);
  });

  await test('isTransientAdvanceError — null returns false', async () => {
    assert.strictEqual(isTransientAdvanceError(null), false);
  });

  await test('transient advance error preserves record status (not failed)', async () => {
    const record = {
      videoJobId: 'job-transient',
      affiliateCode: 'XYZ',
      status: 'rendering',
      heygenVideoId: 'hg-transient'
    };
    const transientErr = Object.assign(new Error('read ECONNRESET'), { name: 'Error' });
    assert.strictEqual(isTransientAdvanceError(transientErr), true);
    // Simulate the status-route catch: transient → preserve status, non-transient → fail
    const afterTransient = isTransientAdvanceError(transientErr)
      ? { ...record, lastAdvanceError: transientErr.message, lastAdvanceErrorAt: new Date().toISOString() }
      : { ...record, status: 'failed', error: transientErr.message };
    assert.strictEqual(afterTransient.status, 'rendering', 'Transient error must not mark record as failed');
    assert.ok(afterTransient.lastAdvanceError, 'lastAdvanceError should be recorded');
  });

  await test('non-transient advance error marks record as failed', async () => {
    const record = { videoJobId: 'job-fail', affiliateCode: 'XYZ', status: 'rendering', heygenVideoId: 'hg-fail' };
    const nonTransientErr = new Error('Authentication failed');
    assert.strictEqual(isTransientAdvanceError(nonTransientErr), false);
    const afterError = isTransientAdvanceError(nonTransientErr)
      ? { ...record, lastAdvanceError: nonTransientErr.message }
      : { ...record, status: 'failed', error: nonTransientErr.message, completedAt: new Date().toISOString() };
    assert.strictEqual(afterError.status, 'failed');
  });

  await test('affiliate image precedence: explicit productImageUrl wins over nested product.imageUrl', async () => {
    const normalized = normalizeAffiliateProductVideoRequest({
      productImageUrl: 'https://cdn.example.com/explicit.jpg',
      product: {
        title: 'Test Product',
        imageUrl: 'https://cdn.example.com/nested.jpg'
      }
    });
    assert.strictEqual(normalized.productImageUrl, 'https://cdn.example.com/explicit.jpg');
  });

  await test('final sanitized-dialogue guard: sanitizeSpokenDialogue throws on stage-only input (SCRIPT_INVALID path)', async () => {
    assert.throws(
      () => sanitizeSpokenDialogue('[Camera: slow push in]\n(SFX: rise)'),
      /No spoken dialogue remained/
    );
  });

  await test('final sanitized-dialogue guard: valid script passes through non-empty (no SCRIPT_DIALOGUE_EMPTY)', async () => {
    const result = sanitizeSpokenDialogue('This is a real product you will love.');
    assert.ok(result && result.length > 0, 'Valid dialogue must not be empty after sanitization');
  });

  await test('postprocessing fails terminally when postProcess throws', async () => {
    const record = {
      videoJobId: 'job-ppthrow',
      affiliateCode: 'ABC',
      status: 'postprocessing',
      heygenVideoId: 'hg-1',
      heygenVideoUrl: 'https://cdn.example.com/raw.mp4'
    };
    const deps = {
      postProcess: async () => { throw new Error('ffmpeg exited with code 1'); },
      archiveFinal: async () => null
    };
    const result = await advanceProductVideoJob(record, deps);
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.error.includes('ffmpeg exited with code 1'));
  });

  await test('postprocessing fails terminally when productOverlayApplied is false', async () => {
    const record = {
      videoJobId: 'job-nooverlay',
      affiliateCode: 'ABC',
      status: 'postprocessing',
      heygenVideoId: 'hg-2',
      heygenVideoUrl: 'https://cdn.example.com/raw.mp4'
    };
    const deps = {
      postProcess: async () => ({
        success: true,
        processedVideoUrl: 'https://cdn.example.com/processed.mp4',
        productOverlayApplied: false
      }),
      archiveFinal: async () => null
    };
    const result = await advanceProductVideoJob(record, deps);
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.error.includes('Product overlay was not applied'));
  });

  await test('postprocessing succeeds when productOverlayApplied is true', async () => {
    const record = {
      videoJobId: 'job-overlay-ok',
      affiliateCode: 'ABC',
      status: 'postprocessing',
      heygenVideoId: 'hg-3',
      heygenVideoUrl: 'https://cdn.example.com/raw.mp4',
      productResolved: { matchType: 'productTitle' },
      productBgActuallyRemoved: true,
      pureSpokenDialogue: true
    };
    const deps = {
      postProcess: async () => ({
        success: true,
        processedVideoUrl: 'https://cdn.example.com/final.mp4',
        productOverlayApplied: true
      }),
      archiveFinal: async () => 'gs://bucket/job-overlay-ok.mp4'
    };
    const result = await advanceProductVideoJob(record, deps);
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.productOverlayApplied, true);
    assert.strictEqual(result.videoUrl, 'https://cdn.example.com/final.mp4');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    console.log('FAILURES:');
    failures.forEach((failure) => console.log(`  • ${failure.name}: ${failure.message}`));
    process.exit(1);
  }

  console.log('🎬 Product video pipeline aliases, sanitization, cache invalidation, and idempotent finalization validated.\n');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
