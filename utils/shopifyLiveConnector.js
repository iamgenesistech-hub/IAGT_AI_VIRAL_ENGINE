// utils/shopifyLiveConnector.js
// Provides live Shopify product and collection data for the EVICS backend.
// Wraps the existing pull utilities so server.js has a single import point.

const { pullSKUs } = require('./shopifySkuPull');
const { pullCollections } = require('./shopifyCollectionPull');

/**
 * Returns an array of Shopify product objects.
 * Extend this function to call the real Shopify Admin API when credentials
 * are available; for now it returns the canonical SKU list as lightweight
 * product stubs so the endpoint is always functional.
 */
async function fetchShopifyProducts() {
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
  const collections = pullCollections();
  return collections.map((name) => ({
    title: name,
    handle: name.toLowerCase().replace(/\s+/g, '-'),
  }));
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyCollections,
};
