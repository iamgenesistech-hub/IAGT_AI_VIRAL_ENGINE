const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const llmProvider = require('../utils/llmProvider');

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

function buildTemplatePrompt(ranking, directive = {}) {
  const prompt = {
    id: canonicalId('prompt', { rankingId: ranking.id, directive }),
    version: 'prompt-' + Date.now(),
    rankingId: ranking.id,
    system: 'EVICS_EVIE_SHARED_PROMPT_FORGE',
    mode: ranking.format.faceless ? 'faceless' : 'creator-led',
    productId: ranking.product.id,
    creatorId: ranking.creator.id,
    formatId: ranking.format.id,
    qualityGates: QUALITY_GATES,
    text: [
      'Create a ' + ranking.format.visualStyle + ' ad for ' + ranking.product.name + '.',
      'Hook pattern: ' + ranking.format.hookPattern,
      'Pacing: ' + ranking.format.pacingPattern,
      'CTA: ' + ranking.format.ctaPattern,
      'Compliance: ' + ranking.product.complianceNotes.join('; '),
      'Operator directive: ' + (directive.operatorCommand || 'build review-ready creative')
    ].join('\n'),
    createdAt: nowIso(),
    source: 'template'
  };
  const wisdom = readWisdom();
  wisdom.promptVersions.push({ id: prompt.id, version: prompt.version, rankingId: ranking.id, createdAt: prompt.createdAt, source: prompt.source });
  writeWisdom(wisdom);
  return prompt;
}

async function buildPrompt(ranking, directive = {}) {
  let feedback = null;
  let lastPrompt = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const llmOutput = await llmProvider.generatePrompt({ ranking, directive, feedback });
      const prompt = {
        id: canonicalId('prompt', { rankingId: ranking.id, directive, source: 'llm', attempt }),
        version: 'prompt-llm-' + Date.now() + '-' + (attempt + 1),
        rankingId: ranking.id,
        system: 'EVICS_EVIE_OPENAI_PROMPT_FORGE',
        mode: ranking.format.faceless ? 'faceless' : 'creator-led',
        productId: ranking.product.id,
        creatorId: ranking.creator.id,
        formatId: ranking.format.id,
        qualityGates: QUALITY_GATES,
        text: String(llmOutput.text || '').trim(),
        creativeAngle: llmOutput.creative_angle || llmOutput.creativeAngle || null,
        hook: llmOutput.hook || null,
        visualStyle: llmOutput.visual_style || ranking.format.visualStyle,
        pacing: llmOutput.pacing || ranking.format.pacingPattern,
        cta: llmOutput.cta || ranking.format.ctaPattern,
        complianceNotes: llmOutput.compliance_notes || ranking.product.complianceNotes,
        llm: llmOutput.llm,
        createdAt: nowIso(),
        source: 'llm'
      };
      lastPrompt = prompt;
      if (prompt.text.length >= 80 && prompt.text.includes(ranking.product.name)) {
        const wisdom = readWisdom();
        wisdom.promptVersions.push({ id: prompt.id, version: prompt.version, rankingId: ranking.id, createdAt: prompt.createdAt, source: prompt.source, llm: prompt.llm });
        writeWisdom(wisdom);
        return prompt;
      }
      feedback = 'Prompt must be at least 80 characters and explicitly include the product name.';
    } catch (error) {
      feedback = error.message;
      console.warn('[EVICS Evie] LLM prompt generation failed, retrying if possible:', error.message);
    }
  }
  console.warn('[EVICS Evie] Falling back to template prompt generation after LLM failure or invalid output.');
  const prompt = buildTemplatePrompt(ranking, directive);
  prompt.warning = 'LLM prompt generation failed; template fallback used.';
  if (lastPrompt && lastPrompt.llm) prompt.lastLlmAttempt = lastPrompt.llm;
  return prompt;
}

function buildTemplateScript(prompt, ranking) {
  const hook = ranking.format.faceless
    ? 'No face. Just the ' + ranking.product.category.toLowerCase() + ' ritual I keep repeating.'
    : ranking.format.hookPattern.replace('[specific support angle]', ranking.product.benefits[0]);
  const scenes = [
    { id: canonicalId('scene', prompt.id + ':hook'), type: 'hook', text: hook, seconds: '0-2' },
    { id: canonicalId('scene', prompt.id + ':proof'), type: 'proof', text: 'Show ' + ranking.product.name + ' as a practical daily ritual.', seconds: '2-6' },
    { id: canonicalId('scene', prompt.id + ':benefit'), type: 'benefit', text: ranking.product.benefits.join(' • '), seconds: '6-12' },
    { id: canonicalId('scene', prompt.id + ':cta'), type: 'cta', text: ranking.format.ctaPattern, seconds: '12-15' }
  ];
  return {
    id: canonicalId('script', prompt.id),
    promptId: prompt.id,
    rankingId: ranking.id,
    scenes,
    voiceover: scenes.map(scene => scene.text).join(' '),
    captions: scenes.map(scene => scene.text.slice(0, 80)),
    qualityScores: ranking.scores,
    quality: evaluateQuality(ranking),
    compliance: evaluateCompliance(ranking),
    createdAt: nowIso(),
    source: 'template'
  };
}

