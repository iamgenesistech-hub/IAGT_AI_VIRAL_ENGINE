function deconstructViralAd(ad) {
  return {
    whyItWorked: ad.whyItWorked || "Strong hook, clear proof, emotional relevance, and direct CTA.",
    componentScores: {
      hook: ad.hookScore || 0,
      proof: ad.proofScore || 0,
      pacing: ad.pacingScore || 0,
      cta: ad.ctaScore || 0,
      visualClarity: ad.visualClarityScore || 0,
      emotionalTrigger: ad.emotionalTriggerScore || 0
    },
    formatFingerprint: {
      backgroundPalette: ad.backgroundPalette || [],
      foregroundPalette: ad.foregroundPalette || [],
      accentColors: ad.accentColors || [],
      cameraStyle: ad.cameraStyle || "",
      sceneTiming: ad.sceneTiming || ""
    },
    audienceHypothesis: {
      buyerIntent: ad.buyerIntent || "",
      objections: ad.objections || [],
      sophisticationLevel: ad.sophisticationLevel || ""
    }
  };
}

function calculateViralFormatScore(componentScores) {
  const values = Object.values(componentScores);
  const total = values.reduce((sum, score) => sum + score, 0);
  return Math.round(total / values.length);
}

module.exports = {
  deconstructViralAd,
  calculateViralFormatScore
};