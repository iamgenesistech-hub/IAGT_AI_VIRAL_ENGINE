/**
 * WARNING: This is an obsolete/duplicate server file.
 * The primary active production backend is located at backend/server.js.
 * This file (utils/server.js) was a legacy mock server that served a 'frontend' directory (which does not exist on disk).
 * Do not run this server for production. Use backend/server.js instead.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({
    status: 'EVICS Command Center Online',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`EVICS Command Center running at http://localhost:${PORT}`);
});