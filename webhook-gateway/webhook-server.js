const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

app.post('/shopify/webhook', (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];

  const digest = crypto
    .createHmac('sha256', SECRET || '')
    .update(JSON.stringify(req.body), 'utf8')
    .digest('base64');

  if (digest !== hmacHeader) {
    console.log('❌ Fake webhook blocked');
    return res.status(401).send('Unauthorized');
  }

  console.log('✅ Shopify webhook received');
  console.log(req.body);

  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Webhook gateway is running');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Webhook gateway listening on port ${port}`);
});
