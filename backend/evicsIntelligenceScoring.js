'use strict';

/**
 * EVICS Intelligence Scoring Engine
 * Scores normalized scrape results across 4 dimensions and produces
 * ranked opportunity lists for content generation and affiliate recommendations.
 *
 * Dimensions:
 *   hookStrength     — how compelling is this for an affiliate hook/intro
 *   viralPotential   — signals that content based on this could trend
 *   offerQuality     — price point, availability, review signals
 *   competitorAlert  — urgency of competitive threat / price advantage
 */

// ── Hook Strength ────────────────────────────────────────────────────────────
// High-impact words that make strong affiliate hooks
const HOOK_TRIGGER_WORDS = new Set([
  'sale', 'deal', 'limited', 'exclusive', 'new', 'launch', 'revealed', 'best',
  'top', 'number one', '#1', 'viral', 'trending', 'must have', 'must-have',
  'secret', 'free', 'bonus', 'proven', 'results', 'natural', 'organic',
  'transform', 'life-changing', 'powerful', 'effective', 'guaranteed',
]);

function scoreHookStrength(normalized) {
  const text = String(
    (normalized.title || '') + ' ' + (normalized.description || '')
  ).toLowerCase();

  let score = 0;
  let hits = 0;

  for (const word of HOOK_TRIGGER_WORDS) {
    if (text.includes(word)) { hits += 1; score += 8; }
  }

  // Product with price is inherently hookable
  if (normalized.product?.price != null && normalized.product.price > 0) score += 15;
  // High rating signals trustworthiness
  if (normalized.product?.ratingValue >= 4.0) score += 10;
  if (normalized.product?.reviewCount >= 100) score += 10;
  // Image available = visual hook
  if (normalized.imageUrl) score += 8;
  // Title presence
  if (normalized.title && normalized.title.length > 10) score += 5;

  return Math.min(100, score);
}

// ── Viral Potential ──────────────────────────────────────────────────────────
const VIRAL_CATEGORIES = new Set(['trending_social', 'social_content']);

function scoreViralPotential(normalized) {
  let score = 0;

  if (VIRAL_CATEGORIES.has(normalized.category)) score += 30;
  if (normalized.hashtags.length >= 5) score += 20;
  if (normalized.hashtags.length >= 10) score += 10;
  // Hashtags that explicitly signal virality
  const viralTags = normalized.hashtags.filter((t) =>
    ['viral', 'trending', 'fyp', 'foryou', 'foryoupage', 'explore', 'reels', 'shorts'].includes(t)
  );
  score += viralTags.length * 8;
  // Social platform URL boosts
  const url = String(normalized.sourceUrl || '').toLowerCase();
  if (url.includes('tiktok') || url.includes('instagram') || url.includes('youtube')) score += 20;
  // Good signal quality = more data to work with
  if (normalized.signalQuality >= 60) score += 10;

  return Math.min(100, score);
}

// ── Offer Quality ────────────────────────────────────────────────────────────
function scoreOfferQuality(normalized) {
  const product = normalized.product;
  if (!product) {
    // Non-product pages can still have price signals
    return normalized.prices.length > 0 ? 20 : 0;
  }

  let score = 0;

  // Has a price
  if (product.price != null && product.price > 0) {
    score += 25;
    // Sweet spot affiliate price range ($10–$200)
    if (product.price >= 10 && product.price <= 200) score += 15;
    // Premium ($200+) signals high commission opportunity
    if (product.price > 200) score += 10;
  }

  // Rating signals
  if (product.ratingValue >= 4.5) score += 20;
  else if (product.ratingValue >= 4.0) score += 12;
  else if (product.ratingValue >= 3.5) score += 6;

  // Review count signals social proof
  if (product.reviewCount >= 1000) score += 15;
  else if (product.reviewCount >= 100) score += 10;
  else if (product.reviewCount >= 10) score += 5;

  // In-stock availability
  if (String(product.availability || '').toLowerCase().includes('instock')) score += 10;

  return Math.min(100, score);
}

