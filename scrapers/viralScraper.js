require('dotenv').config();

const {
  extractCreativeDeltas,
  rewriteDeltasForBrand
} = require('../utils/creativeDeltaExtractor');

function testSystem() {
  console.log("EVICS Creative Delta Extractor Initialized...");

  const viralAd = {
    hook: "Fast curiosity hook",
    pacing: "Quick cuts every 1.5 seconds",
    proof: "Visible transformation/proof moment",
    cta: "Simple direct action CTA",
    visualStyle: "Bright product-forward lifestyle scene",
    emotionalTrigger: "confidence"
  };

  const deltas = extractCreativeDeltas(viralAd);
  const rewritten = rewriteDeltasForBrand(
    deltas,
    "Elite clinical-luxury transformation voice"
  );

  console.log("Extracted Deltas:", deltas);
  console.log("Brand Rewritten Deltas:", rewritten);
  console.log("Creative Delta Extractor Operational");
}

testSystem();