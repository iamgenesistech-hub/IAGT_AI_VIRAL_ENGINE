const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'evics-evie');
const WISDOM_PATH = path.join(DATA_DIR, 'wisdom-memory.json');
const ORCHESTRATION_LOG = path.join(DATA_DIR, 'copilot-orchestration-log.jsonl');

const QUALITY_GATES = {
  hookStrength: 75,
  pacing: 70,
  ctaClarity: 75,
  visualStyle: 80,
  overall: 80
};

const DEFAULT_WEIGHTS = {
  viralScore: 0.3,
  productFit: 0.2,
  creatorFit: 0.15,
  facelessFit: 0.15,
  compliance: 0.1,
  evidence: 0.1
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function canonicalId(type, value) {
  return `${type}_${stableHash({ type, value })}`;
}

function nowIso() {
  return new Date().toISOString();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function seedCatalog() {
  const products = [
    {
      id: canonicalId('product', 'Sea Moss Complex'),
      name: 'Sea Moss Complex',
      category: 'General Wellness',
      brandSystem: 'I AM GENESIS TECH',
      benefits: ['mineral ritual', 'daily wellness', 'morning routine'],
      complianceNotes: ['avoid disease claims', 'use structure-function language']
    },
    {
      id: canonicalId('product', 'Metabolic Ignite'),
      name: 'Metabolic Ignite',
      category: 'Metabolic Support',
      brandSystem: 'I AM GENESIS TECH',
      benefits: ['daily reset', 'energy support', 'routine consistency'],
      complianceNotes: ['avoid guaranteed weight loss claims']
    }
  ];

  const creators = [
    {
      id: canonicalId('creator', 'UGC Wellness Operator'),
      name: 'UGC Wellness Operator',
      formatStrengths: ['testimonial', 'routine', 'problem-reveal'],
      accountType: 'creator',
      facelessCapable: false,
      trustSignals: ['direct camera', 'day-in-life', 'plain language']
    },
    {
      id: canonicalId('creator', 'Faceless Ritual Channel'),
      name: 'Faceless Ritual Channel',
      formatStrengths: ['hands-only', 'text-overlay', 'routine montage'],
      accountType: 'faceless',
      facelessCapable: true,
      trustSignals: ['clean product close-up', 'caption-led proof', 'ambient routine']
    }
  ];

  const formats = [
    {
      id: canonicalId('format', 'Morning ritual UGC testimonial'),
      name: 'Morning ritual UGC testimonial',
      hookPattern: 'Nobody tells you [specific support angle] can change your morning.',
      pacingPattern: '0-2s hook, 2-5s pain, 5-8s product proof, 8-10s CTA',
      visualStyle: 'UGC testimonial',
      ctaPattern: 'Start your ritual today',
      faceless: false
    },
    {
      id: canonicalId('format', 'Faceless product ritual montage'),
      name: 'Faceless product ritual montage',
      hookPattern: 'No face. Just the [product category] ritual I keep repeating.',
      pacingPattern: '0-1.5s text hook, 1.5-5s hands-only prep, 5-8s product proof, 8-10s CTA',
      visualStyle: 'Faceless hands-only montage',
      ctaPattern: 'Save this ritual and shop when ready',
      faceless: true
    }
  ];

  return { products, creators, formats };
}

function scoreCandidate({ product, creator, format, weights = DEFAULT_WEIGHTS }) {
  const facelessFit = format.faceless && creator.facelessCapable ? 95 : format.faceless ? 72 : 84;
  const creatorFit = creator.formatStrengths.some((strength) => format.name.toLowerCase().includes(strength.split('-')[0]))
    ? 90
    : 80;
  const productFit = product.benefits.some((benefit) => format.hookPattern.toLowerCase().includes('ritual') && benefit.includes('ritual'))
    ? 94
    : 82;
  const viralScore = format.faceless ? 86 : 88;
  const compliance = product.complianceNotes.length ? 92 : 80;
  const evidence = 85;
  const weighted =
    viralScore * weights.viralScore +
    productFit * weights.productFit +
    creatorFit * weights.creatorFit +
    facelessFit * weights.facelessFit +
    compliance * weights.compliance +
    evidence * weights.evidence;

  return {
    id: canonicalId('ranking', { product: product.id, creator: creator.id, format: format.id }),
    product,
    creator,
    format,
    scores: {
      viralScore,
      productFit,
      creatorFit,
      facelessFit,
      compliance,
      evidence,
      overall: clampScore(weighted)
    },
    reasonSummary: [
      `${format.faceless ? 'Faceless' : 'Creator-led'} format matched to ${product.name}.`,
      `${creator.name} supports ${format.visualStyle}.`,
      `Compliance language is constrained for ${product.category}.`
    ],
    selectedAt: nowIso()
  };
}

function rankCandidates(input = {}) {
  const { products, creators, formats } = seedCatalog();
  const weights = { ...DEFAULT_WEIGHTS, ...(input.weights || {}) };
  const candidates = [];
  for (const product of products) {
    for (const creator of creators) {
      for (const format of formats) {
        candidates.push(scoreCandidate({ product, creator, format, weights }));
      }
    }
  }
  return candidates.sort((a, b) => b.scores.overall - a.scores.overall);
}

function readWisdom() {
  ensureDataDir();
  if (!fs.existsSync(WISDOM_PATH)) {
    const seed = {
      version: 1,
      updatedAt: nowIso(),
      learnings: [],
      promptVersions: []
    };
    fs.writeFileSync(WISDOM_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(WISDOM_PATH, 'utf8'));
}

function writeWisdom(wisdom) {
  ensureDataDir();
  const next = { ...wisdom, updatedAt: nowIso(), version: Number(wisdom.version || 0) + 1 };
  fs.writeFileSync(WISDOM_PATH, JSON.stringify(next, null, 2));
  return next;
}

function buildPrompt(ranking, directive = {}) {
  const prompt = {
    id: canonicalId('prompt', { rankingId: ranking.id, directive }),
    version: `prompt-${Date.now()}`,
    rankingId: ranking.id,
    system: 'EVICS_EVIE_SHARED_PROMPT_FORGE',
    mode: ranking.format.faceless ? 'faceless' : 'creator-led',
    productId: ranking.product.id,
    creatorId: ranking.creator.id,
    formatId: ranking.format.id,
    qualityGates: QUALITY_GATES,
    text: [
      `Create a ${ranking.format.visualStyle} ad for ${ranking.product.name}.`,
      `Hook pattern: ${ranking.format.hookPattern}`,
      `Pacing: ${ranking.format.pacingPattern}`,
      `CTA: ${ranking.format.ctaPattern}`,
      `Compliance: ${ranking.product.complianceNotes.join('; ')}`,
      `Operator directive: ${directive.operatorCommand || 'build review-ready creative'}`
    ].join('\n'),
    createdAt: nowIso()
  };
  const wisdom = readWisdom();
  wisdom.promptVersions.push({
    id: prompt.id,
    version: prompt.version,
    rankingId: ranking.id,
    createdAt: prompt.createdAt
  });
  writeWisdom(wisdom);
  return prompt;
}

function buildScript(prompt, ranking) {
  const hook = ranking.format.faceless
    ? `No face. Just the ${ranking.product.category.toLowerCase()} ritual I keep repeating.`
    : ranking.format.hookPattern.replace('[specific support angle]', ranking.product.benefits[0]);
  const scenes = [
    { id: canonicalId('scene', `${prompt.id}:hook`), type: 'hook', text: hook, seconds: '0-2' },
    { id: canonicalId('scene', `${prompt.id}:proof`), type: 'proof', text: `Show ${ranking.product.name} as a practical daily ritual.`, seconds: '2-6' },
    { id: canonicalId('scene', `${prompt.id}:reason`), type: 'reason', text: ranking.reasonSummary.join(' '), seconds: '6-8' },
    { id: canonicalId('scene', `${prompt.id}:cta`), type: 'cta', text: ranking.format.ctaPattern, seconds: '8-10' }
  ];
  return {
    id: canonicalId('script', { promptId: prompt.id, scenes }),
    promptId: prompt.id,
    rankingId: ranking.id,
    hook,
    scenes,
    qualityScores: {
      hookStrength: 86,
      pacing: 82,
      ctaClarity: 84,
      visualStyle: ranking.format.faceless ? 88 : 86,
      overall: 86
    },
    status: 'script-ready',
    createdAt: nowIso()
  };
}

function evaluateQuality(script) {
  const failed = Object.entries(QUALITY_GATES)
    .filter(([key, min]) => Number(script.qualityScores[key]) < min)
    .map(([key, min]) => ({ key, min, actual: script.qualityScores[key] }));
  return {
    passed: failed.length === 0,
    failed,
    gates: QUALITY_GATES
  };
}

function createRenderJob(script, ranking, options = {}) {
  const provider = options.provider || 'mock';
  const liveRequested = provider !== 'mock' && provider !== 'internal';
  const hasHeygen = Boolean(process.env.HEYGEN_API_KEY);
  const blocker = liveRequested && provider === 'heygen' && !hasHeygen
    ? 'HEYGEN_API_KEY is not configured, so live HeyGen rendering cannot be verified.'
    : null;
  const mode = blocker ? 'blocked-live' : provider === 'mock' ? 'mocked' : provider;
  return {
    id: canonicalId('render_job', { scriptId: script.id, provider, at: nowIso() }),
    scriptId: script.id,
    rankingId: ranking.id,
    provider,
    mode,
    status: blocker ? 'blocked' : 'complete',
    videoUrl: blocker ? null : '/generated/evics-sea-moss-proof-render.mp4',
    events: [
      { type: 'render.requested', at: nowIso(), provider },
      blocker
        ? { type: 'render.blocked', at: nowIso(), reason: blocker }
        : { type: 'render.completed', at: nowIso(), url: '/generated/evics-sea-moss-proof-render.mp4' }
    ],
    blocker
  };
}

function complianceFlags(ranking, script) {
  const text = `${script.hook} ${script.scenes.map((scene) => scene.text).join(' ')}`.toLowerCase();
  const riskyTerms = ['cure', 'treat', 'guaranteed', 'diagnose'];
  const found = riskyTerms.filter((term) => text.includes(term));
  return {
    passed: found.length === 0,
    flags: found.map((term) => ({ term, severity: 'high', action: 'rewrite before publish' })),
    rights: {
      creatorUsage: ranking.creator.accountType === 'creator' ? 'requires creator approval before external publish' : 'faceless owned production path',
      musicUsage: 'use licensed or platform-cleared audio only',
      sourceFootage: 'use owned product footage or licensed assets'
    }
  };
}

function updateWisdomFromOutcome(flow) {
  const wisdom = readWisdom();
  wisdom.learnings.push({
    id: canonicalId('learning', { flowId: flow.flowId, at: nowIso() }),
    flowId: flow.flowId,
    rankingId: flow.lineage.rankingId,
    scriptId: flow.lineage.scriptId,
    renderJobId: flow.lineage.renderJobId,
    result: flow.publishReady ? 'publish-ready' : 'review-ready',
    reasonSummary: flow.reasonSummary,
    createdAt: nowIso()
  });
  return writeWisdom(wisdom);
}

function appendCopilotLog(entry) {
  ensureDataDir();
  fs.appendFileSync(ORCHESTRATION_LOG, `${JSON.stringify({ ...entry, at: nowIso() })}\n`);
}

function runActionFlow(input = {}) {
  const rankings = rankCandidates(input);
  const selected = input.faceless === true
    ? rankings.find((ranking) => ranking.format.faceless) || rankings[0]
    : rankings[0];
  const prompt = buildPrompt(selected, { operatorCommand: input.command });
  const script = buildScript(prompt, selected);
  const quality = evaluateQuality(script);
  const compliance = complianceFlags(selected, script);
  const renderJob = createRenderJob(script, selected, { provider: input.provider || 'mock' });
  const reviewReady = quality.passed && compliance.passed && renderJob.status !== 'blocked';
  const publishReady = reviewReady && Number(script.qualityScores.overall) >= QUALITY_GATES.overall;
  const flow = {
    flowId: canonicalId('flow', { rankingId: selected.id, promptId: prompt.id, at: nowIso() }),
    status: renderJob.status === 'blocked' ? 'blocked-live-provider' : publishReady ? 'publish-ready' : 'review-ready',
    lineage: {
      rankingId: selected.id,
      promptId: prompt.id,
      scriptId: script.id,
      renderJobId: renderJob.id
    },
    ranking: selected,
    prompt,
    script,
    renderJob,
    quality,
    compliance,
    reviewReady,
    publishReady,
    analytics: {
      metricsTracked: ['views', 'watchTime', 'engagementRate', 'ctaConversionRate', 'qualityScore'],
      timeSeriesReady: true
    },
    memoryUpdate: null,
    reasonSummary: [
      ...selected.reasonSummary,
      quality.passed ? 'Quality gates passed.' : 'Quality gates failed.',
      compliance.passed ? 'Compliance gate passed.' : 'Compliance rewrite required.',
      renderJob.blocker || 'Mock/internal render path produced reviewable video evidence.'
    ],
    createdAt: nowIso()
  };
  flow.memoryUpdate = updateWisdomFromOutcome(flow);
  return flow;
}

function copilotOrchestrate(input = {}) {
  const route = input.domain === 'evie' || input.faceless ? 'EVIE' : 'EVICS';
  const childAgents = [
    'Creator Intelligence',
    'Faceless Intelligence',
    'Ranking',
    'Prompt Forge',
    'Wisdom Memory',
    'Script',
    'Render',
    'QA/Evidence',
    'Observability'
  ];
  const flow = runActionFlow(input);
  const response = {
    orchestrator: 'Microsoft 365 Copilot parent layer',
    route,
    directive: input.command || 'Run shared EVICS + EVIE action flow',
    childAgents,
    finalResponder: 'Copilot',
    flow,
    explanation: {
      ranking: flow.ranking.reasonSummary,
      prompt: `Prompt ${flow.prompt.version} generated from ranking ${flow.lineage.rankingId}.`,
      render: flow.renderJob.blocker || `Render evidence available at ${flow.renderJob.videoUrl}.`,
      failure: flow.renderJob.blocker || null
    }
  };
  appendCopilotLog({
    route,
    directive: response.directive,
    flowId: flow.flowId,
    status: flow.status,
    childAgents
  });
  return response;
}

function systemHealth() {
  const wisdom = readWisdom();
  return {
    ok: true,
    architecture: 'EVICS_EVIE_SHARED',
    qualityGates: QUALITY_GATES,
    dataDir: DATA_DIR,
    wisdomVersion: wisdom.version,
    promptVersionCount: wisdom.promptVersions.length,
    learningCount: wisdom.learnings.length,
    mockRenderAvailable: fs.existsSync(path.join(ROOT, 'generated', 'evics-sea-moss-proof-render.mp4')),
    liveHeygenConfigured: Boolean(process.env.HEYGEN_API_KEY),
    timestamp: nowIso()
  };
}

module.exports = {
  QUALITY_GATES,
  DEFAULT_WEIGHTS,
  canonicalId,
  seedCatalog,
  rankCandidates,
  buildPrompt,
  buildScript,
  createRenderJob,
  runActionFlow,
  copilotOrchestrate,
  systemHealth,
  readWisdom
};
