function extractCreativeDeltas(ad) {
  return {
    hookDelta: ad.hook || "",
    pacingDelta: ad.pacing || "",
    proofDelta: ad.proof || "",
    ctaDelta: ad.cta || "",
    visualDelta: ad.visualStyle || "",
    emotionalDelta: ad.emotionalTrigger || ""
  };
}

function rewriteDeltasForBrand(deltas, brandVoice) {
  return {
    hook: `${brandVoice}: ${deltas.hookDelta}`,
    pacing: deltas.pacingDelta,
    proof: `Rewritten proof angle for I AM GENESIS TECH: ${deltas.proofDelta}`,
    cta: `Brand CTA: ${deltas.ctaDelta}`,
    visualStyle: deltas.visualDelta,
    emotionalTrigger: deltas.emotionalDelta
  };
}

module.exports = {
  extractCreativeDeltas,
  rewriteDeltasForBrand
};