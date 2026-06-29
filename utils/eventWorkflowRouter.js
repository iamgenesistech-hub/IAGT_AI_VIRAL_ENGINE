function routeEVICSEvent(event) {

  const routes = {
    viralDetected: "viralDeconstructionEngine",
    renderApproved: "libraryStewardEngine",
    productMatched: "productMatchingEngine",
    momentumSpike: "capitalAllocatorEngine",
    tierUpgrade: "productTierEngine"
  };

  return routes[event] || "manualReview";
}

module.exports = {
  routeEVICSEvent
};