require('dotenv').config();

const {
  calculateAwarenessScore,
  calculateMomentumScore,
  momentumDecision
} = require('../utils/awarenessMomentumEngine');

function testSystem() {
  console.log("EVICS Awareness Momentum Engine Initialized...");

  const awarenessScore = calculateAwarenessScore({
    brandedSearchGrowth: 80,
    repeatVisitorLift: 75,
    repeatBuyerLift: 70,
    crossSkuLift: 65
  });

  const momentumScore = calculateMomentumScore({
    salesAcceleration: 85,
    cacDecrease: 70,
    cvrIncrease: 78,
    discountDepthDecrease: 65,
    awarenessGrowth: 80
  });

  const decision = momentumDecision(momentumScore, 1200);

  console.log("Awareness Score:", awarenessScore);
  console.log("Momentum Score:", momentumScore);
  console.log("Momentum Decision:", decision);
  console.log("Awareness Momentum Engine Operational");
}

testSystem();