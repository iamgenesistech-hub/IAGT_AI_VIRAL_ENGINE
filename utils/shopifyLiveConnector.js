const axios = require('axios');
const fs = require('fs');
const path = require('path');
const supabase = require('./SupabaseConnector');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || process.env.SHOPIFY_SHOP || 'iamgenesistech.myshopify.com';
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API    = '2026-04';

// Local product cache — always populated by sync script or storefront fallback
const PRODUCT_CACHE_PATH = path.join(__dirname, '../data/shopify_products_cache.json');

function shopifyHeaders() {
  return {
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    'Content-Type': 'application/json'
  };
}

function normalizeProduct(p) {
  const firstVariant = (p.variants && p.variants[0]) || {};
  return {
    id: String(p.id || p.shopify_id || p.handle),
    shopify_id: String(p.id || p.shopify_id || ''),
    title: p.title || 'Unnamed Product',
    name: p.title || 'Unnamed Product',
    handle: p.handle || '',
    status: p.status || 'active',
    product_type: p.product_type || 'General',
    category: p.product_type || 'General',
    price: firstVariant.price || p.price || '0.00',
    sku: firstVariant.sku || p.handle || '',
    inventory_quantity: firstVariant.inventory_quantity || 0,
    image: (p.image && p.image.src) || p.image || (p.images && p.images[0] && p.images[0].src) || null,
    imageUrl: (p.image && p.image.src) || p.image || (p.images && p.images[0] && p.images[0].src) || null,
    tags: typeof p.tags === 'string' ? p.tags.split(', ').filter(Boolean) : (p.tags || []),
    vendor: p.vendor || '',
    body_html: p.body_html || '',
    variants_count: (p.variants || []).length,
    productUrl: p.productUrl || `https://iamgenesistech.com/products/${p.handle}`,
    affiliateLink: p.affiliateLink || `https://iamgenesistech.com/products/${p.handle}`,
    source: 'shopify',
    synced_at: new Date().toISOString()
  };
}

function normalizeCollection(c) {
  return {
    id: String(c.id),
    shopify_id: String(c.id),
    title: c.title || 'Unnamed Collection',
    handle: c.handle || '',
    body_html: c.body_html || '',
    image: (c.image && c.image.src) || null,
    sort_order: c.sort_order || 'best-selling',
    synced_at: new Date().toISOString()
  };
}

