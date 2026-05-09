function allocateMarketingBudget(totalBudget, topAds = [], promotionAds = []) {

  const top30Allocation = totalBudget * 0.80;
  const promotionPoolAllocation = totalBudget * 0.20;

  return {
    totalBudget,

    top30: {
      allocation: top30Allocation,
      ads: topAds
    },

    promotionPool: {
      allocation: promotionPoolAllocation,
      ads: promotionAds
    }
  };
}

function rankAdsByProfitScore(ads) {

  return ads.sort((a, b) => b.weightedProfitScore - a.weightedProfitScore);

}

function determineBudgetAction(weightedProfitScore) {

  if (weightedProfitScore >= 2000) {
    return "Scale Aggressively";
  }

  if (weightedProfitScore >= 1200) {
    return "Scale Carefully";
  }

  if (weightedProfitScore >= 600) {
    return "Maintain and Test";
  }

  return "Reduce Spend";
}

module.exports = {
  allocateMarketingBudget,
  rankAdsByProfitScore,
  determineBudgetAction
};