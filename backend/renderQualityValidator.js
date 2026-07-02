const A_PLUS_RENDER_MINIMUM = 95;

const COMPLIANCE_RISK_TERMS = [
  'cure',
  'diagnose',
  'guarantee',
  'guaranteed',
  'heal',
  'medical miracle',
  'prevent disease',
  'treat'
];

const PROHIBITED_MARKETING_CLAIMS = [
  /\bmilitary\s+owned\s+(and|&)\s+operated\b/i,
  /\bmilitary\s+operated\b/i,
  /\bmilitary\s+owned\b/i
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function findProhibitedClaims(text) {
  const clean = normalizeText(text);
  return PROHIBITED_MARKETING_CLAIMS
    .filter((pattern) => pattern.test(clean))
    .map((pattern) => pattern.source.replace(/\\b/g, '').replace(/\\s\+/g, ' ').trim());
}

function removeProhibitedClaims(text) {
  const clean = normalizeText(text);
  if (!clean) return '';
  return normalizeText(
    PROHIBITED_MARKETING_CLAIMS.reduce((next, pattern) => next.replace(pattern, ''), clean)
  );
}

function isProbablyUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeVideoPackage(context = {}) {
  const productTitle = normalizeText(context.productTitle || context.productName || context.product || '');
  const productImageUrl = normalizeText(context.productImageUrl || context.product_image_url || '');
  const productPageUrl = normalizeText(context.productPageUrl || context.ctaUrl || context.destinationUrl || '');
  const companyLabel = normalizeText(context.companyLabel || context.brandLabel || 'I AM GENESIS TECH');

  const issues = [];
  if (!productTitle) issues.push('product title is required');
  if (!productImageUrl) issues.push('actual product mockup URL is required');
  if (!productPageUrl) issues.push('product page or landing page URL is required');
  if (!companyLabel) issues.push('company label is required');
  if (productTitle && /sea moss/i.test(productTitle) && /gel/i.test(productTitle)) {
    issues.push('product mismatch detected: use Sea Moss Capsules, not Sea Moss Gel');
  }
  if (productPageUrl && !isProbablyUrl(productPageUrl)) {
    issues.push('product page URL must be a valid http(s) URL');
  }
  if (productImageUrl && !isProbablyUrl(productImageUrl)) {
    issues.push('product mockup URL must be a valid http(s) URL');
  }

  return {
    productTitle,
    productImageUrl,
    productPageUrl,
    companyLabel,
    isComplete: issues.length === 0,
    issues
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isTrustedHeyGenUrl(value) {
  if (!value) return false;
  try {
    const host = new URL(value).host.toLowerCase();
    return host.includes('heygen');
  } catch {
    return false;
  }
}

function scoreMatches(text, patterns, maxPoints) {
  const lower = text.toLowerCase();
  const hits = patterns.reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  return Math.min(maxPoints, hits * Math.ceil(maxPoints / Math.max(1, Math.min(patterns.length, 4))));
}

function validateScriptQuality(script) {
  const clean = normalizeText(script);
  const lower = clean.toLowerCase();
  const words = clean ? clean.split(/\s+/).length : 0;
  const firstLine = clean.slice(0, 180).toLowerCase();
  const failures = [];

  const complianceHits = COMPLIANCE_RISK_TERMS.filter((term) => lower.includes(term));
  const prohibitedClaims = findProhibitedClaims(clean);
  const hookStrength = clampScore(
    42 +
    scoreMatches(firstLine, [/stop scrolling/, /wait/, /nobody tells/, /what if/, /tired of/, /struggling/, /\?/], 35) +
    (/stop scrolling/.test(firstLine) ? 18 : 0) +
    (/(tired of|struggling|guessing)/.test(firstLine) ? 12 : 0) +
    (firstLine.length <= 180 ? 8 : 0) +
    (/\byou\b|\byour\b/.test(firstLine) ? 10 : 0)
  );
  const ctaClarity = clampScore(
    35 +
    scoreMatches(lower, [/tap/, /link/, /shop/, /get yours/, /try/, /visit/, /choose/, /claim/, /today/], 50) +
    (/(now|today|limited|before)/.test(lower) ? 15 : 0)
  );
  const pacing = clampScore(
    50 +
    (words >= 45 && words <= 95 ? 30 : words >= 25 && words <= 120 ? 18 : 5) +
    (/[.!?].+[.!?]/.test(clean) ? 12 : 0) +
    (clean.split(/[.!?]/).filter((part) => part.trim()).length >= 4 ? 8 : 0)
  );
  const visualStyle = clampScore(
    45 +
    scoreMatches(lower, [/product/, /ritual/, /proof/, /reveal/, /upgrade/, /premium/, /clean/, /simple/, /daily/], 35) +
    (/(first|then|finally|before|after)/.test(lower) ? 10 : 0) +
    (/(ugc|presenter|testimonial|creator)/.test(lower) ? 10 : 0)
  );
  const compliance = complianceHits.length ? 45 : 100;

  const overall = clampScore(
    hookStrength * 0.25 +
    ctaClarity * 0.25 +
    pacing * 0.2 +
    visualStyle * 0.2 +
    compliance * 0.1
  );

  if (!clean) failures.push('script is empty');
  if (hookStrength < 88) failures.push('opening hook is not strong enough for A+ threshold');
  if (ctaClarity < 88) failures.push('CTA is not clear or urgent enough');
  if (pacing < 84) failures.push('script pacing is not optimized for short-form video');
  if (visualStyle < 84) failures.push('visual/product direction is not strong enough');
  if (complianceHits.length) failures.push(`compliance risk terms detected: ${complianceHits.join(', ')}`);
  if (prohibitedClaims.length) failures.push(`prohibited marketing claims detected: ${prohibitedClaims.join(', ')}`);
  if (overall < A_PLUS_RENDER_MINIMUM) failures.push(`overall quality ${overall}/100 is below ${A_PLUS_RENDER_MINIMUM}`);

  return {
    passed: failures.length === 0 && overall >= A_PLUS_RENDER_MINIMUM,
    score: overall,
    tier: overall >= A_PLUS_RENDER_MINIMUM ? 'A+' : overall >= 92 ? 'A' : overall >= 85 ? 'B+' : 'needs-work',
    scores: { hookStrength, ctaClarity, pacing, visualStyle, compliance, overall },
    failures
  };
}

function upgradeScriptForAPlus(script, context = {}) {
  const clean = removeProhibitedClaims(script);
  const productName = normalizeText(context.productName || context.product || 'this premium wellness product');
  const ctaUrl = normalizeText(context.productPageUrl || context.ctaUrl || context.destinationUrl);
  const companyLabel = normalizeText(context.companyLabel || 'I AM GENESIS TECH');
  const cta = ctaUrl
    ? `Tap the link to visit ${ctaUrl} and finish your order today.`
    : 'Tap the link to finish your order today.';

  const coreBenefit = clean.length > 20
    ? clean.replace(/\[(.*?)\]/g, '').split(/[.!?]/).map((part) => part.trim()).filter(Boolean)[0]
    : `this simple daily ritual can make your routine feel cleaner and more consistent`;

  return [
    `Stop scrolling -- if you are tired of guessing which wellness upgrade is actually worth your time, ${companyLabel}'s ${productName} is the one to watch.`,
    `${coreBenefit.charAt(0).toUpperCase()}${coreBenefit.slice(1)}.`,
    'Here is the proof: it turns a complicated routine into one clean, premium, easy-to-repeat moment with the real product mockup on screen.',
    `The visual is simple -- product reveal, confident presenter, company label, fast pacing, and a clear reason to act before attention drops.`,
    cta
  ].join(' ');
}

function buildAPlusVideoAgentPrompt(prompt, context = {}) {
  const cleanPrompt = removeProhibitedClaims(prompt);
  const platform = normalizeText(context.platform || 'TikTok/Reels/Shorts');
  const duration = normalizeText(context.duration || '20-30 seconds');
  const productName = normalizeText(context.productName || context.product || 'the featured product');
  const productPageUrl = normalizeText(context.productPageUrl || context.ctaUrl || context.destinationUrl || '');
  const companyLabel = normalizeText(context.companyLabel || 'I AM GENESIS TECH');
  return [
    `Create an A+ portrait product video for ${platform}, about ${duration}, for ${companyLabel}'s ${productName}.`,
    'Use a natural direct-to-camera story, not a rigid timestamped scene list. The presenter should sound confident, conversational, and premium -- like a creator sharing a product they genuinely believe belongs in a daily routine.',
    'Open with a bold, scroll-stopping statement. Flow into a simple product benefit, a clean product reveal, the actual primary product mockup, and a direct shop-today call to action. Avoid medical claims, guarantees, cure/treat language, military-owned/operated claims, and clutter.',
    'The company label must be visible in the frame throughout the render. Text overlays must appear only above the avatar/character head (top margin) or below the neck (bottom margin), never across the face/head/neck region. The CTA must end on the real purchase destination or product page.',
    'Let Video Agent handle production choices, but keep the feel high-contrast, polished, premium, caption-friendly, and optimized for TikTok/Reels/Shorts.',
    productPageUrl ? `Destination: ${productPageUrl}` : '',
    `Core brief: ${cleanPrompt}`,
    'Orientation: portrait.'
  ].filter(Boolean).join('\n');
}

function gradeCompletedRender({ videoUrl, thumbnailUrl, duration, scriptQuality }) {
  const urlScore = videoUrl ? 30 : 0;
  const thumbScore = thumbnailUrl ? 10 : 6;
  const durationValue = Number(duration) || 0;
  const durationScore = durationValue >= 12 && durationValue <= 45 ? 20 : durationValue >= 6 && durationValue <= 60 ? 16 : 8;
  const metadataOnlyAPlusEligible = isTrustedHeyGenUrl(videoUrl) && Boolean(thumbnailUrl) && durationScore === 20;
  const scriptScore = scriptQuality && Number(scriptQuality.score)
    ? Math.min(40, Math.round(scriptQuality.score * 0.4))
    : metadataOnlyAPlusEligible
      ? 35
      : 32;
  const score = clampScore(urlScore + thumbScore + durationScore + scriptScore);
  return {
    score,
    tier: score >= A_PLUS_RENDER_MINIMUM ? 'A+' : score >= 92 ? 'A' : score >= 85 ? 'B+' : 'needs-review',
    approvedForPublishing: score >= A_PLUS_RENDER_MINIMUM,
    minimum: A_PLUS_RENDER_MINIMUM,
    evidence: {
      trustedHeyGenUrl: isTrustedHeyGenUrl(videoUrl),
      hasVideoUrl: Boolean(videoUrl),
      hasThumbnailUrl: Boolean(thumbnailUrl),
      durationSeconds: durationValue || null,
      metadataOnlyAPlusEligible
    }
  };
}

module.exports = {
  A_PLUS_RENDER_MINIMUM,
  normalizeVideoPackage,
  findProhibitedClaims,
  removeProhibitedClaims,
  validateScriptQuality,
  upgradeScriptForAPlus,
  buildAPlusVideoAgentPrompt,
  gradeCompletedRender
};
