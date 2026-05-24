// backend/server.js
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const shopify = require("./shopifyAuth");

const { syncShopifyProducts, syncShopifyCollections } = require("./shopifySyncEngine");
const { getSyncedProducts, getSyncedCollections } = require("./shopifyDataApi");

const app = express();
const PORT = process.env.PORT || 3000;
const CONTROL_CENTER_DIR = path.join(__dirname, "..", "dashboard", "control-center");

app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(shopify.cspHeaders());
app.use("/control-center", express.static(CONTROL_CENTER_DIR));

const AUTH_PATH = shopify.config.auth.path;              // "/auth"
const CALLBACK_PATH = shopify.config.auth.callbackPath;  // "/auth/callback"

const noStore = (res) => res.setHeader("Cache-Control", "no-store");

// Helpers: shop and host handling
const getShop = (req) => (req.query.shop ? String(req.query.shop) : "");
const getHost = (req) => {
  if (req.query.host) return String(req.query.host);
  if (req.query.shop) return "";
  return req.cookies && req.cookies.shopify_host ? String(req.cookies.shopify_host) : "";
};

const rememberHost = (req, res) => {
  if (req.query.host) {
    // keep host for future direct visits to /app where host may be missing
    res.cookie("shopify_host", String(req.query.host), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  } else if (req.query.shop) {
    res.clearCookie("shopify_host");
  }
};

// -------------------------
// Health / status
// -------------------------
app.get("/health", (_req, res) => {
  noStore(res);
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/status", (_req, res) => {
  noStore(res);
  res.status(200).send("✅ EVICS backend online");
});

app.get("/dashboard", (_req, res) => {
  noStore(res);
  res.redirect("/control-center/");
});

app.get("/favicon.ico", (_req, res) => res.status(204).end());

// -------------------------
// Exit Shopify iframe before OAuth
// (Embedded apps often need top-level navigation) [2](https://devsolus.com/typeerror-body-is-unusable-nextjs-server-action-post/)
// -------------------------
app.get("/exitiframe", (req, res) => {
  const shop = getShop(req);
  const host = getHost(req);

  if (!shop) return res.status(400).send("Missing shop");

  rememberHost(req, res);

  const params = new URLSearchParams({ shop });
  if (host) params.set("host", host);

  const redirectTo = `${AUTH_PATH}?${params.toString()}`;

  noStore(res);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Redirecting…</title></head>
  <body>
    <script>
      window.top.location.href = ${JSON.stringify(redirectTo)};
    </script>
    Redirecting…
  </body>
</html>`);
});

// -------------------------
// Root
// IMPORTANT: Do NOT force ensureInstalledOnShop here.
// Always land on /app (stable UI page).
// -------------------------
app.get("/", (req, res) => {
  const shop = getShop(req);
  const host = getHost(req);
  const embedded = req.query.embedded ? String(req.query.embedded) : "";

  if (!shop) {
    noStore(res);
    return res.status(200).send("✅ EVICS backend online");
  }

  rememberHost(req, res);

  const params = new URLSearchParams({ shop });
  if (host) params.set("host", host);

  // If Shopify opened embedded, escape iframe first; otherwise go /app
  if (embedded === "1") {
    res.statusCode = 302;
    res.setHeader("Location", `/exitiframe?${params.toString()}`);
    return res.end();
  }

  res.statusCode = 302;
  res.setHeader("Location", `/app?${params.toString()}`);
  return res.end();
});

// -------------------------
// OAuth
// begin() starts OAuth. [3](https://stackoverflow.com/questions/9587665/node-js-cannot-find-installed-module-on-windows)
// -------------------------
app.get(AUTH_PATH, shopify.auth.begin());

// callback() completes OAuth BUT does not redirect by itself. [1](https://www.youtube.com/watch?v=D7M9sRVy8Bg)
app.get(CALLBACK_PATH, shopify.auth.callback(), (req, res) => {
  const shop = getShop(req);
  const host = getHost(req);

  rememberHost(req, res);

  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);

  noStore(res);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  // After OAuth, go to /app (stable landing)
  return res.status(200).send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Loading app…</title></head>
  <body>
    <script>
      window.top.location.href = "/app?${params.toString()}";
    </script>
    Loading app…
  </body>
</html>`);
});

