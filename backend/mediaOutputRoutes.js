const fs = require('fs');
const path = require('path');
const { buildPublicMediaUrlFromReference } = require('./mediaUrl');

let renderQualityValidator = null;
try {
  renderQualityValidator = require('./renderQualityValidator');
} catch (e) {
  // optional
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
  return {
    'A+': 'A+ Elite Viral',
    'A': 'A grade',
    'B+': 'B+ grade',
    'needs-review': 'Needs review'
  }[tier] || tier || 'Ungraded';
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
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildShopifyProductUrl(row, params) {
  const explicitHandle = row.handle || row.product_handle || params.handle || params.productHandle;
  const title = row.product_name || row.product || params.productName || params.providerPackage;
  const handle = explicitHandle || slugify(title);
  const store = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || process.env.SHOPIFY_SHOP || 'iamgenesistech.myshopify.com';
  return handle ? `https://${store.replace(/^https?:\/\//, '')}/products/${handle}` : null;
}

function nullIfBlank(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function actionToStatus(action) {
  return {
    approve: 'approved',
    quality: 'review',
    queue: 'queued',
    publish: 'published',
    render: 'queued',
    reject: 'rejected',
    archive: 'archived'
  }[action] || 'pending';
}

function renderRouteStatus(action) {
  if (action.startsWith('route')) return 'routed';
  if (action === 'rerouteFailedDispatch') return 'retrying';
  if (action === 'archiveVariant') return 'archived';
  if (action === 'sendToManualReview') return 'manual_review';
  return action === 'renderAllEnabledPresets' ? 'queued' : 'rendering';
}

// -------- Admin key gate (used for DELETE + auto-grade-batch) --------
function isAdminAuthorized(req) {
  const expected = String(process.env.ADMIN_API_KEY || process.env.EVICS_ADMIN_KEY || '').trim();
  if (!expected) return false; // must be configured
  const provided = String(req.headers['x-admin-key'] || req.headers['x-api-key'] || '').trim();
  return provided && provided === expected;
}

// -------- GCS best-effort delete --------
async function tryDeleteGcsObject(publicUrl) {
  if (!publicUrl) return { attempted: false, deleted: false };
  try {
    let bucket = null;
    let object = null;
    if (/^gs:\/\//i.test(publicUrl)) {
      const rest = publicUrl.replace(/^gs:\/\//i, '');
      const idx = rest.indexOf('/');
      if (idx > 0) { bucket = rest.slice(0, idx); object = rest.slice(idx + 1); }
    } else {
      const m = publicUrl.match(/storage\.googleapis\.com\/([^\/]+)\/(.+)$/);
      if (m) { bucket = m[1]; object = decodeURIComponent(m[2].split('?')[0]); }
    }
    if (!bucket || !object) return { attempted: false, deleted: false, reason: 'not-gcs-url' };

    try {
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();
      await storage.bucket(bucket).file(object).delete({ ignoreNotFound: true });
      return { attempted: true, deleted: true, bucket, object };
    } catch (libErr) {
      return { attempted: true, deleted: false, error: libErr.message, bucket, object };
    }
  } catch (e) {
    return { attempted: false, deleted: false, error: e.message };
  }
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
        const list = JSON.parse(fs.readFileSync(localPath, 'utf8') || '[]');
        const found = (list || []).find(r => String(r.id) === String(id) || String(r.job_id) === String(id) || String(r.video_id) === String(id));
        if (found) return found;
      }
    } catch (e) {
      console.warn('Local render lookup failed:', e && e.message ? e.message : String(e));
    }

    return null;
  }

  async function updateMediaOutputStatus(id, status, extraParams = {}) {
    const row = await fetchMediaOutputById(id);
    if (!row) return null;
    const params = { ...parseJsonMaybe(row.parameters, {}), ...extraParams, updatedBy: 'media_output_center' };
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .update({ status, parameters: params })
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data && data[0] ? normalizeMediaOutput(data[0]) : null;
  }

  async function updateMediaOutputAsset(id, body = {}) {
    const row = await fetchMediaOutputById(id);
    if (!row) return null;

    const currentParams = parseJsonMaybe(row.parameters, {});
    const nextParams = { ...currentParams };
    const update = {};
    const playbackUrlInput = body.playbackUrl !== undefined ? body.playbackUrl : body.videoUrl;
    const playbackUrl = playbackUrlInput !== undefined ? nullIfBlank(playbackUrlInput) : undefined;

    if (body.title !== undefined) {
      update.render_name = nullIfBlank(body.title);
      nextParams.title = nullIfBlank(body.title);
    }
    if (body.mediaType !== undefined) {
      update.media_type = nullIfBlank(body.mediaType);
      nextParams.mediaType = nullIfBlank(body.mediaType);
    }
    if (body.status !== undefined) {
      update.status = nullIfBlank(body.status) || 'pending';
      nextParams.renderState = nullIfBlank(body.status) || 'pending';
      nextParams.approvedState = body.status === 'approved' ? 'approved' : currentParams.approvedState;
    }
    if (playbackUrlInput !== undefined) {
      update.video_url = playbackUrl;
      update.vault_destination = playbackUrl;
      nextParams.playbackUrl = playbackUrl;
      nextParams.videoUrl = playbackUrl;
      nextParams.storageLifecycle = playbackUrl ? 'active' : 'pending';
    }
    if (body.posterUrl !== undefined) {
      const posterUrl = nullIfBlank(body.posterUrl);
      update.thumbnail_url = posterUrl;
      nextParams.posterUrl = posterUrl;
      nextParams.thumbnailUrl = posterUrl;
    }
    if (body.productUrl !== undefined) {
      const productUrl = nullIfBlank(body.productUrl);
      update.product_url = productUrl;
      nextParams.productUrl = productUrl;
    }
    if (body.storageUrl !== undefined) {
      const storageUrl = resolveStorageLink(body.storageUrl, playbackUrl);
      nextParams.storageUrl = storageUrl;
      nextParams.storagePath = storageUrl;
    }
    if (body.ctaText !== undefined) nextParams.ctaText = nullIfBlank(body.ctaText) || 'Buy Now';
    if (body.notes !== undefined) nextParams.notes = nullIfBlank(body.notes) || '';
    if (body.qaInstructions !== undefined) nextParams.qaInstructions = body.qaInstructions || {};

    update.parameters = nextParams;

    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .update(update)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return data && data[0] ? normalizeMediaOutput(data[0]) : null;
  }

  async function logMediaOutputEvent(outputId, action, payload = {}) {
    try {
      const { error } = await SupabaseConnector.from('evics_media_audit_logs').insert([{
        output_id: outputId,
        action,
        payload,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
    } catch (error) {
      console.warn('Media Output audit log skipped:', error.message);
    }
  }

  async function pushToPublishingQueue(id, item, channel) {
    try {
      await SupabaseConnector.from('publishing_queue').insert([{
        creative_id: id,
        channel: channel || 'Media Review',
        status: 'Queued',
        content: item && item.title ? item.title : String(id),
        publish_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }]);
      return { queued: true, target: 'supabase' };
    } catch (error) {
      console.warn('Publishing queue insert skipped:', error.message);
      try {
        const queuePath = path.join(__dirname, '..', 'generated', 'local_publishing_queue.json');
        const entry = {
          creative_id: id,
          channel: channel || 'Media Review',
          status: 'Queued',
          content: item && item.title ? item.title : String(id),
          publish_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        let list = [];
        if (fs.existsSync(queuePath)) {
          list = JSON.parse(fs.readFileSync(queuePath, 'utf8') || '[]') || [];
        }
        list.unshift(entry);
        fs.writeFileSync(queuePath, JSON.stringify(list, null, 2), 'utf8');
        return { queued: true, target: 'local-fallback' };
      } catch (fErr) {
        console.warn('Local publishing queue write failed:', fErr && fErr.message ? fErr.message : String(fErr));
        return { queued: false, error: fErr.message };
      }
    }
  }

  app.get('/api/media-output/outputs', async (_req, res) => {
    try {
      let supabaseRows = [];
      try {
        const { data, error } = await SupabaseConnector
          .from('evics_renders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(150);
        if (error) throw new Error(error.message);
        supabaseRows = data || [];
      } catch (supErr) {
        console.warn('Supabase list fetch failed:', supErr && supErr.message ? supErr.message : String(supErr));
      }

      let localRows = [];
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
        if (fs.existsSync(localPath)) {
          localRows = JSON.parse(fs.readFileSync(localPath, 'utf8') || '[]') || [];
        }
      } catch (localErr) {
        console.warn('Local fallback read failed:', localErr && localErr.message ? localErr.message : String(localErr));
      }

      const normalizedLocal = (localRows || []).map(normalizeMediaOutput);
      const normalizedSupabase = (supabaseRows || []).map(normalizeMediaOutput);

      const mergedMap = new Map();
      for (const it of normalizedLocal) {
        if (it && it.id) mergedMap.set(String(it.id), it);
      }
      for (const it of normalizedSupabase) {
        if (it && it.id) mergedMap.set(String(it.id), it);
      }

      let items = Array.from(mergedMap.values());
      items.sort((a, b) => {
        const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta || String(b.id).localeCompare(String(a.id));
      });

      items = items.slice(0, 150);

      noStore(res);
      res.json({
        success: true,
        items,
        count: items.length,
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
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });
      noStore(res);
      res.json({ success: true, item: normalizeMediaOutput(row) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get('/api/media-output/outputs/:id/gcs-info', async (req, res) => {
    try {
      const row = await fetchMediaOutputById(req.params.id);
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });
      const item = normalizeMediaOutput(row);
      noStore(res);
      res.json({
        success: true,
        id: item.id,
        playbackUrl: item.playbackUrl,
        posterUrl: item.posterUrl,
        storageUrl: item.storageUrl,
        tier: item.tier,
        tierLabel: item.tierLabel,
        grade: item.grade,
        approvedForPublishing: item.approvedForPublishing,
        aPlusMinimum: A_PLUS_RENDER_MINIMUM
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/actions', async (req, res) => {
    try {
      const { id } = req.params;
      const action = req.body.action;
      if (!action) return res.status(400).json({ success: false, error: 'action is required.' });

      const status = actionToStatus(action);
      const item = await updateMediaOutputStatus(id, status, {
        lastMediaOutputAction: action,
        approvedState: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : undefined,
        actionUpdatedAt: new Date().toISOString()
      });
      if (!item) return res.status(404).json({ success: false, error: 'Media output not found.' });

      if (action === 'publish') {
        await pushToPublishingQueue(id, item, 'Media Output Center');
      }

      await logMediaOutputEvent(id, action, { status });
      noStore(res);
      res.json({ success: true, item, message: `${action} completed.` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  // ---- VP Decision: approve or deny with reason + audit + publish-queue push ----
  app.post('/api/media-output/outputs/:id/vp-decision', async (req, res) => {
    try {
      const { id } = req.params;
      const decision = String(req.body.decision || '').toLowerCase();
      const reason = nullIfBlank(req.body.reason);
      const actor = nullIfBlank(req.body.actor) || 'vp';
      if (decision !== 'approve' && decision !== 'deny') {
        return res.status(400).json({ success: false, error: 'decision must be "approve" or "deny".' });
      }

      const row = await fetchMediaOutputById(id);
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });

      const status = decision === 'approve' ? 'approved' : 'rejected';
      const patchedParams = {
        vpDecision: decision,
        vpDecisionAt: new Date().toISOString(),
        vpDecisionReason: reason,
        vpDecisionActor: actor,
        approvedState: decision === 'approve' ? 'approved' : 'rejected'
      };

      const item = await updateMediaOutputStatus(id, status, patchedParams);
      let queueResult = null;
      if (decision === 'approve') {
        queueResult = await pushToPublishingQueue(id, item, 'Media Review VP');
      }
      await logMediaOutputEvent(id, `vp-${decision}`, { reason, actor, status });

      noStore(res);
      res.json({ success: true, item, decision, status, queue: queueResult });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.patch('/api/media-output/outputs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const item = await updateMediaOutputAsset(id, req.body || {});
      if (!item) return res.status(404).json({ success: false, error: 'Media output not found.' });

      await logMediaOutputEvent(id, 'updateAsset', {
        title: req.body.title,
        mediaType: req.body.mediaType,
        status: req.body.status,
        playbackUrl: req.body.playbackUrl || req.body.videoUrl,
        posterUrl: req.body.posterUrl,
        productUrl: req.body.productUrl,
        storageUrl: req.body.storageUrl
      });
      noStore(res);
      res.json({ success: true, item, message: 'Media asset updated.' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  // ---- DELETE endpoint: admin-only, best-effort GCS cleanup ----
  app.delete('/api/media-output/outputs/:id', async (req, res) => {
    try {
      if (!isAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      const { id } = req.params;
      const row = await fetchMediaOutputById(id);
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });
      const item = normalizeMediaOutput(row);

      const videoDelete = await tryDeleteGcsObject(item.playbackUrl || item.storageUrl);
      const posterDelete = await tryDeleteGcsObject(item.posterUrl);

      let supabaseDeleted = false;
      try {
        const { error } = await SupabaseConnector.from('evics_renders').delete().eq('id', id);
        if (!error) supabaseDeleted = true;
        else console.warn('Supabase delete failed:', error.message);
      } catch (e) {
        console.warn('Supabase delete threw:', e && e.message ? e.message : String(e));
      }

      let localDeleted = false;
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
        if (fs.existsSync(localPath)) {
          const list = JSON.parse(fs.readFileSync(localPath, 'utf8') || '[]') || [];
          const filtered = list.filter(r => String(r.id) !== String(id) && String(r.job_id) !== String(id) && String(r.video_id) !== String(id));
          if (filtered.length !== list.length) {
            fs.writeFileSync(localPath, JSON.stringify(filtered, null, 2), 'utf8');
            localDeleted = true;
          }
        }
      } catch (e) {
        console.warn('Local delete failed:', e && e.message ? e.message : String(e));
      }

      await logMediaOutputEvent(id, 'delete', {
        gcs: { video: videoDelete, poster: posterDelete },
        supabaseDeleted,
        localDeleted,
        actor: nullIfBlank(req.body && req.body.actor) || 'admin'
      });

      noStore(res);
      res.json({
        success: true,
        id,
        supabaseDeleted,
        localDeleted,
        gcsDeleted: Boolean(videoDelete.deleted || posterDelete.deleted),
        gcs: { video: videoDelete, poster: posterDelete }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  // ---- Auto-grade batch: rescore + optional auto-approve A+ ----
  app.post('/api/media-output/auto-grade-batch', async (req, res) => {
    try {
      if (!isAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      const limit = Math.max(1, Math.min(250, Number(req.body.limit) || 100));
      const autoApprove = req.body.autoApprove === false ? false : autoApproveEnabled();

      let rows = [];
      try {
        const { data, error } = await SupabaseConnector
          .from('evics_renders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        rows = data || [];
      } catch (supErr) {
        console.warn('Auto-grade Supabase fetch failed:', supErr && supErr.message ? supErr.message : String(supErr));
      }

      let regraded = 0;
      let autoApproved = 0;
      let awaitingReview = 0;
      const details = [];

      for (const row of rows) {
        try {
          const params = parseJsonMaybe(row.parameters, {});
          const playbackUrl = row.video_url || row.vault_destination || params.playbackUrl || params.videoUrl || null;
          const posterUrl = row.thumbnail_url || params.posterUrl || null;
          const duration = Number(row.duration || params.duration || 0) || null;
          const scriptQuality = params.scriptQuality || null;

          let grade;
          if (renderQualityValidator && typeof renderQualityValidator.gradeCompletedRender === 'function') {
            grade = renderQualityValidator.gradeCompletedRender({
              videoUrl: playbackUrl,
              thumbnailUrl: posterUrl,
              duration,
              scriptQuality
            });
          } else {
            const score = Number(row.render_grade || 0);
            grade = {
              score,
              tier: tierFromScore(score),
              approvedForPublishing: score >= A_PLUS_RENDER_MINIMUM,
              minimum: A_PLUS_RENDER_MINIMUM,
              evidence: {}
            };
          }

          const nextStatus = grade.tier === 'A+' && autoApprove
            ? 'approved'
            : (row.status && ['approved', 'rejected', 'published'].includes(String(row.status))) ? row.status : 'awaiting_review';

          const nextParams = {
            ...params,
            tier: grade.tier,
            gradeEvidence: grade.evidence,
            gradedAt: new Date().toISOString(),
            approvedState: nextStatus === 'approved' ? 'approved' : params.approvedState || 'pending'
          };
          if (grade.tier === 'A+' && autoApprove) {
            nextParams.autoApprovedAt = new Date().toISOString();
            nextParams.autoApprovedBy = 'auto-grade-batch';
          }

          const { error: upErr } = await SupabaseConnector
            .from('evics_renders')
            .update({ status: nextStatus, render_grade: grade.score, parameters: nextParams })
            .eq('id', row.id);
          if (upErr) throw new Error(upErr.message);

          regraded += 1;
          if (grade.tier === 'A+' && autoApprove) {
            autoApproved += 1;
            await pushToPublishingQueue(row.id, { title: row.render_name || row.product_name || String(row.id) }, 'Auto-Approve A+');
            await logMediaOutputEvent(row.id, 'auto-approve-a-plus', { score: grade.score });
          } else if (nextStatus === 'awaiting_review') {
            awaitingReview += 1;
          }
          details.push({ id: row.id, tier: grade.tier, score: grade.score, status: nextStatus });
        } catch (rowErr) {
          console.warn('Auto-grade row failed:', row && row.id, rowErr && rowErr.message ? rowErr.message : String(rowErr));
          details.push({ id: row && row.id, error: rowErr.message });
        }
      }

      noStore(res);
      res.json({
        success: true,
        summary: {
          scanned: rows.length,
          regraded,
          autoApproved,
          awaitingReview,
          autonomy: autoApprove ? 'auto-approve-a-plus' : 'manual'
        },
        details
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/render-route', async (req, res) => {
    try {
      const { id } = req.params;
      const action = req.body.action;
      const context = req.body.context || {};
      if (!action) return res.status(400).json({ success: false, error: 'action is required.' });

      const row = await fetchMediaOutputById(id);
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });
      const currentParams = parseJsonMaybe(row.parameters, {});
      const status = renderRouteStatus(action);
      const job = {
        action,
        presetKey: context.presetKey || 'original',
        status,
        requestedAt: new Date().toISOString(),
        qa: context.qa || {}
      };
      const routeHistory = [...(currentParams.routeHistory || []), job];

      const item = await updateMediaOutputStatus(id, status, {
        ...currentParams,
        renderRouteStatus: status,
        routeHistory,
        lastRenderRouteAction: action
      });

      await logMediaOutputEvent(id, action, job);
      noStore(res);
      res.status(202).json({ success: true, item, status, message: `${action} submitted.` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post('/api/media-output/outputs/:id/qa', async (req, res) => {
    try {
      const { id } = req.params;
      const qa = req.body.qa || {};
      const row = await fetchMediaOutputById(id);
      if (!row) return res.status(404).json({ success: false, error: 'Media output not found.' });

      const params = parseJsonMaybe(row.parameters, {});
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .update({ parameters: { ...params, qaInstructions: qa, qaUpdatedAt: new Date().toISOString() } })
        .eq('id', id)
        .select();
      if (error) throw new Error(error.message);

      await logMediaOutputEvent(id, 'saveQaInstructions', { qa });
      noStore(res);
      res.json({
        success: true,
        item: data && data[0] ? normalizeMediaOutput(data[0]) : null,
        message: 'QA instructions saved.'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || String(e) });
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
