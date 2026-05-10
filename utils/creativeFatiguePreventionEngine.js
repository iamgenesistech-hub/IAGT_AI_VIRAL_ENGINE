function preventCreativeFatigue(ad) {
  if (ad.fatigueScore >= 70) {
    return {
      action: "Refresh Creative",
      reason: "Fatigue risk is elevated"
    };
  }

  return {
    action: "Continue Running",
    reason: "Fatigue risk acceptable"
  };
}

module.exports = { preventCreativeFatigue };
