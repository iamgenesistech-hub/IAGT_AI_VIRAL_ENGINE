// backend/stripeEngine.js
// EVICS Stripe billing engine — subscription plans, checkout sessions,
// webhook handling, plan enforcement, and referral credits.
// Works with or without Stripe keys: graceful no-key fallback so dev/demo mode keeps running.
'use strict';

const SupabaseConnector = require('../utils/SupabaseConnector');

// ── Plan Definitions ──────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    videosPerMonth: 2,
    avatarsMax: 1,
    voiceClone: false,
    watermark: true,
    stripePriceId: null,
    features: [
      '1 AI avatar',
      '2 videos/month',
      'Platform metadata & SEO tools',
      'EVICS watermark on videos',
      '100% of your commissions',
    ],
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    price: 2900, // cents
    videosPerMonth: 20,
    avatarsMax: 3,
    voiceClone: true,
    watermark: false,
    stripePriceId: process.env.STRIPE_PRICE_CREATOR || null,
    features: [
      '3 AI avatars',
      '20 videos/month',
      'Your cloned voice on every video',
      'No watermark',
      'All platforms',
      'Priority rendering',
      'Full caption & SRT export',
    ],
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 7900, // cents
    videosPerMonth: Infinity,
    avatarsMax: 5,
    voiceClone: true,
    watermark: false,
    stripePriceId: process.env.STRIPE_PRICE_ELITE || null,
    features: [
      '5 AI avatars',
      'Unlimited videos',
      'Your cloned voice on every video',
      'No watermark',
      'All platforms',
      'Admin Hub full access',
      'Commission boost — early product access',
      'Priority support',
    ],
  },
};

// ── Stripe client (lazy — only initialised when key is present) ───────────────

