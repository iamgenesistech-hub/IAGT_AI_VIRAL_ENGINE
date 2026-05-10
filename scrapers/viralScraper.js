require('dotenv').config();

const {
  enforceTopCreativeCap,
  selectEliteTop20,
  shouldMoveToBestOfBest
} = require('../utils/libraryStewardEngine');

function testSystem() {

  console.log("EVICS Library Steward Initialized...");

  const creatives = [
    { name: "Ad 1", performanceScore: 95 },
    { name: "Ad 2", performanceScore: 89 },
    { name: "Ad 3", performanceScore: 92 },
    { name: "Ad 4", performanceScore: 70 },
    { name: "Ad 5", performanceScore: 85 },
    { name: "Ad 6", performanceScore: 60 },
    { name: "Ad 7", performanceScore: 98 }
  ];

  const library = enforceTopCreativeCap(creatives, 5);

  const eliteTop20 = selectEliteTop20(creatives);

  const bestOfBest = shouldMoveToBestOfBest(95, 1750);

  console.log(
    "Active Creatives:",
    library.activeCreatives.map(c => c.name)
  );

  console.log(
    "Fallout Creatives:",
    library.falloutCreatives.map(c => c.name)
  );

  console.log("Elite Top Count:", eliteTop20.length);

  console.log("Move To Best Of Best:", bestOfBest);

  console.log("Library Steward Engine Operational");

}

testSystem();
