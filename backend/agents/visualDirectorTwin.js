// backend/agents/visualDirectorTwin.js
// Visual Director Twin Agent — directs visual style based on trend + product,
// suggests camera angles, pacing, effects, and recommends platform + format.

'use strict';

const SupabaseConnector = require('../../utils/SupabaseConnector');
const { selectBestPlatforms } = require('../../utils/platformSelectionEngine');
const { generateCreativeDirection, approveCreativeDirection } = require('../../utils/creativeDirectorEngine');

// ---------------------------------------------------------------------------
// Visual style libraries
// ---------------------------------------------------------------------------

const VISUAL_STYLES = {
  UGC: {
    cameraAngles: ['Handheld POV', 'Bathroom mirror selfie', 'Kitchen counter shot', 'Desk POV', 'Gym floor angle'],
    lighting: ['Natural window light', 'Ring light soft glow', 'Morning golden hour'],
    pacing: 'Fast cuts — 0.5s hook, 1-2s scenes, 3s product reveal',
    effects: ['Subtitles', 'Jump cuts', 'Zoom punch', 'Text overlays'],
    colorGrade: 'Warm, authentic, slightly desaturated',
    musicStyle: 'Trending audio, upbeat, relatable',
    openingSeconds: '0-2s: Pattern interrupt. No logo. Pure hook.',
  },
  Commercial: {
    cameraAngles: ['Cinematic wide', 'Product hero close-up', 'Slow-motion pour', 'Tracking shot', 'Overhead flatlay'],
    lighting: ['Studio three-point', 'Dramatic side light', 'Backlit product glow'],
    pacing: 'Moderate — 2s hook, 3-4s scenes, 5s product hero',
    effects: ['Motion graphics', 'Brand color overlays', 'Ingredient callouts', 'Logo reveal'],
    colorGrade: 'High contrast, brand-consistent, premium',
    musicStyle: 'Original score or licensed premium track',
    openingSeconds: '0-2s: Brand statement or bold visual hook.',
  },
  Luxury: {
    cameraAngles: ['Slow pan', 'Macro product detail', 'Lifestyle wide shot', 'Hands-on ritual shot'],
    lighting: ['Soft diffused', 'Candlelight warmth', 'Marble surface reflection'],
    pacing: 'Slow and deliberate — 3s hook, 5s scenes, 8s product reveal',
    effects: ['Slow motion', 'Subtle grain', 'Minimal text', 'Fade transitions'],
    colorGrade: 'Muted luxury palette — cream, gold, deep green',
    musicStyle: 'Ambient, minimal, aspirational',
    openingSeconds: '0-3s: Aspirational visual. No rush. Let it breathe.',
  },
  Educational: {
    cameraAngles: ['Talking head', 'Screen recording', 'Whiteboard', 'Split screen', 'B-roll cutaway'],
    lighting: ['Clean studio', 'Natural office light', 'Soft box'],
    pacing: 'Informational — 3s hook, 5-8s explanation scenes, 5s CTA',
    effects: ['Lower thirds', 'Data visualizations', 'Highlight callouts', 'Chapter markers'],
    colorGrade: 'Clean, neutral, trustworthy',
    musicStyle: 'Subtle background, non-distracting',
    openingSeconds: '0-3s: Bold claim or question. Establish authority.',
  },
};

const PLATFORM_SPECS = {
  TikTok: {
    aspectRatio: '9:16',
    resolution: '1080x1920',
    maxDuration: '60s',
    optimalDuration: '15-30s',
    captionStyle: 'Bold subtitles, high contrast',
    hookWindow: '0-1.5s',
    bestFormats: ['UGC', 'Commercial'],
  },
  Instagram: {
    aspectRatio: '9:16',
    resolution: '1080x1920',
    maxDuration: '90s',
    optimalDuration: '15-30s',
    captionStyle: 'Elegant subtitles or no captions',
    hookWindow: '0-2s',
    bestFormats: ['Luxury', 'Commercial', 'UGC'],
  },
  YouTube: {
    aspectRatio: '16:9',
    resolution: '1920x1080',
    maxDuration: '600s',
    optimalDuration: '45-90s',
    captionStyle: 'Auto-captions + chapter markers',
    hookWindow: '0-3s',
    bestFormats: ['Educational', 'Commercial'],
  },
  Pinterest: {
    aspectRatio: '2:3',
    resolution: '1000x1500',
    maxDuration: '60s',
    optimalDuration: '6-15s',
    captionStyle: 'Minimal text overlay',
    hookWindow: '0-2s',
    bestFormats: ['Luxury', 'Commercial'],
  },
  Facebook: {
    aspectRatio: '1:1',
    resolution: '1080x1080',
    maxDuration: '240s',
    optimalDuration: '15-30s',
    captionStyle: 'Captions required (85% watch muted)',
    hookWindow: '0-3s',
    bestFormats: ['Commercial', 'Educational'],
  },
};

