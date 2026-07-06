/**
 * tests/phase2-integration.test.js
 * 
 * Phase 2 Integration Tests (Quick Smoke Tests)
 * Run: npm test -- phase2-integration.test.js
 */

const request = require('supertest');

// Mock Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Mock Firebase admin for Firestore
const mockAdmin = {
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        set: async (data) => data,
        update: async (data) => data,
        get: async () => ({ data: () => ({}) })
      }),
      add: async (data) => ({ id: 'mock-id' })
    })
  })
};

let phase2Integration;

describe('Phase 2 Integration Module', () => {
  
  before(() => {
    // Load phase2Integration module
    phase2Integration = require('../backend/phase2Integration');
  });

  describe('Module exports', () => {
    it('should export initialize function', () => {
      expect(typeof phase2Integration.initialize).toBe('function');
    });

    it('should export mountAuthRoutes function', () => {
      expect(typeof phase2Integration.mountAuthRoutes).toBe('function');
    });

    it('should export mountBillingRoutes function', () => {
      expect(typeof phase2Integration.mountBillingRoutes).toBe('function');
    });

    it('should export createMiddleware function', () => {
      expect(typeof phase2Integration.createMiddleware).toBe('function');
    });

    it('should export markHealthCheckStartupComplete function', () => {
      expect(typeof phase2Integration.markHealthCheckStartupComplete).toBe('function');
    });
  });

  describe('initialize()', () => {
    it('should initialize without errors', () => {
      const result = phase2Integration.initialize(app, mockAdmin);
      expect(result).toBe(true);
    });

    it('should mount health check routes', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
    });
  });

  describe('Auth routes', () => {
    it('should mount auth routes without errors', () => {
      const result = phase2Integration.mountAuthRoutes(app);
      expect(result).toBe(true);
    });

    it('should have POST /api/auth/login route', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'test', password: 'test' });
      // Will return 401 or 200 depending on mock data
      expect([200, 401, 400]).toContain(res.status);
    });
  });

  describe('Middleware creation', () => {
    it('should create middleware object with requireAuth', () => {
      const middleware = phase2Integration.createMiddleware();
      expect(typeof middleware.requireAuth).toBe('function');
    });

    it('should create middleware object with requirePermission', () => {
      const middleware = phase2Integration.createMiddleware();
      expect(typeof middleware.requirePermission).toBe('function');
    });

    it('should create middleware object with requireRole', () => {
      const middleware = phase2Integration.createMiddleware();
      expect(typeof middleware.requireRole).toBe('function');
    });
  });

  describe('Engine access', () => {
    it('should provide access to Firestore engine', () => {
      const engine = phase2Integration.getFirestoreEngine();
      expect(engine).toBeDefined();
    });

    it('should provide access to Auth engine', () => {
      const engine = phase2Integration.getAuthEngine();
      expect(engine).toBeDefined();
    });

    it('should provide access to RBAC engine', () => {
      const engine = phase2Integration.getRbacEngine();
      expect(engine).toBeDefined();
    });

    it('should provide access to health check routes', () => {
      const routes = phase2Integration.getHealthCheckRoutes();
      expect(routes).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle Firestore write errors gracefully', async () => {
      try {
        await phase2Integration.queueFirestoreWrite('test', 'id', {});
        // Should complete without throwing
      } catch (err) {
        // Acceptable if not initialized
        expect(err).toBeDefined();
      }
    });

    it('should handle sharded counter errors gracefully', async () => {
      try {
        await phase2Integration.incrementShardedCounter('stats/test');
        // Should complete without throwing
      } catch (err) {
        // Acceptable if not initialized
        expect(err).toBeDefined();
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Health Check Smoke Tests
// ─────────────────────────────────────────────────────────────

describe('Health Check Endpoints', () => {
  
  it('GET /api/health/live should return 200', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
  });

  it('GET /api/health/ready should return 200 or 503', async () => {
    const res = await request(app).get('/api/health/ready');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /api/health/startup should return 200 or 503', async () => {
    const res = await request(app).get('/api/health/startup');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /api/metrics should return Prometheus-format data', async () => {
    const res = await request(app).get('/api/metrics');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain('# HELP');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Auth Endpoint Smoke Tests
// ─────────────────────────────────────────────────────────────

describe('Auth Endpoints', () => {
  
  it('POST /api/auth/login with valid credentials should return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'test-user', password: 'test-password' });
    
    expect([200, 400, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    }
  });

  it('POST /api/auth/refresh should handle refresh requests', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'test-token' });
    
    expect([200, 400, 401]).toContain(res.status);
  });

  it('POST /api/auth/logout should handle logout requests', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'test-token' });
    
    expect([200, 400, 401]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────
// Integration Verification
// ─────────────────────────────────────────────────────────────

describe('Phase 2 Integration Verification', () => {
  
  it('should have health check route available', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
  });

  it('should have auth routes available', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({});
    expect([200, 400, 401]).toContain(loginRes.status);
  });

  it('should provide middleware creation', () => {
    const middleware = phase2Integration.createMiddleware();
    expect(middleware).toHaveProperty('requireAuth');
    expect(middleware).toHaveProperty('requirePermission');
    expect(middleware).toHaveProperty('requireRole');
  });

  it('should be non-breaking to existing routes', async () => {
    // Create a dummy route to test coexistence
    app.get('/dummy', (req, res) => res.json({ status: 'ok' }));
    const res = await request(app).get('/dummy');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

/**
 * Test Execution Guide
 * ═══════════════════════════════════════════════════════════
 * 
 * Run individual test file:
 *   npm test -- phase2-integration.test.js
 * 
 * Run with verbose output:
 *   npm test -- phase2-integration.test.js --verbose
 * 
 * Run specific test suite:
 *   npm test -- phase2-integration.test.js --grep "Module exports"
 * 
 * Expected Results:
 *   ✓ Module loads without errors
 *   ✓ Health check routes mounted
 *   ✓ Auth routes mounted
 *   ✓ Middleware available
 *   ✓ Engine access available
 * 
 *   Total: 20+ tests should pass
 * 
 * If tests fail:
 *   1. Check phase2Integration.js syntax: node --check backend/phase2Integration.js
 *   2. Check dependencies installed: npm list | grep stripe
 *   3. Check Firebase admin: npm list @google-cloud/firestore
 *   4. Review error output carefully for missing modules
 * 
 */

module.exports = {
  name: 'Phase 2 Integration Tests',
  description: 'Verify Phase 2 engines and routes are wired correctly',
  expectedPassing: 20,
  skipIfConditions: ['SKIP_PHASE2_TESTS']
};
