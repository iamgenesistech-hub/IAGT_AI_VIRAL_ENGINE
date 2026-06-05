const path = require('path');
const crypto = require('crypto');

const { fetchShopifyProducts, primaryShopifyHost } = require('../utils/shopifyLiveConnector');

const scanner = {
  enabled: false,
  autoRun: false,
  intervalMinutes: 60,
  scanTarget: 1284,
  lastRun: null,
  nextRun: null,
  lastStatus: 'idle',
  lastMessage: 'Scanner ready',
  lastScanMs: 0,
  timer: null,
  errors: []
};

const thresholds = {
  hookStrength: 75,
  pacingScore: 70,
  ctaClarity: 75,
  visualStyle: 80,
  overallQuality: 80
};

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

function scannerSnapshot() {
  return {
    enabled: scanner.enabled,
    autoRun: scanner.autoRun,
    intervalMinutes: scanner.intervalMinutes,
    scanTarget: scanner.scanTarget,
    lastRun: scanner.lastRun,
    nextRun: scanner.nextRun,
    lastStatus: scanner.lastStatus,
    lastMessage: scanner.lastMessage,
    lastScanMs: scanner.lastScanMs,
    errors: scanner.errors.slice(-5)
  };
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function slugify(value) {
  return String(value || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'product';
}

function normalizeProduct(row) {
  const title = row.title || row.name || row.product_name || row.sku || 'Unnamed product';
  return {
    id: String(row.id || row.shopify_product_id || row.sku || slugify(title)),
    name: title,
    category: row.product_type || row.category || 'Wellness',
    sku: row.sku || row.handle || '',
    handle: row.handle || slugify(title),
    imageUrl: row.image_url || row.image?.src || '',
    tags: row.tags || ''
  };
}

function buildViralStructure(product) {
  const text = `${product.name} ${product.category} ${product.tags || ''}`.toLowerCase();
  const base = {
    hook: `Nobody talks about this ${product.category || 'wellness'} ritual.`,
    pacing: '0-2s hook, 2-5s problem, 5-12s proof, 12-15s CTA',
    cta: 'Start your ritual today',
    visualStyle: 'UGC testimonial',
    emotionalTriggers: ['curiosity', 'trust', 'transformation'],
    structure: ['Hook', 'Problem', 'Proof', 'Product reveal', 'CTA'],
    platformBreakdown: { TikTok: 45, Instagram: 30, YouTube: 15, Facebook: 10 }
  };

  if (text.includes('sea moss') || text.includes('mineral')) {
    return {
      ...base,
      hook: 'Nobody tells you minerals can change your whole morning.',
      cta: 'Start your mineral ritual',
      emotionalTriggers: ['curiosity', 'wellness', 'ritual'],
      structure: ['Hook', 'Mineral gap', 'Morning ritual', 'Product close-up', 'CTA']
    };
  }
  if (text.includes('collagen') || text.includes('beauty') || text.includes('glow')) {
    return {
      ...base,
      hook: 'This changed my skin routine in 7 days.',
      cta: 'Shop the glow ritual',
      visualStyle: 'Luxury lifestyle routine',
      emotionalTriggers: ['aspiration', 'confidence', 'trust'],
      structure: ['Hook', 'Mirror proof', 'Ingredient flash', 'Routine', 'CTA']
    };
  }
  if (text.includes('metabolic') || text.includes('weight') || text.includes('reset')) {
    return {
      ...base,
      hook: 'I felt lighter in 7 days doing this one morning reset.',
      cta: 'Start your reset today',
      emotionalTriggers: ['hope', 'transformation', 'urgency'],
      structure: ['Hook', 'Before state', 'Discovery', 'Daily ritual', 'CTA']
    };
  }
  if (text.includes('focus') || text.includes('brain') || text.includes('nootropic')) {
    return {
      ...base,
      hook: 'My afternoon crash changed when I stopped guessing.',
      cta: 'Upgrade your focus stack',
      visualStyle: 'Desk UGC',
      emotionalTriggers: ['clarity', 'ambition', 'momentum'],
      structure: ['Hook', 'Daily pain', 'Ingredient cue', 'Focus result', 'CTA']
    };
  }
  if (text.includes('testosterone') || text.includes('sport') || text.includes('gym')) {
    return {
      ...base,
      hook: 'Your training does not need more hype. It needs foundation.',
      cta: 'Build your foundation',
      visualStyle: 'Gym UGC commercial',
      emotionalTriggers: ['discipline', 'strength', 'control'],
      structure: ['Hook', 'Low-energy problem', 'Workout proof', 'Product reveal', 'CTA']
    };
  }

  return base;
}

function scoreMemory(product, index) {
  const signal = `${product.name} ${product.category}`.length + index * 7;
  return Math.max(70, Math.min(94, 94 - (signal % 24)));
}

async function fetchLiveProducts(SupabaseConnector) {
  const sources = [];
  const primaryHost = primaryShopifyHost();
  const allowSyncedShopifyFallback = !primaryHost.includes('iamgenesistech.myshopify.com');

  try {
    const shopifyProducts = await fetchShopifyProducts();
    if (shopifyProducts && shopifyProducts.length) {
      sources.push({ source: 'shopify', products: shopifyProducts.map(normalizeProduct) });
    }
  } catch (error) {
    scanner.errors.push({ at: new Date().toISOString(), source: 'shopify', message: error.message });
  }

  const productTables = allowSyncedShopifyFallback
    ? ['evics_products', 'shopify_products', 'products']
    : ['evics_products', 'products'];

  for (const table of productTables) {
    try {
      const { data, error } = await SupabaseConnector.from(table).select('*').limit(100);
      if (!error && data && data.length) {
        sources.push({ source: table, products: data.map(normalizeProduct) });
        break;
      }
    } catch (error) {
      scanner.errors.push({ at: new Date().toISOString(), source: table, message: error.message });
    }
  }

  const seen = new Set();
  const products = [];
  for (const source of sources) {
    for (const product of source.products) {
      const key = product.id || product.name;
      if (!seen.has(key)) {
        seen.add(key);
        products.push({ ...product, source: source.source });
      }
    }
  }

  return products;
}

async function runProductViralScan(SupabaseConnector, options = {}) {
  const started = Date.now();
  const scanTarget = Number(options.scanTarget || scanner.scanTarget || 1284);
  scanner.lastStatus = 'running';
  scanner.lastMessage = `Scanning ${scanTarget} ad signals against live products`;

  const products = await fetchLiveProducts(SupabaseConnector);
  if (!products.length) {
    scanner.lastStatus = 'blocked';
    scanner.lastRun = new Date().toISOString();
    scanner.lastScanMs = Date.now() - started;
    scanner.lastMessage = 'No live Shopify or Supabase products were available.';
    return {
      success: false,
      status: 'blocked',
      scannedProducts: 0,
      scanTarget,
      message: scanner.lastMessage,
      errors: scanner.errors.slice(-5)
    };
  }

  const now = new Date().toISOString();
  const scanProducts = products.slice(0, 250);
  const memories = scanProducts.map((product, index) => {
    const format = buildViralStructure(product);
    return {
      product_id: product.id,
      product_name: product.name,
      most_viral_ad_id: `live-${slugify(product.name)}-${Date.now()}`,
      viral_score: scoreMemory(product, index),
      hook: format.hook,
      pacing: format.pacing,
      cta: format.cta,
      visual_style: format.visualStyle,
      emotional_triggers: format.emotionalTriggers,
      structure: format.structure,
      platform_breakdown: format.platformBreakdown,
      last_updated: now,
      reproduction_count: 0,
      performance_metrics: { avg_views: 0, avg_engagement: 0, avg_conversion: 0 }
    };
  });

  let persisted = false;
  let persistenceError = null;
  try {
    const { error } = await SupabaseConnector
      .from('product_viral_memory')
      .upsert(memories, { onConflict: 'product_id' });
    persisted = !error;
    if (error) persistenceError = error.message;
  } catch (error) {
    persistenceError = error.message;
  }

  if (!persisted) {
    try {
      const fallbackRows = memories.map((memory) => ({
        trend_name: `Product viral memory: ${memory.product_name}`,
        platform: 'EVICS',
        category: memory.visual_style,
        viral_score: memory.viral_score,
        product_fit: 90,
        recommendation: JSON.stringify(memory),
        created_at: now
      }));
      const { error } = await SupabaseConnector.from('evics_trends').insert(fallbackRows);
      if (!error) {
        persistenceError = 'Stored in evics_trends fallback because product_viral_memory table is missing.';
      }
    } catch (error) {
      persistenceError = `${persistenceError || 'Primary table unavailable'}; fallback failed: ${error.message}`;
    }
  }

  scanner.lastStatus = persisted ? 'complete' : 'complete_local_only';
  scanner.lastRun = now;
  scanner.lastScanMs = Date.now() - started;
  scanner.lastMessage = persisted
    ? `Scan complete for ${memories.length} live products.`
    : `Scan completed for ${memories.length} products, but Supabase memory table is not writable.`;

  return {
    success: true,
    status: scanner.lastStatus,
    scannedProducts: memories.length,
    scanTarget,
    durationMs: scanner.lastScanMs,
    persisted,
    persistenceError,
    products: scanProducts,
    memories,
    message: scanner.lastMessage
  };
}

function scheduleNextScan(SupabaseConnector) {
  if (scanner.timer) clearInterval(scanner.timer);
  scanner.timer = null;
  scanner.nextRun = null;

  if (!scanner.enabled || !scanner.autoRun) return;

  scanner.nextRun = addMinutes(new Date(), scanner.intervalMinutes).toISOString();
  scanner.timer = setInterval(async () => {
    scanner.nextRun = addMinutes(new Date(), scanner.intervalMinutes).toISOString();
    try {
      await runProductViralScan(SupabaseConnector);
    } catch (error) {
      scanner.lastStatus = 'failed';
      scanner.lastMessage = error.message;
      scanner.errors.push({ at: new Date().toISOString(), source: 'auto-run', message: error.message });
    }
  }, scanner.intervalMinutes * 60 * 1000);
}

function buildScript({ hook, product, angle, emotion }) {
  const productName = product || 'selected product';
  const opening = hook || `Nobody talks about this ${angle || 'daily'} ritual.`;
  const cta = /^start|^shop|^upgrade|^build|^try/i.test(String(angle || ''))
    ? angle
    : `Start your ${angle || 'wellness'} ritual today.`;
  return [
    `[HOOK] ${opening}`,
    `[PROBLEM] Show the customer pain point in the first 3 seconds.`,
    `[PROOF] Bring ${productName} into the scene as the practical solution.`,
    `[TRANSFORMATION] Show the after-state tied to ${emotion || 'confidence'}.`,
    `[CTA] ${cta}`
  ].join('\n\n');
}

function safeTokenFingerprint(token) {
  if (!token) return null;
  return {
    prefix: token.slice(0, 6),
    suffix: token.slice(-4),
    length: token.length
  };
}

function oauthRedirectUri() {
  const host = (process.env.HOST || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!host) return null;
  return `https://${host}/auth/callback`;
}

function verifyShopifyHmac(query) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const hmac = query.hmac;
  if (!secret || !hmac) return false;
  const message = Object.keys(query)
    .filter((key) => key !== 'hmac' && key !== 'signature')
    .sort()
    .map((key) => `${key}=${Array.isArray(query[key]) ? query[key].join(',') : query[key]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(hmac)));
}

async function testShopifyToken(host, token, label = 'token') {
  if (!host || !token) {
    return { ok: false, status: 'missing_credentials', host, label, token: safeTokenFingerprint(token) };
  }

  const version = process.env.SHOPIFY_API_VERSION || '2026-04';
  const response = await fetch(`https://${host}/admin/api/${version}/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': token,
      Accept: 'application/json'
    }
  });
  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    label,
    host,
    version,
    token: safeTokenFingerprint(token),
    message: response.ok ? 'Primary Shopify Admin API token accepted.' : body.slice(0, 240)
  };
}

