#!/usr/bin/env node

/**
 * run-loadtests.js — Orchestrate load testing suite
 * 
 * Runs both 500 and 1000 concurrent user tests with reporting
 * Usage: npm run loadtest
 */

const { spawn } = require('child_process');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const tests = [
  {
    name: '500 Concurrent Users (Production Load)',
    script: 'loadtest-500.js',
    timeout: 180000,
    env: {
      BASE_URL: process.env.BASE_URL || 'http://localhost:4175',
      CONCURRENT_USERS: '500',
      TEST_DURATION: '60',
      RAMP_UP: '30'
    }
  },
  {
    name: '1,000 Concurrent Users (Stress Test)',
    script: 'loadtest-1000.js',
    timeout: 240000,
    env: {
      BASE_URL: process.env.BASE_URL || 'http://localhost:4175',
      CONCURRENT_USERS: '1000',
      TEST_DURATION: '60',
      RAMP_UP: '45'
    }
  }
];

let currentTestIndex = 0;
const results = [];

function runTest(testConfig) {
  return new Promise((resolve) => {
    console.log(`\n${BLUE}[$] Running: ${testConfig.name}${RESET}`);
    console.log(`${BLUE}    Script: ${testConfig.script}${RESET}`);
    console.log(`${BLUE}    Timeout: ${testConfig.timeout / 1000}s${RESET}\n`);
    
    const script = path.join(__dirname, testConfig.script);
    const env = { ...process.env, ...testConfig.env };
    
    const proc = spawn('node', [script], {
      env,
      stdio: 'inherit',
      timeout: testConfig.timeout
    });
    
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
      console.error(`\n${RED}[ERROR] Test timed out after ${testConfig.timeout / 1000}s${RESET}\n`);
    }, testConfig.timeout);
    
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      
      const result = {
        name: testConfig.name,
        script: testConfig.script,
        passed: !timedOut && code === 0,
        code,
        timedOut
      };
      
      results.push(result);
      
      if (result.passed) {
        console.log(`\n${GREEN}[✓] ${result.name} PASSED${RESET}\n`);
      } else if (result.timedOut) {
        console.log(`\n${RED}[✗] ${result.name} TIMED OUT${RESET}\n`);
      } else {
        console.log(`\n${RED}[✗] ${result.name} FAILED (exit code: ${code})${RESET}\n`);
      }
      
      resolve(result);
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`\n${RED}[ERROR] Failed to run test: ${err.message}${RESET}\n`);
      results.push({
        name: testConfig.name,
        passed: false,
        error: err.message
      });
      resolve();
    });
  });
}

async function runAllTests() {
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║         LOAD TEST SUITE — Scaling Validation              ║${RESET}`);
  console.log(`${BLUE}║         Testing 500 → 1000 concurrent user capacity       ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
  
  for (const test of tests) {
    await runTest(test);
  }
  
  // Print summary
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║                    TEST SUMMARY                           ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
  
  for (const result of results) {
    const status = result.passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
    const testName = result.name.padEnd(45);
    console.log(`  ${testName} ${status}`);
  }
  
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  
  console.log(`\n${BLUE}Summary:${RESET}`);
  console.log(`  Total tests: ${results.length}`);
  console.log(`  ${GREEN}Passed: ${passCount}${RESET}`);
  console.log(`  ${RED}Failed: ${failCount}${RESET}`);
  
  const allPassed = results.every(r => r.passed);
  
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║${allPassed ? GREEN + ' ✓ ALL TESTS PASSED' + RESET + BLUE : RED + ' ✗ SOME TESTS FAILED' + RESET + BLUE}                       ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

// Check if server is running
const http = require('http');
const testUrl = process.env.BASE_URL || 'http://localhost:4175';

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`${testUrl}/health`, (res) => {
      req.abort();
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    setTimeout(() => {
      req.abort();
      resolve(false);
    }, 5000);
  });
}

async function main() {
  console.log(`${YELLOW}[*] Checking server availability at ${testUrl}...${RESET}`);
  const serverOk = await checkServer();
  
  if (!serverOk) {
    console.error(`\n${RED}[ERROR] Server not responding at ${testUrl}${RESET}`);
    console.error(`${RED}Please ensure the backend is running:${RESET}`);
    console.error(`${YELLOW}  npm run dev${RESET}\n`);
    process.exit(1);
  }
  
  console.log(`${GREEN}[✓] Server is responding${RESET}\n`);
  
  await runAllTests();
}

main().catch(err => {
  console.error(`${RED}[ERROR]${RESET}`, err);
  process.exit(1);
});
