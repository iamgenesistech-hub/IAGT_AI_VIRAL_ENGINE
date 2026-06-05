// Runtime configuration fallback.
// When running via backend server, config.js is served dynamically from the environment.
window.IAGT_CONFIG = {
  supabaseUrl: (window.__ENV && window.__ENV.SUPABASE_URL) || "",
  supabaseAnonKey: (window.__ENV && window.__ENV.SUPABASE_ANON_KEY) || ""
};
