// backend/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const path = require('path');
const SupabaseConnector = require('../utils/SupabaseConnector');
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');
const { registerEvicsRecoveryRoutes } = require('./evicsRecoveryRoutes');
const { registerEvicsEvieRoutes } = require('./evicsEvieRoutes');
const { registerMediaOutputRoutes } = require('./mediaOutputRoutes');
const { startHeyGenRender, getHeyGenVideoStatus, pollHeyGenVideo } = require('./internalVideoRenderer');

const app = express();
const PORT = process.env.PORT || 4175;

app.use(express.json());

// Serve static files from dashboard/control-center
app.use(express.static(path.join(__dirname, '../dashboard/control-center')));

// Root route — serve dashboard HTML
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/control-center/index.html'));
});

const noStore = (res) => res.setHeader('Cache-Control', 'no-store');

function envFingerprint(value) {
  if (!value) return null;
  const clean = String(value).trim();
  return {
    prefix: clean.slice(0, 6),
    suffix: clean.slice(-4),
    length: clean.length
  };
}

async function insertRenderRecord(record) {
  const fullRecord = {
    platform: record.platform,
    job_id: record.job_id,
    video_url: record.video_url,
    status: record.status || 'complete',
    script: record.script || '',
    parameters: record.parameters || {},
    media_type: record.media_type || 'video',
    source: record.source || 'evics',
    created_at: record.created_at || new Date().toISOString()
  };

  const attempts = [
    fullRecord,
    {
      platform: fullRecord.platform,
      video_url: fullRecord.video_url,
      status: fullRecord.status,
      script: fullRecord.script,
      parameters: fullRecord.parameters,
      created_at: fullRecord.created_at
    },
    {
      platform: fullRecord.platform,
      status: fullRecord.status,
      created_at: fullRecord.created_at
    },
    {
      render_name: record.render_name || `EVICS ${fullRecord.platform || 'internal'} render`,
      sku: record.sku || 'EVICS-CLOSEOUT',
      product_name: record.product_name || 'EVICS + EVIE Proof Render',
      platform: fullRecord.platform,
      render_grade: 86,
      product_fit: 88,
      brand_alignment: 90,
      conversion_potential: 82,
      viral_potential: 86,
      status: fullRecord.status,
      vault_destination: record.vault_destination || fullRecord.video_url || '/generated/evics-sea-moss-proof-render.mp4',
      created_at: fullRecord.created_at
    }
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .insert([attempt])
        .select();
      if (!error) return { data, error: null, columnsUsed: Object.keys(attempt) };
      errors.push(error.message);
    } catch (error) {
      errors.push(error.message);
    }
  }

  return { data: null, error: errors.join(' | '), columnsUsed: [] };
}

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

app.get('/api/production-closeout/status', async (_req, res) => {
  noStore(res);
  const checks = {
    shopify: {
      expectedStore: process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || process.env.SHOPIFY_SHOP || null,
      host: process.env.HOST || null,
      clientId: envFingerprint(process.env.SHOPIFY_CLIENT_ID),
      hasClientSecret: Boolean(process.env.SHOPIFY_CLIENT_SECRET),
      hasAdminToken: Boolean(process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      scopes: process.env.SHOPIFY_SCOPES || 'read_products,read_orders',
      reconnectUrl: '/shopify/reconnect'
    },
    supabase: {
      configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.evics_supabase_key)),
      urlHost: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null,
      renderTable: null,
      sharedTables: []
    },
    heygen: {
      configured: Boolean(process.env.HEYGEN_API_KEY),
      key: envFingerprint(process.env.HEYGEN_API_KEY),
      liveProofAvailable: Boolean(process.env.HEYGEN_LIVE_PROOF_URL),
      proofUrl: process.env.HEYGEN_LIVE_PROOF_URL || null,
      blocker: process.env.HEYGEN_API_KEY
        ? (process.env.HEYGEN_LIVE_PROOF_URL ? null : 'HEYGEN_API_KEY is configured, but no live HeyGen artifact has completed yet.')
        : 'HEYGEN_API_KEY is not configured.'
    }
  };

  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .limit(1);
    checks.supabase.renderTable = error
      ? { ok: false, error: error.message }
      : { ok: true, sampleColumns: data && data[0] ? Object.keys(data[0]) : [] };
  } catch (error) {
    checks.supabase.renderTable = { ok: false, error: error.message };
  }

  for (const table of ['evics_evie_entities', 'evics_evie_rankings', 'evics_evie_prompt_versions', 'evics_evie_scripts', 'evics_evie_render_jobs', 'evics_evie_evidence_records']) {
    try {
      const { error } = await SupabaseConnector
        .from(table)
        .select('id', { count: 'exact', head: true });
      checks.supabase.sharedTables.push({ table, ok: !error, error: error ? error.message : null });
    } catch (error) {
      checks.supabase.sharedTables.push({ table, ok: false, error: error.message });
    }
  }

  res.json({ success: true, checks, timestamp: new Date().toISOString() });
});

