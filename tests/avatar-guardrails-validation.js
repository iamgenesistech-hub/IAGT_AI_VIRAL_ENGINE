'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  normalizeProfileId,
  resolveAvatarOwnerCode,
  resolveAvatarCreationGuardrails
} = require(path.join(ROOT, 'backend', 'avatarGuardrails'));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, message: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${error.message}`);
  }
}

console.log('\n=== Avatar Guardrails Proof Suite ===\n');

test('Profile IDs normalize to a canonical owner key', () => {
  assert.strictEqual(normalizeProfileId('  abc-123  '), 'ABC-123');
  assert.strictEqual(resolveAvatarOwnerCode({ profileId: ' user-9 ' }), 'USER-9');
  assert.strictEqual(resolveAvatarOwnerCode({ affiliateCode: 'abc-9' }), 'ABC-9');
});

test('Guardrails require a photo and preserve the provided photo URL', () => {
  const guardrails = resolveAvatarCreationGuardrails({ photoUrl: 'https://example.com/photo.jpg' });
  assert.strictEqual(guardrails.photoUrl, 'https://example.com/photo.jpg');
  assert.strictEqual(guardrails.allowStockVoiceFallback, true);
  assert.strictEqual(guardrails.mustCloneVoice, false);
});

test('A newly uploaded voice forces a fresh clone and blocks stock fallback', () => {
  const guardrails = resolveAvatarCreationGuardrails({
    photoUrl: 'https://example.com/photo.jpg',
    voiceFileUrl: 'https://example.com/voice.m4a'
  });
  assert.strictEqual(guardrails.mustCloneVoice, true);
  assert.strictEqual(guardrails.allowStockVoiceFallback, false);
  assert.strictEqual(guardrails.voiceFileUrl, 'https://example.com/voice.m4a');
});

test('Missing photo is rejected immediately', () => {
  assert.throws(() => resolveAvatarCreationGuardrails({ voiceFileUrl: 'https://example.com/voice.m4a' }));
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log(`  • ${f.name}: ${f.message}`));
  process.exit(1);
}

console.log('🕊️ Avatar guardrails are enforcing profile ownership and uploaded-voice priority.\n');
