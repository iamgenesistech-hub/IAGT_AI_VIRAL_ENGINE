(function () {
  const pulse = document.getElementById('adminPulse');
  const healthEl = document.getElementById('adminHealth');
  const auditEl = document.getElementById('adminAudit');
  const proofEl = document.getElementById('adminProof');
  const kpiAffiliates = document.getElementById('kpiAffiliates');
  const kpiRenders = document.getElementById('kpiRenders');
  const kpiGrade = document.getElementById('kpiGrade');
  const leaderboardList = document.getElementById('adminLeaderboard');
  const objectivesList = document.getElementById('adminObjectives');
  const refreshBtn = document.getElementById('adminRefresh');
  const liveUsersEl = document.getElementById('adminLiveUsers');
  const targetSelect = document.getElementById('adminCommsTarget');
  const conversationFeed = document.getElementById('adminConversationFeed');
  const sendTextBtn = document.getElementById('adminSendMessage');
  const sendVideoBtn = document.getElementById('adminSendVideo');
  const messageInput = document.getElementById('adminMessageInput');
  const videoInput = document.getElementById('adminVideoUrl');
  const govRefreshBtn = document.getElementById('govRefresh');
  const CONTROL_STANDBY_MS = 60000;
  const controlTimers = new Map();
  const commsState = {
    users: [],
    selectedAffiliateCode: '',
    lastSequence: 0,
    messages: []
  };

  function setControlState(el, state, autoOffMs = 0) {
    if (!el) return;
    el.classList.remove('state-running', 'state-completed', 'state-off');
    el.classList.add(state === 'running' ? 'state-running' : state === 'completed' ? 'state-completed' : 'state-off');
    const timer = controlTimers.get(el);
    if (timer) clearTimeout(timer);
    const effectiveAutoOffMs = state === 'completed'
      ? Math.max(CONTROL_STANDBY_MS, Number(autoOffMs || 0))
      : Number(autoOffMs || 0);
    if (effectiveAutoOffMs > 0) {
      const timeout = setTimeout(() => {
        el.classList.remove('state-running', 'state-completed');
        el.classList.add('state-off');
      }, effectiveAutoOffMs);
      controlTimers.set(el, timeout);
    }
  }

  async function apiJson(url, options) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }
    return payload;
  }

  function renderLiveUsers() {
    if (!commsState.users.length) {
      liveUsersEl.innerHTML = '<li>No active phone app users.</li>';
      targetSelect.innerHTML = '<option value="">No active affiliates</option>';
      commsState.selectedAffiliateCode = '';
      return;
    }
    liveUsersEl.innerHTML = commsState.users.map((user) => {
      const escalated = user.escalated ? 'escalated' : '';
      const reason = user.escalationReason ? `<small>Escalation: ${user.escalationReason}</small>` : '<small>AI routing normal</small>';
      return `<li class="${escalated}">
        ${user.affiliateCode} — ${user.affiliateName || user.affiliateCode}
        <small>Last seen: ${new Date(user.lastSeenAt).toLocaleTimeString()} · Session ${user.sessionId}</small>
        ${reason}
      </li>`;
    }).join('');

    const current = commsState.selectedAffiliateCode;
    targetSelect.innerHTML = commsState.users.map((user) => `<option value="${user.affiliateCode}">${user.affiliateCode} — ${user.affiliateName || user.affiliateCode}${user.escalated ? ' (Escalated)' : ''}</option>`).join('');
    const stillExists = commsState.users.some((user) => user.affiliateCode === current);
    commsState.selectedAffiliateCode = stillExists ? current : commsState.users[0].affiliateCode;
    targetSelect.value = commsState.selectedAffiliateCode;
  }

  function renderConversation() {
    if (!commsState.selectedAffiliateCode) {
      conversationFeed.innerHTML = '<div class="conversation-empty">Select an active affiliate to view live messages.</div>';
      return;
    }
    if (!commsState.messages.length) {
      conversationFeed.innerHTML = '<div class="conversation-empty">No messages yet in this thread.</div>';
      return;
    }
    conversationFeed.innerHTML = commsState.messages.map((message) => {
      const role = String(message.senderRole || 'ai').toLowerCase();
      const roleLabel = role === 'affiliate' ? 'Affiliate' : role === 'admin' ? 'Admin' : 'AI Agent';
      const body = message.type === 'video'
        ? `<a href="${message.videoUrl}" target="_blank" rel="noopener">Open shared video</a>`
        : String(message.text || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
      return `<div class="conversation-msg ${role}">
        <div class="meta">${roleLabel} · ${new Date(message.createdAt).toLocaleTimeString()}</div>
        <div>${body}</div>
      </div>`;
    }).join('');
    conversationFeed.scrollTop = conversationFeed.scrollHeight;
  }

  async function refreshActiveUsers() {
    const payload = await apiJson('/api/affiliate/comms/active-users');
    commsState.users = Array.isArray(payload.users) ? payload.users : [];
    renderLiveUsers();
  }

  async function refreshConversation(resetSequence = false) {
    if (!commsState.selectedAffiliateCode) {
      commsState.messages = [];
      commsState.lastSequence = 0;
      renderConversation();
      return;
    }
    const sinceSequence = resetSequence ? 0 : commsState.lastSequence;
    const payload = await apiJson(`/api/affiliate/comms/conversation?affiliateCode=${encodeURIComponent(commsState.selectedAffiliateCode)}&sinceSequence=${sinceSequence}`);
    const incoming = Array.isArray(payload.messages) ? payload.messages : [];
    if (resetSequence) {
      commsState.messages = incoming;
    } else if (incoming.length) {
      commsState.messages = commsState.messages.concat(incoming);
    }
    if (incoming.length) {
      commsState.lastSequence = Math.max(commsState.lastSequence, ...incoming.map((item) => Number(item.sequence || 0)));
    } else if (resetSequence) {
      commsState.lastSequence = Number(payload.lastSequence || 0);
    }
    renderConversation();
  }

  async function sendAdminMessage(kind) {
    const target = commsState.selectedAffiliateCode;
    if (!target) return;
    const isVideo = kind === 'video';
    const button = isVideo ? sendVideoBtn : sendTextBtn;
    const value = isVideo ? String(videoInput.value || '').trim() : String(messageInput.value || '').trim();
    if (!value) return;
    button.classList.add('pressing');
    setControlState(button, 'running');
    button.disabled = true;
    try {
      const payload = await apiJson('/api/affiliate/comms/message/send', {
        method: 'POST',
        body: JSON.stringify({
          senderRole: 'admin',
          affiliateCode: target,
          type: isVideo ? 'video' : 'text',
          text: isVideo ? '' : value,
          videoUrl: isVideo ? value : ''
        })
      });
      const added = Array.isArray(payload.messages) ? payload.messages : [];
      if (added.length) {
        commsState.messages = commsState.messages.concat(added);
        commsState.lastSequence = Math.max(commsState.lastSequence, ...added.map((item) => Number(item.sequence || 0)));
        renderConversation();
      }
      if (isVideo) videoInput.value = '';
      else messageInput.value = '';
      setControlState(button, 'completed', 1400);
    } catch (error) {
      setControlState(button, 'off');
      pulse.textContent = `Admin comms send failed: ${error.message}`;
    } finally {
      button.disabled = false;
      setTimeout(() => button.classList.remove('pressing'), 120);
    }
  }

  async function refresh(controlEl = null) {
    setControlState(controlEl, 'running');
    try {
      const [healthRes, leaderboardRes, rendersRes, excellenceRes, proofRes] = await Promise.all([
        fetch('/api/health', { headers: { Accept: 'application/json' } }),
        fetch('/api/affiliates/leaderboard?limit=5', { headers: { Accept: 'application/json' } }),
        fetch('/api/renders/phone-app', { headers: { Accept: 'application/json' } }),
        fetch('/api/excellence/status', { headers: { Accept: 'application/json' } }),
        fetch('/api/evidence/heygen', { headers: { Accept: 'application/json' } })
      ]);
      const health = await healthRes.json();
      const leaderboard = await leaderboardRes.json();
      const renders = await rendersRes.json();
      const excellence = await excellenceRes.json();
      const proof = await proofRes.json();

      const boardData = Array.isArray(leaderboard.data) ? leaderboard.data : [];
      const objectiveData = Array.isArray(excellence.objectives) ? excellence.objectives : [];
      const audit = excellence.report || {};

      kpiAffiliates.textContent = String(boardData.length);
      kpiRenders.textContent = String(renders.count || (renders.renders || []).length || 0);
      kpiGrade.textContent = audit.overall ? `${audit.overall.grade || 'N/A'} (${audit.overall.score || 0})` : 'N/A';

      healthEl.textContent = `Health: ${(health.status || 'unknown').toUpperCase()} · Integrations ${health.connected_integrations || 0}/${health.total_integrations || 0}`;
      auditEl.textContent = `Audit target: A+ >=95 · Current ${audit.overall ? `${audit.overall.grade} ${audit.overall.score}` : 'not run yet'}`;
      if (proof.available && proof.latest) {
        const proofUrl = proof.latest.videoUrl || proof.latest.video_url || proof.latest.proofUrl || proof.latest.proof_url || '/generated/evics-sea-moss-proof-render.mp4';
        proofEl.innerHTML = `HeyGen proof: <span class="good">verified</span> · <a href="${proofUrl}" target="_blank" rel="noopener" style="color:#d9bf7a">open evidence</a>`;
      } else {
        proofEl.textContent = 'HeyGen proof: pending live record.';
      }

      leaderboardList.innerHTML = boardData.length
        ? boardData.map((row) => `<li>${row.name || row.code || 'Affiliate'} — ${(row.totalCommissions || row.total_commissions || 0)}<small>Tier: ${row.tier || 'starter'}</small></li>`).join('')
        : '<li>No leaderboard data available.</li>';

      objectivesList.innerHTML = objectiveData.length
        ? objectiveData.slice(0, 6).map((item) => `<li>${item.title}<small>Status: ${item.status || 'pending'}</small></li>`).join('')
        : '<li>No objective payload available.</li>';

      pulse.textContent = `Admin telemetry live ${new Date().toLocaleTimeString()}`;
      setControlState(controlEl, 'completed', 1800);
    } catch (error) {
      pulse.textContent = 'Admin telemetry degraded';
      healthEl.textContent = `Health monitor error: ${error.message}`;
      auditEl.textContent = `Audit monitor error: ${error.message}`;
      proofEl.textContent = `Proof monitor error: ${error.message}`;
      leaderboardList.innerHTML = '<li>Leaderboard monitor unavailable.</li>';
      objectivesList.innerHTML = '<li>Objectives monitor unavailable.</li>';
      setControlState(controlEl, 'off');
    }
  }

  async function refreshComms(controlEl = null) {
    setControlState(controlEl, 'running');
    try {
      await refreshActiveUsers();
      await refreshConversation();
      setControlState(controlEl, 'completed', 1200);
    } catch (error) {
      setControlState(controlEl, 'off');
      pulse.textContent = `Admin comms monitor error: ${error.message}`;
    }
  }

  if (targetSelect) {
    targetSelect.addEventListener('change', () => {
      commsState.selectedAffiliateCode = targetSelect.value;
      commsState.lastSequence = 0;
      commsState.messages = [];
      void refreshConversation(true);
    });
  }

  function govText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function scoreClass(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return '';
    if (n >= 90) return 'good';
    if (n >= 75) return 'warn';
    return 'bad';
  }

  async function refreshGovernance(controlEl = null) {
    setControlState(controlEl, 'running');
    const violationsEl = document.getElementById('govViolations');
    const failingAgentsEl = document.getElementById('govFailingAgents');
    const recentEl = document.getElementById('govRecent');
    try {
      const payload = await apiJson('/api/governance/stats');
      const s = payload.stats || {};
      govText('govPassRate', typeof s.passRate === 'number' ? `${s.passRate}%` : '—');
      govText('govTotal', s.total != null ? s.total : '0');
      govText('govBlocked', s.blockedCount != null ? s.blockedCount : '0');
      govText('govRewritten', s.rewrittenCount != null ? s.rewrittenCount : '0');
      govText('govAvgLove', s.averageLoveScore != null ? s.averageLoveScore : '—');
      govText('govAvgTruth', s.averageTruthScore != null ? s.averageTruthScore : '—');
      govText('govAvgDignity', s.averageDignityScore != null ? s.averageDignityScore : '—');
      govText('govAvgIntegrity', s.averageIntegrityScore != null ? s.averageIntegrityScore : '—');

      if (violationsEl) {
        const v = s.mostCommonViolations || [];
        violationsEl.innerHTML = v.length
          ? v.map((row) => `<li>${row.violation}<small>${row.count} occurrence${row.count === 1 ? '' : 's'}</small></li>`).join('')
          : '<li>No violations recorded. All outputs honoring the standard.</li>';
      }
      if (failingAgentsEl) {
        const a = s.agentsWithRepeatedFailures || [];
        failingAgentsEl.innerHTML = a.length
          ? a.map((row) => `<li>${row.agent}<small>${row.failures} blocked output${row.failures === 1 ? '' : 's'}</small></li>`).join('')
          : '<li>No agents with repeated failures.</li>';
      }
      if (recentEl) {
        const r = s.recent || [];
        recentEl.innerHTML = r.length
          ? r.slice(0, 12).map((row) => {
              const statusLabel = row.approved ? (row.revisionRequired ? 'rewritten' : 'approved') : 'blocked';
              const statusClass = row.approved ? (row.revisionRequired ? 'warn' : 'good') : 'bad';
              const when = row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '';
              const sc = row.scores || {};
              return `<li><span class="${statusClass}">${statusLabel}</span> · ${row.agentName || 'agent'} / ${row.workflowName || 'workflow'}` +
                `<small>Love ${sc.loveScore ?? '—'} · Truth ${sc.truthScore ?? '—'} · Dignity ${sc.dignityScore ?? '—'} · ${when}</small></li>`;
            }).join('')
          : '<li>No governance activity yet. Checks appear here as AI outputs are evaluated.</li>';
      }
      setControlState(controlEl, 'completed', 1500);
    } catch (error) {
      if (violationsEl) violationsEl.innerHTML = `<li>Governance monitor unavailable: ${error.message}</li>`;
      if (failingAgentsEl) failingAgentsEl.innerHTML = '<li>—</li>';
      if (recentEl) recentEl.innerHTML = '<li>—</li>';
      setControlState(controlEl, 'off');
    }
  }

  if (govRefreshBtn) {
    govRefreshBtn.addEventListener('click', () => { void refreshGovernance(govRefreshBtn); });
  }

  // ── Identity Chain panel ────────────────────────────────────────────────
  const identityChainEl = document.getElementById('adminIdentityChains');
  const recentRequestsEl = document.getElementById('adminRecentRequests');
  const identityRefreshBtn = document.getElementById('adminIdentityRefresh');

  function statusBadge(status) {
    const s = String(status || '').toLowerCase();
    const color = s === 'completed' ? '#00e5b4' : s === 'failed' ? '#ff4d4d' : s === 'processing' ? '#f5a623' : '#6b7e8f';
    return `<span style="display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44">${s || 'none'}</span>`;
  }

  function shortId(id) {
    const s = String(id || '');
    return s ? (s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s) : '—';
  }

  async function refreshIdentityChains(controlEl) {
    if (controlEl) setControlState(controlEl, 'running');
    try {
      const data = await apiJson('/api/admin/identity-chains');
      const chains = data.chains || [];
      if (!identityChainEl) return;
      if (!chains.length) {
        identityChainEl.innerHTML = '<p class="monitor-info">No affiliate profiles found.</p>';
      } else {
        identityChainEl.innerHTML = `
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:#1ec8f2;text-align:left;border-bottom:1px solid #1c3044">
                <th style="padding:6px 8px">Profile ID</th>
                <th style="padding:6px 8px">Name</th>
                <th style="padding:6px 8px">Voice Clone ID</th>
                <th style="padding:6px 8px">Clone Status</th>
                <th style="padding:6px 8px">Avatar ID</th>
                <th style="padding:6px 8px">Request ID</th>
                <th style="padding:6px 8px">Proof</th>
                <th style="padding:6px 8px">Updated</th>
              </tr>
            </thead>
            <tbody>
              ${chains.map((c) => `
                <tr style="border-bottom:1px solid #0e2233">
                  <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9">${c.profileId || '—'}</td>
                  <td style="padding:5px 8px">${c.name || '—'}</td>
                  <td style="padding:5px 8px;font-family:monospace;color:${c.voiceCloneId ? '#00e5b4' : '#6b7e8f'}" title="${c.voiceCloneId || ''}">${shortId(c.voiceCloneId)}</td>
                  <td style="padding:5px 8px">${statusBadge(c.voiceCloneStatus)}</td>
                  <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9" title="${c.avatarId || ''}">${shortId(c.avatarId)}</td>
                  <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9" title="${c.requestId || ''}">${shortId(c.requestId)}</td>
                  <td style="padding:5px 8px">${statusBadge(c.proofStatus || (c.proofVideoId ? 'ready' : 'none'))}</td>
                  <td style="padding:5px 8px;color:#6b7e8f">${c.lastUpdated ? new Date(c.lastUpdated).toLocaleString() : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }
      if (controlEl) setControlState(controlEl, 'completed', 1500);
    } catch (error) {
      if (identityChainEl) identityChainEl.innerHTML = `<p class="monitor-info" style="color:#ff4d4d">Identity chain unavailable: ${error.message}</p>`;
      if (controlEl) setControlState(controlEl, 'off');
    }
  }

  async function refreshRecentRequests() {
    try {
      const data = await apiJson('/api/admin/avatar-requests?limit=20');
      const requests = data.requests || [];
      if (!recentRequestsEl) return;
      if (!requests.length) {
        recentRequestsEl.innerHTML = '<p class="monitor-info">No avatar requests yet.</p>';
        return;
      }
      recentRequestsEl.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="color:#1ec8f2;text-align:left;border-bottom:1px solid #1c3044">
              <th style="padding:6px 8px">Request ID</th>
              <th style="padding:6px 8px">Affiliate</th>
              <th style="padding:6px 8px">Status</th>
              <th style="padding:6px 8px">Voice Clone</th>
              <th style="padding:6px 8px">Error</th>
              <th style="padding:6px 8px">Updated</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map((r) => {
              const err = String(r.error || r.avatar?.error || '').trim();
              const voiceId = r.voiceCloneId || r.avatar?.voiceCloneId || '';
              return `<tr style="border-bottom:1px solid #0e2233">
                <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9" title="${r.requestId}">${shortId(r.requestId)}</td>
                <td style="padding:5px 8px;font-family:monospace">${r.affiliateCode || '—'}</td>
                <td style="padding:5px 8px">${statusBadge(r.status)}</td>
                <td style="padding:5px 8px;font-family:monospace;color:${voiceId ? '#00e5b4' : '#6b7e8f'}" title="${voiceId}">${shortId(voiceId)}</td>
                <td style="padding:5px 8px;color:#ff9999;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${err}">${err || '—'}</td>
                <td style="padding:5px 8px;color:#6b7e8f">${r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    } catch (error) {
      if (recentRequestsEl) recentRequestsEl.innerHTML = `<p class="monitor-info" style="color:#ff4d4d">Requests unavailable: ${error.message}</p>`;
    }
  }

  const asyncErrorsEl = document.getElementById('adminAsyncErrors');

  async function refreshAsyncErrors() {
    try {
      const data = await apiJson('/api/admin/async-job-errors?limit=25');
      const errors = data.errors || [];
      if (!asyncErrorsEl) return;
      if (!errors.length) {
        asyncErrorsEl.innerHTML = '<p class="monitor-info">No recent async job errors.</p>';
        return;
      }
      asyncErrorsEl.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="color:#1ec8f2;text-align:left;border-bottom:1px solid #1c3044">
              <th style="padding:6px 8px">Type</th>
              <th style="padding:6px 8px">Affiliate</th>
              <th style="padding:6px 8px">Request ID</th>
              <th style="padding:6px 8px">Video Job ID</th>
              <th style="padding:6px 8px">Status</th>
              <th style="padding:6px 8px">Error</th>
              <th style="padding:6px 8px">Updated</th>
            </tr>
          </thead>
          <tbody>
            ${errors.map((item) => {
              const err = String(item.error || '').trim();
              return `<tr style="border-bottom:1px solid #0e2233">
                <td style="padding:5px 8px">${item.jobType || '—'}</td>
                <td style="padding:5px 8px;font-family:monospace">${item.affiliateCode || '—'}</td>
                <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9" title="${item.requestId || ''}">${shortId(item.requestId)}</td>
                <td style="padding:5px 8px;font-family:monospace;color:#8fb7c9" title="${item.videoJobId || ''}">${shortId(item.videoJobId)}</td>
                <td style="padding:5px 8px">${statusBadge(item.status)}</td>
                <td style="padding:5px 8px;color:#ff9999;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${err}">${err || '—'}</td>
                <td style="padding:5px 8px;color:#6b7e8f">${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    } catch (error) {
      if (asyncErrorsEl) asyncErrorsEl.innerHTML = `<p class="monitor-info" style="color:#ff4d4d">Async error feed unavailable: ${error.message}</p>`;
    }
  }

  if (identityRefreshBtn) {
    identityRefreshBtn.addEventListener('click', () => {
      void refreshIdentityChains(identityRefreshBtn);
      void refreshRecentRequests();
      void refreshAsyncErrors();
    });
  }

  if (sendTextBtn) {
    sendTextBtn.addEventListener('click', () => { void sendAdminMessage('text'); });
  }
  if (sendVideoBtn) {
    sendVideoBtn.addEventListener('click', () => { void sendAdminMessage('video'); });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('pressing');
      void refresh(refreshBtn);
      void refreshComms(refreshBtn);
      void refreshGovernance(refreshBtn);
      void refreshIdentityChains(refreshBtn);
      void refreshRecentRequests();
      void refreshAsyncErrors();
      setTimeout(() => refreshBtn.classList.remove('pressing'), 120);
    });
  }

  void refresh(refreshBtn);
  void refreshComms();
  void refreshGovernance();
  void refreshIdentityChains();
  void refreshRecentRequests();
  void refreshAsyncErrors();
  setInterval(() => { void refresh(); }, 30000);
  setInterval(() => { void refreshComms(); }, 8000);
  setInterval(() => { void refreshGovernance(); }, 30000);
  setInterval(() => { void refreshIdentityChains(); void refreshRecentRequests(); void refreshAsyncErrors(); }, 60000);

  // ── Admin Video Management ────────────────────────────────────────────────
  (function initVideoMgmt() {
    const loadBtn    = document.getElementById('adminVideoMgmtLoad');
    const codeInput  = document.getElementById('adminVideoMgmtAffiliate');
    const jobIdInput = document.getElementById('adminVideoMgmtJobId');
    const deleteDirectBtn = document.getElementById('adminVideoMgmtDeleteDirect');
    const directStatus   = document.getElementById('adminVideoMgmtDirectStatus');
    const listEl         = document.getElementById('adminVideoMgmtList');
    const adminKeyInput  = document.getElementById('adminVideoMgmtKey');
    if (!loadBtn || !listEl) return;

    function getAdminKey() { return (adminKeyInput ? adminKeyInput.value.trim() : '') || ''; }

    // Load videos for an affiliate (or all if blank)
    loadBtn.addEventListener('click', async () => {
      const code = (codeInput ? codeInput.value.trim() : '');
      setControlState(loadBtn, 'running');
      listEl.innerHTML = '<p class="monitor-info" style="font-size:12px">Loading…</p>';
      try {
        const url = `/api/affiliate/product-videos?affiliateCode=${encodeURIComponent(code)}`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        const payload = await resp.json().catch(() => ({}));
        const videos = Array.isArray(payload.videos) ? payload.videos : [];
        if (!videos.length) {
          listEl.innerHTML = '<p class="monitor-info" style="font-size:12px">No videos found.</p>';
          setControlState(loadBtn, 'completed', 3000);
          return;
        }
        setControlState(loadBtn, 'completed', 3000);
        const rows = videos.map((v) => {
          const pvid = String(v.videoJobId || '').replace(/"/g, '&quot;');
          const affiliateCode = String(v.affiliateCode || code || '').replace(/"/g, '&quot;');
          const title = String(v.productTitle || v.productId || 'Product Video').substring(0, 50);
          const status = String(v.status || 'unknown');
          const statusColor = status === 'completed' ? '#4caf50' : status === 'failed' ? '#e55' : '#d9bf7a';
          return `<tr>
            <td style="font-size:11px;padding:5px 8px">${affiliateCode}</td>
            <td style="font-size:11px;padding:5px 8px">${title}</td>
            <td style="font-size:11px;padding:5px 8px;color:${statusColor}">${status}</td>
            <td style="font-size:11px;padding:5px 8px;font-family:monospace;color:var(--muted)">${pvid.substring(0, 24)}…</td>
            <td style="padding:3px 8px">
              <button type="button" class="control-btn state-off admin-vid-del"
                style="font-size:10px;padding:3px 8px;border-color:#7c1c1c;color:#e55"
                data-pvid="${pvid}" data-affiliate="${affiliateCode}">🗑</button>
            </td>
          </tr>`;
        }).join('');
        listEl.innerHTML = `<table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="font-size:10px;text-align:left;padding:4px 8px;color:var(--muted)">AFFILIATE</th>
            <th style="font-size:10px;text-align:left;padding:4px 8px;color:var(--muted)">PRODUCT</th>
            <th style="font-size:10px;text-align:left;padding:4px 8px;color:var(--muted)">STATUS</th>
            <th style="font-size:10px;text-align:left;padding:4px 8px;color:var(--muted)">JOB ID</th>
            <th style="font-size:10px;text-align:left;padding:4px 8px;color:var(--muted)">DEL</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;

        // Wire delete buttons
        listEl.querySelectorAll('.admin-vid-del').forEach((delBtn) => {
          delBtn.addEventListener('click', async () => {
            const pvid = delBtn.getAttribute('data-pvid');
            if (!confirm(`Admin delete video:\n${pvid}\n\nThis is permanent.`)) return;
            delBtn.textContent = '⏳';
            delBtn.disabled = true;
            const ok = await adminDeleteVideo(pvid);
            if (ok) {
              const row = delBtn.closest('tr');
              if (row) row.remove();
            } else {
              delBtn.textContent = '🗑';
              delBtn.disabled = false;
            }
          });
        });
      } catch (err) {
        listEl.innerHTML = `<p class="monitor-info" style="font-size:12px;color:#e55">Error: ${err.message}</p>`;
        setControlState(loadBtn, 'state-off');
      }
    });

    // Direct delete by Job ID
    if (deleteDirectBtn) {
      deleteDirectBtn.addEventListener('click', async () => {
        const pvid = jobIdInput ? jobIdInput.value.trim() : '';
        if (!pvid) { if (directStatus) directStatus.textContent = '⚠️ Enter a Job ID first'; return; }
        if (!confirm(`Admin delete video:\n${pvid}\n\nThis is permanent.`)) return;
        setControlState(deleteDirectBtn, 'running');
        if (directStatus) directStatus.textContent = 'Deleting…';
        const ok = await adminDeleteVideo(pvid);
        if (ok) {
          setControlState(deleteDirectBtn, 'completed', 3000);
          if (directStatus) { directStatus.textContent = '✅ Deleted'; setTimeout(() => { directStatus.textContent = ''; }, 4000); }
          if (jobIdInput) jobIdInput.value = '';
        } else {
          setControlState(deleteDirectBtn, 'state-off');
          if (directStatus) { directStatus.textContent = '❌ Failed — check key/ID'; setTimeout(() => { directStatus.textContent = ''; }, 5000); }
        }
      });
    }

    async function adminDeleteVideo(videoJobId) {
      try {
        const adminKey = getAdminKey();
        const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
        if (adminKey) headers['x-admin-key'] = adminKey;
        const resp = await fetch(`/api/admin/video/${encodeURIComponent(videoJobId)}`, {
          method: 'DELETE',
          headers
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok || payload.success === false) {
          console.warn('[AdminVideoDelete] failed:', payload.error || resp.status);
          return false;
        }
        console.log('[AdminVideoDelete] deleted:', videoJobId);
        return true;
      } catch (err) {
        console.error('[AdminVideoDelete]', err);
        return false;
      }
    }
  })();
})();
