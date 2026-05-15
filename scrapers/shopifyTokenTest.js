require('dotenv').config();

const {
  generateShopifyAdminToken
} = require('../backend/shopifyAuth');

async function run() {
  try {
    console.log('Generating Shopify Admin API token...');

    const tokenData = await generateShopifyAdminToken();

    console.log('SUCCESS');
    console.log('Token prefix:', tokenData.access_token.slice(0, 6));
    console.log('Scope:', tokenData.scope);
    console.log('Expires in:', tokenData.expires_in);
    console.log('');
    console.log('COPY THIS INTO .env:');
    console.log(`SHOPIFY_ADMIN_ACCESS_TOKEN=${tokenData.access_token}`);
  } catch (error) {
    console.log('FAILED');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

run();