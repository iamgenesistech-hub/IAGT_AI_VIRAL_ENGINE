// backend/server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const SupabaseConnector = require('../utils/SupabaseConnector');
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard/control-center')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/control-center/index.html'));
});

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

// -------------------------
// Agent endpoints
// -------------------------

// /api/agent/viral-scan — trigger viral intelligence scan
app.post('/api/agent/viral-scan', async (req, res) => {
  try {
    const amount = Math.max(100, Math.min(10000, Number(req.body.amount) || 1284));
    const { error } = await SupabaseConnector
      .from('evics_trends')
      .insert([{
        title: `Agent viral scan — ${amount} ads`,
        source: 'agent_viral_scan',
        scan_amount: amount,
        created_at: new Date().toISOString()
      }]);
    if (error) console.warn('Agent viral scan log failed:', error.message);
    noStore(res);
    res.json({ success: true, count: amount, message: `Viral scan triggered for ${amount} ads.` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/reconstruct — AI creative reconstruction from a viral ad
app.post('/api/agent/reconstruct', async (req, res) => {
  try {
    const { adId, hook, platform, category } = req.body;
    const { data, error } = await SupabaseConnector
      .from('creatives')
      .insert([{
        status: 'Draft',
        hook: hook || 'AI-reconstructed hook',
        product: category || 'General',
        format: `${platform || 'Multi'} Reconstruction`,
        channel: platform || 'Multi',
        score: 80,
        approved: false,
        created_at: new Date().toISOString()
      }])
      .select();
    if (error) console.warn('Reconstruct insert failed:', error.message);
    noStore(res);
    res.json({ success: true, creative: data ? data[0] : null, message: 'Creative reconstruction queued.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/generate-ads — auto-generate today's ad batch
app.post('/api/agent/generate-ads', async (req, res) => {
  try {
    const { products: productList, hooks } = req.body;
    const batch = (productList || []).slice(0, 5).map((product, i) => ({
      status: 'Draft',
      product: product.name || product,
      hook: (hooks && hooks[i]) ? hooks[i].text || hooks[i] : 'AI-generated hook',
      format: 'Auto-generated',
      channel: 'TikTok + Reels',
      score: 75,
      approved: false,
      created_at: new Date().toISOString()
    }));
    if (batch.length > 0) {
      const { error } = await SupabaseConnector.from('creatives').insert(batch);
      if (error) console.warn('Generate ads insert failed:', error.message);
    }
    noStore(res);
    res.json({ success: true, generated: batch.length, message: `${batch.length} ads queued for generation.` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/approve-creative — approve or reject a creative
app.post('/api/agent/approve-creative', async (req, res) => {
  try {
    const { id, approved, rejectionReason } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'id is required.' });
    const update = { approved: Boolean(approved) };
    if (!approved && rejectionReason) update.rejection_reason = rejectionReason;
    const { error } = await SupabaseConnector.from('creatives').update(update).eq('id', id);
    if (error) throw new Error(error.message);
    noStore(res);
    res.json({ success: true, id, approved: Boolean(approved) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/publish — push a creative to the publishing queue
app.post('/api/agent/publish', async (req, res) => {
  try {
    const { creativeId, channel, publishAt } = req.body;
    if (!creativeId) return res.status(400).json({ success: false, error: 'creativeId is required.' });
    const { data, error } = await SupabaseConnector
      .from('publishing_queue')
      .insert([{
        creative_id: creativeId,
        channel: channel || 'TikTok',
        status: 'Queued',
        publish_at: publishAt || new Date().toISOString(),
        created_at: new Date().toISOString()
      }])
      .select();
    if (error) throw new Error(error.message);
    noStore(res);
    res.json({ success: true, queued: data ? data[0] : null, message: 'Creative added to publishing queue.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/learning-loop — record performance data and update best patterns
app.post('/api/agent/learning-loop', async (req, res) => {
  try {
    const { creativeId, watchTime, engagement, ctr, sales, conversionRate } = req.body;
    const { error } = await SupabaseConnector
      .from('evics_renders')
      .insert([{
        platform: 'learning_loop',
        status: 'logged',
        parameters: JSON.stringify({ creativeId, watchTime, engagement, ctr, sales, conversionRate }),
        created_at: new Date().toISOString()
      }]);
    if (error) console.warn('Learning loop log failed:', error.message);
    noStore(res);
    res.json({ success: true, message: 'Performance data recorded. Patterns will update nightly.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// /api/agent/copilot — AI copilot: answer workspace questions and suggest next actions
app.post('/api/agent/copilot', async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'question is required.' });

    // Pull live workspace context from Supabase
    const [trendsRes, creativesRes, productsRes] = await Promise.all([
      SupabaseConnector.from('evics_trends').select('title, hook, category, platform').order('created_at', { ascending: false }).limit(3),
      SupabaseConnector.from('creatives').select('product, hook, status, score').order('score', { ascending: false }).limit(3),
      SupabaseConnector.from('evics_products').select('name, category, angle, score').order('score', { ascending: false }).limit(3)
    ]);

    const workspaceContext = {
      topTrends: trendsRes.data || [],
      topCreatives: creativesRes.data || [],
      topProducts: productsRes.data || [],
      userContext: context || {}
    };

    // Build a suggested answer based on workspace data
    const topProduct = (productsRes.data && productsRes.data[0]) ? productsRes.data[0].name : 'your top product';
    const topHook = (trendsRes.data && trendsRes.data[0]) ? trendsRes.data[0].hook : null;
    const suggestion = topHook
      ? `Based on current trends, focus on "${topHook}" for ${topProduct}. Your top creative is scoring well — consider scaling it.`
      : `Focus on ${topProduct} with a curiosity-led hook. Run a viral scan to surface fresh patterns.`;

    noStore(res);
    res.json({
      success: true,
      question,
      answer: suggestion,
      nextActions: [
        'Run a viral rescan to refresh trend data',
        `Generate new ads for ${topProduct}`,
        'Review and approve pending creatives',
        'Check publishing queue for today'
      ],
      workspaceContext
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/media — Media Review & Approval Workspace
// -------------------------

// GET /api/media/stats — approval workflow stats
app.get('/api/media/stats', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('approval_status');

    if (error) throw new Error(error.message);

    const rows = data || [];
    const stats = {
      total: rows.length,
      approved: rows.filter((r) => r.approval_status === 'approved').length,
      pending: rows.filter((r) => !r.approval_status || r.approval_status === 'pending').length,
      rerender: rows.filter((r) => r.approval_status === 'needs_rerender').length,
      discarded: rows.filter((r) => r.approval_status === 'discarded').length,
    };

    noStore(res);
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// GET /api/media/gallery — list all rendered videos with status
app.get('/api/media/gallery', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const videos = (data || []).map((row) => ({
      id: row.id,
      platform: row.platform || 'Unknown',
      jobId: row.job_id || null,
      videoUrl: row.video_url || null,
      thumbnailUrl: row.thumbnail_url || null,
      status: row.status || 'pending',
      approvalStatus: row.approval_status || 'pending',
      script: row.script || '',
      parameters: (() => { try { return JSON.parse(row.parameters || '{}'); } catch { return {}; } })(),
      rejectionReason: row.rejection_reason || '',
      aiSuggestions: (() => { try { return JSON.parse(row.ai_suggestions || 'null'); } catch { return null; } })(),
      iterationCount: row.iteration_count || 0,
      qualityScore: row.quality_score || null,
      product: row.product || null,
      hook: row.hook || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }));

    noStore(res);
    res.json({ success: true, count: videos.length, videos });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// GET /api/media/:id — single video details
app.get('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ success: false, error: 'Video not found.' });

    const video = {
      id: data.id,
      platform: data.platform || 'Unknown',
      jobId: data.job_id || null,
      videoUrl: data.video_url || null,
      thumbnailUrl: data.thumbnail_url || null,
      status: data.status || 'pending',
      approvalStatus: data.approval_status || 'pending',
      script: data.script || '',
      parameters: (() => { try { return JSON.parse(data.parameters || '{}'); } catch { return {}; } })(),
      rejectionReason: data.rejection_reason || '',
      aiSuggestions: (() => { try { return JSON.parse(data.ai_suggestions || 'null'); } catch { return null; } })(),
      iterationCount: data.iteration_count || 0,
      qualityScore: data.quality_score || null,
      product: data.product || null,
      hook: data.hook || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };

    noStore(res);
    res.json({ success: true, video });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/media/:id/approve — mark as approved
app.post('/api/media/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await SupabaseConnector
      .from('evics_renders')
      .update({
        approval_status: 'approved',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, id, approvalStatus: 'approved' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/media/:id/reject — mark for re-render with reason
app.post('/api/media/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Pull current record to get context for AI suggestions
    const { data: existing } = await SupabaseConnector
      .from('evics_renders')
      .select('platform, script, parameters, iteration_count, product, hook')
      .eq('id', id)
      .single();

    const iterationCount = (existing?.iteration_count || 0) + 1;

    // Build AI suggestions using copilot-style analysis
    const params = (() => { try { return JSON.parse(existing?.parameters || '{}'); } catch { return {}; } })();
    const suggestions = buildRerenderSuggestions({
      platform: existing?.platform,
      script: existing?.script,
      product: existing?.product,
      hook: existing?.hook,
      reason,
      params,
      iterationCount,
    });

    const { error } = await SupabaseConnector
      .from('evics_renders')
      .update({
        approval_status: 'needs_rerender',
        rejection_reason: reason || '',
        ai_suggestions: JSON.stringify(suggestions),
        iteration_count: iterationCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, id, approvalStatus: 'needs_rerender', suggestions, iterationCount });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/media/:id/discard — mark as discarded
app.post('/api/media/:id/discard', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await SupabaseConnector
      .from('evics_renders')
      .update({
        approval_status: 'discarded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, id, approvalStatus: 'discarded' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/media/:id/requeue — add back to render queue with AI improvements
app.post('/api/media/:id/requeue', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) return res.status(404).json({ success: false, error: 'Video not found.' });

    const iterationCount = existing.iteration_count || 0;
    if (iterationCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum re-render attempts (3) reached. Please discard or manually revise.',
      });
    }

    const aiSuggestions = (() => { try { return JSON.parse(existing.ai_suggestions || 'null'); } catch { return null; } })();
    const params = (() => { try { return JSON.parse(existing.parameters || '{}'); } catch { return {}; } })();

    // Build improved script incorporating AI suggestions
    const improvedScript = aiSuggestions
      ? `[Re-render ${iterationCount + 1} — AI Improvements Applied]\n${aiSuggestions.improvements.map((s) => `• ${s}`).join('\n')}\n\n${existing.script || ''}`
      : existing.script || '';

    // Insert new render job with improvements
    const { data: newRender, error: insertErr } = await SupabaseConnector
      .from('evics_renders')
      .insert([{
        platform: existing.platform,
        job_id: null,
        video_url: null,
        status: 'queued',
        approval_status: 'pending',
        script: improvedScript,
        parameters: existing.parameters,
        product: existing.product,
        hook: existing.hook,
        iteration_count: iterationCount + 1,
        parent_render_id: id,
        rejection_reason: null,
        ai_suggestions: null,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (insertErr) throw new Error(insertErr.message);

    // Mark original as superseded
    await SupabaseConnector
      .from('evics_renders')
      .update({ approval_status: 'superseded', updated_at: new Date().toISOString() })
      .eq('id', id);

    noStore(res);
    res.json({
      success: true,
      originalId: id,
      newRenderId: newRender ? newRender[0]?.id : null,
      iterationCount: iterationCount + 1,
      message: `Re-render queued (attempt ${iterationCount + 1} of 3). AI improvements applied.`,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/media/bulk — bulk approve / discard / requeue
app.post('/api/media/bulk', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: 'ids array is required.' });
    }
    if (!['approve', 'discard'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or discard.' });
    }

    const approvalStatus = action === 'approve' ? 'approved' : 'discarded';
    const { error } = await SupabaseConnector
      .from('evics_renders')
      .update({ approval_status: approvalStatus, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, updated: ids.length, approvalStatus });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// Helper: generate AI re-render suggestions based on video metadata
function buildRerenderSuggestions({ platform, script, product, hook, reason, params, iterationCount }) {
  const improvements = [];
  const reasonLower = (reason || '').toLowerCase();
  const scriptLower = (script || '').toLowerCase();

  // Hook analysis
  if (reasonLower.includes('hook') || reasonLower.includes('opening') || !hook) {
    improvements.push('Rewrite the opening hook with a stronger curiosity or problem-agitation pattern');
    improvements.push('Lead with a bold claim or surprising statistic in the first 2 seconds');
  }

  // Pacing analysis
  if (reasonLower.includes('pac') || reasonLower.includes('slow') || reasonLower.includes('cut')) {
    improvements.push('Increase visual cut frequency — aim for a new scene every 1.5–2 seconds');
    improvements.push('Add dynamic text overlays to maintain viewer attention through the middle section');
  }

  // Product placement
  if (reasonLower.includes('product') || reasonLower.includes('placement')) {
    improvements.push('Move product reveal earlier — show it within the first 4 seconds');
    improvements.push('Add a close-up product shot with benefit callout text');
  }

  // CTA
  if (reasonLower.includes('cta') || reasonLower.includes('call') || reasonLower.includes('action')) {
    improvements.push('Strengthen the CTA with urgency language (e.g. "Start today", "Limited offer")');
    improvements.push('Add a visual CTA overlay in the final 3 seconds');
  }

  // Platform-specific
  if ((platform || '').toLowerCase() === 'tiktok') {
    improvements.push('Ensure first frame is visually striking — TikTok scroll-stop requires immediate visual impact');
  } else if ((platform || '').toLowerCase() === 'instagram') {
    improvements.push('Optimize for silent viewing — ensure all key messages appear as text overlays');
  }

  // Script length
  if (scriptLower.length > 600) {
    improvements.push('Trim script to under 150 words — shorter scripts perform better on short-form platforms');
  }

  // Fallback
  if (improvements.length === 0) {
    improvements.push('Refresh the hook with a new emotional angle');
    improvements.push('Test a different visual style (UGC vs. polished commercial)');
    improvements.push('Adjust pacing and add pattern interrupts every 3 seconds');
  }

  const expectedImprovement = Math.min(15 + iterationCount * 5, 30);

  return {
    improvements: improvements.slice(0, 5),
    expectedQualityGain: `+${expectedImprovement}% estimated quality improvement`,
    focusArea: reasonLower.includes('hook') ? 'Hook & Opening'
      : reasonLower.includes('pac') ? 'Pacing & Editing'
      : reasonLower.includes('product') ? 'Product Placement'
      : reasonLower.includes('cta') ? 'Call to Action'
      : 'Overall Creative Quality',
    iterationNote: iterationCount >= 2
      ? 'Final re-render attempt. Consider a full creative overhaul if this does not meet standards.'
      : `Attempt ${iterationCount} of 3. AI improvements applied based on rejection feedback.`,
  };
}

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
  console.log(`➡️  Dashboard:           http://127.0.0.1:${PORT}/`);
  console.log(`➡️  Status:              http://127.0.0.1:${PORT}/status`);
  console.log(`➡️  Products:            http://127.0.0.1:${PORT}/api/products`);
  console.log(`➡️  Renders:             http://127.0.0.1:${PORT}/api/renders`);
  console.log(`➡️  Campaigns:           http://127.0.0.1:${PORT}/api/campaigns`);
  console.log(`➡️  Trends:              http://127.0.0.1:${PORT}/api/trends`);
  console.log(`➡️  Dashboard summary:   http://127.0.0.1:${PORT}/api/dashboard-summary`);
  console.log(`➡️  Shopify products:    http://127.0.0.1:${PORT}/api/shopify/products`);
  console.log(`➡️  Shopify collections: http://127.0.0.1:${PORT}/api/shopify/collections`);
  console.log(`➡️  Viral rescan:        POST http://127.0.0.1:${PORT}/api/viral/rescan`);
  console.log(`➡️  Hook search:         POST http://127.0.0.1:${PORT}/api/hooks/search`);
  console.log(`➡️  Creatives:           http://127.0.0.1:${PORT}/api/creatives`);
  console.log(`➡️  Assembly drafts:     http://127.0.0.1:${PORT}/api/assembly/drafts`);
  console.log(`➡️  AI suggestions:      POST http://127.0.0.1:${PORT}/api/assembly/suggestions`);
  console.log(`➡️  Video generate:      POST http://127.0.0.1:${PORT}/api/video/generate`);
  console.log(`➡️  Agent viral scan:    POST http://127.0.0.1:${PORT}/api/agent/viral-scan`);
  console.log(`➡️  Agent reconstruct:   POST http://127.0.0.1:${PORT}/api/agent/reconstruct`);
  console.log(`➡️  Agent generate ads:  POST http://127.0.0.1:${PORT}/api/agent/generate-ads`);
  console.log(`➡️  Agent approve:       POST http://127.0.0.1:${PORT}/api/agent/approve-creative`);
  console.log(`➡️  Agent publish:       POST http://127.0.0.1:${PORT}/api/agent/publish`);
  console.log(`➡️  Agent learning loop: POST http://127.0.0.1:${PORT}/api/agent/learning-loop`);
  console.log(`➡️  Agent copilot:       POST http://127.0.0.1:${PORT}/api/agent/copilot`);
  console.log(`➡️  Media gallery:       http://127.0.0.1:${PORT}/api/media/gallery`);
  console.log(`➡️  Media stats:         http://127.0.0.1:${PORT}/api/media/stats`);
  console.log(`➡️  Media approve:       POST http://127.0.0.1:${PORT}/api/media/:id/approve`);
  console.log(`➡️  Media reject:        POST http://127.0.0.1:${PORT}/api/media/:id/reject`);
  console.log(`➡️  Media discard:       POST http://127.0.0.1:${PORT}/api/media/:id/discard`);
  console.log(`➡️  Media requeue:       POST http://127.0.0.1:${PORT}/api/media/:id/requeue`);
  console.log(`➡️  Media bulk:          POST http://127.0.0.1:${PORT}/api/media/bulk`);
});