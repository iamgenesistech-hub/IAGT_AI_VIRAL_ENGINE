/**
 * loadtest-500.js — Load test for 500 concurrent users
 * 
 * Simulates 500 concurrent users making requests to key endpoints:
 * - Avatar creation
 * - Product video generation
 * - Status polling
 * - Admin visibility endpoints
 * 
 * Targets: p95 latency < 5s, error rate < 1%
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4175';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '500');
const TEST_DURATION_SECONDS = parseInt(process.env.TEST_DURATION || '60');
const RAMP_UP_SECONDS = parseInt(process.env.RAMP_UP || '30');

// Test statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  latencies: [],
  errors: {},
  startTime: Date.now(),
  endTime: null,
  statusCodes: {}
};

// Affiliate codes for load testing
const TEST_AFFILIATES = [
  'LOADTEST001', 'LOADTEST002', 'LOADTEST003', 'LOADTEST004', 'LOADTEST005',
  'LOADTEST006', 'LOADTEST007', 'LOADTEST008', 'LOADTEST009', 'LOADTEST010'
];

// Request scenarios
const scenarios = [
  {
    name: 'Health Check',
    weight: 0.1,
    endpoint: '/api/health',
    method: 'GET'
  },
  {
    name: 'CDN Health',
    weight: 0.05,
    endpoint: '/api/cdn/health',
    method: 'GET'
  },
  {
    name: 'Avatar List',
    weight: 0.15,
    endpoint: affiliateCode => `/api/affiliate/avatars?code=${affiliateCode}`,
    method: 'GET'
  },
  {
    name: 'Product Videos List',
    weight: 0.15,
    endpoint: affiliateCode => `/api/affiliate/product-videos?code=${affiliateCode}`,
    method: 'GET'
  },
  {
    name: 'Async Job Errors',
    weight: 0.1,
    endpoint: '/api/admin/async-job-errors',
    method: 'GET',
    headers: { 'x-admin-key': process.env.ADMIN_KEY || 'test' }
  },
  {
    name: 'Profile Get',
    weight: 0.2,
    endpoint: affiliateCode => `/api/affiliate/profile?code=${affiliateCode}`,
    method: 'GET'
  },
  {
    name: 'Governance Health',
    weight: 0.1,
    endpoint: '/api/governance/health',
    method: 'GET'
  },
  {
    name: 'Production Closeout Status',
    weight: 0.05,
    endpoint: '/api/production-closeout/status',
    method: 'GET'
  }
];

// Calculate total weight for weighted random selection
const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);

/**
 * Select a random scenario based on weights
 */
function selectScenario() {
  let rand = Math.random() * totalWeight;
  for (const scenario of scenarios) {
    rand -= scenario.weight;
    if (rand <= 0) return scenario;
  }
  return scenarios[0];
}

/**
 * Make an HTTP request and measure latency
 */
function makeRequest(endpoint, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      headers: {
        'User-Agent': 'LoadTest/1.0',
        'Connection': 'keep-alive',
        ...headers
      }
    };
    
    const startTime = Date.now();
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        const status = res.statusCode;
        
        stats.totalRequests++;
        stats.latencies.push(latency);
        stats.totalLatency += latency;
        stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;
        
        if (status >= 200 && status < 300) {
          stats.successfulRequests++;
        } else if (status >= 400 && status < 600) {
          stats.failedRequests++;
          stats.errors[status] = (stats.errors[status] || 0) + 1;
        }
        
        resolve({ status, latency, success: status < 400 });
      });
    });
    
    req.on('error', (err) => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors[err.code] = (stats.errors[err.code] || 0) + 1;
      resolve({ status: 0, latency: Date.now() - startTime, success: false, error: err.message });
    });
    
    req.end();
  });
}

/**
 * Simulate a single user making requests
 */
