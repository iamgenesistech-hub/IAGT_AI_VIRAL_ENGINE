function calculateAuthenticityScore(scores) {
  const {
    facialAuthenticity = 0,
    handAccuracy = 0,
    eyeRealism = 0,
    motionPhysics = 0,
    lightingRealism = 0,
    textureRealism = 0,
    behavioralRealism = 0,
    environmentRealism = 0,
    audioSync = 0,
    textPrintRealism = 0
  } = scores;

  const finalScore =
    facialAuthenticity * 0.18 +
    motionPhysics * 0.18 +
    eyeRealism * 0.14 +
    handAccuracy * 0.14 +
    lightingRealism * 0.10 +
    textureRealism * 0.10 +
    behavioralRealism * 0.06 +
    environmentRealism * 0.05 +
    audioSync * 0.03 +
    textPrintRealism * 0.02;

  return Math.round(finalScore * 100) / 100;
}

function determineAuthenticityStatus(score) {
  if (score >= 99) return "Approved for Deployment";
  if (score >= 95) return "Rerender Required";
  return "Rejected - AI Render Risk";
}

function detectCommonAIMistakes(flags) {
  const issues = [];

  if (flags.deadEyes) issues.push("Dead or unfocused eyes");
  if (flags.badHands) issues.push("Hand/finger artifact detected");
  if (flags.waxSkin) issues.push("Over-smoothed wax skin");
  if (flags.motionDrift) issues.push("Unnatural motion drift");
  if (flags.lipSyncIssue) issues.push("Lip-sync mismatch");
  if (flags.badText) issues.push("AI text/print distortion");
  if (flags.shadowMismatch) issues.push("Lighting/shadow inconsistency");
  if (flags.tooPerfect) issues.push("Sterile over-perfect AI look");

  return issues;
}

function finalDeploymentGate(authenticityScore, renderGrade, complianceSafe) {
  const passed =
    authenticityScore >= 99 &&
    renderGrade >= 85 &&
    complianceSafe === true;

  return {
    passed,
    status: passed ? "FINAL APPROVAL GRANTED" : "BLOCKED BEFORE MARKETING",
    reason: passed
      ? "Render meets authenticity, quality, and compliance requirements."
      : "Render failed final authenticity/security gate."
  };
}

module.exports = {
  calculateAuthenticityScore,
  determineAuthenticityStatus,
  detectCommonAIMistakes,
  finalDeploymentGate
};