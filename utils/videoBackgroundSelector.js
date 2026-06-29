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

// Lifestyle background image URLs — free-to-use high-quality images
// Each category has MULTIPLE options so user can pick their preferred background
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

// Multiple background options per category — gives user choice
const BACKGROUND_OPTIONS = {
  health: [
    { id: 'health-1', label: 'Nature Morning', url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=90&fit=crop' },
    { id: 'health-2', label: 'Clean Studio White', url: 'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=1920&q=90&fit=crop' },
    { id: 'health-3', label: 'Modern Living Room', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=90&fit=crop' },
    { id: 'health-4', label: 'Outdoor Park', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=90&fit=crop' }
  ],
  supplements: [
    { id: 'supps-1', label: 'Clean Kitchen', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&q=90&fit=crop' },
    { id: 'supps-2', label: 'Bright Studio', url: 'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=1920&q=90&fit=crop' },
    { id: 'supps-3', label: 'Natural Wood Table', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&q=90&fit=crop' },
    { id: 'supps-4', label: 'Urban Loft', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=90&fit=crop' }
  ],
  fitness: [
    { id: 'fit-1', label: 'Modern Gym', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=90&fit=crop' },
    { id: 'fit-2', label: 'Outdoor Track', url: 'https://images.unsplash.com/photo-1461896836934-bd45f5db39c1?w=1920&q=90&fit=crop' },
    { id: 'fit-3', label: 'Minimalist Studio', url: 'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=1920&q=90&fit=crop' },
    { id: 'fit-4', label: 'City Rooftop', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=90&fit=crop' }
  ],
  default: [
    { id: 'def-1', label: 'Professional Studio', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=90&fit=crop' },
    { id: 'def-2', label: 'Modern Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=90&fit=crop' },
    { id: 'def-3', label: 'Clean White Wall', url: 'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=1920&q=90&fit=crop' },
    { id: 'def-4', label: 'Urban Street', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=90&fit=crop' },
    { id: 'def-5', label: 'Luxury Interior', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=90&fit=crop' }
  ]
};

/**
 * Get background options for a product (user can choose before or after render).
 * @param {object} product — product data
 * @returns {Array} array of background choices with id, label, url, preview
 */
function getBackgroundOptions(product = {}) {
  const category = detectCategory(product);
  const categoryOptions = BACKGROUND_OPTIONS[category] || BACKGROUND_OPTIONS.default;
  const defaultOptions = BACKGROUND_OPTIONS.default;
  // Combine category-specific + general options, deduplicate by id
  const seen = new Set();
  const options = [];
  for (const opt of [...categoryOptions, ...defaultOptions]) {
    if (!seen.has(opt.id)) {
      seen.add(opt.id);
      options.push({ ...opt, category, preview: opt.url });
    }
  }
  return options;
}

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
    ['supplements', /supplement|protein|collagen|omega|probiotic|vitamin|nutrient|powder/],
    ['vitamins', /vitamin|mineral|zinc|magnes|iron|b12|d3/],
    ['skincare', /skin|moistur|serum|cleanser|toner|glow|radiant|acne|retinol|spf/],
    ['haircare', /hair|shampoo|conditioner|scalp|follicle/],
    ['beauty', /beauty|cosmetic|makeup|lipstick|mascara|foundation|blush|fragrance/],
    ['health', /health|wellness|immune|detox|energy|weight|fat.burn|slim|weight/],
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

  // Mode: lifestyle — category-matched lifestyle photo
  if (mode === 'lifestyle') {
    const lifestyleUrl = LIFESTYLE_IMAGES[category] || LIFESTYLE_IMAGES.default;
    return {
      type: 'image',
      url:  lifestyleUrl,
      theme,
      category,
      mode: 'lifestyle-scene'
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
  CATEGORY_THEMES,
  LIFESTYLE_IMAGES,
  BACKGROUND_OPTIONS
};
