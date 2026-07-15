'use strict';

const MOTION_PROVIDER_PRIORITY = [
  {
    provider: 'kling-omni',
    purpose: 'Generate motion scenes, product hero close-ups, and cinematic lifestyle b-roll.',
    requiredForElite: true
  },
  {
    provider: 'seedance-or-runway',
    purpose: 'Fallback motion generation for moving backgrounds, camera movement, and product inserts.',
    requiredForElite: true
  },
  {
    provider: 'heygen-avatar',
    purpose: 'Presenter narration only. Talking-head output alone is not Elite A+ evidence.',
    requiredForElite: false
  },
  {
    provider: 'ffmpeg-editor',
    purpose: 'Final edit, product label insert, CTA card, color grade, and persistent export.',
    requiredForElite: true
  }
];

const REQUIRED_SHOTS = [
  {
    id: 'motion-hook',
    order: 1,
    durationSeconds: 3,
    objective: 'Open with a moving lifestyle scene and camera motion that fits the product category.',
    requiredEvidence: ['motionBackground', 'cameraMovement']
  },
  {
    id: 'avatar-performance',
    order: 2,
    durationSeconds: 6,
    objective: 'Show a presenter with believable body language, gestures, or scene presence; not just a static talking head.',
    requiredEvidence: ['avatarPerformance']
  },
  {
    id: 'product-hero-label',
    order: 3,
    durationSeconds: 4,
    objective: 'Cut to a clear product hero shot with the product label large enough to read.',
    requiredEvidence: ['productHeroShot', 'productLabelReadable']
  },
  {
    id: 'benefit-proof-broll',
    order: 4,
    durationSeconds: 5,
    objective: 'Use moving b-roll or generated cinematic footage to support the key benefit claim.',
    requiredEvidence: ['motionBackground', 'cameraMovement']
  },
  {
    id: 'foreground-product-presentation',
    order: 5,
    durationSeconds: 4,
    objective: 'Bring the product back in the foreground without blocking the presenter or CTA.',
    requiredEvidence: ['foregroundProductPresentation']
  },
  {
    id: 'cta-end-card',
    order: 6,
    durationSeconds: 3,
    objective: 'End with a clean CTA, product name, and destination/link instruction.',
    requiredEvidence: ['clearCta', 'persistentFinalAsset']
  }
];

const EVIDENCE_LABELS = {
  motionBackground: 'Moving background or cinematic b-roll is present in the final video.',
  cinematicFinalComposition: 'The final delivered asset uses the cinematic composition, not only a HeyGen talking-head base.',
  avatarPerformance: 'Presenter has gestures, body movement, walking, or believable scene performance.',
  cameraMovement: 'Final video includes camera motion such as push-in, pan, orbit, dolly, or zoom.',
  productHeroShot: 'A dedicated product hero shot is included.',
  productLabelReadable: 'The product label is large and clear enough for a viewer to read.',
  foregroundProductPresentation: 'The product is presented in front of the scene/avatar in a safe area.',
  clearCta: 'The CTA is visible/spoken and aligned to the destination.',
  postProcessed: 'Final editing/post-processing succeeded.',
  persistentFinalAsset: 'The final video is stored as a persistent asset.',
  completed: 'The render job completed successfully.'
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[\n,;|]+/).map((entry) => normalizeText(entry)).filter(Boolean);
  }
  return [];
}

function hasUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function sameUrl(left, right) {
  return Boolean(left && right && String(left) === String(right));
}

function usesCinematicAsFinal(record = {}) {
  return Boolean(
    record.finalCompositionType === 'cinematic-commercial'
    || record.cinematicFinalApplied
    || (record.useCinematicVideoAsBase && hasUrl(record.cinematicVideoUrl))
    || sameUrl(record.finalSourceVideoUrl, record.cinematicVideoUrl)
    || sameUrl(record.videoUrl, record.cinematicVideoUrl)
    || sameUrl(record.gcsVideoUrl, record.cinematicVideoUrl)
  );
}

function hasMotionBackground(record = {}) {
  const background = record.background && typeof record.background === 'object' ? record.background : {};
  return Boolean(
    record.motionBackgroundApplied
    || record.backgroundMotionApplied
    || background.type === 'video'
    || background.motion === true
    || usesCinematicAsFinal(record)
  );
}

