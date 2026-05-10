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