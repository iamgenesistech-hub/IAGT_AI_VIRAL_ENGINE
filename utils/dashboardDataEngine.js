function prepareDashboardData(data) {
  return {
    profit: data.profit || {},
    tiers: data.tiers || {},
    campaigns: data.campaigns || [],
    alerts: data.alerts || []
  };
}

module.exports = { prepareDashboardData };
