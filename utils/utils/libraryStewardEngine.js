function enforceTopCreativeCap(creatives, maxActive = 5) {
  const sorted = [...creatives].sort((a, b) => b.performanceScore - a.performanceScore);

  return {
    activeCreatives: sorted.slice(0, maxActive),
    falloutCreatives: sorted.slice(maxActive)
  };
}

function selectEliteTop20(creatives) {
  return [...creatives]
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 20);
}

function shouldMoveToBestOfBest(renderGrade, profitScore) {
  return renderGrade >= 92 && profitScore >= 1200;
}

module.exports = {
  enforceTopCreativeCap,
  selectEliteTop20,
  shouldMoveToBestOfBest
};