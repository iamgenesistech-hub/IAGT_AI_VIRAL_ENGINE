// backend/agents/trendScoutTwin.js
// Trend Scout Twin Agent — scans viral content across platforms,
// analyzes winning hooks, structures, and emotional patterns,
// and returns ranked trends with confidence scores.

'use strict';

const SupabaseConnector = require('../../utils/SupabaseConnector');
const viralConfig = require('../../configs/viralConfig');
const {
  calculateViralScore,
  classifyViralAd,
  extractWinningStructure,
  determineViralAction,
} = require('../../utils/viralIntelligenceEngine');

// ---------------------------------------------------------------------------
// Platform-specific hook templates that simulate real scrape intelligence.
// In production these would be replaced by live scraper calls.
// ---------------------------------------------------------------------------
const PLATFORM_HOOK_TEMPLATES = {
  TikTok: [
    { hook: 'Nobody talks about this morning habit…', emotion: 'curiosity', structure: 'Problem-Reveal' },
    { hook: 'I tried this for 7 days and my body changed.', emotion: 'transformation', structure: 'Testimonial' },
    { hook: 'Stop scrolling — this is the supplement secret.', emotion: 'urgency', structure: 'Pattern-Interrupt' },
    { hook: 'POV: You finally fixed your energy problem.', emotion: 'aspiration', structure: 'POV' },
    { hook: 'The morning ritual that changed my entire output.', emotion: 'transformation', structure: 'Routine' },
  ],
  Instagram: [
    { hook: 'This changed my skin in 7 days — no filter.', emotion: 'proof', structure: 'Before-After' },
    { hook: 'The glow routine that finally feels premium.', emotion: 'aspiration', structure: 'Luxury-Reveal' },
    { hook: 'I felt flat until I fixed this one thing.', emotion: 'problem-solution', structure: 'Reframe' },
    { hook: 'Wellness that looks as good as it feels.', emotion: 'identity', structure: 'Lifestyle' },
    { hook: 'My skin care routine is 3 steps. Here they are.', emotion: 'simplicity', structure: 'How-To' },
  ],
  YouTube: [
    { hook: 'What if your energy problem was never about sleep?', emotion: 'reframe', structure: 'Myth-Bust' },
    { hook: 'I stopped treating my focus like a willpower problem.', emotion: 'insight', structure: 'Reframe' },
    { hook: 'The supplement stack that actually works — tested 90 days.', emotion: 'authority', structure: 'Long-Form-Proof' },
    { hook: 'Why most wellness routines fail by week two.', emotion: 'education', structure: 'Problem-Analysis' },
    { hook: 'I reviewed 47 supplements. Here are the only 3 worth buying.', emotion: 'trust', structure: 'Authority-Review' },
  ],
  Pinterest: [
    { hook: 'Wellness that looks as good as it feels.', emotion: 'luxury', structure: 'Aspirational' },
    { hook: 'The supplement flatlay that started a ritual.', emotion: 'identity', structure: 'Lifestyle-Visual' },
    { hook: 'Morning routine essentials for high performers.', emotion: 'aspiration', structure: 'Curated-List' },
    { hook: 'Premium wellness. No compromise.', emotion: 'luxury', structure: 'Brand-Statement' },
    { hook: 'Create your ritual. Own your morning.', emotion: 'empowerment', structure: 'CTA-Hook' },
  ],
  X: [
    { hook: 'Hot take: most supplements are marketing. These are not.', emotion: 'controversy', structure: 'Hot-Take' },
    { hook: 'Thread: what I learned after 90 days of sea moss.', emotion: 'education', structure: 'Thread-Hook' },
    { hook: 'The supplement industry does not want you to know this.', emotion: 'conspiracy-curiosity', structure: 'Expose' },
    { hook: 'I tracked my energy for 30 days. The results surprised me.', emotion: 'data-proof', structure: 'Data-Story' },
    { hook: 'Unpopular opinion: your diet is not the problem.', emotion: 'reframe', structure: 'Unpopular-Opinion' },
  ],
};

const EMOTIONAL_PATTERNS = [
  'curiosity', 'transformation', 'urgency', 'aspiration', 'proof',
  'authority', 'reframe', 'identity', 'empowerment', 'social-proof',
];

const CONTENT_STRUCTURES = [
  'Problem-Solution', 'Before-After', 'Testimonial', 'How-To',
  'Myth-Bust', 'Authority-Review', 'Pattern-Interrupt', 'Lifestyle',
  'Data-Story', 'Thread-Hook',
];

// ---------------------------------------------------------------------------
// Core scan logic
// ---------------------------------------------------------------------------

/**
 * Generates a realistic viral score for a simulated trend entry.
 */