const EMOTION_TO_VISUAL = {
  curiosity: { colorTemp: 'Cool-neutral', energy: 'Building', transitionStyle: 'Quick cuts with pause' },
  transformation: { colorTemp: 'Warm progression', energy: 'Rising', transitionStyle: 'Before/after wipe' },
  urgency: { colorTemp: 'High contrast', energy: 'Fast', transitionStyle: 'Jump cuts' },
  aspiration: { colorTemp: 'Warm golden', energy: 'Elevated', transitionStyle: 'Smooth dissolve' },
  proof: { colorTemp: 'Clean neutral', energy: 'Steady', transitionStyle: 'Direct cut' },
  authority: { colorTemp: 'Cool professional', energy: 'Confident', transitionStyle: 'Deliberate cuts' },
  luxury: { colorTemp: 'Muted warm', energy: 'Slow', transitionStyle: 'Fade and dissolve' },
  identity: { colorTemp: 'Rich saturated', energy: 'Confident', transitionStyle: 'Stylized cuts' },
};

// ---------------------------------------------------------------------------
// Direction logic
// ---------------------------------------------------------------------------

/**
 * Selects the best visual style for a given format and emotion.
 */
function _selectVisualStyle(format, emotion) {
  const style = VISUAL_STYLES[format] || VISUAL_STYLES.UGC;
  const emotionVisual = EMOTION_TO_VISUAL[emotion] || EMOTION_TO_VISUAL.curiosity;

  return {
    ...style,
    emotionMapping: emotionVisual,
    recommendedCameraAngle: style.cameraAngles[Math.floor(Math.random() * style.cameraAngles.length)],
    recommendedLighting: style.lighting[Math.floor(Math.random() * style.lighting.length)],
  };
}

/**
 * Selects the best platforms for a given ad profile.
 */
function _selectPlatforms(format, emotion, visualQuality = 85, conversionIntent = 80) {
  const adProfile = { format, visualQuality, conversionIntent };
  const basePlatforms = selectBestPlatforms(adProfile);

  // Add platform specs
  return basePlatforms.map((platform) => ({
    platform,
    specs: PLATFORM_SPECS[platform] || PLATFORM_SPECS.TikTok,
    priority: platform === 'TikTok' ? 1 : platform === 'Instagram' ? 2 : 3,
  })).sort((a, b) => a.priority - b.priority);
}

// ---------------------------------------------------------------------------
// Main direct function
// ---------------------------------------------------------------------------

/**
 * Directs visual style for a given trend + product combination.
 *
 * @param {object} options
 * @param {string}   options.product      - Product name
 * @param {string}   [options.hook]       - Hook text
 * @param {string}   [options.emotion]    - Primary emotion
 * @param {string}   [options.format]     - Video format (UGC, Commercial, Luxury, Educational)
 * @param {string}   [options.platform]   - Target platform
 * @param {string}   [options.angle]      - Positioning angle
 * @param {boolean}  [options.persist]    - Save to Supabase (default: true)
 * @returns {Promise<object>}
 */
