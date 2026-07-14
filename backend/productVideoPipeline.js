'use strict';

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
  const product = payload.product && typeof payload.product === 'object' ? payload.product : {};
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

function buildProductVideoQuality(record = {}) {
  const status = String(record.status || '').trim().toLowerCase();
  const evidence = {
    verifiedProductMatch: Boolean(record.productResolved && record.productResolved.matchType),
    nonPassthroughBgRemoval: Boolean(record.productBgActuallyRemoved),
    pureSpokenDialogue: Boolean(record.pureSpokenDialogue),
    productOverlayApplied: Boolean(record.productOverlayApplied),
    finalPersistentAsset: Boolean(record.gcsVideoUrl),
    cinematicEvidence: Boolean(
      record.postProcessed
      && (record.cinematicVideoUrl || record.cinematicProvider || record.cinematicPassthrough || record.cinematicFallback)
    ),
    postProcessed: Boolean(record.postProcessed),
    completed: status === 'completed' && Boolean(record.videoUrl)
  };

  let score = 32;
  if (evidence.verifiedProductMatch) score += 16;
  if (evidence.nonPassthroughBgRemoval) score += 14;
  if (evidence.pureSpokenDialogue) score += 10;
  if (evidence.cinematicEvidence) score += 10;
  if (evidence.productOverlayApplied) score += 8;
  if (evidence.postProcessed) score += 5;
  if (evidence.finalPersistentAsset) score += 5;
  if (evidence.completed) score += 0;
  if (!evidence.completed) score = Math.min(score, 89);

  const aPlus = Object.values(evidence).every(Boolean);
  return {
    score: aPlus ? 100 : Math.max(0, Math.min(99, score)),
    grade: aPlus ? 'A+' : (score >= 92 ? 'A' : score >= 84 ? 'B+' : score >= 76 ? 'B' : score >= 68 ? 'C+' : 'C'),
    aPlus,
    evidence
  };
}

function shouldRestartLock(startedAt, lockMs = STAGE_LOCK_MS) {
  if (!startedAt) return true;
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return true;
  return (Date.now() - started) > lockMs;
}

function resolvePostProcessSourceVideo(record = {}) {
  if (record.useCinematicVideoAsBase && record.cinematicVideoUrl) {
    return record.cinematicVideoUrl;
  }
  return record.heygenVideoUrl || record.videoUrl || null;
}

async function advanceProductVideoJob(record, deps = {}) {
  if (!record || typeof record !== 'object') return record;
  const next = { ...record };
  const nowIso = typeof deps.now === 'function' ? deps.now() : new Date().toISOString();

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
        next.status = 'postprocessing';
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
      next.status = 'postprocessing';
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
      next.status = 'postprocessing';
    }
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
      const processed = await deps.postProcess(next, sourceVideoUrl);
      next.postProcessed = Boolean(processed && processed.success);
      next.productOverlayApplied = Boolean(processed && processed.productOverlayApplied !== false);
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
  advanceProductVideoJob
};
