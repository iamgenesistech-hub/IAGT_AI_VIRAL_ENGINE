'use strict';

const {
  buildEliteCommercialBlueprint,
  evaluateEliteCommercialEvidence
} = require('./eliteCommercialBlueprint');
const {
  buildEliteRenderWorkflow,
  evaluateWorkflowReadiness
} = require('./eliteRenderOrchestrator');
const {
  planCommercialTimeline,
  resolveTrackSources,
  isMultiTrackReady,
  summarizeAssembly
} = require('./commercialAssembler');

const STAGE_LOCK_MS = 4 * 60 * 1000;

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,;|]+/)
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function normalizeBenefits(value) {
  const list = normalizeStringArray(value);
  if (list.length) return list;
  return value && typeof value === 'object' ? normalizeStringArray(Object.values(value)) : [];
}

function normalizeAffiliateProductVideoRequest(body = {}) {
  const payload = body && typeof body === 'object' ? body : {};
  const product = payload.product && typeof payload === 'object' && payload.product && typeof payload.product === 'object' ? payload.product : {};
  const cinematicDirective = payload.cinematicDirective && typeof payload.cinematicDirective === 'object'
    ? payload.cinematicDirective
    : {};

  const productTitle = pickFirstString(
    payload.productTitle,
    payload.productName,
    payload.offer,
    product.title
  );
  const spokenScript = pickFirstString(
    payload.customScript,
    payload.script,
    payload.spokenScript
  );
  const avatarId = pickFirstString(payload.avatarId, payload.avatar);
  const voiceId = pickFirstString(payload.voiceId, payload.voice);
  const productDescription = pickFirstString(
    payload.productDescription,
    payload.description,
    product.description
  );
  const howToUse = pickFirstString(
    payload.howToUse,
    payload.usageInstructions,
    payload.usage,
    product.howToUse,
    product.usageInstructions
  );
  const productBenefits = normalizeBenefits(
    payload.productBenefits !== undefined
      ? payload.productBenefits
      : (payload.benefits !== undefined ? payload.benefits : product.benefits)
  );
  const cameraMoves = normalizeStringArray(
    payload.cameraMoves !== undefined
      ? payload.cameraMoves
      : cinematicDirective.cameraMoves
  );

  return {
    affiliateCode: pickFirstString(payload.affiliateCode, payload.code),
    avatarRequestId: pickFirstString(payload.avatarRequestId),
    avatarId,
    voiceId,
    avatarAttire: payload.avatarAttire,
    avatarAttireLabel: pickFirstString(payload.avatarAttireLabel),
    productId: pickFirstString(payload.productId, product.id),
    productHandle: pickFirstString(payload.productHandle, product.handle),
    productTitle,
    productImageUrl: pickFirstString(payload.productImageUrl, product.imageUrl, product.image),
    productPageUrl: pickFirstString(payload.productPageUrl, product.productPageUrl, product.url),
    productPrice: pickFirstString(payload.productPrice, product.price),
    productDescription,
    productBenefits,
    howToUse,
    spokenScript,
    qualityMode: pickFirstString(payload.qualityMode),
    platform: pickFirstString(payload.platform),
    cinematicMode: payload.cinematicMode,
    cinematicEngine: pickFirstString(payload.cinematicEngine),
    cinematicProfile: pickFirstString(payload.cinematicProfile),
    cinematicIntensity: payload.cinematicIntensity,
    backgroundMode: pickFirstString(payload.backgroundMode),
    backgroundUrl: pickFirstString(payload.backgroundUrl),
    backgroundQuery: pickFirstString(payload.backgroundQuery),
    cameraMoves,
    cinematicDirective: {
      ...cinematicDirective,
      cameraMoves: cameraMoves.length ? cameraMoves : normalizeStringArray(cinematicDirective.cameraMoves),
      prompt: pickFirstString(payload.cinematicDirectivePrompt, cinematicDirective.prompt, payload.cinematicDirective)
    }
  };
}

function ensureEliteWorkflow(record = {}) {
  return record.eliteRenderWorkflow || buildEliteRenderWorkflow(record);
}

