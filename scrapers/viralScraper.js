require('dotenv').config();

const {
  calculateRenderGrade,
  determineRenderStatus,
  shouldEnterEliteVault
} = require('../utils/renderGradingEngine');

function testSystem() {
  console.log("EVICS Render Grading Engine Initialized...");

  const renderScores = {
    viralPotential: 96,
    conversionPotential: 94,
    brandAlignment: 98,
    productFit: 97,
    visualQuality: 93,
    hookStrength: 95,
    emotionalImpact: 94
  };

  const finalGrade = calculateRenderGrade(renderScores);
  const renderStatus = determineRenderStatus(finalGrade);
  const eliteVaultDecision = shouldEnterEliteVault(finalGrade, 12);

  console.log("Final Render Grade:", finalGrade);
  console.log("Render Status:", renderStatus);
  console.log("Elite Vault Approved:", eliteVaultDecision);
  console.log("Render Grading Engine Operational");
}

testSystem();