(function () {
  const config = window.IAGT_CONFIG || {};
  const supabaseUrl = (config.supabaseUrl || "").replace(/\/$/, "");
  const supabaseAnonKey = config.supabaseAnonKey || "";
  const enabled = Boolean(supabaseUrl && supabaseAnonKey);

  function headers(extra = {}) {
    return {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...extra
    };
  }

  async function request(path, options = {}) {
    if (!enabled) {
      throw new Error("Supabase is not configured.");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: headers(options.headers)
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || `Supabase request failed with ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  window.iagtSupabase = {
    enabled,

    select(table, query = "select=*") {
      return request(`${table}?${query}`);
    },

    updateCreativeApproval(id, approved) {
      return request(`creatives?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ approved })
      });
    },

    // Fetch all creatives including rejection reasons
    fetchCreativesWithRejections() {
      return request("creatives?select=*&order=score.desc&limit=200");
    },

    // Save a video assembly draft
    saveVideoDraft(draft) {
      return request("video_assembly_drafts", {
        method: "POST",
        body: JSON.stringify({
          components: draft.components,
          duration: draft.duration,
          style: draft.style,
          voice: draft.voice,
          background: draft.background,
          aspect: draft.aspect,
          saved_at: draft.savedAt || new Date().toISOString()
        })
      });
    },

    // Fetch saved video assembly drafts
    fetchVideoDrafts() {
      return request("video_assembly_drafts?select=*&order=saved_at.desc&limit=50");
    },

    // Trigger video generation via backend (HeyGen / Runway / Kling)
    triggerVideoGeneration(payload) {
      // This proxies through the backend /api/video/generate endpoint
      return fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then((r) => {
        if (!r.ok) throw new Error(`Video generation failed: ${r.status}`);
        return r.json();
      });
    },

    // Save render result back to Supabase
    saveRenderResult(result) {
      return request("video_renders", {
        method: "POST",
        body: JSON.stringify({
          platform: result.platform,
          video_url: result.url,
          status: result.status,
          components: result.components,
          parameters: result.parameters,
          created_at: new Date().toISOString()
        })
      });
    },

    // Update render status (approve / reject)
    updateRenderStatus(id, status) {
      return request(`video_renders?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
    }
  };
})();
