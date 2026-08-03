(function () {
  const STORAGE_KEY = 'evics_workspace_render_prefs_v1';
  const PANEL_ID = 'evics-workspace-render-controls';
  const VP_PANEL_ID = 'evics-vp-board-effectiveness';

  const DEFAULTS = {
    avatarMode: 'selected',
    selectedAvatarId: 'Abigail_expressive_2024112501',
    aiAvatarPool: [
      'Abigail_expressive_2024112501',
      'Arielle_warm_20250112',
      'Noah_confident_20250112'
    ],
    providerChoice: 'vp_autonomous',
    vpPolicy: 'quality_first',
    cinematicBackgroundPack: 'cinematic_studio',
    cinematicQualityTarget: 'A+',
    cinematicCutStyle: 'commercial_high_energy'
  };

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULTS, parsed);
    } catch {
      return Object.assign({}, DEFAULTS);
    }
  }

  const prefs = loadPrefs();

  function savePrefs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function providerLabel(id) {
    return {
      vp_autonomous: 'VP Autonomous',
      heygen: 'HeyGen',
      hn: 'H&N',
      kling: 'Kling',
      cdance: 'Cdance'
    }[id] || id;
  }

  function pickAiAvatar() {
    const pool = Array.isArray(prefs.aiAvatarPool) && prefs.aiAvatarPool.length
      ? prefs.aiAvatarPool
      : [DEFAULTS.selectedAvatarId];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] || DEFAULTS.selectedAvatarId;
  }

  function vpSelectProvider(payload) {
    const style = String(payload.style || '').toLowerCase();
    const bgPack = String(prefs.cinematicBackgroundPack || '').toLowerCase();
    if (prefs.vpPolicy === 'speed_first') return 'heygen';
    if (style.includes('luxury') || bgPack.includes('luxury')) return 'kling';
    if (style.includes('commercial') || style.includes('cinematic')) return 'hn';
    if (style.includes('educational')) return 'heygen';
    return 'cdance';
  }

  function injectPanel() {
    const paramsGrid = document.querySelector('.generation-layer .pipeline-params');
    if (!paramsGrid) return false;

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.style.marginTop = '14px';
      panel.style.padding = '12px';
      panel.style.border = '1px solid rgba(0,0,0,.1)';
      panel.style.borderRadius = '10px';
      panel.style.background = 'rgba(255,255,255,.8)';
      paramsGrid.parentElement.appendChild(panel);
    }

    panel.innerHTML = `
      <div style="font-weight:800;margin-bottom:8px">Workspace Render Controls</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end">
        <label style="display:grid;gap:4px;font-size:12px">Avatar Mode
          <select id="evics-avatar-mode">
            <option value="selected" ${prefs.avatarMode === 'selected' ? 'selected' : ''}>Use Selected Avatar</option>
            <option value="ai_generated" ${prefs.avatarMode === 'ai_generated' ? 'selected' : ''}>AI-Generated Avatar Pool</option>
          </select>
        </label>
        <label style="display:grid;gap:4px;font-size:12px">Selected Avatar ID
          <input id="evics-selected-avatar" value="${esc(prefs.selectedAvatarId)}" placeholder="HeyGen avatar id" />
        </label>
        <label style="display:grid;gap:4px;font-size:12px">Render Provider
          <select id="evics-provider-choice">
            <option value="vp_autonomous" ${prefs.providerChoice === 'vp_autonomous' ? 'selected' : ''}>VP Autonomous</option>
            <option value="heygen" ${prefs.providerChoice === 'heygen' ? 'selected' : ''}>HeyGen</option>
            <option value="hn" ${prefs.providerChoice === 'hn' ? 'selected' : ''}>H&N</option>
            <option value="kling" ${prefs.providerChoice === 'kling' ? 'selected' : ''}>Kling</option>
            <option value="cdance" ${prefs.providerChoice === 'cdance' ? 'selected' : ''}>Cdance</option>
          </select>
        </label>
        <label style="display:grid;gap:4px;font-size:12px">VP Policy
          <select id="evics-vp-policy">
            <option value="quality_first" ${prefs.vpPolicy === 'quality_first' ? 'selected' : ''}>Quality First</option>
            <option value="balanced" ${prefs.vpPolicy === 'balanced' ? 'selected' : ''}>Balanced</option>
            <option value="speed_first" ${prefs.vpPolicy === 'speed_first' ? 'selected' : ''}>Speed First</option>
          </select>
        </label>
        <label style="display:grid;gap:4px;font-size:12px">Cinematic Background Pack
          <select id="evics-bg-pack">
            <option value="cinematic_studio" ${prefs.cinematicBackgroundPack === 'cinematic_studio' ? 'selected' : ''}>Cinematic Studio</option>
            <option value="luxury_lifestyle" ${prefs.cinematicBackgroundPack === 'luxury_lifestyle' ? 'selected' : ''}>Luxury Lifestyle</option>
            <option value="performance_gym" ${prefs.cinematicBackgroundPack === 'performance_gym' ? 'selected' : ''}>Performance Gym</option>
            <option value="wellness_home" ${prefs.cinematicBackgroundPack === 'wellness_home' ? 'selected' : ''}>Wellness Home</option>
          </select>
        </label>
        <label style="display:grid;gap:4px;font-size:12px">Quality Target
          <select id="evics-quality-target">
            <option value="A" ${prefs.cinematicQualityTarget === 'A' ? 'selected' : ''}>A</option>
            <option value="A+" ${prefs.cinematicQualityTarget === 'A+' ? 'selected' : ''}>A+</option>
            <option value="A++" ${prefs.cinematicQualityTarget === 'A++' ? 'selected' : ''}>A++</option>
          </select>
        </label>
      </div>
      <div style="margin-top:8px;font-size:12px;opacity:.8">
        Active Strategy: ${esc(providerLabel(prefs.providerChoice))} · ${esc(prefs.avatarMode)} · ${esc(prefs.cinematicBackgroundPack)} · ${esc(prefs.cinematicQualityTarget)}
      </div>
    `;

    const bind = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        prefs[key] = el.value;
        savePrefs();
        injectPanel();
      });
    };

    bind('evics-avatar-mode', 'avatarMode');
    bind('evics-provider-choice', 'providerChoice');
    bind('evics-vp-policy', 'vpPolicy');
    bind('evics-bg-pack', 'cinematicBackgroundPack');
    bind('evics-quality-target', 'cinematicQualityTarget');

    const selectedAvatarInput = document.getElementById('evics-selected-avatar');
    if (selectedAvatarInput) {
      selectedAvatarInput.addEventListener('change', () => {
        prefs.selectedAvatarId = selectedAvatarInput.value.trim() || DEFAULTS.selectedAvatarId;
        savePrefs();
      });
    }

    return true;
  }

  function normalizePpepStatus(job) {
    const status = String(job.status || '').toLowerCase();
    const mapped = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'rendering';
    return {
      success: true,
      provider: job.provider || 'ppep',
      status: mapped,
      video_id: job.job_id || job.id || null,
      video_url: job.video_url || job.outputMediaUrl || null,
      thumbnail_url: job.thumbnail_url || null,
      duration: job.duration || null,
      error_message: job.error || null
    };
  }

  function buildCinematicPromptSuffix(payload) {
    const packHints = {
      cinematic_studio: 'cinematic studio lighting, high contrast, glossy product hero framing',
      luxury_lifestyle: 'luxury lifestyle interior, shallow depth of field, warm premium lighting',
      performance_gym: 'high-energy gym environment, dramatic edge lights, athletic motion framing',
      wellness_home: 'natural wellness home ambience, clean daylight, calm premium mood'
    };
    const cutHints = {
      commercial_high_energy: 'fast commercial pacing, pattern interrupt in first 2 seconds',
      luxury_slow_reveal: 'cinematic slow reveal, premium lifestyle pacing',
      documentary_authentic: 'authentic documentary style, natural testimonials'
    };

    return [
      packHints[prefs.cinematicBackgroundPack] || '',
      cutHints[prefs.cinematicCutStyle] || '',
      `quality target ${prefs.cinematicQualityTarget}`
    ].filter(Boolean).join('; ');
  }

  function setVpBoardPanelHtml(html) {
    let panel = document.getElementById(VP_PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = VP_PANEL_ID;
      panel.style.marginTop = '10px';
      panel.style.padding = '10px';
      panel.style.border = '1px solid rgba(0,0,0,.08)';
      panel.style.borderRadius = '10px';
      panel.style.background = '#f6f8fb';
      const anchor = document.querySelector('.generation-layer') || document.querySelector('.video-pipeline');
      if (anchor) anchor.appendChild(panel);
    }
    panel.innerHTML = html;
  }

  async function refreshVpBoardEffectiveness() {
    try {
      const res = await fetch('/api/agents/status', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const agents = Array.isArray(data.agents) ? data.agents : [];
      const vp = agents.find((a) => a.id === 'visual-director');
      const boardIds = new Set(['trend-scout', 'product-match', 'script-writer', 'office-agent']);
      const board = agents.filter((a) => boardIds.has(a.id));
      const boardAvg = board.length
        ? Math.round(board.reduce((sum, a) => sum + (Number(a.qualityScore) || 0), 0) / board.length)
        : null;

      const vpScore = vp ? Number(vp.qualityScore || 0) : null;
      const boardGrade = boardAvg === null ? 'Unknown' : boardAvg >= 90 ? 'A+' : boardAvg >= 85 ? 'A' : boardAvg >= 75 ? 'B' : 'C';
      const vpGrade = vpScore === null ? 'Unknown' : vpScore >= 90 ? 'A+' : vpScore >= 85 ? 'A' : vpScore >= 75 ? 'B' : 'C';

      setVpBoardPanelHtml(`
        <div style="font-weight:800;margin-bottom:6px">VP + Board Effectiveness (Verifiable)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;font-size:12px">
          <div><strong>Pipeline Health</strong><div>${esc(data.pipelineHealth || 'n/a')}%</div></div>
          <div><strong>VP (Visual Director)</strong><div>${vpScore === null ? 'n/a' : vpScore + '/100'} · ${vpGrade}</div></div>
          <div><strong>Board Avg</strong><div>${boardAvg === null ? 'n/a' : boardAvg + '/100'} · ${boardGrade}</div></div>
          <div><strong>Last Cycle</strong><div>${data.lastCycle ? new Date(data.lastCycle).toLocaleString() : 'n/a'}</div></div>
        </div>
      `);
    } catch {
      // Keep panel silent on network failures.
    }
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';

    if (url.includes('/api/video/generate') && init && init.body) {
      try {
        const parsed = JSON.parse(init.body);
        const cinematicSuffix = buildCinematicPromptSuffix(parsed);
        const chosenAvatarId = prefs.avatarMode === 'ai_generated' ? pickAiAvatar() : (prefs.selectedAvatarId || DEFAULTS.selectedAvatarId);
        const requestedProvider = prefs.providerChoice === 'vp_autonomous'
          ? vpSelectProvider(parsed)
          : prefs.providerChoice;

        parsed.avatar_mode = prefs.avatarMode;
        parsed.avatar_id = parsed.avatar_id || chosenAvatarId;
        parsed.heygenAvatarId = parsed.heygenAvatarId || chosenAvatarId;
        parsed.provider_choice = prefs.providerChoice;
        parsed.provider = requestedProvider;
        parsed.vp_policy = prefs.vpPolicy;
        parsed.cinematicBackgroundPack = prefs.cinematicBackgroundPack;
        parsed.cinematicQualityTarget = prefs.cinematicQualityTarget;
        parsed.style = parsed.style || 'Commercial';
        parsed.config = Object.assign({}, parsed.config || {}, {
          display_voice: parsed.config && parsed.config.display_voice ? parsed.config.display_voice : (window.state && window.state.videoVoice) || 'Female',
          cinematic_mode: true,
          cinematic_prompt_suffix: cinematicSuffix
        });

        if (requestedProvider !== 'heygen') {
          const previewResp = await originalFetch('/api/ppep/preview-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productTitle: 'Workspace Ad Creative',
              platform: 'tiktok',
              qualityNeed: prefs.cinematicQualityTarget,
              planHint: cinematicSuffix
            })
          });
          const preview = await previewResp.json();
          if (!previewResp.ok || !preview.success || !preview.plan) {
            throw new Error(preview.error || 'Unable to create PPEP preview plan.');
          }

          const createResp = await originalFetch('/api/ppep/create-media-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pipelineId: preview.pipelineId,
              plan: preview.plan,
              platform: requestedProvider,
              avatarId: chosenAvatarId,
              customScript: parsed.script,
              approved: true
            })
          });
          const job = await createResp.json();
          if (!createResp.ok || !job.success) {
            throw new Error(job.error || 'Renderer job creation failed.');
          }

          const synthetic = {
            success: true,
            provider: requestedProvider,
            selected_provider: requestedProvider,
            fallback_provider: 'heygen',
            video_id: job.job_id || job.id,
            status: job.status === 'completed' ? 'completed' : 'rendering',
            video_url: job.outputMediaUrl || null,
            status_url: '/api/ppep/media-job/' + encodeURIComponent(job.job_id || job.id),
            message: job.message || `${providerLabel(requestedProvider)} route accepted.`
          };

          return new Response(JSON.stringify(synthetic), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        init.body = JSON.stringify(parsed);
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (url.includes('/api/ppep/media-job/')) {
      const resp = await originalFetch(input, init);
      try {
        const payload = await resp.clone().json();
        const normalized = normalizePpepStatus(payload || {});
        return new Response(JSON.stringify(normalized), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {
        return resp;
      }
    }

    return originalFetch(input, init);
  };

  function boot() {
    injectPanel();
    refreshVpBoardEffectiveness();
  }

  const observer = new MutationObserver(() => {
    injectPanel();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(refreshVpBoardEffectiveness, 30000);
})();
