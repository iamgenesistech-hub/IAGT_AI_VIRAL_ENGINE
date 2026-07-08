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
  // Affiliate profile banner
  const affiliateProfileBanner = document.getElementById('phoneAffiliateProfile');
  const affiliateProfilePic = document.getElementById('phoneAffiliateProfilePic');
  const affiliateProfileName = document.getElementById('phoneAffiliateProfileName');
  const affiliateProfileCode = document.getElementById('phoneAffiliateProfileCode');
  const avatarMonitor = document.getElementById('phoneAvatarMonitor');
  const avatarPhotoInput = document.getElementById('phoneAvatarPhotoInput');
  const avatarPhotoUploadBtn = document.getElementById('phoneAvatarPhotoUpload');
  const avatarPhotoPreview = document.getElementById('phoneAvatarPhotoPreview');
  const avatarVoiceInput = document.getElementById('phoneAvatarVoiceInput');
  const avatarVoiceRecordBtn = document.getElementById('phoneAvatarVoiceRecord');
  const avatarVoiceRerecordBtn = document.getElementById('phoneAvatarVoiceRerecord');
  const avatarVoiceUploadBtn = document.getElementById('phoneAvatarVoiceUpload');
  const avatarVoicePreview = document.getElementById('phoneAvatarVoicePreview');
  const voiceVolumeRow = document.getElementById('phoneVoiceVolumeRow');
  const voiceVolumeSlider = document.getElementById('phoneVoiceVolume');
  const voiceVolumeValue = document.getElementById('phoneVoiceVolumeValue');
  const avatarVoiceTimestamp = document.getElementById('phoneAvatarVoiceTimestamp');
  const avatarSaveProfileBtn = document.getElementById('phoneAvatarSaveProfile');
  const avatarCreatedCard = document.getElementById('phoneAvatarCreatedCard');
  const avatarCreatedTitle = document.getElementById('phoneAvatarCreatedTitle');
  const avatarCreatedMeta = document.getElementById('phoneAvatarCreatedMeta');
  const avatarReturnLink = document.getElementById('phoneAvatarReturnLink');
  const avatarBindingBadge = document.getElementById('phoneAvatarBindingBadge');
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
  const attireGenderSelect = document.getElementById('phoneAttireGender');
  const attireGenderHint = document.getElementById('phoneAttireGenderHint');
  const attireModeSelect = document.getElementById('phoneAttireMode');
  const attireDetailedSection = document.getElementById('phoneAttireDetailedSection');
  const attireOverallSection = document.getElementById('phoneAttireOverallSection');
  const attireOverallFormalitySelect = document.getElementById('phoneAttireOverallFormality');
  const attireOverallFitSelect = document.getElementById('phoneAttireOverallFit');
  const attireOverallSeasonSelect = document.getElementById('phoneAttireOverallSeason');
  const attireOverallPresentationSelect = document.getElementById('phoneAttireOverallPresentation');
  const attireUsePhotoCheckbox = document.getElementById('phoneAttireUsePhoto');
  const attireGrid = document.getElementById('phoneAttireGrid');
  const createAvatarBtn = document.getElementById('phoneCreateAvatarBtn');
  const createAvatarStatus = document.getElementById('phoneCreateAvatarStatus');
  const avatarLibraryMonitor = document.getElementById('phoneAvatarLibraryMonitor');
  const avatarLibraryGrid = document.getElementById('phoneAvatarLibraryGrid');
  const avatarLibraryPreview = document.getElementById('phoneAvatarLibraryPreview');
  const avatarLibraryPreviewImage = document.getElementById('phoneAvatarLibraryPreviewImage');
  const avatarLibraryPreviewVideo = document.getElementById('phoneAvatarLibraryPreviewVideo');
  const avatarLibraryPreviewTitle = document.getElementById('phoneAvatarLibraryPreviewTitle');
  const avatarLibraryPreviewMeta = document.getElementById('phoneAvatarLibraryPreviewMeta');
  const avatarLibraryPreviewPrompt = document.getElementById('phoneAvatarLibraryPreviewPrompt');
  const avatarLibraryRefreshBtn = document.getElementById('phoneAvatarLibraryRefresh');
  const avatarLibraryDeleteBtn = document.getElementById('phoneAvatarLibraryDelete');
  const generateProductVideoBtn = document.getElementById('phoneGenerateProductVideo');
  const productVideoStatus = document.getElementById('phoneProductVideoStatus');
  const productVideoMonitor = document.getElementById('phoneProductVideoMonitor');
  const productVideoGrid = document.getElementById('phoneProductVideoGrid');
  const productVideoPreview = document.getElementById('phoneProductVideoPreview');
  const productVideoPlayer = document.getElementById('phoneProductVideoPlayer');
  const productVideoTitle = document.getElementById('phoneProductVideoTitle');
  const productVideoMeta = document.getElementById('phoneProductVideoMeta');
  const productVideoScript = document.getElementById('phoneProductVideoScript');
  const productVideoRefreshBtn = document.getElementById('phoneProductVideoRefresh');
  const modalState = { open: false, item: null };
  const CONTROL_STANDBY_MS = 60000;
  const controlTimers = new Map();
  const voiceRecordState = {
    recorder: null,
    stream: null,
    chunks: [],
    active: false,
    lastBlob: null,
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
      voiceFileUpdatedAt: '',
      profileId: '',
      voiceCloneId: '',
      voiceId: '',
      avatarId: '',
      requestId: '',
      nativeAvatarJobId: '',
      nativeAvatarStatusUrl: '',
      createdAvatar: null,
      returnTo: '',
      selectedProductId: '',
      selectedPlatform: 'tiktok',
      selectedProduct: null,
      productReferences: [],
      attire: {
        gender: '',
        lastGender: '',
        usePhoto: false,
        mode: 'detailed',
        top: 'corporate-blazer',
        bottom: 'dress-pants',
        style: 'corporate-executive',
        topColor: 'black',
        bottomColor: 'black',
        overallFormality: 'business-formal',
        overallFit: 'tailored',
        overallSeason: 'all-season',
        overallPresentation: 'polished'
      }
    },
    products: [],
    voiceReferenceScript: '',
    avatarLibrary: [],
    selectedAvatarLibraryId: '',
    productVideos: [],
    selectedProductVideoId: ''
  };
  // Flag to prevent event listeners from firing when we're programmatically setting UI values from state
  let isRenderingFromState = false;
  const ATTIRE_GENDER_GUARDRAILS = {
    top: {
      male: new Set(['corporate-blazer', 'dress-shirt', 'button-down-shirt', 'polo-shirt', 't-shirt', 'sweater', 'executive-jacket', 'casual-hoodie', 'vest']),
      female: new Set(['corporate-blazer', 't-shirt', 'blouse', 'cardigan', 'sweater', 'executive-jacket', 'casual-hoodie', 'tunic', 'wrap-top'])
    },
    bottom: {
      male: new Set(['dress-pants', 'slacks', 'chinos', 'trousers', 'jeans', 'shorts', 'joggers', 'cargo-pants']),
      female: new Set(['dress-pants', 'trousers', 'wide-leg-trousers', 'skirt', 'pencil-skirt', 'dress', 'jeans', 'shorts', 'joggers', 'leggings', 'culottes'])
    },
    style: {
      male: new Set(['corporate-executive', 'boardroom-formal', 'sales-persona', 'business-casual', 'creative-professional', 'luxury-elegant', 'smart-casual', 'athleisure-premium', 'streetwear-polished', 'warm-climate-light']),
      female: new Set(['corporate-executive', 'boardroom-formal', 'sales-persona', 'business-casual', 'creative-professional', 'luxury-elegant', 'smart-casual', 'athleisure-premium', 'streetwear-polished', 'warm-climate-light'])
    }
  };
  const ATTIRE_GENDER_DEFAULTS = {
    male: { top: 'corporate-blazer', bottom: 'dress-pants', style: 'corporate-executive' },
    female: { top: 'blouse', bottom: 'pencil-skirt', style: 'corporate-executive' }
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
      supportState.voiceReferenceScript = 'I use the Phone App as my personal affiliate control center. It lets me upload a voice sample and profile photo to create my AI avatar, then review it, choose a product from the approved catalog, and select the platform I want to advertise on. From there, the request goes into the Affiliate Hub, which turns my avatar, voice identity, and product choice into a platform-ready video built for TikTok, Instagram Reels, YouTube Shorts, Facebook, and more.\n\nThe hub uses product data, viral content patterns, and AI scoring to build the strongest script and format possible. It uses its best judgment. This gives me a simple, scalable way to post AI avatar-driven product videos and earn commissions from sales generated through my affiliate content.';
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

  function normalizeAffiliateCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
  }

  function scopedStorageKey(prefix, affiliateCode = supportState.affiliateCode) {
    return `${prefix}:${normalizeAffiliateCode(affiliateCode) || 'default'}`;
  }

  function normalizeAttireGender(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'man' || normalized === 'men') return 'male';
    if (normalized === 'female' || normalized === 'woman' || normalized === 'women') return 'female';
    return '';
  }

  function getLockedAttireGender() {
    return normalizeAttireGender(supportState.avatarSetup.attire.gender)
      || normalizeAttireGender(supportState.avatarSetup.attire.lastGender)
      || loadAttireGenderLock();
  }

  function setLockedAttireGender(gender) {
    const normalized = saveAttireGenderLock(gender);
    supportState.avatarSetup.attire.gender = normalized;
    supportState.avatarSetup.attire.lastGender = normalized;
    return normalized;
  }

  function attireGenderLabel(value) {
    const normalized = normalizeAttireGender(value);
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    return 'Unspecified';
  }

  function attireValueAllowedForGender(key, gender, value) {
    const rules = ATTIRE_GENDER_GUARDRAILS[key];
    if (!rules) return true;
    const normalizedGender = normalizeAttireGender(gender);
    if (!normalizedGender) return false;
    return rules[normalizedGender].has(String(value || '').trim());
  }

  function applyGenderGuardrailToSelect(selectEl, key, gender, currentValue) {
    if (!selectEl) return currentValue;
    const rules = ATTIRE_GENDER_GUARDRAILS[key];
    if (!rules) return currentValue;
    const normalizedGender = normalizeAttireGender(gender);
    Array.from(selectEl.options).forEach((option) => {
      if (!option.value) return;
      const allowed = normalizedGender ? rules[normalizedGender].has(option.value) : false;
      option.hidden = !allowed;
      option.disabled = !allowed;
    });
    const fallbackValue = normalizedGender ? ATTIRE_GENDER_DEFAULTS[normalizedGender][key] : '';
    const nextValue = normalizedGender && attireValueAllowedForGender(key, normalizedGender, currentValue)
      ? currentValue
      : fallbackValue;
    selectEl.value = nextValue;
    selectEl.disabled = !normalizedGender;
    return nextValue;
  }

  function buildAvatarAttirePayload() {
    updateAttireModeUI();
    const gender = normalizeAttireGender(supportState.avatarSetup.attire.gender);
    if (!gender) {
      throw new Error('Please choose Male or Female so the avatar only uses matching attire selections.');
    }
    const usePhoto = Boolean(supportState.avatarSetup.attire.usePhoto);
    const mode = usePhoto ? 'photo' : String(supportState.avatarSetup.attire.mode || 'detailed').toLowerCase();
    const payload = {
      gender,
      usePhoto,
      usePhotoClothing: usePhoto,
      mode,
      top: String(supportState.avatarSetup.attire.top || ''),
      topColor: String(supportState.avatarSetup.attire.topColor || 'black'),
      bottom: String(supportState.avatarSetup.attire.bottom || ''),
      bottomColor: String(supportState.avatarSetup.attire.bottomColor || 'black'),
      style: String(supportState.avatarSetup.attire.style || ''),
      overallStyle: String(supportState.avatarSetup.attire.style || ''),
      overallFormality: String(supportState.avatarSetup.attire.overallFormality || ''),
      overallFit: String(supportState.avatarSetup.attire.overallFit || ''),
      overallSeason: String(supportState.avatarSetup.attire.overallSeason || ''),
      overallPresentation: String(supportState.avatarSetup.attire.overallPresentation || '')
    };
    if (!usePhoto && payload.mode === 'detailed' && (!payload.top || !payload.bottom)) {
      throw new Error('Choose a top and bottom that match the selected gender, or use the clothing shown in the uploaded photo.');
    }
    if (!usePhoto && payload.mode === 'overall' && !payload.style) {
      throw new Error('Choose an overall attire direction that matches the selected gender.');
    }
    supportState.avatarSetup.attire = {
      gender: payload.gender,
      lastGender: payload.gender,
      usePhoto: payload.usePhoto,
      mode: payload.mode === 'photo' ? 'detailed' : payload.mode,
      top: payload.top,
      bottom: payload.bottom,
      style: payload.style,
      topColor: payload.topColor,
      bottomColor: payload.bottomColor,
      overallFormality: payload.overallFormality,
      overallFit: payload.overallFit,
      overallSeason: payload.overallSeason,
      overallPresentation: payload.overallPresentation
    };
    persistAvatarSetup();
    return payload;
  }

  function activeAffiliateCode() {
    return normalizeAffiliateCode(supportState.affiliateCode);
  }

  function recordAffiliateCode(item) {
    return normalizeAffiliateCode(item && (
      item.affiliateCode ||
      item.affiliateId ||
      item.avatar?.affiliateCode ||
      item.request?.affiliateCode
    ));
  }

  function isOwnedByActiveAffiliate(item) {
    const activeCode = activeAffiliateCode();
    const ownerCode = recordAffiliateCode(item);
    return Boolean(activeCode && ownerCode && ownerCode === activeCode);
  }

  function avatarStorageKey() {
    return scopedStorageKey('evicsPhoneAvatarSetup');
  }

  function attireGenderStorageKey() {
    return scopedStorageKey('evicsPhoneAttireGender');
  }

  function migrateScopedStorage(prefix, fromCode, toCode) {
    const fromKey = scopedStorageKey(prefix, fromCode);
    const toKey = scopedStorageKey(prefix, toCode);
    if (fromKey === toKey) return;
    const stored = localStorage.getItem(fromKey);
    if (stored !== null && localStorage.getItem(toKey) === null) {
      localStorage.setItem(toKey, stored);
    }
  }

  function saveAttireGenderLock(gender) {
    const normalized = normalizeAttireGender(gender);
    if (normalized) {
      localStorage.setItem(attireGenderStorageKey(), normalized);
    } else {
      localStorage.removeItem(attireGenderStorageKey());
    }
    return normalized;
  }

  function loadAttireGenderLock() {
    const currentKey = attireGenderStorageKey();
    const stored = localStorage.getItem(currentKey);
    if (stored !== null) return normalizeAttireGender(stored);
    const fallbackKey = scopedStorageKey('evicsPhoneAttireGender', 'default');
    const fallback = localStorage.getItem(fallbackKey);
    if (fallback !== null) {
      localStorage.setItem(currentKey, fallback);
      return normalizeAttireGender(fallback);
    }
    return '';
  }

  function persistAvatarSetup() {
    localStorage.setItem(avatarStorageKey(), JSON.stringify(supportState.avatarSetup));
  }

  function formatVoiceTimestamp(value) {
    if (!value) return 'Last voice file: not recorded yet.';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Last voice file: not recorded yet.';
    return `Last voice file: ${date.toLocaleString()}`;
  }

  function mediaPlaceholder(label) {
    const safeLabel = String(label || 'Preview unavailable').replace(/[<>]/g, '');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" rx="36" fill="#08111b"/><rect x="24" y="24" width="752" height="752" rx="28" fill="none" stroke="#1ec8f2" stroke-opacity=".28" stroke-width="6"/><text x="400" y="386" text-anchor="middle" fill="#8fb7c9" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">${safeLabel}</text><text x="400" y="438" text-anchor="middle" fill="#6b7e8f" font-family="Segoe UI, Arial, sans-serif" font-size="18">Media preview unavailable</text></svg>`)}`;
  }

  function hydrateAvatarSetup() {
    const currentKey = avatarStorageKey();
    let raw = localStorage.getItem(currentKey);
    if (!raw) {
      const fallbackKey = scopedStorageKey('evicsPhoneAvatarSetup', 'default');
      raw = localStorage.getItem(fallbackKey);
      if (raw) localStorage.setItem(currentKey, raw);
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      supportState.avatarSetup.photoUrl = String(parsed.photoUrl || '').trim() || '';
      supportState.avatarSetup.voiceFileUrl = String(parsed.voiceFileUrl || '').trim() || '';
      supportState.avatarSetup.voiceFilePath = String(parsed.voiceFilePath || '').trim() || '';
      supportState.avatarSetup.voiceFileUpdatedAt = String(parsed.voiceFileUpdatedAt || '').trim() || '';
      supportState.avatarSetup.profileId = String(parsed.profileId || '').trim() || '';
      supportState.avatarSetup.voiceCloneId = String(parsed.voiceCloneId || '').trim() || '';
      supportState.avatarSetup.voiceId = String(parsed.voiceId || '').trim() || '';
      supportState.avatarSetup.avatarId = String(parsed.avatarId || '').trim() || '';
      supportState.avatarSetup.requestId = String(parsed.requestId || '').trim() || '';
      supportState.avatarSetup.nativeAvatarJobId = String(parsed.nativeAvatarJobId || '').trim() || '';
      supportState.avatarSetup.nativeAvatarStatusUrl = String(parsed.nativeAvatarStatusUrl || '').trim() || '';
      supportState.avatarSetup.createdAvatar = parsed.createdAvatar || null;
      supportState.avatarSetup.returnTo = String(parsed.returnTo || '').trim() || '';
      supportState.avatarSetup.selectedProductId = String(parsed.selectedProductId || '').trim() || '';
      supportState.avatarSetup.selectedPlatform = String(parsed.selectedPlatform || 'tiktok').trim() || 'tiktok';
      supportState.avatarSetup.selectedProduct = parsed.selectedProduct || null;
      supportState.avatarSetup.productReferences = Array.isArray(parsed.productReferences) ? parsed.productReferences : [];
      if (parsed.attire && typeof parsed.attire === 'object') {
        const storedGender = normalizeAttireGender(parsed.attire.gender)
          || normalizeAttireGender(parsed.attire.lastGender)
          || loadAttireGenderLock();
        supportState.avatarSetup.attire = {
          gender: storedGender,
          lastGender: storedGender,
          usePhoto: Boolean(parsed.attire.usePhoto),
          mode: String(parsed.attire.mode || 'detailed'),
          top: String(parsed.attire.top || 'corporate-blazer'),
          bottom: String(parsed.attire.bottom || 'dress-pants'),
          style: String(parsed.attire.style || 'corporate-executive'),
          topColor: String(parsed.attire.topColor || 'black'),
          bottomColor: String(parsed.attire.bottomColor || 'black'),
          overallFormality: String(parsed.attire.overallFormality || 'business-formal'),
          overallFit: String(parsed.attire.overallFit || 'tailored'),
          overallSeason: String(parsed.attire.overallSeason || 'all-season'),
          overallPresentation: String(parsed.attire.overallPresentation || 'polished')
        };
        if (storedGender) saveAttireGenderLock(storedGender);
      }
      if (supportState.avatarSetup.photoUrl) {
        console.log(`[HydrateAvatarSetup] Restored photoUrl from storage: ${supportState.avatarSetup.photoUrl.substring(0, 80)}...`);
      }
    } catch (error) {
      console.warn('Invalid stored avatar setup payload', error);
    }
  }

  function renderAvatarSetup() {
    isRenderingFromState = true;
    try {
      if (avatarPhotoPreview) {
        if (supportState.avatarSetup.photoUrl) {
          avatarPhotoPreview.src = supportState.avatarSetup.photoUrl;
          avatarPhotoPreview.classList.remove('hidden');
          avatarPhotoPreview.onerror = function() {
            // If the server URL fails, fall back to local blob if available
            if (avatarPhotoPreview._localBlobUrl && avatarPhotoPreview.src !== avatarPhotoPreview._localBlobUrl) {
              avatarPhotoPreview.src = avatarPhotoPreview._localBlobUrl;
            } else {
              avatarPhotoPreview.alt = 'Photo uploaded — reload to refresh preview';
              avatarPhotoPreview.style.minHeight = '60px';
            }
          };
        } else if (!avatarPhotoPreview._localBlobUrl) {
          avatarPhotoPreview.removeAttribute('src');
          avatarPhotoPreview.classList.add('hidden');
        }
      }

      if (avatarVoicePreview) {
        if (supportState.avatarSetup.voiceFileUrl) {
          avatarVoicePreview.src = supportState.avatarSetup.voiceFileUrl;
          avatarVoicePreview.preload = 'metadata';
          avatarVoicePreview.classList.remove('hidden');
          if (voiceVolumeRow) voiceVolumeRow.classList.remove('hidden');
          avatarVoicePreview.volume = (voiceVolumeSlider ? parseInt(voiceVolumeSlider.value, 10) : 80) / 100;
          avatarVoicePreview.onerror = function() {
            // If server URL fails, fall back to local blob if available
            if (avatarVoicePreview._localBlobUrl && avatarVoicePreview.src !== avatarVoicePreview._localBlobUrl) {
              avatarVoicePreview.src = avatarVoicePreview._localBlobUrl;
            } else {
              avatarVoicePreview.classList.add('hidden');
              if (voiceVolumeRow) voiceVolumeRow.classList.add('hidden');
              if (sessionInfo) sessionInfo.textContent = '⚠️ Voice file unavailable — please re-record or re-upload.';
            }
          };
        } else if (avatarVoicePreview._localBlobUrl) {
          // Keep local blob preview visible even before upload
          avatarVoicePreview.src = avatarVoicePreview._localBlobUrl;
          avatarVoicePreview.preload = 'metadata';
          avatarVoicePreview.classList.remove('hidden');
          if (voiceVolumeRow) voiceVolumeRow.classList.remove('hidden');
          avatarVoicePreview.volume = (voiceVolumeSlider ? parseInt(voiceVolumeSlider.value, 10) : 80) / 100;
        } else {
          avatarVoicePreview.removeAttribute('src');
          avatarVoicePreview.classList.add('hidden');
          if (voiceVolumeRow) voiceVolumeRow.classList.add('hidden');
        }
      }
      if (avatarVoiceTimestamp) {
        avatarVoiceTimestamp.textContent = formatVoiceTimestamp(supportState.avatarSetup.voiceFileUpdatedAt);
      }
      if (avatarMonitor) {
        const parts = [];
        parts.push(supportState.avatarSetup.photoUrl ? 'Photo uploaded' : 'Photo pending');
        parts.push(supportState.avatarSetup.voiceFileUrl ? formatVoiceTimestamp(supportState.avatarSetup.voiceFileUpdatedAt) : 'Voice pending');
        parts.push(supportState.avatarSetup.selectedProduct ? `Product: ${supportState.avatarSetup.selectedProduct.title || 'selected'}` : 'Product pending');
        parts.push(`Platform: ${platformLabelOf(supportState.avatarSetup.selectedPlatform)}`);
        if (supportState.avatarSetup.avatarId) parts.push(`Avatar: ${supportState.avatarSetup.avatarId}`);
        avatarMonitor.textContent = parts.join(' · ');
      }
      if (avatarBindingBadge) {
        const profileId = String(supportState.avatarSetup.profileId || supportState.affiliateCode || '').trim().toUpperCase();
        const voiceId = String(
          supportState.avatarSetup.voiceCloneId ||
          supportState.avatarSetup.voiceId ||
          supportState.avatarSetup.createdAvatar?.voiceCloneId ||
          supportState.avatarSetup.createdAvatar?.voiceId ||
          ''
        ).trim();
        avatarBindingBadge.textContent = profileId
          ? `Profile ID: ${profileId} · Voice ID: ${voiceId || 'pending'}`
          : 'Profile ID: pending · Voice ID: pending';
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
      // IMPORTANT: Preserve existing selection if it exists (user may have just selected it)
      const currentDropdownValue = attireGenderSelect ? attireGenderSelect.value : '';
      const lockedGender = getLockedAttireGender();
      const genderToUse = currentDropdownValue && normalizeAttireGender(currentDropdownValue)
        ? currentDropdownValue
        : lockedGender || supportState.avatarSetup.attire.gender || supportState.avatarSetup.attire.lastGender || '';
      
      if (attireGenderSelect) attireGenderSelect.value = genderToUse;
      if (attireUsePhotoCheckbox) attireUsePhotoCheckbox.checked = supportState.avatarSetup.attire.usePhoto;
      if (attireModeSelect) attireModeSelect.value = supportState.avatarSetup.attire.mode || 'detailed';
      if (attireTopSelect) attireTopSelect.value = supportState.avatarSetup.attire.top;
      if (attireBottomSelect) attireBottomSelect.value = supportState.avatarSetup.attire.bottom;
      if (attireStyleSelect) attireStyleSelect.value = supportState.avatarSetup.attire.style;
      if (attireTopColorSelect) attireTopColorSelect.value = supportState.avatarSetup.attire.topColor;
      if (attireBottomColorSelect) attireBottomColorSelect.value = supportState.avatarSetup.attire.bottomColor;
      if (attireOverallFormalitySelect) attireOverallFormalitySelect.value = supportState.avatarSetup.attire.overallFormality || 'business-formal';
      if (attireOverallFitSelect) attireOverallFitSelect.value = supportState.avatarSetup.attire.overallFit || 'tailored';
      if (attireOverallSeasonSelect) attireOverallSeasonSelect.value = supportState.avatarSetup.attire.overallSeason || 'all-season';
      if (attireOverallPresentationSelect) attireOverallPresentationSelect.value = supportState.avatarSetup.attire.overallPresentation || 'polished';
      updateAttireModeUI();
      renderAvatarLibrary();
    } finally {
      isRenderingFromState = false;
    }
  }

  function updateAttireModeUI() {
    const usePhoto = Boolean(supportState.avatarSetup.attire.usePhoto);
    const mode = String(supportState.avatarSetup.attire.mode || 'detailed');
    const currentDropdownValue = attireGenderSelect ? attireGenderSelect.value : '';
    const lockedGender = getLockedAttireGender();
    const gender = currentDropdownValue && normalizeAttireGender(currentDropdownValue)
      ? currentDropdownValue
      : (lockedGender || supportState.avatarSetup.attire.gender || supportState.avatarSetup.attire.lastGender || '');
    
    if (gender) {
      supportState.avatarSetup.attire.gender = gender;
      supportState.avatarSetup.attire.lastGender = gender;
    }
    supportState.avatarSetup.attire.top = applyGenderGuardrailToSelect(attireTopSelect, 'top', gender, supportState.avatarSetup.attire.top);
    supportState.avatarSetup.attire.bottom = applyGenderGuardrailToSelect(attireBottomSelect, 'bottom', gender, supportState.avatarSetup.attire.bottom);
    supportState.avatarSetup.attire.style = applyGenderGuardrailToSelect(attireStyleSelect, 'style', gender, supportState.avatarSetup.attire.style);
    if (attireGenderSelect) attireGenderSelect.value = gender;
    if (attireGenderHint) {
      attireGenderHint.textContent = gender
        ? `${attireGenderLabel(gender)} attire guardrail is active. Only ${gender === 'male' ? "men's" : "women's"} clothing selections are available unless you use the clothing shown in the uploaded profile picture.`
        : 'Choose male or female first so only that gender\'s attire selections appear. Or choose to use the clothing already shown in the uploaded profile picture.';
    }
    if (attireModeSelect) {
      attireModeSelect.value = mode;
      attireModeSelect.disabled = usePhoto;
    }
    if (attireGrid) {
      if (usePhoto) {
        attireGrid.classList.add('disabled');
      } else {
        attireGrid.classList.remove('disabled');
      }
    }
    if (attireDetailedSection) {
      attireDetailedSection.style.display = usePhoto ? 'none' : (mode === 'detailed' ? 'block' : 'none');
    }
    if (attireOverallSection) {
      attireOverallSection.style.display = usePhoto ? 'none' : (mode === 'overall' ? 'block' : 'none');
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatAttireLabel(attire) {
    if (!attire) return 'Professional';
    const genderLabel = normalizeAttireGender(attire.gender) ? `${attireGenderLabel(attire.gender)} · ` : '';
    if (attire.usePhoto) return `${genderLabel}Using profile photo clothing`;
    if (String(attire.mode || '').toLowerCase() === 'overall') {
      const parts = [];
      if (attire.style) parts.push(String(attire.style).replace(/-/g, ' '));
      if (attire.overallFormality) parts.push(`Formality: ${String(attire.overallFormality).replace(/-/g, ' ')}`);
      if (attire.overallFit) parts.push(`Fit: ${String(attire.overallFit).replace(/-/g, ' ')}`);
      if (attire.overallSeason) parts.push(`Season: ${String(attire.overallSeason).replace(/-/g, ' ')}`);
      if (attire.overallPresentation) parts.push(`Presentation: ${String(attire.overallPresentation).replace(/-/g, ' ')}`);
      return genderLabel + (parts.length ? parts.join(' · ') : 'Overall style');
    }
    const parts = [];
    const top = [attire.top, attire.topColor].filter(Boolean).map((value) => String(value).replace(/-/g, ' ')).join(' ');
    const bottom = [attire.bottom, attire.bottomColor].filter(Boolean).map((value) => String(value).replace(/-/g, ' ')).join(' ');
    if (top) parts.push(`Top: ${top}`);
    if (bottom) parts.push(`Bottom: ${bottom}`);
    return genderLabel + (parts.length ? parts.join(' · ') : 'Professional');
  }

  function normalizeAvatarLibraryItem(item) {
    const attire = item && item.attire && typeof item.attire === 'object' ? item.attire : null;
    const proofVideoUrl = String(item && (item.proofVideoUrl || item.proof_video_url || item.videoUrl || item.video_url) || '').trim();
    const proofVideoId = String(item && (item.proofVideoId || item.proof_video_id || item.videoId || item.video_id) || '').trim();
    const photoUrl = String(item && (item.photoUrl || item.previewUrl || item.proofThumbnailUrl || item.proof_thumbnail_url) || '').trim();
    return {
      id: String(item && (item.id || item.avatarId || item.requestId) || '').trim(),
      requestId: String(item && item.requestId || '').trim(),
      affiliateCode: normalizeAffiliateCode(item && (item.affiliateCode || item.affiliateId)),
      name: String(item && item.name || 'Affiliate avatar'),
      style: String(item && item.style || 'professional'),
      photoUrl,
      attire: attire ? {
        gender: normalizeAttireGender(attire.gender),
        usePhoto: Boolean(attire.usePhoto),
        mode: String(attire.mode || 'detailed'),
        top: String(attire.top || ''),
        bottom: String(attire.bottom || ''),
        style: String(attire.style || ''),
        topColor: String(attire.topColor || ''),
        bottomColor: String(attire.bottomColor || ''),
        overallFormality: String(attire.overallFormality || ''),
        overallFit: String(attire.overallFit || ''),
        overallSeason: String(attire.overallSeason || ''),
        overallPresentation: String(attire.overallPresentation || '')
      } : null,
      attireLabel: String(item && item.attireLabel || formatAttireLabel(attire)),
      avatarId: String(item && (item.avatarId || item.heygenAvatarId || item.id) || '').trim(),
      proofVideoId,
      proofVideoUrl,
      proofThumbnailUrl: photoUrl,
      proofStatus: proofVideoUrl ? 'completed' : (proofVideoId ? 'rendering' : 'pending')
    };
  }

  function renderAvatarLibraryPreview(item, statusText) {
    if (!avatarLibraryPreview || !avatarLibraryPreviewImage || !avatarLibraryPreviewVideo || !avatarLibraryPreviewTitle || !avatarLibraryPreviewMeta || !avatarLibraryPreviewPrompt) {
      return;
    }
    if (!item) {
      avatarLibraryPreview.classList.add('hidden');
      return;
    }
    avatarLibraryPreview.classList.remove('hidden');
    avatarLibraryPreviewTitle.textContent = item.name || 'Affiliate avatar';
    avatarLibraryPreviewMeta.textContent = statusText || (item.proofVideoUrl ? 'Proof ready to play.' : 'Generating proof video for this avatar.');
    avatarLibraryPreviewPrompt.textContent = item.proofStatus === 'completed'
      ? "This is my avatar, and it's time to get this blessing flowing!"
      : "Tap generate proof to create the 8-second proof clip.";

    const mediaUrl = item.proofThumbnailUrl || item.photoUrl || '';
    if (mediaUrl) {
      avatarLibraryPreviewImage.src = mediaUrl;
      avatarLibraryPreviewImage.onerror = function () {
        avatarLibraryPreviewImage.onerror = null;
        avatarLibraryPreviewImage.src = mediaPlaceholder(item.name || 'No photo');
      };
      avatarLibraryPreviewImage.classList.remove('hidden');
    } else {
      avatarLibraryPreviewImage.src = mediaPlaceholder(item.name || 'No photo');
      avatarLibraryPreviewImage.classList.add('hidden');
    }

    if (item.proofVideoUrl) {
      avatarLibraryPreviewVideo.src = item.proofVideoUrl;
      avatarLibraryPreviewVideo.preload = 'metadata';
      avatarLibraryPreviewVideo.poster = item.proofThumbnailUrl || item.photoUrl || mediaPlaceholder(item.name || 'Proof video');
      avatarLibraryPreviewVideo.onerror = function () {
        avatarLibraryPreviewVideo.onerror = null;
        avatarLibraryPreviewVideo.removeAttribute('src');
        avatarLibraryPreviewVideo.classList.add('hidden');
        avatarLibraryPreviewImage.src = mediaPlaceholder(item.name || 'Proof unavailable');
        avatarLibraryPreviewImage.classList.remove('hidden');
      };
      avatarLibraryPreviewVideo.classList.remove('hidden');
    } else {
      avatarLibraryPreviewVideo.removeAttribute('src');
      avatarLibraryPreviewVideo.classList.add('hidden');
    }

    if (avatarLibraryRefreshBtn) {
      avatarLibraryRefreshBtn.textContent = item.proofVideoUrl ? 'Refresh proof' : 'Generate proof';
      avatarLibraryRefreshBtn.disabled = false;
    }
  }

  function renderAvatarLibrary() {
    if (!avatarLibraryGrid) return;
    const items = Array.isArray(supportState.avatarLibrary) ? supportState.avatarLibrary : [];
    if (!items.length) {
      avatarLibraryGrid.innerHTML = '<div class="avatar-empty">No avatars found yet.</div>';
      if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = 'No avatars found yet.';
      renderAvatarLibraryPreview(null);
      return;
    }
    if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `${items.length} avatar${items.length === 1 ? '' : 's'} loaded`;
    avatarLibraryGrid.innerHTML = items.map((item) => {
      const selected = String(item.id) === String(supportState.selectedAvatarLibraryId || '');
      const thumb = item.photoUrl || mediaPlaceholder(item.name || 'No photo');
      const status = item.proofVideoUrl ? 'Proof ready' : (item.proofVideoId ? 'Proof rendering' : 'No proof yet');
      return `<button type="button" class="avatar-library-card${selected ? ' selected' : ''}" data-avatar-id="${escapeHtml(item.id)}">
        <img class="avatar-library-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(item.name)} thumbnail" onerror="this.onerror=null;this.src='${escapeHtml(mediaPlaceholder(item.name || 'No photo'))}'" />
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.attireLabel || 'Professional')}</span>
        <span class="avatar-library-status">${escapeHtml(status)}</span>
      </button>`;
    }).join('');

    avatarLibraryGrid.querySelectorAll('[data-avatar-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const avatarId = String(button.getAttribute('data-avatar-id') || '');
        const match = items.find((entry) => String(entry.id) === avatarId);
        if (match) {
          void selectAvatarLibraryItem(match.id);
        }
      });
    });

    const selected = items.find((entry) => String(entry.id) === String(supportState.selectedAvatarLibraryId || '')) || items[0];
    if (selected && !supportState.selectedAvatarLibraryId) {
      supportState.selectedAvatarLibraryId = selected.id;
    }
    renderAvatarLibraryPreview(selected || null);
  }

  async function loadAvatarLibrary() {
    if (!avatarLibraryGrid) return;
    const url = new URL('/api/affiliate/avatar-gallery', window.location.origin);
    url.searchParams.set('affiliateCode', supportState.affiliateCode || '');
    try {
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      supportState.avatarLibrary = Array.isArray(payload.avatars)
        ? payload.avatars.map(normalizeAvatarLibraryItem).filter((item) => item.id && isOwnedByActiveAffiliate(item))
        : [];
      if (!supportState.avatarLibrary.length) {
        supportState.selectedAvatarLibraryId = '';
      } else if (!supportState.avatarLibrary.some((item) => String(item.id) === String(supportState.selectedAvatarLibraryId || ''))) {
        supportState.selectedAvatarLibraryId = supportState.avatarLibrary[0].id;
      }
      renderAvatarLibrary();
    } catch (error) {
      supportState.avatarLibrary = [];
      if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `Avatar library error: ${error.message}`;
      avatarLibraryGrid.innerHTML = '<div class="avatar-empty">Unable to load avatar library.</div>';
      renderAvatarLibraryPreview(null);
    }
  }

  async function waitForAvatarProof(videoId) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`/api/affiliate/avatar/video-status/${encodeURIComponent(videoId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`, {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Proof status request failed: ${response.status}`);
      }
      if (payload.status === 'completed' || payload.status === 'done' || payload.videoUrl || payload.video_url) {
        return payload;
      }
      await sleep(3000);
    }
    throw new Error('Proof video is still rendering. Please try again in a moment.');
  }

  async function requestAvatarProof(item) {
    if (!item) throw new Error('Select an avatar first.');
    if (!item.requestId) throw new Error('Missing avatar request record.');
    const proofScript = "This is my avatar, and it's time to get this blessing flowing! I'm ready to show up with confidence and move with purpose.";
    const response = await apiJson('/api/affiliate/avatar/proof', {
      method: 'POST',
      body: JSON.stringify({
        requestId: item.requestId,
        affiliateCode: supportState.affiliateCode,
        avatarId: item.avatarId || item.id,
        name: item.name,
        script: proofScript
      })
    });
    const status = String(response.status || '').toLowerCase();
    const videoId = String(response.videoId || '');
    let proofPayload = response;
    if (status === 'rendering' && videoId) {
      proofPayload = await waitForAvatarProof(videoId);
    }
    const videoUrl = String(proofPayload.videoUrl || proofPayload.video_url || proofPayload.rawVideoUrl || response.videoUrl || response.video_url || '').trim();
    const thumbnailUrl = String(proofPayload.thumbnailUrl || item.photoUrl || '').trim();
    if (videoUrl) {
      await apiJson('/api/affiliate/avatar/proof-complete', {
        method: 'POST',
        body: JSON.stringify({
          requestId: item.requestId,
          videoId: videoId || proofPayload.videoId || null,
          videoUrl,
          thumbnailUrl,
          affiliateCode: supportState.affiliateCode
        })
      });
    }
    return {
      ...item,
      proofVideoId: videoId || proofPayload.videoId || item.proofVideoId || '',
      proofVideoUrl: videoUrl || item.proofVideoUrl || '',
      proofThumbnailUrl: thumbnailUrl || item.proofThumbnailUrl || '',
      proofStatus: videoUrl ? 'completed' : 'rendering'
    };
  }

  async function selectAvatarLibraryItem(avatarId) {
    const items = Array.isArray(supportState.avatarLibrary) ? supportState.avatarLibrary : [];
    const match = items.find((entry) => String(entry.id) === String(avatarId || ''));
    if (!match) return;
    supportState.selectedAvatarLibraryId = match.id;
    renderAvatarLibrary();
    renderAvatarLibraryPreview(match, match.proofVideoUrl ? 'Proof ready to play.' : 'Generating proof video when needed.');
    if (!match.proofVideoUrl && match.requestId) {
      if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `Generating proof for ${match.name}...`;
      if (avatarLibraryRefreshBtn) avatarLibraryRefreshBtn.disabled = true;
      try {
        const updated = await requestAvatarProof(match);
        supportState.avatarLibrary = items.map((item) => String(item.id) === String(updated.id) ? updated : item);
        renderAvatarLibrary();
        renderAvatarLibraryPreview(updated, 'Proof ready to play.');
        if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `Proof ready for ${updated.name}.`;
      } catch (error) {
        renderAvatarLibraryPreview(match, `Proof generation failed: ${error.message}`);
        if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `Proof generation failed: ${error.message}`;
      } finally {
        if (avatarLibraryRefreshBtn) avatarLibraryRefreshBtn.disabled = false;
      }
    }
  }

  // ── Product Video Gallery ────────────────────────────────────────────────
  async function loadProductVideos() {
    if (!productVideoGrid) return;
    const url = new URL('/api/affiliate/product-videos', window.location.origin);
    url.searchParams.set('affiliateCode', supportState.affiliateCode || '');
    try {
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.error || `Request failed: ${response.status}`);
      supportState.productVideos = Array.isArray(payload.videos)
        ? payload.videos.filter((item) => isOwnedByActiveAffiliate(item))
        : [];
      renderProductVideoGallery();
    } catch (error) {
      supportState.productVideos = [];
      if (productVideoMonitor) productVideoMonitor.textContent = `Error: ${error.message}`;
      if (productVideoGrid) productVideoGrid.innerHTML = '<div class="avatar-empty">Unable to load product videos.</div>';
    }
  }

  function renderProductVideoGallery() {
    if (!productVideoGrid) return;
    const items = supportState.productVideos;
    if (!items.length) {
      productVideoGrid.innerHTML = '<div class="avatar-empty">No product videos generated yet. Select an avatar and a product above, then tap "🎬 Generate Product Video".</div>';
      if (productVideoMonitor) productVideoMonitor.textContent = 'No videos yet.';
      renderProductVideoPreview(null);
      return;
    }
    if (productVideoMonitor) productVideoMonitor.textContent = `${items.length} video${items.length === 1 ? '' : 's'} rendered`;
    const platformEmoji = { tiktok: '🎵', instagram: '📷', youtube: '▶️', facebook: '📘', pinterest: '📌', x: '✖️' };
    productVideoGrid.innerHTML = items.map((item) => {
      const selected = item.videoJobId === supportState.selectedProductVideoId;
      const statusClass = item.status === 'completed' ? 'completed' : item.status === 'failed' ? 'failed' : 'rendering';
      const statusLabel = item.status === 'completed' ? '✅ Ready to post' : item.status === 'failed' ? '❌ Failed' : '⏳ Rendering…';
      const thumb = item.thumbnailUrl || item.photoUrl || '';
      const pEmoji = platformEmoji[item.platform] || '🎬';
      const priceStr = item.productPrice ? `$${Number(item.productPrice).toFixed(2)}` : '';
      const scoreStr = item.qualityScore != null ? `${item.qualityScore}/100` : '';
      return `<button type="button" class="video-library-card${selected ? ' selected' : ''}" data-pvid="${escapeHtml(item.videoJobId)}">
        ${thumb ? `<img class="vlc-thumb" src="${escapeHtml(thumb)}" alt="Video thumbnail" />` : '<div class="vlc-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:32px">🎬</div>'}
        ${item.status === 'completed' ? '<span class="vlc-play-overlay">▶</span>' : ''}
        <strong>${escapeHtml(item.productTitle || 'Product Video')}${priceStr ? ' · ' + priceStr : ''}</strong>
        <span class="vlc-platform">${pEmoji} ${escapeHtml(item.platform || 'tiktok')}</span>
        ${scoreStr ? `<span class="vlc-score" title="AI Quality Score">${scoreStr}</span>` : ''}
        <span class="vlc-status ${statusClass}">${statusLabel}</span>
      </button>`;
    }).join('');

    productVideoGrid.querySelectorAll('[data-pvid]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pvid = btn.getAttribute('data-pvid');
        const match = items.find((v) => v.videoJobId === pvid);
        if (match) {
          supportState.selectedProductVideoId = match.videoJobId;
          renderProductVideoGallery();
          renderProductVideoPreview(match);
        }
      });
    });

    const selected = items.find((v) => v.videoJobId === supportState.selectedProductVideoId) || items[0];
    if (selected && !supportState.selectedProductVideoId) supportState.selectedProductVideoId = selected.videoJobId;
    renderProductVideoPreview(selected || null);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through to legacy path */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  // Renders the algorithm-optimized caption & hashtag kit with one-tap copy per platform.
  function renderCaptionKit(item) {
    const kit = document.getElementById('phoneProductVideoCaptionKit');
    if (!kit) return;
    const meta = item && item.metadata;
    const platforms = meta && meta.platforms ? meta.platforms : null;
    if (!platforms || !Object.keys(platforms).length) {
      kit.classList.add('hidden');
      kit.innerHTML = '';
      return;
    }
    kit.classList.remove('hidden');

    const platformEmoji = { tiktok: '🎵', instagram: '📷', youtube: '▶️', facebook: '📘', pinterest: '📌', x: '✖️' };
    const keys = Object.keys(platforms);
    let current = kit.dataset.platform && platforms[kit.dataset.platform]
      ? kit.dataset.platform
      : (platforms[item.platform] ? item.platform : (meta.primaryPlatform || keys[0]));
    kit.dataset.platform = current;
    const pkg = platforms[current];

    const pills = keys.map((k) => {
      const active = k === current ? ' active' : '';
      return `<button type="button" class="caption-pill${active}" data-cap-platform="${escapeHtml(k)}">${platformEmoji[k] || ''} ${escapeHtml(platforms[k].platformLabel || k)}</button>`;
    }).join('');

    const bestTime = Array.isArray(pkg.postingTime) ? pkg.postingTime.join(', ') : (pkg.postingTime || '');
    const disc = pkg.discoverability || null;
    const discClass = disc ? (disc.score >= 85 ? 'disc-excellent' : disc.score >= 70 ? 'disc-strong' : disc.score >= 50 ? 'disc-fair' : 'disc-weak') : '';
    const discGrade = disc ? (disc.grade.charAt(0).toUpperCase() + disc.grade.slice(1)) : '';
    const discTip = disc && disc.suggestions && disc.suggestions.length ? disc.suggestions[0] : 'Fully optimized for reach 🚀';
    const discBlock = disc ? `
      <div class="caption-disc ${discClass}">
        <div class="caption-disc-score"><span class="disc-num">${disc.score}</span><span class="disc-den">/100</span></div>
        <div class="caption-disc-meta">
          <strong>Discoverability: ${escapeHtml(discGrade)}</strong>
          <span>${escapeHtml(discTip)}</span>
        </div>
      </div>` : '';
    const srtBtn = item && item.videoJobId
      ? `<a class="caption-srt-btn" href="/api/affiliate/product-video/${encodeURIComponent(item.videoJobId)}/captions.srt?affiliateCode=${encodeURIComponent(activeAffiliateCode())}" download>⬇︎ Download .srt captions (YouTube SEO)</a>`
      : '';
    const titleBlock = pkg.titleMatters
      ? `<div class="caption-field">
           <div class="caption-field-head"><span>Title (SEO)</span><button type="button" class="caption-copy-mini" data-copy="title">Copy</button></div>
           <div class="caption-field-body" data-field="title">${escapeHtml(pkg.title)}</div>
         </div>`
      : '';

    kit.innerHTML = `
      <div class="caption-kit-head">
        <strong>📈 Algorithm-Optimized Post Kit</strong>
        <span class="caption-kit-sub">Tap a platform, then copy your ready-to-post caption &amp; hashtags.</span>
      </div>
      ${discBlock}
      <div class="caption-pills">${pills}</div>
      ${titleBlock}
      <div class="caption-field">
        <div class="caption-field-head"><span>Caption</span><button type="button" class="caption-copy-mini" data-copy="caption">Copy</button></div>
        <div class="caption-field-body" data-field="caption">${escapeHtml(pkg.description)}</div>
      </div>
      <div class="caption-field">
        <div class="caption-field-head"><span>Hashtags</span><button type="button" class="caption-copy-mini" data-copy="hashtags">Copy</button></div>
        <div class="caption-field-body caption-hashtags" data-field="hashtags">${escapeHtml(pkg.hashtagLine)}</div>
      </div>
      <div class="caption-tips">
        <span>📐 ${escapeHtml(pkg.formatSpec ? (pkg.formatSpec.dimension + ' · ' + pkg.formatSpec.durationSweetSpot) : '')}</span>
        ${bestTime ? `<span>⏰ Best time: ${escapeHtml(bestTime)}</span>` : ''}
      </div>
      ${pkg.formatSpec && pkg.formatSpec.notes ? `<p class="caption-note">💡 ${escapeHtml(pkg.formatSpec.notes)}</p>` : ''}
      <button type="button" class="control-btn caption-copy-all state-off" data-copy="all">📋 Copy full post (caption + hashtags)</button>
      ${srtBtn}
      <p class="caption-copy-status" id="phoneCaptionCopyStatus"></p>
    `;

    // Switch platform
    kit.querySelectorAll('[data-cap-platform]').forEach((btn) => {
      btn.addEventListener('click', () => {
        kit.dataset.platform = btn.getAttribute('data-cap-platform');
        renderCaptionKit(item);
      });
    });

    // Copy actions
    const statusEl = kit.querySelector('#phoneCaptionCopyStatus');
    const flash = (msg) => {
      if (!statusEl) return;
      statusEl.textContent = msg;
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2500);
    };
    kit.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const kind = btn.getAttribute('data-copy');
        let text = '';
        if (kind === 'title') text = pkg.title;
        else if (kind === 'caption') text = pkg.description;
        else if (kind === 'hashtags') text = pkg.hashtagLine;
        else text = (pkg.titleMatters ? (pkg.title + '\n\n') : '') + pkg.description;
        const ok = await copyToClipboard(text);
        flash(ok ? `✅ Copied ${kind === 'all' ? 'full post' : kind} for ${pkg.platformLabel}` : '⚠️ Copy failed — select and copy manually.');
      });
    });
  }

  function renderProductVideoPreview(item) {
    if (!productVideoPreview) return;
    if (!item) { productVideoPreview.classList.add('hidden'); return; }
    productVideoPreview.classList.remove('hidden');
    renderCaptionKit(item);
    if (productVideoTitle) {
      const priceStr = item.productPrice ? ` · $${Number(item.productPrice).toFixed(2)}` : '';
      productVideoTitle.textContent = (item.productTitle || 'Product Video') + priceStr;
    }
    if (productVideoMeta) {
      let metaLines = [];
      if (item.status === 'completed') {
        metaLines.push(`✅ Rendered ${item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'recently'} · Ready to share`);
      } else if (item.status === 'rendering') {
        metaLines.push('⏳ Video is rendering… check back in ~60 seconds.');
      } else {
        metaLines.push(`❌ Failed: ${item.error || 'Unknown error'}`);
      }
      // Avatar used
      if (item.avatarName || item.photoUrl) {
        metaLines.push(`🧑 Avatar: ${item.avatarName || 'Affiliate Avatar'}`);
      }
      // Voice ID used
      if (item.voiceId) {
        const voiceLabel = item.voiceType === 'clone' ? `Cloned Voice (${item.voiceId.substring(0, 8)}…)` : `Stock Voice (${item.voiceId.substring(0, 8)}…)`;
        metaLines.push(`🎙️ Voice: ${voiceLabel}`);
      }
      // Quality score (dev mode — will be admin-only in production)
      if (item.qualityScore !== undefined && item.qualityScore !== null) {
        const scoreColor = item.qualityScore >= 80 ? '🟢' : item.qualityScore >= 60 ? '🟡' : '🔴';
        metaLines.push(`${scoreColor} AI Quality Score: ${item.qualityScore}/100`);
      }
      productVideoMeta.innerHTML = metaLines.map(l => `<span style="display:block;margin-bottom:3px">${escapeHtml(l)}</span>`).join('');
    }
    if (productVideoScript) productVideoScript.textContent = item.script || '';

    // Platform badge
    const badgeEl = document.getElementById('phoneProductVideoPlatformBadge');
    if (badgeEl) {
      const platform = item.platform || 'tiktok';
      const platformLabels = { tiktok: 'TikTok', instagram: 'Instagram Reels', youtube: 'YouTube Shorts', facebook: 'Facebook', pinterest: 'Pinterest', x: 'X' };
      badgeEl.innerHTML = `<span class="platform-badge ${platform}">${platformLabels[platform] || platform}</span>`;
    }

    // Video player
    if (productVideoPlayer) {
      if (item.videoUrl) {
        productVideoPlayer.src = item.videoUrl;
        productVideoPlayer.classList.remove('hidden');
        productVideoPlayer.load();
      } else {
        productVideoPlayer.removeAttribute('src');
        productVideoPlayer.classList.add('hidden');
      }
    }

    // Wire post buttons
    const postActions = document.getElementById('phoneProductVideoPostActions');
    if (postActions) {
      postActions.querySelectorAll('[data-post-platform]').forEach((btn) => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async () => {
          if (!item.videoUrl) { alert('Video is not ready yet.'); return; }
          newBtn.classList.add('posting');
          newBtn.textContent = '⏳ Posting…';
          const postStatus = document.getElementById('phoneProductVideoPostStatus');
          try {
            const platform = newBtn.getAttribute('data-post-platform');
            const socialInput = document.getElementById('phoneSocial' + platform.charAt(0).toUpperCase() + platform.slice(1));
            const accountUrl = socialInput ? socialInput.value.trim() : '';
            const resp = await fetch('/api/affiliate/social/post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                affiliateCode: supportState.affiliateCode,
                platform,
                accountUrl: accountUrl || `https://${platform}.com/affiliate`,
                videoUrl: item.videoUrl,
                productId: item.productId || null
              })
            });
            const result = await resp.json().catch(() => ({}));
            newBtn.classList.remove('posting');
            newBtn.classList.add('posted');
            const platformEmojis = { facebook: '📘', instagram: '📷', tiktok: '🎵', youtube: '▶️', pinterest: '📌', x: '✖️' };
            newBtn.textContent = `${platformEmojis[platform] || '✅'} Posted!`;
            if (postStatus) postStatus.textContent = result.message || `Video queued for ${platform}!`;
            setTimeout(() => {
              newBtn.classList.remove('posted');
              newBtn.textContent = `${platformEmojis[platform] || '🔗'} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
            }, 3000);
          } catch (err) {
            newBtn.classList.remove('posting');
            newBtn.textContent = '❌ Error';
            if (postStatus) postStatus.textContent = `Post failed: ${err.message}`;
          }
        });
      });
    }
  }

  async function pollProductVideoStatus(videoJobId) {
    for (let i = 0; i < 25; i++) {
      await sleep(5000);
      try {
        const response = await fetch(`/api/affiliate/product-video/status/${encodeURIComponent(videoJobId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`, { headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (payload.status === 'completed' && payload.videoUrl) return payload;
        if (payload.status === 'failed') throw new Error(payload.error || 'Rendering failed');
      } catch (err) {
        if (err.message.includes('failed')) throw err;
      }
    }
    throw new Error('Video is still rendering. Refresh the gallery to check status.');
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
      url.searchParams.set('affiliateCode', supportState.affiliateCode || '');
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

  async function uploadAvatarAsset(file, endpoint, fieldName, extraFields = {}) {
    if (!file) throw new Error('Please choose a file before uploading.');
    const formData = new FormData();
    formData.append(fieldName, file);
    Object.keys(extraFields || {}).forEach((key) => {
      const value = extraFields[key];
      if (value !== undefined && value !== null && String(value).length > 0) {
        formData.append(key, String(value));
      }
    });
    const response = await fetch(endpoint, { method: 'POST', body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || `Upload failed: ${response.status}`);
    }
    return payload;
  }

  async function uploadRecordedAvatarVoice(blob) {
    const file = new File([blob], `voice-sample-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-voice', 'voice', {
      profileId: supportState.affiliateCode,
      affiliateCode: supportState.affiliateCode,
      affiliateName: supportState.affiliateName
    });
    supportState.avatarSetup.voiceFileUrl = String(payload.voiceFileUrl || '');
    supportState.avatarSetup.voiceFilePath = String(payload.voiceFilePath || '');
    supportState.avatarSetup.voiceFileUpdatedAt = String(payload.voiceFileUpdatedAt || new Date().toISOString());
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = 'Recorded voice sample uploaded and ready.';
  }

  async function uploadAvatarPhoto() {
    const file = avatarPhotoInput?.files?.[0];
    const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-photo', 'photo', {
      profileId: supportState.affiliateCode,
      affiliateCode: supportState.affiliateCode,
      affiliateName: supportState.affiliateName
    });
    supportState.avatarSetup.photoUrl = String(payload.photoUrl || '');
    console.log(`[UploadAvatarPhoto] Photo uploaded and persisted: ${supportState.avatarSetup.photoUrl.substring(0, 80)}...`);
    persistAvatarSetup();
    renderAvatarSetup();
    sessionInfo.textContent = 'Affiliate photo uploaded and ready.';
  }

  async function uploadAvatarVoice() {
    // Strategy 1: Use recorded blob if available
    if (voiceRecordState.lastBlob) {
      await uploadRecordedAvatarVoice(voiceRecordState.lastBlob);
      sessionInfo.textContent = 'Latest recorded voice sample uploaded and ready.';
      return;
    }
    
    // Strategy 2: Check if user selected a new file
    const file = avatarVoiceInput?.files?.[0];
    if (file) {
      const payload = await uploadAvatarAsset(file, '/api/affiliate/avatar/upload-voice', 'voice', {
        profileId: supportState.affiliateCode,
        affiliateCode: supportState.affiliateCode,
        affiliateName: supportState.affiliateName
      });
      supportState.avatarSetup.voiceFileUrl = String(payload.voiceFileUrl || '');
      supportState.avatarSetup.voiceFilePath = String(payload.voiceFilePath || '');
      supportState.avatarSetup.voiceFileUpdatedAt = String(payload.voiceFileUpdatedAt || new Date().toISOString());
      persistAvatarSetup();
      renderAvatarSetup();
      sessionInfo.textContent = 'Affiliate voice file uploaded and ready.';
      return;
    }
    
    // Strategy 3: Use persisted voice file if available
    const persistedVoiceUrl = String(supportState.avatarSetup.voiceFileUrl || '').trim();
    const persistedVoicePath = String(supportState.avatarSetup.voiceFilePath || '').trim();
    if (persistedVoiceUrl || persistedVoicePath) {
      if (!supportState.avatarSetup.voiceFileUpdatedAt) {
        supportState.avatarSetup.voiceFileUpdatedAt = new Date().toISOString();
      }
      persistAvatarSetup();
      renderAvatarSetup();
      sessionInfo.textContent = '✓ Using previously uploaded voice file. This is your current voice sample.';
      return;
    }
    
    // No voice available
    throw new Error('Please record a voice sample or choose a file before uploading.');
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
    supportState.avatarSetup.voiceFileUpdatedAt = '';
    voiceRecordState.lastBlob = null;
    if (voiceRecordState.lastBlobUrl) {
      URL.revokeObjectURL(voiceRecordState.lastBlobUrl);
      voiceRecordState.lastBlobUrl = '';
    }
    if (avatarVoiceInput) avatarVoiceInput.value = '';
    if (avatarVoicePreview) {
      avatarVoicePreview.removeAttribute('src');
      avatarVoicePreview.classList.add('hidden');
    }
    if (voiceVolumeRow) voiceVolumeRow.classList.add('hidden');
    persistAvatarSetup();
    renderAvatarSetup();
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser does not support microphone recording.');
    }
    if (voiceRecordState.active) return;
    if (avatarVoiceInput) avatarVoiceInput.value = '';
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
        voiceRecordState.lastBlob = blob;
        if (voiceRecordState.lastBlobUrl) URL.revokeObjectURL(voiceRecordState.lastBlobUrl);
        voiceRecordState.lastBlobUrl = URL.createObjectURL(blob);
        if (avatarVoicePreview) {
          avatarVoicePreview.src = voiceRecordState.lastBlobUrl;
          avatarVoicePreview.classList.remove('hidden');
          if (voiceVolumeRow) voiceVolumeRow.classList.remove('hidden');
          avatarVoicePreview.volume = (voiceVolumeSlider ? parseInt(voiceVolumeSlider.value, 10) : 80) / 100;
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
        profileId: supportState.affiliateCode,
        affiliateId: supportState.affiliateCode,
        name: `${supportState.affiliateName} Avatar`,
        style: 'avatar',
        photoUrl: supportState.avatarSetup.photoUrl || null,
        voiceFilePath: supportState.avatarSetup.voiceFilePath || null,
        voiceFileUrl: supportState.avatarSetup.voiceFileUrl || null,
        voiceFileUpdatedAt: supportState.avatarSetup.voiceFileUpdatedAt || null,
        productId: supportState.avatarSetup.selectedProduct.id || null,
        productHandle: supportState.avatarSetup.selectedProduct.handle || null,
        productTitle: supportState.avatarSetup.selectedProduct.title || null,
        productPageUrl: supportState.avatarSetup.selectedProduct.productPageUrl || supportState.avatarSetup.selectedProduct.productUrl || null,
        productImageUrl: supportState.avatarSetup.selectedProduct.imageUrl || supportState.avatarSetup.selectedProduct.image || supportState.avatarSetup.selectedProduct.image_url || null,
        platform: supportState.avatarSetup.selectedPlatform || platformSelect?.value || 'tiktok',
        platformLabel: platformLabelOf(supportState.avatarSetup.selectedPlatform || platformSelect?.value || 'tiktok'),
        attire: buildAvatarAttirePayload(),
        source: 'phone-app',
        returnTo: `/phone-app?affiliateCode=${encodeURIComponent(supportState.affiliateCode)}&affiliateName=${encodeURIComponent(supportState.affiliateName)}`
      })
    });
    supportState.avatarSetup.requestId = String(payload.requestId || '');
    supportState.avatarSetup.returnTo = String(payload.request?.returnTo || '/phone-app');
    supportState.avatarSetup.profileId = supportState.affiliateCode;
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

  async function ensureAuthenticatedSession() {
    const nextPath = `/phone-app${window.location.search || ''}`;
    try {
      const response = await fetch('/api/affiliate/session', { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false || payload.authenticated !== true || !payload.session) {
        throw new Error(payload.error || 'Authentication required.');
      }
      const sessionCode = normalizeAffiliateCode(payload.session.affiliateCode);
      if (!sessionCode) throw new Error('Affiliate session missing code.');
      const sessionName = String(payload.session.affiliateName || sessionCode).trim().slice(0, 64) || sessionCode;
      supportState.affiliateCode = sessionCode;
      supportState.affiliateName = sessionName;
      localStorage.setItem('evicsAffiliateCode', sessionCode);
      localStorage.setItem('evicsAffiliateName', sessionName);
      const params = new URLSearchParams(window.location.search);
      if (normalizeAffiliateCode(params.get('affiliateCode')) !== sessionCode || String(params.get('affiliateName') || '').trim() !== sessionName) {
        params.set('affiliateCode', sessionCode);
        params.set('affiliateName', sessionName);
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
      }
      return true;
    } catch (_error) {
      window.location.href = `/affiliate-login?next=${encodeURIComponent(nextPath)}`;
      return false;
    }
  }

  function resolveAffiliateIdentity() {
    const params = new URLSearchParams(window.location.search);
    const previousCode = supportState.affiliateCode || 'default';
    const code = String(supportState.affiliateCode || params.get('affiliateCode') || params.get('code') || params.get('ref') || localStorage.getItem('evicsAffiliateCode') || '');
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) || '';
    localStorage.setItem('evicsAffiliateCode', cleanCode);
    const name = String(supportState.affiliateName || params.get('affiliateName') || localStorage.getItem('evicsAffiliateName') || cleanCode);
    const cleanName = name.trim().slice(0, 64) || cleanCode;
    localStorage.setItem('evicsAffiliateName', cleanName);
    supportState.affiliateCode = cleanCode;
    supportState.affiliateName = cleanName;
    migrateScopedStorage('evicsPhoneAvatarSetup', previousCode, cleanCode);
    migrateScopedStorage('evicsPhoneAttireGender', previousCode, cleanCode);
  }

  async function loadAffiliateProfile() {
    if (!supportState.affiliateCode) return;
    try {
      const res = await fetch(`/api/affiliate/profile/${encodeURIComponent(supportState.affiliateCode)}`);
      const data = await res.json().catch(() => ({}));
      if (data.success && data.profile) {
        const profile = data.profile;
        if (normalizeAffiliateCode(profile.affiliateCode) !== activeAffiliateCode()) {
          throw new Error('Profile ownership mismatch. Reload with the correct affiliate link.');
        }
        if (!supportState.avatarSetup.attire.gender) {
          const storedGender = normalizeAttireGender(profile.avatarGender || profile.gender);
          if (storedGender) {
            setLockedAttireGender(storedGender);
          }
        }
        const profilePhotoUrl = String(profile.pictureUrl || profile.profilePhotoUrl || '').trim();
        const currentPhotoUrl = String(supportState.avatarSetup.photoUrl || '').trim();
        if (profilePhotoUrl && !currentPhotoUrl) {
          supportState.avatarSetup.photoUrl = profilePhotoUrl;
          persistAvatarSetup();
        }
        const profileVoiceUrl = String(profile.voiceFileUrl || '').trim();
        const profileVoiceUpdatedAt = String(profile.voiceFileUpdatedAt || profile.updatedAt || profile.createdAt || '').trim();
        const profileVoiceCloneId = String(profile.voiceCloneId || '').trim();
        const profileVoiceId = String(profile.voiceId || '').trim();
        const currentVoiceUrl = String(supportState.avatarSetup.voiceFileUrl || '').trim();
        const currentVoiceUpdatedAt = String(supportState.avatarSetup.voiceFileUpdatedAt || '').trim();
        if (profileVoiceUrl && (profileVoiceUrl !== currentVoiceUrl || profileVoiceUpdatedAt !== currentVoiceUpdatedAt)) {
          supportState.avatarSetup.voiceFileUrl = profileVoiceUrl;
          supportState.avatarSetup.voiceFilePath = profileVoiceUrl;
          supportState.avatarSetup.voiceFileUpdatedAt = profileVoiceUpdatedAt;
          persistAvatarSetup();
        } else if (!supportState.avatarSetup.voiceFileUpdatedAt && profileVoiceUpdatedAt) {
          supportState.avatarSetup.voiceFileUpdatedAt = profileVoiceUpdatedAt;
        }
        supportState.avatarSetup.profileId = normalizeAffiliateCode(profile.profileId || profile.affiliateCode || supportState.affiliateCode);
        supportState.avatarSetup.voiceCloneId = profileVoiceCloneId || supportState.avatarSetup.voiceCloneId || '';
        supportState.avatarSetup.voiceId = profileVoiceId || supportState.avatarSetup.voiceId || '';
        persistAvatarSetup();
        if (affiliateProfileBanner) {
          affiliateProfileBanner.style.display = 'flex';
          if (affiliateProfileName) affiliateProfileName.textContent = profile.name || supportState.affiliateCode;
          if (affiliateProfileCode) affiliateProfileCode.textContent = `ID: ${profile.affiliateCode}`;
          if (affiliateProfilePic && profile.pictureUrl) {
            affiliateProfilePic.src = profile.pictureUrl;
            affiliateProfilePic.onerror = () => {
              affiliateProfilePic.style.display = 'none';
            };
          } else if (affiliateProfilePic) {
            affiliateProfilePic.style.display = 'none';
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load affiliate profile:', e.message);
    }
  }

  function parseTimestampMs(value) {
    if (!value) return 0;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getAvatarRequestLookup() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = String(params.get('avatarRequestId') || params.get('requestId') || '').trim();
    if (fromUrl) return { requestId: fromUrl, source: 'url' };
    const fromState = String(supportState.avatarSetup.requestId || '').trim();
    if (fromState) return { requestId: fromState, source: 'state' };
    const fromStorage = String(localStorage.getItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`) || '').trim();
    if (fromStorage) return { requestId: fromStorage, source: 'storage' };
    return { requestId: '', source: 'none' };
  }

  function normalizeNativeAvatarJobStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['queued', 'preprocessing', 'rendering', 'postprocessing', 'completed', 'failed', 'cancelled'].includes(normalized)) {
      return normalized;
    }
    return '';
  }

  async function fetchNativeAvatarJob(jobId) {
    const cleanJobId = String(jobId || '').trim();
    if (!cleanJobId) return null;
    const payload = await apiJson(`/api/native-avatar/jobs/${encodeURIComponent(cleanJobId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`);
    return payload && payload.job ? payload.job : null;
  }

  async function waitForNativeAvatarJobTerminal(jobId, options = {}) {
    const maxAttempts = Math.max(1, Number(options.maxAttempts || 30));
    const delayMs = Math.max(500, Number(options.delayMs || 2500));
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const job = await fetchNativeAvatarJob(jobId);
      const status = normalizeNativeAvatarJobStatus(job && job.status);
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return { job, timedOut: false };
      }
      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }
    return { job: await fetchNativeAvatarJob(jobId), timedOut: true };
  }

  async function syncAvatarRequestStatus() {
    const lookup = getAvatarRequestLookup();
    const requestId = lookup.requestId;
    if (!requestId) return;
    const payload = await apiJson(`/api/affiliate/avatar/request/${encodeURIComponent(requestId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`);
    let request = payload.request || null;
    if (!request) return;
    if (!isOwnedByActiveAffiliate(request)) {
      throw new Error('Avatar request ownership mismatch. This request is not assigned to the active affiliate ID.');
    }
    const nativeAvatarJobId = String(request.nativeAvatarJobId || supportState.avatarSetup.nativeAvatarJobId || '').trim();
    if ((request.status === 'queued' || request.status === 'processing') && nativeAvatarJobId) {
      supportState.avatarSetup.nativeAvatarJobId = nativeAvatarJobId;
      supportState.avatarSetup.nativeAvatarStatusUrl = `/api/native-avatar/jobs/${encodeURIComponent(nativeAvatarJobId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`;
      try {
        const nativeJob = await fetchNativeAvatarJob(nativeAvatarJobId);
        const nativeStatus = normalizeNativeAvatarJobStatus(nativeJob && nativeJob.status);
        if (nativeStatus === 'completed' || nativeStatus === 'failed' || nativeStatus === 'cancelled') {
          const refreshed = await apiJson(`/api/affiliate/avatar/request/${encodeURIComponent(requestId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`);
          request = refreshed.request || request;
        }
      } catch (nativeError) {
        console.warn('Native avatar status check failed:', nativeError.message);
      }
    }
    const resolvedRequestId = String(request.requestId || requestId);
    supportState.avatarSetup.requestId = resolvedRequestId;
    supportState.avatarSetup.profileId = String(request.profileId || request.affiliateCode || supportState.affiliateCode || '').trim().toUpperCase();
    localStorage.setItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`, resolvedRequestId);
    supportState.avatarSetup.nativeAvatarJobId = String(request.nativeAvatarJobId || supportState.avatarSetup.nativeAvatarJobId || '').trim();
    supportState.avatarSetup.nativeAvatarStatusUrl = supportState.avatarSetup.nativeAvatarJobId
      ? `/api/native-avatar/jobs/${encodeURIComponent(supportState.avatarSetup.nativeAvatarJobId)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`
      : '';
    const shouldHydrateRequestContext = lookup.source === 'url' || request.status === 'queued' || request.status === 'processing';
    if (shouldHydrateRequestContext) {
      supportState.avatarSetup.returnTo = request.returnTo || supportState.avatarSetup.returnTo || '/phone-app';
      supportState.avatarSetup.selectedProductId = String(request.productId || supportState.avatarSetup.selectedProductId || '');
      supportState.avatarSetup.selectedPlatform = String(request.platform || supportState.avatarSetup.selectedPlatform || 'tiktok');
    }
    if (platformSelect) platformSelect.value = supportState.avatarSetup.selectedPlatform;
    if (shouldHydrateRequestContext && request.attire && typeof request.attire === 'object') {
      supportState.avatarSetup.attire = {
        ...supportState.avatarSetup.attire,
        gender: normalizeAttireGender(request.attire.gender) || getLockedAttireGender(),
        lastGender: normalizeAttireGender(request.attire.gender) || getLockedAttireGender(),
        usePhoto: Boolean(request.attire.usePhoto || request.attire.usePhotoClothing),
        mode: String(request.attire.mode || supportState.avatarSetup.attire.mode || 'detailed'),
        top: String(request.attire.top || supportState.avatarSetup.attire.top || ''),
        bottom: String(request.attire.bottom || supportState.avatarSetup.attire.bottom || ''),
        style: String(request.attire.style || request.attire.overallStyle || supportState.avatarSetup.attire.style || ''),
        topColor: String(request.attire.topColor || supportState.avatarSetup.attire.topColor || 'black'),
        bottomColor: String(request.attire.bottomColor || supportState.avatarSetup.attire.bottomColor || 'black'),
        overallFormality: String(request.attire.overallFormality || supportState.avatarSetup.attire.overallFormality || 'business-formal'),
        overallFit: String(request.attire.overallFit || supportState.avatarSetup.attire.overallFit || 'tailored'),
        overallSeason: String(request.attire.overallSeason || supportState.avatarSetup.attire.overallSeason || 'all-season'),
        overallPresentation: String(request.attire.overallPresentation || supportState.avatarSetup.attire.overallPresentation || 'polished')
      };
      const requestGender = normalizeAttireGender(request.attire.gender) || getLockedAttireGender();
      if (requestGender) saveAttireGenderLock(requestGender);
    }
    if (shouldHydrateRequestContext && (request.productId || request.productTitle)) {
      supportState.avatarSetup.selectedProduct = {
        id: request.productId || '',
        handle: request.productHandle || '',
        title: request.productTitle || 'Selected product',
        productPageUrl: request.productPageUrl || '',
        productUrl: request.productPageUrl || '',
        imageUrl: request.productImageUrl || ''
      };
    }
    if (request.status === 'completed' && request.avatar) {
      const requestAvatarId = String(request.avatar.avatarItemId || request.avatar.avatarId || request.avatar.id || '');
      const shouldHydrateCompletedAvatar = lookup.source === 'url' || !supportState.avatarSetup.createdAvatar;
      if (shouldHydrateCompletedAvatar) {
        supportState.avatarSetup.createdAvatar = request.avatar;
        supportState.avatarSetup.avatarId = requestAvatarId || supportState.avatarSetup.avatarId || '';
        supportState.avatarSetup.photoUrl = String(request.avatar.photoUrl || supportState.avatarSetup.photoUrl || '');
      }
      supportState.avatarSetup.voiceCloneId = String(request.avatar.voiceCloneId || request.voiceCloneId || supportState.avatarSetup.voiceCloneId || '').trim();
      supportState.avatarSetup.voiceId = String(request.avatar.voiceId || request.voiceId || supportState.avatarSetup.voiceId || '').trim();
      const requestVoiceUrl = String(request.avatar.voiceFileUrl || '').trim();
      const requestVoicePath = String(request.avatar.voiceFilePath || requestVoiceUrl || '').trim();
      const requestVoiceUpdatedAt = String(request.avatar.voiceFileUpdatedAt || request.avatar.voiceUpdatedAt || '').trim();
      const currentVoiceUrl = String(supportState.avatarSetup.voiceFileUrl || '').trim();
      const currentVoiceUpdatedAt = String(supportState.avatarSetup.voiceFileUpdatedAt || '').trim();
      const currentVoiceMs = parseTimestampMs(currentVoiceUpdatedAt);
      const requestVoiceMs = parseTimestampMs(requestVoiceUpdatedAt);
      const shouldAdoptRequestVoice = Boolean(
        requestVoiceUrl && (
          !currentVoiceUrl ||
          (requestVoiceMs > 0 && (currentVoiceMs === 0 || requestVoiceMs >= currentVoiceMs))
        )
      );
      if (shouldAdoptRequestVoice) {
        supportState.avatarSetup.voiceFileUrl = requestVoiceUrl;
        supportState.avatarSetup.voiceFilePath = requestVoicePath;
        supportState.avatarSetup.voiceFileUpdatedAt = requestVoiceUpdatedAt || supportState.avatarSetup.voiceFileUpdatedAt || '';
      }
      persistAvatarSetup();
      renderAvatarSetup();
      renderSelectedProductDetails();
      sessionInfo.textContent = `Avatar created through Affiliate Hub and returned to ${supportState.affiliateCode}.`;
      await loadAvatarLibrary();
    } else if (request.status === 'queued' || request.status === 'processing') {
      sessionInfo.textContent = supportState.avatarSetup.nativeAvatarJobId
        ? 'Avatar request is processing in native async pipeline. We are tracking progress.'
        : 'Avatar request is queued in Affiliate Hub. Creating now...';
    } else if (request.status === 'failed') {
      sessionInfo.textContent = `Avatar request failed: ${request.error || 'Unknown error'}`;
    }
    persistAvatarSetup();
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
        fetch(`/api/renders/phone-app?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`, { headers: { Accept: 'application/json' } }),
        fetch('/api/health', { headers: { Accept: 'application/json' } }),
        fetch(`/api/evidence/heygen?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`, { headers: { Accept: 'application/json' } })
      ]);
      const rendersPayload = await renderRes.json();
      const healthPayload = await healthRes.json();
      const proofPayload = await proofRes.json();
      const renders = Array.isArray(rendersPayload.renders)
        ? rendersPayload.renders.filter((item) => isOwnedByActiveAffiliate(item))
        : [];

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

  // ── Voice volume control ──────────────────────────────────────────────────
  if (voiceVolumeSlider && avatarVoicePreview) {
    avatarVoicePreview.volume = parseInt(voiceVolumeSlider.value, 10) / 100;
    voiceVolumeSlider.addEventListener('input', () => {
      const vol = parseInt(voiceVolumeSlider.value, 10);
      avatarVoicePreview.volume = vol / 100;
      if (voiceVolumeValue) voiceVolumeValue.textContent = vol + '%';
    });
  }

  // ── Attire selection listeners ─────────────────────────────────────────────
  if (attireUsePhotoCheckbox) {
    attireUsePhotoCheckbox.addEventListener('change', () => {
      supportState.avatarSetup.attire.usePhoto = attireUsePhotoCheckbox.checked;
      updateAttireModeUI();
      persistAvatarSetup();
    });
  }
  function bindAttireSelect(el, key) {
    if (!el) return;
    el.addEventListener('change', () => {
      // Skip persistence when renderAvatarSetup is programmatically updating UI values
      if (isRenderingFromState) return;
      
      if (key === 'gender') {
        const nextGender = normalizeAttireGender(el.value);
        if (nextGender) {
          setLockedAttireGender(nextGender);
        } else if (supportState.avatarSetup.attire.lastGender) {
          supportState.avatarSetup.attire.gender = supportState.avatarSetup.attire.lastGender;
        }
      } else {
        supportState.avatarSetup.attire[key] = el.value;
      }
      if (key === 'mode' || key === 'gender') {
        updateAttireModeUI();
      }
      persistAvatarSetup();
    });
  }
  bindAttireSelect(attireTopSelect, 'top');
  bindAttireSelect(attireBottomSelect, 'bottom');
  bindAttireSelect(attireStyleSelect, 'style');
  bindAttireSelect(attireTopColorSelect, 'topColor');
  bindAttireSelect(attireBottomColorSelect, 'bottomColor');
  bindAttireSelect(attireGenderSelect, 'gender');
  bindAttireSelect(attireModeSelect, 'mode');
  bindAttireSelect(attireOverallFormalitySelect, 'overallFormality');
  bindAttireSelect(attireOverallFitSelect, 'overallFit');
  bindAttireSelect(attireOverallSeasonSelect, 'overallSeason');
  bindAttireSelect(attireOverallPresentationSelect, 'overallPresentation');

  if (productSearchInput) {
    let searchTimer = null;
    productSearchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        void loadProducts();
      }, 200);
    });
  }

  // Immediate local preview when user selects a photo file
  if (avatarPhotoInput) {
    avatarPhotoInput.addEventListener('change', () => {
      const file = avatarPhotoInput.files && avatarPhotoInput.files[0];
      if (!file || !avatarPhotoPreview) return;
      // Revoke any prior object URL to avoid memory leak
      if (avatarPhotoPreview._localBlobUrl) {
        URL.revokeObjectURL(avatarPhotoPreview._localBlobUrl);
        avatarPhotoPreview._localBlobUrl = null;
      }
      const blobUrl = URL.createObjectURL(file);
      avatarPhotoPreview._localBlobUrl = blobUrl;
      avatarPhotoPreview.src = blobUrl;
      avatarPhotoPreview.classList.remove('hidden');
      avatarPhotoPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        // Scroll to the preview after upload
        if (avatarPhotoPreview) avatarPhotoPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        sessionInfo.textContent = `Photo upload failed: ${error.message}`;
        setControlState(avatarPhotoUploadBtn, 'off');
      } finally {
        avatarPhotoUploadBtn.disabled = false;
        setTimeout(() => avatarPhotoUploadBtn.classList.remove('pressing'), 120);
      }
    });
  }

  // Immediate local playback when user selects a voice file
  if (avatarVoiceInput) {
    avatarVoiceInput.addEventListener('change', () => {
      voiceRecordState.lastBlob = null;
      if (voiceRecordState.lastBlobUrl) {
        URL.revokeObjectURL(voiceRecordState.lastBlobUrl);
        voiceRecordState.lastBlobUrl = '';
      }
      const file = avatarVoiceInput.files && avatarVoiceInput.files[0];
      if (file && avatarVoicePreview) {
        if (avatarVoicePreview._localBlobUrl) URL.revokeObjectURL(avatarVoicePreview._localBlobUrl);
        avatarVoicePreview._localBlobUrl = URL.createObjectURL(file);
        avatarVoicePreview.src = avatarVoicePreview._localBlobUrl;
        avatarVoicePreview.preload = 'metadata';
        avatarVoicePreview.classList.remove('hidden');
        if (voiceVolumeRow) voiceVolumeRow.classList.remove('hidden');
        avatarVoicePreview.volume = (voiceVolumeSlider ? parseInt(voiceVolumeSlider.value, 10) : 80) / 100;
        avatarVoicePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  // ── Create Avatar button ──────────────────────────────────────────────────
  if (createAvatarBtn) {
    createAvatarBtn.addEventListener('click', async () => {
      // Validate required inputs
      if (!supportState.avatarSetup.photoUrl) {
        if (createAvatarStatus) {
          createAvatarStatus.textContent = '⚠️ Please upload a profile picture first.';
          createAvatarStatus.className = 'create-avatar-status status-error';
        }
        return;
      }
      if (!supportState.avatarSetup.voiceFilePath && !supportState.avatarSetup.voiceFileUrl) {
        if (createAvatarStatus) {
          createAvatarStatus.textContent = '⚠️ Please upload or record a voice sample first.';
          createAvatarStatus.className = 'create-avatar-status status-error';
        }
        return;
      }

      let attire;
      try {
        attire = buildAvatarAttirePayload();
      } catch (error) {
        if (createAvatarStatus) {
          createAvatarStatus.textContent = `⚠️ ${error.message}`;
          createAvatarStatus.className = 'create-avatar-status status-error';
        }
        return;
      }

      createAvatarBtn.disabled = true;
      setControlState(createAvatarBtn, 'running');
      if (createAvatarStatus) {
        createAvatarStatus.textContent = '⏳ Sending avatar request to Affiliate Hub…';
        createAvatarStatus.className = 'create-avatar-status';
      }

      try {
        const payload = await apiJson('/api/affiliate/avatar/create', {
          method: 'POST',
          body: JSON.stringify({
            affiliateId: supportState.affiliateCode,
            affiliateName: supportState.affiliateName,
            name: `${supportState.affiliateName || supportState.affiliateCode} Avatar`,
            photoUrl: supportState.avatarSetup.photoUrl,
            voiceFilePath: supportState.avatarSetup.voiceFilePath || null,
            voiceFileUrl: supportState.avatarSetup.voiceFileUrl || null,
            requestId: supportState.avatarSetup.requestId || null,
            attire: attire,
            source: 'phone-app',
            nativeAsync: true,
            avatarProvider: 'auto'
          })
        });

        setControlState(createAvatarBtn, 'completed', 2000);
        if (payload.requestId || payload.avatarId) {
          supportState.avatarSetup.requestId = String(payload.requestId || payload.avatarId);
          localStorage.setItem(`evicsPhoneAvatarRequest:${supportState.affiliateCode || 'default'}`, supportState.avatarSetup.requestId);
        }
        supportState.avatarSetup.nativeAvatarJobId = String(payload.nativeAvatarJobId || '').trim() || '';
        supportState.avatarSetup.nativeAvatarStatusUrl = String(payload.statusUrl || '').trim() || '';
        if (payload.avatar) {
          supportState.avatarSetup.createdAvatar = payload.avatar;
        }
        persistAvatarSetup();
        renderAvatarSetup();
        if (payload.async && payload.nativeAvatarJobId) {
          if (createAvatarStatus) {
            createAvatarStatus.textContent = '⏳ Avatar request accepted. Native async pipeline is creating your avatar now…';
            createAvatarStatus.className = 'create-avatar-status';
          }
          sessionInfo.textContent = 'Avatar request submitted. Waiting for async completion…';
          const terminal = await waitForNativeAvatarJobTerminal(payload.nativeAvatarJobId, { maxAttempts: 40, delayMs: 2500 });
          const finalStatus = normalizeNativeAvatarJobStatus(terminal.job && terminal.job.status);
          if (finalStatus === 'completed') {
            await syncAvatarRequestStatus();
            await loadAvatarLibrary();
            if (createAvatarStatus) {
              createAvatarStatus.textContent = '✅ Avatar created and added to your Avatar Library.';
              createAvatarStatus.className = 'create-avatar-status status-success';
            }
            sessionInfo.textContent = 'Avatar completed in async pipeline and hydrated into library.';
          } else if (finalStatus === 'failed' || finalStatus === 'cancelled') {
            const message = terminal.job && terminal.job.error ? terminal.job.error : `Native avatar job ${finalStatus}`;
            throw new Error(message);
          } else if (terminal.timedOut) {
            if (createAvatarStatus) {
              createAvatarStatus.textContent = '⏳ Avatar is still processing. Keep this page open and use Refresh to check status.';
            }
            sessionInfo.textContent = 'Avatar async processing is still running.';
          }
        } else {
          if (createAvatarStatus) {
            createAvatarStatus.textContent = '✅ Avatar created! Rendering proof video…';
            createAvatarStatus.className = 'create-avatar-status status-success';
          }
          sessionInfo.textContent = 'Avatar created — waiting for proof video render…';
          await loadAvatarLibrary();

          const proofVideoId = payload.avatar?.proofVideoId || null;
          const requestId = payload.requestId || null;
          if (proofVideoId && requestId) {
            try {
              if (createAvatarStatus) createAvatarStatus.textContent = '⏳ Proof video rendering… (this may take 30-60 seconds)';
              const proofResult = await waitForAvatarProof(proofVideoId);
              const videoUrl = proofResult.videoUrl || proofResult.video_url || '';
              const thumbnailUrl = proofResult.thumbnailUrl || payload.avatar?.photoUrl || '';
              if (videoUrl) {
                await apiJson('/api/affiliate/avatar/proof-complete', {
                  method: 'POST',
                  body: JSON.stringify({ requestId, videoId: proofVideoId, videoUrl, thumbnailUrl, affiliateCode: supportState.affiliateCode })
                });
                if (createAvatarStatus) {
                  createAvatarStatus.textContent = '✅ Avatar proof video ready! Check your Avatar Library below.';
                }
                sessionInfo.textContent = 'Proof video delivered to your Avatar Library.';
                await loadAvatarLibrary();
              }
            } catch (proofErr) {
              if (createAvatarStatus) {
                createAvatarStatus.textContent = '✅ Avatar created! Proof video still rendering — tap "Generate proof" in library to check.';
              }
            }
          }
        }
      } catch (error) {
        setControlState(createAvatarBtn, 'off');
        if (createAvatarStatus) {
          createAvatarStatus.textContent = `❌ Error: ${error.message}`;
          createAvatarStatus.className = 'create-avatar-status status-error';
        }
        sessionInfo.textContent = `Avatar creation failed: ${error.message}`;
      } finally {
        createAvatarBtn.disabled = false;
      }
    });
  }

  // ── Generate Product Video button ─────────────────────────────────────────
  if (generateProductVideoBtn) {
    generateProductVideoBtn.addEventListener('click', async () => {
      // Validate: need a selected avatar and a selected product
      const selectedAvatar = supportState.avatarLibrary.find((a) => String(a.id) === String(supportState.selectedAvatarLibraryId || ''));
      if (!selectedAvatar) {
        if (productVideoStatus) { productVideoStatus.textContent = '⚠️ Select an avatar from your Avatar Library first.'; productVideoStatus.className = 'create-avatar-status status-error'; }
        return;
      }
      if (!supportState.avatarSetup.selectedProduct) {
        if (productVideoStatus) { productVideoStatus.textContent = '⚠️ Select a product above first.'; productVideoStatus.className = 'create-avatar-status status-error'; }
        return;
      }

      generateProductVideoBtn.disabled = true;
      setControlState(generateProductVideoBtn, 'running');
      if (productVideoStatus) { productVideoStatus.textContent = '⏳ Sending to Affiliate Hub for video generation…'; productVideoStatus.className = 'create-avatar-status'; }

      try {
        const product = supportState.avatarSetup.selectedProduct;
        const payload = await apiJson('/api/affiliate/product-video/generate', {
          method: 'POST',
          body: JSON.stringify({
            affiliateCode: supportState.affiliateCode,
            avatarRequestId: selectedAvatar.requestId || supportState.avatarSetup.requestId || null,
            productId: product.id || null,
            productHandle: product.handle || null,
            productTitle: product.title || null,
            productImageUrl: product.imageUrl || product.image || product.image_url || null,
            productPageUrl: product.productPageUrl || product.productUrl || null,
            productPrice: product.price || null,
            platform: platformSelect ? platformSelect.value : 'tiktok'
          })
        });

        setControlState(generateProductVideoBtn, 'completed', 2000);
        if (productVideoStatus) { productVideoStatus.textContent = '✅ Video rendering started! Waiting for completion…'; productVideoStatus.className = 'create-avatar-status status-success'; }
        sessionInfo.textContent = 'Product video rendering — this may take 30-90 seconds.';

        // Poll for completion
        const videoJobId = payload.videoJobId;
        if (videoJobId) {
          try {
            if (productVideoStatus) productVideoStatus.textContent = '⏳ Rendering product video… (30-90 seconds)';
            const result = await pollProductVideoStatus(videoJobId);
            if (productVideoStatus) { productVideoStatus.textContent = '✅ Product video ready! Check "My Product Videos" below.'; productVideoStatus.className = 'create-avatar-status status-success'; }
            sessionInfo.textContent = 'Product video delivered to your gallery.';
          } catch (pollErr) {
            if (productVideoStatus) productVideoStatus.textContent = '✅ Video submitted! Rendering may take a minute — tap Refresh below to check.';
          }
          await loadProductVideos();
        }
      } catch (error) {
        setControlState(generateProductVideoBtn, 'off');
        if (productVideoStatus) { productVideoStatus.textContent = `❌ Error: ${error.message}`; productVideoStatus.className = 'create-avatar-status status-error'; }
        sessionInfo.textContent = `Product video generation failed: ${error.message}`;
      } finally {
        generateProductVideoBtn.disabled = false;
      }
    });
  }

  // Product Video Refresh button
  if (productVideoRefreshBtn) {
    productVideoRefreshBtn.addEventListener('click', () => { loadProductVideos(); });
  }

  if (avatarLibraryRefreshBtn) {
    avatarLibraryRefreshBtn.addEventListener('click', async () => {
      const selected = (Array.isArray(supportState.avatarLibrary) ? supportState.avatarLibrary : []).find((item) => String(item.id) === String(supportState.selectedAvatarLibraryId || ''));
      if (!selected) return;
      avatarLibraryRefreshBtn.disabled = true;
      try {
        const updated = await requestAvatarProof(selected);
        supportState.avatarLibrary = supportState.avatarLibrary.map((item) => String(item.id) === String(updated.id) ? updated : item);
        renderAvatarLibrary();
        renderAvatarLibraryPreview(updated, 'Proof ready to play.');
      } catch (error) {
        if (avatarLibraryMonitor) avatarLibraryMonitor.textContent = `Proof refresh failed: ${error.message}`;
      } finally {
        avatarLibraryRefreshBtn.disabled = false;
      }
    });
  }

  async function deleteSelectedAvatar() {
    const selected = (Array.isArray(supportState.avatarLibrary) ? supportState.avatarLibrary : []).find((item) => String(item.id) === String(supportState.selectedAvatarLibraryId || ''));
    if (!selected) {
      sessionInfo.textContent = 'No avatar selected to delete.';
      return;
    }
    const confirmed = confirm(`Delete avatar "${selected.name || 'Untitled'}"? This action cannot be undone.`);
    if (!confirmed) return;

    avatarLibraryDeleteBtn.disabled = true;
    setControlState(avatarLibraryDeleteBtn, 'running');
    try {
      const response = await fetch(`/api/affiliate/avatar/${encodeURIComponent(selected.id)}?affiliateCode=${encodeURIComponent(activeAffiliateCode())}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Delete failed: ${response.status}`);
      }
      // Remove from local list
      supportState.avatarLibrary = supportState.avatarLibrary.filter((item) => String(item.id) !== String(selected.id));
      supportState.selectedAvatarLibraryId = '';
      setControlState(avatarLibraryDeleteBtn, 'completed', 1300);
      sessionInfo.textContent = `Avatar "${selected.name || 'Untitled'}" deleted permanently.`;
      renderAvatarLibrary();
      renderAvatarLibraryPreview(null);
    } catch (error) {
      setControlState(avatarLibraryDeleteBtn, 'off');
      sessionInfo.textContent = `Avatar deletion failed: ${error.message}`;
    } finally {
      avatarLibraryDeleteBtn.disabled = false;
    }
  }

  if (avatarLibraryDeleteBtn) {
    avatarLibraryDeleteBtn.addEventListener('click', () => {
      avatarLibraryDeleteBtn.classList.add('pressing');
      void deleteSelectedAvatar();
      setTimeout(() => avatarLibraryDeleteBtn.classList.remove('pressing'), 120);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.classList.add('pressing');
      setControlState(logoutBtn, 'running');
      await endSupportSession();
      await fetch('/api/affiliate/session/logout', { method: 'POST', headers: { Accept: 'application/json' } }).catch(() => {});
      localStorage.removeItem('evicsAffiliateCode');
      localStorage.removeItem('evicsAffiliateName');
      sessionInfo.textContent = `Logged off from live support for ${supportState.affiliateCode}.`;
      setControlState(logoutBtn, 'completed', 1500);
      setTimeout(() => logoutBtn.classList.remove('pressing'), 120);
      window.location.href = '/affiliate-login?next=%2Fphone-app';
    });
  }

  window.addEventListener('beforeunload', () => {
    if (!supportState.sessionId) return;
    const body = JSON.stringify({ sessionId: supportState.sessionId });
    navigator.sendBeacon('/api/affiliate/comms/session/end', new Blob([body], { type: 'application/json' }));
  });

  async function boot() {
    try {
      const authenticated = await ensureAuthenticatedSession();
      if (!authenticated) return;
      resolveAffiliateIdentity();
      hydrateAvatarSetup();
      await loadAffiliateProfile();
      renderAvatarSetup();
      await loadVoiceReferenceScript();
      try {
        await syncAvatarRequestStatus();
      } catch (error) {
        sessionInfo.textContent = `Avatar sync blocked: ${error.message}`;
      }
      await loadAvatarLibrary();
      await loadProducts();
      await loadProductVideos();
      await loadBillingInfo();
      await startSupportSession();
      await refreshConversation();
    } catch (error) {
      sessionInfo.textContent = `Support startup failed: ${error.message}`;
    }
    await refresh(refreshBtn);
  }

  // ── Billing & Payouts ──────────────────────────────────────────────────────
  const BILLING_STORAGE_KEY = 'evics_billing_prefs';
  const billingPlan = document.getElementById('phoneBillingPlan');
  const billingStatus = document.getElementById('phoneBillingStatus');
  const billingNext = document.getElementById('phoneBillingNext');
  const billingBalance = document.getElementById('phoneBillingBalance');
  const billingLifetime = document.getElementById('phoneBillingLifetime');
  const billingLastPayout = document.getElementById('phoneBillingLastPayout');
  const billingPurchases = document.getElementById('phoneBillingPurchases');
  const billingManageSubBtn = document.getElementById('phoneBillingManageSub');
  const billingBuyAvatarBtn = document.getElementById('phoneBillingBuyAvatar');
  const billingBuyVideoBtn = document.getElementById('phoneBillingBuyVideo');
  const billingConnectStripeBtn = document.getElementById('phoneBillingConnectStripe');
  const billingSaveWalletBtn = document.getElementById('phoneBillingSaveWallet');
  const billingRequestPayoutBtn = document.getElementById('phoneBillingRequestPayout');
  const payoutWalletInput = document.getElementById('phonePayoutWallet');
  const stripeConnectStatus = document.getElementById('phoneStripeConnectStatus');
  const cryptoWalletStatus = document.getElementById('phoneCryptoWalletStatus');
  const payoutStripeFields = document.getElementById('phonePayoutStripeFields');
  const payoutCryptoFields = document.getElementById('phonePayoutCryptoFields');
  const payoutRadios = document.querySelectorAll('input[name="payoutMethod"]');

  function loadBillingPrefs() {
    try {
      const stored = localStorage.getItem(BILLING_STORAGE_KEY);
      if (!stored) return {};
      return JSON.parse(stored);
    } catch (e) { return {}; }
  }

  function saveBillingPrefs(prefs) {
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(prefs));
  }

  function updatePayoutFieldsVisibility() {
    const selected = document.querySelector('input[name="payoutMethod"]:checked');
    const method = selected ? selected.value : 'stripe-usd';
    if (payoutStripeFields && payoutCryptoFields) {
      if (method === 'stripe-usd') {
        payoutStripeFields.classList.remove('hidden');
        payoutCryptoFields.classList.add('hidden');
      } else {
        payoutStripeFields.classList.add('hidden');
        payoutCryptoFields.classList.remove('hidden');
        if (payoutWalletInput) {
          payoutWalletInput.placeholder = method === 'btc'
            ? 'Enter your BTC wallet address (e.g., bc1q...)'
            : 'Enter your ETH wallet address (e.g., 0x...)';
        }
      }
    }
    const prefs = loadBillingPrefs();
    prefs.payoutMethod = method;
    saveBillingPrefs(prefs);
  }

  payoutRadios.forEach(radio => {
    radio.addEventListener('change', updatePayoutFieldsVisibility);
  });

  // Restore saved payout method
  const savedBilling = loadBillingPrefs();
  if (savedBilling.payoutMethod) {
    const radio = document.querySelector(`input[name="payoutMethod"][value="${savedBilling.payoutMethod}"]`);
    if (radio) radio.checked = true;
  }
  if (savedBilling.walletAddress && payoutWalletInput) {
    payoutWalletInput.value = savedBilling.walletAddress;
    if (cryptoWalletStatus) cryptoWalletStatus.textContent = 'Wallet saved ✓';
  }
  if (savedBilling.stripeConnected && stripeConnectStatus) {
    stripeConnectStatus.textContent = 'Connected ✓';
  }
  updatePayoutFieldsVisibility();

  if (billingManageSubBtn) {
    billingManageSubBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/affiliate/billing/manage-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateCode: supportState.affiliateCode })
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          alert(data.message || 'Subscription management will be available soon.');
        }
      } catch (e) { alert('Unable to connect. Try again later.'); }
    });
  }

  if (billingBuyAvatarBtn) {
    billingBuyAvatarBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/affiliate/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateCode: supportState.affiliateCode, item: 'avatar', price: 2900 })
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) { window.open(data.url, '_blank'); }
        else { alert(data.message || 'Checkout will be available soon.'); }
      } catch (e) { alert('Unable to connect. Try again later.'); }
    });
  }

  if (billingBuyVideoBtn) {
    billingBuyVideoBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/affiliate/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateCode: supportState.affiliateCode, item: 'video-render', price: 900 })
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) { window.open(data.url, '_blank'); }
        else { alert(data.message || 'Checkout will be available soon.'); }
      } catch (e) { alert('Unable to connect. Try again later.'); }
    });
  }

  if (billingConnectStripeBtn) {
    billingConnectStripeBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/affiliate/billing/connect-stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateCode: supportState.affiliateCode })
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          window.open(data.url, '_blank');
          const prefs = loadBillingPrefs();
          prefs.stripeConnected = true;
          saveBillingPrefs(prefs);
          if (stripeConnectStatus) stripeConnectStatus.textContent = 'Connecting…';
        } else {
          alert(data.message || 'Stripe Connect will be available soon.');
        }
      } catch (e) { alert('Unable to connect. Try again later.'); }
    });
  }

  if (billingSaveWalletBtn) {
    billingSaveWalletBtn.addEventListener('click', () => {
      const wallet = payoutWalletInput ? payoutWalletInput.value.trim() : '';
      if (!wallet) {
        if (cryptoWalletStatus) cryptoWalletStatus.textContent = '⚠️ Please enter a wallet address.';
        return;
      }
      const prefs = loadBillingPrefs();
      prefs.walletAddress = wallet;
      saveBillingPrefs(prefs);
      if (cryptoWalletStatus) cryptoWalletStatus.textContent = 'Wallet saved ✓';
    });
  }

  if (billingRequestPayoutBtn) {
    billingRequestPayoutBtn.addEventListener('click', async () => {
      const prefs = loadBillingPrefs();
      const method = prefs.payoutMethod || 'stripe-usd';
      try {
        const res = await fetch('/api/affiliate/billing/request-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliateCode: supportState.affiliateCode,
            method,
            walletAddress: prefs.walletAddress || ''
          })
        });
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Payout request submitted. You will be notified when it is processed.');
      } catch (e) { alert('Unable to submit payout request. Try again later.'); }
    });
  }

  // Load billing info from API
  async function loadBillingInfo() {
    try {
      const res = await fetch(`/api/affiliate/billing/info?code=${encodeURIComponent(supportState.affiliateCode)}`, {
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        if (billingPlan) billingPlan.textContent = data.plan || 'Free Trial';
        if (billingStatus) billingStatus.textContent = data.subscriptionStatus || 'Active';
        if (billingNext) billingNext.textContent = data.nextBillingDate || '—';
        if (billingBalance) billingBalance.textContent = '$' + (data.balance || '0.00');
        if (billingLifetime) billingLifetime.textContent = '$' + (data.lifetimeEarned || '0.00');
        if (billingLastPayout) billingLastPayout.textContent = data.lastPayoutDate || '—';
        if (billingPurchases && Array.isArray(data.purchases) && data.purchases.length > 0) {
          billingPurchases.innerHTML = data.purchases.map(p =>
            `<div class="billing-purchase-item"><span class="purchase-name">${p.name}</span><span class="purchase-date">${p.date}</span><span class="purchase-amount">$${p.amount}</span></div>`
          ).join('');
        }
      }
    } catch (e) { console.warn('Billing info load failed', e); }
  }

  // ── Social accounts & posting ──────────────────────────────────────────────
  const SOCIAL_STORAGE_KEY = 'evics_social_accounts';
  const socialFields = {
    facebook: document.getElementById('phoneSocialFacebook'),
    instagram: document.getElementById('phoneSocialInstagram'),
    tiktok: document.getElementById('phoneSocialTiktok'),
    youtube: document.getElementById('phoneSocialYoutube'),
    pinterest: document.getElementById('phoneSocialPinterest'),
    x: document.getElementById('phoneSocialX'),
    other: document.getElementById('phoneSocialOther')
  };
  const socialSaveBtn = document.getElementById('phoneSocialSave');
  const socialPostStatus = document.getElementById('phoneSocialPostStatus');
  const socialPostMessage = document.getElementById('phoneSocialPostMessage');

  function loadSocialAccounts() {
    try {
      const stored = localStorage.getItem(SOCIAL_STORAGE_KEY);
      if (!stored) return;
      const accounts = JSON.parse(stored);
      Object.keys(socialFields).forEach(key => {
        if (socialFields[key] && accounts[key]) socialFields[key].value = accounts[key];
      });
    } catch (e) { console.warn('Failed to load social accounts', e); }
  }

  function saveSocialAccounts() {
    const accounts = {};
    Object.keys(socialFields).forEach(key => {
      if (socialFields[key]) accounts[key] = socialFields[key].value.trim();
    });
    localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  }

  if (socialSaveBtn) {
    socialSaveBtn.addEventListener('click', () => {
      saveSocialAccounts();
      if (socialPostStatus && socialPostMessage) {
        socialPostStatus.classList.remove('hidden');
        socialPostMessage.textContent = '✅ Social accounts saved successfully.';
        setTimeout(() => socialPostStatus.classList.add('hidden'), 3000);
      }
    });
  }

  document.querySelectorAll('.social-post-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const platform = btn.dataset.platform;
      const accounts = saveSocialAccounts();
      const accountUrl = accounts[platform] || '';
      if (!accountUrl) {
        if (socialPostStatus && socialPostMessage) {
          socialPostStatus.classList.remove('hidden');
          socialPostMessage.textContent = `⚠️ Please enter your ${platform} account link first.`;
          setTimeout(() => socialPostStatus.classList.add('hidden'), 3000);
        }
        return;
      }
      if (socialPostStatus && socialPostMessage) {
        socialPostStatus.classList.remove('hidden');
        socialPostMessage.textContent = `📤 Posting video to ${platform}…`;
      }
      try {
        const response = await fetch('/api/affiliate/social/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliateCode: supportState.affiliateCode,
            platform,
            accountUrl,
            videoUrl: supportState.avatarSetup.createdAvatar?.videoUrl || '',
            productId: supportState.avatarSetup.selectedProductId || ''
          })
        });
        const data = await response.json().catch(() => ({}));
        if (data.success) {
          socialPostMessage.textContent = `✅ Video posted to ${platform} successfully!`;
        } else {
          socialPostMessage.textContent = data.message || `⚠️ Post to ${platform} queued — platform integration pending.`;
        }
      } catch (err) {
        socialPostMessage.textContent = `⚠️ Post to ${platform} queued — will retry when connection is available.`;
      }
      setTimeout(() => { if (socialPostStatus) socialPostStatus.classList.add('hidden'); }, 5000);
    });
  });

  loadSocialAccounts();

  void boot();
  // Disable automatic UI polling to prevent periodic refresh/blink that interrupts user input.
  // Data refresh remains available through explicit user actions (Refresh buttons).
  setInterval(() => { void heartbeatSupport(); }, 15000);
})();
