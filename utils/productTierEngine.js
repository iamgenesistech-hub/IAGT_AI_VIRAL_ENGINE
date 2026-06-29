function determineProductTier(percentileRank) {

  if (percentileRank <= 25) {
    return "Tier 1";
  }

  if (percentileRank <= 50) {
    return "Tier 2";
  }

  if (percentileRank <= 75) {
    return "Tier 3";
  }

  return "Tier 4";
}

function getTierAction(tier, daysInTier4 = 0) {

  switch (tier) {

    case "Tier 1":
      return {
        action: "Protect and scale carefully",
        adSpendStatus: "Active"
      };

    case "Tier 2":
      return {
        action: "Refine and optimize",
        adSpendStatus: "Active"
      };

    case "Tier 3":
      return {
        action: "Aggressive development and testing",
        adSpendStatus: "Controlled Growth"
      };

    case "Tier 4":

      if (daysInTier4 >= 60) {

        return {
          action: "Pause product and reallocate capital",
          adSpendStatus: "ZERO"
        };

      }

      return {
        action: "Recovery mode",
        adSpendStatus: "Minimal"
      };

    default:
      return {
        action: "Unknown",
        adSpendStatus: "Unknown"
      };
  }
}

module.exports = {
  determineProductTier,
  getTierAction
};