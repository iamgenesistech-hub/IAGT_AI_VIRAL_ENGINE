// backend/shopifyDataApi.js
const supabase = require("../utils/SupabaseConnector");

async function getSyncedProducts(limit = 100) {
  const { data, error } = await supabase
    .from("shopify_products")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

async function getSyncedCollections(limit = 100) {
  const { data, error } = await supabase
    .from("shopify_collections")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = {
  getSyncedProducts,
  getSyncedCollections,
};