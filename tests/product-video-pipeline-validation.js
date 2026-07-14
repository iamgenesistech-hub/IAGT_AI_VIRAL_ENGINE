'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  normalizeAffiliateProductVideoRequest,
  advanceProductVideoJob
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
