#!/usr/bin/env node

/**
 * Phase 2 Integration Verification Script
 * Quick verification that Phase 2 components are properly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              PHASE 2 INTEGRATION VERIFICATION SCRIPT                       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

// Test 1: Verify phase2Integration module exists
console.log('Test 1: Checking phase2Integration.js module...');
try {
  const phase2Path = path.join(__dirname, 'backend', 'phase2Integration.js');
  if (!fs.existsSync(phase2Path)) {
    console.error('  ✗ FAIL: phase2Integration.js not found');
    failCount++;
  } else {
    const phase2Content = fs.readFileSync(phase2Path, 'utf8');
    if (phase2Content.includes('initialize') && phase2Content.includes('mountAuthRoutes')) {
      console.log('  ✓ PASS: phase2Integration.js exists with required functions');
      passCount++;
    } else {
      console.error('  ✗ FAIL: phase2Integration.js missing required functions');
      failCount++;
    }
  }
} catch (err) {
  console.error('  ✗ ERROR:', err.message);
  failCount++;
}

// Test 2: Verify server.js imports phase2Integration
console.log('\nTest 2: Checking server.js imports...');
try {
  const serverContent = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
  if (serverContent.includes("require('./phase2Integration')")) {
    console.log('  ✓ PASS: server.js imports phase2Integration');
    passCount++;
  } else {
    console.error('  ✗ FAIL: server.js does not import phase2Integration');
    failCount++;
  }
} catch (err) {
  console.error('  ✗ ERROR:', err.message);
  failCount++;
}

// Test 3: Verify server.js initializes Phase 2
console.log('\nTest 3: Checking server.js initialization...');
try {
  const serverContent = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
  if (serverContent.includes('phase2Integration.initialize(app)')) {
    console.log('  ✓ PASS: server.js initializes phase2Integration');
    passCount++;
  } else {
    console.error('  ✗ FAIL: server.js does not initialize phase2Integration');
    failCount++;
  }
} catch (err) {
  console.error('  ✗ ERROR:', err.message);
  failCount++;
}

// Test 4: Verify all required Phase 2 engines exist
console.log('\nTest 4: Checking all Phase 2 engines...');
const engines = [
  'healthCheckRoutes.js',
  'authEngine.js',
  'rbacEngine.js',
  'firestoreOptimizationEngine.js',
  'stripeIntegrationEngine.js'
];

let enginesOk = true;
engines.forEach(engine => {
  const enginePath = path.join(__dirname, 'backend', engine);
  if (!fs.existsSync(enginePath)) {
    console.error(`  ✗ FAIL: ${engine} not found`);
    enginesOk = false;
  } else {
    const stats = fs.statSync(enginePath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ ${engine} (${sizeKb} KB)`);
  }
});
if (enginesOk) {
  console.log('  ✓ PASS: All Phase 2 engines present');
  passCount++;
} else {
  console.error('  ✗ FAIL: Some Phase 2 engines missing');
  failCount++;
}

// Test 5: Verify mobile components
console.log('\nTest 5: Checking mobile components...');
const components = [
  'mobile/lib/authStore.ts',
  'mobile/app/billing.tsx',
  'mobile/lib/api.ts'
];

let componentsOk = true;
components.forEach(comp => {
  const compPath = path.join(__dirname, comp);
  if (!fs.existsSync(compPath)) {
    console.error(`  ✗ FAIL: ${comp} not found`);
    componentsOk = false;
  } else {
    const stats = fs.statSync(compPath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ ${comp} (${sizeKb} KB)`);
  }
});
if (componentsOk) {
  console.log('  ✓ PASS: All mobile components present');
  passCount++;
} else {
  console.error('  ✗ FAIL: Some mobile components missing');
  failCount++;
}

// Test 6: Verify test suite
console.log('\nTest 6: Checking test suite...');
try {
  const testPath = path.join(__dirname, 'tests', 'phase2-integration.test.js');
  if (!fs.existsSync(testPath)) {
    console.error('  ✗ FAIL: Test suite not found');
    failCount++;
  } else {
    const stats = fs.statSync(testPath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    const content = fs.readFileSync(testPath, 'utf8');
    const testCount = (content.match(/it\(/g) || []).length;
    console.log(`  ✓ PASS: Test suite present (${testCount} test cases, ${sizeKb} KB)`);
    passCount++;
  }
} catch (err) {
  console.error('  ✗ ERROR:', err.message);
  failCount++;
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log(`║                          TEST RESULTS: ${passCount} PASS, ${failCount} FAIL                            ║`);
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

if (failCount === 0) {
  console.log('✅ ALL VERIFICATION TESTS PASSED!\n');
  console.log('Phase 2 is successfully integrated. Next steps:');
  console.log('  1. Run: npm start');
  console.log('  2. Verify logs show: "🚀 Phase 2: All engines initialized and routes mounted"');
  console.log('  3. Test health check: curl http://localhost:4175/api/health/live');
  console.log('  4. Deploy to Cloud Run: gcloud run deploy\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Please fix issues above\n');
  process.exit(1);
}