async function direct(options = {}) {
  const {
    product = 'Sea Moss Mineral Gel',
    hook = 'Nobody talks about this morning habit…',
    emotion = 'curiosity',
    format = 'UGC',
    platform = 'TikTok',
    angle = 'daily mineral ritual',
    persist = true,
  } = options;

  // Generate creative direction using existing engine
  const creativeDirection = generateCreativeDirection({
    product,
    targetEmotion: emotion,
    format,
    visualTone: 'clinical luxury, high-tech wellness, premium transformation',
    cta: `Start your ${product} ritual today.`,
  });

  const approved = approveCreativeDirection(creativeDirection);

  // Select visual style
  const visualStyle = _selectVisualStyle(format, emotion);

  // Select platforms
  const recommendedPlatforms = _selectPlatforms(format, emotion);

  // Platform-specific specs
  const primaryPlatformSpecs = PLATFORM_SPECS[platform] || PLATFORM_SPECS.TikTok;

  // Build shot list
  const shotList = [
    {
      shot: 1,
      type: 'Hook Shot',
      description: `${visualStyle.recommendedCameraAngle} — ${hook}`,
      duration: primaryPlatformSpecs.hookWindow,
      lighting: visualStyle.recommendedLighting,
      notes: visualStyle.openingSeconds,
    },
    {
      shot: 2,
      type: 'Problem Scene',
      description: `Show the ${emotion} pain point. ${visualStyle.emotionMapping.energy} energy.`,
      duration: '2-3s',
      lighting: visualStyle.recommendedLighting,
      notes: `Color temp: ${visualStyle.emotionMapping.colorTemp}`,
    },
    {
      shot: 3,
      type: 'Product Hero',
      description: `${product} close-up. ${visualStyle.recommendedCameraAngle}. Angle: ${angle}.`,
      duration: '3-4s',
      lighting: 'Product hero lighting — clean and premium',
      notes: 'Show label clearly. Ingredient callout if Commercial.',
    },
    {
      shot: 4,
      type: 'Transformation',
      description: `Before/after or lifestyle result. ${visualStyle.emotionMapping.transitionStyle}.`,
      duration: '3-5s',
      lighting: visualStyle.recommendedLighting,
      notes: 'Real, authentic result. No over-production.',
    },
    {
      shot: 5,
      type: 'CTA',
      description: `Product in hand. Direct to camera. "Start your ${product} ritual today."`,
      duration: '2-3s',
      lighting: 'Match opening shot',
      notes: 'Link in bio / swipe up / shop now overlay.',
    },
  ];

  // Build render prompt for HeyGen/Runway/Kling
  const renderPrompt = {
    heygen: {
      avatarStyle: format === 'UGC' ? 'casual' : format === 'Luxury' ? 'elegant' : 'professional',
      voiceStyle: emotion === 'luxury' || emotion === 'aspiration' ? 'calm and confident' : 'energetic and authentic',
      background: format === 'Luxury' ? 'marble bathroom' : format === 'UGC' ? 'natural home setting' : 'studio',
      script: `${hook} [Product reveal: ${product}] [Angle: ${angle}] [CTA: Start your ritual today.]`,
    },
    runway: {
      promptText: `${format} style video. ${hook} ${product} ${angle}. ${visualStyle.emotionMapping.colorTemp} color grade. ${visualStyle.pacing}.`,
      model: 'gen3a_turbo',
      ratio: primaryPlatformSpecs.aspectRatio === '9:16' ? '768:1280' : '1280:768',
    },
    kling: {
      prompt: `${format} advertisement for ${product}. Hook: "${hook}". Emotion: ${emotion}. Style: ${visualStyle.colorGrade}. Platform: ${platform}.`,
      aspectRatio: primaryPlatformSpecs.aspectRatio,
    },
  };

  const direction = {
    agent: 'VisualDirectorTwin',
    status: approved ? 'approved' : 'needs-review',
    product,
    hook,
    emotion,
    format,
    primaryPlatform: platform,
    angle,
    creativeDirection,
    visualStyle: {
      format,
      cameraAngle: visualStyle.recommendedCameraAngle,
      lighting: visualStyle.recommendedLighting,
      pacing: visualStyle.pacing,
      effects: visualStyle.effects,
      colorGrade: visualStyle.colorGrade,
      musicStyle: visualStyle.musicStyle,
      openingRule: visualStyle.openingSeconds,
      emotionMapping: visualStyle.emotionMapping,
    },
    platformSpecs: primaryPlatformSpecs,
    recommendedPlatforms,
    shotList,
    renderPrompts: renderPrompt,
    productionNotes: [
      `Hook must land in ${primaryPlatformSpecs.hookWindow} — no exceptions.`,
      `Optimal duration: ${primaryPlatformSpecs.optimalDuration}.`,
      `Caption style: ${primaryPlatformSpecs.captionStyle}.`,
      `Color grade: ${visualStyle.colorGrade}.`,
      `Music: ${visualStyle.musicStyle}.`,
    ],
    timestamp: new Date().toISOString(),
  };

  // Persist to Supabase
  if (persist) {
    try {
      await SupabaseConnector.from('evics_renders').insert([{
        platform,
        status: 'direction_ready',
        script: `${hook}\n\n${shotList.map((s) => `[${s.type}] ${s.description}`).join('\n')}`,
        parameters: JSON.stringify({
          format,
          emotion,
          angle,
          visualStyle: direction.visualStyle,
          renderPrompts: renderPrompt,
        }),
        source: 'visual_director_twin',
        created_at: new Date().toISOString(),
      }]);
    } catch (e) {
      console.warn('[VisualDirectorTwin] Supabase persist failed:', e.message);
    }
  }

  return direction;
}

module.exports = {
  direct,
  VISUAL_STYLES,
  PLATFORM_SPECS,
  EMOTION_TO_VISUAL,
};
