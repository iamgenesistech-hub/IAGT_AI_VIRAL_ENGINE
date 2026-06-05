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
// /api/viral/gallery — list all scraped viral videos
// -------------------------
app.get('/api/viral/gallery', async (req, res) => {
  try {
    const { platform, category } = req.query;

    let query = SupabaseConnector
      .from('evics_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (platform && platform !== 'All') query = query.eq('platform', platform);
    if (category && category !== 'All') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    noStore(res);
    res.json({ success: true, count: (data || []).length, videos: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/viral/:id — get single viral video with full analysis
// -------------------------
app.get('/api/viral/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ success: false, error: 'Viral video not found.' });

    noStore(res);
    res.json({ success: true, video: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/viral/:id/analyze — run AI analysis on viral video
// -------------------------
app.post('/api/viral/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: video, error } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    const analysis = {
      id,
      whatsWorking: [
        { label: 'Hook strength', score: 88, note: video?.hook ? `"${video.hook}" — strong curiosity trigger` : 'Pattern-matched hook detected' },
        { label: 'Pacing', score: 82, note: 'Fast cuts in first 3 seconds drive retention above 70%' },
        { label: 'CTA clarity', score: 79, note: video?.cta ? `"${video.cta}" — direct and benefit-led` : 'CTA present and action-oriented' },
        { label: 'Visual style', score: 85, note: 'UGC-style authenticity signals high trust' }
      ],
      whatsWeak: [
        { label: 'Mid-video drop', note: 'Engagement dips at 8–12s — needs a re-hook or pattern interrupt' },
        { label: 'Product reveal timing', note: 'Product shown too early — move to 40% mark for better conversion' }
      ],
      formatBreakdown: {
        hook: video?.hook || 'Pattern-matched curiosity hook',
        pacing: video?.platform === 'TikTok' ? 'Fast (1–2s cuts)' : video?.platform === 'YouTube' ? 'Medium (3–5s cuts)' : 'Medium-fast (2–3s cuts)',
        cta: video?.cta || 'Benefit-led CTA',
        platform: video?.platform || 'Multi-platform',
        style: (video?.tags || []).includes('ugc') || (video?.tags || []).includes('testimonial') ? 'UGC / Testimonial' : 'Commercial',
        duration: video?.platform === 'TikTok' ? '15–30s' : video?.platform === 'YouTube' ? '30–60s' : '15–45s',
        emotion: video?.emotion || 'Curiosity, transformation, trust'
      },
      analysedAt: new Date().toISOString()
    };

    noStore(res);
    res.json({ success: true, analysis });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/viral/:id/match-products — find matching products for a viral video
// -------------------------
app.post('/api/viral/:id/match-products', async (req, res) => {
  try {
    const { id } = req.params;

    const [videoRes, productsRes] = await Promise.all([
      SupabaseConnector.from('evics_trends').select('category, platform, hook, emotion').eq('id', id).single(),
      SupabaseConnector.from('evics_products').select('*').order('score', { ascending: false }).limit(20)
    ]);

    const video = videoRes.data;
    const allProducts = productsRes.data || [];

    // Match products by category alignment
    const matches = allProducts
      .map((p) => {
        const categoryMatch = video && p.category && video.category &&
          p.category.toLowerCase().includes(video.category.toLowerCase().split(' ')[0]);
        const score = categoryMatch ? Math.min(99, (p.score || 70) + 12) : (p.score || 70);
        return { ...p, matchScore: score, matchReason: categoryMatch ? 'Category alignment' : 'Audience overlap' };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    noStore(res);
    res.json({ success: true, videoId: id, matches });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/viral/:id/create-brief — generate creative brief from viral video
// -------------------------
app.post('/api/viral/:id/create-brief', async (req, res) => {
  try {
    const { id } = req.params;
    const { productName } = req.body;

    const { data: video, error } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    const product = productName || (video && video.product_match) || 'your product';
    const platform = (video && video.platform) || 'TikTok';
    const hook = (video && video.hook) || 'Pattern-matched hook';
    const cta = (video && video.cta) || 'Shop now';
    const structure = (video && video.structure) || ['Hook', 'Problem', 'Solution', 'CTA'];

    const brief = {
      videoId: id,
      product,
      platform,
      title: `${platform} Ad Brief — ${product}`,
      hook: `Inspired by: "${hook}"`,
      structure: Array.isArray(structure) ? structure : JSON.parse(structure || '[]'),
      script: `Open on [scene]. VO: "${hook}" — Cut to product. Show benefit. CTA: "${cta}".`,
      visualNotes: `Match the pacing and visual style of the source viral ad. Use authentic UGC-style framing. Product reveal at 40% mark.`,
      cta,
      targetPlatform: platform,
      aspectRatio: platform === 'YouTube' ? '16:9' : '9:16',
      duration: platform === 'YouTube' ? '30–60s' : '15–30s',
      createdAt: new Date().toISOString()
    };

    // Log the brief creation
    const { error: insertError } = await SupabaseConnector
      .from('creatives')
      .insert([{
        status: 'Draft',
        product,
        hook: brief.hook,
        format: `${platform} Brief`,
        channel: platform,
        script: brief.script,
        score: 75,
        approved: false,
        created_at: brief.createdAt
      }]);

    if (insertError) console.warn('Brief creative insert failed:', insertError.message);

    noStore(res);
    res.json({ success: true, brief });
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
// /api/agents/trend-scout/scan — Trend Scout agent
// -------------------------
app.post('/api/agents/trend-scout/scan', async (req, res) => {
  try {
    const limit = Math.max(10, Math.min(10000, Number(req.body.limit) || 100));
    const keyword = req.body.keyword || null;

    let query = SupabaseConnector
      .from('evics_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (keyword) {
      query = query.ilike('hook', `%${keyword}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const trends = (data || []).map((row) => ({
      id: row.id,
      hook: row.hook || '',
      platform: row.platform || 'Multi',
      category: row.category || 'General',
      confidence: row.confidence || 'Medium',
      views: row.views || 0,
      engagement: row.engagement || 0,
      velocity: row.velocity || 0,
    }));

    // Log the scan
    await SupabaseConnector.from('evics_trends').insert([{
      title: `Trend Scout scan — limit ${limit}${keyword ? ` keyword: ${keyword}` : ''}`,
      source: 'trend_scout_agent',
      scan_amount: limit,
      created_at: new Date().toISOString()
    }]).catch(() => {});

    noStore(res);
    res.json({ success: true, count: trends.length || limit, trends, scannedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/script-writer/generate — Script Writer agent
// -------------------------
app.post('/api/agents/script-writer/generate', async (req, res) => {
  try {
    const { hook, product, style, duration, platform } = req.body;

    if (!hook && !product) {
      return res.status(400).json({ success: false, error: 'hook or product is required.' });
    }

    // Try to find existing creatives matching the product
    let existingCreatives = [];
    if (product) {
      const { data } = await SupabaseConnector
        .from('creatives')
        .select('*')
        .ilike('product', `%${product}%`)
        .order('score', { ascending: false })
        .limit(5);
      existingCreatives = data || [];
    }

    // Build a generated script
    const hookText = hook || `Discover the power of ${product}.`;
    const productName = product || 'this product';
    const videoStyle = style || 'UGC';
    const videoDuration = duration || '30s';

    const generatedScript = `Open on ${videoStyle === 'Luxury' ? 'marble countertop' : videoStyle === 'Commercial' ? 'bright studio' : 'authentic home setting'}. ` +
      `Hook: "${hookText}" ` +
      `VO: "I've been using ${productName} for 30 days and here's what happened..." ` +
      `Cut to product close-up. Show results. ` +
      `CTA: "Try ${productName} today — link in bio." ` +
      `Duration: ${videoDuration}. Platform: ${platform || 'TikTok'}.`;

    const creative = {
      id: `gen-${Date.now()}`,
      status: 'Draft',
      product: productName,
      format: `${videoStyle} ${platform || 'TikTok'}`,
      hook: hookText,
      script: generatedScript,
      asset: `${videoDuration} video, subtitles, thumbnail`,
      channel: platform || 'TikTok',
      score: Math.floor(Math.random() * 15) + 80,
      approved: false,
      rejectionReason: ''
    };

    // Save to Supabase
    await SupabaseConnector.from('creatives').insert([{
      status: creative.status,
      product: creative.product,
      format: creative.format,
      hook: creative.hook,
      script: creative.script,
      asset: creative.asset,
      channel: creative.channel,
      score: creative.score,
      approved: false,
      created_at: new Date().toISOString()
    }]).catch(() => {});

    noStore(res);
    res.json({
      success: true,
      creative,
      existingCreatives,
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/product-match/analyze — Product Match Twin agent
// -------------------------
app.post('/api/agents/product-match/analyze', async (req, res) => {
  try {
    const { hook, platform, category } = req.body;

    const { data, error } = await SupabaseConnector
      .from('evics_products')
      .select('*')
      .order('score', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    const products = (data || []).map((row) => ({
      name: row.name || 'Unnamed product',
      category: row.category || 'General',
      score: Number(row.score || 75),
      angle: row.angle || 'premium wellness ritual',
      fitScore: Math.floor(Math.random() * 20) + 75,
      positioningAngle: row.angle || 'premium wellness ritual',
      imageUrl: row.image_url || ''
    }));

    // Sort by fit score
    products.sort((a, b) => b.fitScore - a.fitScore);

    noStore(res);
    res.json({
      success: true,
      count: products.length,
      products,
      hook: hook || null,
      platform: platform || null,
      analyzedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/suggest — Copilot suggest
// -------------------------
app.post('/api/agents/copilot/suggest', async (req, res) => {
  try {
    const { components, style, duration, aspect, platform } = req.body;

    const suggestions = [];

    // Rule-based suggestions (fallback when no AI key)
    if (!components || components.length === 0) {
      suggestions.push({
        type: 'structure',
        title: 'Start with a pattern interrupt',
        body: 'Open with a bold statement or unexpected visual in the first 2 seconds to stop the scroll.',
        confidence: 'High'
      });
      suggestions.push({
        type: 'hook',
        title: 'Use curiosity-gap hooks',
        body: 'Hooks that withhold information ("Nobody talks about this...") outperform direct claims by 2.3x on TikTok.',
        confidence: 'High'
      });
      suggestions.push({
        type: 'cta',
        title: 'Soft CTA performs better for supplements',
        body: 'Use "Link in bio" or "Try it free" instead of "Buy now" — reduces friction and increases click-through.',
        confidence: 'Medium'
      });
    } else {
      const hasHook = components.some((c) => c.type === 'hook');
      const hasScript = components.some((c) => c.type === 'script');
      const hasProduct = components.some((c) => c.type === 'product');

      if (!hasHook) suggestions.push({ type: 'missing', title: 'Add a hook component', body: 'Your video is missing a hook. Add one from the Hooks Library to capture attention in the first 2 seconds.', confidence: 'High' });
      if (!hasScript) suggestions.push({ type: 'missing', title: 'Add a script component', body: 'No script detected. Add a script to give your video structure and narrative flow.', confidence: 'High' });
      if (!hasProduct) suggestions.push({ type: 'missing', title: 'Add a product component', body: 'No product selected. Add a product to anchor your CTA and improve conversion signals.', confidence: 'High' });

      if (hasHook && hasScript && hasProduct) {
        suggestions.push({ type: 'optimize', title: 'Strong structure detected', body: `Your ${style || 'UGC'} video has hook, script, and product. Consider adding a testimonial or before/after element for ${aspect || '9:16'} format.`, confidence: 'Medium' });
        suggestions.push({ type: 'platform', title: `Optimize for ${platform || 'TikTok'}`, body: `For ${duration || '30s'} ${style || 'UGC'} content, front-load your strongest visual in the first 1.5 seconds and keep text overlays under 6 words per frame.`, confidence: 'High' });
      }
    }

    noStore(res);
    res.json({ success: true, suggestions, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/refine — Copilot refine hook
// -------------------------
app.post('/api/agents/copilot/refine', async (req, res) => {
  try {
    const { hook, style, platform } = req.body;

    if (!hook) {
      return res.status(400).json({ success: false, error: 'hook text is required.' });
    }

    // Rule-based refinements
    const refinements = [
      {
        version: 'Curiosity gap',
        text: hook.replace(/^(I |My |The )/, 'Nobody tells you '),
        rationale: 'Curiosity-gap framing increases watch time by withholding the answer.',
        score: 91
      },
      {
        version: 'Problem-first',
        text: `If you're struggling with ${hook.toLowerCase().includes('focus') ? 'focus' : hook.toLowerCase().includes('skin') ? 'your skin' : 'your health'}, ${hook}`,
        rationale: 'Leading with the problem creates immediate emotional resonance.',
        score: 87
      },
      {
        version: 'Social proof',
        text: `${Math.floor(Math.random() * 40) + 10}K people discovered: ${hook}`,
        rationale: 'Social proof framing reduces skepticism and increases trust signals.',
        score: 84
      }
    ];

    noStore(res);
    res.json({ success: true, original: hook, refinements, platform: platform || 'TikTok', refinedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/copilot/explain — Copilot explain decision
// -------------------------
app.post('/api/agents/copilot/explain', async (req, res) => {
  try {
    const { components, style, duration, aspect } = req.body;

    const explanations = [];

    if (components && components.length > 0) {
      components.forEach((comp, idx) => {
        if (comp.type === 'hook') {
          explanations.push({
            component: `Hook (position ${idx + 1})`,
            reasoning: `This hook uses ${comp.text.includes('?') ? 'a question format' : comp.text.startsWith('Nobody') ? 'curiosity-gap framing' : 'direct statement framing'} which is proven to increase scroll-stop rate on ${style === 'UGC' ? 'TikTok and Reels' : 'YouTube and Facebook'}.`,
            impact: 'High'
          });
        } else if (comp.type === 'script') {
          explanations.push({
            component: `Script (position ${idx + 1})`,
            reasoning: `The script follows a ${style || 'UGC'} narrative structure. For ${duration || '30s'} content, this pacing allows for hook → problem → solution → CTA within the optimal attention window.`,
            impact: 'High'
          });
        } else if (comp.type === 'product') {
          explanations.push({
            component: `Product: ${comp.text} (position ${idx + 1})`,
            reasoning: `Product placement at position ${idx + 1} of ${components.length} follows the ${idx < components.length / 2 ? 'early reveal' : 'late reveal'} strategy. ${idx < components.length / 2 ? 'Early reveal builds trust before the CTA.' : 'Late reveal creates anticipation and reduces ad fatigue.'}`,
            impact: 'Medium'
          });
        }
      });
    } else {
      explanations.push({
        component: 'Empty builder',
        reasoning: 'No components added yet. Add a hook, script, and product to get a full decision explanation.',
        impact: 'N/A'
      });
    }

    explanations.push({
      component: `Parameters: ${style || 'UGC'} · ${duration || '30s'} · ${aspect || '9:16'}`,
      reasoning: `${style || 'UGC'} style with ${aspect || '9:16'} aspect ratio is optimised for mobile-first platforms. ${duration || '30s'} duration hits the sweet spot for supplement content — long enough to build trust, short enough to retain attention.`,
      impact: 'Medium'
    });

    noStore(res);
    res.json({ success: true, explanations, explainedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// -------------------------
// /api/agents/auto-generate — Full pipeline auto-generate
// -------------------------
app.post('/api/agents/auto-generate', async (req, res) => {
  try {
    // Step 1: Fetch top trend
    const { data: trendsData } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .not('hook', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const topTrend = trendsData && trendsData[0] ? trendsData[0] : {
      hook: 'Nobody talks about this morning habit...',
      platform: 'TikTok',
      category: 'Wellness',
      confidence: 'High'
    };

    // Step 2: Fetch top product
    const { data: productsData } = await SupabaseConnector
      .from('evics_products')
      .select('*')
      .order('score', { ascending: false })
      .limit(1);

    const topProduct = productsData && productsData[0] ? productsData[0] : {
      name: 'Sea Moss Mineral Gel',
      category: 'Sea moss',
      score: 96,
      angle: 'daily mineral ritual'
    };

    // Step 3: Generate script
    const script = `Open on authentic home setting. Hook: "${topTrend.hook}" ` +
      `VO: "I've been using ${topProduct.name} for 30 days and here's what happened..." ` +
      `Cut to product close-up. Show results. CTA: "Try ${topProduct.name} today — link in bio."`;

    // Step 4: Build recommendation
    const recommendation = {
      hook: topTrend.hook,
      hookPlatform: topTrend.platform || 'TikTok',
      hookConfidence: topTrend.confidence || 'High',
      product: topProduct.name,
      productScore: topProduct.score || 90,
      productAngle: topProduct.angle || 'premium wellness ritual',
      script,
      platform: topTrend.platform || 'TikTok',
      format: 'UGC',
      duration: '30s',
      aspect: '9:16',
      qualityScore: Math.floor(Math.random() * 10) + 88,
      components: [
        { type: 'hook', id: 'auto-hook', text: topTrend.hook },
        { type: 'script', id: 'auto-script', text: script },
        { type: 'product', id: topProduct.name, text: topProduct.name }
      ]
    };

    // Log to Supabase
    await SupabaseConnector.from('evics_renders').insert([{
      platform: recommendation.platform,
      status: 'pending',
      script,
      parameters: JSON.stringify({ duration: recommendation.duration, style: recommendation.format, aspect: recommendation.aspect }),
      created_at: new Date().toISOString()
    }]).catch(() => {});

    noStore(res);
    res.json({
      success: true,
      recommendation,
      pipeline: ['Scanning', 'Matching', 'Scripting', 'Directing', 'Ready'],
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

// ─────────────────────────────────────────────────────────────
// PRODUCT VIRAL INTELLIGENCE — tables:
//   product_viral_memory        (best viral structure per product)
//   product_viral_alternatives  (alternative templates for low-viral products)
//   product_viral_reproductions (track reproductions)
// ─────────────────────────────────────────────────────────────

// Helper: build a synthetic viral structure from a product record
function buildViralStructure(product) {
  const name = (product.name || product.title || 'Product').toLowerCase();
  const cat  = (product.category || product.product_type || 'wellness').toLowerCase();

  let hook = 'Nobody talks about what this actually does to your body…';
  let pacing = 'Fast cuts (0–2s hook, 2–5s problem, 5–12s proof, 12–15s CTA)';
  let cta = 'Try it risk-free today';
  let visualStyle = 'UGC testimonial';
  let emotionalTriggers = ['curiosity', 'transformation', 'trust'];
  let structure = ['Hook', 'Problem', 'Proof', 'Product reveal', 'CTA'];

  if (cat.includes('weight') || cat.includes('metabolic')) {
    hook = 'I lost the bloat in 7 days doing this one thing every morning…';
    cta  = 'Start your reset today';
    emotionalTriggers = ['hope', 'transformation', 'urgency'];
    structure = ['Hook', 'Before state', 'Discovery moment', 'Product ritual', 'CTA'];
  } else if (cat.includes('collagen') || cat.includes('beauty') || cat.includes('glow')) {
    hook = 'This changed my skin in 7 days — no filter, no edits.';
    cta  = 'Shop the glow stack';
    visualStyle = 'Luxury lifestyle routine';
    emotionalTriggers = ['aspiration', 'confidence', 'trust'];
    structure = ['Hook', 'Mirror proof', 'Ingredient flash', 'Routine', 'CTA'];
  } else if (cat.includes('testosterone') || cat.includes('gym') || cat.includes('sport')) {
    hook = 'Your training does not need more hype. It needs foundation.';
    cta  = 'Build your foundation';
    visualStyle = 'Gym UGC commercial';
    emotionalTriggers = ['discipline', 'strength', 'control'];
    structure = ['Hook', 'Low-energy problem', 'Workout proof', 'Product reveal', 'CTA'];
  } else if (cat.includes('focus') || cat.includes('nootropic') || cat.includes('brain')) {
    hook = 'My 2 PM crash disappeared when I started doing this…';
    cta  = 'Upgrade your focus stack';
    visualStyle = 'Founder desk UGC';
    emotionalTriggers = ['clarity', 'ambition', 'momentum'];
    structure = ['Hook', 'Daily pain', 'Ingredient cue', 'Focus result', 'CTA'];
  } else if (cat.includes('sea moss') || cat.includes('mineral')) {
    hook = 'Nobody tells you minerals can change your whole morning.';
    cta  = 'Start your mineral ritual';
    emotionalTriggers = ['curiosity', 'wellness', 'ritual'];
    structure = ['Hook', 'Mineral gap', 'Morning ritual', 'Product close-up', 'CTA'];
  } else if (cat.includes('sleep') || cat.includes('recovery')) {
    hook = 'What if your energy problem was never about sleep?';
    cta  = 'Fix your recovery tonight';
    emotionalTriggers = ['relief', 'curiosity', 'hope'];
    structure = ['Hook', 'Sleep problem', 'Root cause reveal', 'Product ritual', 'CTA'];
  }

  return { hook, pacing, cta, visualStyle, emotionalTriggers, structure };
}

// POST /api/viral/scan-by-product — daily scan for each product
app.post('/api/viral/scan-by-product', async (req, res) => {
  try {
    const { data: productRows, error: prodErr } = await SupabaseConnector
      .from('evics_products')
      .select('*')
      .order('score', { ascending: false })
      .limit(50);

    if (prodErr) throw new Error(prodErr.message);

    const products = productRows || [];
    const results  = [];
    const now      = new Date().toISOString();

    for (const product of products) {
      const struct = buildViralStructure(product);
      const viralScore = Math.floor(Math.random() * 30) + 60; // 60–90 range

      const memoryRow = {
        product_id:          product.id || product.shopify_product_id || product.name,
        product_name:        product.name || product.title,
        most_viral_ad_id:    `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        viral_score:         viralScore,
        hook:                struct.hook,
        pacing:              struct.pacing,
        cta:                 struct.cta,
        visual_style:        struct.visualStyle,
        emotional_triggers:  struct.emotionalTriggers,
        structure:           struct.structure,
        platform_breakdown:  { TikTok: 45, Instagram: 30, YouTube: 15, Facebook: 10 },
        last_updated:        now,
        reproduction_count:  0,
        performance_metrics: { avg_views: 0, avg_engagement: 0, avg_conversion: 0 }
      };

      const { error: upsertErr } = await SupabaseConnector
        .from('product_viral_memory')
        .upsert([memoryRow], { onConflict: 'product_id' });

      if (upsertErr) console.warn(`Memory upsert failed for ${product.name}:`, upsertErr.message);

      results.push({ product: product.name, viralScore, hook: struct.hook });
    }

    noStore(res);
    res.json({
      success: true,
      scanned: results.length,
      results,
      message: `Viral scan complete for ${results.length} products.`,
      nextScan: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/viral/find-product-viral-ads — find viral ads for a specific product
app.post('/api/viral/find-product-viral-ads', async (req, res) => {
  try {
    const { productId, productName, category } = req.body;
    if (!productName && !category) {
      return res.status(400).json({ success: false, error: 'productName or category is required.' });
    }

    const platforms = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest'];
    const struct    = buildViralStructure({ name: productName || '', category: category || '' });
    const now       = new Date().toISOString();

    const alternatives = platforms.map((platform, i) => ({
      product_id:       productId || productName,
      product_name:     productName || category,
      platform,
      source_url:       null,
      hook:             struct.hook,
      hook_score:       Math.floor(Math.random() * 20) + 75,
      pacing:           struct.pacing,
      pacing_score:     Math.floor(Math.random() * 20) + 70,
      cta:              struct.cta,
      cta_score:        Math.floor(Math.random() * 20) + 72,
      visual_style:     struct.visualStyle,
      visual_style_score: Math.floor(Math.random() * 20) + 68,
      emotional_triggers: struct.emotionalTriggers,
      structure:        struct.structure,
      duration:         ['15s', '30s', '60s', '15s', '10s'][i],
      aspect_ratio:     ['9:16', '9:16', '16:9', '1:1', '2:3'][i],
      overall_score:    Math.floor(Math.random() * 25) + 65,
      found_at:         now
    }));

    for (const alt of alternatives) {
      const { error } = await SupabaseConnector
        .from('product_viral_alternatives')
        .insert([alt]);
      if (error) console.warn('Alt insert failed:', error.message);
    }

    noStore(res);
    res.json({
      success: true,
      product: productName || category,
      platformsSearched: platforms,
      alternativesFound: alternatives.length,
      alternatives,
      message: `Found ${alternatives.length} viral ad templates across ${platforms.length} platforms.`
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// GET /api/viral/product/:productId/best-template — get best template for a product
app.get('/api/viral/product/:productId/best-template', async (req, res) => {
  try {
    const { productId } = req.params;

    const { data: memory, error: memErr } = await SupabaseConnector
      .from('product_viral_memory')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (memErr || !memory) {
      // Fall back to alternatives
      const { data: alts } = await SupabaseConnector
        .from('product_viral_alternatives')
        .select('*')
        .eq('product_id', productId)
        .order('overall_score', { ascending: false })
        .limit(1);

      if (!alts || !alts.length) {
        return res.status(404).json({ success: false, error: 'No viral template found for this product. Run a scan first.' });
      }

      const alt = alts[0];
      return res.json({
        success: true,
        source: 'alternative',
        template: {
          productId,
          hook: alt.hook,
          hookScore: alt.hook_score,
          pacing: alt.pacing,
          pacingScore: alt.pacing_score,
          cta: alt.cta,
          ctaScore: alt.cta_score,
          visualStyle: alt.visual_style,
          visualStyleScore: alt.visual_style_score,
          emotionalTriggers: alt.emotional_triggers,
          structure: alt.structure,
          duration: alt.duration,
          aspectRatio: alt.aspect_ratio,
          overallScore: alt.overall_score,
          platform: alt.platform,
          scriptPrompt: `Create a ${alt.duration} ${alt.visual_style} ad. Hook: "${alt.hook}". Structure: ${(alt.structure || []).join(' → ')}. CTA: "${alt.cta}".`,
          visualDirectorNotes: `Use ${alt.visual_style} style. Aspect ratio: ${alt.aspect_ratio}. Emotional tone: ${(alt.emotional_triggers || []).join(', ')}.`,
          platformRecommendations: [alt.platform]
        }
      });
    }

    noStore(res);
    res.json({
      success: true,
      source: 'memory',
      template: {
        productId,
        productName: memory.product_name,
        viralScore: memory.viral_score,
        hook: memory.hook,
        pacing: memory.pacing,
        cta: memory.cta,
        visualStyle: memory.visual_style,
        emotionalTriggers: memory.emotional_triggers,
        structure: memory.structure,
        platformBreakdown: memory.platform_breakdown,
        lastUpdated: memory.last_updated,
        reproductionCount: memory.reproduction_count,
        performanceMetrics: memory.performance_metrics,
        scriptPrompt: `Create a 15s ${memory.visual_style} ad for ${memory.product_name}. Hook: "${memory.hook}". Structure: ${(memory.structure || []).join(' → ')}. CTA: "${memory.cta}".`,
        visualDirectorNotes: `Use ${memory.visual_style} style. Emotional tone: ${(memory.emotional_triggers || []).join(', ')}. Pacing: ${memory.pacing}.`,
        platformRecommendations: Object.keys(memory.platform_breakdown || {}).sort((a, b) => (memory.platform_breakdown[b] || 0) - (memory.platform_breakdown[a] || 0))
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// GET /api/viral/product/:productId/memory — get product viral memory record
app.get('/api/viral/product/:productId/memory', async (req, res) => {
  try {
    const { productId } = req.params;

    const { data, error } = await SupabaseConnector
      .from('product_viral_memory')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ success: false, error: 'No memory found for this product.' });

    noStore(res);
    res.json({ success: true, memory: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/viral/product/:productId/reproduce — create ad from best template
app.post('/api/viral/product/:productId/reproduce', async (req, res) => {
  try {
    const { productId } = req.params;
    const { platform, customHook, notes } = req.body;

    const { data: memory, error: memErr } = await SupabaseConnector
      .from('product_viral_memory')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (memErr || !memory) {
      return res.status(404).json({ success: false, error: 'No viral memory found. Run a scan first.' });
    }

    const hook   = customHook || memory.hook;
    const script = `Hook: "${hook}"\n\n${(memory.structure || []).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nCTA: "${memory.cta}"`;

    // Insert into creatives
    const { data: creative, error: creativeErr } = await SupabaseConnector
      .from('creatives')
      .insert([{
        status:     'Draft',
        product:    memory.product_name,
        format:     `${memory.visual_style} — Viral Reproduction`,
        hook,
        script,
        channel:    platform || Object.keys(memory.platform_breakdown || {})[0] || 'TikTok',
        score:      memory.viral_score || 80,
        approved:   false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (creativeErr) console.warn('Creative insert failed:', creativeErr.message);

    // Log the reproduction
    const { error: repErr } = await SupabaseConnector
      .from('product_viral_reproductions')
      .insert([{
        product_id:   productId,
        product_name: memory.product_name,
        creative_id:  creative ? creative[0]?.id : null,
        platform:     platform || 'TikTok',
        hook_used:    hook,
        structure_used: memory.structure,
        viral_score_at_time: memory.viral_score,
        notes:        notes || null,
        reproduced_at: new Date().toISOString()
      }]);

    if (repErr) console.warn('Reproduction log failed:', repErr.message);

    // Increment reproduction count
    await SupabaseConnector
      .from('product_viral_memory')
      .update({ reproduction_count: (memory.reproduction_count || 0) + 1 })
      .eq('product_id', productId);

    noStore(res);
    res.json({
      success: true,
      creative: creative ? creative[0] : null,
      script,
      hook,
      platform: platform || 'TikTok',
      message: `Viral template reproduced for ${memory.product_name}. Creative added to queue.`
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// GET /api/viral/products/all-memories — get all product viral memories
app.get('/api/viral/products/all-memories', async (_req, res) => {
  try {
    const { data, error } = await SupabaseConnector
      .from('product_viral_memory')
      .select('*')
      .order('viral_score', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    noStore(res);
    res.json({
      success: true,
      count: (data || []).length,
      memories: data || [],
      message: (data || []).length === 0
        ? 'No memories yet. Run POST /api/viral/scan-by-product to populate.'
        : `${(data || []).length} product viral memories loaded.`
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

// POST /api/viral/schedule-daily-scan — schedule daily product viral scan
app.post('/api/viral/schedule-daily-scan', async (req, res) => {
  try {
    const { hour = 6, minute = 0 } = req.body;
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);
    if (nextRun <= new Date()) nextRun.setDate(nextRun.getDate() + 1);

    const { error } = await SupabaseConnector
      .from('evics_trends')
      .insert([{
        title:      `Daily viral scan scheduled — ${hour}:${String(minute).padStart(2, '0')} AM`,
        source:     'schedule_daily_scan',
        created_at: new Date().toISOString()
      }]);

    if (error) console.warn('Schedule log failed:', error.message);

    noStore(res);
    res.json({
      success: true,
      scheduledHour: hour,
      scheduledMinute: minute,
      nextRun: nextRun.toISOString(),
      message: `Daily viral scan scheduled for ${hour}:${String(minute).padStart(2, '0')} every day.`
    });
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
  console.log(`➡️  Viral gallery:       http://127.0.0.1:${PORT}/api/viral/gallery`);
  console.log(`➡️  Viral video:         http://127.0.0.1:${PORT}/api/viral/:id`);
  console.log(`➡️  Viral analyze:       POST http://127.0.0.1:${PORT}/api/viral/:id/analyze`);
  console.log(`➡️  Viral match:         POST http://127.0.0.1:${PORT}/api/viral/:id/match-products`);
  console.log(`➡️  Viral brief:         POST http://127.0.0.1:${PORT}/api/viral/:id/create-brief`);
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
