/**
 * phase2Integration.js
 *
 * Phase 2: Production Hardening Integration Module
 * ================================================
 *
 * Wire all 5 Phase 2 engines into the Express app in a clean, modular way.
 * Exports functions to mount routes and middleware without breaking existing code.
 *
 * Usage in server.js:
 *   const phase2 = require('./phase2Integration');
 *   phase2.initialize(app, admin);  // After express.json(), before routes
 *   phase2.mountAuthRoutes(app);     // After initialize
 *   phase2.mountBillingRoutes(app);  // Mount Stripe routes
 */

const healthCheckRoutes = require('./healthCheckRoutes');
const authEngine = require('./authEngine');
const rbacEngine = require('./rbacEngine');
const firestoreOptimizationEngine = require('./firestoreOptimizationEngine');
const stripeIntegrationEngine = require('./stripeIntegrationEngine');

let firestore = null;
let stripeEngine = null;
let firestoreOpt = null;
let healthChecks = null;

/**
 * Initialize Phase 2 engines (call this after express.json() in server.js)
 */
function initialize(app, admin) {
  try {
    firestore = admin.firestore();

    // Initialize health check routes
    healthChecks = healthCheckRoutes.createHealthCheckRoutes();
    app.use('/api/health', healthChecks);
    console.log('✅ Phase 2: Health check routes mounted');

    // Initialize Stripe engine
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      const stripe = require('stripe')(stripeSecretKey);
      stripeEngine = new stripeIntegrationEngine.StripeIntegrationEngine(stripe);
      console.log('✅ Phase 2: Stripe engine initialized');
    } else {
      console.warn('⚠️  Phase 2: STRIPE_SECRET_KEY not set, billing disabled');
    }

    // Initialize Firestore optimization engine
    firestoreOpt = new firestoreOptimizationEngine.FirestoreOptimizationEngine(firestore);
    console.log('✅ Phase 2: Firestore optimization engine initialized');

    return true;
  } catch (err) {
    console.error('❌ Phase 2 initialization failed:', err.message);
    return false;
  }
}

/**
 * Mount Auth routes (after initialize)
 */
function mountAuthRoutes(app) {
  try {
    // POST /api/auth/login
    app.post('/api/auth/login', authEngine.createLoginEndpoint(firestore));

    // POST /api/auth/refresh
    app.post('/api/auth/refresh', authEngine.createRefreshEndpoint());

    // POST /api/auth/logout
    app.post('/api/auth/logout', authEngine.createLogoutEndpoint());

    console.log('✅ Phase 2: Auth routes mounted (/api/auth/login, refresh, logout)');
    return true;
  } catch (err) {
    console.error('❌ Auth routes mount failed:', err.message);
    return false;
  }
}

/**
 * Mount Billing routes (requires Stripe configuration)
 */
function mountBillingRoutes(app) {
  try {
    if (!stripeEngine) {
      console.warn('⚠️  Billing routes not mounted: Stripe engine not initialized');
      return false;
    }

    const requireAuth = authEngine.createAuthMiddleware();

    // POST /api/billing/checkout
    app.post('/api/billing/checkout', 
      requireAuth, 
      stripeEngine.createCheckoutEndpoint()
    );

    // GET /api/billing/subscription
    app.get('/api/billing/subscription',
      requireAuth,
      stripeEngine.createSubscriptionEndpoint()
    );

    // Stripe webhook (must be before bodyParser raw middleware)
    app.post('/webhooks/stripe',
      require('express').raw({type: 'application/json'}),
      stripeEngine.createWebhookHandler()
    );

    console.log('✅ Phase 2: Billing routes mounted (/api/billing/*, /webhooks/stripe)');
    return true;
  } catch (err) {
    console.error('❌ Billing routes mount failed:', err.message);
    return false;
  }
}

/**
 * Create RBAC middleware factories
 */
function createMiddleware() {
  return {
    requireAuth: authEngine.createAuthMiddleware(),
    requirePermission: rbacEngine.createPermissionMiddleware(),
    requireRole: (allowedRoles) => rbacEngine.requireRole(...allowedRoles)
  };
}

/**
 * Wrap Firestore writes with optimization
 */
async function queueFirestoreWrite(collection, docId, data) {
  if (!firestoreOpt) {
    throw new Error('Firestore optimization engine not initialized');
  }
  return firestoreOpt.queueWrite(collection, docId, data);
}

/**
 * Increment a sharded counter for high-throughput metrics
 */
async function incrementShardedCounter(counterPath) {
  if (!firestoreOpt) {
    throw new Error('Firestore optimization engine not initialized');
  }
  return firestoreOpt.incrementShardedCounter(counterPath);
}

/**
 * Mark startup complete for health checks
 */
function markHealthCheckStartupComplete() {
  try {
    if (healthCheckRoutes && typeof healthCheckRoutes.markStartupComplete === 'function') {
      healthCheckRoutes.markStartupComplete();
      console.log('✅ Phase 2: Health check startup marked complete');
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Health check startup mark failed:', err.message);
    return false;
  }
}

/**
 * Export all Phase 2 integration functions
 */
module.exports = {
  initialize,
  mountAuthRoutes,
  mountBillingRoutes,
  createMiddleware,
  queueFirestoreWrite,
  incrementShardedCounter,
  markHealthCheckStartupComplete,
  
  // Direct engine access (if needed for advanced use)
  getFirestoreEngine: () => firestoreOpt,
  getStripeEngine: () => stripeEngine,
  getAuthEngine: () => authEngine,
  getRbacEngine: () => rbacEngine,
  getHealthCheckRoutes: () => healthCheckRoutes
};