function hasCameraMovement(record = {}) {
  const moves = normalizeStringArray(record.cameraMoves || record.cinematicDirective?.cameraMoves);
  return Boolean(
    record.cameraMovementApplied
    || record.cameraMotionApplied
    || (moves.length && hasMotionBackground(record))
  );
}

function hasAvatarPerformance(record = {}) {
  const mode = normalizeText(record.avatarPerformanceMode || record.avatarAction || record.avatarMotionMode).toLowerCase();
  return Boolean(
    record.avatarPerformanceApplied
    || record.avatarGestureApplied
    || record.avatarWalkingApplied
    || ['gesture', 'gestures', 'full-body', 'walking', 'cinematic', 'commercial-performance'].includes(mode)
  );
}

function hasProductHeroShot(record = {}) {
  return Boolean(
    record.productHeroShotApplied
    || record.productCloseupApplied
    || record.productLabelHeroShotApplied
    || (record.productOverlayApplied && record.productLabelReadable)
  );
}

function hasProductLabelReadable(record = {}) {
  return Boolean(
    record.productLabelReadable
    || record.productLabelVisibilityScore >= 85
    || record.productLabelHeroShotApplied
  );
}

function hasClearCta(record = {}) {
  return Boolean(
    record.ctaCardApplied
    || record.ctaTextApplied
    || record.ctaOverlayApplied
    || normalizeText(record.ctaText || record.productPageUrl)
  );
}

function buildEliteCommercialBlueprint(record = {}) {
  const productTitle = normalizeText(record.productTitle || record.productName || 'Featured Product');
  const platform = normalizeText(record.platform || 'tiktok') || 'tiktok';
  const category = normalizeText(record.metadata?.category || record.productCategory || record.productHandle || 'product');

  return {
    version: 'elite-commercial-v1',
    gradeTarget: 'A+',
    productTitle,
    platform,
    category,
    intent: 'Create a premium commercial, not a static talking-head render.',
    objectives: [
      'Use moving lifestyle/cinematic footage as the final visual base.',
      'Present the product as a readable hero object with a clear label close-up.',
      'Include avatar performance evidence: gestures, body language, walking, or scene interaction.',
      'Use camera motion and edited shot changes to create commercial pacing.',
      'Persist the final edited asset and only mark Elite A+ when every evidence gate is true.'
    ],
    requiredShots: REQUIRED_SHOTS.map((shot) => ({ ...shot })),
    providerStrategy: MOTION_PROVIDER_PRIORITY.map((entry) => ({ ...entry })),
    qualityGates: { ...EVIDENCE_LABELS },
    finalPassRule: 'Elite A+ requires every quality gate to be true. A HeyGen talking head over a static image must never pass as Elite A+.'
  };
}

function evaluateEliteCommercialEvidence(record = {}) {
  const status = normalizeText(record.status).toLowerCase();
  const evidence = {
    motionBackground: hasMotionBackground(record),
    cinematicFinalComposition: usesCinematicAsFinal(record),
    avatarPerformance: hasAvatarPerformance(record),
    cameraMovement: hasCameraMovement(record),
    productHeroShot: hasProductHeroShot(record),
    productLabelReadable: hasProductLabelReadable(record),
    foregroundProductPresentation: Boolean(record.productOverlayApplied || record.foregroundProductPresentation),
    clearCta: hasClearCta(record),
    postProcessed: Boolean(record.postProcessed),
    persistentFinalAsset: Boolean(record.gcsVideoUrl),
    completed: status === 'completed' && Boolean(record.videoUrl)
  };

  const blockers = Object.entries(evidence)
    .filter(([, passed]) => !passed)
    .map(([gate]) => ({ gate, requirement: EVIDENCE_LABELS[gate] }));

  return {
    ready: blockers.length === 0,
    evidence,
    blockers,
    blueprint: buildEliteCommercialBlueprint(record)
  };
}

module.exports = {
  buildEliteCommercialBlueprint,
  evaluateEliteCommercialEvidence,
  REQUIRED_SHOTS,
  EVIDENCE_LABELS,
  MOTION_PROVIDER_PRIORITY
};
