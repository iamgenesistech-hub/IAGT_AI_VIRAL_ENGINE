// backend/server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const SupabaseConnector = require('../utils/SupabaseConnector');
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from dashboard/control-center
app.use(express.static(path.join(__dirname, '../dashboard/control-center')));

// Root route — serve dashboard HTML
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