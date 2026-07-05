'use strict';

const fs = require('fs');
const path = require('path');
const { fetchShopifyProducts } = require('./shopifyLiveConnector');
const { fetchTikTokTrending, fetchInstagramPosts } = require('./viralPlatformConnector');

const STATE_PATH = path.join(__dirname, '../generated/viral_media_state.json');
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || process.env.SHOPIFY_SHOP || 'iamgenesistech.myshopify.com';
const DEFAULT_JORDAN_AVATAR_ID = '20d2910e3d2b4890b676a4259d80c6a0';
const DEFAULT_JORDAN_VOICE_ID = 'fd407cedebcc4f29bdbd75ba45c01ea7';
const JORDAN_AVATAR_ID = process.env.REACT_APP_JORDAN_AVATAR_ID || process.env.HEYGEN_JORDAN_AVATAR_ID || process.env.HEYGEN_AVATAR_ID || DEFAULT_JORDAN_AVATAR_ID;
const JORDAN_VOICE_ID = process.env.REACT_APP_JORDAN_VOICE_ID || process.env.HEYGEN_JORDAN_VOICE_ID || process.env.HEYGEN_VOICE_ID || DEFAULT_JORDAN_VOICE_ID;

const EXPORT_FORMATS = [
  { aspectRatio: '9:16', width: 1080, height: 1920, exportType: 'primary_master', label: 'Vertical master' },
  { aspectRatio: '1:1', width: 1080, height: 1080, exportType: 'feed_square', label: 'Feed square' },
  { aspectRatio: '16:9', width: 1920, height: 1080, exportType: 'widescreen', label: 'Widescreen' },
  { aspectRatio: '9:16', width: 1080, height: 1920, exportType: 'shopify_loop', label: 'Loop cut' },
  { aspectRatio: '9:16', width: 1080, height: 1920, exportType: 'motion_preview', label: 'Motion preview' }
];

const PLATFORM_RULES = {
  tiktok: { platform: 'TikTok', aspectRatio: '9:16', idealLengthSeconds: 18, priority: 10, videoType: 'AI Cinematic Viral Commercial' },
  instagram_reels: { platform: 'Instagram Reels', aspectRatio: '9:16', idealLengthSeconds: 18, priority: 9, videoType: 'AI Cinematic Viral Commercial' },
  facebook_reels: { platform: 'Facebook Reels', aspectRatio: '9:16', idealLengthSeconds: 20, priority: 8, videoType: 'AI Cinematic Viral Commercial' },
  youtube_shorts: { platform: 'YouTube Shorts', aspectRatio: '9:16', idealLengthSeconds: 20, priority: 8, videoType: 'AI Cinematic Viral Commercial' },
  pinterest: { platform: 'Pinterest', aspectRatio: '9:16', idealLengthSeconds: 20, priority: 7, videoType: 'AI Cinematic Viral Commercial' },
  facebook_feed: { platform: 'Facebook Feed', aspectRatio: '1:1', idealLengthSeconds: 20, priority: 10, videoType: 'Jordan Avatar Trust Video' },
  instagram_feed: { platform: 'Instagram Feed', aspectRatio: '1:1', idealLengthSeconds: 20, priority: 9, videoType: 'Jordan Avatar Trust Video' },
  shopify_product_page: { platform: 'Shopify Product Page', aspectRatio: '1:1', idealLengthSeconds: 25, priority: 10, videoType: 'Jordan Avatar Trust Video' },
  shopify_homepage: { platform: 'Shopify Homepage', aspectRatio: '16:9', idealLengthSeconds: 8, priority: 8, videoType: 'AI Cinematic Viral Commercial' },
  shopify_collection_page: { platform: 'Shopify Collection Page', aspectRatio: '16:9', idealLengthSeconds: 8, priority: 8, videoType: 'AI Cinematic Viral Commercial' },
  email: { platform: 'Email', aspectRatio: '1:1', idealLengthSeconds: 15, priority: 7, videoType: 'Jordan Avatar Trust Video' },
  retargeting: { platform: 'Retargeting Ads', aspectRatio: '1:1', idealLengthSeconds: 15, priority: 10, videoType: 'Jordan Avatar Trust Video' }
};

const DEFAULT_PLATFORMS = [
  PLATFORM_RULES.facebook_feed,
  PLATFORM_RULES.instagram_feed,
  PLATFORM_RULES.shopify_product_page,
  PLATFORM_RULES.tiktok,
  PLATFORM_RULES.instagram_reels,
  PLATFORM_RULES.youtube_shorts,
  PLATFORM_RULES.shopify_homepage
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  if (raw.indexOf('//') === 0) return 'https:' + raw;
  return raw;
}

