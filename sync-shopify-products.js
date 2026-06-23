const { syncShopifyProducts } = require("./evics-connectors");

syncShopifyProducts()
  .then((result) => {
    console.log(`Shopify product sync complete. Synced ${result.synced} products.`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
