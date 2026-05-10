function calculateAwarenessScore(data) {
  const {
    brandedSearchGrowth = 0,
    repeatVisitorLift = 0,
    repeatBuyerLift = 0,
    crossSkuLift = 0
  } = data;

  return Math.round(
    brandedSearchGrowth * 0.30 +
    repeatVisitorLift * 0.25 +
    repeatBuyerLift * 0.25 +
    crossSkuLift * 0.20
  );
}

function calculateMomentumScore(data) {
  const {
    salesAcceleration = 0,
    cacDecrease = 0,
    cvrIncrease = 0,
    discountDepthDecrease = 0,
    awarenessGrowth = 0
  } = data;

  return Math.round(
    salesAcceleration * 0.30 +
    cacDecrease * 0.20 +
    cvrIncrease * 0.20 +
    discountDepthDecrease * 0.15 +
    awarenessGrowth * 0.15
  );
}

function momentumDecision(momentumScore, netProfit) {
  if (momentumScore >= 80 && netProfit > 0) return "Controlled Scale";
  if (momentumScore >= 60) return "Continue Testing";
  return "Momentum Decay";
}

module.exports = {
  calculateAwarenessScore,
  calculateMomentumScore,
  momentumDecision
};