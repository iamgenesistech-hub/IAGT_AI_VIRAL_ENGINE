function intakeTrend(trend) {

  return {
    accepted: true,
    trend,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  intakeTrend
};