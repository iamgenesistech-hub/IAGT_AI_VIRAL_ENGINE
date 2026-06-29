// dashboard/control-center/supabase.js
// Vanilla-JS Supabase REST client — no build step required.
// Uses the Supabase PostgREST API directly over fetch.
// Exposes window.iagtSupabase with the interface expected by app.js.

(function () {
  "use strict";

  function makeClient(url, anonKey) {
    if (!url || !anonKey) return null;

    const base = url.replace(/\/$/, "");
    const headers = {
      "apikey": anonKey,
      "Authorization": "Bearer " + anonKey,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    async function restFetch(method, path, body, extraHeaders) {
      const res = await fetch(base + path, {
        method,
        headers: Object.assign({}, headers, extraHeaders || {}),
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) return res.json();
      return [];
    }

    // select(table, postgrestQueryString) → Array of rows
    async function select(table, qs) {
      const path = "/rest/v1/" + table + (qs ? "?" + qs : "");
      return restFetch("GET", path, null, { "Prefer": "return=representation" });
    }

    // insert(table, rowObj|rowArray) → inserted rows
    async function insert(table, data) {
      return restFetch("POST", "/rest/v1/" + table, data);
    }

    // upsert(table, data, conflictColumn?) → upserted rows
    async function upsert(table, data, onConflict) {
      const extra = { "Prefer": "resolution=merge-duplicates,return=representation" };
      let path = "/rest/v1/" + table;
      if (onConflict) path += "?on_conflict=" + onConflict;
      return restFetch("POST", path, data, extra);
    }

    // update(table, filterQS, patchObj) → updated rows
    // e.g. update("creatives", "id=eq.abc123", { approved: true })
    async function update(table, filterQS, patch) {
      const path = "/rest/v1/" + table + (filterQS ? "?" + filterQS : "");
      return restFetch("PATCH", path, patch);
    }

    // ---- High-level helpers called directly from app.js ----

    async function updateCreativeApproval(id, approved) {
      return update("creatives", "id=eq." + encodeURIComponent(id), { approved });
    }

    async function saveVideoDraft(draft) {
      return upsert("evics_renders", draft, "id");
    }

    // ---- Re-initialize (called by Connect Sources modal) ----
    function reinitialize(newUrl, newAnonKey) {
      const fresh = makeClient(newUrl, newAnonKey);
      if (!fresh) {
        console.warn("[supabase.js] reinitialize: invalid credentials, skipping.");
        return;
      }
      // Replace all methods on window.iagtSupabase in place
      Object.assign(window.iagtSupabase, fresh);
      window.iagtSupabase.enabled = true;
      window.IAGT_CONFIG.supabaseUrl = newUrl;
      window.IAGT_CONFIG.supabaseAnonKey = newAnonKey;
      if (window.IAGT_FEATURES) window.IAGT_FEATURES.liveData = true;
      console.info("[supabase.js] Supabase client reinitialized with new credentials.");
    }

    return { enabled: true, select, insert, upsert, update, updateCreativeApproval, saveVideoDraft, reinitialize };
  }

  // ---- Bootstrap from config ----
  function init() {
    const cfg = (typeof window !== "undefined" && window.IAGT_CONFIG) || {};
    const client = makeClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    if (client) {
      window.iagtSupabase = client;
      console.info("[supabase.js] Supabase client initialized. liveData = true");
    } else {
      // No credentials: expose a stub so app.js guard checks don't throw
      window.iagtSupabase = {
        enabled: false,
        select: async () => [],
        insert: async () => [],
        upsert: async () => [],
        update: async () => [],
        updateCreativeApproval: async () => {},
        saveVideoDraft: async () => {},
        reinitialize: function (url, key) {
          const fresh = makeClient(url, key);
          if (fresh) {
            Object.assign(window.iagtSupabase, fresh);
            window.iagtSupabase.enabled = true;
            window.IAGT_CONFIG.supabaseUrl = url;
            window.IAGT_CONFIG.supabaseAnonKey = key;
            if (window.IAGT_FEATURES) window.IAGT_FEATURES.liveData = true;
            console.info("[supabase.js] Supabase client activated via reinitialize.");
          }
        }
      };
      console.info("[supabase.js] No Supabase credentials — running in offline/demo mode.");
    }
  }

  // Run after config.js has set window.IAGT_CONFIG
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
