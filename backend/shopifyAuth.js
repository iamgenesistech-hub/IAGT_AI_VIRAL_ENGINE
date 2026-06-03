require('dotenv').config();

const { shopifyApp } = require('@shopify/shopify-app-express');
const SupabaseSessionStorage = require('./supabaseSessionStorage');

if (!process.env.SHOPIFY_CLIENT_ID) {
  throw new Error('Missing SHOPIFY_CLIENT_ID');
}

if (!process.env.SHOPIFY_CLIENT_SECRET) {
  throw new Error('Missing SHOPIFY_CLIENT_SECRET');
}

if (!process.env.HOST) {
  throw new Error('Missing HOST');
}

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_CLIENT_ID,
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
    scopes: (process.env.SHOPIFY_SCOPES || 'read_products,read_orders')
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
    hostScheme: 'https',
    hostName: process.env.HOST,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2026-04',
    isEmbeddedApp: true
  },
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback'
  },
  sessionStorage: new SupabaseSessionStorage()
});

module.exports = shopify;