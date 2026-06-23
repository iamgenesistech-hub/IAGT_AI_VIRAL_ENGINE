const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env"));

const shopifyOAuthTokenPath = path.join(__dirname, "shopify-oauth-token.local.json");
const agentRunsPath = path.join(__dirname, "agent-runs.local.json");

const config = {
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN || "",
  publicShopifyStoreDomain: process.env.SHOPIFY_PUBLIC_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || "",
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-04",
  shopifyClientId: process.env.SHOPIFY_CLIENT_ID,
  shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET,
  shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  alertPhone: process.env.EVICS_ALERT_PHONE,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromPhone: process.env.TWILIO_FROM_PHONE,
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
};

let shopifyTokenCache = {
  token: "",
  expiresAt: 0
};

function isPlaceholder(value) {
  return !value || /^your_/i.test(value) || /^\[?your-/i.test(value) || /^change-this/i.test(value);
}

function hasSupabaseServerConfig() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && !isPlaceholder(config.supabaseUrl) && !isPlaceholder(config.supabaseServiceRoleKey));
}

function hasShopifyConfig() {
  const hasDomain = Boolean(config.shopifyStoreDomain && !isPlaceholder(config.shopifyStoreDomain));
  const hasAdminToken = Boolean(config.shopifyToken && !isPlaceholder(config.shopifyToken));
  const hasOAuthCredentials = Boolean(
    config.shopifyClientId &&
    config.shopifyClientSecret &&
    !isPlaceholder(config.shopifyClientId) &&
    !isPlaceholder(config.shopifyClientSecret)
  );

  return hasDomain && (hasAdminToken || hasOAuthCredentials);
}

function hasShopifyAdminToken() {
  return Boolean(
    config.shopifyStoreDomain &&
    !isPlaceholder(config.shopifyStoreDomain) &&
    config.shopifyToken &&
    !isPlaceholder(config.shopifyToken)
  );
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

async function getSyncedProducts(limit = 100) {
  if (!hasSupabaseServerConfig()) return [];
  return selectSupabase(
    `shopify_products?select=*&order=synced_at.desc&limit=${encodeURIComponent(limit)}`
  );
}

async function getSyncedCollections(limit = 100) {
  if (!hasSupabaseServerConfig()) return [];
  return selectSupabase(
    `shopify_collections?select=*&order=synced_at.desc&limit=${encodeURIComponent(limit)}`
  );
}

async function saveCreatives(creatives) {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Missing Supabase server config.");
  }

  const rows = creatives.map((creative) => ({
    id: String(creative.id),
    status: creative.status || "Draft",
    product: creative.product || "Unassigned product",
    format: creative.format || "Creative",
    hook: creative.hook || "",
    asset: creative.asset || "",
    channel: creative.channel || "",
    score: Number(creative.score || 0),
    approved: Boolean(creative.approved),
    export_payload: creative.exportPayload || {},
    updated_at: new Date().toISOString()
  }));

  await upsertSupabase("creatives", rows, "id");

  return rows;
}

async function setCreativeApproval(id, approved) {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Missing Supabase server config.");
  }

  return patchSupabase(
    `creatives?id=eq.${encodeURIComponent(id)}`,
    {
      approved: Boolean(approved),
      updated_at: new Date().toISOString()
    }
  );
}

async function scheduleApprovedCreatives(creatives) {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Missing Supabase server config.");
  }

  const slots = ["11:30 AM", "1:45 PM", "4:15 PM", "6:30 PM", "8:00 PM", "Tomorrow"];
  const rows = creatives
    .filter((creative) => creative.approved)
    .map((creative, index) => ({
      channel: String(creative.channel || "TikTok + Reels").split(" + ")[0],
      publish_at: buildPublishAt(index),
      display_time: slots[index] || "Queued",
      content: creative.product || creative.hook || "Approved creative",
      status: "Queued",
      creative_id: String(creative.id)
    }));

  if (!rows.length) return [];

  await insertSupabase("publishing_queue", rows);

  return rows;
}

