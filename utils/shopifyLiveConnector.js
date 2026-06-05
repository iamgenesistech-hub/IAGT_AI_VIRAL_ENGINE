const supabase = require('./SupabaseConnector');

async function fetchShopifyProducts() {
  try {
    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .order('synced_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("fetchShopifyProducts error, returning empty array:", error.message);
    return [];
  }
}

async function fetchShopifyCollections() {
  try {
    const { data, error } = await supabase
      .from('shopify_collections')
      .select('*')
      .order('synced_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("fetchShopifyCollections error, returning empty array:", error.message);
    return [];
  }
}

module.exports = {
  fetchShopifyProducts,
  fetchShopifyCollections
};
