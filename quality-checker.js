function scoreText(value, terms = []) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase())) ? 10 : 6;
}

function countDirectionLeaks(value = "") {
  const text = String(value || "").toLowerCase();
  const patterns = [
    /\[[0-9]+\s*-\s*[0-9]+s\]/i,
    /on-screen line/i,
    /visual format guidance/i,
    /scene instructions?/i,
    /camera instructions?/i,
    /keep .* visible/i
  ];
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function durationScore(media = {}) {
  const seconds = Number(media.duration_seconds || media.metadata_json?.durationSeconds || 0);
  if (seconds >= 28) return 10;
  if (seconds >= 24) return 8;
  if (seconds >= 18) return 5;
  return 2;
}

function runQualityCheck(media = {}) {
  const spokenScript = String(
    media.metadata_json?.spokenScript ||
    media.metadata_json?.voiceoverScript ||
    media.description ||
    ""
  );
  const directionLeaks = countDirectionLeaks(spokenScript);
  const text = [
    media.title,
    media.description,
    media.product_url,
    JSON.stringify(media.metadata_json || {}),
    spokenScript
  ].join(" ");

  const scores = {
    brandAlignment: scoreText(text, ["premium", "genesis", "wellness", "performance"]),
    productRelevance: media.product_url || media.buy_now_url ? 10 : 4,
    hookStrength: media.title && String(media.title).length > 12 ? 8 : 5,
    viralFormatAlignment: scoreText(text, ["hook", "proof", "cta", "viral", "ugc"]),
    sourceEvidence: media.metadata_json?.sourceViralUrl ? 10 : 2,
    productVisibilityEvidence: media.metadata_json?.productName && media.metadata_json?.productImageUrl ? 10 : 3,
    visualQuality: media.playback_url || media.preview_url ? 8 : 3,
    audioQuality: media.metadata_json?.voiceover || media.metadata_json?.script ? 7 : 5,
    narrationSafety: directionLeaks === 0 ? 10 : directionLeaks === 1 ? 6 : 2,
    durationControl: durationScore(media),
    captionQuality: media.metadata_json?.captions ? 8 : 5,
    platformFit: Array.isArray(media.target_platforms_json) && media.target_platforms_json.length ? 8 : 5,
    complianceAccuracy: media.metadata_json?.recommendedDisclaimer || media.metadata_json?.complianceDisclaimer ? 8 : 6,
    ctaClarity: /shop now|buy now|click link|explore/i.test(text) ? 10 : 4,
    publishReadiness: media.approval_status === "approved" ? 8 : 6
  };

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const qualityScore = Math.min(100, Math.round(total));
  const hardFail = scores.narrationSafety < 8 || scores.durationControl < 8 || scores.visualQuality < 7 || scores.sourceEvidence < 8 || scores.productVisibilityEvidence < 8;
  const status = hardFail
    ? "Failed"
    : qualityScore >= 92 && scores.productRelevance >= 8 && scores.complianceAccuracy >= 8 && scores.ctaClarity >= 8
      ? "Approved"
      : qualityScore >= 78
        ? "Needs Review"
        : qualityScore >= 65
          ? "Retry Recommended"
          : "Failed";

  return {
    qualityScore,
    status,
    scores,
    blockers: [
      scores.narrationSafety < 8 ? "Narration contains direction/stage notes." : "",
      scores.durationControl < 8 ? "Duration target is below elite 30-second standard." : "",
      scores.visualQuality < 7 ? "No stable render preview/playback URL detected." : "",
      scores.sourceEvidence < 8 ? "Source viral URL evidence is missing for comparison." : "",
      scores.productVisibilityEvidence < 8 ? "Matched product image/name evidence is missing." : ""
    ].filter(Boolean),
    checkedAt: new Date().toISOString(),
    notes: status === "Approved"
      ? "Media passed elite quality gate and is approval-ready."
      : "Blocked by elite quality controls. Fix narration, visual output, compliance, and CTA alignment before publish."
  };
}


// ─── H.A.V.E. Governance Gate ───────────────────────────────────────────────
// H — Hook Strength   : title is strong + hook/proof/cta structure detected in narration
// A — Alignment       : matched product name, product image URL, and source viral URL all present
// V — Verified Compliance : narration has zero direction/stage leaks + FDA disclaimer attached
// E — Evidence        : source viral URL + provider render/playback URL both present (comparison ready)
//
// All 4 pillars must pass. HAVE gate runs independently from quality score.
// A failed HAVE gate blocks approve/publish regardless of quality score.

function runHaveGate(media = {}) {
  const text = [
    media.title,
    media.description,
    media.metadata_json?.spokenScript,
    media.metadata_json?.script
  ].join(" ");

  const spokenScript = String(media.metadata_json?.spokenScript || media.metadata_json?.voiceoverScript || media.description || "");
  const title = String(media.title || "");
  const productName = String(media.metadata_json?.productName || "").trim();
  const productImageUrl = String(media.metadata_json?.productImageUrl || "").trim();
  const sourceViralUrl = String(media.metadata_json?.sourceViralUrl || "").trim();
  const disclaimer = String(media.metadata_json?.recommendedDisclaimer || media.metadata_json?.complianceDisclaimer || "").trim();
  const renderUrl = String(media.playback_url || media.preview_url || "").trim();
  const directionLeaks = countDirectionLeaks(spokenScript);

  const hasHookPattern = /hook|stop scrolling|proof|cta|shop now|buy now|click/i.test(text);
  const hasCta = /shop now|buy now|click|explore|get yours/i.test(text);
  const hookPassed = title.length >= 12 && (hasHookPattern || hasCta);

  const alignmentPassed = Boolean(productName && productImageUrl && sourceViralUrl);

  const hasDisclaimer = disclaimer.length > 10 || /FDA|food and drug|diagnose|treat|cure|prevent/i.test(text);
  const verifiedCompliancePassed = directionLeaks === 0 && hasDisclaimer;

  const evidencePassed = Boolean(sourceViralUrl && renderUrl);

  const pillars = {
    hook: {
      passed: hookPassed,
      label: "H — Hook Strength",
      detail: hookPassed
        ? "Title strength confirmed. Hook/CTA structure detected in narration."
        : `Weak hook: title length ${title.length} chars. Missing hook/proof/CTA pattern.`
    },
    alignment: {
      passed: alignmentPassed,
      label: "A — Alignment",
      detail: alignmentPassed
        ? "Product name, product image, and source viral URL all present."
        : [
            !productName ? "Product name missing." : "",
            !productImageUrl ? "Product image URL missing." : "",
            !sourceViralUrl ? "Source viral URL missing." : ""
          ].filter(Boolean).join(" ")
    },
    verifiedCompliance: {
      passed: verifiedCompliancePassed,
      label: "V — Verified Compliance",
      detail: verifiedCompliancePassed
        ? "Zero direction leaks in narration. FDA disclaimer present."
        : [
            directionLeaks > 0 ? `Narration contains ${directionLeaks} direction/stage leak(s).` : "",
            !hasDisclaimer ? "FDA disclaimer or required disclosure is missing." : ""
          ].filter(Boolean).join(" ")
    },
    evidence: {
      passed: evidencePassed,
      label: "E — Evidence",
      detail: evidencePassed
        ? "Source viral URL and render/playback URL both present. Comparison ready."
        : [
            !sourceViralUrl ? "Source viral URL missing — no comparison baseline." : "",
            !renderUrl ? "Render/playback URL missing — no output evidence." : ""
          ].filter(Boolean).join(" ")
    }
  };

  const passed = Object.values(pillars).every((p) => p.passed);
  const score = Object.values(pillars).filter((p) => p.passed).length;
  const blockers = Object.values(pillars).filter((p) => !p.passed).map((p) => `[${p.label}] ${p.detail}`);

  return {
    passed,
    score,
    maxScore: 4,
    pillars,
    blockers,
    checkedAt: new Date().toISOString(),
    verdict: passed
      ? "HAVE gate passed. Asset is governance-cleared for approval and publish."
      : `HAVE gate failed. ${4 - score} of 4 pillars blocked. Fix: ${blockers.join(" | ")}`
  };
}

module.exports = { runQualityCheck, runHaveGate };
