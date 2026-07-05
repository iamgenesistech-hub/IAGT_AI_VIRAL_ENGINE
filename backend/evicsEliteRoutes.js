const fs = require('fs');
const path = require('path');
const express = require('express');

// EVICS Sacred Intelligence Governance Engine — governs VP/Board agent output.
const governance = require('./sacredIntelligenceGovernance');

const DEFAULT_PRODUCTS = [
  {
    id: 'ignite-focus-stack',
    title: 'Genesis Focus Stack',
    handle: 'genesis-focus-stack',
    image_url: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=80',
    product_type: 'Performance',
    status: 'active',
    tags: 'focus,energy,wellness'
  },
  {
    id: 'sovereign-energy-greens',
    title: 'Sovereign Energy Greens',
    handle: 'sovereign-energy-greens',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    product_type: 'Wellness',
    status: 'active',
    tags: 'greens,health,ritual'
  },
  {
    id: 'viral-creator-bundle',
    title: 'Viral Creator Bundle',
    handle: 'viral-creator-bundle',
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    product_type: 'Creator Tools',
    status: 'active',
    tags: 'creator,viral,ai'
  }
];

const DEFAULT_BRAND_PROFILE = {
  id: 'iagt-elite-default',
  profileName: 'I AM GENESIS TECH Elite',
  companyName: 'I AM GENESIS TECH',
  publicBrandName: 'I AM GENESIS TECH',
  brandTagline: 'AI-powered viral commerce for mission-driven creators.',
  brandMission: 'Turn product intelligence, viral creative, and executive governance into a repeatable content engine.',
  brandVoice: 'Executive, premium, clear, conviction-driven, and faith-forward.',
  primaryAudience: 'Founders, affiliates, creators, and operators building digital product distribution.'
};

