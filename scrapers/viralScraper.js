require('dotenv').config();

const {
  calculateViralScore,
  classifyViralAd,
  extractWinningStructure,
  determineViralAction
} = require('../utils/viralIntelligenceEngine');

const {
  saveViralIntelligence
} = require('../utils/viralIntelligenceDatabaseEngine');

async function testViralIntelligence() {
  console.log('EVICS Viral Intelligence Agent Initialized...');

  const viralAd = {
    sourcePlatform: 'TikTok',
    sourceUrl: 'https://example.com/viral-sea-moss-ad',
    category: 'Sea Moss Wellness',
    views: 1800000,
    shares: 22000,
    comments: 7800,
    velocity: 14,
    hookStrength: 92,
    productFit: 96,
    conversionSignal: 88,
    hook: 'Nobody talks about this morning wellness routine...',
    problem: 'Low energy and poor daily vitality',
    agitation: 'People are tired of feeling drained before noon',
    solution: 'Sea Moss Complex daily routine',
    proof: 'Visible lifestyle transformation and testimonial',
    cta: 'Start your Genesis morning routine today',
    visualPattern: 'UGC bathroom mirror + kitchen supplement routine',
    pacing: 'Fast hook, quick proof, emotional close',
    emotionalTrigger: 'daily vitality and confidence'
  };

  const viralScore = calculateViralScore(viralAd);
  const category = classifyViralAd(viralAd);
  const structure = extractWinningStructure(viralAd);
  const action = determineViralAction(viralScore);

  const saved = await saveViralIntelligence({
    source_platform: viralAd.sourcePlatform,
    source_url: viralAd.sourceUrl,
    category,
    viral_score: viralScore,
    action,
    hook: viralAd.hook,
    visual_pattern: viralAd.visualPattern,
    pacing: viralAd.pacing,
    emotional_trigger: viralAd.emotionalTrigger,
    product_fit: viralAd.productFit,
    conversion_signal: viralAd.conversionSignal,
    winning_structure: structure
  });

  console.log('Viral Score:', viralScore);
  console.log('Category:', category);
  console.log('Winning Structure:', structure);
  console.log('Recommended Action:', action);
  console.log('Database Save:', saved);
  console.log('EVICS VIRAL INTELLIGENCE AGENT OPERATIONAL');
}

testViralIntelligence();