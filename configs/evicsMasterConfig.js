const EVICS_MASTER_CONFIG = {

  VIRAL_THRESHOLDS: {
    minimumViews: 100000,
    minimumConversions: 50,
    minimumEngagementRate: 5
  },

  VIDEO_RULES: {
    minimumLengthSeconds: 15,
    maximumLengthSeconds: 60,
    preferredFormats: [
      "UGC",
      "Story",
      "Problem Solution",
      "Transformation",
      "Gym Lifestyle"
    ]
  },

  PLATFORM_RULES: {
    enabledPlatforms: [
      "TikTok",
      "Instagram",
      "YouTube",
      "Facebook",
      "Pinterest"
    ],

    scrapeAllPlatforms: true
  },

  RENDER_SETTINGS: {

    renderCountPerConcept: 3,

    demographicModes: {
      africanAmerican: true,
      internationalPOC: true,
      caucasian: true
    },

    strictPeopleOfColorMode: false
  },

  PRODUCT_MATCHING: {
    autoSelectBestProducts: true,
    maximumProductsPerAd: 5,
    allowCollectionSelection: true,
    allowGoalSelection: true
  },

  ELITE_VAULT: {
    minimumRenderGrade: 92,
    topPercentThreshold: 15
  },

  CAPITAL_ALLOCATION: {
    top30BudgetAllocation: 0.80,
    promotionPoolAllocation: 0.20
  }
};

module.exports = EVICS_MASTER_CONFIG;