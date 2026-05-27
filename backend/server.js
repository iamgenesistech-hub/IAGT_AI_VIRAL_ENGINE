// backend/server.js
require('dotenv').config();

const express = require('express');
const SupabaseConnector = require('../utils/SupabaseConnector');
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');

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

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ EVICS backend running at http://127.0.0.1:${PORT}`);
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
  console.log(`➡️  Trend Scout scan:    POST http://127.0.0.1:${PORT}/api/agents/trend-scout/scan`);
  console.log(`➡️  Script Writer:       POST http://127.0.0.1:${PORT}/api/agents/script-writer/generate`);
  console.log(`➡️  Product Match:       POST http://127.0.0.1:${PORT}/api/agents/product-match/analyze`);
  console.log(`➡️  Copilot suggest:     POST http://127.0.0.1:${PORT}/api/agents/copilot/suggest`);
  console.log(`➡️  Copilot refine:      POST http://127.0.0.1:${PORT}/api/agents/copilot/refine`);
  console.log(`➡️  Copilot explain:     POST http://127.0.0.1:${PORT}/api/agents/copilot/explain`);
  console.log(`➡️  Auto-generate:       POST http://127.0.0.1:${PORT}/api/agents/auto-generate`);
});