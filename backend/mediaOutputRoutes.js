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
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw new Error(error.message);
    return data && data[0] ? data[0] : null;
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
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw new Error(error.message);

      noStore(res);
      res.json({ success: true, items: (data || []).map(normalizeMediaOutput), count: (data || []).length });
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
        }
      }

      await logMediaOutputEvent(id, action, { status });
      noStore(res);
      res.json({ success: true, item, message: `${action} completed.` });
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
}

module.exports = {
  registerMediaOutputRoutes,
  normalizeMediaOutput
};
