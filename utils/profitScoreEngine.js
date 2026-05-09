function calculateWeightedProfitScore(data, weights) {
  const {
    netProfit = 0,
    profitVelocity = 0,
    profitStability = 0,
    scalability = 0,
    fatigueRisk = 0,
    refundRisk = 0
  } = data;

  const {
    netProfitWeight = 0.35,
    velocityWeight = 0.2,
    stabilityWeight = 0.15,
    scalabilityWeight = 0.15,
    fatigueRiskWeight = 0.075,
    refundRiskWeight = 0.075
  } = weights;

  const score =
    netProfit * netProfitWeight +
    profitVelocity * velocityWeight +
    profitStability * stabilityWeight +
    scalability * scalabilityWeight -
    fatigueRisk * fatigueRiskWeight -
    refundRisk * refundRiskWeight;

  return Math.round(score * 100) / 100;
}

function calculateNetProfit(data) {
  const {
    revenue = 0,
    adSpend = 0,
    cogs = 0,
    shipping = 0,
    fees = 0,
    refunds = 0,
    creativeProduction = 0,
    marketingOverhead = 0
  } = data;

  return (
    revenue -
    adSpend -
    cogs -
    shipping -
    fees -
    refunds -
    creativeProduction -
    marketingOverhead
  );
}

module.exports = {
  calculateNetProfit,
  calculateWeightedProfitScore
};