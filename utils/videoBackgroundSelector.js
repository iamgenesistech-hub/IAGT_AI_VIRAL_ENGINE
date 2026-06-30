/**
 * videoBackgroundSelector.js — EVICS Dynamic Video Background Engine
 *
 * Maps product category/type → HeyGen-compatible background config.
 * Backgrounds change per product to make each ad visually unique.
 *
 * Strategy hierarchy:
 *   1. Product image (bg-removed) used as background — avatar speaks in front of product
 *   2. Category lifestyle gradient/color fallback
 *   3. Lifestyle scene image URL per category
 */

'use strict';

// ── Category → Background Theme ──────────────────────────────────────────────
// Each entry has:
//   colorHex     – HeyGen solid color background (dark, premium feel)
//   gradient     – CSS gradient string for display (web/mobile UI preview)
//   sceneQuery   – keyword for lifestyle imagery
//   label        – human display label
//   mood         – used by script engine for tone matching

const CATEGORY_THEMES = {
  // Health & Wellness
  health: {
    colorHex: '#0b2012',
    gradient: 'linear-gradient(135deg, #0b2012 0%, #1a4a28 50%, #0f3018 100%)',
    sceneQuery: 'healthy lifestyle nature morning',
    label: 'Wellness',
    mood: 'energizing'
  },
  supplements: {
    colorHex: '#0d2318',
    gradient: 'linear-gradient(135deg, #0d2318 0%, #1e4a30 50%, #0a1f14 100%)',
    sceneQuery: 'nutrition supplements clean kitchen',
    label: 'Nutrition',
    mood: 'transformative'
  },
  vitamins: {
    colorHex: '#0d1f2a',
    gradient: 'linear-gradient(135deg, #0d1f2a 0%, #1a3d55 50%, #0a1825 100%)',
    sceneQuery: 'vitamins wellness morning light',
    label: 'Vitality',
    mood: 'uplifting'
  },

  // Fitness & Sports
  fitness: {
    colorHex: '#060b18',
    gradient: 'linear-gradient(135deg, #060b18 0%, #0f1e40 50%, #050a15 100%)',
    sceneQuery: 'gym fitness athletic dark',
    label: 'Athletic',
    mood: 'powerful'
  },
  sports: {
    colorHex: '#060c1a',
    gradient: 'linear-gradient(135deg, #060c1a 0%, #0e1e3e 50%, #040a16 100%)',
    sceneQuery: 'sports performance training',
    label: 'Performance',
    mood: 'intense'
  },

  // Beauty & Personal Care
  beauty: {
    colorHex: '#1a0814',
    gradient: 'linear-gradient(135deg, #1a0814 0%, #3d1230 50%, #150610 100%)',
    sceneQuery: 'beauty luxury cosmetics elegant',
    label: 'Beauty',
    mood: 'luxurious'
  },
  skincare: {
    colorHex: '#1a100e',
    gradient: 'linear-gradient(135deg, #1a100e 0%, #3d2218 50%, #140d0b 100%)',
    sceneQuery: 'skincare glow radiant skin',
    label: 'Radiance',
    mood: 'glowing'
  },
  haircare: {
    colorHex: '#180c18',
    gradient: 'linear-gradient(135deg, #180c18 0%, #361830 50%, #120910 100%)',
    sceneQuery: 'haircare salon luxury',
    label: 'Hair & Beauty',
    mood: 'luxurious'
  },

  // Food & Nutrition
  food: {
    colorHex: '#1a1004',
    gradient: 'linear-gradient(135deg, #1a1004 0%, #3d2808 50%, #14090200 100%)',
    sceneQuery: 'food culinary chef kitchen gourmet',
    label: 'Culinary',
    mood: 'indulgent'
  },

  // Technology
  tech: {
    colorHex: '#04060f',
    gradient: 'linear-gradient(135deg, #04060f 0%, #080f2a 50%, #020408 100%)',
    sceneQuery: 'technology futuristic digital',
    label: 'Tech',
    mood: 'cutting-edge'
  },
  electronics: {
    colorHex: '#030710',
    gradient: 'linear-gradient(135deg, #030710 0%, #070f28 50%, #020509 100%)',
    sceneQuery: 'electronics innovation modern',
    label: 'Innovation',
    mood: 'cutting-edge'
  },

  // Lifestyle & Home
  lifestyle: {
    colorHex: '#130e06',
    gradient: 'linear-gradient(135deg, #130e06 0%, #2d200e 50%, #0e0904 100%)',
    sceneQuery: 'lifestyle luxury home elegant',
    label: 'Lifestyle',
    mood: 'aspirational'
  },
  home: {
    colorHex: '#0e0c08',
    gradient: 'linear-gradient(135deg, #0e0c08 0%, #261e12 50%, #090705 100%)',
    sceneQuery: 'home decor cozy interior',
    label: 'Home & Living',
    mood: 'comforting'
  },

  // Spiritual & Mindfulness (key IAGT vertical)
  spiritual: {
    colorHex: '#0d0a1f',
    gradient: 'linear-gradient(135deg, #0d0a1f 0%, #1e1445 50%, #08061a 100%)',
    sceneQuery: 'spiritual meditation cosmos divine',
    label: 'Spiritual',
    mood: 'awakening'
  },
  meditation: {
    colorHex: '#0a0a1f',
    gradient: 'linear-gradient(135deg, #0a0a1f 0%, #161440 50%, #060616 100%)',
    sceneQuery: 'meditation peace mindfulness',
    label: 'Mindfulness',
    mood: 'serene'
  },

  // Education & Personal Development (key IAGT vertical)
  education: {
    colorHex: '#080c1f',
    gradient: 'linear-gradient(135deg, #080c1f 0%, #0f1840 50%, #060910 100%)',
    sceneQuery: 'education learning knowledge books',
    label: 'Knowledge',
    mood: 'empowering'
  },
  'personal-development': {
    colorHex: '#080f1a',
    gradient: 'linear-gradient(135deg, #080f1a 0%, #101e38 50%, #050c14 100%)',
    sceneQuery: 'personal development success mindset',
    label: 'Growth',
    mood: 'empowering'
  },

  // Finance & Business
  finance: {
    colorHex: '#080a06',
    gradient: 'linear-gradient(135deg, #080a06 0%, #1a1c10 50%, #050703 100%)',
    sceneQuery: 'finance wealth bitcoin success',
    label: 'Wealth',
    mood: 'prosperity'
  },

  // Default fallback
  default: {
    colorHex: '#050a14',
    gradient: 'linear-gradient(135deg, #050a14 0%, #0a1428 50%, #030710 100%)',
    sceneQuery: 'luxury premium lifestyle',
    label: 'Elite',
    mood: 'premium'
  }
};