async function saveAgentRun(run) {
  const savedRun = normalizeAgentRun(run);
  const localRun = saveAgentRunLocal(savedRun);

  if (!hasSupabaseServerConfig()) {
    return {
      ...localRun,
      persistence: "local",
      mirrorStatus: "skipped",
      mirrorMessage: "Missing Supabase server config."
    };
  }

  const rows = [{
    id: savedRun.id,
    step_time: run.mode || "Autopilot",
    title: `EVICS ${run.mode || "Autopilot"} Run`,
    description: JSON.stringify({
      message: savedRun.message || "",
      log: savedRun.log || [],
      exceptions: savedRun.exceptions || [],
      completedAt: savedRun.completedAt
    }),
    sort_order: run.sortOrder || 900
  }];

  try {
    await upsertSupabase("workflow_steps", rows, "id");
    return {
      ...localRun,
      persistence: "local+supabase",
      supabase: rows[0],
      mirrorStatus: "saved"
    };
  } catch (error) {
    return {
      ...localRun,
      persistence: "local",
      mirrorStatus: "failed",
      mirrorMessage: error.message || "Supabase mirror failed."
    };
  }
}

function normalizeAgentRun(run = {}) {
  return {
    id: run.id || `agent-run-${Date.now()}`,
    mode: run.mode || "Autopilot",
    message: run.message || "",
    log: Array.isArray(run.log) ? run.log : [],
    exceptions: Array.isArray(run.exceptions) ? run.exceptions : [],
    completedAt: run.completedAt || new Date().toISOString(),
    createdAt: run.createdAt || new Date().toISOString()
  };
}

function readAgentRuns() {
  if (!fs.existsSync(agentRunsPath)) {
    return { runs: [], updatedAt: null };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(agentRunsPath, "utf8"));
    return { runs: Array.isArray(parsed.runs) ? parsed.runs : [], updatedAt: parsed.updatedAt || null };
  } catch (error) {
    return { runs: [], updatedAt: null };
  }
}

