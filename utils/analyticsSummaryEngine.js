function summarizeAnalytics(data) {
  return {
    revenue: data.revenue || 0,
    netProfit: data.netProfit || 0,
    adSpend: data.adSpend || 0,
    momentum: data.momentum || 0,
    awareness: data.awareness || 0
  };
}

module.exports = { summarizeAnalytics };
