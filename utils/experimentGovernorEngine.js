function evaluateExperiment(baseline, challenger) {

  const baselineScore = baseline.weightedProfitScore;
  const challengerScore = challenger.weightedProfitScore;

  if (challengerScore > baselineScore) {

    return {
      winner: challenger.name,
      action: "Promote Challenger",
      archive: baseline.name,
      improvement:
        Math.round(
          ((challengerScore - baselineScore) / baselineScore) * 100
        ) + "%"
    };

  }

  return {
    winner: baseline.name,
    action: "Keep Baseline",
    archive: challenger.name,
    improvement: "0%"
  };
}

function determineExperimentStatus(daysRunning, confidenceScore) {

  if (confidenceScore >= 90 && daysRunning >= 3) {
    return "Winner Confirmed";
  }

  if (confidenceScore >= 70) {
    return "Continue Testing";
  }

  return "Kill Test";
}

function shouldPromoteExperiment(weightedProfitScore, renderGrade) {

  return weightedProfitScore >= 1200 && renderGrade >= 85;

}

module.exports = {
  evaluateExperiment,
  determineExperimentStatus,
  shouldPromoteExperiment
};
