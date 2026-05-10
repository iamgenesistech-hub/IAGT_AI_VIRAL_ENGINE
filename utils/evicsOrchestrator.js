const {
  makeEVICSDecision
} = require('./evicsDecisionEngine');

function orchestrateEVICS(payload) {

  const decision = makeEVICSDecision(payload);

  return {
    status: "Operational",
    decision,
    payloadProcessed: true,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  orchestrateEVICS
};