window.IAGT_CONFIG = {
  supabaseUrl: "https://mvfkwlidwqcyqczlauii.supabase.co",
  supabaseAnonKey: "sb_publishable_gIYgOJT70j_m3MHg6NspUg_m8OZuR98"
};

window.EVIE_CONFIG = window.IAGT_CONFIG;

window.loadServicesConfig = window.loadServicesConfig || async function loadServicesConfig() {
  return window.EVIE_CONFIG || window.IAGT_CONFIG || {};
};
