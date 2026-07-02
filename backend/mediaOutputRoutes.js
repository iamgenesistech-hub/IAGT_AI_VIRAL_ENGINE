const fs = require('fs');
const path = require('path');

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
    status: row.status || 'pending',
    workflowMode: params.workflowMode || 'review',
    renderState: row.status || params.renderState || 'pending',
    platformRoutes: params.platformRoutes || [],
    approvedState: params.approvedState || (row.status === 'approved' ? 'approved' : 'pending'),
    readinessScore,
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
  if (!value) return null;
  const text = String(value);
  if (text.startsWith('gs://')) {
    const withoutScheme = text.replace(/^gs:\/\//, '');
    const slashIndex = withoutScheme.indexOf('/');
    const bucket = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
    const objectPath = slashIndex === -1 ? '' : withoutScheme.slice(slashIndex + 1);
    return objectPath
      ? `https://storage.googleapis.com/${bucket}/${encodeURI(objectPath)}`
      : `https://storage.googleapis.com/${bucket}`;
  }
  if (text.startsWith('https://storage.cloud.google.com/')) {
    return text.replace('https://storage.cloud.google.com/', 'https://storage.googleapis.com/');
  }
  return null;
}

function resolveStorageLink(value, fallbackPlayback = null) {
  const candidate = nullIfBlank(value);
  if (!candidate) return buildStorageUrl(fallbackPlayback);
  if (candidate.startsWith('gs://')) return buildStorageUrl(candidate);
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) return candidate;
  return candidate;
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

  app.get('/api/media-output/outputs', async (_req, res) => {
    try {
      // Attempt to fetch from Supabase; if it fails, continue and merge with local fallback
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

      // Read local fallback file if present
      let localRows = [];
      try {
        const localPath = path.join(__dirname, '..', 'generated', 'local_evics_renders.json');
        if (fs.existsSync(localPath)) {
          localRows = JSON.parse(fs.readFileSync(localPath, 'utf8') || '[]') || [];
        }
      } catch (localErr) {
        console.warn('Local fallback read failed:', localErr && localErr.message ? localErr.message : String(localErr));
      }

      // Normalize and merge results; prefer Supabase entries when duplicates exist
      const normalizedLocal = (localRows || []).map(normalizeMediaOutput);
      const normalizedSupabase = (supabaseRows || []).map(normalizeMediaOutput);

      const mergedMap = new Map();
      // Add local first, then supabase will overwrite duplicates (preferring supabase truth when available)
      for (const it of normalizedLocal) {
        if (it && it.id) mergedMap.set(String(it.id), it);
      }
      for (const it of normalizedSupabase) {
        if (it && it.id) mergedMap.set(String(it.id), it);
      }

      let items = Array.from(mergedMap.values());
      // Sort by createdAt (descending), fallback to id ordering if missing
      items.sort((a, b) => {
        const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta || String(b.id).localeCompare(String(a.id));
      });

      // Limit to 150
      items = items.slice(0, 150);

      noStore(res);
      res.json({ success: true, items, count: items.length });
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
        try {
          await SupabaseConnector.from('publishing_queue').insert([{
            creative_id: id,
            channel: 'Media Output Center',
            status: 'Queued',
            content: item.title,
            publish_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]);
        } catch (error) {
          console.warn('Publishing queue insert skipped:', error.message);
          // Local fallback: append to generated/local_publishing_queue.json so publish can be processed later
          try {
            const queuePath = path.join(__dirname, '..', 'generated', 'local_publishing_queue.json');
            const entry = {
              creative_id: id,
              channel: 'Media Output Center',
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
          } catch (fErr) {
            console.warn('Local publishing queue write failed:', fErr && fErr.message ? fErr.message : String(fErr));
          }
        }
      }

      await logMediaOutputEvent(id, action, { status });
      noStore(res);
      res.json({ success: true, item, message: `${action} completed.` });
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
  normalizeMediaOutput
};
