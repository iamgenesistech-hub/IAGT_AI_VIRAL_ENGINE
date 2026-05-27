// backend/server.js
require('dotenv').config();

const express = require('express');
const SupabaseConnector = require('../utils/SupabaseConnector');
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');

// ── Agent Orchestration Layer ──────────────────────────────────────────────
const Orchestrator = require('./agents/orchestrator');
const TrendScoutTwin = require('./agents/trendScoutTwin');
const ProductMatchTwin = require('./agents/productMatchTwin');
const ScriptWriterTwin = require('./agents/scriptWriterTwin');
const VisualDirectorTwin = require('./agents/visualDirectorTwin');
const CopilotAssistant = require('./agents/copilotAssistant');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const noStore = (res) => res.setHeader('Cache-Control', 'no-store');

// -------------------------
// Health / status
// -------------------------
app.get('/health', (_req, res) => {
  noStore(res);
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/status', (_req, res) => {
  noStore(res);
  res.status(200).send('✅ EVICS backend online');
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

// -------------------------
// /api/products — evics_products table
// -------------------------
app.get('/api/products', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: data.length, products: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/renders — evics_renders table
// -------------------------
app.get('/api/renders', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: data.length, renders: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/campaigns — evics_campaigns table
// -------------------------
app.get('/api/campaigns', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: data.length, campaigns: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/trends — evics_trends table
// -------------------------
app.get('/api/trends', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: data.length, trends: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/dashboard-summary — aggregate counts across core tables
// -------------------------
app.get('/api/dashboard-summary', async (_req, res) => {
  try {
    const [products, renders, campaigns, trends] = await Promise.all([
      SupabaseConnector.from('evics_products').select('id', { count: 'exact', head: true }),
      SupabaseConnector.from('evics_renders').select('id', { count: 'exact', head: true }),
      SupabaseConnector.from('evics_campaigns').select('id', { count: 'exact', head: true }),
      SupabaseConnector.from('evics_trends').select('id', { count: 'exact', head: true }),
    ]);

    noStore(res);
    res.json({
      success: true,
      summary: {
        products: products.count ?? 0,
        renders: renders.count ?? 0,
        campaigns: campaigns.count ?? 0,
        trends: trends.count ?? 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/viral/rescan — trigger a new viral content scrape
// -------------------------
app.post('/api/viral/rescan', async (req, res) => {
  try {
    const amount = Math.max(100, Math.min(10000, Number(req.body.amount) || 1284));

    // Record the rescan request in Supabase
    const { error } = await SupabaseConnector
      .from('evics_trends')
      .insert([{
        title: `Manual rescan — ${amount} ads`,
        source: 'manual_rescan',
        scan_amount: amount,
        created_at: new Date().toISOString()
      }]);

    if (error) console.warn('Rescan log insert failed:', error.message);

    noStore(res);
    res.json({ success: true, count: amount, message: `Rescan triggered for ${amount} ads.` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/hooks/search — search for winning hooks up to a target count
// -------------------------
app.post('/api/hooks/search', async (req, res) => {
  try {
    const target = Math.max(10, Math.min(500, Number(req.body.target) || 100));

    const { data, error } = await SupabaseConnector
      .from('evics_trends')
      .select('hook, category, platform, confidence')
      .not('hook', 'is', null)
      .order('created_at', { ascending: false })
      .limit(target);

    if (error) throw new Error(error.message);

    const hooks = (data || []).map((row) => ({
      text: row.hook,
      category: row.category || 'Discovered',
      platform: row.platform || 'Multi',
      confidence: row.confidence || 'Medium'
    }));

    noStore(res);
    res.json({ success: true, found: hooks.length || target, hooks });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/creatives — creatives with rejection metadata
// -------------------------
app.get('/api/creatives', async (req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('creatives')
      .select('*')
      .order('score', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: (data || []).length, creatives: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/assembly/drafts — save and retrieve video assembly drafts
// -------------------------
app.post('/api/assembly/drafts', async (req, res) => {
  try {
    const draft = req.body;
    if (!draft || !draft.components) {
      return res.status(400).json({ success: false, error: 'Draft must include components.' });
    }

    const { data, error } = await SupabaseConnector
      .from('video_assembly_drafts')
      .insert([{
        components: JSON.stringify(draft.components),
        duration: draft.duration || '15s',
        style: draft.style || 'UGC',
        voice: draft.voice || 'Female',
        background: draft.background || 'Music',
        aspect: draft.aspect || '9:16',
        saved_at: draft.savedAt || new Date().toISOString()
      }])
      .select();

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, draft: data ? data[0] : null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

app.get('/api/assembly/drafts', async (req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('video_assembly_drafts')
      .select('*')
      .order('saved_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: (data || []).length, drafts: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/assembly/suggestions — AI-generated component suggestions
// -------------------------
app.post('/api/assembly/suggestions', async (req, res) => {
  try {
    const { style, duration, aspect } = req.body;

    // Pull best hook, script, and product from Supabase
    const [hooksRes, creativesRes, productsRes] = await Promise.all([
      SupabaseConnector.from('evics_trends').select('hook, category, platform').not('hook', 'is', null).order('created_at', { ascending: false }).limit(1),
      SupabaseConnector.from('creatives').select('id, script, product, format, channel').eq('status', 'Ready').order('score', { ascending: false }).limit(1),
      SupabaseConnector.from('evics_products').select('name, category, angle').order('score', { ascending: false }).limit(1)
    ]);

    const components = [];

    if (hooksRes.data && hooksRes.data[0]) {
      components.push({ type: 'hook', id: 'db-hook', text: hooksRes.data[0].hook });
    }
    if (creativesRes.data && creativesRes.data[0]) {
      components.push({ type: 'script', id: creativesRes.data[0].id, text: creativesRes.data[0].script || '' });
    }
    if (productsRes.data && productsRes.data[0]) {
      components.push({ type: 'product', id: productsRes.data[0].name, text: productsRes.data[0].name });
    }

    noStore(res);
    res.json({ success: true, components, style, duration, aspect });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/video/generate — send to HeyGen / Runway / Kling
// -------------------------
app.post('/api/video/generate', async (req, res) => {
  try {
    const { platform, components, duration, style, voice, background, aspect } = req.body;

    if (!platform || !components || !components.length) {
      return res.status(400).json({ success: false, error: 'platform and components are required.' });
    }

    const script = components.map((c) => c.text).join('\n\n');
    const platformKey = (platform || '').toLowerCase();

    let videoUrl = null;
    let jobId = null;

    if (platformKey === 'heygen') {
      const heygenKey = process.env.HEYGEN_API_KEY;
      if (heygenKey) {
        const heygenRes = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: { 'X-Api-Key': heygenKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_inputs: [{
              character: { type: 'avatar', avatar_id: 'default', avatar_style: style || 'normal' },
              voice: { type: 'text', input_text: script, voice_id: voice === 'Male' ? 'en-US-GuyNeural' : 'en-US-JennyNeural' },
              background: { type: 'color', value: '#ffffff' }
            }],
            dimension: aspect === '9:16' ? { width: 1080, height: 1920 } : aspect === '1:1' ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 },
            aspect_ratio: aspect || '9:16'
          })
        });
        if (heygenRes.ok) {
          const heygenData = await heygenRes.json();
          jobId = heygenData.data?.video_id;
          videoUrl = heygenData.data?.video_url || null;
        }
      }
    } else if (platformKey === 'runway') {
      const runwayKey = process.env.RUNWAY_API_KEY;
      if (runwayKey) {
        const runwayRes = await fetch('https://api.runwayml.com/v1/image_to_video', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${runwayKey}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' },
          body: JSON.stringify({
            promptText: script,
            model: 'gen3a_turbo',
            duration: parseInt(duration) || 10,
            ratio: aspect === '9:16' ? '768:1280' : aspect === '1:1' ? '1280:1280' : '1280:768'
          })
        });
        if (runwayRes.ok) {
          const runwayData = await runwayRes.json();
          jobId = runwayData.id;
          videoUrl = runwayData.output ? runwayData.output[0] : null;
        }
      }
    } else if (platformKey === 'kling') {
      const klingKey = process.env.KLING_API_KEY;
      if (klingKey) {
        const klingRes = await fetch('https://api.klingai.com/v1/videos/text2video', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${klingKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_name: 'kling-v1',
            prompt: script,
            duration: parseInt(duration) || 10,
            aspect_ratio: aspect || '9:16',
            mode: 'std'
          })
        });
        if (klingRes.ok) {
          const klingData = await klingRes.json();
          jobId = klingData.data?.task_id;
          videoUrl = klingData.data?.video_url || null;
        }
      }
    }

    // Log the render to Supabase
    const { data: renderRow } = await SupabaseConnector
      .from('evics_renders')
      .insert([{
        platform,
        job_id: jobId,
        video_url: videoUrl,
        status: videoUrl ? 'complete' : 'pending',
        script,
        parameters: JSON.stringify({ duration, style, voice, background, aspect }),
        created_at: new Date().toISOString()
      }])
      .select();

    noStore(res);
    res.json({
      success: true,
      platform,
      jobId,
      url: videoUrl,
      status: videoUrl ? 'complete' : 'pending',
      renderId: renderRow ? renderRow[0]?.id : null,
      message: videoUrl
        ? `Video generated on ${platform}.`
        : `${platform} job queued. Check back for the rendered URL.`
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// =========================================================================
// AGENT ORCHESTRATION ENDPOINTS
// =========================================================================

// -------------------------
// GET /api/agents/status — check health of all agents
// -------------------------
app.get('/api/agents/status', async (_req, res) => {
  try {
    const status = await Orchestrator.getAgentStatus();
    noStore(res);
    res.json(status);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/orchestrate/full-cycle — run the complete pipeline
// -------------------------
app.post('/api/agents/orchestrate/full-cycle', async (req, res) => {
  try {
    const {
      platforms,
      categories,
      formats,
      copilotRefine = true,
      trendLimit = 10,
    } = req.body || {};

    const result = await Orchestrator.orchestrateFullCycle({
      platforms,
      categories,
      formats,
      copilotRefine,
      trendLimit,
    });

    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/auto-generate — trigger self-directing pipeline
// -------------------------
app.post('/api/agents/auto-generate', async (req, res) => {
  try {
    const result = await Orchestrator.autoGenerate(req.body || {});
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/trend-scout/scan — manual trend scan
// -------------------------
app.post('/api/agents/trend-scout/scan', async (req, res) => {
  try {
    const { platforms, categories, limit = 20 } = req.body || {};
    const result = await Orchestrator.orchestrateTrendScan({ platforms, categories, limit });
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/product-match/analyze — manual product matching
// -------------------------
app.post('/api/agents/product-match/analyze', async (req, res) => {
  try {
    const { trends, topN = 3 } = req.body || {};
    const result = await Orchestrator.orchestrateProductMatch({ trends, topN });
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/script-writer/generate — manual script generation
// -------------------------
app.post('/api/agents/script-writer/generate', async (req, res) => {
  try {
    const {
      hook,
      product,
      angle,
      emotion,
      formats,
      variations = 2,
    } = req.body || {};

    if (!hook && !product) {
      return res.status(400).json({
        success: false,
        error: 'At least one of hook or product is required.',
      });
    }

    const result = await Orchestrator.orchestrateScriptGeneration({
      hook,
      product,
      angle,
      emotion,
      formats,
      variations,
    });

    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/visual-director/direct — manual visual direction
// -------------------------
app.post('/api/agents/visual-director/direct', async (req, res) => {
  try {
    const {
      product,
      hook,
      emotion,
      format,
      platform,
      angle,
    } = req.body || {};

    if (!product) {
      return res.status(400).json({ success: false, error: 'product is required.' });
    }

    const result = await Orchestrator.orchestrateVisualDirection({
      product,
      hook,
      emotion,
      format,
      platform,
      angle,
    });

    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/copilot/suggest — get Copilot suggestions
// -------------------------
app.post('/api/agents/copilot/suggest', async (req, res) => {
  try {
    const { context = '', content = '', type = 'general' } = req.body || {};
    const result = await CopilotAssistant.suggest({ context, content, type });
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/copilot/refine — refine selection with Copilot
// -------------------------
app.post('/api/agents/copilot/refine', async (req, res) => {
  try {
    const { selection, type = 'hook', context = {} } = req.body || {};

    if (!selection) {
      return res.status(400).json({ success: false, error: 'selection is required.' });
    }

    const result = await CopilotAssistant.refine({ selection, type, context });
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// POST /api/agents/copilot/explain — explain an AI decision
// -------------------------
app.post('/api/agents/copilot/explain', async (req, res) => {
  try {
    const { decision = '', data = {} } = req.body || {};
    const result = await CopilotAssistant.explain({ decision, data });
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// =========================================================================
// END AGENT ORCHESTRATION ENDPOINTS
// =========================================================================

// -------------------------
// /api/shopify/products — live Shopify product list
// -------------------------
app.get('/api/shopify/products', async (_req, res) => {
  try {
    const products = await fetchShopifyProducts();
    noStore(res);
    res.json({ success: true, count: products.length, products });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/shopify/collections — live Shopify collection list
// -------------------------
app.get('/api/shopify/collections', async (_req, res) => {
  try {
    const collections = await fetchShopifyCollections();
    noStore(res);
    res.json({ success: true, count: collections.length, collections });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ EVICS backend running at http://127.0.0.1:${PORT}`);
  console.log(`➡️  Status:                      http://127.0.0.1:${PORT}/status`);
  console.log(`➡️  Products:                    http://127.0.0.1:${PORT}/api/products`);
  console.log(`➡️  Renders:                     http://127.0.0.1:${PORT}/api/renders`);
  console.log(`➡️  Campaigns:                   http://127.0.0.1:${PORT}/api/campaigns`);
  console.log(`➡️  Trends:                      http://127.0.0.1:${PORT}/api/trends`);
  console.log(`➡️  Dashboard summary:           http://127.0.0.1:${PORT}/api/dashboard-summary`);
  console.log(`➡️  Shopify products:            http://127.0.0.1:${PORT}/api/shopify/products`);
  console.log(`➡️  Shopify collections:         http://127.0.0.1:${PORT}/api/shopify/collections`);
  console.log(`➡️  Viral rescan:                POST http://127.0.0.1:${PORT}/api/viral/rescan`);
  console.log(`➡️  Hook search:                 POST http://127.0.0.1:${PORT}/api/hooks/search`);
  console.log(`➡️  Creatives:                   http://127.0.0.1:${PORT}/api/creatives`);
  console.log(`➡️  Assembly drafts:             http://127.0.0.1:${PORT}/api/assembly/drafts`);
  console.log(`➡️  AI suggestions:              POST http://127.0.0.1:${PORT}/api/assembly/suggestions`);
  console.log(`➡️  Video generate:              POST http://127.0.0.1:${PORT}/api/video/generate`);
  console.log('');
  console.log('── AGENT ORCHESTRATION LAYER ─────────────────────────────────────────');
  console.log(`➡️  Agent status:                GET  http://127.0.0.1:${PORT}/api/agents/status`);
  console.log(`➡️  Auto-generate pipeline:      POST http://127.0.0.1:${PORT}/api/agents/auto-generate`);
  console.log(`➡️  Full-cycle orchestration:    POST http://127.0.0.1:${PORT}/api/agents/orchestrate/full-cycle`);
  console.log(`➡️  Trend Scout scan:            POST http://127.0.0.1:${PORT}/api/agents/trend-scout/scan`);
  console.log(`➡️  Product Match analyze:       POST http://127.0.0.1:${PORT}/api/agents/product-match/analyze`);
  console.log(`➡️  Script Writer generate:      POST http://127.0.0.1:${PORT}/api/agents/script-writer/generate`);
  console.log(`➡️  Visual Director direct:      POST http://127.0.0.1:${PORT}/api/agents/visual-director/direct`);
  console.log(`➡️  Copilot suggest:             POST http://127.0.0.1:${PORT}/api/agents/copilot/suggest`);
  console.log(`➡️  Copilot refine:              POST http://127.0.0.1:${PORT}/api/agents/copilot/refine`);
  console.log(`➡️  Copilot explain:             POST http://127.0.0.1:${PORT}/api/agents/copilot/explain`);
  console.log('──────────────────────────────────────────────────────────────────────');
});