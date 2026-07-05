'use strict';

/**
 * EVICS Algorithm Amplification Engine
 * ------------------------------------
 * Deterministic, dependency-free layer that makes every generated video
 * "algorithm friendly" for maximum organic exposure.
 *
 * For each platform it produces a ready-to-paste Optimization Package:
 *   - title            (keyword front-loaded; critical for YouTube + Pinterest search)
 *   - description       (keyword-rich + CTA + link, platform-aware)
 *   - hashtags[]        (right count + mix: reach + niche + branded + trending)
 *   - hashtagLine       (space-joined "#a #b #c" for one-tap paste)
 *   - keywords[]        (SEO/tag keywords, e.g. YouTube tags, Pinterest keywords)
 *   - altText           (accessibility + IG/Pinterest SEO)
 *   - coverText         (thumbnail overlay to drive the click)
 *   - spokenKeywords[]  (keywords that should be said aloud for ASR SEO)
 *   - postingTime       (best-time-to-post suggestion)
 *   - formatSpec        (aspect / dimension / duration / safe-zone guidance)
 *   - copyBlock         (full paste-ready block: title + description + hashtags)
 *
 * It also exposes computeDiscoverabilityScore() — a 0-100 SEO/reach grade with
 * specific, actionable fixes (feeds the Admin learning loop later).
 *
 * Design goals (mirrors sacredIntelligenceGovernance.js):
 *   - Pure + deterministic (same input -> same output) so it is unit-testable.
 *   - Governance-safe copy (no "guaranteed", no "cures", no false urgency).
 *   - No network / no external packages.
 */

// ── Brand ────────────────────────────────────────────────────────────────────
const BRAND_TAGS = ['IAMGENESISTECH', 'EVICS', 'IAGT'];
const BRAND_NAME = 'I AM GENESIS TECH';
const SHOP_URL = 'iamgenesistech.com';

// ── Per-platform distribution rules ──────────────────────────────────────────
const PLATFORM_META_RULES = {
  tiktok: {
    label: 'TikTok',
    hashtagCount: 5,
    reachTags: ['fyp', 'foryou', 'foryoupage', 'tiktokmademebuyit', 'viral'],
    titleMatters: false,
    linkInBio: true,
    maxDescription: 2200,
    aspect: '9:16',
    dimension: '1080x1920',
    durationSweetSpot: '15-34s',
    bestTimes: ['6-9am', '7-11pm'],
    notes: 'Put the keyword in the caption AND as on-screen text; ride a trending sound; keep captions/product out of the bottom 20% and right rail (safe zone).'
  },
  instagram: {
    label: 'Instagram Reels',
    hashtagCount: 6,
    reachTags: ['reels', 'reelsinstagram', 'explore', 'explorepage', 'viralreels'],
    titleMatters: false,
    linkInBio: true,
    maxDescription: 2200,
    aspect: '9:16',
    dimension: '1080x1920',
    durationSweetSpot: '15-45s',
    bestTimes: ['11am-1pm', '7-9pm'],
    notes: 'Front-load keywords in the caption (Instagram captions are now searchable); use trending audio; design a strong cover frame.'
  },
  youtube: {
    label: 'YouTube Shorts',
    hashtagCount: 4,
    reachTags: ['shorts', 'youtubeshorts', 'viral'],
    titleMatters: true,
    linkInBio: false,
    maxDescription: 5000,
    aspect: '9:16',
    dimension: '1080x1920',
    durationSweetSpot: 'up to 60s',
    bestTimes: ['12-3pm', '5-8pm'],
    notes: 'YouTube is a search engine — a keyword-rich TITLE is the #1 lever. Add tags, an uploaded caption (.srt) file, and #Shorts in the title.'
  },
  facebook: {
    label: 'Facebook',
    hashtagCount: 3,
    reachTags: ['reels', 'facebookreels', 'viral'],
    titleMatters: false,
    linkInBio: false,
    maxDescription: 2200,
    aspect: '9:16',
    dimension: '1080x1920',
    durationSweetSpot: '15-60s',
    bestTimes: ['9-11am', '1-4pm'],
    notes: 'Upload natively (Facebook suppresses posts that link out); shares are weighted heavily; keep the description keyword-led.'
  },
  pinterest: {
    label: 'Pinterest',
    hashtagCount: 5,
    reachTags: ['pinterestfinds', 'pinterestinspired', 'shopping'],
    titleMatters: true,
    linkInBio: false,
    maxDescription: 500,
    aspect: '9:16',
    dimension: '1000x1500',
    durationSweetSpot: '15-30s',
    bestTimes: ['8-11pm'],
    notes: 'The most SEO-driven platform — a keyword-rich title + description wins. Add the product link and shopping/product tags.'
  },
  x: {
    label: 'X',
    hashtagCount: 2,
    reachTags: ['viral'],
    titleMatters: false,
    linkInBio: false,
    maxDescription: 280,
    aspect: '9:16',
    dimension: '1080x1920',
    durationSweetSpot: 'up to 60s',
    bestTimes: ['8-10am', '6-9pm'],
    notes: 'Upload video natively (X suppresses external links); keep the text punchy; 1-2 hashtags max.'
  }
};

