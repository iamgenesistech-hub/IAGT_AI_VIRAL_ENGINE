// backend/server.js
require("dotenv").config();

console.log("FULL CLIENT ID:", process.env.SHOPIFY_CLIENT_ID);
console.log("HOST:", process.env.HOST);

const express = require("express");
const cookieParser = require("cookie-parser");
const shopify = require("./shopifyAuth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// ✅ Basic test routes
app.get("/", (req, res) => res.send("✅ EVICS backend online"));

app.get("/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// ✅ OAuth routes
app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// ✅ Test Shopify API after auth
app.get("/shop", shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Rest({ session });
    const response = await client.get({ path: "shop" });

    res.json({
      success: true,
      shopName: response.body.shop?.name,
      myshopifyDomain: response.body.shop?.myshopify_domain,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://127.0.0.1:${PORT}`);
  console.log(
    `➡️ OAuth (ngrok): https://${process.env.HOST}/auth?shop=iamgenesistech.myshopify.com`
  );
  console.log(`➡️ Test (ngrok): https://${process.env.HOST}/shop`);
});