#!/usr/bin/env node
'use strict';

/**
 * Minimal Viral Media Router Test
 * Tests the router setup without starting the full server
 */

const express = require('express');
const { createViralMediaRouter } = require('./backend/viralMediaRoutesClean');

const app = express();
app.use(express.json());

// Register the router
const viralMediaRouter = createViralMediaRouter();
app.use('/api/viral-media', viralMediaRouter);

console.log('\n✓ Router created successfully');
console.log('✓ Router registered at /api/viral-media');

// Start a quick test server
const PORT = 4175;
const server = app.listen(PORT, () => {
  console.log(`✓ Test server running on http://localhost:${PORT}`);
  console.log('\n🚀 Quick tests:\n');

  const testEndpoints = [
    '/api/viral-media/dashboard',
    '/api/viral-media/products',
    '/api/viral-media/render-queue',
    '/api/viral-media/regeneration'
  ];

  const http = require('http');
  let completed = 0;

  testEndpoints.forEach((endpoint) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: endpoint,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      const statusOk = res.statusCode === 200;
      const symbol = statusOk ? '✓' : '✗';
      console.log(`${symbol} ${res.statusCode} GET ${endpoint}`);
      completed++;
      if (completed === testEndpoints.length) {
        server.close();
        process.exit(0);
      }
    });

    req.on('error', (err) => {
      console.log(`✗ ERROR GET ${endpoint}: ${err.message}`);
      completed++;
      if (completed === testEndpoints.length) {
        server.close();
        process.exit(1);
      }
    });

    req.end();
  });
});
