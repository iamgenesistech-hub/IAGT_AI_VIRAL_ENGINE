async function connectShopifyStore() {

  return {
    connected: true,
    store: "I AM GENESIS TECH",
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  connectShopifyStore
};