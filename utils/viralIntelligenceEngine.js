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
  if (ad.category?.toLowerCase().includes('fitness')) return 'Sports Nutrition';

  return 'General Wellness';
}

function extractWinningStructure(ad) {
  return {
    hook: ad.hook || '',
    problem: ad.problem || '',
    agitation: ad.agitation || '',
    solution: ad.solution || '',
    proof: ad.proof || '',
    cta: ad.cta || '',
    visualPattern: ad.visualPattern || '',
    pacing: ad.pacing || '',
    emotionalTrigger: ad.emotionalTrigger || ''
  };
}

function determineViralAction(score) {
  if (score >= 85) return 'Recreate Immediately';
  if (score >= 70) return 'Test Concept';
  if (score >= 50) return 'Archive for Learning';
  return 'Reject';
}

module.exports = {
  calculateViralScore,
  classifyViralAd,
  extractWinningStructure,
  determineViralAction
};