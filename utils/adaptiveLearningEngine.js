function learnFromOutcome(outcome) {
  return {
    learned: true,
    winnerPattern: outcome.winnerPattern || "",
    loserPattern: outcome.loserPattern || "",
    nextRecommendation: outcome.nextRecommendation || "Test improved variation"
  };
}

module.exports = { learnFromOutcome };
