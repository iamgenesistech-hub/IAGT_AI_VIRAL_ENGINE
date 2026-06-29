// ============================================================
// IAGT / EVICS — Dashboard Configuration
// dashboard/control-center/config.js
//
// Supabase credentials are read from this file by supabase.js
// via window.IAGT_CONFIG. All other API keys are consumed by
// the Node.js backend through process.env — set them in your
// Railway environment or local .env file, never hard-code them.
// ============================================================

// ------------------------------------------------------------------
// Supabase Configuration
// Populated at runtime from environment variables injected by the
// build/deploy pipeline, or left empty to run in Demo mode.
// ------------------------------------------------------------------
// Helper: safely read from localStorage without throwing in restricted contexts
function _lsGet(key) {
  try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
}

window.IAGT_CONFIG = {
  supabaseUrl:     (typeof process !== "undefined" && process.env && process.env.REACT_APP_SUPABASE_URL)     ||
                   _lsGet("evics_supabase_url") || "",
  supabaseAnonKey: (typeof process !== "undefined" && process.env && process.env.REACT_APP_SUPABASE_ANON_KEY) ||
                   _lsGet("evics_supabase_anon_key") || "",
};

// ------------------------------------------------------------------
// External API registry (reference / feature-flag use only)
// Actual secret keys MUST be set as Railway / .env variables on the
// backend. These objects document endpoints and current status so
// the frontend can conditionally enable UI features.
// ------------------------------------------------------------------
window.IAGT_EXTERNAL_APIS = {

  // ── Video Generation ──────────────────────────────────────────
  heygen: {
    endpoint:    "https://api.heygen.com/v2",
    envKey:      "HEYGEN_API_KEY",
    status:      "configured",
    description: "HeyGen avatar & spokesperson video generation",
  },
  runway: {
    endpoint:    "https://api.runwayml.com/v1",
    envKey:      "RUNWAY_API_KEY",
    status:      "configured",
    description: "Runway ML image-to-video generation",
  },
  kling: {
    endpoint:    "https://api.klingai.com/v1",
    envKey:      "KLING_API_KEY",
    status:      "configured",
    description: "Kling AI text-to-video generation",
  },
  veo3: {
    endpoint:    "https://api.veo3.ai/v1",
    envKey:      "REACT_APP_VEO3_API_KEY",
    status:      "placeholder",
    description: "Google Veo 3 video generation",
  },

  // ── Design & Image ────────────────────────────────────────────
  canva: {
    endpoint:    "https://api.canva.com/v1",
    envKey:      "REACT_APP_CANVA_API_KEY",
    status:      "placeholder",
    description: "Canva bulk design template generation",
  },
  pixa: {
    endpoint:    "https://api.pixa.ai/v1",
    envKey:      "REACT_APP_PIXA_API_KEY",
    status:      "placeholder",
    description: "Pixa AI image generation",
  },

  // ── AI / Language Models ──────────────────────────────────────
  geminiOmni: {
    endpoint:    "https://generativelanguage.googleapis.com/v1beta",
    envKey:      "REACT_APP_GEMINI_OMNI_API_KEY",
    status:      "placeholder",
    description: "Google Gemini Omni multimodal AI",
  },
  openai: {
    endpoint:    "https://api.openai.com/v1",
    envKey:      "OPENAI_API_KEY",
    model:       "gpt-4o",
    status:      "configured",
    description: "OpenAI GPT-4o for copilot and script generation",
  },

  // ── Social / Marketing Intelligence ──────────────────────────
  predisAi: {
    endpoint:    "https://api.predis.ai/v1",
    envKey:      "REACT_APP_PREDIS_AI_API_KEY",
    status:      "placeholder",
    description: "Predis AI social media content prediction",
  },
  vizard: {
    endpoint:    "https://api.vizard.ai/v1",
    envKey:      "REACT_APP_VIZARD_API_KEY",
    status:      "placeholder",
    description: "Vizard AI automated video editing & repurposing",
  },

  // ── E-Commerce ────────────────────────────────────────────────
  shopify: {
    endpoint:    "https://iamgenesistech.myshopify.com/admin/api/2024-01",
    envKey:      "SHOPIFY_ADMIN_ACCESS_TOKEN",
    storeEnvKey: "SHOPIFY_STORE_DOMAIN",
    status:      "configured",
    description: "Shopify Admin API — product & collection sync",
  },
};

// ------------------------------------------------------------------
// Feature flags
// Set a flag to true only when the corresponding API key is
// provisioned and the backend integration is fully tested.
// ------------------------------------------------------------------
window.IAGT_FEATURES = {
  // Core dashboard features (always on)
  mediaReview:  true,
  autoGenerate: true,
  copilot:      true,
  renderLoop:   true,
  bulkActions:  true,
  // Auto-enable liveData when Supabase credentials are available (env or localStorage)
  liveData:     !!(window.IAGT_CONFIG.supabaseUrl && window.IAGT_CONFIG.supabaseAnonKey),

  // External API integrations (enable per-API as keys are added)
  externalApis: {
    heygen:      true,   // backend integration live
    runway:      true,   // backend integration live
    kling:       true,   // backend integration live
    veo3:        false,  // placeholder — key not yet provisioned
    canva:       false,  // enable once CANVA_API_KEY is set in Railway
    pixa:        false,  // placeholder — key not yet provisioned
    geminiOmni:  false,  // enable once GEMINI_API_KEY is set in Railway
    predisAi:    false,  // enable once PREDIS_AI_API_KEY is set in Railway
    vizard:      false,  // enable once VIZARD_API_KEY is set in Railway
    openai:      false,  // enable once OPENAI_API_KEY is set in Railway
    shopify:     true,   // backend integration live
  },
};
