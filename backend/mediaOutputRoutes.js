const fs = require('fs');
const path = require('path');
const { buildPublicMediaUrlFromReference } = require('./mediaUrl');

let renderQualityValidator = null;
try {
  renderQualityValidator = require('./renderQualityValidator');
} catch (e) {
  // optional
}

let mediaRenderCreator = null;
try {
  mediaRenderCreator = require('./mediaRenderCreator');
} catch (e) {
  // optional — endpoint will 503 if missing
}
const A_PLUS_RENDER_MINIMUM =
  (renderQualityValidator && renderQualityValidator.A_PLUS_RENDER_MINIMUM) || 95;

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

function parseJsonMaybe(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function autoApproveEnabled() {
  const v = String(process.env.AUTO_APPROVE_APLUS || '').trim().toLowerCase();
  if (!v) return true;
  return !['false', '0', 'off', 'no'].includes(v);
}

function tierFromScore(score) {
  const s = Number(score) || 0;
  if (s >= A_PLUS_RENDER_MINIMUM) return 'A+';
  if (s >= 92) return 'A';
  if (s >= 85) return 'B+';
  return 'needs-review';
}

function tierLabel(tier) {
  if (tier === 'A+') return 'A+ Elite';
  if (tier === 'A') return 'A Grade';
  if (tier === 'B+') return 'B+ Grade';
  return 'Needs Review';
}

function normalizeMediaOutput(row) {
  const params = parseJsonMaybe(row.parameters, {});
  const mediaType = row.media_type === 'ugc' ? 'video' : row.media_type || params.mediaType || 'video';
  const playbackUrl = row.video_url || row.vault_destination || params.playbackUrl || params.videoUrl || null;
  const posterUrl = row.thumbnail_url || params.posterUrl || params.thumbnailUrl || null;
  const storageUrl = resolveStorageLink(row.storage_url || row.gcs_url || params.storageUrl || params.storagePath, playbackUrl);
  const productUrl = row.product_url || params.productUrl || params.product_url || buildShopifyProductUrl(row, params);
  const width = Number(row.width || params.width || params.dimension?.width || 0) || null;
  const height = Number(row.height || params.height || params.dimension?.height || 0) || null;
  const readinessScore = Number(row.render_grade || row.score || params.readinessScore || params.qualityScore || 0) || 0;
  const grade = readinessScore;
  const tier = params.tier || tierFromScore(grade);
  const status = row.status || 'pending';
  const approvedState = params.approvedState || (status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending');

  return {
    id: String(row.id || row.job_id || row.video_id),
    title: row.render_name || row.product_name || row.script || row.script_text || `${row.platform || 'EVICS'} output`,
    mediaType,
    playbackUrl,
    posterUrl,
    storageUrl,
    previewUrl: params.previewUrl || playbackUrl,
    sourceProvider: row.platform || row.source || params.sourceProvider || 'EVICS',
    providerPackage: row.product_name || row.product || params.providerPackage || null,
    productUrl,
    ctaText: params.ctaText || params.buyNowText || 'Buy Now',
    ctaStartOffsetSeconds: Number(params.ctaStartOffsetSeconds || params.cta_window_seconds || 9) || 9,
    status,
    workflowMode: params.workflowMode || 'review',
    renderState: status || params.renderState || 'pending',
    platformRoutes: params.platformRoutes || [],
    approvedState,
    readinessScore,
    grade,
    tier,
    tierLabel: tierLabel(tier),
    aPlusMinimum: A_PLUS_RENDER_MINIMUM,
    approvedForPublishing: grade >= A_PLUS_RENDER_MINIMUM || approvedState === 'approved',
    vpDecision: params.vpDecision || null,
    vpDecisionAt: params.vpDecisionAt || null,
    vpDecisionReason: params.vpDecisionReason || null,
    vpDecisionActor: params.vpDecisionActor || null,
    autonomyMode: autoApproveEnabled() ? 'auto-approve-a-plus' : 'manual',
    createdAt: row.created_at || row.updated_at || null,
    duration: Number(row.duration || params.duration || 0) || null,
    width,
    height,
    tags: params.tags || [row.platform, row.media_type].filter(Boolean),
    notes: params.notes || '',
    qaFlags: params.qaFlags || [],
    storageLifecycle: params.storageLifecycle || (playbackUrl ? 'active' : 'pending'),
    migrationState: params.migrationState || row.source || 'evics',
    variants: params.variants || [],
    qaInstructions: params.qaInstructions || {}
  };
}

function buildStorageUrl(value) {
  return buildPublicMediaUrlFromReference(value);
}

function resolveStorageLink(value, fallbackPlayback = null) {
  const candidate = nullIfBlank(value);
  if (!candidate) return buildPublicMediaUrlFromReference(fallbackPlayback);
  return buildPublicMediaUrlFromReference(candidate);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildShopifyProductUrl(row, params) {
  const store = process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE || 'https://iamgenesistech.com';
  const handle = params.productHandle || row.product_handle || row.handle || null;
  if (!handle) return null;
  const base = String(store).replace(/\/+$/, '');
  return `${base}/products/${handle}`;
}

function nullIfBlank(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function parseGcsUri(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith('gs://')) {
    const rest = raw.slice('gs://'.length);
    const idx = rest.indexOf('/');
    if (idx < 1) return null;
    return { bucket: rest.slice(0, idx), object: rest.slice(idx + 1) };
  }
  try {
    const u = new URL(raw);
    if (u.host === 'storage.googleapis.com' && u.pathname.length > 1) {
      const parts = u.pathname.replace(/^\/+/, '').split('/');
      if (parts.length >= 2) {
        return { bucket: parts.shift(), object: parts.join('/') };
      }
    }
    if (u.host.endsWith('.storage.googleapis.com')) {
      const bucket = u.host.replace('.storage.googleapis.com', '');
      const object = u.pathname.replace(/^\/+/, '');
      if (bucket && object) return { bucket, object };
    }
  } catch (_e) {
    return null;
  }
  return null;
}

async function tryDeleteGcsObject(url) {
  const parsed = parseGcsUri(url);
  if (!parsed) return { attempted: false, deleted: false, reason: 'not-gcs-url' };
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage();
    const [result] = await storage.bucket(parsed.bucket).file(parsed.object).delete({ ignoreNotFound: true });
    return { attempted: true, deleted: true, bucket: parsed.bucket, object: parsed.object };
  } catch (e) {
    return { attempted: true, deleted: false, error: e.message || String(e), bucket: parsed.bucket, object: parsed.object };
  }
}

function isAdminAuthorized(req) {
  const expected = String(process.env.ADMIN_API_KEY || process.env.EVICS_ADMIN_KEY || '').trim();
  if (!expected) return false;
  const provided = String(req.headers['x-admin-key'] || req.headers['x-api-key'] || '').trim();
  return provided.length > 0 && provided === expected;
}

function registerMediaOutputRoutes(app, SupabaseConnector) {
  async function fetchMediaOutputById(id) {
    // Try Supabase first
    try {
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (!error && data && data[0]) return data[0];
    } catch (e) {
      console.warn('Supabase fetch failed:', e && e.message ? e.message : String(e));
    }

    // Fallback to local persisted file (generated/local_evics_renders.json)
    try {
      const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
      if (fs.existsSync(localPath)) {
        const arr = JSON.parse(fs.readFileSync(localPath, 'utf8')) || [];
        return arr.find((r) => String(r.id) === String(id)) || null;
      }
    } catch (_e) { /* ignore */ }
    return null;
  }

  async function pushToPublishingQueue(outputRow) {
    try {
      const params = parseJsonMaybe(outputRow.parameters, {});
      const payload = {
        creative_id: String(outputRow.id),
        product_name: outputRow.product_name || params.productTitle || null,
        video_url: outputRow.video_url || params.playbackUrl || null,
        thumbnail_url: outputRow.thumbnail_url || params.posterUrl || null,
        channel: 'VP-Approved',
        status: 'queued',
        created_at: new Date().toISOString()
      };
      const { error } = await SupabaseConnector.from('publishing_queue').insert([payload]);
      if (error) throw error;
      return { queued: true };
    } catch (e) {
      // fallback to local file
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_publishing_queue.json');
        const existing = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, 'utf8')) : [];
        existing.push({
          creative_id: String(outputRow.id),
          product_name: outputRow.product_name || null,
          video_url: outputRow.video_url || null,
          thumbnail_url: outputRow.thumbnail_url || null,
          channel: 'VP-Approved',
          status: 'queued',
          created_at: new Date().toISOString(),
          fallbackReason: e.message || String(e)
        });
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, JSON.stringify(existing, null, 2));
      } catch (_) { /* ignore fallback failure */ }
      return { queued: false, fallback: true, reason: e.message || String(e) };
    }
  }

  async function logMediaOutputEvent(outputId, action, payload) {
    try {
      const { error } = await SupabaseConnector.from('evics_media_audit_logs').insert([{
        output_id: outputId,
        action,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
    } catch (_) {
      // best-effort audit
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_media_audit.jsonl');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.appendFileSync(localPath, JSON.stringify({ outputId, action, payload, at: new Date().toISOString() }) + '\n');
      } catch (_e) { /* ignore */ }
    }
  }

  app.get('/api/media-output/outputs', async (_req, res) => {
    try {
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      let rows = [];
      if (!error && Array.isArray(data)) rows = data;

      if (!rows.length) {
        try {
          const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
          if (fs.existsSync(localPath)) {
            rows = JSON.parse(fs.readFileSync(localPath, 'utf8')) || [];
          }
        } catch (_e) { /* ignore */ }
      }

      const items = rows.map(normalizeMediaOutput);
      const total = items.length;
      const awaitingReview = items.filter((i) => i.status === 'awaiting_review').length;
      const approved = items.filter((i) => i.approvedState === 'approved').length;
      const rejected = items.filter((i) => i.approvedState === 'rejected').length;
      const aPlus = items.filter((i) => i.tier === 'A+').length;

      noStore(res);
      res.json({
        success: true,
        items,
        count: total,
        summary: {
          total,
          awaitingReview,
          approved,
          rejected,
          aPlus,
          aPlusMinimum: A_PLUS_RENDER_MINIMUM
        },
        autonomyMode: autoApproveEnabled() ? 'auto-approve-a-plus' : 'manual',
        aPlusMinimum: A_PLUS_RENDER_MINIMUM
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get('/api/media-output/outputs/:id', async (req, res) => {
    try {
      const row = await fetchMediaOutputById(req.params.id);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const output = normalizeMediaOutput(row);
      noStore(res);
      res.json({ success: true, output });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get('/api/media-output/outputs/:id/gcs-info', async (req, res) => {
    try {
      const row = await fetchMediaOutputById(req.params.id);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const params = parseJsonMaybe(row.parameters, {});
      const videoUrl = row.video_url || row.vault_destination || params.playbackUrl || null;
      const posterUrl = row.thumbnail_url || params.posterUrl || null;
      noStore(res);
      res.json({
        success: true,
        id: String(row.id),
        video: {
          url: videoUrl,
          gcs: parseGcsUri(videoUrl)
        },
        poster: {
          url: posterUrl,
          gcs: parseGcsUri(posterUrl)
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/actions', async (req, res) => {
    try {
      const outputId = String(req.params.id);
      const { action, notes } = req.body || {};
      if (!action) return res.status(400).json({ success: false, error: 'action is required.' });

      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      const params = parseJsonMaybe(row.parameters, {});
      params.lastAction = action;
      params.lastActionAt = new Date().toISOString();
      if (notes) params.lastActionNotes = String(notes);

      let status = row.status;
      if (action === 'approve') status = 'approved';
      else if (action === 'reject') status = 'rejected';
      else if (action === 'reset') status = 'awaiting_review';

      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update({ status, parameters: params })
        .eq('id', outputId)
        .select('*')
        .single();

      if (error) throw error;

      await logMediaOutputEvent(outputId, action, { notes, previousStatus: row.status, newStatus: status });

      noStore(res);
      res.json({ success: true, output: normalizeMediaOutput(data) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/vp-decision', async (req, res) => {
    try {
      const outputId = String(req.params.id);
      const { decision, reason, actor } = req.body || {};
      const dec = String(decision || '').toLowerCase();
      if (!['approve', 'deny', 'reject'].includes(dec)) {
        return res.status(400).json({ success: false, error: 'decision must be approve or deny.' });
      }
      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      const params = parseJsonMaybe(row.parameters, {});
      const newStatus = dec === 'approve' ? 'approved' : 'rejected';
      params.vpDecision = dec === 'approve' ? 'approved' : 'rejected';
      params.vpDecisionAt = new Date().toISOString();
      params.vpDecisionReason = reason ? String(reason) : null;
      params.vpDecisionActor = actor ? String(actor) : (req.headers['x-actor'] || 'vp');
      params.approvedState = newStatus === 'approved' ? 'approved' : 'rejected';

      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update({ status: newStatus, parameters: params })
        .eq('id', outputId)
        .select('*')
        .single();
      if (error) throw error;

      let publishing = { queued: false };
      if (newStatus === 'approved') publishing = await pushToPublishingQueue(data);

      await logMediaOutputEvent(outputId, `vp-${dec}`, { reason, actor: params.vpDecisionActor, publishing });

      noStore(res);
      res.json({ success: true, output: normalizeMediaOutput(data), publishing });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.patch('/api/media-output/outputs/:id', async (req, res) => {
    try {
      const outputId = String(req.params.id);
      const body = req.body || {};
      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      const params = parseJsonMaybe(row.parameters, {});
      const patch = {};
      if (body.title !== undefined) patch.render_name = String(body.title || '');
      if (body.notes !== undefined) params.notes = String(body.notes || '');
      if (body.ctaText !== undefined) params.ctaText = String(body.ctaText || '');
      if (body.productUrl !== undefined) patch.product_url = String(body.productUrl || '');
      if (body.tags !== undefined) params.tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
      patch.parameters = params;

      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update(patch)
        .eq('id', outputId)
        .select('*')
        .single();
      if (error) throw error;
      await logMediaOutputEvent(outputId, 'edit', { patch: body });
      noStore(res);
      res.json({ success: true, output: normalizeMediaOutput(data) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.delete('/api/media-output/outputs/:id', async (req, res) => {
    try {
      if (!isAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      const outputId = String(req.params.id);
      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      const params = parseJsonMaybe(row.parameters, {});
      const videoUrl = row.video_url || row.vault_destination || params.playbackUrl || null;
      const posterUrl = row.thumbnail_url || params.posterUrl || null;

      let supabaseDeleted = false;
      try {
        const { error } = await SupabaseConnector
          .from('evics_renders')
          .delete()
          .eq('id', outputId);
        if (!error) supabaseDeleted = true;
      } catch (_e) { /* ignore */ }

      let localDeleted = false;
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
        if (fs.existsSync(localPath)) {
          const arr = JSON.parse(fs.readFileSync(localPath, 'utf8')) || [];
          const filtered = arr.filter((r) => String(r.id) !== outputId);
          if (filtered.length !== arr.length) {
            fs.writeFileSync(localPath, JSON.stringify(filtered, null, 2));
            localDeleted = true;
          }
        }
      } catch (_e) { /* ignore */ }

      const gcsVideo = await tryDeleteGcsObject(videoUrl);
      const gcsPoster = await tryDeleteGcsObject(posterUrl);

      await logMediaOutputEvent(outputId, 'delete', { supabaseDeleted, localDeleted, gcsVideo, gcsPoster });

      noStore(res);
      res.json({
        success: true,
        id: outputId,
        supabaseDeleted,
        localDeleted,
        gcsDeleted: gcsVideo.deleted || gcsPoster.deleted,
        gcs: { video: gcsVideo, poster: gcsPoster }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/auto-grade-batch', async (req, res) => {
    try {
      if (!isAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      if (!renderQualityValidator || typeof renderQualityValidator.gradeCompletedRender !== 'function') {
        return res.status(503).json({ success: false, error: 'renderQualityValidator is not available.' });
      }

      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];

      let scanned = 0;
      let regraded = 0;
      let autoApproved = 0;
      let awaitingReview = 0;
      const details = [];

      for (const row of rows) {
        scanned++;
        const params = parseJsonMaybe(row.parameters, {});
        const videoUrl = row.video_url || row.vault_destination || params.playbackUrl || null;
        const thumbnailUrl = row.thumbnail_url || params.posterUrl || null;
        const duration = Number(row.duration || params.duration || 0) || null;
        const scriptQuality = params.scriptQuality || null;

        const grade = renderQualityValidator.gradeCompletedRender({
          videoUrl, thumbnailUrl, duration, scriptQuality
        });

        params.tier = grade.tier;
        params.tierLabel = grade.tier === 'A+' ? 'A+ Elite' : tierLabel(grade.tier);
        params.gradeEvidence = grade.evidence;
        params.aPlusMinimum = A_PLUS_RENDER_MINIMUM;
        params.autonomyMode = autoApproveEnabled() ? 'auto-approve-a-plus' : 'manual';

        const shouldAutoApprove = autoApproveEnabled() && grade.tier === 'A+' && grade.approvedForPublishing;
        const nextStatus = shouldAutoApprove ? 'approved' : 'awaiting_review';
        params.approvedState = shouldAutoApprove ? 'approved' : 'pending';

        try {
          const { data: updated, error: upErr } = await SupabaseConnector
            .from('evics_renders')
            .update({ status: nextStatus, render_grade: grade.score, parameters: params })
            .eq('id', row.id)
            .select('*')
            .single();
          if (upErr) throw upErr;
          regraded++;
          if (nextStatus === 'approved') {
            autoApproved++;
            await pushToPublishingQueue(updated);
          } else {
            awaitingReview++;
          }
          details.push({ id: String(row.id), grade: grade.score, tier: grade.tier, status: nextStatus });
        } catch (upErr) {
          details.push({ id: String(row.id), error: upErr.message || String(upErr) });
        }
      }

      await logMediaOutputEvent(null, 'auto-grade-batch', { scanned, regraded, autoApproved, awaitingReview });

      noStore(res);
      res.json({
        success: true,
        summary: { scanned, regraded, autoApproved, awaitingReview, aPlusMinimum: A_PLUS_RENDER_MINIMUM },
        details
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/render-route', async (req, res) => {
    try {
      const outputId = String(req.params.id);
      const { platform, route, action } = req.body || {};
      if (!platform || !route) {
        return res.status(400).json({ success: false, error: 'platform and route are required.' });
      }
      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const params = parseJsonMaybe(row.parameters, {});
      params.platformRoutes = Array.isArray(params.platformRoutes) ? params.platformRoutes : [];
      params.platformRoutes.push({ platform, route, action: action || 'route', at: new Date().toISOString() });
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update({ parameters: params })
        .eq('id', outputId)
        .select('*')
        .single();
      if (error) throw error;
      await logMediaOutputEvent(outputId, 'render-route', { platform, route, action });
      noStore(res);
      res.json({ success: true, output: normalizeMediaOutput(data) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/qa', async (req, res) => {
    try {
      const outputId = String(req.params.id);
      const { qaFlag, note } = req.body || {};
      if (!qaFlag) return res.status(400).json({ success: false, error: 'qaFlag is required.' });
      const row = await fetchMediaOutputById(outputId);
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const params = parseJsonMaybe(row.parameters, {});
      params.qaFlags = Array.isArray(params.qaFlags) ? params.qaFlags : [];
      params.qaFlags.push({ flag: qaFlag, note: note || '', at: new Date().toISOString() });
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update({ parameters: params })
        .eq('id', outputId)
        .select('*')
        .single();
      if (error) throw error;
      await logMediaOutputEvent(outputId, 'qa-flag', { qaFlag, note });
      noStore(res);
      res.json({ success: true, output: normalizeMediaOutput(data) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  // POST /api/media-output/create-render
  // Runs the REAL render pipeline end-to-end:
  //   1. Resolves product context (from body.product or defaults)
  //   2. Generates + auto-upgrades the presenter script to A+
  //   3. Submits to HeyGen and polls to completion (real video)
  //   4. Grades the finished render (video/thumbnail/duration/script)
  //   5. Persists to evics_renders with real video_url + parameters
  //   6. If A+ AND AUTO_APPROVE_APLUS=true -> auto-approves + queues
  // Body: { product?: {title,url,imageUrl,handle}, script?, avatarId?,
  //         voiceId?, aspect?, test?: boolean, timeoutMs? }
  // Admin-gated: requires x-admin-key header matching ADMIN_API_KEY.
  // Note: production renders take 1-4 minutes; Cloud Run timeout on this
  // service is 300s. Use test:true for smoke-tests.
  app.post('/api/media-output/create-render', async (req, res) => {
    try {
      if (!isAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      if (!mediaRenderCreator || typeof mediaRenderCreator.createProductVideoRender !== 'function') {
        return res.status(503).json({ success: false, error: 'mediaRenderCreator is not available on this deployment.' });
      }
      if (!SupabaseConnector) {
        return res.status(503).json({ success: false, error: 'Supabase is not configured; cannot persist render.' });
      }
      const body = req.body || {};
      const opts = {
        product: body.product || null,
        script: body.script || null,
        avatarId: body.avatarId || body.avatar_id || null,
        voiceId: body.voiceId || body.voice_id || null,
        aspect: body.aspect || '9:16',
        test: body.test === true,
        timeoutMs: Number(body.timeoutMs) || Number(body.timeout_ms) || 0,
        actor: body.actor || req.headers['x-actor'] || 'admin'
      };
      const result = await mediaRenderCreator.createProductVideoRender(opts, SupabaseConnector, console);
      try {
        await logMediaOutputEvent(String(result.id), 'render.created', {
          status: result.status,
          grade: result.grade && result.grade.score,
          tier: result.grade && result.grade.tier,
          heygenVideoId: result.heygen && result.heygen.video_id,
          autoApproved: result.autoApproved,
          actor: opts.actor,
          test: opts.test
        });
      } catch (_e) { /* audit log is best-effort */ }
      noStore(res);
      const normalized = result.row ? normalizeMediaOutput(result.row) : null;
      res.json({
        success: true,
        id: result.id,
        status: result.status,
        grade: result.grade,
        autoApproved: result.autoApproved,
        publishing: result.publishing,
        heygen: result.heygen,
        output: normalized
      });
    } catch (err) {
      console.error('[media-output/create-render] failed:', err && err.stack ? err.stack : err);
      const code = err && err.code ? err.code : 'RENDER_FAILED';
      const status = code === 'RENDERER_UNAVAILABLE' || code === 'SUPABASE_UNAVAILABLE' ? 503 :
                     code === 'HEYGEN_AUTH_MISSING' ? 502 : 500;
      res.status(status).json({
        success: false,
        error: err && err.message ? err.message : String(err),
        code,
        detail: err && err.detail ? err.detail : undefined
      });
    }
  });

  app.post('/api/media-output/telemetry', async (req, res) => {
    try {
      const action = nullIfBlank(req.body.action);
      if (!action) return res.status(400).json({ success: false, error: 'action is required.' });

      const outputId = nullIfBlank(req.body.outputId || req.body.output_id);
      const payload = req.body.payload || {};
      await logMediaOutputEvent(outputId, action, payload);

      noStore(res);
      res.json({ success: true, tracked: true, action, outputId });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });
}

module.exports = {
  registerMediaOutputRoutes,
  normalizeMediaOutput,
  A_PLUS_RENDER_MINIMUM
};
