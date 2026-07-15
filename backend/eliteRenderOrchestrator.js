'use strict';

const { buildEliteCommercialBlueprint, evaluateEliteCommercialEvidence } = require('./eliteCommercialBlueprint');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((entry) => normalizeText(entry)).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\n,;|]+/).map((entry) => normalizeText(entry)).filter(Boolean);
  return [];
}

function titleCase(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferCategory(context = {}) {
  const metadataCategory = normalizeText(context.metadata?.category);
  if (metadataCategory) return metadataCategory;
  const handle = normalizeText(context.productHandle || context.product?.handle || context.productId).toLowerCase();
  const text = `${handle} ${normalizeText(context.productTitle)} ${normalizeText(context.productDescription)}`.toLowerCase();
  if (/sea|moss|marine|ocean|mineral|thyroid|wellness/.test(text)) return 'wellness';
  if (/pre.?workout|energy|gym|fitness/.test(text)) return 'fitness';
  if (/skin|beauty|hair|glow/.test(text)) return 'beauty';
  if (/service|consult|coaching|agency/.test(text)) return 'service';
  return 'general-commerce';
}

function pickHookAngle(context = {}) {
  const title = normalizeText(context.productTitle || context.productName || 'this product');
  const category = inferCategory(context);
  const benefits = normalizeArray(context.productBenefits || context.benefits);
  const strongestBenefit = benefits[0] || normalizeText(context.howToUse) || `why ${title} belongs in your daily routine`;
  if (category === 'wellness') return `A premium daily wellness ritual built around ${title}`;
  if (category === 'fitness') return `A clean performance-support story for ${title}`;
  if (category === 'beauty') return `A polished transformation story featuring ${title}`;
  if (category === 'service') return `A trust-building service proof sequence for ${title}`;
  return titleCase(strongestBenefit);
}

function buildAgentWorkflow(context = {}) {
  return [
    {
      id: 'product-intelligence-agent',
      toolSurface: 'shopify/product resolver + mockup library + background remover',
      objective: 'Verify exact product/service identity, image, destination, price, benefits, and label asset before creative planning.',
      requiredInputs: ['productId or productHandle', 'affiliateCode'],
      requiredOutputs: ['verifiedProductMatch', 'productImageUrl', 'processedProductImageUrl', 'productPageUrl'],
      blocksRenderIfMissing: ['verifiedProductMatch', 'processedProductImageUrl']
    },
    {
      id: 'viral-strategy-agent',
      toolSurface: 'trend scout + EVICS intelligence scoring + algorithm optimization engine',
      objective: 'Choose platform, hook angle, keywords, caption package, and short-form pacing before script generation.',
      requiredInputs: ['product category', 'platform', 'benefits'],
      requiredOutputs: ['hookAngle', 'platformOptimization', 'searchKeywords', 'viralScoreTarget'],
      blocksRenderIfMissing: ['hookAngle']
    },
    {
      id: 'compliance-trust-agent',
      toolSurface: 'renderQualityValidator + governance engine',
      objective: 'Remove prohibited claims and ensure the product promise is trustworthy before voice/video generation.',
      requiredInputs: ['script', 'productDescription', 'productBenefits'],
      requiredOutputs: ['cleanSpokenScript', 'compliancePassed'],
      blocksRenderIfMissing: ['compliancePassed']
    },
    {
      id: 'cinematic-director-agent',
      toolSurface: 'elite commercial blueprint + cinematic layer engine',
      objective: 'Convert product strategy into a shot-by-shot commercial with moving background, camera motion, product hero shot, and label close-up.',
      requiredInputs: ['hookAngle', 'product mockup', 'platform'],
      requiredOutputs: ['shotPlan', 'cameraMoves', 'cinematicDirective'],
      blocksRenderIfMissing: ['shotPlan', 'cameraMoves']
    },
    {
      id: 'avatar-performance-agent',
      toolSurface: 'HeyGen/native avatar renderers',
      objective: 'Use the avatar for narration/performance only, with requested gestures/body language when supported. Never treat talking head alone as Elite evidence.',
      requiredInputs: ['avatarId', 'voiceId', 'cleanSpokenScript'],
      requiredOutputs: ['avatarPerformancePlan', 'heygenFallbackPlan'],
      blocksRenderIfMissing: ['cleanSpokenScript']
    },
    {
      id: 'motion-generation-agent',
      toolSurface: 'Kling/Seedance/Runway-style motion providers',
      objective: 'Generate cinematic b-roll, moving environment, product hero label shot, and benefit proof clips.',
      requiredInputs: ['product mockup', 'cinematicDirective', 'cameraMoves'],
      requiredOutputs: ['motionBackground', 'productHeroClip', 'labelCloseupClip'],
      blocksRenderIfMissing: ['motionBackground', 'productHeroClip']
    },
    {
      id: 'editor-assembly-agent',
      toolSurface: 'FFmpeg post processor + media output routes + GCS persistence',
      objective: 'Assemble final commercial sequence, foreground product presentation, CTA, color grade, and persistent final asset.',
      requiredInputs: ['avatar clip', 'motion clips', 'product mockup', 'CTA'],
      requiredOutputs: ['postProcessed', 'productLabelReadable', 'gcsVideoUrl'],
      blocksRenderIfMissing: ['postProcessed', 'gcsVideoUrl']
    },
    {
      id: 'elite-quality-gate-agent',
      toolSurface: 'elite evidence evaluator + render quality validator',
      objective: 'Fail or hold the render unless every Elite A+ evidence gate is true.',
      requiredInputs: ['final record', 'media URLs', 'quality evidence'],
      requiredOutputs: ['eliteReady', 'blockers', 'publishApproval'],
      blocksRenderIfMissing: ['eliteReady']
    }
  ];
}

function buildShotPlan(context = {}) {
  const title = normalizeText(context.productTitle || context.productName || 'the product');
  const category = inferCategory(context);
  const hookAngle = pickHookAngle(context);
  const productPageUrl = normalizeText(context.productPageUrl || context.destinationUrl || 'link in bio');

  return [
    {
      id: 'hook-motion-open',
      seconds: '0-3',
      provider: 'kling-or-seedance',
      visual: `Moving ${category} lifestyle opener with premium lighting and a slow camera push-in.`,
      purpose: 'Stop the scroll immediately with real motion, not a still background.',
      audio: `Hook: ${hookAngle}.`,
      evidence: ['motionBackground', 'cameraMovement']
    },
    {
      id: 'avatar-performance',
      seconds: '3-9',
      provider: 'heygen-or-native-avatar',
      visual: 'Presenter speaks with expressive head movement, hand gestures, and commercial body language. Background remains cinematic/lifestyle, not a product cutout.',
      purpose: 'Build trust through a human presenter without pretending a static talking head is cinematic.',
      audio: 'State the core problem and product promise clearly.',
      evidence: ['avatarPerformance']
    },
    {
      id: 'label-closeup',
      seconds: '9-13',
      provider: 'kling-or-seedance-product-i2v',
      visual: `${title} fills the frame with a readable label, premium turntable/zoom, shallow depth of field, and clean highlight reflections.`,
      purpose: 'Make the product and label unmistakable.',
      audio: 'Name the product once while the label is visible.',
      evidence: ['productHeroShot', 'productLabelReadable']
    },
    {
      id: 'benefit-proof-motion',
      seconds: '13-18',
      provider: 'kling-or-seedance',
      visual: 'Moving benefit b-roll that matches the category and product use case; include camera pan/orbit, not a static stock image.',
      purpose: 'Show the benefit visually and make the scene feel like a commercial.',
      audio: 'Explain one clear benefit without medical or exaggerated claims.',
      evidence: ['motionBackground', 'cameraMovement']
    },
    {
      id: 'foreground-product-presentation',
      seconds: '18-22',
      provider: 'ffmpeg-editor',
      visual: 'Bring the product back as a foreground sales object in a safe lower corner or center hero frame without blocking the presenter.',
      purpose: 'Reinforce product recall and make the offer visually concrete.',
      audio: 'Transition to CTA.',
      evidence: ['foregroundProductPresentation']
    },
    {
      id: 'cta-end-card',
      seconds: '22-26',
      provider: 'ffmpeg-editor',
      visual: `Clean CTA card with ${title}, brand, and ${productPageUrl}.`,
      purpose: 'Make the next action obvious and publish-ready.',
      audio: 'Direct CTA: shop now / link in bio.',
      evidence: ['clearCta', 'persistentFinalAsset']
    }
  ];
}

function buildCinematicDirective(context = {}) {
  const title = normalizeText(context.productTitle || context.productName || 'featured product');
  const category = inferCategory(context);
  const hookAngle = pickHookAngle(context);
  return {
    prompt: [
      `Create an elite cinematic commercial for ${title}.`,
      `Category: ${category}. Hook angle: ${hookAngle}.`,
      'Use moving environments, visible camera motion, premium lighting, product hero close-ups, readable label shots, and a polished CTA ending.',
      'Do not use the product mockup as the avatar background. The product must appear as a deliberate hero shot or foreground sales object.',
      'A static talking-head scene is fallback only and must not be considered Elite A+.'
    ].join(' '),
    cameraMoves: ['slow push-in', 'product orbit', 'label macro zoom', 'lifestyle pan', 'cta lock-off'],
    requiredShots: buildShotPlan(context).map((shot) => shot.id),
    requireMotionBackground: true,
    requireAvatarPerformance: true,
    requireProductHeroShot: true,
    requireReadableProductLabel: true,
    requireForegroundProductPresentation: true,
    requireCtaEndCard: true
  };
}

function buildPreRenderQualityGates(context = {}) {
  const hasProduct = Boolean(normalizeText(context.productTitle || context.productName));
  const hasImage = Boolean(normalizeText(context.processedProductImageUrl || context.productImageUrl));
  const hasDestination = Boolean(normalizeText(context.productPageUrl || context.destinationUrl));
  const hasAffiliate = Boolean(normalizeText(context.affiliateCode));
  const hasScript = Boolean(normalizeText(context.script || context.spokenScript || context.customScript));
  const gates = [
    { gate: 'productIdentityVerified', passed: hasProduct, requirement: 'Product/service title must be resolved before render.' },
    { gate: 'productMockupReady', passed: hasImage, requirement: 'Product/service visual asset or mockup must be available before render.' },
    { gate: 'destinationReady', passed: hasDestination, requirement: 'CTA destination must be known before render.' },
    { gate: 'affiliateReady', passed: hasAffiliate, requirement: 'Affiliate code must be present for tracking and quota.' },
    { gate: 'scriptReady', passed: hasScript, requirement: 'A clean spoken script must exist before avatar render.' },
    { gate: 'cinematicPlanReady', passed: true, requirement: 'Shot plan, provider route, and quality gates are generated.' }
  ];
  return {
    passed: gates.every((gate) => gate.passed),
    gates,
    blockers: gates.filter((gate) => !gate.passed)
  };
}

function buildProviderRoute(context = {}) {
  const cinematicEngine = normalizeText(context.cinematicEngine || 'kling-omni').toLowerCase();
  return {
    strategy: 'shot-based-commercial-assembly',
    primaryMotionProvider: cinematicEngine.includes('seedance') ? 'seedance' : 'kling-omni',
    fallbackMotionProvider: cinematicEngine.includes('seedance') ? 'kling-omni' : 'seedance-or-runway',
    avatarProvider: normalizeText(context.avatarProvider || 'heygen-avatar'),
    editor: 'ffmpeg-editor',
    persistence: 'gcs-media-output',
    note: 'HeyGen is the presenter layer. Motion providers and editor assembly are responsible for cinematic evidence.'
  };
}

function buildEliteRenderWorkflow(context = {}) {
  const enrichedContext = {
    ...context,
    productTitle: context.productTitle || context.product?.title,
    productImageUrl: context.productImageUrl || context.product?.imageUrl || context.product?.image,
    productPageUrl: context.productPageUrl || context.product?.productPageUrl || context.product?.url
  };
  const cinematicDirective = buildCinematicDirective(enrichedContext);
  const workflow = {
    version: 'elite-render-workflow-v1',
    renderStandard: 'Elite A+ cinematic commercial',
    mission: 'Use every EVICS intelligence, creative, render, post-process, persistence, and quality tool in sequence before and after rendering.',
    product: {
      title: normalizeText(enrichedContext.productTitle || 'Featured Product'),
      category: inferCategory(enrichedContext),
      hookAngle: pickHookAngle(enrichedContext),
      destination: normalizeText(enrichedContext.productPageUrl || enrichedContext.destinationUrl || '')
    },
    agentWorkflow: buildAgentWorkflow(enrichedContext),
    shotPlan: buildShotPlan(enrichedContext),
    cinematicDirective,
    cameraMoves: cinematicDirective.cameraMoves,
    providerRoute: buildProviderRoute(enrichedContext),
    preRenderQualityGates: buildPreRenderQualityGates(enrichedContext),
    eliteCommercialBlueprint: buildEliteCommercialBlueprint(enrichedContext),
    successDefinition: 'Final video must contain cinematic motion, avatar performance evidence, readable product label close-up, foreground product presentation, CTA, and persistent final media URL.'
  };
  return workflow;
}

function evaluateWorkflowReadiness(record = {}) {
  const workflow = record.eliteRenderWorkflow || buildEliteRenderWorkflow(record);
  const commercial = evaluateEliteCommercialEvidence(record);
  return {
    workflow,
    preRenderReady: Boolean(workflow.preRenderQualityGates?.passed),
    preRenderBlockers: workflow.preRenderQualityGates?.blockers || [],
    finalReady: commercial.ready,
    finalBlockers: commercial.blockers,
    evidence: commercial.evidence
  };
}

module.exports = {
  buildEliteRenderWorkflow,
  buildCinematicDirective,
  buildPreRenderQualityGates,
  buildAgentWorkflow,
  buildShotPlan,
  buildProviderRoute,
  evaluateWorkflowReadiness
};
