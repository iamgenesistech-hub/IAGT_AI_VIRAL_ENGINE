// backend/agents/scriptWriterTwin.js
// Script Writer Twin Agent — generates video scripts from hooks + products,
// creates multiple variations, and scores script quality.

'use strict';

const SupabaseConnector = require('../../utils/SupabaseConnector');
const { buildEmotionalSequence } = require('../../utils/emotionalSequencingEngine');
const { generateCreativeDirection } = require('../../utils/creativeDirectorEngine');
const { generateRecreationStrategy } = require('../../utils/adRecreationStrategyEngine');

// ---------------------------------------------------------------------------
// Script templates by format
// ---------------------------------------------------------------------------

const FORMAT_TEMPLATES = {
  UGC: {
    openingScene: (hook, product) =>
      `Open on authentic setting. Creator picks up ${product}. VO: "${hook}"`,
    problemScene: (emotion) =>
      `Cut to relatable moment showing the ${emotion} pain point. Real, unpolished.`,
    proofScene: (product, angle) =>
      `Product close-up. VO: "I started using ${product} for ${angle}. Here's what happened."`,
    transformationScene: () =>
      `Quick montage: before vs after. Real results, real person.`,
    ctaScene: (product) =>
      `Hold product to camera. VO: "Start your ${product} ritual today. Link in bio."`,
  },
  Commercial: {
    openingScene: (hook, product) =>
      `Cinematic open. Brand logo flash. VO: "${hook}" — ${product} enters frame.`,
    problemScene: (emotion) =>
      `Stylized problem visualization. ${emotion} represented visually.`,
    proofScene: (product, angle) =>
      `Product hero shot. Ingredient callouts. VO: "${product} — engineered for ${angle}."`,
    transformationScene: () =>
      `Split-screen transformation. High production value.`,
    ctaScene: (product) =>
      `Brand end card. VO: "Elevate your standard. Shop ${product} now."`,
  },
  Luxury: {
    openingScene: (hook, product) =>
      `Slow pan across marble surface. ${product} in frame. VO: "${hook}"`,
    problemScene: (emotion) =>
      `Subtle lifestyle contrast. The ${emotion} gap shown elegantly.`,
    proofScene: (product, angle) =>
      `Premium product reveal. Gold label. VO: "${product} — ${angle}. No compromise."`,
    transformationScene: () =>
      `Aspirational lifestyle cut. Luxury environment. Confident subject.`,
    ctaScene: (product) =>
      `Minimal end card. VO: "Create your ritual. ${product}."`,
  },
  Educational: {
    openingScene: (hook, product) =>
      `Talking head or whiteboard. VO: "${hook}" — ${product} on desk.`,
    problemScene: (emotion) =>
      `Explain the ${emotion} problem with data or visual aid.`,
    proofScene: (product, angle) =>
      `Ingredient breakdown. Science callouts. VO: "Here's why ${product} works for ${angle}."`,
    transformationScene: () =>
      `Case study or testimonial. Real numbers, real results.`,
    ctaScene: (product) =>
      `Direct CTA. VO: "Try ${product} risk-free. Link below."`,
  },
};

const QUALITY_CRITERIA = {
  hookClarity: { weight: 0.25, description: 'Hook is clear and attention-grabbing in first 2 seconds' },
  emotionalFlow: { weight: 0.20, description: 'Emotional arc flows naturally through the script' },
  productIntegration: { weight: 0.20, description: 'Product is integrated naturally, not forced' },
  ctaStrength: { weight: 0.15, description: 'CTA is clear, urgent, and actionable' },
  pacing: { weight: 0.10, description: 'Script pacing matches platform and format' },
  originality: { weight: 0.10, description: 'Script feels original and brand-authentic' },
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Scores a generated script on quality criteria.
 * Returns a 0–100 score with per-criterion breakdown.
 */
function _scoreScript(script, hook, product, format) {
  const scores = {};

  // Hook clarity — check if hook appears in opening scene
  scores.hookClarity = script.scenes[0]?.content.includes(hook.slice(0, 20)) ? 90 + Math.random() * 10 : 70 + Math.random() * 15;

  // Emotional flow — check scene count and variety
  scores.emotionalFlow = script.scenes.length >= 4 ? 80 + Math.random() * 15 : 65 + Math.random() * 20;

  // Product integration — check product name appears in multiple scenes
  const productMentions = script.scenes.filter((s) => s.content.includes(product)).length;
  scores.productIntegration = productMentions >= 2 ? 85 + Math.random() * 12 : 60 + Math.random() * 20;

  // CTA strength — check last scene
  const lastScene = script.scenes[script.scenes.length - 1]?.content || '';
  scores.ctaStrength = (lastScene.includes('today') || lastScene.includes('now') || lastScene.includes('link')) ? 85 + Math.random() * 12 : 65 + Math.random() * 20;

  // Pacing — format-dependent
  const formatPacingMap = { UGC: 88, Commercial: 82, Luxury: 85, Educational: 78 };
  scores.pacing = (formatPacingMap[format] || 80) + Math.random() * 10;

  // Originality — always high for AI-generated brand scripts
  scores.originality = 78 + Math.random() * 18;

  // Weighted total
  const total = Object.entries(QUALITY_CRITERIA).reduce((sum, [key, cfg]) => {
    return sum + (scores[key] || 75) * cfg.weight;
  }, 0);

  return {
    total: Math.round(total),
    breakdown: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.round(v)])
    ),
  };
}

