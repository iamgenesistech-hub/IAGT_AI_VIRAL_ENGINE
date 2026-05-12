require('dotenv').config();

const {
  calculateAuthenticityScore,
  determineAuthenticityStatus,
  detectCommonAIMistakes,
  finalDeploymentGate
} = require('../utils/humanAuthenticityEngine');

const {
  saveAuthenticityReview
} = require('../utils/authenticityDatabaseEngine');

async function testHAVE() {
  console.log("HAVE Authenticity Verification Engine Initialized...");

  const authenticityScore = calculateAuthenticityScore({
    facialAuthenticity: 99,
    handAccuracy: 98,
    eyeRealism: 99,
    motionPhysics: 99,
    lightingRealism: 100,
    textureRealism: 99,
    behavioralRealism: 99,
    environmentRealism: 100,
    audioSync: 99,
    textPrintRealism: 100
  });

  const issues = detectCommonAIMistakes({
    deadEyes: false,
    badHands: false,
    waxSkin: false,
    motionDrift: false,
    lipSyncIssue: false,
    badText: false,
    shadowMismatch: false,
    tooPerfect: false
  });

  const status = determineAuthenticityStatus(authenticityScore);

  const gate = finalDeploymentGate(
    authenticityScore,
    94,
    true
  );

  const saved = await saveAuthenticityReview({
    render_name: "Sea Moss Human Authenticity Render",
    sku: "ROC_SEAMOSS",
    authenticity_score: authenticityScore,
    render_grade: 94,
    status,
    issues,
    final_gate_passed: gate.passed,
    notes: gate.reason
  });

  console.log("Authenticity Score:", authenticityScore);
  console.log("Authenticity Status:", status);
  console.log("AI Mistakes Detected:", issues);
  console.log("Final Deployment Gate:", gate);
  console.log("Database Save:", saved);
  console.log("HAVE AUTHENTICITY LAYER OPERATIONAL");
}

testHAVE();