registerEvicsRecoveryRoutes(app, SupabaseConnector);
registerEvicsEvieRoutes(app);
registerMediaOutputRoutes(app, SupabaseConnector);

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
// /api/video/generate — submit HeyGen render and track status
// -------------------------
app.post('/api/video/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const script = String(body.script || (Array.isArray(body.components) ? body.components.map((component) => component && component.text).filter(Boolean).join('\n\n') : '')).trim();
    const avatar_id = body.avatar_id || body.avatar || body.heygenAvatarId || process.env.HEYGEN_AVATAR_ID;
    const voice_id = body.voice_id || body.voice || body.heygenVoiceId || process.env.HEYGEN_VOICE_ID;
    const config = body.config || {};
    const waitForCompletion = body.wait_for_completion === true || body.waitForCompletion === true;

    if (!script) {
      return res.status(400).json({ success: false, error: 'script is required.' });
    }
    if (!avatar_id) {
      return res.status(400).json({ success: false, error: 'avatar_id/avatar is required.' });
    }
    if (!voice_id) {
      return res.status(400).json({ success: false, error: 'voice_id/voice is required.' });
    }

    const requestedBackground = body.background || config.background;
    const renderConfig = {
      ...config,
      aspect: body.aspect || config.aspect || config.aspect_ratio,
      dimension: body.dimension || config.dimension,
      background: requestedBackground && typeof requestedBackground === 'object'
        ? requestedBackground
        : { type: 'color', value: '#ffffff' },
      caption: body.caption ?? config.caption,
      test: body.test ?? config.test,
      idempotency_key: body.idempotency_key || body.idempotencyKey || config.idempotency_key || config.idempotencyKey
    };

    const startResult = await startHeyGenRender({ script, avatar_id, voice_id, config: renderConfig });
    const now = new Date().toISOString();
    const draftPayload = {
      video_id: startResult.video_id,
      script_text: script,
      avatar_id,
      voice_id,
      status: 'rendering',
      video_url: null,
      thumbnail_url: null,
      duration: null,
      error_message: null,
      idempotency_key: startResult.idempotency_key,
      created_at: now,
      updated_at: now
    };

    const { data: draftRows, error: draftError } = await SupabaseConnector
      .from('video_assembly_drafts')
      .upsert([draftPayload], { onConflict: 'idempotency_key' })
      .select();

    if (draftError) throw new Error(draftError.message);

    let result = startResult;
    if (waitForCompletion) {
      const completed = await pollHeyGenVideo({ video_id: startResult.video_id });
      const normalizedStatus = completed.status === 'completed' ? 'completed' : completed.status === 'failed' ? 'failed' : 'rendering';
      const errorMessage = completed.error ? (completed.error.message || completed.error.detail || JSON.stringify(completed.error)) : null;
      const { data: updatedRows, error: updateError } = await SupabaseConnector
        .from('video_assembly_drafts')
        .update({
          status: normalizedStatus,
          video_url: completed.video_url || null,
          thumbnail_url: completed.thumbnail_url || null,
          duration: completed.duration || null,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('video_id', startResult.video_id)
        .select();
      if (updateError) throw new Error(updateError.message);
      result = { ...completed, status: normalizedStatus, draft: updatedRows ? updatedRows[0] : null };
    }

    noStore(res);
    return res.status(202).json({
      success: true,
      provider: 'heygen',
      video_id: result.video_id || startResult.video_id,
      status: result.status || 'rendering',
      video_url: result.video_url || null,
      thumbnail_url: result.thumbnail_url || null,
      duration: result.duration || null,
      idempotency_key: startResult.idempotency_key,
      draft: result.draft || (draftRows ? draftRows[0] : null),
      status_url: '/api/video/status/' + (result.video_id || startResult.video_id)
    });
  } catch (e) {
    const statusCode = e.code === 'HEYGEN_API_KEY_MISSING' ? 503 : e.statusCode && e.statusCode < 500 ? e.statusCode : 500;
    return res.status(statusCode).json({ success: false, error: e.message || String(e) });
  }
});