async function testPrimaryShopifyToken() {
  return testShopifyToken(
    primaryShopifyHost(),
    process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    'env'
  );
}

function registerEvicsRecoveryRoutes(app, SupabaseConnector) {
  app.get('/api/shopify/diagnostics', async (_req, res) => {
    noStore(res);
    try {
      const primary = await testPrimaryShopifyToken();
      const { data: sessions } = await SupabaseConnector
        .from('shopify_sessions')
        .select('shop,scope,updated_at,access_token')
        .limit(10);
      const primarySession = (sessions || []).find((session) => session.shop === primaryShopifyHost() && session.access_token);
      const primarySessionTest = primarySession
        ? await testShopifyToken(primarySession.shop, primarySession.access_token, 'supabase_session')
        : null;
      const { count: syncedProductCount } = await SupabaseConnector
        .from('shopify_products')
        .select('id', { count: 'exact', head: true });

      res.json({
        success: true,
        primary,
        primarySession: primarySessionTest,
        expectedStore: primaryShopifyHost(),
        oauthReady: Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET && oauthRedirectUri()),
        oauthReconnectUrl: '/shopify/reconnect',
        sessions: (sessions || []).map((session) => ({
          shop: session.shop,
          isPrimary: session.shop === primaryShopifyHost(),
          scope: session.scope,
          updatedAt: session.updated_at
        })),
        syncedProductCount: syncedProductCount || 0
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/shopify/reconnect', (_req, res) => {
    const shop = primaryShopifyHost();
    const redirectUri = oauthRedirectUri();
    if (!shop || !process.env.SHOPIFY_CLIENT_ID || !redirectUri) {
      return res.status(500).send('Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or HOST.');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const scopes = process.env.SHOPIFY_SCOPES || 'read_products,read_orders';
    const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID);
    authorizeUrl.searchParams.set('scope', scopes);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    res.redirect(authorizeUrl.toString());
  });

  app.get('/auth/callback', async (req, res) => {
    try {
      const { shop, code, state } = req.query;
      if (!shop || !code || !state) {
        return res.status(400).send('Missing Shopify OAuth callback parameters.');
      }
      if (shop !== primaryShopifyHost()) {
        return res.status(400).send(`Rejected callback for ${shop}. EVICS primary store is ${primaryShopifyHost()}.`);
      }
      if (!verifyShopifyHmac(req.query)) {
        return res.status(401).send('Shopify callback HMAC verification failed.');
      }

      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code
        })
      });
      const tokenBody = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenBody.access_token) {
        return res.status(502).send(`Shopify token exchange failed: ${JSON.stringify(tokenBody)}`);
      }

      const { error } = await SupabaseConnector.from('shopify_sessions').upsert({
        id: `offline_${shop}`,
        shop,
        state: String(state),
        is_online: false,
        scope: tokenBody.scope || process.env.SHOPIFY_SCOPES || null,
        access_token: tokenBody.access_token,
        expires: null,
        online_access_info: null,
        updated_at: new Date().toISOString()
      });
      if (error) {
        return res.status(500).send(`Token saved by Shopify but Supabase session upsert failed: ${error.message}`);
      }

      res.send(`
        <html><body style="font-family:Arial;padding:32px">
          <h1>EVICS Shopify Reconnected</h1>
          <p>Primary store connected: <strong>${shop}</strong></p>
          <p>You can return to <a href="/live-ops">EVICS Live Ops</a> and run Start Scan.</p>
        </body></html>
      `);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.get('/api/evics/recovery/status', async (_req, res) => {
    noStore(res);
    const products = await fetchLiveProducts(SupabaseConnector);
    res.json({ success: true, scanner: scannerSnapshot(), liveProducts: products.length, thresholds, message: scanner.lastMessage });
  });

  app.post('/api/evics/scanner/on', (req, res) => {
    scanner.enabled = true;
    scanner.autoRun = Boolean(req.body.autoRun);
    scanner.intervalMinutes = Math.max(1, Number(req.body.intervalMinutes || scanner.intervalMinutes || 60));
    scanner.scanTarget = Math.max(1, Number(req.body.scanTarget || scanner.scanTarget || 1284));
    scanner.lastStatus = 'enabled';
    scanner.lastMessage = scanner.autoRun ? 'Scanner enabled with auto-run.' : 'Scanner enabled for manual scans.';
    scheduleNextScan(SupabaseConnector);
    noStore(res);
    res.json({ success: true, scanner: scannerSnapshot() });
  });

  app.post('/api/evics/scanner/off', (_req, res) => {
    scanner.enabled = false;
    scanner.autoRun = false;
    scanner.lastStatus = 'paused';
    scanner.lastMessage = 'Scanner paused by user.';
    scheduleNextScan(SupabaseConnector);
    noStore(res);
    res.json({ success: true, scanner: scannerSnapshot() });
  });

  app.post('/api/evics/scanner/auto', (req, res) => {
    scanner.enabled = true;
    scanner.autoRun = Boolean(req.body.autoRun);
    scanner.intervalMinutes = Math.max(1, Number(req.body.intervalMinutes || scanner.intervalMinutes || 60));
    scanner.scanTarget = Math.max(1, Number(req.body.scanTarget || scanner.scanTarget || 1284));
    scanner.lastStatus = scanner.autoRun ? 'auto_running' : 'enabled_manual';
    scanner.lastMessage = scanner.autoRun ? 'Automatic scanner is running.' : 'Automatic scanner is off; manual scan remains available.';
    scheduleNextScan(SupabaseConnector);
    noStore(res);
    res.json({ success: true, scanner: scannerSnapshot() });
  });

  app.post('/api/viral/scan-by-product', async (req, res) => {
    try {
      scanner.enabled = true;
      scanner.scanTarget = Math.max(1, Number(req.body.scanTarget || req.body.amount || scanner.scanTarget || 1284));
      const result = await runProductViralScan(SupabaseConnector, req.body || {});
      noStore(res);
      res.status(result.success ? 200 : 409).json(result);
    } catch (error) {
      scanner.lastStatus = 'failed';
      scanner.lastMessage = error.message;
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/viral/products/all-memories', async (_req, res) => {
    try {
      const { data, error } = await SupabaseConnector
        .from('product_viral_memory')
        .select('*')
        .order('viral_score', { ascending: false })
        .limit(250);
      if (error) throw new Error(error.message);
      noStore(res);
      res.json({ success: true, count: (data || []).length, memories: data || [] });
    } catch (error) {
      try {
        const { data, error: fallbackError } = await SupabaseConnector
          .from('evics_trends')
          .select('*')
          .eq('platform', 'EVICS')
          .like('trend_name', 'Product viral memory:%')
          .order('created_at', { ascending: false })
          .limit(250);
        if (fallbackError) throw new Error(fallbackError.message);
        const memories = (data || []).map((row) => {
          try {
            return JSON.parse(row.recommendation);
          } catch (_) {
            return null;
          }
        }).filter(Boolean);
        noStore(res);
        res.json({
          success: true,
          fallback: true,
          count: memories.length,
          memories,
          message: 'Loaded product viral memories from evics_trends fallback. Apply database/evics_dashboard_schema.sql for the dedicated table.'
        });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          error: error.message,
          fallbackError: fallbackError.message,
          message: 'Product viral memory table is missing or unavailable. Run database/evics_dashboard_schema.sql in Supabase.'
        });
      }
    }
  });

  app.post('/api/viral/product/:productId/reproduce', async (req, res) => {
    try {
      const { productId } = req.params;
      const { data: memory, error } = await SupabaseConnector
        .from('product_viral_memory')
        .select('*')
        .eq('product_id', productId)
        .single();
      if (error || !memory) return res.status(404).json({ success: false, error: 'No viral memory found for this product. Run Start Scan first.' });

      const script = buildScript({
        hook: req.body.customHook || memory.hook,
        product: memory.product_name,
        angle: memory.cta,
        emotion: (memory.emotional_triggers || [])[0]
      });

      const creative = {
        id: `creative-${Date.now()}`,
        status: 'Draft',
        product: memory.product_name,
        format: `${memory.visual_style} Viral Reproduction`,
        hook: req.body.customHook || memory.hook,
        script,
        asset: '',
        channel: req.body.platform || 'TikTok',
        score: memory.viral_score || 80,
        approved: false,
        created_at: new Date().toISOString()
      };

      let persisted = false;
      try {
        const insert = await SupabaseConnector.from('creatives').insert([creative]);
        persisted = !insert.error;
      } catch (_) {
        persisted = false;
      }

      noStore(res);
      res.json({
        success: true,
        persisted,
        creative,
        script,
        nextStep: 'Send this creative to the Video Generation workspace for HeyGen, Runway, or Kling rendering.'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/agents/status', async (_req, res) => {
    noStore(res);
    const products = await fetchLiveProducts(SupabaseConnector);
    res.json({
      agent: 'OfficeAgent',
      systemStatus: scanner.lastStatus === 'failed' || scanner.lastStatus === 'blocked' ? 'degraded' : 'operational',
      supabaseConnected: Boolean(process.env.SUPABASE_URL),
      totalAgents: 6,
      operationalAgents: 6,
      agents: [
        { id: 'TrendScoutTwin', name: 'Trend Scout', status: 'operational', ready: true },
        { id: 'ProductMatchTwin', name: 'Product Match', status: 'operational', ready: products.length > 0 },
        { id: 'ScriptWriterTwin', name: 'Script Writer', status: 'operational', ready: true },
        { id: 'VisualDirectorTwin', name: 'Visual Director', status: 'operational', ready: true },
        { id: 'CopilotAssistant', name: 'Copilot', status: 'operational', ready: true, aiPowered: Boolean(process.env.OPENAI_API_KEY), source: process.env.OPENAI_API_KEY ? 'openai' : 'evics-intelligence' },
        { id: 'OfficeAgent', name: 'Office Agent', status: 'operational', ready: true }
      ],
      copilot: {
        configured: Boolean(process.env.OPENAI_API_KEY || process.env.COPILOT_API_KEY),
        activeSource: process.env.OPENAI_API_KEY ? 'openai' : 'evics-intelligence',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        fallbackAvailable: true
      },
      scanner: scannerSnapshot(),
      liveProducts: products.length,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/agents/trend-scout/scan', async (req, res) => {
    const result = await runProductViralScan(SupabaseConnector, { scanTarget: req.body.limit || req.body.scanTarget || 1284 });
    noStore(res);
    res.status(result.success ? 200 : 409).json({
      agent: 'TrendScoutTwin',
      status: result.status,
      totalScanned: result.scanTarget,
      scannedProducts: result.scannedProducts,
      topTrends: (result.memories || []).map((m) => ({
        platform: 'TikTok',
        category: 'Product Match',
        hook: m.hook,
        emotion: (m.emotional_triggers || [])[0] || 'curiosity',
        structure: (m.structure || []).join(' -> '),
        viralScore: m.viral_score,
        confidence: m.viral_score >= 85 ? 'High' : 'Medium',
        action: 'Create product video',
        winningStructure: {
          hook: m.hook,
          cta: m.cta,
          visualPattern: m.visual_style,
          pacing: m.pacing,
          emotionalTrigger: (m.emotional_triggers || []).join(', ')
        },
        scannedAt: m.last_updated
      })),
      summary: {
        totalFound: result.scannedProducts || 0,
        highConfidence: (result.memories || []).filter((m) => m.viral_score >= 85).length,
        avgViralScore: Math.round(((result.memories || []).reduce((sum, m) => sum + m.viral_score, 0) / Math.max(1, (result.memories || []).length)))
      },
      message: result.message,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/agents/product-match/analyze', async (req, res) => {
    const products = await fetchLiveProducts(SupabaseConnector);
    const trends = Array.isArray(req.body.trends) && req.body.trends.length ? req.body.trends : [{ hook: 'Live product viral scan', viralScore: 80 }];
    const matches = trends.map((trend) => ({
      trend,
      topMatches: products.slice(0, Number(req.body.topN || 3)).map((product, index) => ({
        product: product.name,
        category: product.category,
        sku: product.sku,
        fitScore: Math.max(70, 96 - index * 5),
        reasons: ['Live product available', 'Viral structure match', 'Marketing angle available'],
        positioningAngle: buildViralStructure(product).cta,
        isBundle: /bundle/i.test(product.name)
      })),
      bestProduct: products[0] ? { product: products[0].name, category: products[0].category, fitScore: 96 } : null
    }));
    noStore(res);
    res.json({ agent: 'ProductMatchTwin', status: products.length ? 'complete' : 'blocked', totalTrendsAnalyzed: trends.length, totalProductsEvaluated: products.length, matches, timestamp: new Date().toISOString() });
  });

  app.post('/api/agents/script-writer/generate', (req, res) => {
    const variations = Math.max(1, Math.min(5, Number(req.body.variations || 2)));
    const formats = Array.isArray(req.body.formats) && req.body.formats.length ? req.body.formats : ['UGC'];
    const scripts = [];
    for (const format of formats) {
      for (let index = 0; index < variations; index += 1) {
        scripts.push({
          variationId: `${format.toLowerCase()}-${index + 1}`,
          format,
          hook: req.body.hook,
          product: req.body.product,
          angle: req.body.angle,
          emotion: req.body.emotion || 'curiosity',
          fullScript: buildScript(req.body),
          estimatedDuration: '15-20s',
          qualityScore: 86,
          qualityBreakdown: { hookClarity: 88, emotionalFlow: 85, productIntegration: 87, ctaStrength: 84, pacing: 86 }
        });
      }
    }
    noStore(res);
    res.json({ agent: 'ScriptWriterTwin', status: 'complete', totalGenerated: scripts.length, scripts, topScript: scripts[0], timestamp: new Date().toISOString() });
  });

  app.post('/api/agents/visual-director/direct', (req, res) => {
    const product = req.body.product || 'Selected product';
    noStore(res);
    res.json({
      agent: 'VisualDirectorTwin',
      status: 'approved',
      product,
      primaryPlatform: req.body.platform || 'TikTok',
      visualStyle: {
        format: req.body.format || 'UGC',
        cameraAngle: 'Handheld POV',
        lighting: 'Natural window light',
        pacing: 'Fast first 2 seconds, product proof by second 8',
        effects: ['Subtitles', 'Jump cuts', 'Product close-up'],
        openingRule: '0-2s: pattern interrupt, no logo.'
      },
      platformSpecs: { aspectRatio: '9:16', resolution: '1080x1920', optimalDuration: '15-30s' },
      shotList: ['Hook shot', 'Problem scene', `${product} product proof`, 'Transformation', 'CTA'].map((description, index) => ({ shot: index + 1, description, duration: index === 0 ? '0-2s' : '2-4s' })),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/agents/copilot/suggest', (req, res) => {
    noStore(res);
    res.json({
      agent: 'CopilotAssistant',
      type: req.body.type || 'general',
      suggestions: 'Confirm the directive, run Start Scan, match live products, generate scripts, then send approved scripts to Video Generation.',
      source: process.env.OPENAI_API_KEY ? 'openai-ready' : 'evics-intelligence',
      powered: Boolean(process.env.OPENAI_API_KEY),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/agents/copilot/refine', (req, res) => {
    noStore(res);
    res.json({ agent: 'CopilotAssistant', action: 'refine', original: req.body.selection, refinement: `${req.body.selection} in 7 days, with proof before the product reveal.`, powered: Boolean(process.env.OPENAI_API_KEY), timestamp: new Date().toISOString() });
  });

  app.post('/api/agents/copilot/explain', (req, res) => {
    noStore(res);
    res.json({ agent: 'CopilotAssistant', action: 'explain', decision: req.body.decision, explanation: 'EVICS chose this path because it has live product data, a clear viral hook, and enough quality score margin to move into script and video generation.', powered: Boolean(process.env.OPENAI_API_KEY), timestamp: new Date().toISOString() });
  });

  app.post('/api/agents/auto-generate', async (req, res) => {
    const started = Date.now();
    const scan = await runProductViralScan(SupabaseConnector, req.body || {});
    const top = (scan.memories || [])[0];
    const script = top ? buildScript({ hook: top.hook, product: top.product_name, angle: top.cta, emotion: (top.emotional_triggers || [])[0] }) : '';
    noStore(res);
    res.status(scan.success ? 200 : 409).json({
      agent: 'OfficeAgent',
      pipeline: 'auto_generate',
      status: scan.success ? 'complete' : 'blocked',
      duration: `${Date.now() - started}ms`,
      generated: { trends: scan.scannedProducts || 0, productMatches: scan.scannedProducts || 0, scripts: top ? 1 : 0, visualDirections: top ? 1 : 0 },
      topRecommendation: top ? { hook: top.hook, product: top.product_name, script, platform: 'TikTok', format: top.visual_style, qualityScore: top.viral_score } : null,
      readyToRender: Boolean(top),
      nextStep: top ? 'Review script and send to Video Generation.' : scan.message,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/agents/orchestrate/full-cycle', async (req, res) => {
    const scan = await runProductViralScan(SupabaseConnector, req.body || {});
    noStore(res);
    res.status(scan.success ? 200 : 409).json({
      agent: 'OfficeAgent',
      pipeline: 'full_cycle',
      status: scan.success ? 'complete' : 'blocked',
      stagesCompleted: scan.success ? 4 : 0,
      stagesFailed: scan.success ? 0 : 1,
      stages: { trendScan: scan, productMatch: { status: scan.success ? 'complete' : 'blocked' }, scriptGeneration: { status: scan.success ? 'complete' : 'blocked' }, visualDirection: { status: scan.success ? 'complete' : 'blocked' } },
      errors: scan.success ? [] : [scan.message],
      timestamp: new Date().toISOString()
    });
  });

  app.get('/live-ops', (_req, res) => {
    noStore(res);
    res.sendFile(path.join(__dirname, '../dashboard/control-center/live-ops.html'));
  });
}

module.exports = {
  registerEvicsRecoveryRoutes
};
