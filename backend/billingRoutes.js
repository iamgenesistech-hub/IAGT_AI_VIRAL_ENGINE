// backend/billingRoutes.js
// HTTP surface for Stripe billing: plan lookup, checkout, portal, webhooks.
// Mount in server.js: require('./billingRoutes')(app)
'use strict';

const express = require('express');
const {
  PLANS,
  getPlanForAffiliate,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  applyReferralCredit,
} = require('./stripeEngine');

module.exports = function mountBillingRoutes(app) {

  // ── GET /api/billing/plans ──────────────────────────────────────────────────
  // Returns all plan definitions (for display in the app without auth).
  app.get('/api/billing/plans', (req, res) => {
    const plans = Object.values(PLANS).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      priceLabel: p.price === 0 ? 'Free' : `$${(p.price / 100).toFixed(0)}/mo`,
      videosPerMonth: p.videosPerMonth === Infinity ? 'Unlimited' : p.videosPerMonth,
      avatarsMax: p.avatarsMax,
      voiceClone: p.voiceClone,
      watermark: p.watermark,
      features: p.features,
      stripeConfigured: !!p.stripePriceId,
    }));
    res.json({ success: true, plans });
  });

  // ── GET /api/billing/plan?affiliateCode=X ───────────────────────────────────
  app.get('/api/billing/plan', async (req, res) => {
    try {
      const affiliateCode = req.query.affiliateCode || req.query.code || '';
      if (!affiliateCode) return res.status(400).json({ success: false, error: 'affiliateCode required' });
      const data = await getPlanForAffiliate(affiliateCode);
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('[Billing] /plan error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/billing/checkout ──────────────────────────────────────────────
  app.post('/api/billing/checkout', async (req, res) => {
    try {
      const { affiliateCode, planId, successUrl, cancelUrl } = req.body || {};
      if (!affiliateCode) return res.status(400).json({ success: false, error: 'affiliateCode required' });
      if (!planId || !PLANS[planId] || planId === 'free') {
        return res.status(400).json({ success: false, error: 'valid planId (creator|elite) required' });
      }
      const result = await createCheckoutSession({ affiliateCode, planId, successUrl, cancelUrl });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Billing] /checkout error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/billing/portal ────────────────────────────────────────────────
  app.post('/api/billing/portal', async (req, res) => {
    try {
      const { affiliateCode, returnUrl } = req.body || {};
      if (!affiliateCode) return res.status(400).json({ success: false, error: 'affiliateCode required' });
      const result = await createPortalSession({ affiliateCode, returnUrl });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Billing] /portal error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/billing/webhook ───────────────────────────────────────────────
  // Stripe sends raw body — must use express.raw() middleware (handled below).
  app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];
      try {
        const result = await handleWebhook(req.body, sig);
        res.json(result);
      } catch (err) {
        console.error('[Stripe Webhook] Error:', err.message);
        res.status(400).json({ error: err.message });
      }
    }
  );

  // ── POST /api/billing/referral-credit ──────────────────────────────────────
  app.post('/api/billing/referral-credit', async (req, res) => {
    try {
      const { affiliateCode, referredByCode } = req.body || {};
      if (!affiliateCode) return res.status(400).json({ success: false, error: 'affiliateCode required' });
      await applyReferralCredit(affiliateCode, referredByCode);
      res.json({ success: true, message: `Referral credit applied to ${affiliateCode}` });
    } catch (err) {
      console.error('[Billing] /referral-credit error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('[BillingRoutes] Stripe billing routes mounted');
};