const DEFAULT_PLATFORMS = Object.keys(PLATFORM_META_RULES);

// ── Category detection + marketing keyword banks ─────────────────────────────
const CATEGORY_KEYWORDS = {
  protein:    ['protein', 'mass', 'meal', 'whey', 'isolate'],
  preworkout: ['pre-workout', 'pre workout', 'preworkout', 'pump', 'energy'],
  recovery:   ['amino', 'bcaa', 'recovery', 'eaa', 'glutamine'],
  vitamins:   ['vitamin', 'multivitamin', 'daily', 'wellness'],
  immune:     ['immune', 'immunity', 'defense', 'elderberry', 'zinc'],
  beauty:     ['beauty', 'skin', 'collagen', 'hair', 'nails', 'glow'],
  mens:       ['men', 'testosterone', 'vitality', 'male'],
  womens:     ['women', 'hormone', 'balance', 'female', 'prenatal'],
  weightloss: ['weight', 'metabolic', 'burn', 'lean', 'slim', 'keto'],
  sports:     ['sport', 'creatine', 'performance', 'athlete', 'endurance'],
  detox:      ['detox', 'digest', 'gut', 'cleanse', 'probiotic', 'fiber'],
  sleep:      ['sleep', 'melatonin', 'rest', 'calm', 'relax'],
  seamoss:    ['sea moss', 'seamoss', 'moss', 'irish moss']
};