function stripHtml(value) {
  return normalizeText(String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' '));
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function unique(list) {
  const seen = new Set();
  const out = [];
  list.forEach(function (item) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function uniqueBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  list.forEach(function (item) {
    const key = normalizeText(keyFn(item));
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null) return [];
  return [value];
}

function resolveJordanAvatarConfig(options) {
  const source = options && typeof options === 'object' ? options : {};
  const jordanAvatar = source.jordanAvatar && typeof source.jordanAvatar === 'object' ? source.jordanAvatar : {};
  const avatarId = normalizeText(
    source.avatarId ||
    source.avatar_id ||
    source.requestedAvatarId ||
    jordanAvatar.avatarId ||
    jordanAvatar.requestedAvatarId
  ) || JORDAN_AVATAR_ID;
  const voiceId = normalizeText(
    source.voiceId ||
    source.voice_id ||
    jordanAvatar.voiceId
  ) || JORDAN_VOICE_ID;
  return { avatarId, voiceId };
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[viralMediaEngine] readJsonFile failed for ' + filePath + ':', error.message);
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  return value;
}

function buildSeedTemplates() {
  return [
    {
      id: 'template-jordan-trust',
      templateName: 'Jordan Avatar Trust Video',
      videoType: 'Jordan Avatar Trust Video',
      platform: 'Facebook Feed',
      status: 'Approved',
      templateJson: {
        structure: ['hook', 'problem', 'benefit', 'proof', 'cta'],
        tone: 'confident, trustworthy, clear, premium',
        safeZones: ['top', 'bottom'],
        lengthSeconds: 20
      }
    },
    {
      id: 'template-ai-cinematic',
      templateName: 'AI Cinematic Viral Commercial',
      videoType: 'AI Cinematic Viral Commercial',
      platform: 'TikTok',
      status: 'Approved',
      templateJson: {
        structure: ['hook', 'scene_1', 'scene_2', 'scene_3', 'end_card'],
        tone: 'cinematic, energetic, luxury wellness, thumb-stopping',
        safeZones: ['top', 'bottom'],
        lengthSeconds: 18
      }
    }
  ];
}

function buildSeedAudienceSegments() {
  return [
    {
      id: 'segment-warm-retargeting',
      segmentName: 'Warm Retargeting',
      status: 'Approved',
      segmentProfile: {
        intent: 'People who viewed a product page or watched a prior video',
        message: 'Trust-first explanation and clear CTA'
      },
      platformPriority: ['Facebook Feed', 'Instagram Feed', 'Retargeting Ads']
    },
    {
      id: 'segment-discovery-scroll-stoppers',
      segmentName: 'Discovery Scroll Stoppers',
      status: 'Approved',
      segmentProfile: {
        intent: 'New audiences in feed and short-form discovery',
        message: 'Fast hook, premium motion, visual first impression'
      },
      platformPriority: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Pinterest']
    },
    {
      id: 'segment-shopify-high-intent',
      segmentName: 'Shopify High Intent',
      status: 'Approved',
      segmentProfile: {
        intent: 'Shoppers already on product pages or collections',
        message: 'Product proof, value clarity, purchase confidence'
      },
      platformPriority: ['Shopify Product Page', 'Shopify Homepage', 'Shopify Collection Page', 'Email']
    }
  ];
}

function defaultState() {
  const jordan = resolveJordanAvatarConfig();
  return {
    version: 1,
    generatedAt: null,
    updatedAt: null,
    publishingMode: 'Manual Approval',
    jordanAvatar: {
      avatarId: jordan.avatarId,
      requestedAvatarId: jordan.avatarId,
      voiceId: jordan.voiceId,
      available: false,
      status: 'unknown',
      lastCheckedAt: null,
      lastError: ''
    },
    products: [],
    similarAds: [],
    productMediaAssets: [],
    videoCampaigns: [],
    briefs: [],
    scripts: [],
    concepts: [],
    scores: [],
    renders: [],
    exports: [],
    publishing: [],
    performanceMetrics: [],
    learningLoop: [],
    boardReviews: [],
    creativeTemplates: buildSeedTemplates(),
    hookTests: [],
    ctaTests: [],
    audienceSegments: buildSeedAudienceSegments(),
    mediaGenerationJobs: [],
    regenerationQueue: [],
    summary: {
      totalProducts: 0,
      totalSimilarAds: 0,
      briefGenerated: 0,
      scriptsGenerated: 0,
      mediaAssetsReady: 0,
      rendering: 0,
      renderComplete: 0,
      needsReview: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      learningLoopUpdated: 0,
      needsRegeneration: 0
    }
  };
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const state = defaultState();
  state.version = Number(source.version || 1);
  state.generatedAt = source.generatedAt || source.generated_at || null;
  state.updatedAt = source.updatedAt || source.updated_at || null;
  state.publishingMode = normalizeText(source.publishingMode || source.publishMode || state.publishingMode) || state.publishingMode;
  state.jordanAvatar = Object.assign({}, state.jordanAvatar, source.jordanAvatar || {});
  state.products = Array.isArray(source.products) ? source.products : [];
  state.similarAds = Array.isArray(source.similarAds) ? source.similarAds : [];
  state.productMediaAssets = Array.isArray(source.productMediaAssets) ? source.productMediaAssets : [];
  state.videoCampaigns = Array.isArray(source.videoCampaigns) ? source.videoCampaigns : [];
  state.briefs = Array.isArray(source.briefs) ? source.briefs : [];
  state.scripts = Array.isArray(source.scripts) ? source.scripts : [];
  state.concepts = Array.isArray(source.concepts) ? source.concepts : [];
  state.scores = Array.isArray(source.scores) ? source.scores : [];
  state.renders = Array.isArray(source.renders) ? source.renders : [];
  state.exports = Array.isArray(source.exports) ? source.exports : [];
  state.publishing = Array.isArray(source.publishing) ? source.publishing : [];
  state.performanceMetrics = Array.isArray(source.performanceMetrics) ? source.performanceMetrics : [];
  state.learningLoop = Array.isArray(source.learningLoop) ? source.learningLoop : [];
  state.boardReviews = Array.isArray(source.boardReviews) ? source.boardReviews : [];
  state.creativeTemplates = Array.isArray(source.creativeTemplates) && source.creativeTemplates.length ? source.creativeTemplates : buildSeedTemplates();
  state.hookTests = Array.isArray(source.hookTests) ? source.hookTests : [];
  state.ctaTests = Array.isArray(source.ctaTests) ? source.ctaTests : [];
  state.audienceSegments = Array.isArray(source.audienceSegments) && source.audienceSegments.length ? source.audienceSegments : buildSeedAudienceSegments();
  state.mediaGenerationJobs = Array.isArray(source.mediaGenerationJobs) ? source.mediaGenerationJobs : [];
  state.regenerationQueue = Array.isArray(source.regenerationQueue) ? source.regenerationQueue : [];
  state.summary = Object.assign({}, state.summary, source.summary || {});
  state.summary = computeSummary(state);
  return state;
}

function readViralMediaState() {
  return normalizeState(readJsonFile(STATE_PATH, defaultState()));
}

function writeViralMediaState(value) {
  const state = normalizeState(value);
  state.updatedAt = nowIso();
  if (!state.generatedAt) state.generatedAt = state.updatedAt;
  state.summary = computeSummary(state);
  return writeJsonFile(STATE_PATH, state);
}

function updateViralMediaState(mutator) {
  const current = readViralMediaState();
  const next = mutator(current) || current;
  return writeViralMediaState(next);
}

function extractCategoryKeywords(text) {
  const lower = normalizeText(text).toLowerCase();
  if (/collagen|peptide|protein|amino|creatine|electrolyte|greens|mushroom|sea moss|probiotic|vitamin|supplement|magnesium|sleep|calm|focus|energy|recovery/.test(lower)) return 'Wellness';
  if (/beauty|skin|glow|hair|face|serum|oil|shampoo|conditioner|makeup/.test(lower)) return 'Beauty';
  if (/performance|workout|training|athlete|strength|muscle|fitness|pre-workout/.test(lower)) return 'Performance';
  if (/food|snack|drink|coffee|tea|hydration|nutrition|kitchen/.test(lower)) return 'Nutrition';
  return 'Lifestyle';
}

function inferCategory(product) {
  const explicit = normalizeText(product.category || product.product_type || product.collectionName || '');
  if (explicit) return explicit;
  return extractCategoryKeywords([product.title, product.handle, product.description, product.tags].join(' '));
}

function inferTargetCustomer(category) {
  switch (normalizeText(category).toLowerCase()) {
    case 'beauty':
      return 'customers looking for glow, confidence, and daily care';
    case 'performance':
      return 'founders, athletes, and active professionals optimizing output';
    case 'nutrition':
      return 'people wanting easy, premium support for daily routines';
    case 'wellness':
      return 'health-conscious buyers building a better daily ritual';
    default:
      return 'premium shoppers who want a clear, trustworthy product upgrade';
  }
}

function inferMainProblemSolved(category) {
  switch (normalizeText(category).toLowerCase()) {
    case 'beauty':
      return 'supports a simple routine that helps customers feel polished and consistent';
    case 'performance':
      return 'helps maintain momentum and consistency in demanding days';
    case 'nutrition':
      return 'makes it easier to stay on track with a better everyday routine';
    case 'wellness':
      return 'supports balance, consistency, and a more intentional routine';
    default:
      return 'reduces friction and makes the product decision feel obvious';
  }
}

function inferTopBenefits(category, product) {
  const base = [
    'supports daily routine consistency',
    'helps maintain momentum without complexity',
    'designed to support a premium customer experience'
  ];
  if (normalizeText(category).toLowerCase() === 'performance') {
    base.unshift('supports training and recovery habits');
  }
  if (normalizeText(category).toLowerCase() === 'beauty') {
    base.unshift('supports a polished, confident look');
  }
  if (normalizeText(category).toLowerCase() === 'wellness') {
    base.unshift('supports a calmer, more balanced routine');
  }
  const titleWords = normalizeText(product.title).split(' ').filter(Boolean);
  if (titleWords.length >= 2) base.push('features ' + titleWords.slice(0, 2).join(' '));
  return unique(base).slice(0, 4);
}

function inferEmotionalTrigger(category) {
  switch (normalizeText(category).toLowerCase()) {
    case 'beauty':
      return 'confidence';
    case 'performance':
      return 'momentum';
    case 'nutrition':
      return 'control';
    case 'wellness':
      return 'relief';
    default:
      return 'clarity';
  }
}

function inferIngredientHighlights(product) {
  const text = [product.title, product.description, toArray(product.tags).join(' ')].join(' ');
  const lower = normalizeText(text).toLowerCase();
  const keywords = [
    'collagen', 'peptide', 'protein', 'greens', 'sea moss', 'magnesium', 'probiotic', 'adaptogen',
    'mct', 'creatine', 'electrolyte', 'vitamin c', 'zinc', 'ashwagandha', 'mushroom', 'fiber',
    'omega', 'biotin', 'hyaluronic', 'retinol', 'caffeine', 'cbd', 'keto'
  ];
  const matches = keywords.filter(function (keyword) {
    return lower.indexOf(keyword) !== -1;
  });
  if (matches.length) return unique(matches.map(titleCase)).slice(0, 4);
  return unique(normalizeText(product.title).split(' ').filter(Boolean).slice(0, 3));
}

function inferProofPoints(product) {
  const description = stripHtml(product.description || product.body_html || '');
  if (!description) {
    return [
      'Clear product page with visible product image',
      'Compliance-safe support language',
      'Easy to understand CTA and purchase path'
    ];
  }
  const sentences = description.split(/[.!?]+/).map(normalizeText).filter(Boolean);
  return unique(sentences).slice(0, 3);
}

function inferBestUseCase(category) {
  switch (normalizeText(category).toLowerCase()) {
    case 'beauty':
      return 'morning and evening beauty routine';
    case 'performance':
      return 'pre-workout, post-workout, or busy workday support';
    case 'nutrition':
      return 'breakfast, on-the-go, or meal replacement moments';
    case 'wellness':
      return 'a daily wellness ritual that feels easy to keep';
    default:
      return 'everyday premium use case with minimal friction';
  }
}

function inferCustomerTransformation(category) {
  switch (normalizeText(category).toLowerCase()) {
    case 'beauty':
      return 'from hesitant to confident and ready to show up';
    case 'performance':
      return 'from scattered to focused and consistent';
    case 'nutrition':
      return 'from guesswork to a clearer routine';
    case 'wellness':
      return 'from reactive to intentional';
    default:
      return 'from unsure to clear on the value';
  }
}

function buildComplianceClaims(category) {
  const claims = [
    'supports a consistent routine',
    'helps maintain everyday wellness',
    'designed to support a premium customer experience'
  ];
  if (normalizeText(category).toLowerCase() === 'performance') {
    claims.unshift('supports training and recovery routines');
  }
  if (normalizeText(category).toLowerCase() === 'beauty') {
    claims.unshift('supports a polished daily care routine');
  }
  return unique(claims).slice(0, 4);
}

function buildDisclaimer(category) {
  if (normalizeText(category).toLowerCase() === 'wellness' || normalizeText(category).toLowerCase() === 'performance') {
    return 'Results vary. This content is for general informational purposes and is not medical advice.';
  }
  return 'Results vary. Individual experience depends on routine, usage, and context.';
}

function buildPlatformPriority(videoType) {
  const isJordan = normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1;
  const chosen = isJordan
    ? [PLATFORM_RULES.facebook_feed, PLATFORM_RULES.instagram_feed, PLATFORM_RULES.shopify_product_page, PLATFORM_RULES.email, PLATFORM_RULES.retargeting]
    : [PLATFORM_RULES.tiktok, PLATFORM_RULES.instagram_reels, PLATFORM_RULES.youtube_shorts, PLATFORM_RULES.pinterest, PLATFORM_RULES.shopify_homepage, PLATFORM_RULES.shopify_collection_page];
  return chosen.map(function (item, index) {
    return {
      platform: item.platform,
      aspectRatio: item.aspectRatio,
      idealLengthSeconds: item.idealLengthSeconds,
      priority: item.priority - index,
      recommendedVideoType: item.videoType,
      reason: isJordan ? 'Trust and education placement' : 'Discovery and viral reach placement'
    };
  });
}

function buildVideoTypeRecommendation() {
  return {
    primary: 'Jordan Avatar Trust Video',
    secondary: 'AI Cinematic Viral Commercial',
    note: 'Use both where possible; trust for conversion and cinematic for discovery.'
  };
}

function buildSuggestedHook(product, brief, videoType) {
  const name = brief.productName || product.title;
  if (normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1) {
    return 'If you want a simpler routine, ' + name + ' is worth a closer look.';
  }
  return 'This is the kind of product that earns attention in the first second.';
}

function buildSuggestedCTA(product) {
  return 'Tap to view ' + (product.title || 'the product') + ' and see why it fits the routine.';
}

function normalizeProductRecord(product, rank) {
  const title = normalizeText(product.title || product.name || product.product_name || product.productName || 'Untitled Product');
  const handle = slugify(product.handle || product.product_handle || product.slug || title);
  const imageUrl = normalizeUrl(product.imageUrl || product.image || product.primaryImageUrl || (product.images && product.images[0] && (product.images[0].src || product.images[0].url)) || '');
  const productUrl = normalizeUrl(product.productUrl || product.productPageUrl || product.product_page_url || ('https://' + SHOPIFY_DOMAIN + '/products/' + handle));
  const sku = normalizeText(product.sku || (product.variants && product.variants[0] && product.variants[0].sku) || handle.toUpperCase());
  const category = inferCategory(product);
  const description = stripHtml(product.description || product.body_html || product.bodyHtml || '');
  return {
    id: normalizeText(product.id || product.shopify_id || product.product_id || handle || title),
    shopifyProductId: normalizeText(product.shopifyProductId || product.shopify_id || product.id || ''),
    productHandle: handle,
    productName: title,
    sku: sku,
    collectionName: normalizeText(product.collectionName || product.collection || 'Best Sellers'),
    productCategory: category,
    bestSellerRank: typeof rank === 'number' ? rank : Number(product.bestSellerRank || product.best_seller_rank || 0) || null,
    productImageUrl: imageUrl,
    productPageUrl: productUrl,
    description: description,
    tags: toArray(product.tags),
    source: normalizeText(product.source || 'shopify'),
    createdAt: product.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

async function fetchHtml(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, timeoutMs || 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractHandlesFromHtml(html) {
  const handles = [];
  const patterns = [
    /href=["']\/products\/([^"'?#/]+)(?:[/?#][^"']*)?["']/gi,
    /data-product-handle=["']([^"']+)["']/gi
  ];
  patterns.forEach(function (regex) {
    let match = null;
    while ((match = regex.exec(html)) !== null) {
      const handle = normalizeText(match[1]).toLowerCase();
      if (handle) handles.push(handle);
    }
  });
  return unique(handles);
}

async function fetchBestSellerHandles(limit) {
  const handles = [];
  const seen = new Set();
  const maxPages = 5;
  for (let page = 1; page <= maxPages && handles.length < limit; page++) {
    const url = 'https://' + SHOPIFY_DOMAIN + '/collections/all?sort_by=best-selling&page=' + page;
    try {
      const html = await fetchHtml(url, 12000);
      const pageHandles = extractHandlesFromHtml(html);
      pageHandles.forEach(function (handle) {
        if (!seen.has(handle) && handles.length < limit) {
          seen.add(handle);
          handles.push(handle);
        }
      });
    } catch (error) {
      console.warn('[viralMediaEngine] best-seller scrape failed for page ' + page + ':', error.message);
    }
  }
  return handles;
}

async function fetchBestSellingProducts(limit) {
  const max = Number(limit || 25);
  let products = [];
  try {
    products = await fetchShopifyProducts();
  } catch (error) {
    console.warn('[viralMediaEngine] Shopify product fetch failed:', error.message);
  }
  const catalog = Array.isArray(products) ? products.map(normalizeProductRecord) : [];
  const byHandle = new Map();
  catalog.forEach(function (product) {
    byHandle.set(product.productHandle, product);
  });

  let handles = [];
  try {
    handles = await fetchBestSellerHandles(max);
  } catch (error) {
    console.warn('[viralMediaEngine] Best-seller handle fetch failed:', error.message);
  }

  const ranked = [];
  const seen = new Set();
  handles.forEach(function (handle, index) {
    const catalogProduct = byHandle.get(handle);
    if (catalogProduct && !seen.has(handle)) {
      ranked.push(normalizeProductRecord(catalogProduct, ranked.length + 1));
      seen.add(handle);
    }
  });

  if (ranked.length < max) {
    catalog.forEach(function (product) {
      if (ranked.length >= max) return;
      if (seen.has(product.productHandle)) return;
      ranked.push(normalizeProductRecord(product, ranked.length + 1));
      seen.add(product.productHandle);
    });
  }

  if (ranked.length < max && handles.length) {
    handles.forEach(function (handle) {
      if (ranked.length >= max) return;
      if (seen.has(handle)) return;
      const stubTitle = titleCase(handle.replace(/-/g, ' '));
      ranked.push(normalizeProductRecord({
        id: handle,
        title: stubTitle,
        handle: handle,
        product_type: 'Best Seller',
        sku: handle.toUpperCase(),
        imageUrl: '',
        productUrl: 'https://' + SHOPIFY_DOMAIN + '/products/' + handle,
        description: '',
        tags: ['best-seller']
      }, ranked.length + 1));
      seen.add(handle);
    });
  }

  return ranked.slice(0, max);
}

function productSearchQueries(product) {
  const name = normalizeText(product.productName || product.title || '');
  const category = normalizeText(product.productCategory || '');
  const tags = toArray(product.tags).map(normalizeText).filter(Boolean);
  return unique(
    [
      name,
      name + ' review',
      name + ' before after',
      category ? category + ' product review' : '',
      tags[0] ? tags[0] + ' routine' : '',
      tags[1] ? tags[1] + ' product demo' : ''
    ].filter(Boolean)
  ).slice(0, 4);
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(function (token) {
      return token.length > 2;
    });
}

function classifyAdFormat(candidate) {
  const text = normalizeText(candidate.description + ' ' + candidate.caption + ' ' + candidate.hashtags.join(' ')).toLowerCase();
  if (/\b(before|after|transformation|results)\b/.test(text)) return 'before_after';
  if (/\b(review|testimonial|my story|journey|experience)\b/.test(text)) return 'testimonial';
  if (/\b(demo|how to|tutorial|routine|steps|use this)\b/.test(text)) return 'demo';
  if (/\b(ugc|creator|founder|voiceover)\b/.test(text)) return 'ugc';
  return 'product_showcase';
}

function formatLabel(formatKey) {
  switch (formatKey) {
    case 'before_after': return 'Before / After Transformation';
    case 'testimonial': return 'Testimonial / Story';
    case 'demo': return 'Product Demo / Routine';
    case 'ugc': return 'UGC Creator Style';
    default: return 'Product Showcase';
  }
}

function scoreSimilarity(product, candidate) {
  const productTokens = new Set(
    tokenize(
      [
        product.productName,
        product.productCategory,
        product.collectionName,
        toArray(product.tags).join(' ')
      ].join(' ')
    )
  );
  const candidateTokens = new Set(
    tokenize(
      [
        candidate.description,
        candidate.caption,
        candidate.hashtags.join(' ')
      ].join(' ')
    )
  );
  if (!productTokens.size || !candidateTokens.size) return 0;
  let overlap = 0;
  productTokens.forEach(function (token) {
    if (candidateTokens.has(token)) overlap += 1;
  });
  return clamp(Math.round((overlap / productTokens.size) * 100), 0, 100);
}

function scoreEngagement(candidate) {
  const views = Number(candidate.views || 0);
  const likes = Number(candidate.likes || 0);
  const comments = Number(candidate.comments || 0);
  const shares = Number(candidate.shares || 0);
  const engagementRate = views > 0 ? ((likes + comments + shares) / views) : Number(candidate.engagementRate || 0);
  const score = (Math.min(views, 500000) / 500000) * 45 + Math.min(engagementRate * 100, 40) + Math.min(comments, 5000) / 5000 * 15;
  return clamp(Math.round(score), 0, 100);
}

function gradeFromScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function normalizeTikTokCandidate(item, query) {
  return {
    sourcePlatform: 'TikTok',
    sourceQuery: query,
    sourceUrl: normalizeUrl(item.video_url || item.url || ''),
    author: normalizeText(item.author || ''),
    description: normalizeText(item.description || ''),
    caption: normalizeText(item.description || ''),
    hashtags: String(item.hashtags || '')
      .split(',')
      .map(function (tag) { return normalizeText(tag).replace(/^#/, ''); })
      .filter(Boolean),
    views: Number(item.views || 0),
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    shares: Number(item.shares || 0),
    engagementRate: Number(item.engagement_rate || 0)
  };
}

function normalizeInstagramCandidate(item, query) {
  return {
    sourcePlatform: 'Instagram',
    sourceQuery: query,
    sourceUrl: normalizeUrl(item.post_url || item.url || ''),
    author: normalizeText(item.author || ''),
    description: normalizeText(item.caption || ''),
    caption: normalizeText(item.caption || ''),
    hashtags: String(item.hashtags || '')
      .split(',')
      .map(function (tag) { return normalizeText(tag).replace(/^#/, ''); })
      .filter(Boolean),
    views: Number(item.views || 0),
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    shares: Number(item.shares || 0),
    engagementRate: Number(item.engagement_rate || 0)
  };
}

async function scrapeSimilarAdsForProduct(product, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const perProduct = clamp(Number(opts.perProduct || 3), 1, 6);
  const queries = productSearchQueries(product);
  const tiktokQueries = queries.slice(0, 2);
  const instagramUrls = ['https://www.instagram.com/explore/tags/' + slugify(product.productName || product.productHandle || 'product') + '/'];

  let tiktokRaw = [];
  let instagramRaw = [];
  try {
    tiktokRaw = await fetchTikTokTrending(tiktokQueries.length ? tiktokQueries : ['ecommerce product review'], Number(opts.resultsPerQuery || 8));
  } catch (error) {
    console.warn('[viralMediaEngine] TikTok similar scrape failed for ' + product.productHandle + ':', error.message);
  }
  try {
    instagramRaw = await fetchInstagramPosts(instagramUrls, Number(opts.resultsPerQuery || 8));
  } catch (error) {
    console.warn('[viralMediaEngine] Instagram similar scrape failed for ' + product.productHandle + ':', error.message);
  }

  const candidates = []
    .concat((Array.isArray(tiktokRaw) ? tiktokRaw : []).map(function (item) { return normalizeTikTokCandidate(item, tiktokQueries[0] || product.productName); }))
    .concat((Array.isArray(instagramRaw) ? instagramRaw : []).map(function (item) { return normalizeInstagramCandidate(item, queries[0] || product.productName); }))
    .filter(function (candidate) {
      return normalizeText(candidate.sourceUrl);
    });

  const deduped = uniqueBy(candidates, function (candidate) {
    return candidate.sourceUrl;
  });

  const scored = deduped.map(function (candidate, index) {
    const similarityScore = scoreSimilarity(product, candidate);
    const engagementScore = scoreEngagement(candidate);
    const aiScore = Math.round(similarityScore * 0.7 + engagementScore * 0.3);
    const format = classifyAdFormat(candidate);
    return Object.assign({}, candidate, {
      id: 'similar-' + slugify(product.productHandle || product.productName) + '-' + index + '-' + slugify(candidate.sourcePlatform + '-' + format),
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      formatKey: format,
      formatLabel: formatLabel(format),
      similarityScore: similarityScore,
      engagementScore: engagementScore,
      aiScore: clamp(aiScore, 0, 100),
      aiGrade: gradeFromScore(aiScore),
      selectedForScript: false,
      status: 'Scraped Similar Ad',
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }).sort(function (a, b) {
    return b.aiScore - a.aiScore;
  });

  const byFormat = new Set();
  const picked = [];
  scored.forEach(function (item) {
    if (picked.length >= perProduct) return;
    if (byFormat.has(item.formatKey)) return;
    byFormat.add(item.formatKey);
    picked.push(item);
  });
  scored.forEach(function (item) {
    if (picked.length >= perProduct) return;
    if (picked.find(function (entry) { return entry.id === item.id; })) return;
    picked.push(item);
  });
  if (picked[0]) picked[0].selectedForScript = true;
  return picked.slice(0, perProduct);
}

async function scrapeSimilarAdsForCatalog(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const limit = Number(opts.limit || 25);
  const perProduct = clamp(Number(opts.perProduct || 3), 1, 6);
  const products = await fetchBestSellingProducts(limit);
  const state = readViralMediaState();
  const allScraped = [];

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const scraped = await scrapeSimilarAdsForProduct(product, opts);
    allScraped.push.apply(allScraped, scraped);
    const formats = unique(scraped.map(function (entry) { return entry.formatLabel; })).slice(0, perProduct);
    const aiBest = scraped.length ? scraped.reduce(function (best, entry) {
      return entry.aiScore > best.aiScore ? entry : best;
    }, scraped[0]) : null;
    const productIndex = state.products.findIndex(function (item) {
      return item.productHandle === product.productHandle;
    });
    const updatedProduct = Object.assign({}, productIndex >= 0 ? state.products[productIndex] : product, {
      similarAdsStatus: scraped.length ? 'Top references ready' : 'No references found',
      similarAdsCount: scraped.length,
      topSimilarFormats: formats,
      recommendedReferenceId: aiBest ? aiBest.id : '',
      recommendedReferenceScore: aiBest ? aiBest.aiScore : 0,
      updatedAt: nowIso()
    });
    upsertById(state.products, updatedProduct);

    state.productMediaAssets = (state.productMediaAssets || []).filter(function (asset) {
      return !(asset.assetType === 'similar_ad_reference' && asset.productHandle === product.productHandle);
    });
    scraped.forEach(function (entry) {
      state.productMediaAssets.push({
        id: 'asset-similar-' + slugify(product.productHandle) + '-' + slugify(entry.formatKey + '-' + entry.sourcePlatform + '-' + entry.author),
        campaignId: updatedProduct.campaignId || 'vmc-' + slugify(product.productHandle || product.productName),
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        assetType: 'similar_ad_reference',
        assetName: entry.formatLabel + ' (' + entry.sourcePlatform + ')',
        sourceUrl: entry.sourceUrl,
        previewUrl: entry.sourceUrl,
        storageUrl: '',
        status: 'Reference Ready',
        metadata: {
          aiScore: entry.aiScore,
          aiGrade: entry.aiGrade,
          similarityScore: entry.similarityScore,
          format: entry.formatLabel,
          author: entry.author
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    });
  }

  state.similarAds = (state.similarAds || []).filter(function (entry) {
    const productHandle = String(entry.productHandle || '');
    return !products.find(function (product) { return product.productHandle === productHandle; });
  }).concat(allScraped);
  state.updatedAt = nowIso();
  state.summary = computeSummary(state);
  writeViralMediaState(state);

  return {
    productCount: products.length,
    requestedLimit: limit,
    perProduct: perProduct,
    scrapedCount: allScraped.length,
    productsCovered: unique(allScraped.map(function (entry) { return entry.productHandle; })).length,
    products: products.map(function (product) {
      const refs = allScraped.filter(function (entry) { return entry.productHandle === product.productHandle; });
      return {
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        referencesFound: refs.length,
        topFormats: unique(refs.map(function (entry) { return entry.formatLabel; })).slice(0, perProduct),
        topReference: refs[0] || null
      };
    }),
    references: allScraped
  };
}

function getSimilarAds(productRef, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const state = readViralMediaState();
  const list = Array.isArray(state.similarAds) ? state.similarAds : [];
  const ref = String(productRef || '').toLowerCase();
  const matched = ref
    ? list.filter(function (entry) {
      return String(entry.productHandle || '').toLowerCase() === ref ||
        String(entry.productId || '').toLowerCase() === ref ||
        String(entry.productName || '').toLowerCase() === ref;
    })
    : list;
  const sorted = matched.slice().sort(function (a, b) {
    return Number(b.aiScore || 0) - Number(a.aiScore || 0);
  });
  const max = opts.limit ? Number(opts.limit) : sorted.length;
  return sorted.slice(0, max);
}

function buildScriptReferenceDecision(productRef, options) {
  const refs = getSimilarAds(productRef, { limit: 12 });
  const best = refs.length ? refs[0] : null;
  const threshold = Number(options && options.minimumScore || 70);
  const useScrapedPrimary = Boolean(best && Number(best.aiScore || 0) >= threshold);
  return {
    productRef: productRef,
    referenceCount: refs.length,
    bestReference: best,
    strategy: useScrapedPrimary ? 'scraped_reference_primary' : 'ai_fresh_primary',
    rationale: useScrapedPrimary
      ? 'Top scraped reference scored high enough to anchor script direction.'
      : 'Scraped references exist but AI-generated script is expected to outperform based on quality threshold.',
    backupReferences: refs.slice(1, 4),
    aiCanOverride: true,
    minimumScoreForScrapedPrimary: threshold
  };
}

function generateCreativeBrief(product, rank, options) {
  const category = inferCategory(product);
  const videoTypeRecommendation = buildVideoTypeRecommendation();
  const productName = product.productName || product.title || 'Untitled Product';
  return {
    id: 'brief-' + slugify(product.productHandle || product.handle || productName),
    campaignId: 'vmc-' + slugify(product.productHandle || product.handle || productName),
    productId: product.id || product.shopifyProductId || product.productHandle,
    productHandle: product.productHandle || slugify(product.handle || productName),
    productName: productName,
    sku: product.sku || '',
    collectionName: product.collectionName || 'Best Sellers',
    productCategory: category,
    bestSellerRank: typeof rank === 'number' ? rank : Number(product.bestSellerRank || 0) || null,
    targetCustomer: inferTargetCustomer(category),
    mainProblemSolved: inferMainProblemSolved(category),
    topBenefits: inferTopBenefits(category, product),
    emotionalTrigger: inferEmotionalTrigger(category),
    productProofPoints: inferProofPoints(product),
    ingredientHighlights: inferIngredientHighlights(product),
    bestUseCase: inferBestUseCase(category),
    customerTransformation: inferCustomerTransformation(category),
    suggestedHook: buildSuggestedHook(product, { productName: productName }, options && options.videoType ? options.videoType : 'Jordan Avatar Trust Video'),
    suggestedCTA: buildSuggestedCTA(product),
    platformPriority: buildPlatformPriority(options && options.videoType ? options.videoType : 'Jordan Avatar Trust Video'),
    videoTypeRecommendation: videoTypeRecommendation,
    complianceSafeClaims: buildComplianceClaims(category),
    disclaimerLanguage: buildDisclaimer(category),
    tone: 'premium, clear, confident, trustworthy',
    status: 'Brief Generated',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function buildHookOptions(brief, videoType) {
  const name = brief.productName;
  const trust = normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1;
  return unique([
    trust ? 'If you want a simpler routine, ' + name + ' belongs on your shortlist.' : 'This is the kind of product people stop scrolling for.',
    trust ? name + ' is built to make the next step feel obvious.' : 'A premium product deserves a premium first impression.',
    trust ? 'Here is why ' + name + ' fits a daily routine better than guesswork.' : 'In the first three seconds, the product does the talking.'
  ]).slice(0, 3);
}

function buildCtaOptions(brief) {
  return unique([
    'Tap to view ' + brief.productName + ' on the product page.',
    'Shop now to see the full details and usage guidance.'
  ]);
}

function generateJordanTrustScript(product, brief, options) {
  const jordan = resolveJordanAvatarConfig(options);
  const hookOptions = buildHookOptions(brief, 'Jordan Avatar Trust Video');
  const ctaOptions = buildCtaOptions(brief);
  const selectedHook = hookOptions[0];
  const selectedCta = ctaOptions[0];
  const spokenScript = [
    selectedHook,
    brief.productName + ' is designed to support a more consistent routine without making it complicated.',
    'It is easy to understand, easy to use, and the product page lays out the details clearly.',
    'If you want a confident next step, tap below and take a look.'
  ].join(' ');
  return {
    id: 'script-jordan-' + slugify(product.productHandle || product.productName),
    campaignId: 'vmc-' + slugify(product.productHandle || product.productName),
    productId: product.id || product.productHandle,
    productHandle: product.productHandle,
    productName: product.productName,
    sku: product.sku || '',
    videoType: 'Jordan Avatar Trust Video',
    avatarId: jordan.avatarId,
    voiceId: jordan.voiceId,
    hookOptions: hookOptions,
    ctaOptions: ctaOptions,
    selectedHook: selectedHook,
    selectedCta: selectedCta,
    spokenScript: spokenScript,
    captionText: selectedHook + ' ' + selectedCta,
    sceneNotes: [
      'Open on Jordan speaking directly to camera.',
      'Show the product image beside the avatar with safe text above or below the head.',
      'Add a clean product-page CTA end card.'
    ],
    status: 'Script Generated',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function generateAICinematicConcept(product, brief) {
  const hookOptions = buildHookOptions(brief, 'AI Cinematic Viral Commercial');
  const selectedHook = hookOptions[0];
  const ctaOptions = buildCtaOptions(brief);
  return {
    id: 'concept-cinematic-' + slugify(product.productHandle || product.productName),
    campaignId: 'vmc-' + slugify(product.productHandle || product.productName),
    productId: product.id || product.productHandle,
    productHandle: product.productHandle,
    productName: product.productName,
    sku: product.sku || '',
    videoType: 'AI Cinematic Viral Commercial',
    conceptTitle: product.productName + ' | Premium Viral Commercial',
    hookOptions: hookOptions,
    selectedHook: selectedHook,
    ctaOptions: ctaOptions,
    sceneList: [
      { scene: 1, description: 'Fast premium opener with product silhouette and kinetic typography.' },
      { scene: 2, description: 'Macro product hero shot with motion blur and glowing highlight pass.' },
      { scene: 3, description: 'Ingredient or benefit visualization with clean motion and contrast.' },
      { scene: 4, description: 'Transformation moment with product centered and text safe above/below the face area.' },
      { scene: 5, description: 'End card with CTA and shop link.' }
    ],
    visualStyle: 'cinematic, luxury wellness, fast pacing, premium contrast, electric blue and gold accents',
    motionDirection: 'high-energy cuts, subtle parallax, product hero zooms, and polished typography',
    captionOverlays: [
      'Premium product. Clear routine.',
      'Built for the first scroll stop.',
      'Product-as-hero visual pacing.',
      'Tap to shop the full detail page.'
    ],
    musicSuggestion: 'pulse-driven cinematic percussion with glossy synth accents',
    endCard: 'Shop now and see why it fits the routine',
    status: 'Media Assets Ready',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function scoreCompliance(text) {
  const lower = normalizeText(text).toLowerCase();
  const bannedPatterns = [
    'cure', 'treat', 'diagnose', 'prevent disease', 'miracle', 'medical', 'guaranteed results', 'heal', 'fat burn', 'advice'
  ];
  let score = 10;
  bannedPatterns.forEach(function (pattern) {
    if (lower.indexOf(pattern) !== -1) score -= 2;
  });
  return clamp(score, 0, 10);
}

function platformFitScore(videoType, platform) {
  const type = normalizeText(videoType).toLowerCase();
  const key = normalizeText(platform).toLowerCase();
  const trustPlatforms = ['facebook feed', 'instagram feed', 'shopify product page', 'email', 'retargeting ads'];
  const cinematicPlatforms = ['tiktok', 'instagram reels', 'youtube shorts', 'pinterest', 'shopify homepage', 'shopify collection page', 'facebook reels'];
  if (type.indexOf('jordan') !== -1) {
    return trustPlatforms.indexOf(key) !== -1 ? 8 : 5;
  }
  return cinematicPlatforms.indexOf(key) !== -1 ? 8 : 5;
}

function scoreCreativeAsset(input) {
  const brief = input.brief || {};
  const product = input.product || {};
  const videoType = normalizeText(input.videoType || brief.videoType || 'Jordan Avatar Trust Video');
  const platform = normalizeText(input.platform || (Array.isArray(brief.platformPriority) && brief.platformPriority[0] && brief.platformPriority[0].platform) || '');
  const hook = normalizeText(input.selectedHook || input.hook || brief.suggestedHook || '');
  const cta = normalizeText(input.selectedCta || input.cta || brief.suggestedCTA || '');
  const script = normalizeText(input.spokenScript || input.script || input.scriptText || '');
  const concept = input.concept || {};
  const conceptText = normalizeText((Array.isArray(concept.captionOverlays) ? concept.captionOverlays.join(' ') : '') + ' ' + (concept.visualStyle || '') + ' ' + (concept.motionDirection || '') + ' ' + (Array.isArray(concept.sceneList) ? concept.sceneList.map(function (scene) { return scene.description || ''; }).join(' ') : ''));
  const combined = [hook, cta, script, conceptText, brief.productName || product.productName || product.title || ''].join(' ');
  const lower = combined.toLowerCase();
  const wordCount = combined.split(/\s+/).filter(Boolean).length;
  const sentenceCount = combined.split(/[.!?]+/).map(normalizeText).filter(Boolean).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;

  const hookStrength = clamp((/\?|why|how|stop|watch|meet|new|premium|simple/i.test(hook) ? 9 : 6) + (hook.length <= 75 ? 3 : 0) + (hook.split(/\s+/).length <= 10 ? 3 : 0), 0, 15);
  const firstThreeSecondImpact = clamp((hookStrength * 0.7) + (hook.length <= 60 ? 2 : 0), 0, 10);
  const visualMotionStrength = clamp((normalizeText(videoType).toLowerCase().indexOf('cinematic') !== -1 ? 8 : 5) + (/\b(scene|shot|motion|zoom|cut|macro|hero)\b/i.test(conceptText) ? 2 : 0), 0, 10);
  const productClarity = clamp((lower.indexOf((brief.productName || product.productName || product.title || '').toLowerCase()) !== -1 ? 7 : 4) + (brief.productHandle ? 2 : 0), 0, 10);
  const benefitClarity = clamp((/\b(support|helps|maintain|designed to support|premium routine)\b/i.test(lower) ? 6 : 3) + (Array.isArray(brief.topBenefits) ? Math.min(2, brief.topBenefits.length) : 0), 0, 8);
  const ctaStrength = clamp((cta ? 5 : 0) + (/\b(shop|tap|view|learn|see|get)\b/i.test(cta) ? 2 : 0) + (cta.length < 100 ? 1 : 0), 0, 8);
  const captionReadability = clamp(avgSentenceLength <= 12 ? 6 : avgSentenceLength <= 16 ? 5 : avgSentenceLength <= 20 ? 4 : 2, 0, 6);
  const emotionalPull = clamp((/\b(confidence|relief|momentum|trust|clarity|premium|energ|glow|calm)\b/i.test(lower) ? 6 : 3) + (hook.indexOf('!') !== -1 ? 1 : 0), 0, 8);
  const platformFit = clamp(platformFitScore(videoType, platform), 0, 8);
  const trendAlignment = clamp((normalizeText(videoType).toLowerCase().indexOf('cinematic') !== -1 ? 5 : 3) + (/\b(viral|thumb|scroll|premium|kinetic|fast)\b/i.test(lower) ? 1 : 0), 0, 5);
  const brandConsistency = clamp((/\b(premium|confident|trustworthy|clear|executive|premium)\b/i.test(lower) ? 4 : 2) + (normalizeText(brief.tone).toLowerCase().indexOf('premium') !== -1 ? 1 : 0), 0, 5);
  const complianceSafety = scoreCompliance(lower);
  const rewatchPotential = clamp((normalizeText(videoType).toLowerCase().indexOf('cinematic') !== -1 ? 4 : 2) + (/\b(reveal|transformation|hero|before|after|watch)\b/i.test(lower) ? 1 : 0), 0, 5);
  const sharePotential = clamp((hookStrength > 10 ? 4 : 2) + (/\b(viral|wow|stop|share|bigger)\b/i.test(lower) ? 1 : 0), 0, 5);
  const conversionPotential = clamp((ctaStrength + productClarity + benefitClarity + complianceSafety + platformFit) / 5 * 10, 0, 10);

  const rawTotal = hookStrength + firstThreeSecondImpact + visualMotionStrength + productClarity + benefitClarity + ctaStrength + captionReadability + emotionalPull + platformFit + trendAlignment + brandConsistency + complianceSafety + rewatchPotential + sharePotential + conversionPotential;
  const viralScore = Math.round(rawTotal * (100 / 123));
  const conversionScore = Math.round((ctaStrength + productClarity + benefitClarity + complianceSafety + platformFit) / 41 * 100);
  const engagementScore = Math.round((hookStrength + firstThreeSecondImpact + visualMotionStrength + emotionalPull + rewatchPotential + sharePotential) / 53 * 100);
  return {
    hookStrength: hookStrength,
    firstThreeSecondImpact: firstThreeSecondImpact,
    visualMotionStrength: visualMotionStrength,
    productClarity: productClarity,
    benefitClarity: benefitClarity,
    ctaStrength: ctaStrength,
    captionReadability: captionReadability,
    emotionalPull: emotionalPull,
    platformFit: platformFit,
    trendAlignment: trendAlignment,
    brandConsistency: brandConsistency,
    complianceSafety: complianceSafety,
    rewatchPotential: rewatchPotential,
    sharePotential: sharePotential,
    conversionPotential: conversionPotential,
    viralScore: clamp(viralScore, 0, 100),
    conversionScore: clamp(conversionScore, 0, 100),
    engagementScore: clamp(engagementScore, 0, 100)
  };
}

function buildExportMatrix(product, campaignId) {
  return EXPORT_FORMATS.map(function (entry) {
    return {
      id: 'export-' + entry.exportType + '-' + slugify(product.productHandle || product.productName || campaignId),
      campaignId: campaignId,
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      aspectRatio: entry.aspectRatio,
      width: entry.width,
      height: entry.height,
      exportType: entry.exportType,
      exportLabel: entry.label,
      fileUrl: '',
      storageUrl: '',
      status: 'Media Assets Ready',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  });
}

function buildPublishingPlan(product, campaignId, videoType) {
  const platforms = buildPlatformPriority(videoType);
  return platforms.map(function (item, index) {
    return {
      id: 'publish-' + slugify(product.productHandle || product.productName) + '-' + slugify(item.platform),
      campaignId: campaignId,
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      videoType: videoType,
      platform: item.platform,
      preferredAspectRatio: item.aspectRatio,
      idealLengthSeconds: item.idealLengthSeconds,
      caption: product.productName + ' | ' + (item.platform || 'platform'),
      hashtags: ['#IAGT', '#EVICS', '#Shopify', '#' + slugify(product.productName).replace(/-/g, '')],
      cta: 'Tap to view ' + product.productName,
      thumbnailUrl: product.productImageUrl || '',
      scheduledAt: new Date(Date.now() + index * 3600000).toISOString(),
      publishedUrl: '',
      postId: '',
      performanceMetrics: {},
      nextAction: 'Manual approval',
      status: 'Manual Approval',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  });
}

function buildBoardReview(product, videoType, scores, options) {
  const approvalScore = Math.round((scores.viralScore + scores.conversionScore + scores.engagementScore + scores.complianceSafety * 10) / 4);
  const finalDecision = options && options.jordanAvailable === false && normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1
    ? 'Needs Regeneration'
    : approvalScore >= 90
      ? 'Approved'
      : approvalScore >= 70
        ? 'Needs Review'
        : 'Needs Regeneration';
  const generationReason = finalDecision === 'Needs Regeneration'
    ? (options && options.jordanAvailable === false && normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1
      ? 'Jordan avatar is not available in the current HeyGen workspace.'
      : 'Creative score is below the regeneration threshold.')
    : '';
  const roles = [
    { role: 'Brand Strategist', score: scores.brandConsistency, recommendation: 'Keep the premium tone and clear product positioning.' },
    { role: 'Viral Growth Advisor', score: Math.round((scores.hookStrength + scores.firstThreeSecondImpact + scores.sharePotential) / 3), recommendation: 'Strengthen the first three seconds and add one stronger curiosity hook.' },
    { role: 'Supplement Compliance Advisor', score: scores.complianceSafety, recommendation: 'Keep all language support-based and avoid medical claims.' },
    { role: 'Product Positioning Advisor', score: scores.productClarity, recommendation: 'Show the product name and what it solves immediately.' },
    { role: 'Conversion Copywriter', score: scores.conversionPotential, recommendation: 'Make the CTA direct and visible in the last card.' },
    { role: 'Creative Director', score: scores.visualMotionStrength, recommendation: 'Keep motion premium and avoid clutter.' },
    { role: 'Platform Algorithm Analyst', score: scores.platformFit, recommendation: 'Match the platform format to the video type.' },
    { role: 'Customer Psychology Advisor', score: scores.emotionalPull, recommendation: 'Lead with confidence, clarity, and low friction.' },
    { role: 'Shopify Sales Advisor', score: scores.conversionScore / 10, recommendation: 'Attach the product page link and maintain purchase confidence.' },
    { role: 'AI Workflow Optimizer', score: scores.engagementScore / 10, recommendation: 'Use the top-performing structure as the template for scaling.' }
  ];
  const recommendations = roles.map(function (item) { return item.recommendation; });
  const revisedHook = scores.hookStrength < 10 ? 'Lead with a faster, more specific hook for ' + product.productName + '.' : '';
  const revisedCta = scores.ctaStrength < 6 ? 'Use a shorter CTA with a direct product-page action.' : '';
  const revisedPlatformStrategy = normalizeText(videoType).toLowerCase().indexOf('jordan') !== -1
    ? 'Prioritize Facebook Feed, Instagram Feed, Shopify Product Page, and Retargeting.'
    : 'Prioritize TikTok, Reels, Shorts, and Pinterest for discovery.';
  return {
    id: 'board-' + slugify(product.productHandle || product.productName) + '-' + slugify(videoType),
    campaignId: 'vmc-' + slugify(product.productHandle || product.productName),
    productId: product.id,
    productHandle: product.productHandle,
    productName: product.productName,
    sku: product.sku || '',
    videoType: videoType,
    approvalScore: clamp(approvalScore, 0, 100),
    recommendedImprovements: recommendations,
    revisedHook: revisedHook,
    revisedCta: revisedCta,
    revisedPlatformStrategy: revisedPlatformStrategy,
    regenerationReason: generationReason,
    finalPublishDecision: finalDecision,
    roles: roles,
    status: finalDecision === 'Approved' ? 'Approved' : finalDecision === 'Needs Review' ? 'Needs Review' : 'Needs Regeneration',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function buildLearningLoopInsight(product, campaignId, videoType, scores, boardReview) {
  const strongestMetric = scores.viralScore >= scores.conversionScore && scores.viralScore >= scores.engagementScore ? 'viral_score' : scores.conversionScore >= scores.engagementScore ? 'conversion_score' : 'engagement_score';
  const answer = strongestMetric === 'viral_score'
    ? 'Hook and platform fit were the strongest signals.'
    : strongestMetric === 'conversion_score'
      ? 'CTA clarity and product clarity were strongest.'
      : 'Engagement and motion were strongest.';
  return {
    id: 'insight-' + slugify(product.productHandle || product.productName) + '-' + slugify(videoType),
    campaignId: campaignId,
    productId: product.id,
    productHandle: product.productHandle,
    productName: product.productName,
    sku: product.sku || '',
    videoType: videoType,
    question: 'Which direction performed best for ' + product.productName + '?',
    answer: answer,
    metricName: strongestMetric,
    metricValue: scores[strongestMetric === 'viral_score' ? 'viralScore' : strongestMetric === 'conversion_score' ? 'conversionScore' : 'engagementScore'],
    insightJson: {
      boardDecision: boardReview.finalPublishDecision,
      recommendation: boardReview.recommendedImprovements[0] || '',
      strongestMetric: strongestMetric,
      nextAction: boardReview.finalPublishDecision === 'Approved' ? 'Schedule the approved asset.' : 'Revise the creative and regenerate.'
    },
    status: 'Learning Loop Updated',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function buildRenderJobs(product, campaignId, jordanScript, aiConcept, scores, options) {
  const jordanAvailable = options && options.jordanAvailable === true;
  const launchRendering = options && options.launchRendering === true;
  const jordanStatus = jordanAvailable ? (launchRendering ? 'Rendering' : 'Media Assets Ready') : 'Needs Regeneration';
  const cinematicStatus = launchRendering ? 'Rendering' : 'Media Assets Ready';
  return [
    {
      id: 'job-jordan-' + slugify(product.productHandle || product.productName),
      campaignId: campaignId,
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      jobType: 'Jordan Avatar Trust Video',
      provider: 'heygen',
      jobPayload: {
        avatarId: jordanScript.avatarId,
        voiceId: jordanScript.voiceId,
        script: jordanScript.spokenScript,
        selectedHook: jordanScript.selectedHook,
        selectedCta: jordanScript.selectedCta
      },
      externalJobId: '',
      jobStatus: jordanStatus,
      status: jordanStatus,
      retryCount: 0,
      renderStatus: jordanStatus,
      reason: jordanAvailable ? '' : 'Jordan avatar must be recreated before render can start.',
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: 'job-cinematic-' + slugify(product.productHandle || product.productName),
      campaignId: campaignId,
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      jobType: 'AI Cinematic Viral Commercial',
      provider: 'quality-bits',
      jobPayload: {
        conceptTitle: aiConcept.conceptTitle,
        hook: aiConcept.selectedHook,
        sceneList: aiConcept.sceneList,
        visualStyle: aiConcept.visualStyle,
        motionDirection: aiConcept.motionDirection
      },
      externalJobId: '',
      jobStatus: cinematicStatus,
      status: cinematicStatus,
      retryCount: 0,
      renderStatus: cinematicStatus,
      reason: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ];
}

function buildMediaLibraryItems(state) {
  const items = [];
  state.videoCampaigns.forEach(function (campaign) {
    items.push({
      id: 'library-' + campaign.campaignId,
      campaignId: campaign.campaignId,
      productId: campaign.productId,
      productHandle: campaign.productHandle,
      productName: campaign.productName,
      sku: campaign.sku || '',
      videoType: campaign.videoType,
      platform: Array.isArray(campaign.platformPriority) && campaign.platformPriority.length ? campaign.platformPriority[0].platform : '',
      aspectRatio: Array.isArray(campaign.platformPriority) && campaign.platformPriority.length ? campaign.platformPriority[0].aspectRatio : '9:16',
      status: campaign.status,
      viralScore: campaign.viralScore,
      conversionScore: campaign.conversionScore,
      engagementScore: campaign.engagementScore,
      boardReviewStatus: campaign.boardReviewStatus,
      learningLoopStatus: campaign.learningLoopStatus,
      createdAt: campaign.createdAt,
      nextAction: campaign.nextRecommendedAction
    });
  });
  state.renders.forEach(function (render) {
    items.push({
      id: 'render-' + render.id,
      campaignId: render.campaignId,
      productId: render.productId,
      productHandle: render.productHandle,
      productName: render.productName,
      sku: render.sku || '',
      videoType: render.jobType,
      platform: '',
      aspectRatio: '',
      status: render.status,
      viralScore: 0,
      conversionScore: 0,
      engagementScore: 0,
      boardReviewStatus: '',
      learningLoopStatus: '',
      createdAt: render.createdAt,
      nextAction: render.reason || ''
    });
  });
  (Array.isArray(state.similarAds) ? state.similarAds : []).forEach(function (reference) {
    items.push({
      id: 'similar-' + reference.id,
      campaignId: reference.campaignId || '',
      productId: reference.productId,
      productHandle: reference.productHandle,
      productName: reference.productName,
      sku: reference.sku || '',
      videoType: reference.formatLabel || 'Reference',
      platform: reference.sourcePlatform,
      aspectRatio: '',
      status: reference.status || 'Scraped Similar Ad',
      viralScore: reference.aiScore || 0,
      conversionScore: reference.similarityScore || 0,
      engagementScore: reference.engagementScore || 0,
      boardReviewStatus: reference.aiGrade || '',
      learningLoopStatus: reference.selectedForScript ? 'Primary Reference' : 'Reference',
      createdAt: reference.createdAt,
      nextAction: reference.sourceUrl || ''
    });
  });
  return items.sort(function (a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function upsertById(list, item) {
  const index = list.findIndex(function (entry) {
    return entry && item && entry.id === item.id;
  });
  if (index === -1) {
    list.push(item);
    return list;
  }
  list[index] = item;
  return list;
}

function buildCampaignFromProduct(product, rank, options) {
  const campaignId = 'vmc-' + slugify(product.productHandle || product.productName);
  const brief = generateCreativeBrief(product, rank, { videoType: 'Jordan Avatar Trust Video' });
  const jordanScript = generateJordanTrustScript(product, brief, options);
  const aiConcept = generateAICinematicConcept(product, brief);
  const jordanScores = scoreCreativeAsset({
    brief: brief,
    product: product,
    videoType: 'Jordan Avatar Trust Video',
    platform: 'Facebook Feed',
    selectedHook: jordanScript.selectedHook,
    selectedCta: jordanScript.selectedCta,
    spokenScript: jordanScript.spokenScript
  });
  const aiScores = scoreCreativeAsset({
    brief: brief,
    product: product,
    videoType: 'AI Cinematic Viral Commercial',
    platform: 'TikTok',
    selectedHook: aiConcept.selectedHook,
    selectedCta: aiConcept.ctaOptions[0],
    concept: aiConcept
  });
  const exports = buildExportMatrix(product, campaignId);
  const publishingJordan = buildPublishingPlan(product, campaignId, 'Jordan Avatar Trust Video');
  const publishingCinematic = buildPublishingPlan(product, campaignId, 'AI Cinematic Viral Commercial');
  const boardJordan = buildBoardReview(product, 'Jordan Avatar Trust Video', jordanScores, options || {});
  const boardCinematic = buildBoardReview(product, 'AI Cinematic Viral Commercial', aiScores, options || {});
  const learningJordan = buildLearningLoopInsight(product, campaignId, 'Jordan Avatar Trust Video', jordanScores, boardJordan);
  const learningCinematic = buildLearningLoopInsight(product, campaignId, 'AI Cinematic Viral Commercial', aiScores, boardCinematic);
  const renderJobs = buildRenderJobs(product, campaignId, jordanScript, aiConcept, jordanScores, options || {});
  const productStatus = renderJobs[0].status === 'Needs Regeneration' ? 'Needs Regeneration' : 'Media Assets Ready';
  const nextAction = renderJobs[0].status === 'Needs Regeneration'
    ? 'Recreate Jordan avatar in HeyGen and regenerate trust video.'
    : 'Queue render jobs and submit approved assets.';
  return {
    product: {
      id: product.id,
      shopifyProductId: product.shopifyProductId || product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      collectionName: product.collectionName || 'Best Sellers',
      productCategory: product.productCategory || inferCategory(product),
      bestSellerRank: rank,
      productImageUrl: product.productImageUrl || '',
      productPageUrl: product.productPageUrl || '',
      status: productStatus,
      jordanVideoStatus: renderJobs[0].status,
      aiCinematicStatus: renderJobs[1].status,
      exportFormats: EXPORT_FORMATS.map(function (entry) { return entry.aspectRatio; }),
      publishedPlatforms: publishingJordan.map(function (item) { return item.platform; }).concat(publishingCinematic.map(function (item) { return item.platform; })),
      viralScore: Math.max(jordanScores.viralScore, aiScores.viralScore),
      conversionScore: Math.max(jordanScores.conversionScore, aiScores.conversionScore),
      engagementScore: Math.max(jordanScores.engagementScore, aiScores.engagementScore),
      boardReviewStatus: boardJordan.status === 'Approved' && boardCinematic.status === 'Approved' ? 'Approved' : 'Needs Review',
      learningLoopStatus: 'Learning Loop Updated',
      lastGeneratedAt: nowIso(),
      nextRecommendedAction: nextAction,
      campaignId: campaignId,
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    campaign: {
      id: campaignId,
      productId: product.id,
      productHandle: product.productHandle,
      productName: product.productName,
      sku: product.sku || '',
      collectionName: product.collectionName || 'Best Sellers',
      productCategory: product.productCategory || inferCategory(product),
      bestSellerRank: rank,
      publishMode: 'Manual Approval',
      videoType: 'Jordan Avatar Trust Video + AI Cinematic Viral Commercial',
      platformPriority: buildPlatformPriority('Jordan Avatar Trust Video'),
      targetPlatforms: buildPlatformPriority('AI Cinematic Viral Commercial'),
      status: productStatus,
      boardReviewStatus: productStatus === 'Needs Regeneration' ? 'Needs Review' : 'Approved',
      learningLoopStatus: 'Learning Loop Updated',
      viralScore: Math.max(jordanScores.viralScore, aiScores.viralScore),
      conversionScore: Math.max(jordanScores.conversionScore, aiScores.conversionScore),
      engagementScore: Math.max(jordanScores.engagementScore, aiScores.engagementScore),
      nextRecommendedAction: nextAction,
      lastGeneratedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    brief: brief,
    jordanScript: jordanScript,
    aiConcept: aiConcept,
    scores: {
      jordan: jordanScores,
      cinematic: aiScores
    },
    exports: exports,
    publishing: publishingJordan.concat(publishingCinematic),
    boardReviews: [boardJordan, boardCinematic],
    learningLoop: [learningJordan, learningCinematic],
    mediaAssets: [
      {
        id: 'asset-product-' + slugify(product.productHandle || product.productName),
        campaignId: campaignId,
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        assetType: 'product_image',
        assetName: product.productName + ' product image',
        sourceUrl: product.productImageUrl || '',
        storageUrl: '',
        previewUrl: product.productImageUrl || '',
        status: 'Media Assets Ready',
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ],
    renderJobs: renderJobs,
    regenerationQueue: renderJobs.filter(function (job) {
      return job.status === 'Needs Regeneration';
    }).map(function (job) {
      return {
        id: 'regen-' + slugify(job.productHandle || job.productName) + '-' + slugify(job.jobType),
        campaignId: campaignId,
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        sku: product.sku || '',
        reason: job.reason || 'Needs regeneration',
        regenerationFocus: job.jobType,
        priority: 90,
        retryCount: 0,
        status: 'Needs Regeneration',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }),
    hookTests: [
      { id: 'hook-' + slugify(product.productHandle || product.productName) + '-1', campaignId: campaignId, productHandle: product.productHandle, productName: product.productName, sku: product.sku || '', videoType: 'Jordan Avatar Trust Video', hookText: jordanScript.hookOptions[0], hookScore: jordanScores.hookStrength, winner: true, status: 'Approved', createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'hook-' + slugify(product.productHandle || product.productName) + '-2', campaignId: campaignId, productHandle: product.productHandle, productName: product.productName, sku: product.sku || '', videoType: 'AI Cinematic Viral Commercial', hookText: aiConcept.hookOptions[0], hookScore: aiScores.hookStrength, winner: true, status: 'Approved', createdAt: nowIso(), updatedAt: nowIso() }
    ],
    ctaTests: [
      { id: 'cta-' + slugify(product.productHandle || product.productName) + '-1', campaignId: campaignId, productHandle: product.productHandle, productName: product.productName, sku: product.sku || '', videoType: 'Jordan Avatar Trust Video', ctaText: jordanScript.ctaOptions[0], ctaScore: jordanScores.ctaStrength, winner: true, status: 'Approved', createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'cta-' + slugify(product.productHandle || product.productName) + '-2', campaignId: campaignId, productHandle: product.productHandle, productName: product.productName, sku: product.sku || '', videoType: 'AI Cinematic Viral Commercial', ctaText: aiConcept.ctaOptions[0], ctaScore: aiScores.ctaStrength, winner: true, status: 'Approved', createdAt: nowIso(), updatedAt: nowIso() }
    ]
  };
}

async function buildBatchCampaigns(limit, options) {
  const max = Number(limit || 25);
  const jordanAvailable = options && typeof options.jordanAvailable === 'boolean' ? options.jordanAvailable : false;
  const launchRendering = options && options.launchRendering === true;
  const selectedProducts = await fetchBestSellingProducts(max);
  const campaigns = [];
  const state = readViralMediaState();
  selectedProducts.forEach(function (product, index) {
    const campaign = buildCampaignFromProduct(product, index + 1, {
      jordanAvailable: jordanAvailable,
      launchRendering: launchRendering,
      jordanAvatar: state.jordanAvatar
    });
    campaigns.push(campaign);
    upsertById(state.products, campaign.product);
    upsertById(state.videoCampaigns, campaign.campaign);
    upsertById(state.briefs, campaign.brief);
    upsertById(state.scripts, campaign.jordanScript);
    upsertById(state.concepts, campaign.aiConcept);
    campaign.mediaAssets.forEach(function (item) { upsertById(state.productMediaAssets, item); });
    campaign.scores.jordan.id = 'score-jordan-' + slugify(product.productHandle || product.productName);
    campaign.scores.jordan.campaignId = campaign.campaign.id;
    campaign.scores.jordan.productId = product.id;
    campaign.scores.jordan.productHandle = product.productHandle;
    campaign.scores.jordan.productName = product.productName;
    campaign.scores.jordan.videoType = 'Jordan Avatar Trust Video';
    campaign.scores.cinematic.id = 'score-cinematic-' + slugify(product.productHandle || product.productName);
    campaign.scores.cinematic.campaignId = campaign.campaign.id;
    campaign.scores.cinematic.productId = product.id;
    campaign.scores.cinematic.productHandle = product.productHandle;
    campaign.scores.cinematic.productName = product.productName;
    campaign.scores.cinematic.videoType = 'AI Cinematic Viral Commercial';
    upsertById(state.scores, Object.assign({ id: campaign.scores.jordan.id }, campaign.scores.jordan));
    upsertById(state.scores, Object.assign({ id: campaign.scores.cinematic.id }, campaign.scores.cinematic));
    campaign.exports.forEach(function (item) { upsertById(state.exports, item); });
    campaign.publishing.forEach(function (item) { upsertById(state.publishing, item); });
    campaign.boardReviews.forEach(function (item) { upsertById(state.boardReviews, item); });
    campaign.learningLoop.forEach(function (item) { upsertById(state.learningLoop, item); });
    campaign.renderJobs.forEach(function (item) { upsertById(state.renders, item); upsertById(state.mediaGenerationJobs, item); });
    campaign.regenerationQueue.forEach(function (item) { upsertById(state.regenerationQueue, item); });
    campaign.hookTests.forEach(function (item) { upsertById(state.hookTests, item); });
    campaign.ctaTests.forEach(function (item) { upsertById(state.ctaTests, item); });
  });
  state.generatedAt = state.generatedAt || nowIso();
  state.updatedAt = nowIso();
  state.summary = computeSummary(state);
  writeViralMediaState(state);
  return {
    generatedAt: state.generatedAt,
    updatedAt: state.updatedAt,
    count: campaigns.length,
    jordanAvatarAvailable: jordanAvailable,
    launchRendering: launchRendering,
    campaigns: campaigns,
    summary: state.summary
  };
}

function computeSummary(state) {
  const products = Array.isArray(state.products) ? state.products : [];
  const campaigns = Array.isArray(state.videoCampaigns) ? state.videoCampaigns : [];
  const briefs = Array.isArray(state.briefs) ? state.briefs : [];
  const scripts = Array.isArray(state.scripts) ? state.scripts : [];
  const renders = Array.isArray(state.renders) ? state.renders : [];
  const learningLoop = Array.isArray(state.learningLoop) ? state.learningLoop : [];
  const regenerationQueue = Array.isArray(state.regenerationQueue) ? state.regenerationQueue : [];
  const similarAds = Array.isArray(state.similarAds) ? state.similarAds : [];
  const counts = {
    totalProducts: products.length,
    totalSimilarAds: similarAds.length,
    briefGenerated: briefs.filter(function (item) { return normalizeText(item.status).toLowerCase().indexOf('brief') !== -1; }).length,
    scriptsGenerated: scripts.filter(function (item) { return normalizeText(item.status).toLowerCase().indexOf('script') !== -1; }).length,
    mediaAssetsReady: campaigns.filter(function (item) { return normalizeText(item.status).toLowerCase().indexOf('media assets ready') !== -1; }).length,
    rendering: renders.filter(function (item) { return normalizeText(item.renderStatus || item.status).toLowerCase() === 'rendering'; }).length,
    renderComplete: renders.filter(function (item) { return normalizeText(item.renderStatus || item.status).toLowerCase().indexOf('complete') !== -1; }).length,
    needsReview: campaigns.filter(function (item) { return normalizeText(item.boardReviewStatus).toLowerCase().indexOf('review') !== -1; }).length,
    approved: campaigns.filter(function (item) { return normalizeText(item.boardReviewStatus).toLowerCase() === 'approved'; }).length,
    scheduled: Array.isArray(state.publishing) ? state.publishing.filter(function (item) { return normalizeText(item.status).toLowerCase().indexOf('schedule') !== -1; }).length : 0,
    published: Array.isArray(state.publishing) ? state.publishing.filter(function (item) { return normalizeText(item.status).toLowerCase() === 'published'; }).length : 0,
    learningLoopUpdated: learningLoop.filter(function (item) { return normalizeText(item.status).toLowerCase().indexOf('learning') !== -1; }).length,
    needsRegeneration: regenerationQueue.length
  };
  return counts;
}

function getDashboardSnapshot(state) {
  const current = normalizeState(state || readViralMediaState());
  return {
    version: current.version,
    generatedAt: current.generatedAt,
    updatedAt: current.updatedAt,
    publishingMode: current.publishingMode,
    jordanAvatar: current.jordanAvatar,
    summary: current.summary,
    products: current.products,
    similarAds: current.similarAds,
    productMediaAssets: current.productMediaAssets,
    videoCampaigns: current.videoCampaigns,
    briefs: current.briefs,
    scripts: current.scripts,
    concepts: current.concepts,
    scores: current.scores,
    renders: current.renders,
    exports: current.exports,
    publishing: current.publishing,
    performanceMetrics: current.performanceMetrics,
    learningLoop: current.learningLoop,
    boardReviews: current.boardReviews,
    creativeTemplates: current.creativeTemplates,
    hookTests: current.hookTests,
    ctaTests: current.ctaTests,
    audienceSegments: current.audienceSegments,
    mediaGenerationJobs: current.mediaGenerationJobs,
    regenerationQueue: current.regenerationQueue,
    mediaLibrary: buildMediaLibraryItems(current)
  };
}

module.exports = {
  STATE_PATH,
  SHOPIFY_DOMAIN,
  JORDAN_AVATAR_ID,
  JORDAN_VOICE_ID,
  EXPORT_FORMATS,
  PLATFORM_RULES,
  readViralMediaState,
  writeViralMediaState,
  updateViralMediaState,
  fetchBestSellingProducts,
  generateCreativeBrief,
  generateJordanTrustScript,
  generateAICinematicConcept,
  scoreCreativeAsset,
  buildExportMatrix,
  buildPublishingPlan,
  buildBoardReview,
  buildLearningLoopInsight,
  buildRenderJobs,
  buildMediaLibraryItems,
  buildCampaignFromProduct,
  buildBatchCampaigns,
  scrapeSimilarAdsForProduct,
  scrapeSimilarAdsForCatalog,
  getSimilarAds,
  buildScriptReferenceDecision,
  computeSummary,
  getDashboardSnapshot,
  normalizeProductRecord,
  buildPlatformPriority,
  buildVideoTypeRecommendation,
  buildSeedTemplates,
  buildSeedAudienceSegments
};
