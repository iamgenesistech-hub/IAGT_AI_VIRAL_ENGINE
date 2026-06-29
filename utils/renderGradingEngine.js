function calculateRenderGrade(scores) {

  const {
    viralPotential = 0,
    conversionPotential = 0,
    brandAlignment = 0,
    productFit = 0,
    visualQuality = 0,
    hookStrength = 0,
    emotionalImpact = 0
  } = scores;

  const finalScore =
    (viralPotential * 0.20) +
    (conversionPotential * 0.20) +
    (brandAlignment * 0.15) +
    (productFit * 0.15) +
    (visualQuality * 0.10) +
    (hookStrength * 0.10) +
    (emotionalImpact * 0.10);

  return Math.round(finalScore * 100) / 100;
}

function determineRenderStatus(score) {

  if (score >= 95) {
    return "Best of the Best";
  }

  if (score >= 85) {
    return "Approved";
  }

  if (score >= 70) {
    return "Needs Improvement";
  }

  return "Rejected";
}

function shouldEnterEliteVault(score, topPercentRank) {

  return score >= 92 && topPercentRank <= 15;

}

module.exports = {
  calculateRenderGrade,
  determineRenderStatus,
  shouldEnterEliteVault
};