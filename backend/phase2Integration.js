/**
 * phase2Integration.js
 *
 * Phase 2: Production Hardening Integration Module
 * ================================================
 *
 * This module mounts the Phase 2 engines using the APIs that currently exist
 * in this repository. It degrades cleanly when optional infrastructure such as
 * Firestore or Stripe is not configured so the backend can still boot.
 */

const express = require('express');
const { registerHealthCheckRoutes } = require('./healthCheckRoutes');
const { AuthEngine } = require('./authEngine');
const { RBACEngine, requireAuth, requirePermission, requireRole, ROLES } = require('./rbacEngine');
const { FirestoreOptimizationEngine } = require('./firestoreOptimizationEngine');
const {
  getPlanForAffiliate,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  PLANS
} = require('./stripeEngine');
const { resolveFirestoreState } = require('./firestoreClient');

let firestore = null;
let auth = null;
let rbac = null;
let firestoreOpt = null;
let healthChecks = null;
let initialized = false;
let firestoreState = { client: null, mode: 'unavailable', configured: false, source: 'not-initialized' };

function normalizeRole(role) {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === ROLES.ADMIN || normalized === ROLES.AFFILIATE || normalized === ROLES.USER) {
    return normalized;
  }
  return ROLES.AFFILIATE;
}

function initialize(app, admin, deps = {}) {
  try {
    firestoreState = resolveFirestoreState(admin);
    firestore = firestoreState.client;
    auth = auth || new AuthEngine({
      redis: deps.redis || null,
      observability: deps.observability || null
    });
    rbac = rbac || new RBACEngine({
      observability: deps.observability || null
    });

    healthChecks = registerHealthCheckRoutes(app, {
      cacheEngine: deps.cacheEngine || null,
      persistenceEngine: deps.persistenceEngine || {
        isConnected: () => Boolean(firestore),
      },
      videoQueueEngine: deps.videoQueueEngine || null,
      observability: deps.observability || null,
      resilienceEngine: deps.resilienceEngine || null
    });
    console.log('✅ Phase 2: Health check routes mounted');

    firestoreOpt = new FirestoreOptimizationEngine({
      firestoreClient: firestore,
      observability: deps.observability || null
    });
    if (firestore && firestoreState.configured) {
      console.log(`✅ Phase 2: Firestore optimization engine initialized (${firestoreState.mode})`);
    } else {
      console.log('ℹ Phase 2: Firestore client unavailable locally; auth persistence will use live Firestore when ADC or service-account credentials are present');
    }

    initialized = true;
    return true;
  } catch (err) {
    console.error('❌ Phase 2 initialization failed:', err.message);
    return false;
  }
}