// ── Dynamic Random Background Engine ─────────────────────────────────────────
// Every render gets a UNIQUE background. Unsplash source URLs return a different
// random high-quality photo on each request for the given search terms.
// Format: https://source.unsplash.com/1920x1080/?query1,query2
// Adding a cache-buster (&sig=timestamp) guarantees uniqueness even if CDN caches.

// Scene keywords per category — multiple variations for maximum diversity
const SCENE_QUERIES = {
  health: [
    'nature,morning,sunlight,wellness',
    'tropical,beach,sunrise,calm',
    'mountain,meadow,fresh,green',
    'zen,garden,peaceful,outdoor',
    'lake,forest,serene,morning',
    'yoga,outdoor,sunrise,park'
  ],
  supplements: [
    'modern,kitchen,clean,bright',
    'marble,countertop,minimalist,luxury',
    'natural,wood,rustic,organic',
    'bright,studio,white,clean',
    'cafe,modern,warm,interior',
    'farmhouse,kitchen,natural,light'
  ],
  fitness: [
    'outdoor,track,stadium,sunrise',
    'rooftop,city,workout,urban',
    'beach,fitness,ocean,morning',
    'mountain,trail,running,scenic',
    'park,exercise,trees,daylight',
    'boxing,ring,industrial,dramatic'
  ],
  beauty: [
    'pink,marble,luxury,vanity',
    'salon,modern,elegant,mirror',
    'flowers,soft,pastel,feminine',
    'bathroom,spa,luxury,clean',
    'boutique,glamour,gold,interior',
    'rose,garden,soft,light'
  ],
  skincare: [
    'spa,luxury,towels,zen',
    'bathroom,marble,minimalist,clean',
    'tropical,leaves,natural,fresh',
    'water,droplets,clean,blue',
    'bamboo,zen,stone,peaceful',
    'cotton,white,soft,clean'
  ],
  food: [
    'kitchen,chef,modern,bright',
    'farm,table,organic,rustic',
    'restaurant,elegant,food,plating',
    'garden,herbs,fresh,outdoor',
    'market,colorful,fresh,produce',
    'picnic,outdoor,summer,natural'
  ],
  tech: [
    'office,modern,desk,minimal',
    'neon,city,night,futuristic',
    'startup,workspace,bright,clean',
    'server,room,blue,technology',
    'coworking,space,modern,design',
    'digital,abstract,dark,sleek'
  ],
  lifestyle: [
    'urban,fashion,street,city',
    'cafe,cozy,morning,lifestyle',
    'apartment,modern,stylish,interior',
    'shopping,district,luxury,urban',
    'rooftop,bar,sunset,city',
    'beach,resort,luxury,tropical'
  ],
  spiritual: [
    'temple,sunrise,peaceful,golden',
    'candles,meditation,dark,warm',
    'forest,light,rays,mystical',
    'ocean,sunset,calm,spiritual',
    'incense,zen,room,quiet',
    'stars,night,sky,cosmic'
  ],
  finance: [
    'office,skyline,modern,glass',
    'trading,floor,screens,professional',
    'luxury,car,lifestyle,wealth',
    'penthouse,city,view,night',
    'gold,bars,vault,wealth',
    'yacht,ocean,luxury,lifestyle'
  ],
  education: [
    'library,books,study,warm',
    'classroom,modern,bright,learning',
    'university,campus,outdoor,green',
    'desk,study,lamp,cozy',
    'bookshelf,home,reading,warm',
    'lecture,hall,professional,clean'
  ],
  default: [
    'studio,professional,modern,clean',
    'office,minimalist,bright,white',
    'urban,city,modern,background',
    'luxury,interior,elegant,room',
    'nature,outdoor,professional,light',
    'abstract,gradient,dark,premium'
  ]
};

