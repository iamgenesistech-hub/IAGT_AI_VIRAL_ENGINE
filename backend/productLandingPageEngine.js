'use strict';

const crypto = require('crypto');

const DEFAULT_SHOP_DOMAIN = 'iamgenesistech.myshopify.com';

function cleanText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function isAbsoluteHttpUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPurchasableUrl(url) {
  return isAbsoluteHttpUrl(url);
}

function normalizeShopDomain(input) {
  const raw = cleanText(input, DEFAULT_SHOP_DOMAIN);
  return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '').replace(/\/.*$/, '');
}

function normalizePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeBenefits(productBenefits) {
  if (Array.isArray(productBenefits)) {
    return productBenefits.map((entry) => cleanText(entry)).filter(Boolean);
  }
  if (typeof productBenefits === 'string') {
    return productBenefits
      .split(/\n|•|-/)
      .map((entry) => cleanText(entry))
      .filter(Boolean);
  }
  return [];
}

function toSlugPart(value, fallback = 'product') {
  const clean = cleanText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function makeShortId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

async function resolveStripeCheckoutUrl(record, helper) {
  if (!process.env.STRIPE_SECRET_KEY || typeof helper !== 'function') return null;
  const amount = normalizePrice(record.productPrice);
  if (!Number.isFinite(amount)) return null;
  const session = await helper(record, amount);
  if (session && isAbsoluteHttpUrl(session.url)) return session.url;
  return null;
}

async function buildBuyUrl(record = {}, options = {}) {
  const explicitUrl = cleanText(record.ctaUrl) || cleanText(record.productPageUrl);
  if (isAbsoluteHttpUrl(explicitUrl)) {
    return { buyUrl: explicitUrl, buySource: 'explicit' };
  }

  const shopDomain = normalizeShopDomain(record.shopDomain || process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP);
  const variantId = cleanText(record.productVariantId || record.variantId || record.shopifyVariantId);
  if (variantId) {
    return {
      buyUrl: `https://${shopDomain}/cart/${encodeURIComponent(variantId)}:1`,
      buySource: 'shopify_cart_permalink'
    };
  }

  const handle = cleanText(record.productHandle || record.handle);
  if (handle) {
    return {
      buyUrl: `https://${shopDomain}/products/${encodeURIComponent(handle)}`,
      buySource: 'shopify_product_page'
    };
  }

  const stripeBuyUrl = await resolveStripeCheckoutUrl(record, options.createStripeCheckoutSession);
  if (stripeBuyUrl) {
    return { buyUrl: stripeBuyUrl, buySource: 'stripe_checkout' };
  }

  return { buyUrl: null, buySource: null };
}

function renderLandingPageHtml(record = {}, { buyUrl } = {}) {
  const title = cleanText(record.productTitle, 'Featured Product');
  const brand = 'I AM GENESIS TECH';
  const priceText = cleanText(record.productPrice != null ? String(record.productPrice) : '', 'Price available at checkout');
  const videoUrl = cleanText(record.videoUrl || record.gcsVideoUrl);
  const productImage = cleanText(record.processedProductImageUrl || record.productImageUrl);
  const benefits = normalizeBenefits(record.productBenefits);
  const safeBenefits = benefits.length ? benefits : ['Supports daily wellness goals', 'Designed for consistent use', 'Easy to add to your routine'];
  const ogDescription = `${title} — ${priceText}. Watch the product video and buy now.`;
  const buyHref = isAbsoluteHttpUrl(buyUrl) ? buyUrl : '#';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | ${brand}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:title" content="${escapeHtml(title)} | ${brand}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(productImage)}" />
  <meta property="og:video" content="${escapeHtml(videoUrl)}" />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #080b12; color: #f5f7fa; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 16px 16px 110px; }
    .brand { font-size: 12px; letter-spacing: .12em; color: #7ec8ff; margin-bottom: 10px; }
    h1 { margin: 0 0 8px; font-size: clamp(26px, 6vw, 40px); line-height: 1.08; }
    .price { display: inline-block; margin-bottom: 16px; background: #12263a; color: #8ce6ff; padding: 8px 12px; border-radius: 999px; font-weight: 700; }
    .hero { width: min(100%, 320px); display: block; margin: 0 auto 16px; }
    video { width: 100%; border-radius: 14px; background: #000; margin-bottom: 18px; }
    .panel { background: #0f1624; border: 1px solid #1f3550; border-radius: 14px; padding: 16px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 0 0 8px; color: #d3dfef; }
    .how { margin-top: 14px; color: #9cb3cf; }
    .sticky { position: fixed; left: 0; right: 0; bottom: 0; padding: 14px 16px 18px; background: linear-gradient(180deg, rgba(8,11,18,0), rgba(8,11,18,.95) 30%, rgba(8,11,18,1)); }
    .buy-btn { display: block; max-width: 860px; margin: 0 auto; text-decoration: none; text-align: center; font-weight: 800; color: #05111d; background: #7cf2a4; border-radius: 12px; padding: 16px 18px; }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="brand">${brand}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="price">${escapeHtml(priceText)}</div>
    ${productImage ? `<img class="hero" src="${escapeHtml(productImage)}" alt="${escapeHtml(title)} product image" />` : ''}
    ${videoUrl ? `<video controls playsinline preload="metadata" src="${escapeHtml(videoUrl)}"></video>` : ''}
    <section class="panel">
      <ul>${safeBenefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join('')}</ul>
      <p class="how">How to use: Follow the label directions daily for best results.</p>
    </section>
  </main>
  <div class="sticky">
    <a class="buy-btn" href="${escapeHtml(buyHref)}" target="_blank" rel="noopener noreferrer">BUY NOW</a>
  </div>
</body>
</html>`;
}

function createLandingPageRecord(record = {}) {
  const source = toSlugPart(record.productHandle || record.handle || record.productTitle || 'product');
  const id = makeShortId();
  const slug = `${source}-${id}`;
  return {
    id,
    slug,
    buyUrl: null,
    buySource: null,
    landingPath: `/lp/${slug}`
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  buildBuyUrl,
  renderLandingPageHtml,
  createLandingPageRecord,
  isPurchasableUrl
};
