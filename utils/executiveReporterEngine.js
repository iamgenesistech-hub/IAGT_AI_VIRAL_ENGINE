function generateExecutiveSummary(data) {
  return {
    date: data.date,
    totalRevenue: data.totalRevenue,
    totalNetProfit: data.totalNetProfit,
    totalAdSpend: data.totalAdSpend,
    netMargin: data.totalRevenue > 0
      ? Math.round((data.totalNetProfit / data.totalRevenue) * 10000) / 100
      : 0,
    topRecommendations: data.topRecommendations || [],
    alerts: data.alerts || []
  };
}

function createActionRecommendation(metric) {

  if (metric.netProfit <= 0) {
    return "Pause or rebuild";
  }

  if (metric.momentumScore >= 80 && metric.netProfit > 0) {
    return "Scale carefully";
  }

  if (metric.awarenessScore >= 70 && metric.netProfit > 0) {
    return "Continue testing";
  }

  return "Monitor";
}

module.exports = {
  generateExecutiveSummary,
  createActionRecommendation
};