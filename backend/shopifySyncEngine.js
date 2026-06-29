// backend/shopifySyncEngine.js
const supabase = require("../utils/SupabaseConnector");
const shopify = require("./shopifyAuth");

async function getOfflineSession(shop) {
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(shop);

  if (!sessions || sessions.length === 0) {
    throw new Error(
      `No Shopify session found for ${shop}. Open the app and complete OAuth first.`
    );
  }

  return sessions[0];
}

async function syncShopifyProducts(shop) {
  const session = await getOfflineSession(shop);
  const client = new shopify.api.clients.Rest({ session });

  const response = await client.get({
    path: "products",
    query: { limit: 50 },
  });

  const products = response.body.products || [];

  for (const product of products) {
    await supabase.from("shopify_products").upsert({
      id: product.id,
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      product_type: product.product_type,
      status: product.status,
      tags: product.tags,
      published_at: product.published_at,
      image_url: product.image?.src || null,
      raw_data: product,
      synced_at: new Date().toISOString(),
    });
  }

  return {
    synced: products.length,
    products,
  };
}

async function syncShopifyCollections(shop) {
  const session = await getOfflineSession(shop);
  const client = new shopify.api.clients.Rest({ session });

  const response = await client.get({
    path: "custom_collections",
    query: { limit: 50 },
  });

  const collections = response.body.custom_collections || [];

  for (const collection of collections) {
    await supabase.from("shopify_collections").upsert({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      body_html: collection.body_html,
      published: collection.published,
      raw_data: collection,
      synced_at: new Date().toISOString(),
    });
  }

  return {
    synced: collections.length,
    collections,
  };
}

module.exports = {
  syncShopifyProducts,
  syncShopifyCollections,
};