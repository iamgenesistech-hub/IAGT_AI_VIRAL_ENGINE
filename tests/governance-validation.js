// tests/governance-validation.js
//
// Proof suite for the EVICS Sacred Intelligence Governance Engine.
// Run:  node tests/governance-validation.js   (or: npm run test:governance)
//
// Proves:
//   1. Wholesome, truthful content is APPROVED as-is.
//   2. Manipulative / high-pressure content is auto-REWRITTEN into compliant copy.
//   3. Hateful / dignity-destroying content is BLOCKED (never published).
//   4. The governance result object exposes every required field.
//   5. Oaths, standard, thresholds, and workflow wrappers are present & callable.
//   6. Logging + stats aggregation work.
//   7. Existing engine modules still load (no regression to the build).

'use strict';

const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const governance = require(path.join(ROOT, 'backend', 'sacredIntelligenceGovernance'));

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

console.log('\n=== EVICS Sacred Intelligence Governance — Proof Suite ===\n');

// ---------------------------------------------------------------------------
console.log('1) Constants, standard, thresholds, and exports');
// ---------------------------------------------------------------------------
test('EVICS AI Oath is present and substantial', () => {
  assert.ok(typeof governance.EVICS_AI_OATH === 'string', 'AI Oath must be a string');
  assert.ok(governance.EVICS_AI_OATH.length > 200, 'AI Oath should be substantial');
  assert.ok(/created to serve/i.test(governance.EVICS_AI_OATH), 'AI Oath should carry the serving ethos');
});

test('EVICS User & Affiliate Oath is present', () => {
  assert.ok(typeof governance.EVICS_USER_AFFILIATE_OATH === 'string');
  assert.ok(governance.EVICS_USER_AFFILIATE_OATH.length > 200);
  assert.ok(/purpose|integrity|serve/i.test(governance.EVICS_USER_AFFILIATE_OATH));
});

test('Voice identity oath label matches specification', () => {
  assert.strictEqual(governance.VOICE_IDENTITY_OATH_LABEL, 'EVICS Voice Identity and Purpose Oath');
});

test('Sacred Intelligence Standard defines the mission and values', () => {
  const s = governance.SACRED_INTELLIGENCE_STANDARD;
  assert.ok(s && typeof s === 'object');
  assert.ok(typeof s.mission === 'string' && s.mission.length > 0);
  assert.ok(Array.isArray(s.corePrinciples) && s.corePrinciples.length >= 5);
});

test('Thresholds enforce minimum passing standards from the spec', () => {
  const t = governance.GOVERNANCE_THRESHOLDS;
  assert.strictEqual(t.truthScoreMin, 85);
  assert.strictEqual(t.integrityScoreMin, 90);
  assert.strictEqual(t.dignityScoreMin, 90);
  assert.strictEqual(t.loveScoreMin, 85);
  assert.strictEqual(t.manipulationRiskMax, 15);
  assert.strictEqual(t.exploitationRiskMax, 10);
});

test('All required functions are exported', () => {
  ['evaluateOutput', 'scoreOutput', 'rewriteIfNeeded', 'validateAgentAction',
    'validateMarketingContent', 'validateAffiliateGuidance', 'validateCustomerCommunication',
    'validateLearningLoopRecommendation', 'bootstrapAgent', 'getGovernanceStats'
  ].forEach((fn) => {
    assert.strictEqual(typeof governance[fn], 'function', `${fn} must be exported as a function`);
  });
});

// ---------------------------------------------------------------------------
console.log('\n2) Governance result object shape');
// ---------------------------------------------------------------------------
test('evaluateOutput returns every required field', () => {
  const r = governance.evaluateOutput('Our sea moss gel is crafted to support your daily wellness routine.', {
    agentName: 'test', workflowName: 'shape-check', log: false
  });
  ['approved', 'loveScore', 'truthScore', 'integrityScore', 'dignityScore',
    'manipulationRisk', 'exploitationRisk', 'clarityScore', 'educationalValueScore',
    'revisionRequired', 'reason', 'suggestedRewrite', 'finalApprovedOutput'
  ].forEach((field) => {
    assert.ok(Object.prototype.hasOwnProperty.call(r, field), `result must include "${field}"`);
  });
});

// ---------------------------------------------------------------------------
console.log('\n3) PASSING content is approved as-is');
// ---------------------------------------------------------------------------
test('Wholesome marketing copy is approved without revision', () => {
  const clean = 'Our organic sea moss gel is thoughtfully made to support your daily wellness. ' +
    'We share honest information so you can decide what is right for you. Results vary from person to person.';
  const r = governance.validateMarketingContent(clean, { agentName: 'test', workflowName: 'clean', log: false });
  assert.strictEqual(r.approved, true, 'clean content should be approved');
  assert.strictEqual(r.revisionRequired, false, 'clean content should not need revision');
  assert.ok(r.truthScore >= 85 && r.integrityScore >= 90 && r.dignityScore >= 90 && r.loveScore >= 85);
  assert.strictEqual(r.finalApprovedOutput, clean, 'clean content should pass through unchanged');
});

