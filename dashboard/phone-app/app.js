(function () {
  const pulse = document.getElementById('phonePulse');
  const list = document.getElementById('phoneRenderList');
  const renderMonitor = document.getElementById('phoneRenderMonitor');
  const proofMonitor = document.getElementById('phoneProofMonitor');
  const healthMonitor = document.getElementById('phoneHealthMonitor');
  const refreshBtn = document.getElementById('phoneRefresh');
  const chatRefreshBtn = document.getElementById('phoneChatRefresh');
  const chatSendBtn = document.getElementById('phoneChatSend');
  const chatInput = document.getElementById('phoneChatInput');
  const logoutBtn = document.getElementById('phoneLogout');
  const chatFeed = document.getElementById('phoneChatFeed');
  const sessionInfo = document.getElementById('phoneSessionInfo');
  const modalState = { open: false, item: null };
  const CONTROL_STANDBY_MS = 60000;
  const controlTimers = new Map();
  const supportState = {
    affiliateCode: '',
    affiliateName: '',
    sessionId: null,
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

  function statusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (['ready', 'complete', 'completed', 'success'].includes(normalized)) return 'status-ready';
    if (['failed', 'error'].includes(normalized)) return 'status-failed';
    return 'status-pending';
  }

  function mediaTypeOf(item) {
    return String(item.media_type || item.mediaType || item.type || item.assetType || 'video').toLowerCase();
  }

  function mediaUrlOf(item) {
    return item.video_url || item.videoUrl || item.playbackUrl || item.previewUrl || item.preview_url || item.storage_url || item.storageUrl || null;
  }

  function mediaSurface(item) {
    const type = mediaTypeOf(item);
    const source = mediaUrlOf(item);
    const title = item.productTitle || item.product || item.scriptTitle || item.id || 'Media item';
    if (source) {
      if (type === 'video' || type === 'ugc') {
        return `<video src="${source}" controls playsinline class="review-video"></video>`;
      }
      if (type === 'landing_page' || type === 'email' || /\.html?(?:$|\?)/i.test(source)) {
        return `<iframe src="${source}" title="${title}" class="review-frame"></iframe>`;
      }
      if (type === 'print_ad' || type === 'banner' || /\.pdf(?:$|\?)/i.test(source)) {
        return `<iframe src="${source}" title="${title}" class="review-frame"></iframe>`;
      }
      return `<img src="${source}" alt="${title}" class="review-image" />`;
    }

    return `<div class="review-surface">
      <h4>Media review surface</h4>
      <p>${item.scriptTitle || item.productTitle || item.product || 'Preview source pending. Metadata and type surface verified.'}</p>
    </div>`;
  }

  function closeReviewModal() {
    modalState.open = false;
    modalState.item = null;
    const modal = document.getElementById('phoneReviewModal');
    if (modal) modal.remove();
  }

  function openReviewModal(item) {
    closeReviewModal();
    modalState.open = true;
    modalState.item = item;
    const status = item.status || item.videoStatus || 'pending';
    const platform = item.platform || item.channel || 'unknown';
    const created = item.created_at || item.createdAt;
    const title = item.productTitle || item.product || item.scriptTitle || item.id || 'Untitled';
    const modal = document.createElement('div');
    modal.id = 'phoneReviewModal';
    modal.className = 'review-overlay';
    modal.innerHTML = `<div class="review-modal">
      <div class="review-head">
        <div>
          <h3>${title}</h3>
          <p>${platform} · ${created ? new Date(created).toLocaleString() : 'time n/a'} · ${mediaTypeOf(item)}</p>
        </div>
        <button type="button" class="review-close state-off" id="closePhoneReview">✕</button>
      </div>
      <div class="review-status ${statusClass(status)}">${status}</div>
      <div class="review-body">${mediaSurface(item)}</div>
    </div>`;
    document.body.appendChild(modal);
    const closeBtn = document.getElementById('closePhoneReview');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeBtn.classList.add('pressing');
        setControlState(closeBtn, 'running');
        closeReviewModal();
        setControlState(closeBtn, 'completed', 1000);
        setTimeout(() => closeBtn.classList.remove('pressing'), 120);
      });
    }
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeReviewModal();
    });
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

  function resolveAffiliateIdentity() {
    const params = new URLSearchParams(window.location.search);
    const code = String(params.get('affiliateCode') || params.get('code') || params.get('ref') || localStorage.getItem('evicsAffiliateCode') || 'ROLAND787');
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) || 'ROLAND787';
    localStorage.setItem('evicsAffiliateCode', cleanCode);
    const name = String(params.get('affiliateName') || localStorage.getItem('evicsAffiliateName') || cleanCode);
    const cleanName = name.trim().slice(0, 64) || cleanCode;
    localStorage.setItem('evicsAffiliateName', cleanName);
    supportState.affiliateCode = cleanCode;
    supportState.affiliateName = cleanName;
  }

  function renderChatFeed() {
    if (!supportState.messages.length) {
      chatFeed.innerHTML = '<div class="chat-empty">No messages yet. Ask AI support anything related to affiliate execution.</div>';
      return;
    }
    chatFeed.innerHTML = supportState.messages.map((message) => {
      const role = String(message.senderRole || 'ai').toLowerCase();
      const roleLabel = role === 'affiliate' ? 'You' : role === 'admin' ? 'Admin' : 'AI Agent';
      const safeText = String(message.text || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
      const body = message.type === 'video'
        ? `<a href="${message.videoUrl}" target="_blank" rel="noopener">Open shared video</a><div style="margin-top:6px"><video src="${message.videoUrl}" controls playsinline class="review-video"></video></div>`
        : safeText;
      return `<div class="chat-bubble ${role}">
        <div class="meta">${roleLabel} · ${new Date(message.createdAt).toLocaleTimeString()}</div>
        <div>${body}</div>
      </div>`;
    }).join('');
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  async function startSupportSession() {
    const payload = await apiJson('/api/affiliate/comms/session/start', {
      method: 'POST',
      body: JSON.stringify({
        affiliateCode: supportState.affiliateCode,
        affiliateName: supportState.affiliateName,
        workspace: 'phone-app'
      })
    });
    supportState.sessionId = payload.sessionId;
    sessionInfo.textContent = `Live support online as ${supportState.affiliateCode}. AI handles most requests; owner/admin handles escalations.`;
  }

  async function heartbeatSupport() {
    if (!supportState.sessionId) return;
    await apiJson('/api/affiliate/comms/session/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: supportState.sessionId })
    });
  }

  async function endSupportSession() {
    if (!supportState.sessionId) return;
    try {
      await apiJson('/api/affiliate/comms/session/end', {
        method: 'POST',
        body: JSON.stringify({ sessionId: supportState.sessionId })
      });
    } finally {
      supportState.sessionId = null;
    }
  }

  async function refreshConversation(controlEl = null) {
    setControlState(controlEl, 'running');
    try {
      const payload = await apiJson(`/api/affiliate/comms/conversation?affiliateCode=${encodeURIComponent(supportState.affiliateCode)}&sinceSequence=${supportState.lastSequence}`);
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      if (incoming.length) {
        supportState.messages = supportState.messages.concat(incoming);
        supportState.lastSequence = Math.max(supportState.lastSequence, ...incoming.map((item) => Number(item.sequence || 0)));
      }
      renderChatFeed();
      setControlState(controlEl, 'completed', 1300);
    } catch (error) {
      setControlState(controlEl, 'off');
      sessionInfo.textContent = `Support thread error: ${error.message}`;
    }
  }

  async function sendSupportMessage() {
    const text = String(chatInput.value || '').trim();
    if (!text) return;
    chatSendBtn.classList.add('pressing');
    setControlState(chatSendBtn, 'running');
    chatSendBtn.disabled = true;
    try {
      const payload = await apiJson('/api/affiliate/comms/message/send', {
        method: 'POST',
        body: JSON.stringify({
          senderRole: 'affiliate',
          affiliateCode: supportState.affiliateCode,
          affiliateName: supportState.affiliateName,
          sessionId: supportState.sessionId,
          type: 'text',
          text
        })
      });
      const added = Array.isArray(payload.messages) ? payload.messages : [];
      if (added.length) {
        supportState.messages = supportState.messages.concat(added);
        supportState.lastSequence = Math.max(supportState.lastSequence, ...added.map((item) => Number(item.sequence || 0)));
        renderChatFeed();
      }
      chatInput.value = '';
      setControlState(chatSendBtn, 'completed', 1300);
    } catch (error) {
      sessionInfo.textContent = `Message send failed: ${error.message}`;
      setControlState(chatSendBtn, 'off');
    } finally {
      chatSendBtn.disabled = false;
      setTimeout(() => chatSendBtn.classList.remove('pressing'), 120);
    }
  }

  async function refresh(controlEl = null) {
    setControlState(controlEl, 'running');
    try {
      const [renderRes, healthRes, proofRes] = await Promise.all([
        fetch('/api/renders/phone-app', { headers: { Accept: 'application/json' } }),
        fetch('/api/health', { headers: { Accept: 'application/json' } }),
        fetch('/api/evidence/heygen', { headers: { Accept: 'application/json' } })
      ]);
      const rendersPayload = await renderRes.json();
      const healthPayload = await healthRes.json();
      const proofPayload = await proofRes.json();
      const renders = Array.isArray(rendersPayload.renders) ? rendersPayload.renders : [];

      renderMonitor.textContent = `Tracked jobs: ${renders.length} · feed source: /api/renders/phone-app`;
      healthMonitor.textContent = `Backend health: ${(healthPayload.status || 'unknown').toUpperCase()} · uptime ${(healthPayload.uptime || healthPayload.uptime_seconds || 0)}s`;
      if (proofPayload.available && proofPayload.latest) {
        const url = proofPayload.latest.videoUrl || proofPayload.latest.video_url || proofPayload.latest.proofUrl || proofPayload.latest.proof_url || '/generated/evics-sea-moss-proof-render.mp4';
        proofMonitor.innerHTML = `HeyGen proof verified · <a href="${url}" target="_blank" rel="noopener" style="color:#8fffd8">open evidence</a>`;
      } else {
        proofMonitor.textContent = 'HeyGen proof pending current live payload.';
      }

      if (!renders.length) {
        list.innerHTML = '<li class="render-item">No mobile render jobs yet.</li>';
      } else {
        list.innerHTML = renders.slice(0, 30).map((item) => {
          const status = item.status || item.videoStatus || 'pending';
          const platform = item.platform || item.channel || 'unknown';
          const title = item.productTitle || item.product || item.scriptTitle || item.id || 'Untitled';
          const created = item.created_at || item.createdAt || '';
          return `<li class="render-item" data-render-id="${item.id || item.video_id || item.job_id || ''}">
            <div class="topline">
              <span>${title}</span>
              <span class="status-chip ${statusClass(status)}">${status}</span>
            </div>
            <div class="meta">${platform} · ${created ? new Date(created).toLocaleString() : 'time n/a'}</div>
            <button type="button" class="render-review-btn state-off">Open review</button>
          </li>`;
        }).join('');
        list.querySelectorAll('.render-item').forEach((node, idx) => {
          node.addEventListener('click', () => openReviewModal(renders[idx]));
          const reviewBtn = node.querySelector('.render-review-btn');
          if (reviewBtn) {
            reviewBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              reviewBtn.classList.add('pressing');
              setControlState(reviewBtn, 'running');
              openReviewModal(renders[idx]);
              setControlState(reviewBtn, 'completed', 1500);
              setTimeout(() => reviewBtn.classList.remove('pressing'), 120);
            });
          }
        });
      }

      pulse.textContent = `Live mobile monitor ${new Date().toLocaleTimeString()}`;
      setControlState(controlEl, 'completed', 1800);
    } catch (error) {
      pulse.textContent = 'Monitor degraded';
      renderMonitor.textContent = `Render feed error: ${error.message}`;
      proofMonitor.textContent = `Proof error: ${error.message}`;
      healthMonitor.textContent = `Health error: ${error.message}`;
      setControlState(controlEl, 'off');
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('pressing');
      void refresh(refreshBtn);
      setTimeout(() => refreshBtn.classList.remove('pressing'), 120);
    });
  }

  if (chatRefreshBtn) {
    chatRefreshBtn.addEventListener('click', () => {
      chatRefreshBtn.classList.add('pressing');
      void refreshConversation(chatRefreshBtn);
      setTimeout(() => chatRefreshBtn.classList.remove('pressing'), 120);
    });
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => { void sendSupportMessage(); });
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void sendSupportMessage();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.classList.add('pressing');
      setControlState(logoutBtn, 'running');
      await endSupportSession();
      sessionInfo.textContent = `Logged off from live support for ${supportState.affiliateCode}.`;
      setControlState(logoutBtn, 'completed', 1500);
      setTimeout(() => logoutBtn.classList.remove('pressing'), 120);
    });
  }

  window.addEventListener('beforeunload', () => {
    if (!supportState.sessionId) return;
    const body = JSON.stringify({ sessionId: supportState.sessionId });
    navigator.sendBeacon('/api/affiliate/comms/session/end', new Blob([body], { type: 'application/json' }));
  });

  async function boot() {
    try {
      resolveAffiliateIdentity();
      await startSupportSession();
      await refreshConversation();
    } catch (error) {
      sessionInfo.textContent = `Support startup failed: ${error.message}`;
    }
    await refresh(refreshBtn);
  }

  void boot();
  setInterval(() => { void refresh(); }, 30000);
  setInterval(() => { void heartbeatSupport(); }, 15000);
  setInterval(() => { void refreshConversation(); }, 8000);
})();
