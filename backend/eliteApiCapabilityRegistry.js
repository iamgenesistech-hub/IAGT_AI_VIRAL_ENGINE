'use strict';

const API_CAPABILITY_REGISTRY = [
  {
    id: 'shopify',
    label: 'Shopify Admin API',
    category: 'commerce',
    stages: ['product-intelligence', 'product-url', 'catalog-sync'],
    strengths: ['canonical product truth', 'product images', 'variants/pricing', 'collections', 'product URLs'],
    envNames: ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_API_VERSION', 'SHOPIFY_STORE', 'SHOPIFY_SHOP'],
    minimumAny: ['SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_ACCESS_TOKEN'],
    minimumAll: ['SHOPIFY_STORE_DOMAIN']
  },
  {
    id: 'supabase',
    label: 'Supabase',
    category: 'database',
    stages: ['state', 'intelligence-memory', 'workflow-status', 'realtime-dashboard'],
    strengths: ['single source of truth', 'render records', 'workflow JSON', 'agent memory', 'realtime progress'],
    envNames: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_ANON_KEY'],
    minimumAll: ['SUPABASE_URL'],
    minimumAny: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']
  },
  {
    id: 'openai',
    label: 'OpenAI',
    category: 'reasoning',
    stages: ['trend-synthesis', 'creative-brief', 'script', 'shot-plan', 'quality-vision'],
    strengths: ['strategy', 'structured JSON generation', 'script writing', 'prompt engineering', 'visual QA with vision-capable models'],
    envNames: ['OPENAI_API_KEY', 'OPENAI_SCRIPT_MODEL', 'OPENAI_PROMPT_MODEL', 'OPENAI_ANALYSIS_MODEL', 'OPENAI_COPILOT_MODEL'],
    minimumAll: ['OPENAI_API_KEY']
  },
  {
    id: 'heygen',
    label: 'HeyGen',
    category: 'avatar',
    stages: ['avatar-performance', 'presenter-video', 'voice'],
    strengths: ['spokesperson', 'avatar narration', 'human trust layer', 'custom voices'],
    envNames: ['HEYGEN_API_KEY', 'HEYGEN_ACCESS_TOKEN', 'HEYGEN_OAUTH_BEARER', 'HEYGEN_AVATAR_ID', 'HEYGEN_VOICE_ID', 'REACT_APP_JORDAN_AVATAR_ID', 'REACT_APP_JORDAN_VOICE_ID'],
    minimumAny: ['HEYGEN_API_KEY', 'HEYGEN_ACCESS_TOKEN', 'HEYGEN_OAUTH_BEARER']
  },
  {
    id: 'kling',
    label: 'Kling AI',
    category: 'motion-video',
    stages: ['product-hero-motion', 'label-closeup', 'cinematic-broll', 'motion-background'],
    strengths: ['image-to-video product reveal', 'product close-up', 'cinematic camera motion', 'hero shots'],
    envNames: ['KLING_API_KEY', 'KLING_ACCESS_KEY', 'KLING_SECRET_KEY', 'KLING_API_BASE_URL', 'KLING_BASE_URL', 'KLING_MODEL_NAME', 'KLING_DURATION_SECONDS', 'KLING_MODE', 'KLING_CALLBACK_URL'],
    minimumAny: ['KLING_API_KEY', 'KLING_ACCESS_KEY']
  },
  {
    id: 'aimlapi-seedance',
    label: 'AIMLAPI / Seedance',
    category: 'motion-video',
    stages: ['lifestyle-motion', 'reference-video', 'background-motion', 'scene-extension'],
    strengths: ['lifestyle scene motion', 'reference-image video', 'multi-reference generation', 'atmosphere'],
    envNames: ['AIMLAPI_KEY', 'AIMLAPI_BASE_URL', 'SEEDANCE_API_KEY', 'SEEDANCE_BASE_URL'],
    minimumAny: ['AIMLAPI_KEY', 'SEEDANCE_API_KEY']
  },
  {
    id: 'runway',
    label: 'Runway',
    category: 'motion-video',
    stages: ['cinematic-broll', 'temporal-consistency', 'motion-ab-test'],
    strengths: ['high-end image-to-video', 'temporal consistency', 'commercial cinematic alternatives'],
    envNames: ['RUNWAY_API_KEY'],
    minimumAll: ['RUNWAY_API_KEY']
  },
  {
    id: 'gemini-veo',
    label: 'Gemini / Veo',
    category: 'motion-video-and-vision',
    stages: ['cinematic-atmosphere', 'video-extension', 'visual-qa', 'ocr-label-check'],
    strengths: ['cinematic generation', 'video extension', 'native audio options', 'vision QA/OCR'],
    envNames: ['GEMINI_API_KEY', 'REACT_APP_GEMINI_OMNI_API_KEY', 'REACT_APP_VEO3_API_KEY'],
    minimumAny: ['GEMINI_API_KEY', 'REACT_APP_GEMINI_OMNI_API_KEY', 'REACT_APP_VEO3_API_KEY']
  },
  {
    id: 'remove-bg',
    label: 'remove.bg',
    category: 'image-prep',
    stages: ['asset-prep', 'mockup-cleaning', 'transparent-product'],
    strengths: ['background removal', 'transparent product PNG', 'product isolation'],
    envNames: ['REMOVE_BG_API_KEY'],
    minimumAll: ['REMOVE_BG_API_KEY']
  },
  {
    id: 'clipdrop',
    label: 'ClipDrop / Jasper',
    category: 'image-prep',
    stages: ['asset-prep', 'cleanup', 'replace-background', 'mockup-scene'],
    strengths: ['background removal fallback', 'cleanup/inpainting', 'replace background', 'mockup scene prep'],
    envNames: ['CLIPDROP_API_KEY'],
    minimumAll: ['CLIPDROP_API_KEY']
  },
  {
    id: 'canva',
    label: 'Canva Connect',
    category: 'design',
    stages: ['mockup-template', 'thumbnail', 'cta-card', 'static-variants'],
    strengths: ['design templates', 'CTA cards', 'thumbnails', 'brand layouts'],
    envNames: ['CANVA_API_KEY', 'REACT_APP_CANVA_API_KEY'],
    minimumAny: ['CANVA_API_KEY', 'REACT_APP_CANVA_API_KEY']
  },
  {
    id: 'predis',
    label: 'Predis.ai',
    category: 'social-content',
    stages: ['captions', 'hashtags', 'post-variants', 'platform-copy'],
    strengths: ['social copy', 'caption variants', 'hashtags', 'platform repurposing'],
    envNames: ['PREDIS_AI_API_KEY', 'REACT_APP_PREDIS_AI_API_KEY'],
    minimumAny: ['PREDIS_AI_API_KEY', 'REACT_APP_PREDIS_AI_API_KEY']
  },
  {
    id: 'vizard',
    label: 'Vizard',
    category: 'repurposing',
    stages: ['clip-repurposing', 'captions', 'publishing-schedule'],
    strengths: ['viral moment extraction', 'short clip variants', 'captions', 'social scheduling'],
    envNames: ['VIZARD_API_KEY', 'REACT_APP_VIZARD_API_KEY'],
    minimumAny: ['VIZARD_API_KEY', 'REACT_APP_VIZARD_API_KEY']
  },
  {
    id: 'apify',
    label: 'Apify',
    category: 'trend-intelligence',
    stages: ['trend-scrape', 'competitor-ads', 'tiktok-instagram-intel'],
    strengths: ['TikTok trend scraping', 'Instagram scraping', 'Meta ad intelligence', 'competitor monitoring'],
    envNames: ['APIFY_API_KEY'],
    minimumAll: ['APIFY_API_KEY']
  },
  {
    id: 'meta',
    label: 'Meta Marketing API',
    category: 'ads-publishing',
    stages: ['ad-intelligence', 'campaign-creation', 'publishing'],
    strengths: ['ad campaign creation', 'creative testing', 'paid distribution', 'competitor intelligence when paired with Apify'],
    envNames: ['META_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN', 'TIKTOK_CLIENT_SECRET'],
    minimumAny: ['META_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN']
  },
  {
    id: 'stripe',
    label: 'Stripe',
    category: 'billing',
    stages: ['quota', 'billing', 'subscription', 'usage-metering'],
    strengths: ['plans', 'video quota', 'subscription gating', 'usage billing'],
    envNames: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_CREATOR', 'STRIPE_PRICE_ELITE'],
    minimumAll: ['STRIPE_SECRET_KEY']
  },
  {
    id: 'gcs',
    label: 'Google Cloud Storage',
    category: 'storage',
    stages: ['asset-storage', 'final-persistence', 'cdn-source'],
    strengths: ['raw assets', 'intermediate clips', 'master renders', 'persistent final URLs'],
    envNames: ['GCS_BUCKET', 'DEFAULT_GCS_BUCKET', 'GCS_PUBLIC_BASE_URL', 'MEDIA_PUBLIC_BASE_URL', 'MEDIA_CDN_BASE_URL', 'MEDIA_ASSET_BASE_URL'],
    minimumAny: ['GCS_BUCKET', 'DEFAULT_GCS_BUCKET']
  },
  {
    id: 'cloud-tasks',
    label: 'Google Cloud Tasks',
    category: 'orchestration',
    stages: ['async-workflow', 'retries', 'stage-fanout'],
    strengths: ['pipeline stage queue', 'retry control', 'fan-out/fan-in', 'long-running render orchestration'],
    envNames: ['GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'QUEUE_REGION', 'RENDER_HANDLER_URL', 'RENDER_WORKER_SA'],
    minimumAny: ['GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT']
  },
  {
    id: 'ffmpeg',
    label: 'FFmpeg',
    category: 'editor',
    stages: ['assembly', 'overlay', 'audio-normalization', 'format-export', 'qa-probe'],
    strengths: ['clip stitching', 'product overlay', 'CTA card', 'color grade', 'format variants', 'ffprobe QA'],
    envNames: [],
    runtimeBinary: 'ffmpeg',
    alwaysAvailableInContainer: true
  }
];

function normalizeName(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

function normalizeSecretNames(secretNames = []) {
  return new Set(secretNames.map(normalizeName).filter(Boolean));
}

function hasAny(names, available) {
  return Array.isArray(names) && names.some((name) => available.has(normalizeName(name)));
}

function hasAll(names, available) {
  return !Array.isArray(names) || names.length === 0 || names.every((name) => available.has(normalizeName(name)));
}

function buildAvailableNameSet(env = process.env, secretNames = []) {
  const names = normalizeSecretNames(secretNames);
  Object.keys(env || {}).forEach((name) => names.add(normalizeName(name)));
  return names;
}

function evaluateCapability(entry, availableNames) {
  const minimumAny = Array.isArray(entry.minimumAny) ? entry.minimumAny : [];
  const minimumAll = Array.isArray(entry.minimumAll) ? entry.minimumAll : [];
  const configured = entry.alwaysAvailableInContainer || ((minimumAny.length ? hasAny(minimumAny, availableNames) : true) && hasAll(minimumAll, availableNames));
  const presentNames = (entry.envNames || []).filter((name) => availableNames.has(normalizeName(name)));
  const missingAny = minimumAny.length && !hasAny(minimumAny, availableNames) ? minimumAny : [];
  const missingAll = minimumAll.filter((name) => !availableNames.has(normalizeName(name)));
  return {
    id: entry.id,
    label: entry.label,
    category: entry.category,
    configured: Boolean(configured),
    stages: entry.stages || [],
    strengths: entry.strengths || [],
    presentSecretNames: presentNames,
    requiredAny: minimumAny,
    requiredAll: minimumAll,
    missingAny,
    missingAll,
    runtimeBinary: entry.runtimeBinary || null
  };
}

function getApiCapabilityReport({ env = process.env, secretNames = [] } = {}) {
  const availableNames = buildAvailableNameSet(env, secretNames);
  const capabilities = API_CAPABILITY_REGISTRY.map((entry) => evaluateCapability(entry, availableNames));
  const configured = capabilities.filter((entry) => entry.configured);
  return {
    generatedAt: new Date().toISOString(),
    secretNames: Array.from(availableNames).sort(),
    totalCapabilities: capabilities.length,
    configuredCount: configured.length,
    missingCount: capabilities.length - configured.length,
    capabilities,
    byStage: buildStageMap(capabilities)
  };
}

function buildStageMap(capabilities) {
  const map = {};
  for (const capability of capabilities) {
    for (const stage of capability.stages || []) {
      if (!map[stage]) map[stage] = [];
      map[stage].push({ id: capability.id, configured: capability.configured, label: capability.label });
    }
  }
  return map;
}

function pickFirstConfigured(capabilities, ids) {
  return ids.map((id) => capabilities.find((entry) => entry.id === id && entry.configured)).find(Boolean) || null;
}

function buildToolRoutingPlan({ env = process.env, secretNames = [] } = {}) {
  const report = getApiCapabilityReport({ env, secretNames });
  const caps = report.capabilities;
  return {
    report,
    route: {
      productIntelligence: pickFirstConfigured(caps, ['shopify']),
      state: pickFirstConfigured(caps, ['supabase']),
      reasoning: pickFirstConfigured(caps, ['openai']),
      trendIntelligence: pickFirstConfigured(caps, ['apify', 'openai']),
      assetPrep: pickFirstConfigured(caps, ['remove-bg', 'clipdrop', 'ffmpeg']),
      design: pickFirstConfigured(caps, ['canva', 'clipdrop', 'openai']),
      presenter: pickFirstConfigured(caps, ['heygen']),
      productMotion: pickFirstConfigured(caps, ['kling', 'aimlapi-seedance', 'runway', 'gemini-veo']),
      lifestyleMotion: pickFirstConfigured(caps, ['aimlapi-seedance', 'kling', 'runway', 'gemini-veo']),
      visualQa: pickFirstConfigured(caps, ['gemini-veo', 'openai']),
      editor: pickFirstConfigured(caps, ['ffmpeg']),
      repurpose: pickFirstConfigured(caps, ['vizard', 'predis', 'ffmpeg']),
      publishing: pickFirstConfigured(caps, ['meta', 'vizard', 'predis']),
      billing: pickFirstConfigured(caps, ['stripe']),
      persistence: pickFirstConfigured(caps, ['gcs', 'supabase'])
    }
  };
}

module.exports = {
  API_CAPABILITY_REGISTRY,
  getApiCapabilityReport,
  buildToolRoutingPlan,
  normalizeSecretNames
};
