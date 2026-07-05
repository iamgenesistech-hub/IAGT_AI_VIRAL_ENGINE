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
      setTimeout(() => refreshBtn.classList.remove('pressing'), 120);
    });
  }

  void refresh(refreshBtn);
  void refreshComms();
  void refreshGovernance();
  setInterval(() => { void refresh(); }, 30000);
  setInterval(() => { void refreshComms(); }, 8000);
  setInterval(() => { void refreshGovernance(); }, 30000);
})();