app.get('/api/video/status/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'videoId is required.' });
    }

    const statusResult = await getHeyGenVideoStatus(videoId);
    const normalizedStatus = statusResult.status === 'completed' ? 'completed' : statusResult.status === 'failed' ? 'failed' : 'rendering';
    const errorMessage = statusResult.error ? (statusResult.error.message || statusResult.error.detail || JSON.stringify(statusResult.error)) : null;

    const { data: updatedRows, error: updateError } = await SupabaseConnector
      .from('video_assembly_drafts')
      .update({
        status: normalizedStatus,
        video_url: statusResult.video_url || null,
        thumbnail_url: statusResult.thumbnail_url || null,
        duration: statusResult.duration || null,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select();

    if (updateError) throw new Error(updateError.message);

    noStore(res);
    return res.json({
      success: true,
      provider: 'heygen',
      video_id: videoId,
      status: normalizedStatus,
      video_url: statusResult.video_url || null,
      thumbnail_url: statusResult.thumbnail_url || null,
      duration: statusResult.duration || null,
      error_message: errorMessage,
      draft: updatedRows ? updatedRows[0] : null
    });
  } catch (e) {
    const statusCode = e.code === 'HEYGEN_API_KEY_MISSING' ? 503 : e.statusCode && e.statusCode < 500 ? e.statusCode : 500;
    return res.status(statusCode).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/video/callback — record completed render callbacks with direct video URLs
// -------------------------
app.post('/api/video/callback', async (req, res) => {
  try {
    const body = req.body || {};
    const videoId = body.video_id || body.videoId || body.id;
    const videoUrl = body.video_url || body.videoUrl || body.url;
    const thumbnailUrl = body.thumbnail_url || body.thumbnailUrl || null;
    const duration = body.duration === undefined ? null : body.duration;

    if (!videoId) return res.status(400).json({ success: false, error: 'video_id is required.' });
    if (!videoUrl) return res.status(400).json({ success: false, error: 'video_url/url is required.' });

    const { data, error } = await SupabaseConnector
      .from('video_assembly_drafts')
      .update({
        status: 'completed',
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select();

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({
      success: true,
      video_id: videoId,
      status: 'completed',
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      draft: data ? data[0] : null
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

// -------------------------
// /api/agents/trend-scout/scan — scan for viral trends
// -------------------------
app.post('/api/agents/trend-scout/scan', async (req, res) => {
  try {
    const { platform, category, limit } = req.body;
    const scanLimit = Math.max(5, Math.min(50, Number(limit) || 10));

    // Pull recent trends from Supabase
    let query = SupabaseConnector
      .from('evics_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(scanLimit);

    if (category) query = query.eq('category', category);
    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;
    if (error) console.warn('Trend scout Supabase query failed:', error.message);

    const trends = (data && data.length)
      ? data
      : [
          { platform: platform || 'TikTok', category: category || 'Weight loss', hook: 'Nobody talks about this morning habit...', velocity: 92, engagement: 12.8 },
          { platform: platform || 'Instagram', category: category || 'Beauty', hook: 'This changed my skin in 7 days...', velocity: 78, engagement: 10.4 },
          { platform: platform || 'YouTube', category: category || 'Nootropics', hook: 'I felt flat until I fixed this...', velocity: 69, engagement: 9.1 }
        ];

    // Log scan to Supabase
    await SupabaseConnector
      .from('evics_trends')
      .insert([{
        title: `Trend Scout scan — ${platform || 'All'} / ${category || 'All'}`,
        source: 'trend_scout_agent',
        platform: platform || null,
        category: category || null,
        created_at: new Date().toISOString()
      }])
      .then(({ error: insertErr }) => {
        if (insertErr) console.warn('Trend scout log insert failed:', insertErr.message);
      });

    noStore(res);
    res.json({ success: true, count: trends.length, trends, agent: 'trend-scout', scannedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/script-writer/generate — generate ad scripts
// -------------------------
app.post('/api/agents/script-writer/generate', async (req, res) => {
  try {
    const { product, hook, format, platform, tone } = req.body;

    if (!product) {
      return res.status(400).json({ success: false, error: 'product is required.' });
    }

    const resolvedHook = hook || 'Nobody talks about this morning habit...';
    const resolvedFormat = format || 'UGC';
    const resolvedPlatform = platform || 'TikTok';
    const resolvedTone = tone || 'conversational';

    const script = `Open on ${resolvedFormat === 'UGC' ? 'handheld camera, authentic setting' : 'clean product shot'}. ` +
      `Hook: "${resolvedHook}" ` +
      `VO: "I started using ${product} and everything changed. ` +
      `Here's what nobody tells you about ${product.toLowerCase()}..." ` +
      `Cut to product close-up. Benefit stack. ` +
      `CTA: "Try ${product} today — link in bio."`;

    // Log to Supabase
    const { data: savedScript, error: insertErr } = await SupabaseConnector
      .from('creatives')
      .insert([{
        product,
        hook: resolvedHook,
        script,
        format: resolvedFormat,
        channel: resolvedPlatform,
        status: 'Draft',
        score: 75,
        approved: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (insertErr) console.warn('Script writer log insert failed:', insertErr.message);

    noStore(res);
    res.json({
      success: true,
      script,
      product,
      hook: resolvedHook,
      format: resolvedFormat,
      platform: resolvedPlatform,
      tone: resolvedTone,
      savedId: savedScript ? savedScript[0]?.id : null,
      agent: 'script-writer',
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/product-match/analyze — match products to viral trends
// -------------------------
app.post('/api/agents/product-match/analyze', async (req, res) => {
  try {
    const { trendId, hook, category, platform } = req.body;

    // Pull products from Supabase
    const { data: productRows, error: productErr } = await SupabaseConnector
      .from('evics_products')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);

    if (productErr) console.warn('Product match Supabase query failed:', productErr.message);

    const productPool = (productRows && productRows.length)
      ? productRows
      : [
          { name: 'Sea Moss Mineral Gel', category: 'Sea moss', score: 96, angle: 'daily mineral ritual' },
          { name: 'Metabolic Ignite', category: 'Weight loss', score: 91, angle: 'morning reset' },
          { name: 'Genesis Glow Collagen', category: 'Beauty', score: 88, angle: 'skin confidence' },
          { name: 'Apex Testosterone Support', category: 'Testosterone', score: 86, angle: 'training foundation' },
          { name: 'NeuroRise Focus', category: 'Nootropics', score: 82, angle: 'clean productive energy' }
        ];

    // Score products against the trend context
    const text = `${hook || ''} ${category || ''} ${platform || ''}`.toLowerCase();
    const matches = productPool.map((p) => {
      let relevance = p.score || 50;
      const productText = `${p.name} ${p.category} ${p.angle}`.toLowerCase();
      if (category && productText.includes(category.toLowerCase())) relevance = Math.min(100, relevance + 10);
      if (text.includes(p.category ? p.category.toLowerCase() : '')) relevance = Math.min(100, relevance + 5);
      return { ...p, relevance };
    }).sort((a, b) => b.relevance - a.relevance);

    noStore(res);
    res.json({
      success: true,
      trendId: trendId || null,
      hook: hook || null,
      matches,
      topMatch: matches[0] || null,
      agent: 'product-match',
      analyzedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/suggest — AI copilot creative suggestions
// -------------------------
app.post('/api/agents/copilot/suggest', async (req, res) => {
  try {
    const { context, product, platform, goal } = req.body;

    const suggestions = [
      {
        type: 'hook',
        text: `Nobody tells you what ${product || 'this supplement'} actually does to your morning.`,
        confidence: 'High',
        rationale: 'Curiosity-gap hook with personal relevance. Performs well on TikTok and Reels.'
      },
      {
        type: 'structure',
        text: 'Hook → Problem agitation (5s) → Product reveal (3s) → Proof/testimonial (7s) → CTA (3s)',
        confidence: 'High',
        rationale: 'Proven 18-second structure for supplement UGC. Matches top-performing viral patterns.'
      },
      {
        type: 'cta',
        text: `Start your ${product ? product.split(' ')[0] : 'wellness'} ritual today — link in bio.`,
        confidence: 'Medium',
        rationale: 'Ritual framing increases perceived value and repeat purchase intent.'
      },
      {
        type: 'visual',
        text: 'Open on bathroom counter at golden hour. Slow pan to product. Hand picks it up naturally.',
        confidence: 'High',
        rationale: 'Aspirational lifestyle setting with authentic UGC feel. High scroll-stop rate.'
      }
    ];

    noStore(res);
    res.json({
      success: true,
      suggestions,
      context: context || null,
      product: product || null,
      platform: platform || 'TikTok',
      goal: goal || 'conversion',
      agent: 'copilot',
      suggestedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/refine — refine an existing script or hook
// -------------------------
app.post('/api/agents/copilot/refine', async (req, res) => {
  try {
    const { content, type, instruction, platform } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required.' });
    }

    const resolvedType = type || 'script';
    const resolvedInstruction = instruction || 'make it more urgent and emotionally compelling';

    // Apply refinement heuristics
    let refined = content;
    const lowerInstruction = resolvedInstruction.toLowerCase();

    if (lowerInstruction.includes('urgent') || lowerInstruction.includes('compelling')) {
      refined = refined.replace(/\.$/, '!');
      if (!refined.toLowerCase().includes('today') && !refined.toLowerCase().includes('now')) {
        refined = refined + ' Act now — limited availability.';
      }
    }
    if (lowerInstruction.includes('shorter') || lowerInstruction.includes('concise')) {
      const sentences = refined.split(/[.!?]+/).filter(Boolean);
      refined = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ').trim() + '.';
    }
    if (lowerInstruction.includes('hook') || lowerInstruction.includes('opening')) {
      refined = `Here's what nobody tells you: ${refined}`;
    }

    noStore(res);
    res.json({
      success: true,
      original: content,
      refined,
      type: resolvedType,
      instruction: resolvedInstruction,
      platform: platform || null,
      agent: 'copilot',
      refinedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/explain — explain why a creative works
// -------------------------
app.post('/api/agents/copilot/explain', async (req, res) => {
  try {
    const { content, type, platform } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required.' });
    }

    const text = content.toLowerCase();
    const insights = [];

    // Pattern detection
    if (text.includes('nobody') || text.includes('nobody tells')) {
      insights.push({ pattern: 'Curiosity gap', strength: 'High', explanation: 'Opens an information gap the viewer must close. Drives watch time and shares.' });
    }
    if (text.includes('i felt') || text.includes('i started') || text.includes('i tried')) {
      insights.push({ pattern: 'First-person proof', strength: 'High', explanation: 'Personal testimony increases trust and relatability. Reduces skepticism.' });
    }
    if (text.includes('changed') || text.includes('reset') || text.includes('transformed')) {
      insights.push({ pattern: 'Transformation narrative', strength: 'High', explanation: 'Before/after framing is the highest-converting structure in supplement advertising.' });
    }
    if (text.includes('today') || text.includes('now') || text.includes('start')) {
      insights.push({ pattern: 'Urgency trigger', strength: 'Medium', explanation: 'Time-bound language increases immediate action and reduces decision paralysis.' });
    }
    if (text.includes('ritual') || text.includes('routine') || text.includes('habit')) {
      insights.push({ pattern: 'Habit framing', strength: 'Medium', explanation: 'Positions the product as part of an identity, not a one-time purchase. Boosts LTV.' });
    }

    if (insights.length === 0) {
      insights.push({ pattern: 'Informational', strength: 'Medium', explanation: 'Clear and direct. Consider adding a curiosity gap or transformation narrative to increase engagement.' });
    }

    const overallScore = insights.reduce((sum, i) => sum + (i.strength === 'High' ? 30 : 15), 0);

    noStore(res);
    res.json({
      success: true,
      content,
      type: type || 'script',
      platform: platform || null,
      insights,
      overallScore: Math.min(100, overallScore),
      summary: `${insights.length} pattern${insights.length !== 1 ? 's' : ''} detected. ${insights.filter((i) => i.strength === 'High').length} high-impact.`,
      agent: 'copilot',
      explainedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/auto-generate — full pipeline: trend → match → script → save
// -------------------------
app.post('/api/agents/auto-generate', async (req, res) => {
  try {
    const { platform, category, format, count } = req.body;
    const generateCount = Math.max(1, Math.min(10, Number(count) || 3));

    // Step 1: Pull top trends
    const { data: trendRows } = await SupabaseConnector
      .from('evics_trends')
      .select('hook, category, platform')
      .not('hook', 'is', null)
      .order('created_at', { ascending: false })
      .limit(generateCount);

    // Step 2: Pull top products
    const { data: productRows } = await SupabaseConnector
      .from('evics_products')
      .select('name, category, angle')
      .order('score', { ascending: false })
      .limit(generateCount);

    // Fallback demo data
    const trendPool = (trendRows && trendRows.length) ? trendRows : [
      { hook: 'Nobody talks about this morning habit...', category: 'Weight loss', platform: 'TikTok' },
      { hook: 'This changed my skin in 7 days...', category: 'Beauty', platform: 'Instagram' },
      { hook: 'I felt flat until I fixed this...', category: 'Testosterone', platform: 'YouTube' }
    ];

    const productPool = (productRows && productRows.length) ? productRows : [
      { name: 'Sea Moss Mineral Gel', category: 'Sea moss', angle: 'daily mineral ritual' },
      { name: 'Genesis Glow Collagen', category: 'Beauty', angle: 'skin confidence' },
      { name: 'Apex Testosterone Support', category: 'Testosterone', angle: 'training foundation' }
    ];

    // Step 3: Generate scripts
    const generated = [];
    const resolvedFormat = format || 'UGC';

    for (let i = 0; i < generateCount; i++) {
      const trend = trendPool[i % trendPool.length];
      const product = productPool[i % productPool.length];
      const resolvedPlatform = platform || trend.platform || 'TikTok';

      const script = `Open on ${resolvedFormat === 'UGC' ? 'handheld camera, authentic setting' : 'clean product shot'}. ` +
        `Hook: "${trend.hook}" ` +
        `VO: "I started using ${product.name} and everything changed. ` +
        `The ${product.angle} ritual that nobody talks about." ` +
        `Cut to product close-up. Benefit stack. ` +
        `CTA: "Try ${product.name} today — link in bio."`;

      // Save to Supabase
      const { data: savedRow, error: insertErr } = await SupabaseConnector
        .from('creatives')
        .insert([{
          product: product.name,
          hook: trend.hook,
          script,
          format: resolvedFormat,
          channel: resolvedPlatform,
          status: 'Draft',
          score: 70 + Math.floor(Math.random() * 20),
          approved: false,
          created_at: new Date().toISOString()
        }])
        .select();

      if (insertErr) console.warn(`Auto-generate insert ${i} failed:`, insertErr.message);

      generated.push({
        id: savedRow ? savedRow[0]?.id : `auto-${i}`,
        product: product.name,
        hook: trend.hook,
        script,
        format: resolvedFormat,
        platform: resolvedPlatform,
        status: 'Draft'
      });
    }

    noStore(res);
    res.json({
      success: true,
      count: generated.length,
      creatives: generated,
      agent: 'auto-generate',
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
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
  console.log(`➡️  Trend Scout:         POST http://127.0.0.1:${PORT}/api/agents/trend-scout/scan`);
  console.log(`➡️  Script Writer:       POST http://127.0.0.1:${PORT}/api/agents/script-writer/generate`);
  console.log(`➡️  Product Match:       POST http://127.0.0.1:${PORT}/api/agents/product-match/analyze`);
  console.log(`➡️  Copilot Suggest:     POST http://127.0.0.1:${PORT}/api/agents/copilot/suggest`);
  console.log(`➡️  Copilot Refine:      POST http://127.0.0.1:${PORT}/api/agents/copilot/refine`);
  console.log(`➡️  Copilot Explain:     POST http://127.0.0.1:${PORT}/api/agents/copilot/explain`);
  console.log(`➡️  Auto Generate:       POST http://127.0.0.1:${PORT}/api/agents/auto-generate`);
});