async function buildScript(prompt, ranking) {
  let feedback = null;
  let lastScript = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const llmOutput = await llmProvider.generateScript({ prompt, ranking, feedback });
      const rawScenes = Array.isArray(llmOutput.scenes) && llmOutput.scenes.length > 0
        ? llmOutput.scenes
        : [
            { type: 'hook', text: llmOutput.hook || prompt.hook || prompt.text, seconds: '0-2' },
            { type: 'body', text: llmOutput.voiceover || prompt.text, seconds: '2-12' },
            { type: 'cta', text: llmOutput.cta || ranking.format.ctaPattern, seconds: '12-15' }
          ];
      const scenes = rawScenes.map((scene, index) => ({
        id: canonicalId('scene', prompt.id + ':llm:' + attempt + ':' + index),
        type: scene.type || (index === 0 ? 'hook' : 'body'),
        text: String(scene.text || '').trim(),
        seconds: scene.seconds || scene.timing || null
      })).filter(scene => scene.text);
      const script = {
        id: canonicalId('script', { promptId: prompt.id, source: 'llm', attempt }),
        promptId: prompt.id,
        rankingId: ranking.id,
        scenes,
        voiceover: String(llmOutput.voiceover || scenes.map(scene => scene.text).join(' ')).trim(),
        captions: Array.isArray(llmOutput.captions) && llmOutput.captions.length > 0 ? llmOutput.captions : scenes.map(scene => scene.text.slice(0, 80)),
        cta: llmOutput.cta || ranking.format.ctaPattern,
        qualityScores: ranking.scores,
        quality: evaluateQuality(ranking),
        compliance: evaluateCompliance(ranking),
        llm: llmOutput.llm,
        createdAt: nowIso(),
        source: 'llm'
      };
      lastScript = script;
      const failures = [];
      if (!script.voiceover || script.voiceover.length < 80) failures.push('voiceover is too short');
      if (script.scenes.length < 3) failures.push('script needs at least 3 timed scenes');
      if (script.quality.overall < QUALITY_GATES.overall) failures.push('quality gate overall ' + script.quality.overall + ' < ' + QUALITY_GATES.overall);
      if (!script.compliance.passed) failures.push('compliance gate failed: ' + script.compliance.flags.join(', '));
      if (failures.length === 0) return script;
      feedback = failures.join('; ');
    } catch (error) {
      feedback = error.message;
      console.warn('[EVICS Evie] LLM script generation failed, retrying if possible:', error.message);
    }
  }
  console.warn('[EVICS Evie] Falling back to template script generation after LLM failure or invalid output.');
  const script = buildTemplateScript(prompt, ranking);
  script.warning = 'LLM script generation failed or failed gates; template fallback used.';
  if (lastScript && lastScript.llm) script.lastLlmAttempt = lastScript.llm;
  return script;
}

function evaluateQuality(script) {
  const qualityScores = script && (script.qualityScores || script.scores || script.quality || {});
  const failed = Object.entries(QUALITY_GATES)
    .filter(([key, min]) => Number(qualityScores[key]) < min)
    .map(([key, min]) => ({ key, min, actual: qualityScores[key] }));
  return {
    ...qualityScores,
    passed: failed.length === 0,
    failed,
    gates: QUALITY_GATES
  };
}

function evaluateCompliance(ranking) {
  const syntheticScript = {
    hook: ranking.format.hookPattern || ranking.format.ctaPattern || '',
    scenes: [
      { text: ranking.product.name },
      ...ranking.product.benefits.map((benefit) => ({ text: benefit }))
    ]
  };
  return complianceFlags(ranking, syntheticScript);
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
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];
  const text = `${script.hook || ''} ${scenes.map((scene) => scene.text).join(' ')}`.toLowerCase();
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

function readOrchestrationLog() {
  if (!fs.existsSync(ORCHESTRATION_LOG)) return [];

  const raw = fs.readFileSync(ORCHESTRATION_LOG, 'utf8').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_error) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (_lineError) {
          return [];
        }
      });
  }
}

function runActionFlow(input = {}) {
  const rankings = rankCandidates(input);
  const selected = input.faceless === true
    ? rankings.find((ranking) => ranking.format.faceless) || rankings[0]
    : rankings[0];
  const prompt = buildTemplatePrompt(selected, { operatorCommand: input.command });
  const script = buildTemplateScript(prompt, selected);
  const quality = evaluateQuality(script);
  const compliance = complianceFlags(selected, script);
  const renderJob = createRenderJob(script, selected, { provider: input.provider || 'mock' });
  const reviewReady = quality.passed && compliance.passed && renderJob.status !== 'blocked';
  const qualityScores = script && script.qualityScores ? script.qualityScores : {};
  const publishReady = reviewReady && Number(qualityScores.overall || 0) >= QUALITY_GATES.overall;
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