// Load local cache file (always available, written by sync or storefront pull)
function loadLocalCache() {
  try {
    if (fs.existsSync(PRODUCT_CACHE_PATH)) {
      let raw = fs.readFileSync(PRODUCT_CACHE_PATH, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
      const parsed = JSON.parse(raw);
      const products = parsed.products || parsed;
      if (Array.isArray(products) && products.length > 0) {
        console.log(`[shopifyLiveConnector] Loaded ${products.length} products from local cache`);
        return products.map(normalizeProduct);
      }
    }
  } catch (e) {
    console.warn('[shopifyLiveConnector] Local cache read failed:', e.message);
  }
  return null;
}

// Refresh local cache via public Storefront API (no token required)
async function refreshLocalCacheFromStorefront() {
  try {
    const url = `https://${SHOPIFY_DOMAIN}/products.json?limit=250`;
    const response = await axios.get(url, { timeout: 12000 });
    const products = (response.data.products || []).map(normalizeProduct);
    if (products.length > 0) {
      const payload = JSON.stringify({ synced_at: new Date().toISOString(), total: products.length, store_domain: SHOPIFY_DOMAIN, products }, null, 2);
      // Write without BOM
      const encoder = require('buffer').Buffer.from(payload, 'utf8');
      fs.writeFileSync(PRODUCT_CACHE_PATH, encoder);
      console.log(`[shopifyLiveConnector] Refreshed local cache: ${products.length} products`);
      return products;
    }
  } catch (e) {
    console.warn('[shopifyLiveConnector] Storefront refresh failed:', e.message);
  }
  return null;
}

async function fetchFromShopifyApi(path) {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API}${path}`;
  const response = await axios.get(url, { headers: shopifyHeaders(), timeout: 12000 });
  return response.data;
}

async function cacheProductsToSupabase(products) {
  try {
    const rows = products.map((p) => ({ ...p, id: p.shopify_id }));
    const { error } = await supabase
      .from('shopify_products')
      .upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[shopifyLiveConnector] Supabase cache write failed:', error.message);
  } catch (e) {
    console.warn('[shopifyLiveConnector] Cache write exception:', e.message);
  }
}

async function cacheCollectionsToSupabase(collections) {
  try {
    const rows = collections.map((c) => ({ ...c, id: c.shopify_id }));
    const { error } = await supabase
      .from('shopify_collections')
      .upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[shopifyLiveConnector] Supabase collections cache write failed:', error.message);
  } catch (e) {
    console.warn('[shopifyLiveConnector] Collections cache write exception:', e.message);
  }
}

async function fetchShopifyProducts() {
  // 1. Try live Shopify Admin API (requires valid admin token)
  if (SHOPIFY_DOMAIN && SHOPIFY_TOKEN) {
    try {
      const data = await fetchFromShopifyApi('/products.json?limit=250&status=active');
      const products = (data.products || []).map(normalizeProduct);
      if (products.length > 0) {
        cacheProductsToSupabase(products).catch(() => {});
        // Also refresh local file cache
        const payload = { synced_at: new Date().toISOString(), total: products.length, store_domain: SHOPIFY_DOMAIN, products };
        try { fs.writeFileSync(PRODUCT_CACHE_PATH, JSON.stringify(payload, null, 2)); } catch {}
        return products;
      }
    } catch (error) {
      console.warn('[shopifyLiveConnector] Admin API failed, trying storefront:', error.message);
    }
  }

  // 2. Try public Storefront API (no token required — works even if admin token is revoked)
  const storefrontProducts = await refreshLocalCacheFromStorefront();
  if (storefrontProducts && storefrontProducts.length > 0) {
    cacheProductsToSupabase(storefrontProducts).catch(() => {});
    return storefrontProducts;
  }

  // 3. Try Supabase cache
  try {
    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .order('synced_at', { ascending: false });
    if (!error && data && data.length > 0) return data;
  } catch {}

  // 4. Always-available local file cache
  const cached = loadLocalCache();
  if (cached) return cached;

  console.error('[shopifyLiveConnector] All product sources exhausted');
  return [];
}

async function fetchShopifyCollections() {
  if (SHOPIFY_DOMAIN && SHOPIFY_TOKEN) {
    try {
      const data = await fetchFromShopifyApi('/custom_collections.json?limit=250');
      const collections = (data.custom_collections || []).map(normalizeCollection);
      if (collections.length > 0) {
        cacheCollectionsToSupabase(collections).catch(() => {});
        return collections;
      }
    } catch (error) {
      console.warn('[shopifyLiveConnector] Shopify collections fetch failed, falling back to cache:', error.message);
    }
  }

  try {
    const { data, error } = await supabase
      .from('shopify_collections')
      .select('*')
      .order('synced_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[shopifyLiveConnector] fetchShopifyCollections: both live and cache failed:', error.message);
    return [];
  }
}

async function fetchShopifyOrders({ limit = 50, status = 'any', sinceId = null } = {}) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.warn('[shopifyLiveConnector] fetchShopifyOrders: Shopify credentials not set.');
    return [];
  }
  try {
    let path = `/orders.json?limit=${limit}&status=${status}`;
    if (sinceId) path += `&since_id=${sinceId}`;
    const data = await fetchFromShopifyApi(path);
    return data.orders || [];
  } catch (error) {
    console.error('[shopifyLiveConnector] fetchShopifyOrders failed:', error.message);
    return [];
  }
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyCollections,
  fetchShopifyOrders
};

function shopifyHeaders() {
  return {
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    'Content-Type': 'application/json'
  };
}

function normalizeProduct(p) {
  const firstVariant = (p.variants && p.variants[0]) || {};
  return {
    id: String(p.id),
    shopify_id: String(p.id),
    title: p.title || 'Unnamed Product',
    name: p.title || 'Unnamed Product',
    handle: p.handle || '',
    status: p.status || 'active',
    product_type: p.product_type || 'General',
    category: p.product_type || 'General',
    price: firstVariant.price || '0.00',
    sku: firstVariant.sku || p.handle || '',
    inventory_quantity: firstVariant.inventory_quantity || 0,
    image: (p.image && p.image.src) || (p.images && p.images[0] && p.images[0].src) || null,
    tags: typeof p.tags === 'string' ? p.tags.split(', ').filter(Boolean) : (p.tags || []),
    vendor: p.vendor || '',
    body_html: p.body_html || '',
    variants_count: (p.variants || []).length,
    synced_at: new Date().toISOString()
  };
}

function normalizeCollection(c) {
  return {
    id: String(c.id),
    shopify_id: String(c.id),
    title: c.title || 'Unnamed Collection',
    handle: c.handle || '',
    body_html: c.body_html || '',
    image: (c.image && c.image.src) || null,
    sort_order: c.sort_order || 'best-selling',
    synced_at: new Date().toISOString()
  };
}

async function fetchFromShopifyApi(path) {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API}${path}`;
  const response = await axios.get(url, { headers: shopifyHeaders(), timeout: 12000 });
  return response.data;
}
