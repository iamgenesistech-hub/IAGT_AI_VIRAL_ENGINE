// backend/agents/productMatchTwin.js
// Product Match Twin Agent — matches products to viral trends,
// scores product-trend fit, and suggests positioning angles.

'use strict';

const SupabaseConnector = require('../../utils/SupabaseConnector');
const { matchProductsToAd } = require('../../utils/productMatchingEngine');

// ---------------------------------------------------------------------------
// Product catalogue — pulled from Supabase when available, falls back to
// the canonical workspace list used across the EVICS system.
// ---------------------------------------------------------------------------
const FALLBACK_PRODUCTS = [
  {
    name: 'Sea Moss Mineral Gel',
    category: 'Sea Moss',
    sku: 'ROC_SEAMOSS',
    collections: ['Wellness', 'Sea Moss'],
    categories: ['Sea Moss', 'Gut Health', 'Immune Support'],
    goals: ['daily ritual', 'mineral support', 'gut health'],
    benefits: ['minerals', 'energy', 'gut health', 'immunity'],
    angles: ['daily mineral ritual', 'morning wellness reset', 'gut-brain connection'],
    baseScore: 96,
    isBundle: false,
  },
  {
    name: 'Metabolic Ignite',
    category: 'Weight Loss',
    sku: 'ROC_METABOLIC',
    collections: ['Wellness'],
    categories: ['Weight Loss', 'Fitness'],
    goals: ['weight loss', 'morning reset', 'metabolism'],
    benefits: ['fat burn', 'energy', 'metabolism', 'morning reset'],
    angles: ['morning reset', 'metabolic activation', 'clean energy burn'],
    baseScore: 91,
    isBundle: false,
  },
  {
    name: 'Genesis Glow Collagen',
    category: 'Beauty',
    sku: 'ROC_BEAUTY',
    collections: ['Beauty', 'Wellness'],
    categories: ['Beauty', 'Luxury Wellness'],
    goals: ['skin health', 'glow', 'anti-aging'],
    benefits: ['collagen', 'skin confidence', 'glow', 'ceramides'],
    angles: ['skin confidence', 'luxury glow ritual', 'premium beauty from within'],
    baseScore: 88,
    isBundle: false,
  },
  {
    name: 'Apex Testosterone Support',
    category: 'Testosterone',
    sku: 'ROC_TEST',
    collections: ['Sports Nutrition', 'Wellness'],
    categories: ['Testosterone Support', 'Fitness', 'Sports Nutrition'],
    goals: ['testosterone', 'training foundation', 'performance'],
    benefits: ['strength', 'testosterone', 'training foundation', 'discipline'],
    angles: ['training foundation', 'elite performance base', 'natural testosterone support'],
    baseScore: 86,
    isBundle: false,
  },
  {
    name: 'NeuroRise Focus',
    category: 'Nootropics',
    sku: 'ROC_FOCUS',
    collections: ['Wellness'],
    categories: ['Nootropics', 'Fitness'],
    goals: ['focus', 'productivity', 'cognitive performance'],
    benefits: ['focus', 'clarity', 'clean energy', 'cognitive performance'],
    angles: ['clean productive energy', 'cognitive edge', 'focus without crash'],
    baseScore: 82,
    isBundle: false,
  },
  {
    name: 'Genesis Wellness Bundle',
    category: 'Bundles',
    sku: 'ROC_BUNDLE',
    collections: ['Bundles', 'Wellness'],
    categories: ['Luxury Wellness', 'Sea Moss', 'Beauty'],
    goals: ['complete wellness', 'bundle value', 'transformation'],
    benefits: ['complete wellness', 'value', 'transformation', 'ritual'],
    angles: ['complete transformation stack', 'premium wellness bundle', 'all-in-one ritual'],
    baseScore: 94,
    isBundle: true,
  },
];

// ---------------------------------------------------------------------------
// Scoring logic
// ---------------------------------------------------------------------------

/**
 * Scores how well a product fits a given trend.
 * Returns a 0–100 fit score and a recommended positioning angle.
 */
function _scoreTrendFit(product, trend) {
  let score = 0;
  const reasons = [];

  // Category alignment
  const trendCat = (trend.category || '').toLowerCase();
  const productCats = (product.categories || []).map((c) => c.toLowerCase());
  if (productCats.some((c) => trendCat.includes(c) || c.includes(trendCat))) {
    score += 30;
    reasons.push('Category match');
  }

  // Emotional alignment
  const emotion = (trend.emotion || '').toLowerCase();
  const benefits = (product.benefits || []).map((b) => b.toLowerCase());
  if (benefits.some((b) => emotion.includes(b) || b.includes(emotion))) {
    score += 20;
    reasons.push('Emotional resonance');
  }

  // Goal alignment
  const goals = (product.goals || []).map((g) => g.toLowerCase());
  const hookText = (trend.hook || '').toLowerCase();
  if (goals.some((g) => hookText.includes(g))) {
    score += 20;
    reasons.push('Hook-goal alignment');
  }

  // Platform fit
  const platform = (trend.platform || '').toLowerCase();
  if (platform === 'tiktok' || platform === 'instagram') score += 10;
  if (product.isBundle) score += 5;

  // Viral score bonus
  if ((trend.viralScore || 0) >= 75) score += 15;
  else if ((trend.viralScore || 0) >= 55) score += 8;

  // Cap at 100
  score = Math.min(100, score);

  // Pick best angle
  const angles = product.angles || [];
  const bestAngle = angles.find((a) => {
    const al = a.toLowerCase();
    return emotion.includes(al.split(' ')[0]) || trendCat.includes(al.split(' ')[0]);
  }) || angles[0] || product.category;

  return { score, reasons, bestAngle };
}

