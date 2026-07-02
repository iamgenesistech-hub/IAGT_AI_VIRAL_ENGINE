'use strict';

const fs = require('fs');
const path = require('path');

const PRODUCT_MOCKUP_LIBRARY_PATH = path.join(__dirname, '../data/evics_product_mockups.json');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  return normalizeText(String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' '));
}

function normalizeUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  if (raw.startsWith('//')) return `https:${raw}`;
  return raw;
}

function productHandleFromUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const match = parsed.pathname.match(/\/products\/([^/?#]+)/i);
    return match ? String(match[1]).toLowerCase() : '';
  } catch {
    return '';
  }
}

function normalizeProductEntry(product) {
  const id = normalizeText(product.id || product.shopify_id || product.product_id || '');
  const handle = normalizeText(product.handle || product.product_handle || '');
  const title = normalizeText(product.title || product.name || product.productTitle || '');
  const primaryImageUrl = normalizeUrl(
    product.primaryImageUrl ||
    product.imageUrl ||
    product.image ||
    product.product_image_url ||
    (Array.isArray(product.images) && product.images[0] && (product.images[0].src || product.images[0].url)) ||
    ''
  );
  const productPageUrl = normalizeUrl(
    product.productPageUrl ||
    product.product_page_url ||
    product.productUrl ||
    (handle ? `https://iamgenesistech.myshopify.com/products/${handle}` : '')
  );
  const description = stripHtml(product.description || product.body_html || product.bodyHtml || '');
  if (!id && !handle && !title) return null;
  return {
    productId: id || handle || title.toLowerCase().replace(/\s+/g, '-'),
    handle,
    title,
    primaryImageUrl,
    productPageUrl,
    description,
    source: normalizeText(product.source || 'shopify'),
    syncedAt: new Date().toISOString()
  };
}

function buildProductMockupLibrary(products = [], source = 'shopify') {
  const entries = products
    .map((product) => normalizeProductEntry({ ...product, source: product.source || source }))
    .filter(Boolean);
  return {
    generatedAt: new Date().toISOString(),
    source,
    count: entries.length,
    products: entries
  };
}

function writeProductMockupLibrary(products = [], source = 'shopify') {
  const payload = buildProductMockupLibrary(products, source);
  const dir = path.dirname(PRODUCT_MOCKUP_LIBRARY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PRODUCT_MOCKUP_LIBRARY_PATH, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function readProductMockupLibrary() {
  if (!fs.existsSync(PRODUCT_MOCKUP_LIBRARY_PATH)) {
    return { generatedAt: null, source: 'none', count: 0, products: [] };
  }
  const raw = fs.readFileSync(PRODUCT_MOCKUP_LIBRARY_PATH, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!raw) return { generatedAt: null, source: 'none', count: 0, products: [] };
  const parsed = JSON.parse(raw);
  return {
    generatedAt: parsed.generatedAt || parsed.synced_at || null,
    source: parsed.source || 'file-cache',
    count: Number(parsed.count || (Array.isArray(parsed.products) ? parsed.products.length : 0)) || 0,
    products: Array.isArray(parsed.products) ? parsed.products.map((product) => normalizeProductEntry(product)).filter(Boolean) : []
  };
}

function resolveProductMockup(criteria = {}, products = null) {
  const productId = normalizeText(criteria.productId || criteria.product_id || '');
  const productHandle = normalizeText(criteria.productHandle || criteria.product_handle || '');
  const productTitle = normalizeText(criteria.productTitle || criteria.title || '');
  const productPageUrl = normalizeUrl(criteria.productPageUrl || criteria.product_page_url || '');
  const pageHandle = productHandleFromUrl(productPageUrl);

  const records = Array.isArray(products) && products.length
    ? products.map((product) => normalizeProductEntry(product)).filter(Boolean)
    : readProductMockupLibrary().products;

  if (!records.length) return null;
  const byId = productId
    ? records.find((product) => product.productId === productId || product.handle === productId || product.title.toLowerCase() === productId.toLowerCase())
    : null;
  if (byId) return byId;
  const byHandle = (productHandle || pageHandle)
    ? records.find((product) => product.handle.toLowerCase() === String(productHandle || pageHandle).toLowerCase())
    : null;
  if (byHandle) return byHandle;
  const byTitle = productTitle
    ? records.find((product) => product.title.toLowerCase() === productTitle.toLowerCase())
    : null;
  if (byTitle) return byTitle;
  const byPage = productPageUrl
    ? records.find((product) => product.productPageUrl === productPageUrl || productHandleFromUrl(product.productPageUrl) === pageHandle)
    : null;
  if (byPage) return byPage;
  return null;
}

module.exports = {
  PRODUCT_MOCKUP_LIBRARY_PATH,
  buildProductMockupLibrary,
  writeProductMockupLibrary,
  readProductMockupLibrary,
  resolveProductMockup
};
