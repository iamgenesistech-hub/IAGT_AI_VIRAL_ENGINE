function predictAdFatigue(ad) {
  const fatigueScore =
    (ad.frequency || 0) * 0.30 +
    (ad.ctrDrop || 0) * 0.30 +
    (ad.cpaIncrease || 0) * 0.25 +
    (ad.commentNegativity || 0) * 0.15;

  return {
    adName: ad.name,
    fatigueScore: Math.round(fatigueScore),
    status:
      fatigueScore >= 80 ? "High Fatigue - Rotate Immediately" :
      fatigueScore >= 60 ? "Moderate Fatigue - Prepare Replacement" :
      "Healthy"
  };
}

module.exports = {
  predictAdFatigue
};