// ── Competitor Alert ─────────────────────────────────────────────────────────
function scoreCompetitorAlert(normalized, recentResults = []) {
  let score = 0;

  if (normalized.isCompetitorContent) score += 30;

  // Multiple price points on a page = comparison shopping page
  if (normalized.prices.length >= 3) score += 20;

  // Check if this price is lower than the median of recent results in same category
  if (normalized.product?.price != null && recentResults.length >= 3) {
    const sameCategoryPrices = recentResults
      .filter((r) => r.category === normalized.category && r.product?.price != null)
      .map((r) => r.product.price)
      .sort((a, b) => a - b);
    if (sameCategoryPrices.length >= 2) {
      const median = sameCategoryPrices[Math.floor(sameCategoryPrices.length / 2)];
      if (normalized.product.price < median * 0.85) {
        // 15%+ cheaper than median = competitor alert
        score += 30;
      }
    }
  }

  // Competitor keyword in title/description
  const text = String((normalized.title || '') + ' ' + (normalized.description || '')).toLowerCase();
  if (['vs', 'versus', 'alternative', 'competitor', 'compare'].some((w) => text.includes(w))) score += 15;

  return Math.min(100, score);
}

// ── Composite Intelligence Score ─────────────────────────────────────────────
/**
 * Score a single normalized scrape result across all 4 dimensions.
 * @param {object} normalized - output of normalizeScraperResult
 * @param {Array} recentResults - recent normalized results for relative scoring
 * @returns {object} intelligence score record
 */
function scoreIntelligence(normalized, recentResults = []) {
  const hookStrength = scoreHookStrength(normalized);
  const viralPotential = scoreViralPotential(normalized);
  const offerQuality = scoreOfferQuality(normalized);
  const competitorAlert = scoreCompetitorAlert(normalized, recentResults);

  // Weighted composite: hook + viral outweigh offer + competitor for affiliate content
  const composite = Math.round(
    hookStrength * 0.35 +
    viralPotential * 0.30 +
    offerQuality * 0.25 +
    competitorAlert * 0.10
  );

  const tier = composite >= 80 ? 'A+' : composite >= 65 ? 'A' : composite >= 50 ? 'B' : composite >= 35 ? 'C' : 'D';

  return {
    sourceUrl: normalized.sourceUrl,
    category: normalized.category,
    affiliateCode: normalized.affiliateCode || null,
    title: normalized.title || null,
    imageUrl: normalized.imageUrl || null,
    product: normalized.product ? {
      price: normalized.product.price,
      ratingValue: normalized.product.ratingValue,
      reviewCount: normalized.product.reviewCount,
      name: normalized.product.name,
    } : null,
    scores: {
      hookStrength,
      viralPotential,
      offerQuality,
      competitorAlert,
      composite,
    },
    tier,
    hashtags: normalized.hashtags.slice(0, 10),
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Rank a list of normalized results by composite score.
 * Returns top N with full score breakdown.
 * @param {Array} normalizedResults
 * @param {object} options
 * @returns {Array} ranked intelligence records
 */
function rankOpportunities(normalizedResults, options = {}) {
  const limit = Math.max(1, Math.min(200, Number(options.limit || 20)));
  const minComposite = Number(options.minScore || 0);
  const filterCategory = options.category ? String(options.category).toLowerCase() : null;

  let filtered = normalizedResults;
  if (filterCategory) {
    filtered = filtered.filter((r) => String(r.category || '').toLowerCase() === filterCategory);
  }

  const scored = filtered.map((r) => scoreIntelligence(r, normalizedResults));
  const ranked = scored
    .filter((r) => r.scores.composite >= minComposite)
    .sort((a, b) => b.scores.composite - a.scores.composite)
    .slice(0, limit);

  return ranked;
}

/**
 * Generate a competitor alert if any scored result has competitorAlert >= threshold.
 */
function buildCompetitorAlerts(rankedResults, threshold = 50) {
  return rankedResults
    .filter((r) => r.scores.competitorAlert >= threshold)
    .map((r) => ({
      url: r.sourceUrl,
      title: r.title,
      price: r.product?.price || null,
      competitorScore: r.scores.competitorAlert,
      message: `Competitor content detected (score ${r.scores.competitorAlert}). Price: ${r.product?.price != null ? `$${r.product.price}` : 'N/A'}. Consider creating counter-content.`,
    }));
}

module.exports = {
  scoreIntelligence,
  rankOpportunities,
  buildCompetitorAlerts,
  scoreHookStrength,
  scoreViralPotential,
  scoreOfferQuality,
  scoreCompetitorAlert,
};
