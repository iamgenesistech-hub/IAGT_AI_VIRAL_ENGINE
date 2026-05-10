function makeEVICSDecision({
  profitScore,
  renderGrade,
  momentumScore,
  awarenessScore,
  tier
}) {

  if (tier === "Tier 1" && profitScore >= 1500 && renderGrade >= 90) {
    return "Scale Aggressively";
  }

  if (momentumScore >= 75 && awarenessScore >= 70) {
    return "Controlled Scale";
  }

  if (renderGrade < 70) {
    return "Reject Creative";
  }

  return "Continue Testing";
}

module.exports = {
  makeEVICSDecision
};