// backend/shopifyAuth.js
require("dotenv").config();

const { shopifyApp } = require("@shopify/shopify-app-express");
const { MemorySessionStorage } = require("@shopify/shopify-app-session-storage-memory");

// ---- Debug (safe + clear) ----
const fullId = process.env.SHOPIFY_CLIENT_ID || "";
console.log(
  "AUTH FILE FULL CLIENT ID:",
  fullId ? `${fullId.slice(0, 4)}...${fullId.slice(-4)}` : "(missing)"
);
console.log("AUTH FILE HOST:", process.env.HOST || "(missing)");
console.log("AUTH FILE SCOPES:", process.env.SHOPIFY_SCOPES || "(missing)");

// ---- Fail fast if env is missing ----
if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
  throw new Error(
    "Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in backend/.env"
  );
}
if (!process.env.HOST) {
  throw new Error(
    "Missing HOST in backend/.env (example: HOST=lint-salon-breeding.ngrok-free.dev)"
  );
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
    hostName: process.env.HOST, // domain only (NO https://)
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