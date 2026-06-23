const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// ✅ Shopify hits THIS (public door)
app.post('/shopify/webhook', async (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];

  const digest = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(req.body), 'utf8')
    .digest('base64');

  if (digest !== hmacHeader) {
    console.log('❌ Fake webhook blocked');
    return res.status(401).send('Unauthorized');
  }

  console.log('✅ Shopify webhook received');
  console.log(req.body);

  // ✅ Forward to your private EVICS backend
  await fetch('https://evics-api-480958062306.us-central1.run.app/api/shopify/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  }).catch(err => console.error(err));

  res.status(200).send('OK');
});

app.listen(8080, () => {
  console.log('Webhook service running');
});