function buildProductVideoQuality(record = {}) {
  const workflowRecord = {
    ...record,
    eliteRenderWorkflow: ensureEliteWorkflow(record)
  };
  const status = String(workflowRecord.status || '').trim().toLowerCase();
  const eliteCommercial = evaluateEliteCommercialEvidence(workflowRecord);
  const workflowReadiness = evaluateWorkflowReadiness(workflowRecord);

  // Passthrough and fallback states are not real cinematic evidence.
  // Only count cinematic composition when a real cinematic provider succeeded
  // and the clip was used as the final base (useCinematicVideoAsBase === true).
  const hasTrueCinematic = Boolean(workflowRecord.useCinematicVideoAsBase) &&
    !workflowRecord.cinematicPassthrough &&
    !workflowRecord.cinematicFallback;

  const evidence = {
    verifiedProductMatch: Boolean(workflowRecord.productResolved && workflowRecord.productResolved.matchType),
    nonPassthroughBgRemoval: Boolean(workflowRecord.productBgActuallyRemoved),
    pureSpokenDialogue: Boolean(workflowRecord.pureSpokenDialogue),
    preRenderWorkflowReady: workflowReadiness.preRenderReady,
    productOverlayApplied: Boolean(workflowRecord.productOverlayApplied),
    productHeroShot: hasTrueCinematic && eliteCommercial.evidence.productHeroShot,
    productLabelReadable: eliteCommercial.evidence.productLabelReadable,
    motionBackground: hasTrueCinematic && eliteCommercial.evidence.motionBackground,
    avatarPerformance: eliteCommercial.evidence.avatarPerformance,
    cameraMovement: hasTrueCinematic && eliteCommercial.evidence.cameraMovement,
    finalCinematicComposition: hasTrueCinematic && eliteCommercial.evidence.cinematicFinalComposition,
    commercialAssembled: Boolean(workflowRecord.commercialAssembled),
    clearCta: eliteCommercial.evidence.clearCta,
    postProcessed: Boolean(workflowRecord.postProcessed),
    finalPersistentAsset: Boolean(workflowRecord.gcsVideoUrl),
    completed: status === 'completed' && Boolean(workflowRecord.videoUrl)
  };

  const weights = {
    verifiedProductMatch: 8,
    nonPassthroughBgRemoval: 7,
    pureSpokenDialogue: 6,
    preRenderWorkflowReady: 7,
    productOverlayApplied: 7,
    productHeroShot: 8,
    productLabelReadable: 10,
    motionBackground: 8,
    avatarPerformance: 8,
    cameraMovement: 5,
    finalCinematicComposition: 8,
    commercialAssembled: 4,
    clearCta: 4,
    postProcessed: 4,
    finalPersistentAsset: 4,
    completed: 0
  };

  let score = Object.entries(weights).reduce((total, [key, weight]) => total + (evidence[key] ? weight : 0), 0);

  if (!evidence.completed) score = Math.min(score, 72);
  if (evidence.completed && !evidence.finalCinematicComposition) score = Math.min(score, 84);
  if (evidence.completed && (!evidence.motionBackground || !evidence.cameraMovement)) score = Math.min(score, 82);
  if (evidence.completed && !evidence.productLabelReadable) score = Math.min(score, 82);
  if (evidence.completed && !evidence.avatarPerformance) score = Math.min(score, 86);

  // Passthrough and degraded outcomes are loud and truthful: hard cap below A range.
  // Score 82 = B+ ceiling (A range starts at 84+, A+ requires all evidence true).
  const isPassthrough = Boolean(workflowRecord.cinematicPassthrough);
  const isDegraded = Boolean(workflowRecord.cinematicFallback) && !workflowRecord.useCinematicVideoAsBase;
  if (isPassthrough || isDegraded) score = Math.min(score, 82);

  const aPlus = Object.values(evidence).every(Boolean) && eliteCommercial.ready && workflowReadiness.preRenderReady && !isPassthrough && !isDegraded;
  return {
    score: aPlus ? 100 : Math.max(0, Math.min(99, score)),
    grade: aPlus ? 'A+' : (score >= 92 ? 'A' : score >= 84 ? 'B+' : score >= 76 ? 'B' : score >= 68 ? 'C+' : 'C'),
    aPlus,
    evidence,
    eliteCommercial,
    eliteWorkflow: workflowReadiness,
    isPassthrough,
    isDegraded
  };
}

function isTransientAdvanceError(err) {
  if (!err) return false;
  if (err instanceof TypeError && /fetch|network|failed to fetch/i.test(err.message)) return true;
  if (err.name === 'AbortError') return true;
  const status = err.statusCode || err.status || err.code;
  if (typeof status === 'number') { if (status === 429) return true; if (status >= 500 && status <= 599) return true; }
  if (/\b(429|50[0-9]|51[0-9])\b/.test(String(err.message || ''))) return true;
  if (/timeout|timed[- ]?out|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(String(err.message || ''))) return true;
  return false;
}