/**
 * Get a random unique background URL for a category.
 * Uses Unsplash source with random query variation + cache-buster = unique every time.
 * @param {string} category
 * @returns {{ url: string, query: string, scene: string }}
 */
function getRandomBackground(category = 'default') {
  const queries = SCENE_QUERIES[category] || SCENE_QUERIES.default;
  // Pick a random query from the category's options
  const query = queries[Math.floor(Math.random() * queries.length)];
  // Cache-buster ensures we never get the same cached image
  const sig = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const url = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(query)}&sig=${sig}`;
  return { url, query, scene: query.split(',')[0] };
}

/**
 * Resolve a source.unsplash.com redirect URL to the final direct image URL.
 * HeyGen requires direct image URLs (won't follow 302 redirects).
 * @param {string} sourceUrl — the source.unsplash.com URL
 * @returns {Promise<string>} — resolved direct image URL
 */
async function resolveBackgroundUrl(sourceUrl) {
  if (!sourceUrl || !sourceUrl.includes('source.unsplash.com')) {
    return sourceUrl; // Already a direct URL
  }
  try {
    const https = require('https');
    const http = require('http');
    const resolved = await new Promise((resolve, reject) => {
      const doRequest = (url, redirects = 0) => {
        if (redirects > 5) return resolve(url); // Max redirects, use what we have
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { timeout: 8000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doRequest(res.headers.location, redirects + 1);
          } else {
            resolve(url); // Final destination
          }
          res.resume(); // Consume response data to free memory
        });
        req.on('error', () => resolve(url));
        req.on('timeout', () => { req.destroy(); resolve(url); });
      };
      doRequest(sourceUrl);
    });
    return resolved;
  } catch {
    return sourceUrl; // Fallback to unresolved URL
  }
}

/**
 * Get multiple background options for preview (user picks a vibe/scene type).
 * Each option generates a UNIQUE image on click/render — never the same twice.
 * @param {object} product — product data
 * @returns {Array} scene options user can choose from (each renders unique)
 */
function getBackgroundOptions(product = {}) {
  const category = detectCategory(product);
  const queries = SCENE_QUERIES[category] || SCENE_QUERIES.default;
  const defaultQueries = SCENE_QUERIES.default;
  const allQueries = [...new Set([...queries, ...defaultQueries])];

  return allQueries.map((query, i) => {
    const keywords = query.split(',');
    const label = keywords.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' + ');
    const sig = `${Date.now()}-${i}`;
    return {
      id: `${category}-scene-${i}`,
      label,
      category,
      scene: keywords[0],
      query,
      // Preview URL (shows one random example of this scene type)
      preview: `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}&sig=${sig}`,
      // Actual render URL will be generated fresh at render time (unique every render)
      note: 'Each render produces a unique image from this scene type'
    };
  });
}

// Legacy static fallbacks (used only if Unsplash source is unreachable)
const LIFESTYLE_IMAGES = {
  health:      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=90&fit=crop',
  supplements: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&q=90&fit=crop',
  fitness:     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=90&fit=crop',
  beauty:      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=90&fit=crop',
  skincare:    'https://images.unsplash.com/photo-1556228852-6d35a585d566?w=1920&q=90&fit=crop',
  food:        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=90&fit=crop',
  tech:        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=90&fit=crop',
  lifestyle:   'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=90&fit=crop',
  spiritual:   'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1920&q=90&fit=crop',
  finance:     'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=90&fit=crop',
  education:   'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=90&fit=crop',
  default:     'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=90&fit=crop'
};

// Keep BACKGROUND_OPTIONS for the re-render endpoint (backwards compatible)
const BACKGROUND_OPTIONS = SCENE_QUERIES;

// ── Category detection ────────────────────────────────────────────────────────

/**
 * Detect category key from product data.
 * @param {object} product
 * @returns {string} category key
 */
function detectCategory(product = {}) {
  const raw = [
    product.product_type,
    product.category,
    product.categoryLabel,
    product.tags ? (Array.isArray(product.tags) ? product.tags.join(' ') : product.tags) : '',
    product.title,
    product.description
  ].filter(Boolean).join(' ').toLowerCase();

  const checks = [
    ['spiritual', /spirit|soul|divine|god|faith|prayer|meditat|chakra|awakening|sacred/],
    ['meditation', /meditat|mindful|zen|peace|breath|calm/],
    ['personal-development', /mindset|develop|success|confident|growth|self.improve|transform/],
    ['education', /educat|learn|course|train|certif|study|knowledge|class/],
    ['finance', /bitcoin|btc|crypto|wealth|invest|money|financ|income|earn/],
    ['supplements', /supplement|protein|collagen|omega|probiotic|vitamin|nutrient|powder|sea.?moss|superfood|greens|capsule|tincture|extract|blend/],
    ['vitamins', /vitamin|mineral|zinc|magnes|iron|b12|d3/],
    ['skincare', /skin|moistur|serum|cleanser|toner|glow|radiant|acne|retinol|spf/],
    ['haircare', /hair|shampoo|conditioner|scalp|follicle/],
    ['beauty', /beauty|cosmetic|makeup|lipstick|mascara|foundation|blush|fragrance/],
    ['health', /health|wellness|immune|detox|energy|weight|fat.burn|slim|gel|herbal|organic|cleanse|boost/],
    ['fitness', /fitness|gym|workout|muscle|strength|cardio|exercise|athletic/],
    ['sports', /sport|performance|endurance|recovery|athlete/],
    ['food', /food|snack|organic|natural|diet|meal|nutrition|keto|vegan/],
    ['tech', /tech|gadget|device|app|digital|software|smart|electronic|phone|computer/],
    ['electronics', /electron|headphone|speaker|camera|screen|monitor|cable/],
    ['home', /home|decor|candle|diffuser|pillow|blanket|kitchen|bath|bedroom/],
    ['lifestyle', /lifestyle|fashion|apparel|clothe|wear|accessories|jewel/]
  ];

  for (const [cat, regex] of checks) {
    if (regex.test(raw)) return cat;
  }
  return 'default';
}

/**
 * Get the HeyGen-compatible background config for a product.
 *
 * @param {object} product  — product data object
 * @param {string} [processedImageUrl]  — bg-removed product image URL (preferred)
 * @param {'color'|'image'|'product'} [mode]
 *   - 'product'  (default) → use product image as background (avatar in front of product)
 *   - 'lifestyle'          → use category lifestyle photo
 *   - 'color'              → use category dark color
 * @returns {{ type:string, url?:string, value?:string, theme:object, category:string }}
 */
function selectBackground(product = {}, processedImageUrl = null, mode = 'product') {
  const category = detectCategory(product);
  const theme    = CATEGORY_THEMES[category] || CATEGORY_THEMES.default;

  // Mode: product — product image is the background (most impactful)
  if (mode === 'product' && processedImageUrl) {
    return {
      type: 'image',
      url:  processedImageUrl,
      theme,
      category,
      mode: 'product-as-background'
    };
  }

  // Mode: product but no processed image — try raw product image
  const rawImage = product.imageUrl || product.image_url || product.image || product.thumbnail;
  if (mode === 'product' && rawImage) {
    return {
      type: 'image',
      url:  rawImage,
      theme,
      category,
      mode: 'product-raw-background'
    };
  }

  // Mode: lifestyle — RANDOM category-matched scene (unique every render)
  if (mode === 'lifestyle') {
    const randomBg = getRandomBackground(category);
    return {
      type: 'image',
      url:  randomBg.url,
      theme,
      category,
      scene: randomBg.scene,
      query: randomBg.query,
      mode: 'lifestyle-random'
    };
  }

  // Fallback: solid color
  return {
    type:  'color',
    value: theme.colorHex,
    theme,
    category,
    mode: 'solid-color'
  };
}

/**
 * Build a complete HeyGen video_inputs background object.
 * @param {object} bgConfig — result of selectBackground()
 * @returns {{ type:string, url?:string, value?:string }}
 */
function toHeyGenBackground(bgConfig) {
  if (bgConfig.type === 'image' && bgConfig.url) {
    return { type: 'image', url: bgConfig.url };
  }
  return { type: 'color', value: bgConfig.value || '#050a14' };
}

/**
 * Return the gradient CSS string for a given category (for web dashboard preview).
 */
function getCategoryGradient(category) {
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.default;
  return theme.gradient;
}

/**
 * Return all available themes (for API endpoint).
 */
function getAllThemes() {
  return Object.entries(CATEGORY_THEMES).map(([id, t]) => ({
    id,
    label:   t.label,
    mood:    t.mood,
    colorHex: t.colorHex,
    gradient: t.gradient
  }));
}

module.exports = {
  selectBackground,
  toHeyGenBackground,
  detectCategory,
  getCategoryGradient,
  getAllThemes,
  getBackgroundOptions,
  getRandomBackground,
  resolveBackgroundUrl,
  CATEGORY_THEMES,
  LIFESTYLE_IMAGES,
  BACKGROUND_OPTIONS,
  SCENE_QUERIES
};
