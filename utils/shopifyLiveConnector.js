// utils/shopifyLiveConnector.js
// Provides live Shopify product and collection data for the EVICS backend.
// Wraps the existing pull utilities so server.js has a single import point.

const { pullSKUs } = require('./shopifySkuPull');
const { pullCollections } = require('./shopifyCollectionPull');

async function fetchSupabaseRows(table, columns = '*', limit = 250) {
  try {
    const SupabaseConnector = require('./SupabaseConnector');
    const { data, error } = await SupabaseConnector
      .from(table)
      .select(columns)
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

function shopifyHost() {
  return (process.env.SHOPIFY_STORE || process.env.SHOPIFY_SHOP || process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

function primaryShopifyHost() {
  return shopifyHost();
}

async function shopifyAdminFetch(pathname) {
  const version = process.env.SHOPIFY_API_VERSION || '2026-04';
  const sessions = await fetchSupabaseRows('shopify_sessions', 'shop,access_token,scope', 10);
  const primaryHost = shopifyHost();
  const candidates = [
    { host: primaryHost, token: process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN },
    ...sessions
      .filter((session) => session.shop && session.access_token && session.shop === primaryHost)
      .map((session) => ({ host: session.shop, token: session.access_token }))
  ].filter((item) => item.host && item.token);

  if (!candidates.length) return null;

  const errors = [];
  for (const candidate of candidates) {
    const response = await fetch(`https://${candidate.host}/admin/api/${version}${pathname}`, {
      headers: {
        'X-Shopify-Access-Token': candidate.token,
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      return response.json();
    }

    errors.push(`${candidate.host}: ${response.status}`);
  }

  throw new Error(`Shopify Admin API failed for all configured tokens (${errors.join(', ')}).`);
}

/**
 * Returns an array of Shopify product objects.
 * Extend this function to call the real Shopify Admin API when credentials
 * are available; for now it returns the canonical SKU list as lightweight
 * product stubs so the endpoint is always functional.
 */
async function fetchShopifyProducts() {
  const syncedProducts = await fetchSupabaseRows('shopify_products', '*', 250);
  if (syncedProducts.length && !shopifyHost().includes('iamgenesistech.myshopify.com')) {
    return syncedProducts.map((product) => ({
      id: String(product.id),
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      product_type: product.product_type,
      status: product.status,
      tags: product.tags,
      image_url: product.image_url || '',
      source: 'supabase-shopify-sync'
    }));
  }

  let live = null;
  try {
    live = await shopifyAdminFetch('/products.json?limit=250&status=active');
  } catch (error) {
    if (shopifyHost().includes('iamgenesistech.myshopify.com')) {
      return [];
    }
    throw error;
  }
  if (live && Array.isArray(live.products)) {
    return live.products.map((product) => ({
      id: String(product.id),
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      product_type: product.product_type,
      status: product.status,
      tags: product.tags,
      image_url: product.image?.src || '',
      source: 'shopify-admin'
    }));
  }

  const skus = pullSKUs();
  return skus.map((sku) => ({
    sku,
    title: sku.replace(/_/g, ' '),
    status: 'active',
  }));
}

/**
 * Returns an array of Shopify collection objects.
 */
async function fetchShopifyCollections() {
  const syncedCollections = await fetchSupabaseRows('shopify_collections', '*', 250);
  if (syncedCollections.length && !shopifyHost().includes('iamgenesistech.myshopify.com')) {
    return syncedCollections.map((collection) => ({
      id: String(collection.id),
      title: collection.title,
      handle: collection.handle,
      published: collection.published,
      source: 'supabase-shopify-sync'
    }));
  }

  let live = null;
  try {
    live = await shopifyAdminFetch('/custom_collections.json?limit=250');
  } catch (error) {
    if (shopifyHost().includes('iamgenesistech.myshopify.com')) {
      return [];
    }
    throw error;
  }
  if (live && Array.isArray(live.custom_collections)) {
    return live.custom_collections.map((collection) => ({
      id: String(collection.id),
      title: collection.title,
      handle: collection.handle,
      published: Boolean(collection.published_at),
      source: 'shopify-admin'
    }));
  }

  const collections = pullCollections();
  return collections.map((name) => ({
    title: name,
    handle: name.toLowerCase().replace(/\s+/g, '-'),
  }));
}

module.exports = {
  primaryShopifyHost,
  fetchShopifyProducts,
  fetchShopifyCollections,
};
