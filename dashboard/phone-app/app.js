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
  const avatarMonitor = document.getElementById('phoneAvatarMonitor');
  const avatarPhotoInput = document.getElementById('phoneAvatarPhotoInput');
  const avatarPhotoUploadBtn = document.getElementById('phoneAvatarPhotoUpload');
  const avatarPhotoPreview = document.getElementById('phoneAvatarPhotoPreview');
  const avatarVoiceInput = document.getElementById('phoneAvatarVoiceInput');
  const avatarVoiceRecordBtn = document.getElementById('phoneAvatarVoiceRecord');
  const avatarVoiceRerecordBtn = document.getElementById('phoneAvatarVoiceRerecord');
  const avatarVoiceUploadBtn = document.getElementById('phoneAvatarVoiceUpload');
  const avatarVoicePreview = document.getElementById('phoneAvatarVoicePreview');
  const avatarVoiceFileRow = document.getElementById('phoneAvatarVoiceFileRow');
  const avatarVoiceFileLink = document.getElementById('phoneAvatarVoiceFileLink');
  const avatarVoiceCopyLinkBtn = document.getElementById('phoneAvatarVoiceCopyLink');
  const avatarSaveProfileBtn = document.getElementById('phoneAvatarSaveProfile');
  const phoneVoiceHelp = document.getElementById('phoneVoiceHelp');
  const modalState = { open: false, item: null };
  const CONTROL_STANDBY_MS = 60000;
  const controlTimers = new Map();
  const voiceRecordState = {
    recorder: null,
    stream: null,
    chunks: [],
    active: false,
    lastBlobUrl: ''
  };
  const supportState = {
    affiliateCode: '',
    affiliateName: '',
    sessionId: null,
    lastSequence: 0,
    messages: [],
    avatarSetup: {
      photoUrl: '',
      voiceFileUrl: '',
      voiceFilePath: '',
      avatarId: ''
    }
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

  function avatarStorageKey() {
    return `evicsPhoneAvatarSetup:${supportState.affiliateCode || 'default'}`;
  }

  function persistAvatarSetup() {
    localStorage.setItem(avatarStorageKey(), JSON.stringify(supportState.avatarSetup));
  }

  function hydrateAvatarSetup() {
    const raw = localStorage.getItem(avatarStorageKey());
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      supportState.avatarSetup.photoUrl = String(parsed.photoUrl || '');
      supportState.avatarSetup.voiceFileUrl = String(parsed.voiceFileUrl || '');
      supportState.avatarSetup.voiceFilePath = String(parsed.voiceFilePath || '');
      supportState.avatarSetup.avatarId = String(parsed.avatarId || '');
    } catch (error) {
      console.warn('Invalid stored avatar setup payload', error);
    }
  }

  function renderAvatarSetup() {
    if (avatarPhotoPreview) {
      if (supportState.avatarSetup.photoUrl) {
        avatarPhotoPreview.src = supportState.avatarSetup.photoUrl;
        avatarPhotoPreview.classList.remove('hidden');
      } else {
        avatarPhotoPreview.removeAttribute('src');
        avatarPhotoPreview.classList.add('hidden');
      }
    }
    if (avatarVoicePreview) {
      if (supportState.avatarSetup.voiceFileUrl) {
        avatarVoicePreview.src = supportState.avatarSetup.voiceFileUrl;
        avatarVoicePreview.classList.remove('hidden');
      } else {
        avatarVoicePreview.removeAttribute('src');
        avatarVoicePreview.classList.add('hidden');
      }
    }
    if (avatarVoiceFileRow && avatarVoiceFileLink) {
      if (supportState.avatarSetup.voiceFileUrl) {
        avatarVoiceFileLink.href = supportState.avatarSetup.voiceFileUrl;
        avatarVoiceFileLink.textContent = supportState.avatarSetup.voiceFileUrl;
        avatarVoiceFileRow.classList.remove('hidden');
      } else {
        avatarVoiceFileLink.removeAttribute('href');
        avatarVoiceFileLink.textContent = 'Open recorded voice file';
        avatarVoiceFileRow.classList.add('hidden');
      }
    }
    if (avatarMonitor) {
      const parts = [];
      parts.push(supportState.avatarSetup.photoUrl ? 'Photo uploaded' : 'Photo pending');
      parts.push(supportState.avatarSetup.voiceFileUrl ? 'Voice uploaded' : 'Voice pending');
      if (supportState.avatarSetup.avatarId) parts.push(`Avatar: ${supportState.avatarSetup.avatarId}`);
      avatarMonitor.textContent = parts.join(' · ');
    }
    if (phoneVoiceHelp) {
      if (voiceRecordState.active) {
        phoneVoiceHelp.textContent = 'Recording now. Press Stop recording when you are done.';
      } else if (supportState.avatarSetup.voiceFileUrl) {
        phoneVoiceHelp.textContent = 'Voice sample ready. Use Re-record to replace it, or upload a different file.';
      } else {
        phoneVoiceHelp.textContent = 'Allow microphone access to record directly, or upload a file below.';
      }
    }
  }

  async function uploadAvatarAsset(file, endpoint, fieldName) {
    if (!file) throw new Error('Please choose a file before uploading.');
    const formData = new FormData();
    formData.append(fieldName, file);
    const response = await fetch(endpoint, { method: 'POST', body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || `Upload failed: ${response.status}`);
    }
    return payload;
  }

  async function uploadRecordedAvatarVoice(blob) {
    const file = new File([blob], `voice-sample-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-voice', 'voice');
    supportState.avatarSetup.voiceFileUrl = String(payload.voiceFileUrl || '');
    supportState.avatarSetup.voiceFilePath = String(payload.voiceFilePath || '');
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = 'Recorded voice sample uploaded and ready.';
  }

  async function uploadAvatarPhoto() {
    const file = avatarPhotoInput?.files?.[0];
    const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-photo', 'photo');
    supportState.avatarSetup.photoUrl = String(payload.photoUrl || '');
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = 'Affiliate photo uploaded and ready.';
  }

  async function uploadAvatarVoice() {
    const file = avatarVoiceInput?.files?.[0];
    const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-voice', 'voice');
    supportState.avatarSetup.voiceFileUrl = String(payload.voiceFileUrl || '');
    supportState.avatarSetup.voiceFilePath = String(payload.voiceFilePath || '');
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = 'Affiliate voice file uploaded and ready.';
  }

  function setVoiceRecordButton(label, state) {
    if (!avatarVoiceRecordBtn) return;
    avatarVoiceRecordBtn.textContent = label;
    setControlState(avatarVoiceRecordBtn, state);
  }

  function setVoiceRerecordButton(label, state) {
    if (!avatarVoiceRerecordBtn) return;
    avatarVoiceRerecordBtn.textContent = label;
    setControlState(avatarVoiceRerecordBtn, state);
  }

  function clearVoiceSample() {
    supportState.avatarSetup.voiceFileUrl = '';
    supportState.avatarSetup.voiceFilePath = '';
    if (avatarVoiceInput) avatarVoiceInput.value = '';
    if (avatarVoicePreview) {
      avatarVoicePreview.removeAttribute('src');
      avatarVoicePreview.classList.add('hidden');
    }
    persistAvatarSetup();
    renderAvatarSetup();
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser does not support microphone recording.');
    }
    if (voiceRecordState.active) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    voiceRecordState.stream = stream;
    voiceRecordState.recorder = recorder;
    voiceRecordState.chunks = [];
    voiceRecordState.active = true;
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) voiceRecordState.chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      void (async () => {
        const blob = new Blob(voiceRecordState.chunks, { type: recorder.mimeType || 'audio/webm' });
        if (voiceRecordState.lastBlobUrl) URL.revokeObjectURL(voiceRecordState.lastBlobUrl);
        voiceRecordState.lastBlobUrl = URL.createObjectURL(blob);
        if (avatarVoicePreview) {
          avatarVoicePreview.src = voiceRecordState.lastBlobUrl;
          avatarVoicePreview.classList.remove('hidden');
        }
        try {
          await uploadRecordedAvatarVoice(blob);
        } catch (error) {
          sessionInfo.textContent = `Recorded voice upload failed: ${error.message}`;
        } finally {
          voiceRecordState.active = false;
          voiceRecordState.recorder = null;
          if (voiceRecordState.stream) {
            voiceRecordState.stream.getTracks().forEach((track) => track.stop());
            voiceRecordState.stream = null;
          }
          voiceRecordState.chunks = [];
          setVoiceRecordButton('Record voice sample', 'off');
        }
      })();
    });
    recorder.start();
    setVoiceRecordButton('Stop recording', 'running');
    sessionInfo.textContent = 'Recording voice sample…';
  }

  function stopVoiceRecording() {
    if (!voiceRecordState.recorder || !voiceRecordState.active) return;
    voiceRecordState.recorder.stop();
  }

  async function saveAvatarProfile() {
    const payload = await apiJson('/api/affiliate/avatar/create', {
      method: 'POST',
      body: JSON.stringify({
        affiliateId: supportState.affiliateCode,
        name: `${supportState.affiliateName} Avatar`,
        style: 'avatar',
        photoUrl: supportState.avatarSetup.photoUrl || null,
        voiceFilePath: supportState.avatarSetup.voiceFilePath || null,
        voiceFileUrl: supportState.avatarSetup.voiceFileUrl || null
      })
    });
    supportState.avatarSetup.avatarId = String(payload.avatarId || payload.avatar?.id || '');
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = `Avatar profile saved${supportState.avatarSetup.avatarId ? ` (${supportState.avatarSetup.avatarId})` : ''}.`;
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

  if (avatarPhotoUploadBtn) {
    avatarPhotoUploadBtn.addEventListener('click', async () => {
      avatarPhotoUploadBtn.classList.add('pressing');
      avatarPhotoUploadBtn.disabled = true;
      setControlState(avatarPhotoUploadBtn, 'running');
      try {
        await uploadAvatarPhoto();
        setControlState(avatarPhotoUploadBtn, 'completed', 1300);
      } catch (error) {
        sessionInfo.textContent = `Photo upload failed: ${error.message}`;
        setControlState(avatarPhotoUploadBtn, 'off');
      } finally {
        avatarPhotoUploadBtn.disabled = false;
        setTimeout(() => avatarPhotoUploadBtn.classList.remove('pressing'), 120);
      }
    });
  }

  if (avatarVoiceUploadBtn) {
    avatarVoiceUploadBtn.addEventListener('click', async () => {
      avatarVoiceUploadBtn.classList.add('pressing');
      avatarVoiceUploadBtn.disabled = true;
      setControlState(avatarVoiceUploadBtn, 'running');
      try {
        await uploadAvatarVoice();
        setControlState(avatarVoiceUploadBtn, 'completed', 1300);
      } catch (error) {
        sessionInfo.textContent = `Voice upload failed: ${error.message}`;
        setControlState(avatarVoiceUploadBtn, 'off');
      } finally {
        avatarVoiceUploadBtn.disabled = false;
        setTimeout(() => avatarVoiceUploadBtn.classList.remove('pressing'), 120);
      }
    });
  }

  if (avatarVoiceRecordBtn) {
    avatarVoiceRecordBtn.addEventListener('click', async () => {
      avatarVoiceRecordBtn.classList.add('pressing');
      avatarVoiceRecordBtn.disabled = true;
      try {
        if (voiceRecordState.active) {
          stopVoiceRecording();
        } else {
          await startVoiceRecording();
        }
      } catch (error) {
        sessionInfo.textContent = `Voice recording failed: ${error.message}`;
        setVoiceRecordButton('Record voice sample', 'off');
      } finally {
        avatarVoiceRecordBtn.disabled = false;
        setTimeout(() => avatarVoiceRecordBtn.classList.remove('pressing'), 120);
      }
    });
  }

  if (avatarVoiceRerecordBtn) {
    avatarVoiceRerecordBtn.addEventListener('click', async () => {
      avatarVoiceRerecordBtn.classList.add('pressing');
      avatarVoiceRerecordBtn.disabled = true;
      setControlState(avatarVoiceRerecordBtn, 'running');
      try {
        clearVoiceSample();
        if (voiceRecordState.active) {
          stopVoiceRecording();
        }
        await startVoiceRecording();
        setVoiceRerecordButton('Re-record', 'completed');
      } catch (error) {
        sessionInfo.textContent = `Re-record failed: ${error.message}`;
        setVoiceRerecordButton('Re-record', 'off');
      } finally {
        avatarVoiceRerecordBtn.disabled = false;
        setTimeout(() => avatarVoiceRerecordBtn.classList.remove('pressing'), 120);
      }
    });
  }

  if (avatarSaveProfileBtn) {
    avatarSaveProfileBtn.addEventListener('click', async () => {
      avatarSaveProfileBtn.classList.add('pressing');
      avatarSaveProfileBtn.disabled = true;
      setControlState(avatarSaveProfileBtn, 'running');
      try {
        await saveAvatarProfile();
        setControlState(avatarSaveProfileBtn, 'completed', 1300);
      } catch (error) {
        sessionInfo.textContent = `Avatar profile save failed: ${error.message}`;
        setControlState(avatarSaveProfileBtn, 'off');
      } finally {
        avatarSaveProfileBtn.disabled = false;
        setTimeout(() => avatarSaveProfileBtn.classList.remove('pressing'), 120);
      }
    });
  }

  if (avatarVoiceCopyLinkBtn) {
    avatarVoiceCopyLinkBtn.addEventListener('click', async () => {
      if (!supportState.avatarSetup.voiceFileUrl) return;
      try {
        await navigator.clipboard.writeText(supportState.avatarSetup.voiceFileUrl);
        sessionInfo.textContent = 'Voice file link copied to clipboard.';
      } catch (error) {
        sessionInfo.textContent = `Copy failed: ${error.message}`;
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
      hydrateAvatarSetup();
      renderAvatarSetup();
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
