'use strict';

(function () {
  const routeMap = {
    '/viral-media': { title: 'Dashboard', sectionId: 'product-command-center', description: 'Overview, command center, and campaign status in one isolated workspace.' },
    '/viral-media/dashboard': { title: 'Dashboard', sectionId: 'product-command-center', description: 'Overview, command center, and campaign status in one isolated workspace.' },
    '/viral-media/batch-builder': { title: 'Batch Builder', sectionId: 'batch-builder', description: 'Generate 25 best-seller campaigns in one controlled run.' },
    '/viral-media/jordan-avatar': { title: 'Jordan Avatar Video Builder', sectionId: 'jordan-avatar', description: 'Trust-first product video workflow with avatar enforcement.' },
    '/viral-media/ai-commercials': { title: 'AI Cinematic Video Builder', sectionId: 'ai-commercials', description: 'Discovery-first premium commercials for short-form platforms.' },
    '/viral-media/briefs': { title: 'Product Creative Briefs', sectionId: 'briefs', description: 'Structured briefs for products, hooks, CTAs, and compliant claims.' },
    '/viral-media/scoreboard': { title: 'Viral Scoreboard', sectionId: 'scoreboard', description: 'Pre-publish scoring and quality gates for every creative asset.' },
    '/viral-media/render-queue': { title: 'Render Queue', sectionId: 'render-queue', description: 'Queued media generation jobs and launch states.' },
    '/viral-media/publishing': { title: 'Publishing Planner', sectionId: 'publishing', description: 'Platform-specific publishing strategy with manual approval mode.' },
    '/viral-media/board-review': { title: 'AI Board Review', sectionId: 'board-review', description: 'Executive review and regeneration decisions from the AI board.' },
    '/viral-media/learning-loop': { title: 'Learning Loop', sectionId: 'learning-loop', description: 'Measured feedback and strategic improvements from published assets.' },
    '/viral-media/regeneration': { title: 'Regeneration Queue', sectionId: 'regeneration', description: 'Weak assets marked for hooks, scripts, or concept regeneration.' }
  };

  const state = {
    snapshot: null,
    products: [],
    filteredProducts: [],
    libraryQuery: '',
    libraryFocus: 'all',
    busy: false,
    message: '',
    selectedHandle: ''
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  }

  function formatNumber(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    return numeric.toFixed(numeric % 1 === 0 ? 0 : 1);
  }

  function shortText(value, maxLength) {
    const text = normalizeText(value);
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
  }

  function statusClass(status) {
    const clean = normalizeText(status).toLowerCase();
    if (!clean) return 'pill';
    if (clean.indexOf('approved') !== -1 || clean.indexOf('published') !== -1 || clean.indexOf('complete') !== -1) return 'pill green';
    if (clean.indexOf('review') !== -1 || clean.indexOf('manual') !== -1 || clean.indexOf('queued') !== -1 || clean.indexOf('ready') !== -1) return 'pill gold';
    if (clean.indexOf('regeneration') !== -1 || clean.indexOf('needs') !== -1 || clean.indexOf('blocked') !== -1 || clean.indexOf('error') !== -1) return 'pill danger';
    return 'pill blue';
  }

  function routeFocus(pathname) {
    return routeMap[pathname] || routeMap['/viral-media'];
  }

  function normalizeSnapshot(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    return Object.assign({
      summary: {},
      jordanAvatar: {},
      briefs: [],
      scripts: [],
      concepts: [],
      scores: [],
      mediaGenerationJobs: [],
      exports: [],
      publishing: [],
      boardReviews: [],
      learningLoop: [],
      regenerationQueue: [],
      mediaLibrary: []
    }, source);
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, Object.assign({
      headers: {
        Accept: 'application/json'
      }
    }, options || {}));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : ('Request failed: ' + response.status));
    }
    return payload;
  }

  function selectedProduct() {
    return state.products.find(function (item) {
      return item.productHandle === state.selectedHandle;
    }) || state.products[0] || null;
  }

  function setBusy(message) {
    state.busy = true;
    state.message = message || 'Working...';
    renderChrome();
  }

  function clearBusy(message) {
    state.busy = false;
    state.message = message || '';
    renderChrome();
  }

  function renderChrome() {
    const snapshot = state.snapshot || {};
    if (els.dashboardStatus) {
      els.dashboardStatus.textContent = state.busy ? state.message : (snapshot.summary ? ('Products ' + snapshot.summary.totalProducts + ' · Ready ' + snapshot.summary.mediaAssetsReady) : 'Loading...');
    }
    if (els.dashboardFocus) {
      els.dashboardFocus.textContent = snapshot.publishingMode || 'Manual Approval';
    }
    if (els.sidebarPublishingMode) {
      els.sidebarPublishingMode.textContent = snapshot.publishingMode || 'Manual Approval';
    }
    if (els.sidebarJordanStatus) {
      const jordan = snapshot.jordanAvatar || {};
      const statusText = jordan.available ? 'Available' : (jordan.status === 'missing' ? 'Missing' : 'Checking...');
      els.sidebarJordanStatus.textContent = statusText;
    }
  }

  function buildStatCards(snapshot) {
    const summary = snapshot.summary || {};
    const items = [
      ['Total Products', summary.totalProducts || 0, 'Best sellers loaded into the isolated engine'],
      ['Briefs Generated', summary.briefGenerated || 0, 'Structured creative briefs'],
      ['Scripts Generated', summary.scriptsGenerated || 0, 'Jordan trust scripts and concepts'],
      ['Media Assets Ready', summary.mediaAssetsReady || 0, 'Queued creative packages'],
      ['Rendering', summary.rendering || 0, 'Jobs currently in motion'],
      ['Needs Regeneration', summary.needsRegeneration || 0, 'Assets needing a rebuild'],
      ['Approved', summary.approved || 0, 'Board-approved campaigns'],
      ['Published', summary.published || 0, 'Live platform posts']
    ];
    return items.map(function (item) {
      return '<article class="stats-card"><span class="label">' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong><p>' + escapeHtml(item[2]) + '</p></article>';
    }).join('');
  }

  function buildProductRow(product) {
    const formats = Array.isArray(product.exportFormats) ? product.exportFormats.join(', ') : '—';
    const platforms = Array.isArray(product.publishedPlatforms) ? product.publishedPlatforms.join(', ') : '—';
    return [
      '<tr data-handle="' + escapeHtml(product.productHandle) + '" class="' + (product.productHandle === state.selectedHandle ? 'selected-row' : '') + '">',
      '<td><strong>' + escapeHtml(product.productName || 'Untitled Product') + '</strong></td>',
      '<td>' + escapeHtml(product.productHandle || '—') + '</td>',
      '<td>' + escapeHtml(product.sku || '—') + '</td>',
      '<td>' + escapeHtml(product.collectionName || '—') + '</td>',
      '<td>' + escapeHtml(product.productCategory || '—') + '</td>',
      '<td>' + escapeHtml(product.bestSellerRank || '—') + '</td>',
      '<td><span class="' + statusClass(product.status) + '">' + escapeHtml(product.status || '—') + '</span></td>',
      '<td><span class="' + statusClass(product.jordanVideoStatus) + '">' + escapeHtml(product.jordanVideoStatus || '—') + '</span></td>',
      '<td><span class="' + statusClass(product.aiCinematicStatus) + '">' + escapeHtml(product.aiCinematicStatus || '—') + '</span></td>',
      '<td>' + escapeHtml(formats) + '</td>',
      '<td>' + escapeHtml(platforms) + '</td>',
      '<td>' + escapeHtml(formatNumber(product.viralScore)) + '</td>',
      '<td>' + escapeHtml(formatNumber(product.conversionScore)) + '</td>',
      '<td>' + escapeHtml(formatNumber(product.engagementScore)) + '</td>',
      '<td><span class="' + statusClass(product.boardReviewStatus) + '">' + escapeHtml(product.boardReviewStatus || '—') + '</span></td>',
      '<td><span class="' + statusClass(product.learningLoopStatus) + '">' + escapeHtml(product.learningLoopStatus || '—') + '</span></td>',
      '<td>' + escapeHtml(formatDate(product.lastGeneratedAt)) + '</td>',
      '<td>' + escapeHtml(shortText(product.nextRecommendedAction, 60)) + '</td>',
      '</tr>'
    ].join('');
  }

  function buildMiniStat(title, value, detail) {
    return '<div class="mini-stat"><span class="label">' + escapeHtml(title) + '</span><strong>' + escapeHtml(value) + '</strong><p>' + escapeHtml(detail) + '</p></div>';
  }

  function buildListItem(title, meta, detail, status) {
    return [
      '<div class="list-item">',
      '<header>',
      '<div><h3>' + escapeHtml(title) + '</h3><small>' + escapeHtml(meta) + '</small></div>',
      status ? '<span class="' + statusClass(status) + '">' + escapeHtml(status) + '</span>' : '',
      '</header>',
      detail ? '<p>' + escapeHtml(detail) + '</p>' : '',
      '</div>'
    ].join('');
  }

  function renderProductDetails(snapshot) {
    const briefs = Array.isArray(snapshot.briefs) ? snapshot.briefs : [];
    const scripts = Array.isArray(snapshot.scripts) ? snapshot.scripts : [];
    const concepts = Array.isArray(snapshot.concepts) ? snapshot.concepts : [];
    const scores = Array.isArray(snapshot.scores) ? snapshot.scores : [];
    const mediaGenerationJobs = Array.isArray(snapshot.mediaGenerationJobs) ? snapshot.mediaGenerationJobs : [];
    const exportsList = Array.isArray(snapshot.exports) ? snapshot.exports : [];
    const publishing = Array.isArray(snapshot.publishing) ? snapshot.publishing : [];
    const boardReviews = Array.isArray(snapshot.boardReviews) ? snapshot.boardReviews : [];
    const learningLoop = Array.isArray(snapshot.learningLoop) ? snapshot.learningLoop : [];
    const regenerationQueue = Array.isArray(snapshot.regenerationQueue) ? snapshot.regenerationQueue : [];
    const product = selectedProduct();
    const brief = briefs.find(function (item) {
      return item.productHandle === (product && product.productHandle);
    }) || null;
    const script = scripts.find(function (item) {
      return item.productHandle === (product && product.productHandle) && item.videoType && item.videoType.indexOf('Jordan') !== -1;
    }) || null;
    const concept = concepts.find(function (item) {
      return item.productHandle === (product && product.productHandle);
    }) || null;

    els.batchBuilderCard.innerHTML = [
      buildMiniStat('Top 25', snapshot.summary.totalProducts || 0, 'Best-selling products loaded for batch generation'),
      buildMiniStat('Publishing mode', snapshot.publishingMode || 'Manual Approval', 'Manual approval protects the live build'),
      buildMiniStat('Launch renders', (snapshot.summary.rendering || 0), 'Rendering stays isolated from publishing')
    ].join('');

    els.jordanBuilderCard.innerHTML = [
      buildMiniStat('Avatar status', snapshot.jordanAvatar && snapshot.jordanAvatar.available ? 'Available' : 'Missing', 'Jordan trust renders stay blocked until recreated'),
      buildMiniStat('Voice ID', snapshot.jordanAvatar && snapshot.jordanAvatar.voiceId ? snapshot.jordanAvatar.voiceId : '—', 'Approved Jordan voice profile'),
      buildMiniStat('Next action', product ? shortText(product.nextRecommendedAction || 'Generate script') : 'Select a product', 'Select or regenerate as needed')
    ].join('');

    els.aiBuilderCard.innerHTML = [
      buildMiniStat('Selected product', product ? product.productName : 'None selected', 'Cinematic commercial uses the current product focus'),
      buildMiniStat('Concept status', concept ? concept.status : 'Not Started', concept ? shortText(concept.visualStyle || '', 72) : 'Generate a concept from the selected product'),
      buildMiniStat('Hook status', concept && concept.selectedHook ? shortText(concept.selectedHook, 72) : 'Ready to generate', 'Fast, cinematic discovery hooks')
    ].join('');

    els.briefList.innerHTML = brief
      ? buildListItem(brief.productName, brief.productCategory + ' · Rank ' + (brief.bestSellerRank || '—'), brief.suggestedHook + ' | ' + brief.suggestedCTA, brief.status)
      : '<div class="empty-state">No brief selected yet. Use the batch builder or generate one from a product row.</div>';

    const firstScore = scores[0];
    els.scoreList.innerHTML = firstScore
      ? buildListItem(firstScore.productName + ' · ' + firstScore.videoType, 'Viral ' + formatNumber(firstScore.viralScore) + ' / Conversion ' + formatNumber(firstScore.conversionScore), 'Hook ' + formatNumber(firstScore.hookStrength) + ' · Compliance ' + formatNumber(firstScore.complianceSafety), firstScore.status)
      : '<div class="empty-state">No score yet. Generate or score a product to populate the scoreboard.</div>';

    els.renderQueueList.innerHTML = mediaGenerationJobs.length
      ? mediaGenerationJobs.slice(0, 4).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.jobType, item.jobStatus || item.status || 'Not Started', item.reason || 'Queued for generation', item.status);
      }).join('')
      : '<div class="empty-state">Render queue is empty until jobs are queued.</div>';

    els.exportList.innerHTML = exportsList.length
      ? exportsList.slice(0, 5).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.exportType, item.aspectRatio + ' · ' + item.width + 'x' + item.height, item.exportLabel || 'Media export', item.status);
      }).join('')
      : '<div class="empty-state">No exports yet. Build the export matrix for a selected product.</div>';

    els.publishingList.innerHTML = publishing.length
      ? publishing.slice(0, 5).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.platform, item.preferredAspectRatio + ' · ' + (item.idealLengthSeconds || '—') + ' sec', item.caption || 'Manual approval publishing plan', item.status);
      }).join('')
      : '<div class="empty-state">Publishing stays in manual approval mode until the board approves a campaign.</div>';

    els.boardReviewList.innerHTML = boardReviews.length
      ? boardReviews.slice(0, 4).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.videoType, 'Approval score ' + formatNumber(item.approvalScore), item.finalPublishDecision + ' · ' + (item.regenerationReason || 'No regeneration needed'), item.status);
      }).join('')
      : '<div class="empty-state">Board reviews will appear after scoring a product.</div>';

    els.learningLoopList.innerHTML = learningLoop.length
      ? learningLoop.slice(0, 4).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.videoType, item.metricName + ' · ' + formatNumber(item.metricValue), item.question + ' → ' + item.answer, item.status);
      }).join('')
      : '<div class="empty-state">Learning loop insights populate after review and performance tracking.</div>';

    els.regenerationList.innerHTML = regenerationQueue.length
      ? regenerationQueue.slice(0, 4).map(function (item) {
        return buildListItem(item.productName + ' · ' + item.regenerationFocus, 'Priority ' + item.priority, item.reason, item.status);
      }).join('')
      : '<div class="empty-state">No regeneration items yet. Weak assets will appear here.</div>';
  }

  function renderMediaLibrary(snapshot) {
    const query = normalizeText(state.libraryQuery).toLowerCase();
    const items = (snapshot.mediaLibrary || []).filter(function (item) {
      const haystack = [
        item.productName,
        item.productHandle,
        item.sku,
        item.videoType,
        item.platform,
        item.status,
        item.boardReviewStatus,
        item.learningLoopStatus
      ].join(' ').toLowerCase();
      return !query || haystack.indexOf(query) !== -1;
    });
    state.filteredProducts = items;
    if (!items.length) {
      els.mediaLibraryList.innerHTML = '<div class="empty-state">No assets match the current filter.</div>';
      return;
    }
    els.mediaLibraryList.innerHTML = items.slice(0, 12).map(function (item) {
      return buildListItem(
        item.productName + ' · ' + item.videoType,
        (item.platform || 'Unassigned') + ' · ' + (item.aspectRatio || '—') + ' · Score ' + formatNumber(item.viralScore),
        item.status + ' · ' + (item.nextAction || 'No next action recorded'),
        item.status
      );
    }).join('');
  }

  function render() {
    const snapshot = state.snapshot || {};
    const focus = routeFocus(window.location.pathname);
    if (els.routeLabel) els.routeLabel.textContent = 'Route focus';
    if (els.routeTitle) els.routeTitle.textContent = focus.title;
    if (els.routeDescription) els.routeDescription.textContent = focus.description;
    if (els.sidebarPublishingMode) els.sidebarPublishingMode.textContent = snapshot.publishingMode || 'Manual Approval';
    if (els.sidebarJordanStatus) {
      const available = snapshot.jordanAvatar && snapshot.jordanAvatar.available;
      els.sidebarJordanStatus.textContent = available ? 'Available' : 'Missing';
    }
    renderChrome();
    if (els.summaryCards) els.summaryCards.innerHTML = buildStatCards(snapshot);
    if (els.productTableBody) {
      const query = normalizeText(els.productSearch.value).toLowerCase();
      const products = (state.products || []).filter(function (item) {
        const haystack = [
          item.productName,
          item.productHandle,
          item.sku,
          item.collectionName,
          item.productCategory,
          item.status,
          item.nextRecommendedAction
        ].join(' ').toLowerCase();
        return !query || haystack.indexOf(query) !== -1;
      });
      els.productTableBody.innerHTML = products.map(buildProductRow).join('') || '<tr><td colspan="18"><div class="empty-state">No products loaded yet.</div></td></tr>';
    }
    renderProductDetails(snapshot);
    renderMediaLibrary(snapshot);
    document.querySelectorAll('.viral-nav a').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-route') === window.location.pathname);
    });
  }

  async function loadDashboard() {
    setBusy('Loading dashboard...');
    try {
      const [dashboardPayload, productPayload] = await Promise.all([
        fetchJson('/api/viral-media/dashboard'),
        fetchJson('/api/viral-media/products?limit=25')
      ]);
      state.snapshot = normalizeSnapshot((dashboardPayload && dashboardPayload.dashboard) || dashboardPayload || {});
      state.products = Array.isArray(productPayload.products) ? productPayload.products : [];
      state.filteredProducts = state.products.slice();
      state.selectedHandle = state.selectedHandle || (state.products[0] && state.products[0].productHandle) || '';
      render();
      clearBusy('Ready');
    } catch (error) {
      clearBusy('✗ Failed to load dashboard');
      console.error('[Viral Media Dashboard] Load failed:', error);
      throw error;
    }
  }

  async function act(endpoint, payload, method) {
    setBusy('Working on ' + endpoint + '...');
    try {
      const result = await fetchJson(endpoint, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: payload ? JSON.stringify(payload) : '{}'
      });
      await loadDashboard();
      clearBusy('✓ Updated');
      return result;
    } catch (error) {
      clearBusy('✗ Error: ' + (error.message || 'Unknown error'));
      console.error('[Viral Media Dashboard] Action failed:', endpoint, error);
      alert('Action failed: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }

  async function handleAction(action, target) {
    const product = state.products.find(function (item) {
      return item.productHandle === target;
    }) || selectedProduct();
    const brief = state.snapshot && Array.isArray(state.snapshot.briefs)
      ? state.snapshot.briefs.find(function (item) {
        return item.productHandle === (product && product.productHandle);
      })
      : null;
    const script = state.snapshot && Array.isArray(state.snapshot.scripts)
      ? state.snapshot.scripts.find(function (item) {
        return item.productHandle === (product && product.productHandle) && item.videoType && item.videoType.indexOf('Jordan') !== -1;
      })
      : null;
    const concept = state.snapshot && Array.isArray(state.snapshot.concepts)
      ? state.snapshot.concepts.find(function (item) {
        return item.productHandle === (product && product.productHandle);
      })
      : null;

    if (action === 'refresh-dashboard') {
      return loadDashboard();
    }

    if (action === 'batch-build') {
      return act('/api/viral-media/batch-builder', { limit: 25, launchRendering: false }, 'POST');
    }

    if (action === 'check-jordan') {
      return act('/api/viral-media/jordan-avatar/check', {}, 'POST');
    }

    if (action === 'brief-first') {
      return act('/api/viral-media/briefs', { productHandle: product && product.productHandle, limit: 1 }, 'POST');
    }

    if (action === 'jordan-script') {
      return act('/api/viral-media/scripts/jordan', { productHandle: product && product.productHandle, limit: 1 }, 'POST');
    }

    if (action === 'ai-concept') {
      return act('/api/viral-media/concepts/ai-commercial', { productHandle: product && product.productHandle, limit: 1 }, 'POST');
    }

    if (action === 'score-first') {
      return act('/api/viral-media/score', {
        productHandle: product && product.productHandle,
        videoType: 'Jordan Avatar Trust Video',
        selectedHook: brief && brief.suggestedHook ? brief.suggestedHook : '',
        selectedCta: brief && brief.suggestedCTA ? brief.suggestedCTA : '',
        spokenScript: script && script.spokenScript ? script.spokenScript : '',
        concept: concept || null
      }, 'POST');
    }

    if (action === 'queue-render') {
      return act('/api/viral-media/render-queue', {
        productHandle: product && product.productHandle,
        limit: 1,
        jordanAvatarAvailable: state.snapshot && state.snapshot.jordanAvatar && state.snapshot.jordanAvatar.available === true,
        launchRendering: false
      }, 'POST');
    }

    if (action === 'export-first') {
      return act('/api/viral-media/exports', { productHandle: product && product.productHandle, limit: 1 }, 'POST');
    }

    if (action === 'publish-plan') {
      return act('/api/viral-media/publishing-plan', { productHandle: product && product.productHandle, limit: 1, videoType: 'Jordan Avatar Trust Video' }, 'POST');
    }

    if (action === 'board-review') {
      return act('/api/viral-media/board-review', {
        productHandle: product && product.productHandle,
        limit: 1,
        videoType: 'Jordan Avatar Trust Video',
        selectedHook: brief && brief.suggestedHook ? brief.suggestedHook : '',
        selectedCta: brief && brief.suggestedCTA ? brief.suggestedCTA : '',
        spokenScript: script && script.spokenScript ? script.spokenScript : '',
        concept: concept || null
      }, 'POST');
    }

    if (action === 'learning-loop') {
      return act('/api/viral-media/learning-loop', {
        productHandle: product && product.productHandle,
        limit: 1,
        videoType: 'Jordan Avatar Trust Video',
        selectedHook: brief && brief.suggestedHook ? brief.suggestedHook : '',
        selectedCta: brief && brief.suggestedCTA ? brief.suggestedCTA : '',
        spokenScript: script && script.spokenScript ? script.spokenScript : '',
        concept: concept || null
      }, 'POST');
    }

    if (action === 'regen-first') {
      return act('/api/viral-media/regeneration', { productHandle: product && product.productHandle, limit: 1, reason: 'Weak creative score or missing asset', regenerationFocus: 'Hooks and concept' }, 'POST');
    }

    return null;
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.getAttribute('data-action');
      const target = button.getAttribute('data-product-handle') || '';
      event.preventDefault();
      handleAction(action, target);
    });

    if (els.productSearch) {
      els.productSearch.addEventListener('input', function () {
        render();
      });
    }

    if (els.librarySearch) {
      els.librarySearch.addEventListener('input', function () {
        state.libraryQuery = els.librarySearch.value;
        render();
      });
    }

    if (els.productTableBody) {
      els.productTableBody.addEventListener('click', function (event) {
        const row = event.target.closest('tr[data-handle]');
        if (!row) return;
        state.selectedHandle = row.getAttribute('data-handle') || '';
        render();
      });
    }
  }

  function init() {
    els.summaryCards = $('summaryCards');
    els.productTableBody = $('productTableBody');
    els.batchBuilderCard = $('batchBuilderCard');
    els.jordanBuilderCard = $('jordanBuilderCard');
    els.aiBuilderCard = $('aiBuilderCard');
    els.briefList = $('briefList');
    els.scoreList = $('scoreList');
    els.renderQueueList = $('renderQueueList');
    els.exportList = $('exportList');
    els.publishingList = $('publishingList');
    els.boardReviewList = $('boardReviewList');
    els.learningLoopList = $('learningLoopList');
    els.regenerationList = $('regenerationList');
    els.mediaLibraryList = $('mediaLibraryList');
    els.routeLabel = $('routeLabel');
    els.routeTitle = $('routeTitle');
    els.routeDescription = $('routeDescription');
    els.sidebarPublishingMode = $('sidebarPublishingMode');
    els.sidebarJordanStatus = $('sidebarJordanStatus');
    els.dashboardStatus = $('dashboardStatus');
    els.dashboardFocus = $('dashboardFocus');
    els.productSearch = $('productSearch');
    els.librarySearch = $('librarySearch');

    bindEvents();
    renderChrome();
    loadDashboard()
      .then(function () {
        const focus = routeFocus(window.location.pathname);
        const sectionId = focus.sectionId || 'product-command-center';
        const section = document.getElementById(sectionId);
        if (section && typeof section.scrollIntoView === 'function') {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function (error) {
        console.error(error);
        if (els.dashboardStatus) els.dashboardStatus.textContent = 'Failed to load Viral Media dashboard';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
