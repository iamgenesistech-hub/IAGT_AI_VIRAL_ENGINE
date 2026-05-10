require('dotenv').config();

const express = require('express');
const path = require('path');
const supabase = require('../utils/supabaseConnector');

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

app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase
    .from('evics_products')
    .select('*')
    .order('profit_score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.get('/api/renders', async (req, res) => {
  const { data, error } = await supabase
    .from('evics_renders')
    .select('*')
    .order('render_grade', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.get('/api/campaigns', async (req, res) => {
  const { data, error } = await supabase
    .from('evics_campaigns')
    .select('*')
    .order('profit_score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.get('/api/trends', async (req, res) => {
  const { data, error } = await supabase
    .from('evics_trends')
    .select('*')
    .order('viral_score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.get('/api/dashboard-summary', async (req, res) => {
  const { data: products, error: productError } = await supabase
    .from('evics_products')
    .select('*')
    .order('profit_score', { ascending: false });

  const { data: renders, error: renderError } = await supabase
    .from('evics_renders')
    .select('*')
    .order('render_grade', { ascending: false });

  const { data: campaigns, error: campaignError } = await supabase
    .from('evics_campaigns')
    .select('*')
    .order('profit_score', { ascending: false });

  const { data: trends, error: trendError } = await supabase
    .from('evics_trends')
    .select('*')
    .order('viral_score', { ascending: false });

  const error = productError || renderError || campaignError || trendError;

  if (error) return res.status(500).json({ error: error.message });

  const topProduct = products?.[0] || null;
  const topRender = renders?.[0] || null;
  const topCampaign = campaigns?.[0] || null;
  const topTrend = trends?.[0] || null;

  const totalNetProfit = products?.reduce((sum, item) => {
    return sum + Number(item.net_profit || 0);
  }, 0);

  res.json({
    systemStatus: 'Operational',
    databaseStatus: 'Supabase Connected',
    totalNetProfit,
    topSku: topProduct?.sku || 'N/A',
    topProductName: topProduct?.product_name || 'N/A',
    topRenderGrade: topRender?.render_grade || 0,
    topRenderName: topRender?.render_name || 'N/A',
    momentumScore: topProduct?.momentum_score || 0,
    awarenessScore: topProduct?.awareness_score || 0,
    topCampaign: topCampaign?.campaign_name || 'N/A',
    topTrend: topTrend?.trend_name || 'N/A',
    campaignAction: topCampaign?.status || 'Review',
    vaultRouting: topRender?.vault_destination || 'Pending',
    nextPriority: 'Live Shopify Integration'
  });
});

app.listen(PORT, () => {
  console.log(`EVICS Command Center running at http://localhost:${PORT}`);
});