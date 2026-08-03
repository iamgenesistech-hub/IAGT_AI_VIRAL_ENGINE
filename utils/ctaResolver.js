'use strict';

/**
 * ctaResolver.js
 *
 * Shared helper used by both the reprocess pipeline
 * (backend/reprocessOverlaysRoute.js) and the live render pipeline
 * (backend/mediaRenderCreator.js) so Buy Now CTA URLs always end up on
 * a purchasable Shopify checkout host, never on the Squarespace mirror.
 *
 * Priority chain (in resolveCtaUrlFromRow):
 *   1. Stored URL on params (productPageUrl / postProcess.ctaClickUrl)
 *      — but only if the host is purchasable.
 *   2. Shopify catalog lookup via shopifyLiveConnector.fetchShopifyProducts:
 *      matches by shopifyProductId → handle → exact title → title-contains.
 *   3. Explicit handle field on params/row → https://{checkoutHost}/products/{handle}
 *   4. Slugified productTitle → https://{checkoutHost}/products/{slug}
 *
 * Blocked hosts (iamgenesistech.com) are rejected outright — attempting to
 * buy on that URL lands on the Squarespace mirror which has no checkout.
 */

const BLOCKED_CTA_HOSTS = new Set([
  'iamgenesistech.com',
  'www.iamgenesistech.com'
]);

const PURCHASE_HOST_ALLOWLIST = [
  /\.myshopify\.com$/i,
  /^shop\./i
];

function checkoutHost() {
  const raw = process.env.SHOPIFY_CHECKOUT_HOST ||
              process.env.SHOPIFY_STORE_DOMAIN ||
              process.env.SHOPIFY_STORE ||
              process.env.SHOPIFY_SHOP ||
              'iamgenesistech.myshopify.com';
  return String(raw).replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isPurchasableHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (BLOCKED_CTA_HOSTS.has(h)) return false;
  if (PURCHASE_HOST_ALLOWLIST.some((rx) => rx.test(h))) return true;
  return h === checkoutHost().toLowerCase();
}

function normalizeCtaUrl(raw) {
  if (!raw) return { ok: false, reason: 'empty' };
  let url;
  try { url = new URL(String(raw).trim()); }
  catch { return { ok: false, reason: 'invalid_url' }; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'unsupported_protocol' };
  }
  if (BLOCKED_CTA_HOSTS.has(url.hostname.toLowerCase())) {
    return {
      ok: false,
      reason: 'blocked_host',
      message: `${url.hostname} is not a purchasable checkout host. Use ${checkoutHost()}/products/{handle}.`
    };
  }
  return { ok: true, url: url.toString(), host: url.hostname.toLowerCase() };
}

async function resolveCtaUrlFromRow(row, params) {
  const stored = params && (params.productPageUrl || (params.postProcess && params.postProcess.ctaClickUrl));
  if (stored) {
    const check = normalizeCtaUrl(stored);
    if (check.ok && isPurchasableHost(check.host)) {
      return { url: check.url, source: 'stored', matchedProduct: null };
    }
  }

  const titleGuess = (params && (params.productTitle || params.productName || params.providerPackage))
    || (row && (row.product_name || row.product))
    || null;
  const handleGuess = (params && (params.productHandle || params.handle))
    || (row && (row.handle || row.product_handle))
    || null;
  const shopifyIdGuess = (params && (params.shopifyProductId || params.productId))
    || (row && (row.shopify_id || row.product_id))
    || null;

  try {
    const connector = require('./shopifyLiveConnector');
    if (connector && typeof connector.fetchShopifyProducts === 'function') {
      const products = await connector.fetchShopifyProducts();
      if (Array.isArray(products) && products.length) {
        const normTitle = (titleGuess || '').toLowerCase().trim();
        const normHandle = (handleGuess || '').toLowerCase().trim();
        const normSid = String(shopifyIdGuess || '').trim();
        const match = products.find((p) => {
          if (normSid && (String(p.id) === normSid || String(p.shopify_id) === normSid)) return true;
          if (normHandle && p.handle && p.handle.toLowerCase() === normHandle) return true;
          if (normTitle && p.title && p.title.toLowerCase() === normTitle) return true;
          return false;
        }) || (normTitle ? products.find((p) => p.title && p.title.toLowerCase().includes(normTitle)) : null);
        if (match) {
          const productUrl = match.productUrl || `https://${checkoutHost()}/products/${match.handle}`;
          const check = normalizeCtaUrl(productUrl);
          if (check.ok) {
            return { url: check.url, source: 'shopify_catalog', matchedProduct: { id: match.id, title: match.title, handle: match.handle } };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[ctaResolver] catalog lookup failed:', e && e.message);
  }

  if (handleGuess) {
    const url = `https://${checkoutHost()}/products/${handleGuess}`;
    return { url, source: 'explicit_handle', matchedProduct: null };
  }
  if (titleGuess) {
    const slug = slugify(titleGuess);
    if (slug) {
      const url = `https://${checkoutHost()}/products/${slug}`;
      return { url, source: 'slugified_title', matchedProduct: null };
    }
  }
  return { url: null, source: 'none', matchedProduct: null };
}

module.exports = {
  BLOCKED_CTA_HOSTS,
  PURCHASE_HOST_ALLOWLIST,
  checkoutHost,
  slugify,
  isPurchasableHost,
  normalizeCtaUrl,
  resolveCtaUrlFromRow
};
