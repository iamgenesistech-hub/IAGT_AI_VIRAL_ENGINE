function forecastTrend(trend) {
  const score =
    (trend.velocity || 0) * 0.35 +
    (trend.engagement || 0) * 0.25 +
    (trend.productFit || 0) * 0.25 +
    (trend.platformGrowth || 0) * 0.15;

  return {
    trendName: trend.name,
    forecastScore: Math.round(score),
    recommendation:
      score >= 85 ? "Act immediately" :
      score >= 70 ? "Test quickly" :
      score >= 50 ? "Monitor" :
      "Ignore"
  };
}

module.exports = {
  forecastTrend
};