test('An educational, respectful affiliate message passes', () => {
  const guidance = 'Here is a clear, honest overview of the product so you can make an informed choice. ' +
    'Take your time, ask questions, and only proceed if it is a good fit for you.';
  const r = governance.validateAffiliateGuidance(guidance, { agentName: 'test', workflowName: 'guidance', log: false });
  assert.strictEqual(r.approved, true);
  assert.ok(r.finalApprovedOutput && r.finalApprovedOutput.length > 0);
});

// ---------------------------------------------------------------------------
console.log('\n4) FAILING-but-fixable content is rewritten, then approved');
// ---------------------------------------------------------------------------
test('High-pressure / false-urgency ad is auto-rewritten into compliant copy', () => {
  const manipulative = 'ACT NOW! Only 2 left, buy immediately before it is gone forever! ' +
    'You would be stupid to miss this once-in-a-lifetime deal that cures everything instantly!';
  const r = governance.validateMarketingContent(manipulative, { agentName: 'test', workflowName: 'manip', log: false });
  assert.strictEqual(r.approved, true, 'fixable content should end approved after rewrite');
  assert.strictEqual(r.revisionRequired, true, 'it should be flagged as revised');
  assert.ok(r.finalApprovedOutput && r.finalApprovedOutput !== manipulative, 'output must differ from the original');
  // The rewritten copy must not still contain the worst manipulation tokens.
  assert.ok(!/\bbuy immediately\b/i.test(r.finalApprovedOutput), 'pressure phrasing should be removed');
  assert.ok(!/cures everything/i.test(r.finalApprovedOutput), 'false health claim should be removed');
});

test('Pressure-based affiliate tactic is softened to respectful language', () => {
  const pushy = 'Do not think about it, just sign up right now or you will regret it for the rest of your life!';
  const r = governance.validateAffiliateGuidance(pushy, { agentName: 'test', workflowName: 'pushy', log: false });
  assert.strictEqual(r.approved, true, 'should be approved after rewrite');
  assert.ok(r.finalApprovedOutput && r.finalApprovedOutput !== pushy);
});

// ---------------------------------------------------------------------------
console.log('\n5) HARMFUL content is blocked (never published)');
// ---------------------------------------------------------------------------
test('Hateful / demeaning content is BLOCKED', () => {
  const hateful = 'You are a worthless idiot and people like you are stupid and disgusting.';
  const r = governance.evaluateOutput(hateful, { agentName: 'test', workflowName: 'hate', log: false });
  assert.strictEqual(r.approved, false, 'hateful content must not be approved');
  assert.strictEqual(r.finalApprovedOutput, null, 'blocked content must have no publishable output');
  assert.ok(r.dignityScore < 90, 'dignity must fail');
  assert.ok(/block|review|standard|dignity/i.test(r.reason), 'reason should explain the block');
});

test('Blocked content reports status "blocked" or "Governance Review Required"', () => {
  const hateful = 'Everyone from that group is trash and should be humiliated in public.';
  const r = governance.evaluateOutput(hateful, { agentName: 'test', workflowName: 'hate2', log: false });
  assert.strictEqual(r.approved, false);
  assert.ok(['blocked', 'Governance Review Required'].includes(r.status));
});

// ---------------------------------------------------------------------------
console.log('\n6) Safe fallback never implies approval');
// ---------------------------------------------------------------------------
test('Empty / whitespace output is not approved', () => {
  const r = governance.evaluateOutput('   ', { agentName: 'test', workflowName: 'empty', log: false });
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.finalApprovedOutput, null);
});

// ---------------------------------------------------------------------------
console.log('\n7) Logging + stats aggregation');
// ---------------------------------------------------------------------------
test('Logging writes entries and stats aggregate them', () => {
  const before = governance.getGovernanceStats().total;
  governance.evaluateOutput('A clear and honest wellness message for testing the log.', {
    agentName: 'log_test_agent', workflowName: 'log-test', log: true
  });
  const after = governance.getGovernanceStats();
  assert.ok(after.total >= before + 1, 'log total should grow by at least one');
  assert.ok(typeof after.passRate === 'number' || after.passRate === null);
  assert.ok(Array.isArray(after.mostCommonViolations));
  assert.ok(Array.isArray(after.agentsWithRepeatedFailures));
  assert.ok(Array.isArray(after.recent));
});

// ---------------------------------------------------------------------------
console.log('\n8) No regression — existing modules still load');
// ---------------------------------------------------------------------------
test('renderQualityValidator still loads and exposes validateScriptQuality', () => {
  const rqv = require(path.join(ROOT, 'backend', 'renderQualityValidator'));
  assert.strictEqual(typeof rqv.validateScriptQuality, 'function');
});

test('governanceRoutes module loads and exports registrar', () => {
  const gr = require(path.join(ROOT, 'backend', 'governanceRoutes'));
  assert.strictEqual(typeof gr.registerGovernanceRoutes, 'function');
});

// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log(`  • ${f.name}: ${f.message}`));
  process.exit(1);
} else {
  console.log('🕊️  All governance proofs passed. Every AI output is governed by truth, integrity, dignity, and love.\n');
  process.exit(0);
}
