const viralConfig = {
  platforms: [
    "TikTok",
    "Instagram Reels",
    "Facebook Ads Library",
    "YouTube Shorts",
    "Pinterest",
    "X/Twitter",
    "Reddit",
    "Amazon Trends",
    "Shopify Trends"
  ],

  categories: [
    "Supplements",
    "Sea Moss",
    "Testosterone Support",
    "Weight Loss",
    "Nootropics",
    "Beauty",
    "Fitness",
    "Luxury Wellness",
    "Sports Nutrition",
    "Sleep Support",
    "Gut Health",
    "Immune Support"
  ],

  thresholds: {
    minimumViews: 100000,
    minimumLikes: 5000,
    minimumShares: 500,
    minimumComments: 250,
    engagementRate: 0.05,
    velocityGrowth: 0.15
  },

  scoringWeights: {
    views: 25,
    likes: 15,
    shares: 20,
    comments: 10,
    velocity: 20,
    conversionPotential: 10
  },

  extractFields: [
    "hook",
    "caption",
    "cta",
    "videoPacing",
    "sceneTiming",
    "emotionalTrigger",
    "productPositioning",
    "cameraMovement",
    "hashtags",
    "musicTrend"
  ],

  brandFocus: {
    brandName: "I AM GENESIS TECH",
    niche: "premium supplements, wellness, fitness, beauty, and health optimization",
    tone: "elite, futuristic, clinical-luxury, transformational, high-converting",
    audience: "health-conscious shoppers, athletes, wellness buyers, beauty buyers, men and women seeking transformation"
  }
};

module.exports = viralConfig;