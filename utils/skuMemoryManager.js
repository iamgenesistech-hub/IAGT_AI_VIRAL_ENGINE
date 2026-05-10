function createSkuMemoryRecord(product) {
  return {
    sku: product.sku,
    productName: product.name,
    tier: product.tier || "Unranked",
    status: product.status || "active",
    profitMetrics: product.profitMetrics || {},
    awarenessMetrics: product.awarenessMetrics || {},
    creativePerformance: product.creativePerformance || {},
    discountLogic: product.discountLogic || {},
    tierTracking: product.tierTracking || {},
    productMatching: product.productMatching || {},
    evicsRendering: product.evicsRendering || {},
    notes: product.notes || ""
  };
}

function updateSkuMemoryRecord(record, updates) {
  return {
    ...record,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

module.exports = {
  createSkuMemoryRecord,
  updateSkuMemoryRecord
};