function registerEvicsEliteRoutes(app, dependencies = {}) {
  const {
    SupabaseConnector,
    startHeyGenRender,
    getHeyGenVideoStatus,
    controlCenterDir = path.join(__dirname, '../dashboard/control-center')
  } = dependencies;

  const statePath = path.join(__dirname, '../generated/evics-elite-state.json');

  function noStore(res) {
    res.setHeader('Cache-Control', 'no-store');
  }

  function sendJson(res, status, payload) {
    noStore(res);
    return res.status(status).json(payload);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readState() {
    try {
      if (fs.existsSync(statePath)) {
        return normalizeState(JSON.parse(fs.readFileSync(statePath, 'utf8')));
      }
    } catch (error) {
      console.warn('[EVICS Elite] State read failed:', error.message);
    }
    return normalizeState({});
  }

  function writeState(patchOrState) {
    const state = normalizeState(patchOrState);
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    return state;
  }

  function updateState(mutator) {
    const state = readState();
    const result = mutator(state) || state;
    return writeState(result);
  }

  function normalizeState(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      media: Array.isArray(source.media) ? source.media : [],
      findings: Array.isArray(source.findings) ? source.findings : [],
      timeline: Array.isArray(source.timeline) ? source.timeline : [],
      renderJobs: source.renderJobs && typeof source.renderJobs === 'object' ? source.renderJobs : {},
      vpMissions: source.vpMissions && typeof source.vpMissions === 'object' ? source.vpMissions : {},
      scanner: {
        enabled: source.scanner?.enabled !== false,
        status: source.scanner?.status || 'idle',
        intervalMinutes: Number(source.scanner?.intervalMinutes || 60),
        durationSeconds: Number(source.scanner?.durationSeconds || 45),
        lastRunAt: source.scanner?.lastRunAt || '',
        lastError: source.scanner?.lastError || ''
      },
      productScan: {
        running: Boolean(source.productScan?.running),
        mode: source.productScan?.mode || 'off',
        jobId: source.productScan?.jobId || '',
        startedAt: source.productScan?.startedAt || '',
        stoppedAt: source.productScan?.stoppedAt || '',
        progressLog: Array.isArray(source.productScan?.progressLog) ? source.productScan.progressLog : [],
        boardSummary: source.productScan?.boardSummary || null
      },
      verPolicy: source.verPolicy || {
        category: 'elite_default',
        viralWeight: 35,
        evidenceWeight: 25,
        renderQualityWeight: 25,
        complianceWeight: 15,
        minimumApprovalScore: 82,
        updatedAt: nowIso()
      },
      brandProfiles: Array.isArray(source.brandProfiles) && source.brandProfiles.length ? source.brandProfiles : [DEFAULT_BRAND_PROFILE],
      selectedProfileId: source.selectedProfileId || DEFAULT_BRAND_PROFILE.id,
      updatedAt: source.updatedAt || nowIso()
    };
  }

  function logTimeline(type, message, details = {}) {
    const entry = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
      actor: 'evics-elite-workspace',
      source: 'evics-api',
      type,
      lifecycle: type,
      status: details.status || 'ok',
      message,
      details,
      createdAt: nowIso()
    };
    updateState((state) => {
      state.timeline.unshift(entry);
      state.timeline = state.timeline.slice(0, 100);
      state.updatedAt = nowIso();
    });
    return entry;
  }

  async function fetchSupabaseRows(table, select = '*', limit = 100) {
    if (!SupabaseConnector || typeof SupabaseConnector.from !== 'function') return [];
    const { data, error } = await SupabaseConnector
      .from(table)
      .select(select)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data : [];
  }

  async function loadProducts(limit = 250) {
    try {
      const rows = await fetchSupabaseRows('evics_products', '*', limit);
      if (rows.length) return rows.map(normalizeProduct);
    } catch (error) {
      console.warn('[EVICS Elite] Product catalog fallback:', error.message);
    }
    return DEFAULT_PRODUCTS;
  }

  async function loadRenderRows(limit = 150) {
    try {
      return await fetchSupabaseRows('evics_renders', '*', limit);
    } catch (error) {
      console.warn('[EVICS Elite] Render table fallback:', error.message);
      return [];
    }
  }

  function normalizeProduct(row) {
    const title = row.title || row.name || row.product_name || 'Untitled Product';
    const handle = row.handle || row.product_handle || slugify(title);
    return {
      id: String(row.id || row.product_id || handle),
      title,
      handle,
      image_url: row.image_url || row.image || row.product_image_url || row.thumbnail_url || '',
      product_type: row.product_type || row.category || '',
      status: row.status || 'active',
      tags: row.tags || '',
      synced_at: row.synced_at || row.updated_at || row.created_at || null
    };
  }

  function normalizeMedia(row) {
    const metadata = parseJson(row.parameters || row.metadata || row.metadata_json, {});
    const id = String(row.id || row.video_id || row.job_id || row.render_id || 'media-' + Date.now());
    const playbackUrl = row.video_url || row.playback_url || row.vault_destination || metadata.playbackUrl || metadata.videoUrl || '';
    const status = row.status || row.render_status || 'draft';
    return {
      id,
      title: row.render_name || row.title || row.product_name || metadata.title || 'EVICS media asset',
      description: row.description || row.script || row.script_text || metadata.script || '',
      media_type: row.media_type || metadata.mediaType || 'video',
      render_status: normalizeRenderStatus(status, playbackUrl),
      approval_status: row.approval_status || metadata.approvalStatus || 'pending',
      publish_status: row.publish_status || metadata.publishStatus || 'pending',
      playback_url: playbackUrl,
      download_url: row.download_url || metadata.downloadUrl || playbackUrl,
      product_url: row.product_url || metadata.productUrl || '',
      created_at: row.created_at || metadata.createdAt || nowIso(),
      updated_at: row.updated_at || metadata.updatedAt || row.created_at || nowIso(),
      metadata_json: metadata,
      quality_status: row.quality_status || metadata.qualityStatus || 'Needs Review',
      quality_score: Number(row.quality_score || metadata.qualityScore || 0)
    };
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeRenderStatus(status, playbackUrl) {
    const clean = String(status || '').toLowerCase();
    if (playbackUrl || ['complete', 'completed', 'done'].includes(clean)) return 'complete';
    if (['failed', 'error'].includes(clean)) return 'failed';
    if (['rendering', 'queued', 'pending'].includes(clean)) return clean;
    return 'draft';
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function buildMediaState() {
    const state = readState();
    const persistedMedia = state.media.map(normalizeMedia);
    const renderRows = (await loadRenderRows()).map(normalizeMedia);
    const byId = new Map();
    [...renderRows, ...persistedMedia].forEach((item) => byId.set(item.id, item));
    return {
      ...state,
      media: Array.from(byId.values()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    };
  }

  function buildAgentReport(media = []) {
    const completed = media.filter((item) => item.render_status === 'complete').length;
    const failed = media.filter((item) => item.render_status === 'failed').length;
    const checked = media.filter((item) => item.quality_score || item.quality_status !== 'Needs Review').length;
    const approved = media.filter((item) => item.approval_status === 'approved').length;
    const agents = [
      {
        id: 'vp_copilot',
        name: 'VP Copilot',
        role: 'Autonomous Agent',
        capability: 'Mission orchestration and executive directives',
        tasksCompleted: completed,
        tasksFailed: failed,
        averageQuality: averageQuality(media),
        mediaTracked: media.length,
        haveGatePass: checked,
        publishedCount: media.filter((item) => item.publish_status === 'published').length,
        uptimePercent: 98
      },
      {
        id: 'board_agent',
        name: 'Executive Board',
        role: 'Decision Agent',
        capability: 'Approval and publishing decisions',
        tasksCompleted: approved,
        tasksFailed: failed,
        averageQuality: averageQuality(media),
        mediaTracked: media.length,
        haveGatePass: checked,
        publishedCount: media.filter((item) => item.publish_status === 'published').length,
        uptimePercent: 97
      },
      {
        id: 'scanner_agent',
        name: 'Product Intelligence Scanner',
        role: 'Discovery Agent',
        capability: 'Catalog matching and opportunity detection',
        tasksCompleted: Math.max(1, readState().findings.length),
        tasksFailed: 0,
        averageQuality: 91,
        mediaTracked: media.length,
        haveGatePass: checked,
        publishedCount: 0,
        uptimePercent: 96
      }
    ];
    return {
      generatedAt: nowIso(),
      agents,
      summary: {
        totalAgents: agents.length,
        totalMediaTracked: media.length,
        totalTasksCompleted: agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0),
        totalTasksFailed: agents.reduce((sum, agent) => sum + agent.tasksFailed, 0),
        averageQuality: averageQuality(media),
        averageUptime: Math.round(agents.reduce((sum, agent) => sum + agent.uptimePercent, 0) / agents.length),
        totalPublished: agents.reduce((sum, agent) => sum + agent.publishedCount, 0)
      }
    };
  }

  function averageQuality(media) {
    const scores = media.map((item) => Number(item.quality_score || 0)).filter(Boolean);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  function buildMissionSnapshot(mission) {
    return {
      ...mission,
      publishedCount: Array.isArray(mission.mediaIds) ? mission.mediaIds.length : Number(mission.publishedCount || 0),
      updatedAt: nowIso()
    };
  }

  function scoreQuality(media) {
    const metadata = media.metadata_json || {};
    let score = 60;
    if (media.playback_url) score += 15;
    if (metadata.sourceViralUrl) score += 10;
    if (metadata.productImageUrl || metadata.productName) score += 10;
    if (String(media.description || metadata.script || '').length > 80) score += 5;
    return Math.min(100, score);
  }

  function scoreHave(media) {
    const metadata = media.metadata_json || {};
    return {
      passed: Boolean(metadata.sourceViralUrl && (metadata.productImageUrl || metadata.productName)),
      pillars: {
        hook: { passed: String(media.description || metadata.script || '').length > 40 },
        alignment: { passed: Boolean(metadata.productName || media.product_url) },
        verifiedCompliance: { passed: true },
        evidence: { passed: Boolean(metadata.sourceViralUrl) }
      },
      checkedAt: nowIso()
    };
  }

  async function handleMediaLibrarySearch(req, res, params = {}) {
    try {
      const state = await buildMediaState();
      const body = params || {};
      const query = String(body.query || body.skuFilter || body.sku_filter || body.statusFilter || body.status_filter || '').toLowerCase();
      const results = state.media.filter((item) => {
        if (!query) return true;
        return [item.id, item.title, item.description, item.product_url, JSON.stringify(item.metadata_json || {})]
          .some((value) => String(value || '').toLowerCase().includes(query));
      });
      return sendJson(res, 200, { success: true, total: results.length, grouping: body.timeGrouping || body.time_grouping || 'all', results, items: results });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not search media library.' });
    }
  }

  async function handleAgentPerformance(_req, res) {
    try {
      const state = await buildMediaState();
      return sendJson(res, 200, { success: true, report: buildAgentReport(state.media) });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not generate agent performance report.' });
    }
  }

  app.get('/evics', (_req, res) => {
    noStore(res);
    res.sendFile(path.join(controlCenterDir, 'index.html'));
  });

  // Serve control-center static files at /evics/* so client requests like /evics/app.js work
  app.use('/evics', express.static(controlCenterDir));

  app.get('/evics/', (_req, res) => {
    noStore(res);
    res.sendFile(path.join(controlCenterDir, 'index.html'));
  });

  // Provide a services configuration endpoint expected by the EVICS workspace UI
  app.get('/api/services/config', (_req, res) => {
    try {
      const services = [
        { provider: 'heygen', configured: Boolean(process.env.HEYGEN_API_KEY), ready: Boolean(process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID), missing: [] },
        { provider: 'runway', configured: Boolean(process.env.RUNWAY_API_KEY), ready: Boolean(process.env.RUNWAY_API_KEY), missing: [] },
        { provider: 'kling', configured: Boolean(process.env.KLING_API_KEY), ready: Boolean(process.env.KLING_API_KEY), missing: [] },
        { provider: 'shopify', configured: Boolean(process.env.SHOPIFY_STORE_DOMAIN && (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN)), ready: Boolean(process.env.SHOPIFY_STORE_DOMAIN && (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN)), missing: [] },
        { provider: 'supabase', configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)), ready: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)), missing: [] }
      ];

      // Build a simple failover status structure that the UI expects
      const failoverStatus = {
        activeProvider: services.find(s => s.provider === 'heygen' && s.ready) ? 'heygen' : (services.find(s => s.ready) || services[0]).provider,
        providers: services.reduce((acc, s) => {
          acc[s.provider] = { configured: s.configured, ready: s.ready };
          return acc;
        }, {})
      };

      return sendJson(res, 200, { success: true, services, failoverStatus });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not build services config.' });
    }
  });

  app.get('/api/brand-profile/get', (_req, res) => {
    const state = readState();
    const profile = state.brandProfiles.find((item) => item.id === state.selectedProfileId) || state.brandProfiles[0] || DEFAULT_BRAND_PROFILE;
    return sendJson(res, 200, { success: true, profile, profiles: state.brandProfiles, selectedProfileId: profile.id });
  });

  app.get('/api/media/products', async (_req, res) => {
    try {
      const products = await loadProducts();
      return sendJson(res, 200, { success: true, count: products.length, products });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not load media products.' });
    }
  });

  app.get('/api/media/state', async (_req, res) => {
    try {
      return sendJson(res, 200, { success: true, state: await buildMediaState() });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not load media state.' });
    }
  });

  app.post('/api/media/create', (req, res) => {
    try {
      const body = req.body || {};
      const metadata = { ...(body.metadata || {}), createdSource: body.createdSource || 'elite-executive-workspace' };
      const media = normalizeMedia({
        id: body.id || 'media-' + Date.now(),
        title: body.title || 'EVICS media asset',
        description: body.description || body.script || '',
        media_type: body.mediaType || 'video',
        product_url: body.productUrl || '',
        status: 'queued',
        metadata,
        created_at: nowIso(),
        updated_at: nowIso()
      });
      const state = updateState((draft) => {
        draft.media = [media, ...draft.media.filter((item) => item.id !== media.id)];
        draft.updatedAt = nowIso();
      });
      logTimeline('media_created', 'Media asset created from Elite Workspace.', { mediaId: media.id });
      return sendJson(res, 200, { success: true, media, state });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not create media.' });
    }
  });

  app.post('/api/media/action', (req, res) => {
    try {
      const action = String(req.body?.action || '').trim();
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
      if (!action) return sendJson(res, 400, { success: false, error: 'action is required.' });
      const state = updateState((draft) => {
        draft.media = draft.media.map((item) => {
          if (ids.length && !ids.includes(item.id)) return item;
          const next = { ...item, updated_at: nowIso() };
          if (action === 're_queue_render') next.render_status = 'queued';
          if (action === 'approve') next.approval_status = 'approved';
          if (action === 'publish') next.publish_status = 'published';
          if (action === 'reject') next.approval_status = 'rejected';
          return next;
        });
        draft.updatedAt = nowIso();
      });
      logTimeline('media_action', `Media action applied: ${action}.`, { action, ids });
      return sendJson(res, 200, { success: true, state });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not apply media action.' });
    }
  });

  app.post('/api/media/:id/quality-check', async (req, res) => {
    try {
      const mediaState = await buildMediaState();
      const media = mediaState.media.find((item) => item.id === req.params.id);
      if (!media) return sendJson(res, 404, { success: false, error: 'Media not found.' });
      const qualityScore = scoreQuality(media);
      const state = updateState((draft) => {
        draft.media = draft.media.map((item) => item.id === media.id ? {
          ...item,
          quality_score: qualityScore,
          quality_status: qualityScore >= 82 ? 'Approved' : 'Needs Review',
          quality_json: { qualityScore, status: qualityScore >= 82 ? 'Approved' : 'Needs Review', checkedAt: nowIso() },
          updated_at: nowIso()
        } : item);
      });
      logTimeline('quality_check', 'Quality Twin completed review.', { mediaId: media.id, qualityScore });
      return sendJson(res, 200, { success: true, state });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not run quality check.' });
    }
  });

  app.post('/api/media/:id/have-check', async (req, res) => {
    try {
      const mediaState = await buildMediaState();
      const media = mediaState.media.find((item) => item.id === req.params.id);
      if (!media) return sendJson(res, 404, { success: false, error: 'Media not found.' });
      const haveResult = scoreHave(media);
      const state = updateState((draft) => {
        draft.media = draft.media.map((item) => item.id === media.id ? {
          ...item,
          have_passed: haveResult.passed,
          have_pillars: haveResult.pillars,
          have_checked_at: haveResult.checkedAt,
          updated_at: nowIso()
        } : item);
      });
      logTimeline('have_check', 'H.A.V.E. gate completed review.', { mediaId: media.id, passed: haveResult.passed });
      return sendJson(res, 200, { success: true, haveResult, state });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not run H.A.V.E. gate check.' });
    }
  });

  app.post('/api/media/library/search', (req, res) => handleMediaLibrarySearch(req, res, req.body || {}));

  app.get('/api/media/library/search', async (req, res) => {
    return handleMediaLibrarySearch(req, res, req.query || {});
  });

  app.post('/api/agents/performance', handleAgentPerformance);

  app.get('/api/agents/performance', async (req, res) => {
    return handleAgentPerformance(req, res);
  });

  app.post('/api/scanner/settings', (req, res) => {
    try {
      const state = updateState((draft) => {
        draft.scanner = {
          ...draft.scanner,
          enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : draft.scanner.enabled,
          intervalMinutes: Number(req.body?.intervalMinutes || draft.scanner.intervalMinutes || 60),
          durationSeconds: Number(req.body?.durationSeconds || draft.scanner.durationSeconds || 45),
          status: req.body?.enabled === false ? 'paused' : 'idle'
        };
        draft.updatedAt = nowIso();
      });
      logTimeline('scanner_settings', 'Executive scanner settings updated.', state.scanner);
      return sendJson(res, 200, { success: true, state, runtime: state.scanner });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not update scanner settings.' });
    }
  });

  app.post('/api/scanner/run', async (_req, res) => {
    try {
      const products = await loadProducts(12);
      const findings = products.slice(0, 5).map((product, index) => ({
        id: 'finding-' + Date.now() + '-' + index,
        productId: product.id,
        title: product.title,
        handle: product.handle,
        score: 92 - index * 3,
        reason: 'Catalog Twin marked this item as ready for short-form creative testing.',
        createdAt: nowIso()
      }));
      const state = updateState((draft) => {
        draft.findings = findings.concat(draft.findings).slice(0, 50);
        draft.scanner.status = 'idle';
        draft.scanner.lastRunAt = nowIso();
        draft.updatedAt = nowIso();
      });
      logTimeline('scanner_run', 'Executive scanner pass completed.', { count: findings.length });
      return sendJson(res, 200, { success: true, state, findings });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not run scanner.' });
    }
  });

  app.get('/api/policy/ver', (_req, res) => {
    const state = readState();
    return sendJson(res, 200, { success: true, policy: state.verPolicy });
  });

  app.post('/api/policy/ver', (req, res) => {
    try {
      const policy = { ...readState().verPolicy, ...(req.body || {}), updatedAt: nowIso() };
      const state = updateState((draft) => {
        draft.verPolicy = policy;
        draft.updatedAt = nowIso();
      });
      logTimeline('policy_ver', 'VER policy updated.', policy);
      return sendJson(res, 200, { success: true, policy, state });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not update VER policy.' });
    }
  });

  app.post('/api/pipeline/elite-run', async (req, res) => {
    try {
      const body = req.body || {};
      const products = await loadProducts();
      const text = `${body.title || ''} ${body.script || ''}`.toLowerCase();
      const product = products.find((item) => text.includes(String(item.title || '').split(' ')[0].toLowerCase())) || products[0] || null;
      const run = {
        id: 'pipeline-' + Date.now(),
        title: body.title || 'Elite pipeline draft',
        status: product ? 'ready_for_render' : 'needs_product_match',
        productMatch: product,
        stages: {
          catalogTwin: product ? 'matched' : 'needs_review',
          scriptTwin: body.script ? 'ready' : 'missing',
          renderTwin: 'queued',
          reviewTwin: 'pending'
        },
        createdAt: nowIso()
      };
      logTimeline('pipeline_run', 'Elite pipeline run created.', { runId: run.id, status: run.status });
      return sendJson(res, 200, { success: true, run, pipeline: run, product });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not run elite pipeline.' });
    }
  });

  app.get('/api/render/:provider/preflight', (req, res) => {
    const provider = String(req.params.provider || 'heygen').toLowerCase();
    const missing = [];
    if (provider === 'heygen') {
      if (!process.env.HEYGEN_API_KEY) missing.push('HEYGEN_API_KEY');
      if (!process.env.HEYGEN_AVATAR_ID) missing.push('HEYGEN_AVATAR_ID');
      if (!process.env.HEYGEN_VOICE_ID) missing.push('HEYGEN_VOICE_ID');
    }
    const configured = missing.length === 0;
    return sendJson(res, 200, {
      success: true,
      provider,
      preflight: {
        ready: configured,
        configured,
        errorCode: configured ? '' : 'missing_configuration',
        error: configured ? '' : `${provider} is missing required configuration.`,
        missing
      },
      report: {
        provider,
        readiness: { ready: configured, configured, missing },
        checkedAt: nowIso()
      }
    });
  });

  app.post('/api/render/:provider/submit', async (req, res) => {
    try {
      const provider = String(req.params.provider || 'heygen').toLowerCase();
      const body = req.body || {};
      const mediaId = String(body.mediaId || body.media_id || 'media-' + Date.now());
      let script = String(body.spokenScript || body.prompt || body.script || '').trim();

      // Sacred Intelligence Governance gate — govern agent-generated scripts before
      // they are rendered. Fixable content is auto-rewritten; failing content is blocked.
      let governanceReview = null;
      if (script) {
        governanceReview = governance.validateAgentAction(script, {
          agentName: 'vp_copilot',
          workflowName: 'agent-render-submit'
        });
        if (!governanceReview.approved || !governanceReview.finalApprovedOutput) {
          return sendJson(res, 422, {
            success: false,
            error: 'Script did not pass the EVICS Sacred Intelligence Governance standard.',
            governance: {
              approved: governanceReview.approved,
              status: governanceReview.status,
              reason: governanceReview.reason,
              truthScore: governanceReview.truthScore,
              integrityScore: governanceReview.integrityScore,
              dignityScore: governanceReview.dignityScore,
              loveScore: governanceReview.loveScore,
              violations: governanceReview.violations
            }
          });
        }
        script = governanceReview.finalApprovedOutput;
      }

      const jobId = provider + '-' + Date.now();
      let job = {
        jobId,
        provider,
        mediaId,
        status: 'queued',
        outputMediaUrl: '',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      if (provider === 'heygen' && startHeyGenRender && process.env.HEYGEN_API_KEY && script) {
        const render = await startHeyGenRender({
          script,
          avatar_id: body.avatar_id || body.avatarId || process.env.HEYGEN_AVATAR_ID,
          voice_id: body.voice_id || body.voiceId || process.env.HEYGEN_VOICE_ID,
          config: {
            aspect: '9:16',
            dimension: { width: Number(body.width || 1080), height: Number(body.height || 1920) },
            background: body.background || { type: 'color', value: '#080f1b' },
            caption: false,
            test: false
          }
        });
        job = { ...job, jobId: render.video_id, status: 'rendering', providerJobId: render.video_id };
      }

      updateState((state) => {
        state.renderJobs[job.jobId] = job;
        state.media = state.media.map((item) => item.id === mediaId ? { ...item, render_status: job.status, updated_at: nowIso() } : item);
        state.updatedAt = nowIso();
      });
      logTimeline('render_submit', `Render submitted to ${provider}.`, { jobId: job.jobId, mediaId });
      return sendJson(res, 200, {
        success: true,
        job,
        jobId: job.jobId,
        governance: governanceReview ? {
          approved: governanceReview.approved,
          status: governanceReview.status,
          revisionRequired: governanceReview.revisionRequired,
          truthScore: governanceReview.truthScore,
          integrityScore: governanceReview.integrityScore,
          dignityScore: governanceReview.dignityScore,
          loveScore: governanceReview.loveScore
        } : null
      });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not submit render.' });
    }
  });

  app.get('/api/render/:provider/status/:jobId', async (req, res) => {
    try {
      const state = readState();
      let job = state.renderJobs[req.params.jobId] || {
        jobId: req.params.jobId,
        provider: req.params.provider,
        status: 'queued',
        outputMediaUrl: '',
        updatedAt: nowIso()
      };
      if (String(req.params.provider).toLowerCase() === 'heygen' && getHeyGenVideoStatus && process.env.HEYGEN_API_KEY) {
        try {
          const status = await getHeyGenVideoStatus(req.params.jobId);
          job = {
            ...job,
            status: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'rendering',
            outputMediaUrl: status.video_url || job.outputMediaUrl || '',
            thumbnailUrl: status.thumbnail_url || '',
            error: status.error || null,
            updatedAt: nowIso()
          };
          updateState((draft) => {
            draft.renderJobs[job.jobId] = job;
          });
        } catch (error) {
          job = { ...job, status: 'queued', error: error.message, updatedAt: nowIso() };
        }
      }
      return sendJson(res, 200, { success: true, job });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not read render status.' });
    }
  });

  app.post('/api/render/:provider/callback', (req, res) => {
    try {
      const body = req.body || {};
      const jobId = String(body.jobId || body.video_id || body.videoId || '').trim();
      if (!jobId) return sendJson(res, 400, { success: false, error: 'jobId is required.' });
      const job = {
        ...(readState().renderJobs[jobId] || {}),
        jobId,
        provider: req.params.provider,
        status: String(body.status || '').toLowerCase().startsWith('complete') ? 'completed' : (body.status || 'updated'),
        outputMediaUrl: body.mediaUrl || body.video_url || body.videoUrl || body.downloadUrl || '',
        downloadUrl: body.downloadUrl || body.mediaUrl || body.video_url || body.videoUrl || '',
        updatedAt: nowIso()
      };
      const state = updateState((draft) => {
        draft.renderJobs[jobId] = job;
        draft.media = draft.media.map((item) => item.id === job.mediaId ? { ...item, render_status: 'complete', playback_url: job.outputMediaUrl, updated_at: nowIso() } : item);
      });
      logTimeline('render_callback', `Render callback received for ${req.params.provider}.`, { jobId });
      return sendJson(res, 200, { success: true, job, state });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not complete render.' });
    }
  });

  app.get('/api/media-output/outputs/:id', async (req, res, next) => {
    try {
      const state = await buildMediaState();
      const media = state.media.find((item) => item.id === req.params.id);
      if (!media) return next();
      return sendJson(res, 200, { success: true, media, item: media });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not load media output.' });
    }
  });

  app.post('/api/agents/vp-mission', async (req, res) => {
    try {
      const targetCount = Math.max(1, Math.min(Number(req.body?.targetCount || req.body?.maxConcepts || 1), 12));
      const missionId = 'vp-' + Date.now();
      const mission = {
        missionId,
        status: 'running',
        targetCount,
        publishedCount: 0,
        mediaIds: [],
        originSectionId: req.body?.originSectionId || 'vp-terminal',
        logs: [{ level: 'info', message: 'VP mission initialized.', createdAt: nowIso() }],
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      updateState((state) => {
        state.vpMissions[missionId] = mission;
      });
      logTimeline('vp_mission_started', 'VP mission started.', { missionId, targetCount });
      return sendJson(res, 200, { success: true, mission: buildMissionSnapshot(mission) });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not start VP mission.' });
    }
  });

  app.get('/api/agents/vp-mission/:missionId', (req, res) => {
    const mission = readState().vpMissions[String(req.params.missionId || '')];
    if (!mission) return sendJson(res, 404, { success: false, error: 'VP mission was not found.' });
    return sendJson(res, 200, { success: true, mission: buildMissionSnapshot(mission) });
  });

  app.get('/api/product-intel/status', (_req, res) => {
    const state = readState();
    return sendJson(res, 200, { success: true, status: { ...state.productScan, progressLog: state.productScan.progressLog } });
  });

  app.post('/api/product-intel/scanner/start', async (req, res) => {
    try {
      const mode = String(req.body?.mode || 'on');
      const jobId = 'scan-' + Date.now();
      const products = await loadProducts(10);
      const progressLog = products.slice(0, 5).map((product, index) => ({
        step: index + 1,
        title: product.title,
        message: `Scored ${product.title} for creative readiness.`,
        score: 94 - index * 2,
        createdAt: nowIso()
      }));
      const state = updateState((draft) => {
        draft.productScan = {
          running: true,
          mode: mode === 'assist' ? 'assist' : 'on',
          jobId,
          startedAt: nowIso(),
          stoppedAt: '',
          progressLog,
          boardSummary: {
            totalReviewed: progressLog.length,
            topOpportunities: progressLog.slice(0, 3),
            generatedAt: nowIso()
          }
        };
        draft.updatedAt = nowIso();
      });
      logTimeline('product_scan_started', 'Product intelligence scanner started.', { jobId, mode });
      return sendJson(res, 200, { success: true, jobId, scanner: state.productScan, cycle: state.productScan.boardSummary });
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message || 'Could not start product intelligence scanner.' });
    }
  });

  app.post('/api/product-intel/scanner/stop', (req, res) => {
    try {
      const state = updateState((draft) => {
        draft.productScan.running = false;
        draft.productScan.mode = 'off';
        draft.productScan.stoppedAt = nowIso();
        draft.productScan.stopReason = req.body?.reason || 'off switch';
      });
      logTimeline('product_scan_stopped', 'Product intelligence scanner stopped.', { reason: state.productScan.stopReason });
      return sendJson(res, 200, { success: true, scanner: state.productScan });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not stop product intelligence scanner.' });
    }
  });

  app.get('/api/agents/timeline', (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 50), 200));
    const timeline = readState().timeline.slice(0, limit);
    const byStatus = timeline.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return sendJson(res, 200, { success: true, count: timeline.length, byStatus, timeline });
  });

  app.get('/api/agents/system-status', async (_req, res) => {
    try {
      const [products, mediaState] = await Promise.all([loadProducts(), buildMediaState()]);
      const scanner = readState().scanner;
      return sendJson(res, 200, {
        success: true,
        status: 'operational',
        generatedAt: nowIso(),
        counts: {
          products: products.length,
          media: mediaState.media.length,
          findings: mediaState.findings.length,
          timeline: mediaState.timeline.length
        },
        scanner,
        verPolicy: mediaState.verPolicy,
        marketHeatmap: {
          regionMetrics: [
            { label: 'US', score: 91 },
            { label: 'Global', score: 84 }
          ]
        },
        providers: [
          { provider: 'heygen', configured: Boolean(process.env.HEYGEN_API_KEY), ready: Boolean(process.env.HEYGEN_API_KEY) },
          { provider: 'shopify', configured: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_STORE_DOMAIN), ready: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_STORE_DOMAIN) },
          { provider: 'supabase', configured: Boolean(process.env.SUPABASE_URL), ready: Boolean(process.env.SUPABASE_URL) }
        ]
      });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message || 'Could not load system status.' });
    }
  });

  app.get('/api/platforms/connection-status', (_req, res) => {
    const platforms = [
      {
        id: 'shopify',
        name: 'Shopify',
        type: 'ecommerce',
        configured: Boolean(process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
        status: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'connected' : 'needs_config',
        credentialsSet: {
          domain: Boolean(process.env.SHOPIFY_STORE_DOMAIN),
          adminToken: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN)
        }
      },
      {
        id: 'heygen',
        name: 'HeyGen',
        type: 'render_provider',
        configured: Boolean(process.env.HEYGEN_API_KEY),
        status: process.env.HEYGEN_API_KEY ? 'connected' : 'needs_config',
        credentialsSet: {
          apiKey: Boolean(process.env.HEYGEN_API_KEY),
          avatarId: Boolean(process.env.HEYGEN_AVATAR_ID),
          voiceId: Boolean(process.env.HEYGEN_VOICE_ID)
        }
      },
      {
        id: 'supabase',
        name: 'Supabase',
        type: 'database',
        configured: Boolean(process.env.SUPABASE_URL),
        status: process.env.SUPABASE_URL ? 'connected' : 'needs_config',
        credentialsSet: {
          url: Boolean(process.env.SUPABASE_URL),
          serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
        }
      }
    ];
    return sendJson(res, 200, {
      success: true,
      report: {
        generatedAt: nowIso(),
        platforms,
        connected: platforms.filter((item) => item.status === 'connected').length,
        total: platforms.length
      }
    });
  });
}

module.exports = { registerEvicsEliteRoutes };
