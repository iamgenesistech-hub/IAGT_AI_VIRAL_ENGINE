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
    }
  };
})();