let _stripe = null;
function getStripe() {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require('stripe');
  _stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
  return _stripe;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function getSupabase() {
  try { return await SupabaseConnector.getClient(); } catch { return null; }
}

// ── Plan storage (Supabase evics_affiliate_plans, in-memory fallback) ─────────

const _planCache = new Map(); // affiliateCode → { plan, videosUsed, periodStart, stripeCustomerId }

async function ensurePlansTable(sb) {
  if (!sb) return;
  try {
    await sb.from('evics_affiliate_plans').select('affiliate_code').limit(1);
  } catch {}
}

async function getAffiliatePlanRecord(affiliateCode) {
  const code = String(affiliateCode || '').toUpperCase();
  const sb = await getSupabase();
  if (sb) {
    try {
      const { data } = await sb
        .from('evics_affiliate_plans')
        .select('*')
        .eq('affiliate_code', code)
        .single();
      if (data) {
        _planCache.set(code, data);
        return data;
      }
    } catch {}
  }
  // In-memory fallback
  return _planCache.get(code) || null;
}

async function upsertAffiliatePlanRecord(record) {
  const code = String(record.affiliate_code || '').toUpperCase();
  record.affiliate_code = code;
  record.updated_at = new Date().toISOString();
  _planCache.set(code, record);
  const sb = await getSupabase();
  if (sb) {
    try {
      await sb.from('evics_affiliate_plans').upsert(record, { onConflict: 'affiliate_code' });
    } catch {}
  }
  return record;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the current plan for an affiliate.
 * Returns the plan object (free/creator/elite) and usage.
 */
async function getPlanForAffiliate(affiliateCode) {
  const record = await getAffiliatePlanRecord(affiliateCode);
  const planId = record?.plan_id || 'free';
  const plan = PLANS[planId] || PLANS.free;

  // Reset monthly video count if new billing period
  const now = new Date();
  const periodStart = record?.period_start ? new Date(record.period_start) : null;
  const sameMonth = periodStart &&
    periodStart.getFullYear() === now.getFullYear() &&
    periodStart.getMonth() === now.getMonth();
  const videosUsed = sameMonth ? (record?.videos_used || 0) : 0;

  return {
    plan,
    planId,
    videosUsed,
    videosRemaining: plan.videosPerMonth === Infinity ? Infinity : Math.max(0, plan.videosPerMonth - videosUsed),
    canGenerateVideo: plan.videosPerMonth === Infinity || videosUsed < plan.videosPerMonth,
    stripeCustomerId: record?.stripe_customer_id || null,
    stripeSubscriptionId: record?.stripe_subscription_id || null,
    subscriptionStatus: record?.subscription_status || (planId === 'free' ? 'free' : 'active'),
  };
}

/**
 * Increment video usage count for an affiliate.
 * Called after a successful video generation request.
 */
async function incrementVideoUsage(affiliateCode) {
  const code = String(affiliateCode || '').toUpperCase();
  const existing = await getAffiliatePlanRecord(code) || {};
  const now = new Date();
  const periodStart = existing.period_start ? new Date(existing.period_start) : null;
  const sameMonth = periodStart &&
    periodStart.getFullYear() === now.getFullYear() &&
    periodStart.getMonth() === now.getMonth();

  await upsertAffiliatePlanRecord({
    ...existing,
    affiliate_code: code,
    plan_id: existing.plan_id || 'free',
    videos_used: sameMonth ? (existing.videos_used || 0) + 1 : 1,
    period_start: sameMonth ? existing.period_start : now.toISOString(),
  });
}

/**
 * Create a Stripe Checkout Session for a subscription upgrade.
 * Returns { url } — the hosted Stripe Checkout URL.
 * Falls back to a descriptive message if Stripe is not configured.
 */
async function createCheckoutSession({ affiliateCode, planId, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const plan = PLANS[planId];
  if (!plan || plan.price === 0) throw new Error('Invalid plan for checkout');

  if (!stripe) {
    // Stripe not configured — return a placeholder response
    return {
      url: null,
      demo: true,
      message: `Stripe is not yet configured. Plan "${plan.name}" costs $${(plan.price / 100).toFixed(2)}/month. Set STRIPE_SECRET_KEY and STRIPE_PRICE_${planId.toUpperCase()} to activate checkout.`,
    };
  }

  if (!plan.stripePriceId) {
    throw new Error(`Stripe price ID for plan "${planId}" is not configured. Set STRIPE_PRICE_${planId.toUpperCase()} in environment variables.`);
  }

  const code = String(affiliateCode || '').toUpperCase();
  const existing = await getAffiliatePlanRecord(code);

  const sessionParams = {
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl || `${process.env.APP_URL || 'https://evics-api-480958062306.us-central1.run.app'}/phone-app?affiliateCode=${code}&upgraded=1`,
    cancel_url: cancelUrl || `${process.env.APP_URL || 'https://evics-api-480958062306.us-central1.run.app'}/phone-app?affiliateCode=${code}`,
    metadata: { affiliateCode: code, planId },
    allow_promotion_codes: true,
  };

  // Attach existing customer if known
  if (existing?.stripe_customer_id) {
    sessionParams.customer = existing.stripe_customer_id;
  } else {
    sessionParams.customer_creation = 'always';
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe Billing Portal session so affiliates can manage their subscription.
 */
async function createPortalSession({ affiliateCode, returnUrl }) {
  const stripe = getStripe();
  if (!stripe) return { url: null, demo: true, message: 'Stripe not configured.' };

  const code = String(affiliateCode || '').toUpperCase();
  const record = await getAffiliatePlanRecord(code);
  if (!record?.stripe_customer_id) {
    return { url: null, message: 'No Stripe customer found for this affiliate.' };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripe_customer_id,
    return_url: returnUrl || `${process.env.APP_URL || 'https://evics-api-480958062306.us-central1.run.app'}/phone-app?affiliateCode=${code}`,
  });
  return { url: session.url };
}

/**
 * Handle incoming Stripe webhook events.
 * Verifies signature, processes plan changes.
 */
async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  if (webhookSecret) {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } else {
    // No secret configured — parse but don't verify (dev only)
    event = JSON.parse(rawBody.toString());
    console.warn('[Stripe] Webhook received without signature verification — set STRIPE_WEBHOOK_SECRET');
  }

  console.log(`[Stripe] Webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const affiliateCode = session.metadata?.affiliateCode;
      const planId = session.metadata?.planId;
      if (affiliateCode && planId) {
        const existing = await getAffiliatePlanRecord(affiliateCode) || {};
        await upsertAffiliatePlanRecord({
          ...existing,
          affiliate_code: affiliateCode,
          plan_id: planId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          upgraded_at: new Date().toISOString(),
        });
        console.log(`[Stripe] Affiliate ${affiliateCode} upgraded to ${planId}`);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const affiliateCode = sub.metadata?.affiliateCode;
      if (affiliateCode) {
        const existing = await getAffiliatePlanRecord(affiliateCode) || {};
        const planId = _resolvePlanFromSubscription(sub);
        await upsertAffiliatePlanRecord({
          ...existing,
          affiliate_code: affiliateCode,
          plan_id: planId || existing.plan_id || 'free',
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const affiliateCode = sub.metadata?.affiliateCode;
      if (affiliateCode) {
        const existing = await getAffiliatePlanRecord(affiliateCode) || {};
        await upsertAffiliatePlanRecord({
          ...existing,
          affiliate_code: affiliateCode,
          plan_id: 'free',
          stripe_subscription_id: null,
          subscription_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        });
        console.log(`[Stripe] Affiliate ${affiliateCode} downgraded to free (subscription cancelled)`);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      // Find affiliate by customer ID
      for (const [code, rec] of _planCache.entries()) {
        if (rec.stripe_customer_id === customerId) {
          await upsertAffiliatePlanRecord({ ...rec, subscription_status: 'past_due' });
          console.log(`[Stripe] Payment failed for affiliate ${code}`);
          break;
        }
      }
      break;
    }
    default:
      // Silently ignore unhandled events
      break;
  }

  return { received: true, type: event.type };
}

function _resolvePlanFromSubscription(sub) {
  if (!sub?.items?.data) return null;
  for (const item of sub.items.data) {
    const priceId = item.price?.id;
    if (priceId === process.env.STRIPE_PRICE_ELITE) return 'elite';
    if (priceId === process.env.STRIPE_PRICE_CREATOR) return 'creator';
  }
  return 'free';
}

/**
 * Apply a referral credit: give 1 month free by resetting videos_used to 0.
 */
async function applyReferralCredit(affiliateCode, referredByCode) {
  const code = String(affiliateCode || '').toUpperCase();
  const existing = await getAffiliatePlanRecord(code) || {};
  await upsertAffiliatePlanRecord({
    ...existing,
    affiliate_code: code,
    referral_credit_months: (existing.referral_credit_months || 0) + 1,
    referred_by: referredByCode || existing.referred_by,
  });
  console.log(`[Stripe] Referral credit applied to ${code} (referred by ${referredByCode})`);
}

module.exports = {
  PLANS,
  getPlanForAffiliate,
  incrementVideoUsage,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  applyReferralCredit,
};