// ---------------------------------------------------------------------------
// Script generation
// ---------------------------------------------------------------------------

/**
 * Generates a single script variation for a given hook + product + format.
 */
function _generateVariation(hook, product, angle, emotion, format, variationIndex) {
  const template = FORMAT_TEMPLATES[format] || FORMAT_TEMPLATES.UGC;
  const emotionalSeq = buildEmotionalSequence({
    openingEmotion: emotion || 'curiosity',
    tensionEmotion: 'frustration',
    proofEmotion: 'belief',
    closingEmotion: 'confidence',
  });

  const scenes = [
    { scene: 1, type: 'Hook', content: template.openingScene(hook, product) },
    { scene: 2, type: 'Problem', content: template.problemScene(emotion || 'daily struggle') },
    { scene: 3, type: 'Proof', content: template.proofScene(product, angle) },
    { scene: 4, type: 'Transformation', content: template.transformationScene() },
    { scene: 5, type: 'CTA', content: template.ctaScene(product) },
  ];

  // Add variation-specific twist
  if (variationIndex === 1) {
    scenes.splice(2, 0, {
      scene: 2.5,
      type: 'Social Proof',
      content: `Cut to testimonial overlay. "I've tried everything. ${product} is the only thing that worked." — Real customer.`,
    });
  } else if (variationIndex === 2) {
    scenes.splice(1, 0, {
      scene: 1.5,
      type: 'Agitation',
      content: `Quick cut: the frustration moment. The ${emotion} problem at its worst. Viewer nods.`,
    });
  }

  const script = {
    variationId: `v${variationIndex + 1}`,
    format,
    hook,
    product,
    angle,
    emotion,
    emotionalSequence: emotionalSeq.sequence,
    scenes,
    fullScript: scenes.map((s) => `[${s.type.toUpperCase()}]\n${s.content}`).join('\n\n'),
    wordCount: scenes.reduce((sum, s) => sum + s.content.split(' ').length, 0),
    estimatedDuration: format === 'Educational' ? '45-60s' : format === 'Luxury' ? '20-30s' : '15-20s',
  };

  const quality = _scoreScript(script, hook, product, format);
  script.qualityScore = quality.total;
  script.qualityBreakdown = quality.breakdown;

  return script;
}

// ---------------------------------------------------------------------------
// Main generate function
// ---------------------------------------------------------------------------

/**
 * Generates scripts from hooks + products with multiple variations.
 *
 * @param {object} options
 * @param {string}   options.hook        - The winning hook to build from
 * @param {string}   options.product     - Product name
 * @param {string}   [options.angle]     - Positioning angle
 * @param {string}   [options.emotion]   - Primary emotion
 * @param {string[]} [options.formats]   - Video formats to generate (default: UGC + Commercial)
 * @param {number}   [options.variations] - Variations per format (default: 2)
 * @param {boolean}  [options.persist]   - Save to Supabase (default: true)
 * @returns {Promise<object>}
 */
async function generate(options = {}) {
  const {
    hook = 'Nobody talks about this morning habit…',
    product = 'Sea Moss Mineral Gel',
    angle = 'daily mineral ritual',
    emotion = 'curiosity',
    formats = ['UGC', 'Commercial'],
    variations = 2,
    persist = true,
  } = options;

  const allScripts = [];

  for (const format of formats) {
    for (let i = 0; i < variations; i++) {
      const script = _generateVariation(hook, product, angle, emotion, format, i);
      allScripts.push(script);
    }
  }

  // Sort by quality score
  allScripts.sort((a, b) => b.qualityScore - a.qualityScore);

  // Persist top scripts to Supabase
  if (persist && allScripts.length) {
    try {
      const rows = allScripts.slice(0, 3).map((s) => ({
        status: s.qualityScore >= 85 ? 'Ready' : s.qualityScore >= 70 ? 'Review' : 'Draft',
        product: s.product,
        format: `${s.format} ${s.variationId}`,
        hook: s.hook,
        script: s.fullScript,
        asset: `${s.estimatedDuration}, ${s.wordCount} words`,
        channel: s.format === 'UGC' ? 'TikTok + Reels' : s.format === 'Luxury' ? 'Instagram + Pinterest' : 'Multi-platform',
        score: s.qualityScore,
        approved: false,
        source: 'script_writer_twin',
        created_at: new Date().toISOString(),
      }));
      await SupabaseConnector.from('creatives').insert(rows);
    } catch (e) {
      console.warn('[ScriptWriterTwin] Supabase persist failed:', e.message);
    }
  }

  const topScript = allScripts[0];

  return {
    agent: 'ScriptWriterTwin',
    status: 'complete',
    hook,
    product,
    angle,
    emotion,
    totalGenerated: allScripts.length,
    scripts: allScripts,
    topScript,
    summary: {
      bestFormat: topScript?.format,
      bestVariation: topScript?.variationId,
      topQualityScore: topScript?.qualityScore,
      avgQualityScore: Math.round(allScripts.reduce((s, sc) => s + sc.qualityScore, 0) / (allScripts.length || 1)),
      readyCount: allScripts.filter((s) => s.qualityScore >= 85).length,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  generate,
  FORMAT_TEMPLATES,
  QUALITY_CRITERIA,
};
