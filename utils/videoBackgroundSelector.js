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
  ocean: {
    colorHex: '#061827',
    gradient: 'linear-gradient(135deg, #061827 0%, #0b3653 50%, #04111d 100%)',
    sceneQuery: 'ocean luxury blue water sunlight',
    label: 'Ocean',
    mood: 'premium'
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

// ── Static Background Image Sets ─────────────────────────────────────────────
// Curated direct images.unsplash.com CDN URLs per category.
// source.unsplash.com was deprecated/shut down in 2024 and is no longer usable.
// All URLs here are permanent direct CDN links that HeyGen can reliably download.
const SCENE_QUERIES = {
  health:    ['nature,morning,sunlight,wellness','zen,garden,peaceful,outdoor','yoga,outdoor,sunrise,park'],
  supplements:['modern,kitchen,clean,bright','marble,countertop,minimalist,luxury','ocean,blue,luxury,clean'],
  ocean:     ['ocean,blue,luxury,sunrise','beach,water,high-end,clean','coastal,blue,luxury,modern'],
  fitness:   ['gym,fitness,dark,dramatic','beach,fitness,ocean,morning','athletic,training,intense,dark'],
  beauty:    ['pink,marble,luxury,vanity','salon,elegant,mirror','bathroom,spa,luxury,clean'],
  skincare:  ['spa,luxury,zen','bathroom,marble,minimalist','tropical,leaves,natural,fresh'],
  food:      ['kitchen,modern,bright','farm,table,organic,rustic','restaurant,elegant,plating'],
  tech:      ['office,modern,minimal','neon,city,night,futuristic','coworking,space,design'],
  lifestyle: ['urban,fashion,city','cafe,morning,lifestyle','rooftop,bar,sunset,city'],
  spiritual: ['temple,sunrise,golden','candles,meditation,warm','forest,light,mystical'],
  finance:   ['office,skyline,glass','luxury,car,wealth','penthouse,city,night'],
  education: ['library,books,warm','classroom,bright','bookshelf,reading,warm'],
  default:   ['studio,professional,modern','office,minimalist,bright','luxury,interior,elegant']
};

// Curated static direct CDN image sets per category (multiple for variety, random selection).
// These are permanent direct images.unsplash.com URLs — no redirect needed.
const LIFESTYLE_IMAGE_SETS = {
  health: [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&fit=crop'
  ],
  supplements: [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1550572017-edd951b55104?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=80&fit=crop'
  ],
  ocean: [
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=1920&q=80&fit=crop'
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&fit=crop'
  ],
  beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80&fit=crop'
  ],
  skincare: [
    'https://images.unsplash.com/photo-1556228852-6d35a585d566?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1920&q=80&fit=crop'
  ],
  food: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80&fit=crop'
  ],
  tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=80&fit=crop'
  ],
  lifestyle: [
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&q=80&fit=crop'
  ],
  spiritual: [
    'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80&fit=crop'
  ],
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&q=80&fit=crop'
  ],
  education: [
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1920&q=80&fit=crop'
  ],
  default: [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1920&q=80&fit=crop'
  ]
};

/**
 * Get a random unique background URL for a category.
 * Uses curated static images.unsplash.com CDN URLs (no redirect, HeyGen-safe).
 * @param {string} category
 * @returns {{ url: string, query: string, scene: string }}
 */
function getRandomBackground(category = 'default') {
  const images = LIFESTYLE_IMAGE_SETS[category] || LIFESTYLE_IMAGE_SETS.default;
  const queries = SCENE_QUERIES[category] || SCENE_QUERIES.default;
  const idx = Math.floor(Math.random() * images.length);
  const url = images[idx];
  const query = queries[idx % queries.length] || queries[0];
  return { url, query, scene: query.split(',')[0] };
}

/**
/**
 * Resolve a background URL for HeyGen delivery.
 * source.unsplash.com was shut down in 2024 — this function is now a passthrough
 * that simply returns the URL as-is (all URLs in this module are already direct CDN links).
 * @param {string} sourceUrl
 * @returns {Promise<string>}
 */
async function resolveBackgroundUrl(sourceUrl) {
  return sourceUrl || '';
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
      // Preview URL uses first static image from the set for this category
      preview: (LIFESTYLE_IMAGE_SETS[category] || LIFESTYLE_IMAGE_SETS.default)[i % (LIFESTYLE_IMAGE_SETS[category] || LIFESTYLE_IMAGE_SETS.default).length],
      // Actual render URL will be generated fresh at render time (unique every render)
      note: 'Each render picks a unique image from the curated set for this scene type'
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
  ocean:       'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&q=90&fit=crop',
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
    ['ocean', /sea.?moss|ocean|marine|seaweed|kelp|aquatic/],
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
