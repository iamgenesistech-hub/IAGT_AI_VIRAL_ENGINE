function routeToVault(asset) {
  if (asset.grade >= 92) return "EVICS Render Folder - Best of the Best";
  if (asset.grade >= 85) return "EVICS Approved Ads";
  if (asset.performanceScore >= 70) return "EVICS Fallout Top 100";
  return "EVICS Rejected Renderings";
}

module.exports = { routeToVault };
