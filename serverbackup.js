const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  syncShopifyProducts,
  syncShopifyCollections,
  getSyncedProducts,
  getSyncedCollections,
  hasSupabaseServerConfig,
  hasShopifyConfig,
  config
} = require("./evics-connectors");

const app = express();
const root = __dirname;
const port = Number(process.env.PORT || 8080);

// Capture raw body for Shopify HMAC verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from project root
app.use(express.static(root, { extensions: ["html"] }));

// -------------------------------------
// Helpers
// -------------------------------------
function sendJson(res, status, body) {
  return res.status(status).json(body);
}

function sendHtml(res, status, html) {
  return res.status(status).type("html").send(html);
}

function safeFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function sendStaticHtml(res, fileName) {
  const filePath = path.join(root, fileName);

  if (!safeFileExists(filePath)) {
    return sendHtml(
      res,
      404,
      "<!doctype html><html><body><h1>Page unavailable</h1></body></html>"
    );
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function activeWorkspaceFile() {
  const workspacePath = path.join(root, "workspace.html");
  const indexPath = path.join(root, "index.html");

  if (safeFileExists(workspacePath)) return "workspace.html";
  if (safeFileExists(indexPath)) return "index.html";
  return null;
}

function sendWorkspace(res) {
  const file = activeWorkspaceFile();

  if (!file) {
    return sendHtml(
      res,
      200,
      `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVICS Workspace</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f6f7f2;
        color: #17201b;
        padding: 40px;
      }
      h1 { color: #1f6b4b; }
      code {
        background: #eef4ea;
        padding: 2px 6px;
        border-radius: 4px;
      }
      a { color: #1f6b4b; }
    </style>
  </head>
  <body>
    <h1>EVICS Workspace</h1>
    <p>Your Cloud Run service is online, but no <code>workspace.html</code> or <code>index.html</code> was found in the project root.</p>
    <p>Add one of those files to display your dashboard UI.</p>
    <p><a href="/status">View system status</a></p>
  </body>
</html>
      `
    );
  }

  return sendStaticHtml(res, file);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------------------------
// System routes
// -------------------------------------
app.get("/status", (req, res) => {
  return sendJson(res, 200, {
    ok: true,
    system: "EVICS",
    shopifyConfigured: hasShopifyConfig(),
    supabaseConfigured: hasSupabaseServerConfig(),
    shopifyStoreDomain: config.publicShopifyStoreDomain || "",
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  return sendJson(res, 200, {
    ok: true,
    system: "EVICS",
    time: new Date().toISOString()
  });
});

app.get("/config.js", (req, res) => {
  const payload = JSON.stringify(
    {
      supabaseUrl: config.supabaseUrl || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    },
    null,
    2
  );

  return res
    .status(200)
    .type("application/javascript")
    .send(`window.EVIE_CONFIG = ${payload};\nwindow.IAGT_CONFIG = window.EVIE_CONFIG;\n`);
});

app.get("/api/system/evidence", async (req, res) => {
  try {
    const products = await getSyncedProducts(250);

    return sendJson(res, 200, {
      success: true,
      evidence: {
        shopifyConfigured: hasShopifyConfig(),
        supabaseConfigured: hasSupabaseServerConfig(),
        shopifyStoreDomain: config.publicShopifyStoreDomain || "",
        syncedProducts: products.length,
        runtime: process.env.K_SERVICE ? "cloud-run" : "local",
        checkedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Evidence check failed."
    });
  }
});

// -------------------------------------
// Workspace / dashboard routes
// -------------------------------------
app.get("/", (req, res) => {
  return sendWorkspace(res);
});

app.get("/workspace", (req, res) => {
  return sendWorkspace(res);
});

app.get("/legacy-dashboard", (req, res) => {
  return sendWorkspace(res);
});

// -------------------------------------
// Simple placeholder pages
// -------------------------------------
app.get("/secret-vault", (req, res) => {
  if (safeFileExists(path.join(root, "secret-vault.html"))) {
    return sendStaticHtml(res, "secret-vault.html");
  }

  return sendHtml(
    res,
    200,
    `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVICS Secret Vault</title>
  </head>
  <body style="font-family:Arial,sans-serif;padding:32px;background:#f6f7f2;color:#17201b;">
    <h1>EVICS Secret Vault</h1>
    <p>This page is online. If you want the full vault UI, add <code>secret-vault.html</code> to the project root.</p>
    <p><a href="/">Back to EVICS</a></p>
  </body>
</html>
    `
  );
});

app.get("/owner-ai", (req, res) => {
  if (safeFileExists(path.join(root, "owner-ai.html"))) {
    return sendStaticHtml(res, "owner-ai.html");
  }

  return sendHtml(
    res,
    200,
    `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVICS Owner AI</title>
  </head>
  <body style="font-family:Arial,sans-serif;padding:32px;background:#f6f7f2;color:#17201b;">
    <h1>EVICS Owner AI</h1>
    <p>This page is online. If you want the full Owner AI UI, add <code>owner-ai.html</code> to the project root.</p>
    <p><a href="/">Back to EVICS</a></p>
  </body>
</html>
    `
  );
});

// -------------------------------------
// Shopify sync routes
// -------------------------------------
app.get("/sync/products", async (req, res) => {
  try {
    const result = await syncShopifyProducts();

    return sendJson(res, 200, {
      success: true,
      shop: config.publicShopifyStoreDomain || "",
      synced: result?.synced || 0,
      result
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Product sync failed."
    });
  }
});

app.get("/sync/collections", async (req, res) => {
  try {
    const result = await syncShopifyCollections();

    return sendJson(res, 200, {
      success: true,
      shop: config.publicShopifyStoreDomain || "",
      synced: result?.synced || 0,
      result
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Collection sync failed."
    });
  }
});

app.get("/api/shopify/synced-products", async (req, res) => {
  try {
    const products = await getSyncedProducts(250);

    return sendJson(res, 200, {
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Could not load synced products."
    });
  }
});

app.get("/api/shopify/synced-collections", async (req, res) => {
  try {
    const collections = await getSyncedCollections(100);

    return sendJson(res, 200, {
      success: true,
      count: collections.length,
      collections
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Could not load synced collections."
    });
  }
});

// -------------------------------------
// Product dashboard
// -------------------------------------
app.get("/products-dashboard", async (req, res) => {
  try {
    const products = await getSyncedProducts(100);

    const rows = products
      .map((product) => {
        const image = product.image_url
          ? `<img src="${escapeHtml(product.image_url)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" />`
          : `<span style="color:#777;">No image</span>`;

        return `
          <tr>
            <td>${image}</td>
            <td><strong>${escapeHtml(product.title || "")}</strong><br><small>${escapeHtml(product.handle || "")}</small></td>
            <td>${escapeHtml(product.product_type || "")}</td>
            <td>${escapeHtml(product.status || "")}</td>
            <td>${escapeHtml(product.tags || "")}</td>
            <td>${escapeHtml(product.synced_at || "")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVICS Product Dashboard</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f6f7f2; color: #17201b; }
      header { padding: 24px; background: #17201b; color: white; }
      h1 { margin: 0 0 8px; color: #d8b76a; }
      a { color: #b9904b; }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 24px; }
      .card { background: white; border: 1px solid #dfe4dc; padding: 18px; box-shadow: 0 12px 30px rgba(23,32,27,.08); }
      .metric { font-size: 30px; font-weight: bold; color: #1f6b4b; }
      table { width: calc(100% - 48px); margin: 0 24px 24px; border-collapse: collapse; background: white; }
      th, td { padding: 12px; border-bottom: 1px solid #dfe4dc; vertical-align: middle; text-align: left; }
      th { background: #eef4ea; }
      small { color: #6c746f; }
    </style>
  </head>
  <body>
    <header>
      <h1>EVICS Product Intelligence Dashboard</h1>
      <p>Live Shopify product data synced into storage.</p>
      <p><a href="/">Back to EVICS Workspace</a></p>
    </header>
    <section class="summary">
      <div class="card"><h2>Synced Products</h2><div class="metric">${products.length}</div></div>
      <div class="card"><h2>Store</h2><div>${escapeHtml(config.publicShopifyStoreDomain || "")}</div></div>
      <div class="card"><h2>System Status</h2><div class="metric">${hasSupabaseServerConfig() ? "LIVE" : "DEMO"}</div></div>
    </section>
    <table>
      <thead>
        <tr><th>Image</th><th>Product</th><th>Type</th><th>Status</th><th>Tags</th><th>Synced At</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6">No synced products yet. Run /sync/products first.</td></tr>`}</tbody>
    </table>
  </body>
</html>`;

    return sendHtml(res, 200, html);
  } catch (error) {
    return sendHtml(
      res,
      500,
      `<!doctype html><html><body><h1>Product dashboard failed</h1><pre>${escapeHtml(error.message)}</pre></body></html>`
    );
  }
});

// -------------------------------------
// Shopify webhook verification
// -------------------------------------
function verifyShopifyWebhook(req) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
  const hmacHeader = req.get("x-shopify-hmac-sha256") || "";

  if (!secret || !req.rawBody || !hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("base64");

  const sameLength = Buffer.byteLength(hmacHeader) === Buffer.byteLength(digest);
  if (!sameLength) return false;

  return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
}

app.post("/api/shopify/test", (req, res) => {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.error("❌ Missing SHOPIFY_WEBHOOK_SECRET");
    return res.status(500).send("Webhook secret is not configured.");
  }

  if (!verifyShopifyWebhook(req)) {
    console.log("❌ Fake webhook blocked");
    return res.status(401).send("Unauthorized");
  }

  console.log("✅ REAL Shopify webhook received");
  console.log(req.body);

  return res.status(200).send("OK");
});

app.post("/shopify/webhook", (req, res) => {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.error("❌ Missing SHOPIFY_WEBHOOK_SECRET");
    return res.status(500).send("Webhook secret is not configured.");
  }

  if (!verifyShopifyWebhook(req)) {
    console.log("❌ Fake webhook blocked");
    return res.status(401).send("Unauthorized");
  }

  console.log("✅ REAL Shopify webhook received");
  console.log(req.body);

  return res.status(200).send("OK");
});

// -------------------------------------
// 404 fallback
// -------------------------------------
app.use((req, res) => {
  return res.status(404).type("text/plain").send("Not found");
});

// -------------------------------------
// Start server
// -------------------------------------
app.listen(port, () => {
  console.log(`EVICS running on port ${port}`);
  console.log(`Workspace: http://localhost:${port}/`);
  console.log(`Status: http://localhost:${port}/status`);
  console.log(`Products: http://localhost:${port}/products-dashboard`);
});
``