// ---------------------------------------------------------------------------
// Main analyze function
// ---------------------------------------------------------------------------

/**
 * Matches products to a set of trends and returns ranked matches.
 *
 * @param {object} options
 * @param {object[]} [options.trends]     - Trend objects from TrendScoutTwin
 * @param {object[]} [options.products]   - Product list (falls back to Supabase then FALLBACK_PRODUCTS)
 * @param {number}   [options.topN]       - Max matches per trend (default: 3)
 * @param {boolean}  [options.persist]    - Save results to Supabase (default: true)
 * @returns {Promise<object>}
 */
async function analyze(options = {}) {
  const { trends = [], topN = 3, persist = true } = options;

  // Load products from Supabase or fall back to canonical list
  let products = options.products || [];
  if (!products.length) {
    try {
      const { data } = await SupabaseConnector
        .from('evics_products')
        .select('*')
        .order('score', { ascending: false })
        .limit(50);
      if (data && data.length) {
        products = data.map((row) => ({
          name: row.name,
          category: row.category || 'General',
          sku: row.sku || '',
          collections: row.collections || [],
          categories: [row.category || 'General'],
          goals: row.goals || [],
          benefits: row.benefits || [],
          angles: [row.angle || 'premium wellness ritual'],
          baseScore: row.score || 75,
          isBundle: Boolean(row.is_bundle),
        }));
      }
    } catch (e) {
      console.warn('[ProductMatchTwin] Supabase product load failed:', e.message);
    }
  }
  if (!products.length) products = FALLBACK_PRODUCTS;

  // If no trends provided, use a minimal placeholder
  const workingTrends = trends.length
    ? trends
    : [{ category: 'Wellness', emotion: 'transformation', hook: 'General wellness trend', platform: 'TikTok', viralScore: 70 }];

  const matches = [];

  for (const trend of workingTrends) {
    const scored = products.map((product) => {
      const fit = _scoreTrendFit(product, trend);
      return {
        product: product.name,
        category: product.category,
        sku: product.sku || '',
        fitScore: fit.score,
        reasons: fit.reasons,
        positioningAngle: fit.bestAngle,
        baseScore: product.baseScore || 75,
        isBundle: product.isBundle || false,
      };
    });

    scored.sort((a, b) => b.fitScore - a.fitScore);
    const topMatches = scored.slice(0, topN);

    matches.push({
      trend: {
        hook: trend.hook,
        platform: trend.platform,
        category: trend.category,
        emotion: trend.emotion,
        viralScore: trend.viralScore,
      },
      topMatches,
      bestProduct: topMatches[0] || null,
    });
  }

  // Persist top matches to Supabase
  if (persist && matches.length) {
    try {
      const rows = matches
        .filter((m) => m.bestProduct)
        .map((m) => ({
          name: m.bestProduct.product,
          category: m.bestProduct.category,
          angle: m.bestProduct.positioningAngle,
          score: m.bestProduct.fitScore,
          trend_hook: m.trend.hook,
          trend_platform: m.trend.platform,
          source: 'product_match_twin',
          created_at: new Date().toISOString(),
        }));
      if (rows.length) {
        await SupabaseConnector.from('evics_products').upsert(rows, { onConflict: 'name' });
      }
    } catch (e) {
      console.warn('[ProductMatchTwin] Supabase persist failed:', e.message);
    }
  }

  // Build summary
  const allBestProducts = matches.map((m) => m.bestProduct?.product).filter(Boolean);
  const productFrequency = {};
  allBestProducts.forEach((p) => { productFrequency[p] = (productFrequency[p] || 0) + 1; });
  const topProduct = Object.entries(productFrequency).sort((a, b) => b[1] - a[1])[0];

  return {
    agent: 'ProductMatchTwin',
    status: 'complete',
    totalTrendsAnalyzed: workingTrends.length,
    totalProductsEvaluated: products.length,
    matches,
    summary: {
      topProduct: topProduct ? topProduct[0] : null,
      topProductFrequency: topProduct ? topProduct[1] : 0,
      avgFitScore: Math.round(
        matches.flatMap((m) => m.topMatches.map((t) => t.fitScore)).reduce((s, v) => s + v, 0) /
        (matches.flatMap((m) => m.topMatches).length || 1)
      ),
      productFrequency,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  analyze,
  FALLBACK_PRODUCTS,
};
