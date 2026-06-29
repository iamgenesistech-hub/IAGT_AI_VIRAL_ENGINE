const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env"));
loadEnv(path.join(__dirname, "backend", ".env"));

const config = {
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN || "iamgenesistech.myshopify.com",
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-04",
  shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

function hasSupabaseServerConfig() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

function hasShopifyConfig() {
  return Boolean(config.shopifyStoreDomain && config.shopifyToken);
}

async function syncShopifyProducts() {
  assertConfig();

  const products = await readShopifyProducts();
  const shopifyRows = products.map(toShopifyProductRow);
  const dashboardRows = products.map(toDashboardProductRow);

  await upsertSupabase("shopify_products", shopifyRows, "id");
  await upsertSupabase("products", dashboardRows, "shopify_product_id");

  return {
    synced: products.length,
    products: shopifyRows
  };
}

async function syncShopifyCollections() {
  assertConfig();

  const collections = await readShopifyCollections();
  const rows = collections.map((collection) => ({
    id: String(collection.id),
    title: collection.title,
    handle: collection.handle,
    body_html: collection.body_html || "",
    published: Boolean(collection.published),
    raw_data: collection,
    synced_at: new Date().toISOString()
  }));

  await upsertSupabase("shopify_collections", rows, "id");

  return {
    synced: rows.length,
    collections: rows
  };
}

async function getSyncedProducts(limit = 300) {
  if (!hasSupabaseServerConfig()) return [];
  return selectSupabase(
    `shopify_products?select=*&order=synced_at.desc&limit=${encodeURIComponent(limit)}`
  );
}

async function getSyncedCollections(limit = 300) {
  if (!hasSupabaseServerConfig()) return [];
  return selectSupabase(
    `shopify_collections?select=*&order=synced_at.desc&limit=${encodeURIComponent(limit)}`
  );
}

async function readShopifyProducts() {
  const products = [];
  let url = shopifyAdminUrl("products.json?limit=250");

  while (url) {
    const { body, nextUrl } = await shopifyRest(url);
    products.push(...(body.products || []));
    url = nextUrl;
  }

  return products;
}

async function readShopifyCollections() {
  const collections = [];
  let url = shopifyAdminUrl("custom_collections.json?limit=250");

  while (url) {
    const { body, nextUrl } = await shopifyRest(url);
    collections.push(...(body.custom_collections || []));
    url = nextUrl;
  }

  return collections;
}

async function shopifyRest(url) {
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": config.shopifyToken,
      "Content-Type": "application/json"
    }
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify request failed: ${JSON.stringify(body)}`);
  }

  return {
    body,
    nextUrl: parseNextLink(response.headers.get("link"))
  };
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;

  const nextPart = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'));

  if (!nextPart) return null;

  const match = nextPart.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

async function selectSupabase(pathname) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${pathname}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    throw new Error(`Supabase select failed: ${await response.text()}`);
  }

  return response.json();
}

async function upsertSupabase(table, rows, conflictColumn) {
  if (!rows.length) return;

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows)
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase upsert into ${table} failed: ${await response.text()}`);
  }
}

function toShopifyProductRow(product) {
  return {
    id: String(product.id),
    title: product.title,
    handle: product.handle,
    vendor: product.vendor || "",
    product_type: product.product_type || "Shopify",
    status: product.status || "",
    tags: product.tags || "",
    published_at: product.published_at,
    image_url: product.image?.src || product.images?.[0]?.src || null,
    raw_data: product,
    synced_at: new Date().toISOString()
  };
}

function toDashboardProductRow(product) {
  const category = product.product_type || "Shopify";

  return {
    name: product.title,
    category,
    score: 75,
    angle: buildAngle(category, product.title, product.tags),
    shopify_product_id: String(product.id),
    product_url: product.handle
      ? `https://${config.shopifyStoreDomain.replace(".myshopify.com", ".com")}/products/${product.handle}`
      : null,
    image_url: product.image?.src || product.images?.[0]?.src || null,
    source: "shopify",
    price: Number(product.variants?.[0]?.price || 0) || null,
    benefits: extractBenefits(product.body_html || ""),
    active: true,
    updated_at: new Date().toISOString()
  };
}

function extractBenefits(value) {
  return stripHtml(value)
    .split(/[.\n\r-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18 && item.length <= 120)
    .slice(0, 5);
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAngle(category, title, tags) {
  const text = `${category} ${title} ${tags || ""}`.toLowerCase();

  if (text.includes("sea moss")) return "daily mineral ritual";
  if (text.includes("testosterone")) return "training foundation";
  if (text.includes("collagen") || text.includes("beauty")) return "skin confidence";
  if (text.includes("focus") || text.includes("nootropic")) return "clean productive energy";
  if (text.includes("weight") || text.includes("metabolic")) return "morning reset";
  if (text.includes("sleep")) return "nightly recovery";
  if (text.includes("sport") || text.includes("gym")) return "performance support";
  return "premium wellness ritual";
}

function shopifyAdminUrl(pathname) {
  return `https://${config.shopifyStoreDomain}/admin/api/${config.shopifyApiVersion}/${pathname}`;
}

function supabaseHeaders() {
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    "Content-Type": "application/json"
  };
}

function assertConfig() {
  const missing = [];
  if (!hasShopifyConfig()) missing.push("SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!hasSupabaseServerConfig()) missing.push("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    throw new Error(`Missing .env values: ${missing.join(", ")}`);
  }
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

module.exports = {
  config,
  hasShopifyConfig,
  hasSupabaseServerConfig,
  syncShopifyProducts,
  syncShopifyCollections,
  getSyncedProducts,
  getSyncedCollections
};
