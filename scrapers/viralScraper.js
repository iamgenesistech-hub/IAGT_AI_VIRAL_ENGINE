require('dotenv').config();

const {
  matchProductsToAd,
  selectTopProductsForRendering
} = require('../utils/productMatchingEngine');

function testSystem() {
  console.log("EVICS Product Matching Engine Initialized...");

  const adProfile = {
    collection: "Wellness",
    category: "Sea Moss",
    goals: ["Energy", "Immune Support"],
    emotionalTriggers: ["confidence", "daily vitality"]
  };

  const products = [
    {
      sku: "ROC_SEAMOSS",
      name: "Sea Moss Complex",
      collections: ["Wellness"],
      categories: ["Sea Moss"],
      goals: ["Energy", "Immune Support"],
      benefits: ["daily vitality"],
      isBundle: false
    },
    {
      sku: "ROC_BEAUTY",
      name: "Beauty Glow Formula",
      collections: ["Beauty"],
      categories: ["Skin"],
      goals: ["Glow"],
      benefits: ["confidence"],
      isBundle: false
    },
    {
      sku: "ROC_BUNDLE",
      name: "Wellness Energy Bundle",
      collections: ["Wellness"],
      categories: ["Bundles"],
      goals: ["Energy"],
      benefits: ["daily vitality"],
      isBundle: true
    }
  ];

  const matches = matchProductsToAd(adProfile, products);
  const selected = selectTopProductsForRendering(matches, 3);

  console.log("Product Matches:", matches);
  console.log("Selected Products:", selected);
  console.log("Product Matching Engine Operational");
}

testSystem();