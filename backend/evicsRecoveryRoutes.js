// backend/evicsRecoveryRoutes.js
// Recovery and rollback routes for production incident response

function registerEvicsRecoveryRoutes(app, supabase) {
  const noStore = (res) => res.setHeader('Cache-Control', 'no-store');

  // GET /api/recovery/status — check system health and recovery state
  app.get('/api/recovery/status', async (_req, res) => {
    noStore(res);
    const checks = {};

    const tables = ['evics_trends', 'evics_products', 'evics_renders', 'creatives', 'publishing_queue', 'video_assembly_drafts'];
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });
        checks[table] = { ok: !error, count: count ?? 0, error: error ? error.message : null };
      } catch (e) {
        checks[table] = { ok: false, count: 0, error: e.message };
      }
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    res.json({
      success: true,
      healthy: allOk,
      tables: checks,
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/recovery/flush-queue — clear the publishing queue (emergency use only)
  app.post('/api/recovery/flush-queue', async (req, res) => {
    const { confirm } = req.body;
    if (confirm !== 'FLUSH') {
      return res.status(400).json({ success: false, error: 'Pass confirm: "FLUSH" to execute.' });
    }
    try {
      const { error } = await supabase
        .from('publishing_queue')
        .delete()
        .eq('status', 'Failed');
      if (error) throw new Error(error.message);
      noStore(res);
      res.json({ success: true, message: 'Failed publishing queue items cleared.' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/recovery/reset-render/:id — reset a stuck render job
  app.post('/api/recovery/reset-render/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from('evics_renders')
        .update({ status: 'reset', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
      noStore(res);
      res.json({ success: true, id, message: 'Render job reset to "reset" status for reprocessing.' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/recovery/pending-renders — list all renders that are stuck in "rendering" status
  app.get('/api/recovery/pending-renders', async (_req, res) => {
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // older than 1 hour
      const { data, error } = await supabase
        .from('evics_renders')
        .select('id, platform, job_id, status, created_at')
        .in('status', ['rendering', 'pending', 'queued'])
        .lt('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      noStore(res);
      res.json({ success: true, count: (data || []).length, stuckRenders: data || [] });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

module.exports = { registerEvicsRecoveryRoutes };
