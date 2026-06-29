function recommendBudgetShift(fromCampaign, toCampaign, amount) {
  return {
    shiftRecommended: true,
    from: fromCampaign,
    to: toCampaign,
    amount,
    reason: "Move budget from weaker performer to stronger profit opportunity"
  };
}

module.exports = { recommendBudgetShift };