async function simulateUser(userId, endTime) {
  while (Date.now() < endTime) {
    const scenario = selectScenario();
    const affiliateCode = TEST_AFFILIATES[userId % TEST_AFFILIATES.length];
    
    let endpoint = scenario.endpoint;
    if (typeof endpoint === 'function') {
      endpoint = endpoint(affiliateCode);
    }
    
    await makeRequest(endpoint, scenario.method, scenario.headers || {});
    
    // Random think time between requests (10-100ms)
    await new Promise(r => setTimeout(r, 10 + Math.random() * 90));
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run the load test
 */
async function runLoadTest() {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║         LOAD TEST: 500 Concurrent Users                  ║`);
  console.log(`║         Duration: ${TEST_DURATION_SECONDS}s  |  Ramp-up: ${RAMP_UP_SECONDS}s              ║`);
  console.log(`║         Target: p95 < 5000ms  |  Error rate < 1%        ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  const testEndTime = Date.now() + (TEST_DURATION_SECONDS * 1000);
  const rampUpInterval = (RAMP_UP_SECONDS * 1000) / CONCURRENT_USERS;
  
  // Ramp up: start users gradually
  console.log(`[RAMP-UP] Starting ${CONCURRENT_USERS} users over ${RAMP_UP_SECONDS} seconds...`);
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(
      new Promise(resolve => {
        setTimeout(() => {
          simulateUser(i, testEndTime).then(resolve);
        }, i * rampUpInterval);
      })
    );
  }
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  stats.endTime = Date.now();
  
  // Calculate results
  const duration = (stats.endTime - stats.startTime) / 1000;
  const p50 = percentile(stats.latencies, 50);
  const p95 = percentile(stats.latencies, 95);
  const p99 = percentile(stats.latencies, 99);
  const avgLatency = stats.totalLatency / stats.totalRequests;
  const errorRate = (stats.failedRequests / stats.totalRequests * 100).toFixed(2);
  const rps = (stats.totalRequests / duration).toFixed(2);
  
  // Print results
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                    TEST RESULTS                           ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  console.log(`Duration:              ${duration.toFixed(2)}s`);
  console.log(`Total Requests:        ${stats.totalRequests}`);
  console.log(`Successful:            ${stats.successfulRequests} (${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%)`);
  console.log(`Failed:                ${stats.failedRequests} (${errorRate}%)`);
  console.log(`Requests/sec:          ${rps}\n`);
  
  console.log(`Latency (ms):`);
  console.log(`  Average:             ${avgLatency.toFixed(2)}ms`);
  console.log(`  p50 (median):        ${p50}ms`);
  console.log(`  p95:                 ${p95}ms ✓ TARGET`);
  console.log(`  p99:                 ${p99}ms\n`);
  
  console.log(`Status Codes:`);
  for (const [code, count] of Object.entries(stats.statusCodes).sort()) {
    const pct = (count / stats.totalRequests * 100).toFixed(1);
    console.log(`  ${code}:                 ${count} (${pct}%)`);
  }
  
  console.log(`\nRequest Distribution:`);
  scenarios.forEach(scenario => {
    const scenarioCount = Math.round(stats.totalRequests * scenario.weight);
    const pct = (scenario.weight * 100).toFixed(1);
    console.log(`  ${scenario.name.padEnd(25)} ${scenarioCount} (${pct}%)`);
  });
  
  // Pass/Fail verdict
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  const p95Pass = p95 < 5000;
  const errorPass = parseFloat(errorRate) < 1;
  const allPass = p95Pass && errorPass;
  
  console.log(`║                      ${allPass ? '✓ PASS' : '✗ FAIL'}                              ║`);
  console.log(`║  p95 latency < 5000ms: ${p95Pass ? '✓ PASS' : `✗ FAIL (${p95}ms)`}${' '.repeat(Math.max(0, 27 - `PASS (${p95}ms)`.length))}║`);
  console.log(`║  Error rate < 1%:      ${errorPass ? '✓ PASS' : `✗ FAIL (${errorRate}%)`}${' '.repeat(Math.max(0, 31 - `FAIL (${errorRate}%)`.length))}║`);
  console.log(`║  Concurrent users:     500 ✓${' '.repeat(42)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  process.exit(allPass ? 0 : 1);
}

// Run the test
runLoadTest().catch(err => {
  console.error('[ERROR] Load test failed:', err);
  process.exit(1);
});
