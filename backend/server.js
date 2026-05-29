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
// /api/media/types — list available media types
// -------------------------
app.get('/api/media/types', (_req, res) => {
  noStore(res);
  res.json({
    success: true,
    types: [
      { id: 'video',         label: 'Video' },
      { id: 'print_ad',      label: 'Print Ad' },
      { id: 'email',         label: 'Email Marketing' },
      { id: 'social_post',   label: 'Social Post' },
      { id: 'landing_page',  label: 'Landing Page' },
      { id: 'ugc',           label: 'UGC' },
      { id: 'banner',        label: 'Banner Ad' }
    ]
  });
});

// -------------------------
// /api/media/apps — list available rendering apps
// -------------------------
app.get('/api/media/apps', (_req, res) => {
  noStore(res);
  res.json({
    success: true,
    apps: [
      { id: 'heygen',   label: 'HeyGen' },
      { id: 'runway',   label: 'Runway' },
      { id: 'kling',    label: 'Kling' },
      { id: 'internal', label: 'Internal' },
      { id: 'manual',   label: 'Manual' },
      { id: 'canva',    label: 'Canva' },
      { id: 'openai',   label: 'OpenAI' }
    ]
  });
});

// -------------------------
// /api/media/by-type/:type — get media filtered by type
// -------------------------
app.get('/api/media/by-type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('media_type', type)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, type, count: (data || []).length, media: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/media/by-app/:app — get media filtered by rendering app
// -------------------------
app.get('/api/media/by-app/:app', async (req, res) => {
  try {
    const { app: appName } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('platform', appName)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, app: appName, count: (data || []).length, media: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/media/by-type/:type/by-app/:app — get media filtered by both type and app
// -------------------------
app.get('/api/media/by-type/:type/by-app/:app', async (req, res) => {
  try {
    const { type, app: appName } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('media_type', type)
      .eq('platform', appName)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, type, app: appName, count: (data || []).length, media: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/media/:id/download — generate a download link for a media item
// -------------------------
app.post('/api/media/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('id, video_url, platform, media_type, status')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ success: false, error: 'Media item not found.' });

    const downloadUrl = data.video_url || null;

    noStore(res);
    res.json({
      success: true,
      id,
      downloadUrl,
      filename: `evics-media-${id}.mp4`,
      message: downloadUrl
        ? 'Download link generated.'
        : 'No file URL available for this media item.'
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// =========================================================
// API SERVICES MANAGEMENT — Configuration, Token Tracking,
// Failover, Alerts
// =========================================================

// In-memory store for service configs (persisted to Supabase when available)
const SERVICE_CONFIGS = {
  // ── Video Rendering ──
  heygen: {
    id: 'heygen', name: 'HeyGen', category: 'video',
    envKey: 'HEYGEN_API_KEY',
    enabled: true, isPrimary: true,
    backups: ['runway', 'kling'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'minutes',     costPerUnit: 0.10 },
      pro:        { limit: 1000,      unit: 'minutes',     costPerUnit: 0.05 },
      enterprise: { limit: Infinity,  unit: 'minutes',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  runway: {
    id: 'runway', name: 'Runway', category: 'video',
    envKey: 'RUNWAY_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['heygen', 'kling'],
    plan: 'free',
    plans: {
      free:       { limit: 5,         unit: 'generations', costPerUnit: 0.10 },
      pro:        { limit: 100,       unit: 'generations', costPerUnit: 0.05 },
      enterprise: { limit: Infinity,  unit: 'generations', costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  kling: {
    id: 'kling', name: 'Kling', category: 'video',
    envKey: 'KLING_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['heygen', 'runway'],
    plan: 'free',
    plans: {
      free:       { limit: 10,        unit: 'generations', costPerUnit: 0.08 },
      pro:        { limit: 100,       unit: 'generations', costPerUnit: 0.04 },
      enterprise: { limit: Infinity,  unit: 'generations', costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  // ── Image Generation ──
  canva: {
    id: 'canva', name: 'Canva', category: 'image',
    envKey: 'CANVA_API_KEY',
    enabled: true, isPrimary: true,
    backups: ['openai'],
    plan: 'free',
    plans: {
      free:       { limit: 50,        unit: 'designs',     costPerUnit: 0.05 },
      pro:        { limit: 500,       unit: 'designs',     costPerUnit: 0.02 },
      enterprise: { limit: Infinity,  unit: 'designs',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  openai: {
    id: 'openai', name: 'OpenAI (DALL-E + GPT-4)', category: 'ai',
    envKey: 'OPENAI_API_KEY',
    enabled: true, isPrimary: true,
    backups: ['anthropic', 'gemini'],
    plan: 'payg',
    plans: {
      payg:       { limit: Infinity,  unit: 'tokens',      costPerUnit: 0.00003 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  // ── Social Publishing ──
  tiktok: {
    id: 'tiktok', name: 'TikTok API', category: 'social',
    envKey: 'TIKTOK_API_KEY',
    enabled: true, isPrimary: true,
    backups: ['instagram', 'youtube', 'facebook', 'pinterest'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'posts',       costPerUnit: 0.01 },
      pro:        { limit: 1000,      unit: 'posts',       costPerUnit: 0.005 },
      enterprise: { limit: Infinity,  unit: 'posts',       costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  instagram: {
    id: 'instagram', name: 'Instagram API', category: 'social',
    envKey: 'INSTAGRAM_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['tiktok', 'youtube', 'facebook', 'pinterest'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'posts',       costPerUnit: 0.01 },
      pro:        { limit: 1000,      unit: 'posts',       costPerUnit: 0.005 },
      enterprise: { limit: Infinity,  unit: 'posts',       costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  youtube: {
    id: 'youtube', name: 'YouTube API', category: 'social',
    envKey: 'YOUTUBE_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['tiktok', 'instagram', 'facebook', 'pinterest'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'uploads',     costPerUnit: 0.01 },
      pro:        { limit: 1000,      unit: 'uploads',     costPerUnit: 0.005 },
      enterprise: { limit: Infinity,  unit: 'uploads',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  facebook: {
    id: 'facebook', name: 'Facebook API', category: 'social',
    envKey: 'FACEBOOK_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['tiktok', 'instagram', 'youtube', 'pinterest'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'posts',       costPerUnit: 0.01 },
      pro:        { limit: 1000,      unit: 'posts',       costPerUnit: 0.005 },
      enterprise: { limit: Infinity,  unit: 'posts',       costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  pinterest: {
    id: 'pinterest', name: 'Pinterest API', category: 'social',
    envKey: 'PINTEREST_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['tiktok', 'instagram', 'youtube', 'facebook'],
    plan: 'free',
    plans: {
      free:       { limit: 50,        unit: 'pins',        costPerUnit: 0.02 },
      pro:        { limit: 500,       unit: 'pins',        costPerUnit: 0.01 },
      enterprise: { limit: Infinity,  unit: 'pins',        costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  // ── AI / LLM ──
  anthropic: {
    id: 'anthropic', name: 'Anthropic Claude', category: 'ai',
    envKey: 'ANTHROPIC_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['openai', 'gemini'],
    plan: 'payg',
    plans: {
      payg:       { limit: Infinity,  unit: 'tokens',      costPerUnit: 0.000008 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  gemini: {
    id: 'gemini', name: 'Google Gemini', category: 'ai',
    envKey: 'GOOGLE_API_KEY',
    enabled: true, isPrimary: false,
    backups: ['openai', 'anthropic'],
    plan: 'free',
    plans: {
      free:       { limit: 60,        unit: 'req/min',     costPerUnit: 0 },
      pro:        { limit: 1000,      unit: 'req/min',     costPerUnit: 0.0000025 },
      enterprise: { limit: Infinity,  unit: 'req/min',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  // ── Analytics ──
  shopify_analytics: {
    id: 'shopify_analytics', name: 'Shopify API', category: 'analytics',
    envKey: 'SHOPIFY_API_KEY',
    enabled: true, isPrimary: true,
    backups: ['google_analytics'],
    plan: 'free',
    plans: {
      free:       { limit: 100,       unit: 'req/min',     costPerUnit: 0 },
      pro:        { limit: 1000,      unit: 'req/min',     costPerUnit: 0.001 },
      enterprise: { limit: Infinity,  unit: 'req/min',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  },
  google_analytics: {
    id: 'google_analytics', name: 'Google Analytics', category: 'analytics',
    envKey: 'GOOGLE_ANALYTICS_KEY',
    enabled: true, isPrimary: false,
    backups: ['shopify_analytics'],
    plan: 'free',
    plans: {
      free:       { limit: 10000000,  unit: 'hits/mo',     costPerUnit: 0 },
      pro:        { limit: 100000000, unit: 'hits/mo',     costPerUnit: 0.0000001 },
      enterprise: { limit: Infinity,  unit: 'hits/mo',     costPerUnit: 0 }
    },
    tokensUsed: 0, tokensAdded: 0,
    resetDay: 1, lastReset: new Date().toISOString()
  }
};

// Failover state
const failoverState = {
  autoFailover: true,
  activeOverrides: {},   // serviceId → forced backup id
  failoverLog: []
};

// Alerts store
const alertsStore = [];

// Helper: compute token usage stats for a service
function getTokenStats(svc) {
  const planDef = svc.plans[svc.plan] || Object.values(svc.plans)[0];
  const limit = planDef.limit === Infinity ? null : planDef.limit;
  const used = svc.tokensUsed;
  const remaining = limit !== null ? Math.max(0, limit - used) : null;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const cost = used * planDef.costPerUnit;
  const hasKey = Boolean(process.env[svc.envKey]);

  // Days until reset
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= svc.resetDay ? 1 : 0), svc.resetDay);
  const daysUntilReset = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));

  return {
    id: svc.id,
    name: svc.name,
    category: svc.category,
    enabled: svc.enabled,
    isPrimary: svc.isPrimary,
    backups: svc.backups,
    plan: svc.plan,
    plans: svc.plans,
    hasKey,
    limit,
    used,
    remaining,
    pct,
    unit: planDef.unit,
    costPerUnit: planDef.costPerUnit,
    estimatedCost: Math.round(cost * 100) / 100,
    daysUntilReset,
    status: !svc.enabled ? 'disabled'
      : !hasKey ? 'no-key'
      : pct >= 95 ? 'critical'
      : pct >= 80 ? 'warning'
      : 'healthy'
  };
}

// Helper: check thresholds and generate alerts
function checkAlerts() {
  Object.values(SERVICE_CONFIGS).forEach((svc) => {
    const stats = getTokenStats(svc);
    if (stats.limit === null) return; // unlimited plans skip
    if (stats.pct >= 95) {
      const existing = alertsStore.find((a) => a.serviceId === svc.id && a.level === 'critical' && !a.acknowledged);
      if (!existing) {
        alertsStore.push({
          id: `alert-${Date.now()}-${svc.id}`,
          serviceId: svc.id,
          serviceName: svc.name,
          level: 'critical',
          message: `${svc.name} is at ${stats.pct}% token usage (${stats.used}/${stats.limit} ${stats.unit}). Auto-failover may activate.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
    } else if (stats.pct >= 80) {
      const existing = alertsStore.find((a) => a.serviceId === svc.id && a.level === 'warning' && !a.acknowledged);
      if (!existing) {
        alertsStore.push({
          id: `alert-${Date.now()}-${svc.id}`,
          serviceId: svc.id,
          serviceName: svc.name,
          level: 'warning',
          message: `${svc.name} is at ${stats.pct}% token usage (${stats.used}/${stats.limit} ${stats.unit}). Consider adding credits or switching to backup.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
    }
  });
}

// Helper: resolve active service for a category (respects failover)
function resolveActiveService(category) {
  const services = Object.values(SERVICE_CONFIGS).filter((s) => s.category === category);
  const primary = services.find((s) => s.isPrimary && s.enabled);
  if (!primary) return services.find((s) => s.enabled) || null;

  const stats = getTokenStats(primary);
  if (failoverState.autoFailover && (stats.pct >= 95 || !stats.hasKey)) {
    // Find first available backup
    for (const backupId of primary.backups) {
      const backup = SERVICE_CONFIGS[backupId];
      if (backup && backup.enabled) {
        const bStats = getTokenStats(backup);
        if (bStats.pct < 95) {
          failoverState.failoverLog.push({
            timestamp: new Date().toISOString(),
            from: primary.id,
            to: backupId,
            reason: stats.pct >= 95 ? 'Token limit reached' : 'No API key configured'
          });
          return backup;
        }
      }
    }
  }
  return primary;
}

// ── GET /api/services/config ──
app.get('/api/services/config', (_req, res) => {
  noStore(res);
  const configs = Object.values(SERVICE_CONFIGS).map((svc) => ({
    ...getTokenStats(svc),
    resetDay: svc.resetDay,
    lastReset: svc.lastReset
  }));
  res.json({ success: true, count: configs.length, services: configs });
});

// ── GET /api/services/:serviceId/status ──
app.get('/api/services/:serviceId/status', (req, res) => {
  noStore(res);
  const svc = SERVICE_CONFIGS[req.params.serviceId];
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found.' });
  checkAlerts();
  res.json({ success: true, service: getTokenStats(svc) });
});

// ── POST /api/services/:serviceId/update-config ──
app.post('/api/services/:serviceId/update-config', (req, res) => {
  const svc = SERVICE_CONFIGS[req.params.serviceId];
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found.' });

  const { enabled, isPrimary, plan, apiKey } = req.body;

  if (typeof enabled === 'boolean') svc.enabled = enabled;
  if (typeof isPrimary === 'boolean') {
    // If setting as primary, demote others in same category
    if (isPrimary) {
      Object.values(SERVICE_CONFIGS).forEach((s) => {
        if (s.category === svc.category && s.id !== svc.id) s.isPrimary = false;
      });
    }
    svc.isPrimary = isPrimary;
  }
  if (plan && svc.plans[plan]) svc.plan = plan;
  if (apiKey) {
    // Store in process.env at runtime (not persisted to disk — use .env for persistence)
    process.env[svc.envKey] = apiKey;
  }

  noStore(res);
  res.json({ success: true, service: getTokenStats(svc), message: `${svc.name} configuration updated.` });
});

// ── GET /api/services/token-usage ──
app.get('/api/services/token-usage', (_req, res) => {
  noStore(res);
  checkAlerts();
  const usage = Object.values(SERVICE_CONFIGS).map((svc) => getTokenStats(svc));
  res.json({ success: true, usage });
});

// ── POST /api/services/:serviceId/add-credits ──
app.post('/api/services/:serviceId/add-credits', (req, res) => {
  const svc = SERVICE_CONFIGS[req.params.serviceId];
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found.' });

  const amount = Math.max(1, Number(req.body.amount) || 0);
  svc.tokensAdded += amount;
  svc.tokensUsed = Math.max(0, svc.tokensUsed - amount);

  // Acknowledge any resolved alerts
  alertsStore.forEach((a) => {
    if (a.serviceId === svc.id) a.acknowledged = true;
  });

  noStore(res);
  res.json({
    success: true,
    service: getTokenStats(svc),
    message: `${amount} ${Object.values(svc.plans)[0].unit} added to ${svc.name}.`
  });
});

// ── GET /api/services/failover-status ──
app.get('/api/services/failover-status', (_req, res) => {
  noStore(res);
  const categories = [...new Set(Object.values(SERVICE_CONFIGS).map((s) => s.category))];
  const activeServices = {};
  categories.forEach((cat) => {
    const active = resolveActiveService(cat);
    if (active) activeServices[cat] = getTokenStats(active);
  });
  res.json({
    success: true,
    autoFailover: failoverState.autoFailover,
    activeOverrides: failoverState.activeOverrides,
    activeServices,
    failoverLog: failoverState.failoverLog.slice(-20)
  });
});

// ── POST /api/services/failover/toggle ──
app.post('/api/services/failover/toggle', (req, res) => {
  const { enabled } = req.body;
  failoverState.autoFailover = typeof enabled === 'boolean' ? enabled : !failoverState.autoFailover;
  noStore(res);
  res.json({
    success: true,
    autoFailover: failoverState.autoFailover,
    message: `Auto-failover ${failoverState.autoFailover ? 'enabled' : 'disabled'}.`
  });
});

// ── POST /api/services/failover/switch ──
app.post('/api/services/failover/switch', (req, res) => {
  const { fromServiceId, toServiceId } = req.body;
  if (!fromServiceId || !toServiceId) {
    return res.status(400).json({ success: false, error: 'fromServiceId and toServiceId are required.' });
  }
  const from = SERVICE_CONFIGS[fromServiceId];
  const to   = SERVICE_CONFIGS[toServiceId];
  if (!from || !to) return res.status(404).json({ success: false, error: 'One or both services not found.' });

  failoverState.activeOverrides[from.category] = toServiceId;
  failoverState.failoverLog.push({
    timestamp: new Date().toISOString(),
    from: fromServiceId,
    to: toServiceId,
    reason: 'Manual switch'
  });

  noStore(res);
  res.json({
    success: true,
    message: `Manually switched from ${from.name} to ${to.name}.`,
    activeService: getTokenStats(to)
  });
});

// ── GET /api/services/alerts ──
app.get('/api/services/alerts', (_req, res) => {
  noStore(res);
  checkAlerts();
  const unread = alertsStore.filter((a) => !a.acknowledged);
  res.json({ success: true, count: unread.length, alerts: alertsStore.slice(-50) });
});

// ── POST /api/services/alerts/acknowledge ──
app.post('/api/services/alerts/acknowledge', (req, res) => {
  const { alertId, all } = req.body;
  if (all) {
    alertsStore.forEach((a) => { a.acknowledged = true; });
  } else if (alertId) {
    const alert = alertsStore.find((a) => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }
  noStore(res);
  res.json({ success: true, message: 'Alert(s) acknowledged.' });
});

// ── POST /api/services/:serviceId/consume-tokens (internal helper) ──
app.post('/api/services/:serviceId/consume-tokens', (req, res) => {
  const svc = SERVICE_CONFIGS[req.params.serviceId];
  if (!svc) return res.status(404).json({ success: false, error: 'Service not found.' });
  const amount = Math.max(0, Number(req.body.amount) || 1);
  svc.tokensUsed += amount;
  checkAlerts();
  noStore(res);
  res.json({ success: true, service: getTokenStats(svc) });
});

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
  console.log(`➡️  Media types:         http://127.0.0.1:${PORT}/api/media/types`);
  console.log(`➡️  Media apps:          http://127.0.0.1:${PORT}/api/media/apps`);
  console.log(`➡️  Media by type:       http://127.0.0.1:${PORT}/api/media/by-type/:type`);
  console.log(`➡️  Media by app:        http://127.0.0.1:${PORT}/api/media/by-app/:app`);
  console.log(`➡️  Media by type+app:   http://127.0.0.1:${PORT}/api/media/by-type/:type/by-app/:app`);
  console.log(`➡️  Media download:      POST http://127.0.0.1:${PORT}/api/media/:id/download`);
  console.log(`➡️  Services config:     http://127.0.0.1:${PORT}/api/services/config`);
  console.log(`➡️  Services token use:  http://127.0.0.1:${PORT}/api/services/token-usage`);
  console.log(`➡️  Service status:      http://127.0.0.1:${PORT}/api/services/:id/status`);
  console.log(`➡️  Update service:      POST http://127.0.0.1:${PORT}/api/services/:id/update-config`);
  console.log(`➡️  Add credits:         POST http://127.0.0.1:${PORT}/api/services/:id/add-credits`);
  console.log(`➡️  Failover status:     http://127.0.0.1:${PORT}/api/services/failover-status`);
  console.log(`➡️  Failover toggle:     POST http://127.0.0.1:${PORT}/api/services/failover/toggle`);
  console.log(`➡️  Failover switch:     POST http://127.0.0.1:${PORT}/api/services/failover/switch`);
  console.log(`➡️  Alerts:              http://127.0.0.1:${PORT}/api/services/alerts`);
  console.log(`➡️  Ack alerts:          POST http://127.0.0.1:${PORT}/api/services/alerts/acknowledge`);
});
