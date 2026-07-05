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
  const avatarCreatedCard = document.getElementById('phoneAvatarCreatedCard');
  const avatarCreatedTitle = document.getElementById('phoneAvatarCreatedTitle');
  const avatarCreatedMeta = document.getElementById('phoneAvatarCreatedMeta');
  const avatarReturnLink = document.getElementById('phoneAvatarReturnLink');
  const phoneVoiceHelp = document.getElementById('phoneVoiceHelp');
  const phoneVoiceScript = document.getElementById('phoneVoiceScript');
  const productMonitor = document.getElementById('phoneProductMonitor');
  const productSearchInput = document.getElementById('phoneProductSearch');
  const platformSelect = document.getElementById('phonePlatformSelect');
  const productList = document.getElementById('phoneProductList');
  const productDetails = document.getElementById('phoneProductDetails');
  const productImage = document.getElementById('phoneProductImage');
  const productTitle = document.getElementById('phoneProductTitle');
  const productMeta = document.getElementById('phoneProductMeta');
  const productReferences = document.getElementById('phoneProductReferences');
  const attireTopSelect = document.getElementById('phoneAttireTop');
  const attireBottomSelect = document.getElementById('phoneAttireBottom');
  const attireStyleSelect = document.getElementById('phoneAttireStyle');
  const attireTopColorSelect = document.getElementById('phoneAttireTopColor');
  const attireBottomColorSelect = document.getElementById('phoneAttireBottomColor');
  const attireUsePhotoCheckbox = document.getElementById('phoneAttireUsePhoto');
  const attireGrid = document.getElementById('phoneAttireGrid');
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
      avatarId: '',
      requestId: '',
      createdAvatar: null,
      returnTo: '',
      selectedProductId: '',
      selectedPlatform: 'tiktok',
      selectedProduct: null,
      productReferences: [],
      attire: {
        usePhoto: false,
        top: 'corporate-blazer',
        bottom: 'dress-pants',
        style: 'corporate-executive',
        topColor: 'black',
        bottomColor: 'black'
      }
    },
    products: [],
    voiceReferenceScript: ''
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

  async function loadVoiceReferenceScript() {
    try {
      const response = await fetch('/api/affiliate/avatar/voice-reference-script', {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      const script = payload.script && (payload.script.scriptText || payload.script.text) ? String(payload.script.scriptText || payload.script.text) : '';
      supportState.voiceReferenceScript = script || supportState.voiceReferenceScript || '';
      if (phoneVoiceScript) {
        phoneVoiceScript.textContent = supportState.voiceReferenceScript || 'Voice reference script unavailable.';
      }
    } catch (error) {
      supportState.voiceReferenceScript = 'I use the Phone App as my personal affiliate control center. It lets me upload a voice sample and profile photo to create my AI avatar, then review it, choose a product from the approved catalog, and select the platform I want to advertise on. From there, the request goes into the Affiliate Hub, which turns my avatar, voice identity, and product choice into a platform-ready video built for TikTok, Instagram Reels, YouTube Shorts, Facebook, and more.\n\nThe hub uses product data, viral content patterns, and AI scoring to build the strongest script and format possible, and if AI can create something better than the scraped references, it uses its best judgment. This gives me a simple, scalable way to post AI avatar-driven product videos and earn commissions from sales generated through my affiliate content.';
      if (phoneVoiceScript) {
        phoneVoiceScript.textContent = supportState.voiceReferenceScript;
      }
      console.warn('Voice reference script load failed', error);
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
      supportState.avatarSetup.requestId = String(parsed.requestId || '');
      supportState.avatarSetup.createdAvatar = parsed.createdAvatar || null;
      supportState.avatarSetup.returnTo = String(parsed.returnTo || '');
      supportState.avatarSetup.selectedProductId = String(parsed.selectedProductId || '');
      supportState.avatarSetup.selectedPlatform = String(parsed.selectedPlatform || 'tiktok');
      supportState.avatarSetup.selectedProduct = parsed.selectedProduct || null;
      supportState.avatarSetup.productReferences = Array.isArray(parsed.productReferences) ? parsed.productReferences : [];
      if (parsed.attire && typeof parsed.attire === 'object') {
        supportState.avatarSetup.attire = {
          usePhoto: Boolean(parsed.attire.usePhoto),
          top: String(parsed.attire.top || 'corporate-blazer'),
          bottom: String(parsed.attire.bottom || 'dress-pants'),
          style: String(parsed.attire.style || 'corporate-executive'),
          topColor: String(parsed.attire.topColor || 'black'),
          bottomColor: String(parsed.attire.bottomColor || 'black')
        };
      }
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
      parts.push(supportState.avatarSetup.selectedProduct ? `Product: ${supportState.avatarSetup.selectedProduct.title || 'selected'}` : 'Product pending');
      parts.push(`Platform: ${platformLabelOf(supportState.avatarSetup.selectedPlatform)}`);
      if (supportState.avatarSetup.avatarId) parts.push(`Avatar: ${supportState.avatarSetup.avatarId}`);
      avatarMonitor.textContent = parts.join(' · ');
    }
    if (avatarCreatedCard && avatarCreatedTitle && avatarCreatedMeta && avatarReturnLink) {
      const created = supportState.avatarSetup.createdAvatar;
      if (created && created.avatarId) {
        avatarCreatedTitle.textContent = `Avatar created: ${created.name || created.avatarId}`;
        avatarCreatedMeta.textContent = `Avatar ID ${created.avatarItemId || created.avatarId} · source ${created.source || 'phone-app'} · returned to phone app`;
        avatarReturnLink.href = supportState.avatarSetup.returnTo || '/phone-app';
        avatarReturnLink.textContent = 'Return to phone app';
        avatarCreatedCard.classList.remove('hidden');
      } else {
        avatarCreatedCard.classList.add('hidden');
      }
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
    if (phoneVoiceScript) {
      phoneVoiceScript.textContent = supportState.voiceReferenceScript || 'Loading voice reference script…';
    }
    // Sync attire selects with state
    if (attireUsePhotoCheckbox) attireUsePhotoCheckbox.checked = supportState.avatarSetup.attire.usePhoto;
    if (attireGrid) {
      if (supportState.avatarSetup.attire.usePhoto) {
        attireGrid.classList.add('disabled');
      } else {
        attireGrid.classList.remove('disabled');
      }
    }
    if (attireTopSelect) attireTopSelect.value = supportState.avatarSetup.attire.top;
    if (attireBottomSelect) attireBottomSelect.value = supportState.avatarSetup.attire.bottom;
    if (attireStyleSelect) attireStyleSelect.value = supportState.avatarSetup.attire.style;
    if (attireTopColorSelect) attireTopColorSelect.value = supportState.avatarSetup.attire.topColor;
    if (attireBottomColorSelect) attireBottomColorSelect.value = supportState.avatarSetup.attire.bottomColor;
  }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    function platformLabelOf(value) {
      const normalized = String(value || 'tiktok').toLowerCase();
      if (normalized === 'instagram') return 'Instagram Reels 9:16';
      if (normalized === 'youtube') return 'YouTube Shorts 9:16';
      if (normalized === 'facebook') return 'Facebook Feed 16:9';
      return 'TikTok 9:16';
    }

    function renderProductSelection() {
      const products = Array.isArray(supportState.products) ? supportState.products : [];
      const query = String(productSearchInput?.value || '').trim().toLowerCase();
      const filtered = query
        ? products.filter((item) => {
            const haystack = [
              item.title,
              item.product_type,
              item.category,
              item.handle,
              item.tags && item.tags.join ? item.tags.join(' ') : ''
            ].join(' ').toLowerCase();
            return haystack.includes(query);
          })
        : products;

      if (!productList) return;
      if (!filtered.length) {
        productList.innerHTML = '<div class="product-empty">No products match your search.</div>';
        return;
      }

      productList.innerHTML = filtered.map((item) => {
        const selected = String(item.id) === String(supportState.avatarSetup.selectedProductId);
        const badges = [
          item.category || item.product_type || 'Product',
          item.salesVelocity || (item.viralScore ? `Viral ${item.viralScore}` : null),
          item.intelligence && item.intelligence.bestPlatform ? item.intelligence.bestPlatform : null
        ].filter(Boolean);
        return `<article class="product-card ${selected ? 'selected' : ''}" data-product-id="${escapeHtml(item.id)}">
          <div class="product-card-top">
            <strong>${escapeHtml(item.title)}</strong>
            <div class="product-meta">$${Number(item.price || 0).toFixed(2)} · ${escapeHtml(item.estimatedPayout || item.commissionPercent || '')}${item.estimatedPayout ? '' : '%'}</div>
          </div>
          <div class="product-badges">
            ${badges.map((badge) => `<span class="product-badge">${escapeHtml(badge)}</span>`).join('')}
          </div>
        </article>`;
      }).join('');

      productList.querySelectorAll('.product-card').forEach((card) => {
        card.addEventListener('click', () => {
          const productId = card.getAttribute('data-product-id');
          const index = products.findIndex((item) => String(item.id) === String(productId));
          if (index >= 0) selectProduct(index);
        });
      });
    }

    async function loadProductReferences(product) {
      const refs = [];
      if (!product || !product.handle) return refs;
      try {
        const response = await fetch(`/api/viral-media/products/${encodeURIComponent(product.handle)}/similar-ads?limit=3`, {
          headers: { Accept: 'application/json' }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload.error || `Request failed: ${response.status}`);
        }
        const items = Array.isArray(payload.similarAds)
          ? payload.similarAds
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.references)
              ? payload.references
              : [];
        return items.slice(0, 3);
      } catch (error) {
        console.warn('Similar-ad lookup failed', error);
        return refs;
      }
    }

    function renderSelectedProductDetails() {
      const selected = supportState.avatarSetup.selectedProduct;
      if (!productDetails || !productTitle || !productMeta || !productImage || !productReferences || !productMonitor) return;

      if (!selected) {
        productDetails.classList.add('hidden');
        productMonitor.textContent = 'No product selected yet.';
        return;
      }

      productDetails.classList.remove('hidden');
      productTitle.textContent = selected.title || 'Selected product';
      const parts = [];
      parts.push(selected.category || selected.product_type || 'Product');
      if (selected.price !== undefined && selected.price !== null) parts.push(`$${Number(selected.price || 0).toFixed(2)}`);
      if (selected.estimatedPayout) parts.push(`Est. payout ${selected.estimatedPayout}`);
      if (selected.viralScore) parts.push(`Viral score ${selected.viralScore}`);
      if (selected.intelligence && selected.intelligence.bestPlatform) parts.push(`Best platform ${selected.intelligence.bestPlatform}`);
      productMeta.textContent = parts.join(' · ');
      if (selected.imageUrl || selected.image || selected.image_url) {
        productImage.src = selected.imageUrl || selected.image || selected.image_url;
        productImage.classList.remove('hidden');
      } else {
        productImage.removeAttribute('src');
        productImage.classList.add('hidden');
      }
      productMonitor.textContent = `${selected.title || 'Product selected'} · ${platformLabelOf(supportState.avatarSetup.selectedPlatform)}`;
      if (supportState.avatarSetup.productReferences.length) {
        productReferences.innerHTML = supportState.avatarSetup.productReferences.map((item) => {
          const title = item.title || item.scriptTitle || item.hook || item.name || 'Reference';
          const meta = [
            item.platform || item.source || 'viral ad',
            item.format || item.formatLabel || item.mediaType || 'format',
            item.similarityScore ? `Match ${item.similarityScore}` : null
          ].filter(Boolean).join(' · ');
          const link = item.sourceUrl || item.videoUrl || item.video_url || item.url || '';
          return `<div class="product-reference">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(meta)}</span>
            ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">Open reference</a>` : ''}
          </div>`;
        }).join('');
      } else {
        productReferences.innerHTML = '<div class="product-empty">No similar ad references loaded yet.</div>';
      }
    }

    async function selectProduct(idx) {
      const products = Array.isArray(supportState.products) ? supportState.products : [];
      const selected = products[idx];
      if (!selected) return;
      supportState.avatarSetup.selectedProductId = String(selected.id || '');
      supportState.avatarSetup.selectedProduct = selected;
      supportState.avatarSetup.productReferences = await loadProductReferences(selected);
      if (platformSelect) {
        supportState.avatarSetup.selectedPlatform = String(platformSelect.value || supportState.avatarSetup.selectedPlatform || 'tiktok');
      }
      persistAvatarSetup();
      renderProductSelection();
      renderSelectedProductDetails();
      const link = selected.affiliateLink || selected.productUrl || selected.productPageUrl || '';
      if (link) {
        setStatus(`Selected ${selected.title}. Your affiliate link is ready.`, 'success');
      } else {
        setStatus(`Selected ${selected.title}.`, 'success');
      }
    }

    async function loadProducts() {
      if (!productList) return;
      const query = String(productSearchInput?.value || '').trim();
      const url = new URL('/api/affiliate/workspace/products', window.location.origin);
      url.searchParams.set('affiliateCode', supportState.affiliateCode || 'ROLAND787');
      url.searchParams.set('source', 'viral');
      url.searchParams.set('limit', '24');
      if (query) url.searchParams.set('q', query);
      try {
        const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload.error || `Request failed: ${response.status}`);
        }
        const products = Array.isArray(payload.products) ? payload.products : Array.isArray(payload.items) ? payload.items : [];
        supportState.products = products;
        renderProductSelection();

        const selectedId = supportState.avatarSetup.selectedProductId;
        if (selectedId) {
          const matchIndex = products.findIndex((item) => String(item.id) === String(selectedId));
          if (matchIndex >= 0) {
            supportState.avatarSetup.selectedProduct = products[matchIndex];
            supportState.avatarSetup.productReferences = await loadProductReferences(products[matchIndex]);
            renderSelectedProductDetails();
          }
        } else {
          renderSelectedProductDetails();
        }
      } catch (error) {
        productList.innerHTML = `<div class="product-empty">Unable to load products: ${escapeHtml(error.message)}</div>`;
        setStatus(`Product load failed: ${error.message}`, 'error');
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
    if (!supportState.avatarSetup.selectedProduct) {
      throw new Error('Please select a product before sending the avatar to the hub.');
    }
    const payload = await apiJson('/api/affiliate/avatar/request', {
      method: 'POST',
      body: JSON.stringify({
        affiliateId: supportState.affiliateCode,
        name: `${supportState.affiliateName} Avatar`,
        style: 'avatar',
        photoUrl: supportState.avatarSetup.photoUrl || null,
        voiceFilePath: supportState.avatarSetup.voiceFilePath || null,
        voiceFileUrl: supportState.avatarSetup.voiceFileUrl || null,
        productId: supportState.avatarSetup.selectedProduct.id || null,
        productHandle: supportState.avatarSetup.selectedProduct.handle || null,
        productTitle: supportState.avatarSetup.selectedProduct.title || null,
        productPageUrl: supportState.avatarSetup.selectedProduct.productPageUrl || supportState.avatarSetup.selectedProduct.productUrl || null,
        productImageUrl: supportState.avatarSetup.selectedProduct.imageUrl || supportState.avatarSetup.selectedProduct.image || supportState.avatarSetup.selectedProduct.image_url || null,
        platform: supportState.avatarSetup.selectedPlatform || platformSelect?.value || 'tiktok',
        platformLabel: platformLabelOf(supportState.avatarSetup.selectedPlatform || platformSelect?.value || 'tiktok'),
        attire: supportState.avatarSetup.attire,
        source: 'phone-app',
        returnTo: `/phone-app?affiliateCode=${encodeURIComponent(supportState.affiliateCode)}&affiliateName=${encodeURIComponent(supportState.affiliateName)}`
      })
    });
    supportState.avatarSetup.requestId = String(payload.requestId || '');
    supportState.avatarSetup.returnTo = String(payload.request?.returnTo || '/phone-app');
    supportState.avatarSetup.productReferences = Array.isArray(supportState.avatarSetup.productReferences)
      ? supportState.avatarSetup.productReferences
      : [];
    localStorage.setItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`, supportState.avatarSetup.requestId);
    persistAvatarSetup();
    renderAvatarSetup();
    renderSelectedProductDetails();
    sessionInfo.textContent = 'Avatar request sent to Affiliate Hub with the selected product and platform.';
    if (payload.hubUrl) {
      window.location.href = payload.hubUrl;
    }
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

  function getAvatarRequestIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get('avatarRequestId') || params.get('requestId') || localStorage.getItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`) || '').trim();
  }

  async function syncAvatarRequestStatus() {
    const requestId = getAvatarRequestIdFromUrl();
    if (!requestId) return;
    const payload = await apiJson(`/api/affiliate/avatar/request/${encodeURIComponent(requestId)}`);
    const request = payload.request || null;
    if (!request) return;
    supportState.avatarSetup.requestId = request.requestId || requestId;
    supportState.avatarSetup.returnTo = request.returnTo || supportState.avatarSetup.returnTo || '/phone-app';
    supportState.avatarSetup.selectedProductId = String(request.productId || supportState.avatarSetup.selectedProductId || '');
    supportState.avatarSetup.selectedPlatform = String(request.platform || supportState.avatarSetup.selectedPlatform || 'tiktok');
    if (platformSelect) platformSelect.value = supportState.avatarSetup.selectedPlatform;
    if (request.productId || request.productTitle) {
      supportState.avatarSetup.selectedProduct = {
        id: request.productId || '',
        handle: request.productHandle || '',
        title: request.productTitle || 'Selected product',
        productPageUrl: request.productPageUrl || '',
        productUrl: request.productPageUrl || '',
        imageUrl: request.productImageUrl || ''
      };
    }
    localStorage.setItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`, supportState.avatarSetup.requestId);
    if (request.status === 'completed' && request.avatar) {
      supportState.avatarSetup.createdAvatar = request.avatar;
      supportState.avatarSetup.avatarId = String(request.avatar.avatarItemId || request.avatar.avatarId || request.avatar.id || '');
      supportState.avatarSetup.photoUrl = String(request.avatar.photoUrl || supportState.avatarSetup.photoUrl || '');
      supportState.avatarSetup.voiceFileUrl = String(request.avatar.voiceFileUrl || supportState.avatarSetup.voiceFileUrl || '');
      supportState.avatarSetup.voiceFilePath = String(request.avatar.voiceFilePath || supportState.avatarSetup.voiceFilePath || '');
      persistAvatarSetup();
      renderAvatarSetup();
      renderSelectedProductDetails();
      sessionInfo.textContent = `Avatar created through Affiliate Hub and returned to ${supportState.affiliateCode}.`;
    } else if (request.status === 'queued' || request.status === 'processing') {
      sessionInfo.textContent = 'Avatar request is queued in Affiliate Hub. Creating now...';
    } else if (request.status === 'failed') {
      sessionInfo.textContent = `Avatar request failed: ${request.error || 'Unknown error'}`;
    }
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

  if (platformSelect) {
    platformSelect.value = supportState.avatarSetup.selectedPlatform || 'tiktok';
    platformSelect.addEventListener('change', () => {
      supportState.avatarSetup.selectedPlatform = platformSelect.value;
      persistAvatarSetup();
      renderSelectedProductDetails();
      setStatus(`Platform set to ${platformLabelOf(platformSelect.value)}.`, 'success');
    });
  }

  // ── Attire selection listeners ─────────────────────────────────────────────
  if (attireUsePhotoCheckbox) {
    attireUsePhotoCheckbox.addEventListener('change', () => {
      supportState.avatarSetup.attire.usePhoto = attireUsePhotoCheckbox.checked;
      if (attireGrid) {
        if (attireUsePhotoCheckbox.checked) {
          attireGrid.classList.add('disabled');
        } else {
          attireGrid.classList.remove('disabled');
        }
      }
      persistAvatarSetup();
    });
  }
  function bindAttireSelect(el, key) {
    if (!el) return;
    el.addEventListener('change', () => {
      supportState.avatarSetup.attire[key] = el.value;
      persistAvatarSetup();
    });
  }
  bindAttireSelect(attireTopSelect, 'top');
  bindAttireSelect(attireBottomSelect, 'bottom');
  bindAttireSelect(attireStyleSelect, 'style');
  bindAttireSelect(attireTopColorSelect, 'topColor');
  bindAttireSelect(attireBottomColorSelect, 'bottomColor');

  if (productSearchInput) {
    let searchTimer = null;
    productSearchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        void loadProducts();
      }, 200);
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
      await loadVoiceReferenceScript();
      await syncAvatarRequestStatus();
      await loadProducts();
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
  setInterval(() => { void syncAvatarRequestStatus(); }, 10000);
})();
