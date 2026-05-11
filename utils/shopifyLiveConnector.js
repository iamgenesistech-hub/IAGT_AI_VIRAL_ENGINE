require('dotenv').config();

const axios = require('axios');

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const shopifyApi = axios.create({
  baseURL: `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2025-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function fetchShopifyProducts(limit = 15) {
  const response = await shopifyApi.get(`/products.json?limit=${limit}`);
  return response.data.products;
}

async function fetchShopifyCollections(limit = 15) {
  const response = await shopifyApi.get(`/custom_collections.json?limit=${limit}`);
  return response.data.custom_collections;
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyCollections
};