function mountAuthRoutes(app) {
  try {
    if (!initialized || !auth) {
      throw new Error('Phase 2 auth engine not initialized');
    }

    app.post('/api/auth/login', async (req, res) => {
      try {
        const affiliateId = String(req.body?.affiliateId || req.body?.affiliateCode || '').trim();
        const userId = String(req.body?.userId || affiliateId || req.body?.email || '').trim();
        const role = normalizeRole(req.body?.role);
        if (!userId) {
          return res.status(400).json({ success: false, error: 'userId or affiliateId is required' });
        }
        const tokens = await auth.issueTokens(userId, affiliateId || userId, role);
        const session = auth.getSession(userId);
        if (firestore && session) {
          const now = new Date().toISOString();
          await Promise.all([
            firestore.doc(`phase2_auth_users/${userId}`).set({
              userId,
              affiliateId: affiliateId || userId,
              role,
              lastLoginAt: now,
              updatedAt: now
            }, { merge: true }),
            firestore.doc(`phase2_auth_sessions/${session.sessionId}`).set({
              sessionId: session.sessionId,
              userId,
              affiliateId: affiliateId || userId,
              role,
              createdAt: new Date(session.createdAt).toISOString(),
              lastActiveAt: new Date(session.lastActiveAt).toISOString(),
              revokedAt: null,
              updatedAt: now
            }, { merge: true })
          ]);
        }
        res.json({
          success: true,
          user: {
            userId,
            affiliateId: affiliateId || userId,
            role
          },
          ...tokens
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/auth/refresh', async (req, res) => {
      try {
        const refreshToken = String(req.body?.refreshToken || '').trim();
        if (!refreshToken) {
          return res.status(400).json({ success: false, error: 'refreshToken is required' });
        }
        const tokens = await auth.refreshAccessToken(refreshToken);
        const claims = auth.verifyAccessToken(tokens.accessToken);
        const session = auth.getSession(claims.userId);
        if (firestore && session) {
          await firestore.doc(`phase2_auth_sessions/${session.sessionId}`).set({
            sessionId: session.sessionId,
            userId: claims.userId,
            affiliateId: claims.affiliateId,
            role: claims.role,
            lastActiveAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            revokedAt: null
          }, { merge: true });
        }
        res.json({ success: true, ...tokens });
      } catch (err) {
        res.status(401).json({ success: false, error: err.message });
      }
    });

    app.post('/api/auth/logout', async (req, res) => {
      try {
        const refreshToken = String(req.body?.refreshToken || '').trim();
        if (!refreshToken) {
          return res.status(400).json({ success: false, error: 'refreshToken is required' });
        }
        const claims = auth.jwtLib.verify(refreshToken);
        const session = auth.getSession(claims.userId);
        await auth.logout(claims.userId, refreshToken);
        if (firestore) {
          if (session?.sessionId) {
            await firestore.doc(`phase2_auth_sessions/${session.sessionId}`).set({
              revokedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
        res.json({ success: true });
      } catch (err) {
        res.status(401).json({ success: false, error: err.message });
      }
    });

    console.log('✅ Phase 2: Auth routes mounted (/api/auth/login, refresh, logout)');
    return true;
  } catch (err) {
    console.error('❌ Auth routes mount failed:', err.message);
    return false;
  }
}

function mountBillingRoutes(app) {
  try {
    if (!auth || !rbac) {
      throw new Error('Auth/RBAC engines not initialized');
    }

    const requireAuthenticatedUser = requireAuth(auth);

    app.post('/api/phase2/billing/checkout', requireAuthenticatedUser, async (req, res) => {
      try {
        const tier = String(req.body?.tier || 'creator').trim().toLowerCase();
        if (!PLANS[tier] || tier === 'free') {
          return res.status(400).json({ success: false, error: 'valid tier (creator|elite) is required' });
        }
        const session = await createCheckoutSession({
          affiliateCode: req.user.affiliateId || req.user.userId,
          planId: tier,
          successUrl: req.body?.successUrl,
          cancelUrl: req.body?.cancelUrl
        });
        res.json({ success: true, checkout: session });
      } catch (err) {
        res.status(400).json({ success: false, error: err.message });
      }
    });

    app.get('/api/phase2/billing/subscription', requireAuthenticatedUser, async (req, res) => {
      try {
        const planInfo = await getPlanForAffiliate(req.user.affiliateId || req.user.userId);
        res.json({
          success: true,
          subscription: planInfo
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/phase2/billing/portal', requireAuthenticatedUser, async (req, res) => {
      try {
        const result = await createPortalSession({
          affiliateCode: req.user.affiliateId || req.user.userId,
          returnUrl: req.body?.returnUrl
        });
        res.json({ success: true, portal: result });
      } catch (err) {
        res.status(400).json({ success: false, error: err.message });
      }
    });

    app.post('/api/phase2/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        const sig = req.headers['stripe-signature'];
        const result = await handleWebhook(req.body, sig);
        res.json({ success: true, ...result });
      } catch (err) {
        res.status(400).json({ success: false, error: err.message });
      }
    });

    console.log('✅ Phase 2: Billing routes mounted (/api/phase2/billing/*)');
    return true;
  } catch (err) {
    console.error('❌ Billing routes mount failed:', err.message);
    return false;
  }
}

function createMiddleware() {
  return {
    requireAuth: requireAuth(auth),
    requirePermission: (resource, action) => requirePermission(rbac, resource, action),
    requireRole: (allowedRoles) => requireRole(...allowedRoles)
  };
}

async function queueFirestoreWrite(collection, docId, data) {
  if (!firestoreOpt) {
    throw new Error('Firestore optimization engine not initialized');
  }
  return firestoreOpt.queueWrite(collection, docId, data);
}

async function incrementShardedCounter(counterName, affiliateId, amount = 1, numShards = 10) {
  if (!firestoreOpt) {
    throw new Error('Firestore optimization engine not initialized');
  }
  return firestoreOpt.incrementShardedCounter(counterName, affiliateId, amount, numShards);
}

function markHealthCheckStartupComplete() {
  try {
    if (healthChecks && typeof healthChecks.markStartupComplete === 'function') {
      healthChecks.markStartupComplete();
      console.log('✅ Phase 2: Health check startup marked complete');
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Health check startup mark failed:', err.message);
    return false;
  }
}

module.exports = {
  initialize,
  mountAuthRoutes,
  mountBillingRoutes,
  createMiddleware,
  queueFirestoreWrite,
  incrementShardedCounter,
  markHealthCheckStartupComplete,
  getFirestoreEngine: () => firestoreOpt,
  getStripeEngine: () => ({
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    plans: PLANS
  }),
  getFirestoreStatus: () => firestoreState,
  getAuthEngine: () => auth,
  getRbacEngine: () => rbac,
  getHealthCheckRoutes: () => healthChecks
};
