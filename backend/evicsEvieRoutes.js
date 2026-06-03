const path = require('path');
const fs = require('fs');
const {
  QUALITY_GATES,
  DEFAULT_WEIGHTS,
  seedCatalog,
  rankCandidates,
  buildPrompt,
  buildScript,
  runActionFlow,
  copilotOrchestrate,
  systemHealth,
  readWisdom
} = require('./sharedEvicsEvieCore');

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

function registerEvicsEvieRoutes(app) {
  app.get('/api/evics-evie/health', (_req, res) => {
    noStore(res);
    res.json(systemHealth());
  });

  app.get('/api/evics-evie/contracts', (_req, res) => {
    noStore(res);
    res.json({
      success: true,
      sharedConcepts: [
        'creators',
        'accounts',
        'products',
        'videos',
        'hooks',
        'formats',
        'faceless_patterns',
        'rankings',
        'prompts',
        'prompt_versions',
        'wisdom_files',
        'render_jobs',
        'render_events',
        'compliance_flags',
        'review_actions',
        'evidence_records'
      ],
      qualityGates: QUALITY_GATES,
      scoringWeights: DEFAULT_WEIGHTS,
      catalog: seedCatalog()
    });
  });

  app.post('/api/evics-evie/rankings', (req, res) => {
    noStore(res);
    const rankings = rankCandidates(req.body || {});
    res.json({
      success: true,
      count: rankings.length,
      topRanking: rankings[0],
      rankings
    });
  });

  app.post('/api/evics-evie/prompt-forge', async (req, res) => {
    noStore(res);
    const rankings = rankCandidates(req.body || {});
    const selected = req.body?.faceless ? rankings.find((ranking) => ranking.format.faceless) || rankings[0] : rankings[0];
    const prompt = await buildPrompt(selected, { operatorCommand: req.body?.command });
    const script = await buildScript(prompt, selected);
    res.json({
      success: true,
      ranking: selected,
      prompt,
      script
    });
  });

  app.post('/api/evics-evie/action-flow', async (req, res) => {
    noStore(res);
    const flow = await runActionFlow(req.body || {});
    res.status(flow.renderJob.status === 'blocked' ? 409 : 200).json({
      success: flow.renderJob.status !== 'blocked',
      flow
    });
  });

  app.post('/api/copilot/orchestrate', (req, res) => {
    noStore(res);
    const result = copilotOrchestrate(req.body || {});
    res.status(result.flow.renderJob.status === 'blocked' ? 409 : 200).json({
      success: result.flow.renderJob.status !== 'blocked',
      copilot: result
    });
  });

  app.get('/api/evics-evie/wisdom', (_req, res) => {
    noStore(res);
    res.json({ success: true, wisdom: readWisdom() });
  });

  app.get('/api/evics-evie/evidence-index', (_req, res) => {
    const finalDir = path.join(__dirname, '../evidence/final-validation');
    const files = fs.existsSync(finalDir)
      ? fs.readdirSync(finalDir).map((name) => `/evidence/final-validation/${name}`)
      : [];
    noStore(res);
    res.json({ success: true, files });
  });
}

module.exports = {
  registerEvicsEvieRoutes
};
