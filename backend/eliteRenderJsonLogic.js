'use strict';

const ELITE_RENDER_OBJECTIVES = {
  version: 'elite-render-json-logic-v1',
  standard: 'Elite A+ cinematic commercial',
  mission: 'Use EVICS APIs in sequence so every render starts with product truth, trend strategy, clean assets, cinematic shot planning, provider routing, and quality gates.',
  nonNegotiables: [
    'Product/service identity must be verified before rendering.',
    'Product label must be readable in at least one hero shot.',
    'Static talking-head output alone cannot pass Elite A+.',
    'Motion background and camera movement must be visible in the final video.',
    'Avatar/presenter must provide trust, but motion providers create cinematic evidence.',
    'Final asset must be post-processed, persisted, and quality checked before publish approval.'
  ]
};

const ELITE_RENDER_SEQUENCE = [
  {
    id: 'product-intelligence',
    order: 1,
    required: true,
    candidateTools: ['shopify', 'supabase'],
    inputJson: ['affiliateCode', 'productId', 'productHandle'],
    outputJson: ['productManifest', 'productResolved', 'productImageUrl', 'productPageUrl'],
    gate: { all: ['affiliateCode', 'productTitle', 'productImageUrl', 'productPageUrl'] }
  },
  {
    id: 'trend-strategy',
    order: 2,
    required: false,
    candidateTools: ['apify', 'openai'],
    inputJson: ['productManifest', 'platform'],
    outputJson: ['trendBrief', 'hookAngle', 'platformKeywords'],
    gate: { any: ['trendBrief', 'hookAngle'] }
  },
  {
    id: 'creative-brief',
    order: 3,
    required: true,
    candidateTools: ['openai', 'predis'],
    inputJson: ['productManifest', 'trendBrief', 'platform'],
    outputJson: ['script', 'shotPlan', 'captionPackage', 'cinematicDirective'],
    gate: { all: ['script'], any: ['shotPlan', 'cinematicDirective'] }
  },
  {
    id: 'asset-prep',
    order: 4,
    required: true,
    candidateTools: ['remove-bg', 'clipdrop', 'ffmpeg'],
    inputJson: ['productImageUrl'],
    outputJson: ['processedProductImageUrl', 'transparentProductPng', 'labelCrop'],
    gate: { any: ['processedProductImageUrl', 'transparentProductPng'] }
  },
  {
    id: 'scene-design',
    order: 5,
    required: false,
    candidateTools: ['canva', 'clipdrop', 'openai'],
    inputJson: ['productManifest', 'shotPlan', 'brandProfile'],
    outputJson: ['sceneImages', 'ctaCard', 'thumbnail'],
    gate: { any: ['sceneImages', 'ctaCard'] }
  },
  {
    id: 'avatar-presenter',
    order: 6,
    required: true,
    candidateTools: ['heygen'],
    inputJson: ['script', 'avatarId', 'voiceId', 'avatarPerformancePlan'],
    outputJson: ['presenterVideoUrl', 'heygenVideoId'],
    gate: { any: ['presenterVideoUrl', 'heygenVideoId'] }
  },
  {
    id: 'cinematic-motion',
    order: 7,
    required: true,
    candidateTools: ['kling', 'aimlapi-seedance', 'runway', 'gemini-veo'],
    inputJson: ['processedProductImageUrl', 'sceneImages', 'cinematicDirective', 'cameraMoves'],
    outputJson: ['motionBackgroundUrl', 'productHeroVideoUrl', 'labelCloseupVideoUrl', 'brollClips'],
    gate: { all: ['cameraMoves'], any: ['motionBackgroundUrl', 'productHeroVideoUrl', 'labelCloseupVideoUrl', 'cinematicVideoUrl'] }
  },
  {
    id: 'edit-assemble',
    order: 8,
    required: true,
    candidateTools: ['ffmpeg'],
    inputJson: ['presenterVideoUrl', 'brollClips', 'productHeroVideoUrl', 'processedProductImageUrl', 'ctaCard'],
    outputJson: ['videoUrl', 'processedVideoPath', 'postProcessed', 'productOverlayApplied'],
    gate: { all: ['videoUrl', 'postProcessed'] }
  },
  {
    id: 'quality-gate',
    order: 9,
    required: true,
    candidateTools: ['gemini-veo', 'openai', 'ffmpeg'],
    inputJson: ['videoUrl', 'productManifest', 'eliteCommercialBlueprint'],
    outputJson: ['qualityEvidence', 'qaReport', 'eliteReady'],
    gate: { all: ['qualityEvidence'], any: ['eliteReady', 'qaReport'] }
  },
  {
    id: 'persist-repurpose-publish',
    order: 10,
    required: true,
    candidateTools: ['gcs', 'supabase', 'vizard', 'predis', 'meta', 'stripe'],
    inputJson: ['videoUrl', 'qaReport', 'captionPackage'],
    outputJson: ['gcsVideoUrl', 'variants', 'publishingPlan', 'billingEvent'],
    gate: { all: ['gcsVideoUrl'] }
  }
];

function getPath(source, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), source);
}

function hasValue(source, path) {
  const value = getPath(source, path);
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '' && value !== false;
}

function evaluateGate(gate = {}, context = {}) {
  const all = Array.isArray(gate.all) ? gate.all : [];
  const any = Array.isArray(gate.any) ? gate.any : [];
  const allPassed = all.every((path) => hasValue(context, path));
  const anyPassed = any.length === 0 || any.some((path) => hasValue(context, path));
  return {
    passed: allPassed && anyPassed,
    missingAll: all.filter((path) => !hasValue(context, path)),
    missingAny: any.length && !anyPassed ? any : []
  };
}

function evaluateRenderSequence(context = {}, toolRoute = {}) {
  return ELITE_RENDER_SEQUENCE.map((stage) => {
    const gate = evaluateGate(stage.gate, context);
    const configuredTools = stage.candidateTools
      .map((toolId) => toolRoute[toolId] || toolRoute[stage.id] || null)
      .filter(Boolean);
    return {
      ...stage,
      gate,
      ready: gate.passed && (!stage.required || configuredTools.length > 0 || stage.candidateTools.includes('ffmpeg')),
      configuredTools
    };
  });
}

function buildJsonRenderLogic(context = {}, routingPlan = {}) {
  const route = routingPlan.route || {};
  const toolByStage = {
    'product-intelligence': route.productIntelligence,
    'trend-strategy': route.trendIntelligence,
    'creative-brief': route.reasoning,
    'asset-prep': route.assetPrep,
    'scene-design': route.design,
    'avatar-presenter': route.presenter,
    'cinematic-motion': route.productMotion || route.lifestyleMotion,
    'edit-assemble': route.editor,
    'quality-gate': route.visualQa || route.editor,
    'persist-repurpose-publish': route.persistence || route.repurpose || route.publishing
  };
  const stageResults = evaluateRenderSequence(context, toolByStage);
  const blockers = stageResults
    .filter((stage) => stage.required && !stage.ready)
    .map((stage) => ({
      stage: stage.id,
      missingAll: stage.gate.missingAll,
      missingAny: stage.gate.missingAny,
      candidateTools: stage.candidateTools
    }));
  return {
    objectives: ELITE_RENDER_OBJECTIVES,
    sequence: stageResults,
    ready: blockers.length === 0,
    blockers
  };
}

module.exports = {
  ELITE_RENDER_OBJECTIVES,
  ELITE_RENDER_SEQUENCE,
  evaluateGate,
  evaluateRenderSequence,
  buildJsonRenderLogic
};
