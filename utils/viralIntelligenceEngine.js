const llmProvider = require('./llmProvider');

function calculateViralScore(ad) {
  const viewsScore = Math.min((ad.views || 0) / 1000000 * 25, 25);
  const shareScore = Math.min((ad.shares || 0) / 10000 * 20, 20);
  const commentScore = Math.min((ad.comments || 0) / 5000 * 15, 15);
  const velocityScore = Math.min((ad.velocity || 0), 15);
  const hookScore = ad.hookStrength || 0;
  const productFitScore = ad.productFit || 0;
  const conversionSignalScore = ad.conversionSignal || 0;

  const finalScore =
    viewsScore +
    shareScore +
    commentScore +
    velocityScore +
    hookScore * 0.10 +
    productFitScore * 0.10 +
    conversionSignalScore * 0.05;

  return Math.round(finalScore * 100) / 100;
}

function classifyViralAd(ad) {
  if (ad.category?.toLowerCase().includes('sea moss')) return 'Sea Moss';
  if (ad.category?.toLowerCase().includes('weight')) return 'Weight Loss';
  if (ad.category?.toLowerCase().includes('beauty')) return 'Beauty';
  if (ad.category?.toLowerCase().includes('testosterone')) return 'Testosterone';
  if (ad.category?.toLowerCase().includes('focus')) return 'Nootropics';
  if (ad.category?.toLowerCase().includes('sleep')) return 'Sleep';
  return 'General Wellness';
}

async function analyzeViralAd(ad, options = {}) {
  const score = calculateViralScore(ad);
  const classification = classifyViralAd(ad);
  const analysis = {
    ...ad,
    viral_score: score,
    classification,
    decision: score >= 70 ? 'ADD_TO_ENGINE' : 'WATCHLIST'
  };

  if (options.llmEnhanced === true || options.includeViralInsight === true) {
    try {
      const insight = await llmProvider.generateViralInsight({ ad, score, classification });
      analysis.viral_insight = insight.viral_insight || insight.insight || null;
      analysis.llm = insight.llm;
    } catch (error) {
      analysis.viral_insight = 'LLM viral insight unavailable; arithmetic score remains authoritative.';
      analysis.llm_warning = error.message;
    }
  }

  return analysis;
}

module.exports = {
  calculateViralScore,
  classifyViralAd,
  analyzeViralAd
};