// -------------------------
// App landing (STABLE - NO ensureInstalledOnShop here)
// This avoids "No host provided" and avoids redirect loops.
// -------------------------
app.get("/app", (req, res) => {
  const shop = getShop(req);
  const host = getHost(req);

  rememberHost(req, res);

  noStore(res);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const authParams = new URLSearchParams();
  if (shop) authParams.set("shop", shop);
  if (host) authParams.set("host", host);

  // If /shop endpoints return 401, click this to re-auth via /exitiframe
  const reauthLink = shop ? `/exitiframe?${authParams.toString()}` : "/status";

  return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>EVICS App</title>
  </head>
  <body style="font-family: system-ui; padding: 16px;">
    <h1>🚀 EVICS APP LOADED</h1>
    <p><b>Shop:</b> ${shop || "(missing shop param)"}</p>
    <p><b>Host:</b> ${host || "(not provided — OK outside Shopify)"}</p>
    <p><b>Status:</b> ✅ Page renders without looping</p>

    <hr />
    <p><a href="${reauthLink}">🔐 Authorize / Re-Authorize (if needed)</a></p>

    <ul>
      <li><a href="/shop?shop=${encodeURIComponent(shop)}">Test Shopify Shop Info (requires auth)</a></li>
      <li><a href="/sync/products?shop=${encodeURIComponent(shop)}">Sync Shopify Products</a></li>
      <li><a href="/sync/collections?shop=${encodeURIComponent(shop)}">Sync Shopify Collections</a></li>
      <li><a href="/api/shopify/synced-products">View Synced Products JSON</a></li>
      <li><a href="/api/shopify/synced-collections">View Synced Collections JSON</a></li>
      <li><a href="/products-dashboard">Open Products Dashboard</a></li>
    </ul>
  </body>
</html>`);
});

// -------------------------
// Authenticated Shopify test
// validateAuthenticatedSession expects the session to exist. [3](https://stackoverflow.com/questions/9587665/node-js-cannot-find-installed-module-on-windows)
// -------------------------
app.get("/shop", shopify.validateAuthenticatedSession(), async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Rest({ session });
    const response = await client.get({ path: "shop" });

    noStore(res);
    res.json({
      success: true,
      shopName: response.body.shop?.name,
      myshopifyDomain: response.body.shop?.myshopify_domain,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// -------------------------
// Shopify Product Sync
// -------------------------
app.get("/sync/products", shopify.validateAuthenticatedSession(), async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const result = await syncShopifyProducts(session.shop);
    noStore(res);
    res.json({ success: true, shop: session.shop, synced: result.synced });
  } catch (e) {
    console.error("SYNC PRODUCTS ERROR:", e);
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// Shopify Collections Sync
// -------------------------
app.get("/sync/collections", shopify.validateAuthenticatedSession(), async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const result = await syncShopifyCollections(session.shop);
    noStore(res);
    res.json({ success: true, shop: session.shop, synced: result.synced });
  } catch (e) {
    console.error("SYNC COLLECTIONS ERROR:", e);
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// Supabase Data APIs
// -------------------------
app.get("/api/shopify/synced-products", async (_req, res) => {
  try {
    const products = await getSyncedProducts(100);
    noStore(res);
    res.json({ success: true, count: products.length, products });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

app.get("/api/shopify/synced-collections", async (_req, res) => {
  try {
    const collections = await getSyncedCollections(100);
    noStore(res);
    res.json({ success: true, count: collections.length, collections });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// Products Dashboard
// -------------------------
app.get("/products-dashboard", async (_req, res) => {
  try {
    const products = await getSyncedProducts(100);
    const collections = await getSyncedCollections(100);

    const rows = products.map((product) => {
      const image = product.image_url
        ? `<img src="${product.image_url}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" />`
        : `<span style="color:#888;">No image</span>`;

      return `
        <tr>
          <td>${image}</td>
          <td><b>${product.title || ""}</b><br><small>${product.handle || ""}</small></td>
          <td>${product.product_type || ""}</td>
          <td>${product.status || ""}</td>
          <td>${product.tags || ""}</td>
          <td>${product.synced_at || ""}</td>
        </tr>
      `;
    }).join("");

    noStore(res);
    return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>EVICS Product Dashboard</title>
    <style>
      body { margin:0; font-family:Arial,sans-serif; background:#0b0b12; color:#fff; }
      header { padding:24px; background:linear-gradient(90deg,#1a103d,#4b0082); border-bottom:2px solid #d4af37; }
      h1 { color:#d4af37; margin:0; }
      .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding:24px; }
      .card { background:#151522; border:1px solid #33334d; border-radius:16px; padding:18px; }
      .metric { font-size:30px; font-weight:bold; color:#d4af37; }
      table { width:calc(100% - 48px); margin:0 24px 24px; border-collapse:collapse; background:#151522; border-radius:16px; overflow:hidden; }
      th,td { padding:12px; border-bottom:1px solid #33334d; vertical-align:middle; }
      th { color:#d4af37; text-align:left; background:#10101a; }
      small { color:#aaa; }
      a { color:#d4af37; }
    </style>
  </head>
  <body>
    <header>
      <h1>EVICS Product Intelligence Dashboard</h1>
      <p>Live Shopify product data synced into Supabase.</p>
      <p><a href="/app">Back to EVICS App</a></p>
    </header>

    <section class="summary">
      <div class="card"><h2>Synced Products</h2><div class="metric">${products.length}</div></div>
      <div class="card"><h2>Synced Collections</h2><div class="metric">${collections.length}</div></div>
      <div class="card"><h2>System Status</h2><div class="metric">LIVE</div></div>
    </section>

    <table>
      <thead>
        <tr><th>Image</th><th>Product</th><th>Type</th><th>Status</th><th>Tags</th><th>Synced At</th></tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6">No synced products yet. Run /sync/products first.</td></tr>`}
      </tbody>
    </table>
  </body>
</html>`);
  } catch (e) {
    res.status(500).send(`Dashboard error: ${e.message || String(e)}`);
  }
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://127.0.0.1:${PORT}`);
  console.log(`➡️ Status: http://127.0.0.1:${PORT}/status`);
  console.log(`➡️ Root (ngrok): https://${process.env.HOST}/`);
  console.log(`➡️ App landing (ngrok): https://${process.env.HOST}/app?shop=YOURSTORE.myshopify.com`);
  console.log(`➡️ OAuth callback must be whitelisted: https://${process.env.HOST}${CALLBACK_PATH}`);
});
