// utils/shopifyAdminConnector.js
// EVICS Shopify Admin API connector.
// This is separate from shopifyLiveConnector.js, which reads synced Shopify data from Supabase.

function clean(value) {
  return String(value || '').trim();
}

function getShopifyAdminConfig() {
  const storeDomain = clean(
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_STORE ||
    process.env.SHOPIFY_SHOP
  );

  const apiVersion = clean(process.env.SHOPIFY_API_VERSION) || '2025-10';

  const adminToken = clean(
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
    process.env.SHOPIFY_ACCESS_TOKEN
  );

  return {
    storeDomain,
    apiVersion,
    adminToken,
    configured: Boolean(storeDomain && adminToken)
  };
}

function tokenFingerprint(token) {
  const value = clean(token);
  if (!value) return null;

  return {
    prefix: value.slice(0, 6),
    suffix: value.slice(-4),
    length: value.length,
    looksLikeAdminToken: value.startsWith('shpat_')
  };
}

async function shopifyAdminRequest(path) {
  const config = getShopifyAdminConfig();

  if (!config.storeDomain) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN.');
  }

  if (!config.adminToken) {
    throw new Error('Missing SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_ACCESS_TOKEN.');
  }

  const url = `https://${config.storeDomain}/admin/api/${config.apiVersion}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': config.adminToken,
      'Content-Type': 'application/json'
    }
  });

  const text = await response.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message =
      json?.errors ||
      json?.error ||
      json?.message ||
      `Shopify Admin API request failed with HTTP ${response.status}`;

    const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    error.status = response.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function testShopifyAdminAuth() {
  const config = getShopifyAdminConfig();

  const base = {
    configured: config.configured,
    storeDomain: config.storeDomain || null,
    apiVersion: config.apiVersion,
    token: tokenFingerprint(config.adminToken)
  };

  if (!config.configured) {
    return {
      ok: false,
      ...base,
      error: 'Live Shopify Admin API is not configured. Add SHOPIFY_ADMIN_ACCESS_TOKEN.'
    };
  }

  const shop = await shopifyAdminRequest('/shop.json');

  return {
    ok: true,
    ...base,
    shop: shop.shop
      ? {
          id: shop.shop.id,
          name: shop.shop.name,
          domain: shop.shop.domain,
          myshopify_domain: shop.shop.myshopify_domain,
          email: shop.shop.email
        }
      : shop
  };
}

async function fetchLiveShopifyProducts(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 250));
  const data = await shopifyAdminRequest(`/products.json?limit=${safeLimit}`);
  return data.products || [];
}

module.exports = {
  getShopifyAdminConfig,
  testShopifyAdminAuth,
  fetchLiveShopifyProducts
};
