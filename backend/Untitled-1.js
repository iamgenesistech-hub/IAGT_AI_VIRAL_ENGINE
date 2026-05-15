// backend/shopifyAuth.js
require("dotenv").config();

const { shopifyApp } = require("@shopify/shopify-app-express");
const { MemorySessionStorage } = require("@shopify/shopify-app-session-storage-memory");

// Optional: safe debug (prints only the first/last 4 chars)
if (process.env.SHOPIFY_CLIENT_ID) {
  const id = process.env.SHOPIFY_CLIENT_ID;
  console.log("CLIENT ID USED:", `${id.slice(0, 4)}...${id.slice(-4)}`);
} else {
  console.log("CLIENT ID USED: (missing)");
}

// Hard checks (fail fast)
if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
  throw new Error("Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in backend/.env");
}
if (!process.env.HOST) {
  throw new Error("Missing HOST in backend/.env (example: lint-salon-breeding.ngrok-free.dev)");
}

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_CLIENT_ID,
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
    scopes: (process.env.SHOPIFY_SCOPES || "read_products")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    hostScheme: "https",
    hostName: process.env.HOST, // domain only, NO https://
    apiVersion: process.env.SHOPIFY_API_VERSION || "2026-04",
    isEmbeddedApp: true,
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  sessionStorage: new MemorySessionStorage(),
});

module.exports = shopify;