require('dotenv').config();

const {
  deconstructViralAd,
  calculateViralFormatScore
} = require('../utils/viralDeconstructionEngine');

function testSystem() {
  console.log("EVICS Viral Deconstruction Engine Initialized...");

  const ad = {
    whyItWorked: "It opened with a direct pain point, showed proof quickly, and closed with a simple CTA.",
    hookScore: 94,
    proofScore: 91,
    pacingScore: 88,
    ctaScore: 90,
    visualClarityScore: 92,
    emotionalTriggerScore: 95,
    backgroundPalette: ["soft gold", "cream"],
    foregroundPalette: ["black", "white"],
    accentColors: ["purple", "gold"],
    cameraStyle: "fast handheld UGC",
    sceneTiming: "hook in first 2 seconds",
    buyerIntent: "problem aware",
    objections: ["trust", "price", "will it work"],
    sophisticationLevel: "medium"
  };

  const report = deconstructViralAd(ad);
  const score = calculateViralFormatScore(report.componentScores);

  console.log("Deconstruction Report:", report);
  console.log("Viral Format Score:", score);
  console.log("Viral Deconstruction Engine Operational");
}

testSystem();