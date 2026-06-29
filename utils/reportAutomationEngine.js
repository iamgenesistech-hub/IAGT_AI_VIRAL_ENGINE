function generateReport(type, data) {
  return {
    reportType: type,
    generatedAt: new Date().toISOString(),
    summary: data.summary || "",
    recommendations: data.recommendations || [],
    alerts: data.alerts || []
  };
}

module.exports = { generateReport };
