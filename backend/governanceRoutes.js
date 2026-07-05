// backend/governanceRoutes.js
//
// HTTP surface for the EVICS Sacred Intelligence Governance Engine.
// Registered from server.js via registerGovernanceRoutes(app).
//
// Endpoints (all read-only except /evaluate, which never persists caller content
// beyond the capped governance log):
//   GET  /api/governance/health            -> engine status + thresholds
//   GET  /api/governance/standard          -> Sacred Intelligence Standard
//   GET  /api/governance/oath/ai           -> EVICS AI Oath (system-level)
//   GET  /api/governance/oath/affiliate    -> EVICS User & Affiliate Oath
//   POST /api/governance/evaluate          -> evaluate arbitrary output
//   GET  /api/governance/stats             -> admin dashboard aggregates
//   GET  /api/governance/log               -> recent governance log entries (admin)

'use strict';

const governance = require('./sacredIntelligenceGovernance');

function noStore(res) {
  res.set('Cache-Control', 'no-store, max-age=0');
}

function registerGovernanceRoutes(app) {
  // Health / info
  app.get('/api/governance/health', (_req, res) => {
    noStore(res);
    res.json({
      success: true,
      engine: 'EVICS Sacred Intelligence Governance Engine',
      status: 'active',
      thresholds: governance.GOVERNANCE_THRESHOLDS,
      categories: Object.keys(governance.VIOLATION_LABELS),
      mission: governance.SACRED_INTELLIGENCE_STANDARD.mission
    });
  });

  // The Sacred Intelligence Standard
  app.get('/api/governance/standard', (_req, res) => {
    noStore(res);
    res.json({
      success: true,
      standard: governance.SACRED_INTELLIGENCE_STANDARD,
      thresholds: governance.GOVERNANCE_THRESHOLDS
    });
  });

  // EVICS AI Oath (system-level constant)
  app.get('/api/governance/oath/ai', (_req, res) => {
    noStore(res);
    res.json({ success: true, title: 'EVICS AI Oath', oath: governance.EVICS_AI_OATH });
  });

  // EVICS User & Affiliate Oath (onboarding + voice identity script)
  app.get('/api/governance/oath/affiliate', (_req, res) => {
    noStore(res);
    res.json({
      success: true,
      title: 'EVICS User and Affiliate Oath',
      voiceIdentityLabel: governance.VOICE_IDENTITY_OATH_LABEL,
      oath: governance.EVICS_USER_AFFILIATE_OATH
    });
  });

  // Evaluate arbitrary AI output against the standard.
  app.post('/api/governance/evaluate', (req, res) => {
    noStore(res);
    try {
      const body = req.body || {};
      const output = body.output != null ? body.output : body.text;
      if (output == null || String(output).trim() === '') {
        return res.status(400).json({ success: false, error: 'Provide "output" (or "text") to evaluate.' });
      }
      const result = governance.evaluateOutput(output, {
        agentName: body.agentName || 'api-caller',
        workflowName: body.workflowName || 'api-evaluate',
        autoRewrite: body.autoRewrite !== false,
        log: body.log !== false
      });
      return res.json({ success: true, governance: result });
    } catch (error) {
      // Safe fallback — never imply approval on error.
      return res.status(200).json({
        success: false,
        governance: {
          approved: false,
          status: 'Governance Review Required',
          reason: `Governance evaluation error: ${error && error.message ? error.message : 'unknown error'}.`,
          finalApprovedOutput: null
        }
      });
    }
  });

  // Admin dashboard aggregates.
  app.get('/api/governance/stats', (_req, res) => {
    noStore(res);
    try {
      return res.json({ success: true, stats: governance.getGovernanceStats() });
    } catch (error) {
      return res.status(200).json({ success: false, error: error.message || 'Could not compute governance stats.' });
    }
  });

  // Recent governance log entries (most recent first).
  app.get('/api/governance/log', (req, res) => {
    noStore(res);
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 500));
      const log = governance.readGovernanceLog();
      return res.json({ success: true, count: log.length, entries: log.slice(-limit).reverse() });
    } catch (error) {
      return res.status(200).json({ success: false, error: error.message || 'Could not read governance log.' });
    }
  });

  console.log('✅ [EVICS] Sacred Intelligence Governance routes registered at /api/governance');
}

module.exports = { registerGovernanceRoutes };
