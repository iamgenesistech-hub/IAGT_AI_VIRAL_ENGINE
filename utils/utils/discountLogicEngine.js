function recommendDiscountStrategy(product) {
  const { tier, margin, momentumScore, recoveryWindowActive } = product;

  if (tier === "Tier 1") {
    return {
      discountLevel: "Shallow",
      maxDiscountPercent: 10,
      reason: "Protect margin while accelerating volume."
    };
  }

  if (tier === "Tier 3" && momentumScore >= 60) {
    return {
      discountLevel: "Moderate",
      maxDiscountPercent: 20,
      reason: "Reduce trial friction and validate awareness momentum."
    };
  }

  if (tier === "Tier 4" && recoveryWindowActive) {
    return {
      discountLevel: "Deep Test",
      maxDiscountPercent: margin >= 40 ? 30 : 15,
      reason: "Short recovery test only."
    };
  }

  return {
    discountLevel: "None",
    maxDiscountPercent: 0,
    reason: "No discount recommended."
  };
}

function shouldStopDiscounting(results) {
  return results.netProfitLift <= 0 && results.momentumLift <= 0;
}

module.exports = {
  recommendDiscountStrategy,
  shouldStopDiscounting
};