function shouldRestartLock(startedAt, lockMs = STAGE_LOCK_MS) {
  if (!startedAt) return true;
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return true;
  return (Date.now() - started) > lockMs;
}

function resolvePostProcessSourceVideo(record = {}) {
  if (record.commercialAssembled && record.assembledVideoPath) {
    return record.assembledVideoUrl || record.assembledVideoPath;
  }
  if (record.useCinematicVideoAsBase && record.cinematicVideoUrl) {
    return record.cinematicVideoUrl;
  }
  return record.heygenVideoUrl || record.videoUrl || null;
}

async function advanceProductVideoJob(record, deps = {}) {
  if (!record || typeof record !== 'object') return record;
  const next = {
    ...record,
    eliteRenderWorkflow: ensureEliteWorkflow(record)
  };
  const nowIso = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();

  if (!next.eliteCommercialBlueprint) {
    next.eliteCommercialBlueprint = buildEliteCommercialBlueprint(next);
  }

  if (next.status === 'failed') {
    return { ...next, quality: buildProductVideoQuality(next) };
  }

  if (next.status === 'completed' && next.videoUrl) {
    if (!next.gcsVideoUrl && typeof deps.archiveFinal === 'function' && shouldRestartLock(next.archiveStartedAt)) {
      next.archiveStartedAt = nowIso;
      next.gcsVideoUrl = await deps.archiveFinal(next) || null;
    }
    return { ...next, quality: buildProductVideoQuality(next) };
  }

  if (next.status === 'rendering' && next.heygenVideoId) {
    const heygen = await deps.getHeyGenVideoStatus(next.heygenVideoId);
    if (heygen && (heygen.status === 'completed' || heygen.status === 'done') && heygen.video_url) {
      next.heygenVideoUrl = heygen.video_url;
      next.thumbnailUrl = heygen.thumbnail_url || next.thumbnailUrl || next.photoUrl || null;
      next.completedAt = null;

      if (next.cinematicRequested) {
        if (next.cinematicJobId || next.cinematicStageStartedAt) {
          next.status = 'cinematic';
        } else {
          const start = await deps.startCinematic(next);
          next.cinematicProvider = start.provider || next.cinematicProvider || 'passthrough';
          next.cinematicPassthrough = Boolean(start.passthrough);
          next.cinematicFallback = Boolean(start.fallback);
          next.cinematicError = start.error || null;
          next.cinematicVideoUrl = start.videoUrl || next.cinematicVideoUrl || null;
          next.cinematicJobId = start.jobId || null;
          next.cinematicStageStartedAt = nowIso;
          next.useCinematicVideoAsBase = Boolean(start.useAsFinalBase);
          if (start.pending && next.cinematicJobId) {
            next.status = 'cinematic';
            return { ...next, quality: buildProductVideoQuality(next) };
          }
        }
      }

      if (next.status !== 'cinematic') {
        next.status = typeof deps.assemble === 'function' ? 'assembling' : 'postprocessing';
      }
    } else if (heygen && heygen.status === 'failed') {
      next.status = 'failed';
      next.error = heygen.error || 'HeyGen rendering failed';
      next.completedAt = nowIso;
      return { ...next, quality: buildProductVideoQuality(next) };
    } else {
      return { ...next, quality: buildProductVideoQuality(next) };
    }
  }

  if (next.status === 'cinematic') {
    if (!next.cinematicJobId) {
      next.status = typeof deps.assemble === 'function' ? 'assembling' : 'postprocessing';
    } else {
      const cinematic = await deps.getCinematicStatus(next);
      next.cinematicProvider = cinematic.provider || next.cinematicProvider || 'passthrough';
      next.cinematicPassthrough = Boolean(cinematic.passthrough);
      next.cinematicFallback = Boolean(cinematic.fallback);
      next.cinematicError = cinematic.error || null;
      if (cinematic.jobId) next.cinematicJobId = cinematic.jobId;
      if (cinematic.status === 'processing') {
        return { ...next, quality: buildProductVideoQuality(next) };
      }
      if (cinematic.videoUrl) next.cinematicVideoUrl = cinematic.videoUrl;
      next.useCinematicVideoAsBase = Boolean(cinematic.useAsFinalBase);
      next.status = typeof deps.assemble === 'function' ? 'assembling' : 'postprocessing';
    }
  }

  if (next.status === 'assembling') {
    if (!next.commercialAssembled) {
      if (!shouldRestartLock(next.assembleStartedAt)) {
        return { ...next, quality: buildProductVideoQuality(next) };
      }
      next.assembleStartedAt = nowIso;
      const plan = planCommercialTimeline(next);
      next.degradedReasons = plan.degradedReasons;
      if (!next.cinematicPassthrough && !next.cinematicFallback) {
        next.passthroughReason = null;
      } else if (next.cinematicPassthrough) {
        next.passthroughReason = 'Cinematic stage used passthrough — no real cinematic clip generated.';
      } else if (next.cinematicFallback && !next.useCinematicVideoAsBase) {
        next.passthroughReason = 'Cinematic stage fell back to HeyGen video — real cinematic clip discarded.';
      }
      try {
        const assembled = await deps.assemble(next);
        next.commercialAssembled = Boolean(assembled && assembled.success);
        next.assemblyMode = assembled?.assemblyMode || plan.mode;
        next.assembledVideoUrl = assembled?.assembledVideoUrl || null;
        next.assembledVideoPath = assembled?.assembledVideoPath || null;
        next.shotsRendered = assembled?.shotsRendered || 0;
        if (!next.commercialAssembled) {
          next.degradedReasons = [
            ...next.degradedReasons,
            assembled?.error || 'Commercial assembly failed.'
          ];
        }
      } catch (assembleErr) {
        next.commercialAssembled = false;
        next.assemblyMode = plan.mode;
        next.degradedReasons = [...(next.degradedReasons || []), assembleErr.message];
      }
    }
    next.status = 'postprocessing';
  }

  if (next.status === 'postprocessing') {
    const sourceVideoUrl = resolvePostProcessSourceVideo(next);
    if (!sourceVideoUrl) {
      next.status = 'failed';
      next.error = 'No source video is available for post-processing.';
      next.completedAt = nowIso;
      return { ...next, quality: buildProductVideoQuality(next) };
    }

    if (!next.postProcessed) {
      if (!shouldRestartLock(next.postProcessStartedAt)) {
        return { ...next, quality: buildProductVideoQuality(next) };
      }
      next.postProcessStartedAt = nowIso;
      let processed;
      try {
        processed = await deps.postProcess(next, sourceVideoUrl);
      } catch (postProcessErr) {
        next.status = 'failed';
        next.error = postProcessErr.message;
        next.completedAt = nowIso;
        return { ...next, quality: buildProductVideoQuality(next) };
      }
      next.postProcessed = Boolean(processed && processed.success);
      next.productOverlayApplied = Boolean(processed && processed.productOverlayApplied);
      next.productLabelReadable = Boolean(processed && processed.productLabelReadable);
      next.productHeroShotApplied = Boolean(processed && processed.productHeroShotApplied);
      next.foregroundProductPresentation = Boolean(processed && processed.productOverlayApplied);
      next.ctaTextApplied = Boolean(processed && processed.ctaTextApplied);
      next.videoUrl = processed?.processedVideoUrl || sourceVideoUrl;
      next.processedVideoPath = processed?.processedVideoPath || null;
      next.finalSourceVideoUrl = sourceVideoUrl;
      if (!next.postProcessed) {
        next.status = 'failed';
        next.error = processed?.error || 'Video post-processing failed.';
        next.completedAt = nowIso;
        return { ...next, quality: buildProductVideoQuality(next) };
      }
    }

    if (!next.productOverlayApplied) {
      next.status = 'failed';
      next.error = 'Product overlay was not applied during post-processing.';
      next.completedAt = nowIso;
      return { ...next, quality: buildProductVideoQuality(next) };
    }

    if (!next.gcsVideoUrl && shouldRestartLock(next.archiveStartedAt)) {
      next.archiveStartedAt = nowIso;
      next.gcsVideoUrl = await deps.archiveFinal(next) || null;
    }

    next.status = 'completed';
    next.completedAt = next.completedAt || nowIso;
  }

  return { ...next, quality: buildProductVideoQuality(next) };
}

module.exports = {
  normalizeAffiliateProductVideoRequest,
  buildProductVideoQuality,
  advanceProductVideoJob,
  isTransientAdvanceError,
  ensureEliteWorkflow,
  planCommercialTimeline,
  resolveTrackSources,
  isMultiTrackReady,
  summarizeAssembly
};
