function forecastSkuOpportunity(skuData) {
  const score =
    (skuData.netProfit || 0) * 0.4 +
    (skuData.momentumScore || 0) * 10 +
    (skuData.awarenessScore || 0) * 5 -
    (skuData.fatigueRisk || 0) * 5;

  return {
    sku: skuData.sku,
    forecastScore: Math.round(score),
    recommendation: score >= 1000 ? "High Opportunity" : "Monitor"
  };
}

module.exports = { forecastSkuOpportunity };