function _generateViralMetrics(platform) {
  const baseViews = { TikTok: 1200000, Instagram: 800000, YouTube: 600000, Pinterest: 300000, X: 450000 };
  const base = baseViews[platform] || 500000;
  const variance = () => 0.5 + Math.random();

  return {
    views: Math.round(base * variance()),
    shares: Math.round(base * 0.012 * variance()),
    comments: Math.round(base * 0.006 * variance()),
    velocity: Math.round(60 + Math.random() * 35),
    hookStrength: Math.round(70 + Math.random() * 28),
    productFit: Math.round(65 + Math.random() * 30),
    conversionSignal: Math.round(60 + Math.random() * 35),
  };
}

/**
 * Builds a full trend object from a platform + hook template.
 */
function _buildTrendEntry(platform, template, category) {
  const metrics = _generateViralMetrics(platform);
  const viralScore = calculateViralScore({ ...metrics, category });
  const action = determineViralAction(viralScore);
  const confidence = viralScore >= 75 ? 'High' : viralScore >= 55 ? 'Medium' : 'Low';

  return {
    platform,
    category,
    hook: template.hook,
    emotion: template.emotion,
    structure: template.structure,
    viralScore: Math.round(viralScore),
    confidence,
    action,
    metrics,
    winningStructure: {
      hook: template.hook,
      problem: `Audience pain point related to ${category.toLowerCase()}`,
      agitation: `Deeper frustration around ${template.emotion}`,
      solution: `${category} product as the answer`,
      proof: 'Social proof + transformation visual',
      cta: 'Shop now and begin your Genesis transformation.',
      visualPattern: `${template.structure} visual format`,
      pacing: platform === 'TikTok' ? 'Fast cuts, 0.5s hook' : 'Moderate pacing, 1-2s hook',
      emotionalTrigger: template.emotion,
    },
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Main scan function — scans all configured platforms and categories,
 * returns ranked trends with confidence scores.
 *
 * @param {object} options
 * @param {string[]} [options.platforms]   - Platforms to scan (default: all)
 * @param {string[]} [options.categories]  - Categories to focus on (default: all)
 * @param {number}   [options.limit]       - Max trends to return (default: 20)
 * @param {boolean}  [options.persist]     - Whether to save results to Supabase
 * @returns {Promise<object>}
 */
async function scan(options = {}) {
  const {
    platforms = Object.keys(PLATFORM_HOOK_TEMPLATES),
    categories = viralConfig.categories.slice(0, 6),
    limit = 20,
    persist = true,
  } = options;

  const trends = [];

  for (const platform of platforms) {
    const templates = PLATFORM_HOOK_TEMPLATES[platform] || [];
    for (const template of templates) {
      // Rotate through categories for variety
      const category = categories[trends.length % categories.length];
      const trend = _buildTrendEntry(platform, template, category);
      trends.push(trend);
    }
  }

  // Sort by viral score descending
  trends.sort((a, b) => b.viralScore - a.viralScore);
  const topTrends = trends.slice(0, limit);

  // Persist to Supabase if requested
  if (persist) {
    try {
      const rows = topTrends.map((t) => ({
        title: t.hook.slice(0, 120),
        hook: t.hook,
        platform: t.platform,
        category: t.category,
        confidence: t.confidence,
        viral_score: t.viralScore,
        emotion: t.emotion,
        structure: t.structure,
        action: t.action,
        source: 'trend_scout_twin',
        created_at: new Date().toISOString(),
      }));
      await SupabaseConnector.from('evics_trends').insert(rows);
    } catch (e) {
      // Non-fatal — log and continue
      console.warn('[TrendScoutTwin] Supabase persist failed:', e.message);
    }
  }

  // Aggregate summary stats
  const highConfidence = topTrends.filter((t) => t.confidence === 'High').length;
  const platformBreakdown = {};
  topTrends.forEach((t) => {
    platformBreakdown[t.platform] = (platformBreakdown[t.platform] || 0) + 1;
  });

  const topEmotions = [...new Set(topTrends.map((t) => t.emotion))].slice(0, 5);
  const topStructures = [...new Set(topTrends.map((t) => t.structure))].slice(0, 5);

  return {
    agent: 'TrendScoutTwin',
    status: 'complete',
    scannedPlatforms: platforms,
    totalScanned: trends.length,
    topTrends,
    summary: {
      totalFound: topTrends.length,
      highConfidence,
      platformBreakdown,
      topEmotions,
      topStructures,
      avgViralScore: Math.round(topTrends.reduce((s, t) => s + t.viralScore, 0) / (topTrends.length || 1)),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetches previously stored trends from Supabase.
 */
async function fetchStoredTrends(limit = 50) {
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  } catch (e) {
    console.warn('[TrendScoutTwin] fetchStoredTrends failed:', e.message);
    return [];
  }
}

module.exports = {
  scan,
  fetchStoredTrends,
  PLATFORM_HOOK_TEMPLATES,
  EMOTIONAL_PATTERNS,
  CONTENT_STRUCTURES,
};