// Governance-safe marketing copy per category (no health claims / no "cures").
const CATEGORY_COPY = {
  protein:    { niche: ['protein', 'fitness', 'gains', 'musclebuilding', 'gymtok'],        benefit: 'clean fuel to support your training and recovery goals',        cover: 'FUEL YOUR GAINS' },
  preworkout: { niche: ['preworkout', 'energy', 'gymtok', 'workoutmotivation', 'fitness'], benefit: 'the clean energy boost your workouts have been missing',        cover: 'UNLOCK YOUR ENERGY' },
  recovery:   { niche: ['recovery', 'aminoacids', 'postworkout', 'musclerecovery'],        benefit: 'built to support faster recovery between sessions',            cover: 'RECOVER FASTER' },
  vitamins:   { niche: ['vitamins', 'wellness', 'dailyhealth', 'supplements'],             benefit: 'a simple daily habit to support your overall wellness',       cover: 'FEEL YOUR BEST' },
  immune:     { niche: ['immunesupport', 'immunity', 'wellness', 'stayhealthy'],           benefit: 'crafted to support your body\u2019s natural defenses',        cover: 'SUPPORT YOUR IMMUNITY' },
  beauty:     { niche: ['beauty', 'skincare', 'collagen', 'glowup', 'selfcare'],           benefit: 'support your natural glow from the inside out',               cover: 'GLOW FROM WITHIN' },
  mens:       { niche: ['menshealth', 'vitality', 'mensfitness', 'wellness'],              benefit: 'formulated to support strength, drive, and everyday vitality', cover: 'RECLAIM YOUR VITALITY' },
  womens:     { niche: ['womenshealth', 'hormonebalance', 'womenwellness', 'selfcare'],    benefit: 'thoughtfully made to support womens everyday wellness',       cover: 'FEEL BALANCED' },
  weightloss: { niche: ['healthyliving', 'metabolism', 'wellnessjourney', 'cleaneating'],  benefit: 'a supportive companion for your healthy-living journey',       cover: 'YOUR HEALTHY JOURNEY' },
  sports:     { niche: ['sportsnutrition', 'performance', 'athlete', 'training'],          benefit: 'engineered to support performance and endurance',             cover: 'TRAIN HARDER' },
  detox:      { niche: ['guthealth', 'digestion', 'wellness', 'cleanse'],                  benefit: 'support digestive comfort and everyday gut wellness',         cover: 'RESET YOUR GUT' },
  sleep:      { niche: ['sleepbetter', 'restedmind', 'wellness', 'nighttimeroutine'],      benefit: 'wind down and support a more restful night',                  cover: 'SLEEP BETTER' },
  seamoss:    { niche: ['seamoss', 'wellness', 'naturalhealth', 'superfood'],              benefit: 'a nutrient-rich superfood to support your daily wellness',    cover: 'NATURES SUPERFOOD' },
  wellness:   { niche: ['wellness', 'health', 'selfcare', 'healthylifestyle', 'supplements'], benefit: 'a simple way to support your everyday wellness routine',    cover: 'FEEL YOUR BEST' }
};

// Governance-safe hook bank (scroll-stoppers) for captions / cover text.
const HOOK_BANK = [
  'The wellness upgrade everyone keeps asking me about',
  'I wish I had found this sooner',
  'Here is what changed my daily routine',
  'If you have been looking for a cleaner option, watch this',
  'Let me show you what I have been using every day',
  'This deserves a spot in your routine',
  'The simple habit I am not giving up',
  'Real talk about what actually made a difference for me'
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'your', 'you', 'our', 'this', 'that', 'are',
  'was', 'has', 'have', 'will', 'can', 'all', 'new', 'now', 'get', 'buy', 'per',
  'pack', 'count', 'size', 'oz', 'ml', 'mg', 'ct', 'pcs', 'set', 'kit', 'plus'
]);

// ── Small deterministic helpers ──────────────────────────────────────────────
function hashString(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickDeterministic(arr, seed) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr[hashString(seed) % arr.length];
}