function writeAgentRuns(state) {
  const nextState = {
    runs: Array.isArray(state.runs) ? state.runs.slice(0, 250) : [],
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(agentRunsPath, JSON.stringify(nextState, null, 2));
  return nextState;
}

function saveAgentRunLocal(run) {
  const state = readAgentRuns();
  const existingIndex = state.runs.findIndex((item) => item.id === run.id);
  const nextRun = {
    ...run,
    savedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.runs[existingIndex] = { ...state.runs[existingIndex], ...nextRun };
  } else {
    state.runs.unshift(nextRun);
  }

  writeAgentRuns(state);
  return nextRun;
}

async function sendHumanReviewAlert(run) {
  const exceptions = Array.isArray(run.exceptions) ? run.exceptions : [];
  if (!exceptions.length) {
    return {
      sent: false,
      reason: "No exceptions."
    };
  }

  if (!config.alertPhone) {
    return {
      sent: false,
      reason: "EVICS_ALERT_PHONE is not configured."
    };
  }

  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    return {
      sent: false,
      reason: "Twilio credentials are not configured."
    };
  }

  if (!config.twilioFromPhone && !config.twilioMessagingServiceSid) {
    return {
      sent: false,
      reason: "Twilio sender is not configured."
    };
  }

  const body = buildAlertMessage(run, exceptions);
  const params = new URLSearchParams({
    To: config.alertPhone,
    Body: body
  });

  if (config.twilioMessagingServiceSid) {
    params.set("MessagingServiceSid", config.twilioMessagingServiceSid);
  } else {
    params.set("From", config.twilioFromPhone);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilioAccountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio SMS failed: ${JSON.stringify(payload)}`);
  }

  return {
    sent: true,
    sid: payload.sid,
    to: config.alertPhone
  };
}

function buildAlertMessage(run, exceptions) {
  const summary = exceptions.slice(0, 3).join("; ");
  const extra = exceptions.length > 3 ? ` +${exceptions.length - 3} more` : "";
  const mode = run.mode || "Autopilot";
  return `EVICS needs review: ${exceptions.length} issue(s) from ${mode}. ${summary}${extra}. Open EVICS dashboard.`;
}

async function readShopifyProducts() {
  const products = [];
  let url = shopifyAdminUrl("products.json?limit=250");

  try {
    while (url) {
      const { body, nextUrl } = await shopifyRest(url);
      products.push(...(body.products || []));
      url = nextUrl;
    }

    return products;
  } catch (error) {
    if (!config.publicShopifyStoreDomain) throw error;
    console.warn(`Shopify Admin product read failed. Falling back to public storefront products: ${error.message}`);
    return readPublicStorefrontProducts();
  }
}

async function readPublicStorefrontProducts() {
  const domain = config.publicShopifyStoreDomain || config.shopifyStoreDomain;
  const response = await fetch(`https://${domain}/products.json?limit=250`, {
    headers: { Accept: "application/json" }
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Shopify storefront product request failed: ${JSON.stringify(body)}`);
  }

  return body.products || [];
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
  const token = await getShopifyAccessToken();
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
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

async function getShopifyAccessToken() {
  if (config.shopifyToken) {
    return config.shopifyToken;
  }

  const storedToken = readStoredShopifyOAuthToken();
  if (storedToken) return storedToken;

  if (config.shopifyClientId && config.shopifyClientSecret) {
    const now = Date.now();
    if (shopifyTokenCache.token && shopifyTokenCache.expiresAt > now + 60_000) {
      return shopifyTokenCache.token;
    }

    const response = await fetch(`https://${config.shopifyStoreDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.shopifyClientId,
        client_secret: config.shopifyClientSecret
      })
    });

    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `Shopify token request returned HTML instead of JSON. Check that the app is installed on ${config.shopifyStoreDomain}, the Client ID/Secret are from the same app version, and the app has Admin API scopes. Response starts with: ${text.slice(0, 120)}`
      );
    }

    if (!response.ok || !body.access_token) {
      throw new Error(`Shopify token request failed: ${JSON.stringify(body)}`);
    }

    shopifyTokenCache = {
      token: body.access_token,
      expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000
    };

    return shopifyTokenCache.token;
  }
  throw new Error("Missing Shopify credentials.");
}

function readStoredShopifyOAuthToken() {
  if (!fs.existsSync(shopifyOAuthTokenPath)) return "";

  try {
    const stored = JSON.parse(fs.readFileSync(shopifyOAuthTokenPath, "utf8"));
    if (stored.shop && stored.shop !== config.shopifyStoreDomain) return "";
    return stored.accessToken || "";
  } catch (error) {
    return "";
  }
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

async function patchSupabase(pathname, body) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${pathname}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Supabase update failed: ${await response.text()}`);
  }

  return response.json();
}

async function insertSupabase(table, rows) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    throw new Error(`Supabase insert into ${table} failed: ${await response.text()}`);
  }

  return response.json();
}

function buildPublishAt(index) {
  const now = new Date();
  const hour = [11, 13, 16, 18, 20, 10][index] || 10;
  const minute = [30, 45, 15, 30, 0, 0][index] || 0;
  const date = new Date(now);

  if (index >= 5) date.setDate(date.getDate() + 1);

  date.setHours(hour, minute, 0, 0);

  if (date <= now && index < 5) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
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
      ? `https://${config.publicShopifyStoreDomain}/products/${product.handle}`
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
  if (!hasShopifyConfig()) {
    missing.push("SHOPIFY_STORE_DOMAIN and either SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET");
  }
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
  getSyncedCollections,
  saveCreatives,
  setCreativeApproval,
  scheduleApprovedCreatives,
  saveAgentRun,
  readAgentRuns,
  sendHumanReviewAlert
};