function toHashtagToken(text) {
  return String(text || '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim();
}

function toPascalTag(text) {
  return String(text || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function uniquePreserve(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ── Public: detect a marketing category from free text ───────────────────────
function detectMarketingCategory(text) {
  const haystack = String(text || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => haystack.includes(k))) return category;
  }
  return 'wellness';
}

// ── Public: extract clean keyword tokens from a product title ────────────────
function extractKeywords(productTitle, limit = 6) {
  const words = String(productTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return uniquePreserve(words).slice(0, limit);
}

// ── Public: build a platform-appropriate hashtag set ─────────────────────────
function buildHashtags({ productTitle, category, platform, trendingTags = [] }) {
  const rule = PLATFORM_META_RULES[platform] || PLATFORM_META_RULES.tiktok;
  const copy = CATEGORY_COPY[category] || CATEGORY_COPY.wellness;

  const productTag = toPascalTag(productTitle);
  const keywordTags = extractKeywords(productTitle, 3).map(toHashtagToken);
  const trending = (trendingTags || []).map(toHashtagToken).filter(Boolean);

  // Mix priority: 1 product-branded + trending + niche + reach, then guarantee a brand tag.
  const pool = uniquePreserve([
    productTag,
    ...trending,
    ...copy.niche,
    ...keywordTags,
    ...rule.reachTags
  ]).filter(Boolean);

  const count = rule.hashtagCount;
  let chosen = pool.slice(0, Math.max(1, count - 1));
  // Always include exactly one brand tag for attribution.
  chosen.push(BRAND_TAGS[0]);
  chosen = uniquePreserve(chosen).slice(0, count);
  return chosen;
}

function hashtagLineOf(hashtags) {
  return (hashtags || []).map((t) => `#${t}`).join(' ');
}

// ── Public: generate the full optimization package for ONE platform ──────────
function generatePlatformMetadata(input = {}) {
  const {
    productTitle = 'Premium Product',
    productPrice = null,
    productPageUrl = '',
    platform = 'tiktok',
    trendingTags = [],
    category: providedCategory
  } = input;

  const rule = PLATFORM_META_RULES[platform] || PLATFORM_META_RULES.tiktok;
  const category = providedCategory || detectMarketingCategory(`${productTitle} ${input.script || ''}`);
  const copy = CATEGORY_COPY[category] || CATEGORY_COPY.wellness;

  const priceStr = (productPrice !== null && productPrice !== undefined && productPrice !== '')
    ? ` ($${Number(productPrice).toFixed(2)})`
    : '';
  const hook = pickDeterministic(HOOK_BANK, `${productTitle}|${platform}`);
  const hashtags = buildHashtags({ productTitle, category, platform, trendingTags });
  const hashtagLine = hashtagLineOf(hashtags);
  const keywords = uniquePreserve([
    ...extractKeywords(productTitle, 5),
    ...copy.niche.slice(0, 3),
    category
  ]);

  // Title — matters most for YouTube + Pinterest search.
  let title;
  if (platform === 'youtube') {
    title = `${productTitle} — ${capitalize(copy.benefit)} #Shorts`;
  } else if (platform === 'pinterest') {
    title = `${productTitle}: ${capitalize(copy.benefit)} | Shop ${BRAND_NAME}`;
  } else {
    title = `${hook} — ${productTitle}`;
  }

  // Link line — respect each platform's link behaviour.
  let linkLine;
  if (rule.linkInBio) {
    linkLine = `🛒 Shop now — link in bio (${SHOP_URL})`;
  } else if (productPageUrl) {
    linkLine = `🛒 Shop now: ${productPageUrl}`;
  } else {
    linkLine = `🛒 Shop now at ${SHOP_URL}`;
  }

  // Description — keyword-rich + honest benefit + CTA + link + hashtags.
  const descParts = [
    hook + '.',
    `Meet ${productTitle}${priceStr} from ${BRAND_NAME} — ${copy.benefit}.`,
    linkLine,
    hashtagLine
  ];
  let description = descParts.filter(Boolean).join('\n');
  if (description.length > rule.maxDescription) {
    description = description.slice(0, rule.maxDescription - 1).trim();
  }

  const coverText = copy.cover;
  const altText = `${productTitle} — ${rule.label} product video by a ${BRAND_NAME} affiliate (${category} wellness)`;
  const spokenKeywords = uniquePreserve([...extractKeywords(productTitle, 4), category]);

  const copyBlock = [
    rule.titleMatters ? `TITLE:\n${title}` : '',
    `CAPTION:\n${description}`
  ].filter(Boolean).join('\n\n');

  return {
    platform,
    platformLabel: rule.label,
    category,
    title,
    description,
    hashtags,
    hashtagLine,
    keywords,
    altText,
    coverText,
    spokenKeywords,
    postingTime: rule.bestTimes,
    formatSpec: {
      aspect: rule.aspect,
      dimension: rule.dimension,
      durationSweetSpot: rule.durationSweetSpot,
      notes: rule.notes
    },
    titleMatters: rule.titleMatters,
    copyBlock
  };
}

// ── Public: generate packages for every (or a chosen set of) platform ────────
function optimizeForAllPlatforms(input = {}, options = {}) {
  const platforms = Array.isArray(options.platforms) && options.platforms.length
    ? options.platforms
    : DEFAULT_PLATFORMS;
  const category = input.category || detectMarketingCategory(`${input.productTitle || ''} ${input.script || ''}`);
  const out = {};
  for (const platform of platforms) {
    if (!PLATFORM_META_RULES[platform]) continue;
    out[platform] = generatePlatformMetadata({
      ...input,
      category,
      platform,
      trendingTags: options.trendingTags || []
    });
  }
  return {
    category,
    primaryPlatform: options.primaryPlatform && out[options.primaryPlatform] ? options.primaryPlatform : platforms[0],
    generatedAt: new Date().toISOString(),
    platforms: out
  };
}

// ── Public: score how discoverable/algorithm-ready a video is (0-100) ────────
function computeDiscoverabilityScore(input = {}) {
  const {
    platform = 'tiktok',
    hasCaptions = false,
    hashtags = [],
    title = '',
    description = '',
    script = '',
    formatOk = true,
    usedTrendingTag = false
  } = input;

  const rule = PLATFORM_META_RULES[platform] || PLATFORM_META_RULES.tiktok;
  const suggestions = [];
  let score = 0;

  // Captions burned in (retention + OCR/ASR SEO) — 20
  if (hasCaptions) score += 20;
  else suggestions.push('Turn on burned-in captions — ~85% watch muted and platforms read on-screen text for ranking.');

  // Hashtag strategy — 15
  const hCount = (hashtags || []).length;
  if (hCount >= 3 && hCount <= rule.hashtagCount + 1) score += 12;
  else suggestions.push(`Use ${Math.min(3, rule.hashtagCount)}-${rule.hashtagCount} hashtags for ${rule.label} (broad + niche + branded mix).`);
  if ((hashtags || []).some((t) => BRAND_TAGS.map((b) => b.toLowerCase()).includes(String(t).toLowerCase()))) score += 3;
  else suggestions.push('Add one branded hashtag for attribution.');

  // Keyword coverage in title/description — 15
  const kw = extractKeywords(title + ' ' + description, 4);
  if (kw.length >= 2) score += 15;
  else suggestions.push('Front-load product keywords in the title/description (this is your SEO on modern feeds).');

  // Hook strength — 15
  const firstSentence = String(script || description || '').split(/[.!?\n]/)[0] || '';
  const hookWords = firstSentence.trim().split(/\s+/).filter(Boolean).length;
  if (hookWords >= 4 && hookWords <= 14) score += 15;
  else if (hookWords > 0) { score += 7; suggestions.push('Tighten the first-3-second hook to ~4-12 words — it decides watch-time.'); }
  else suggestions.push('Add a scroll-stopping hook in the first 3 seconds.');

  // CTA present — 10
  if (/shop|link|tap|learn more|buy|get yours|swipe/i.test(description)) score += 10;
  else suggestions.push('Add a clear CTA (e.g., "Shop now — link in bio").');

  // Format compliance (9:16 vertical) — 10
  if (formatOk) score += 10;
  else suggestions.push(`Render vertical ${rule.dimension} (${rule.aspect}) for ${rule.label}.`);

  // YouTube/Pinterest need a real title — 10 ; others get it free
  if (rule.titleMatters) {
    if (title && title.length >= 15) score += 10;
    else suggestions.push(`${rule.label} is search-driven — write a keyword-rich title (15+ chars).`);
  } else {
    score += 8;
  }

  // Trend alignment — 5 (bonus)
  if (usedTrendingTag) score += 5;
  else suggestions.push('Ride a live trend/sound or trending hashtag for a discovery boost.');

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 85 ? 'excellent' : score >= 70 ? 'strong' : score >= 50 ? 'fair' : 'weak';
  return { platform, score, grade, suggestions };
}

function capitalize(str) {
  const s = String(str || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = {
  PLATFORM_META_RULES,
  BRAND_TAGS,
  DEFAULT_PLATFORMS,
  detectMarketingCategory,
  extractKeywords,
  buildHashtags,
  hashtagLineOf,
  generatePlatformMetadata,
  optimizeForAllPlatforms,
  computeDiscoverabilityScore
};
