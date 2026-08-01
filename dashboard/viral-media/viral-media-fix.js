(function () {
  'use strict';

  var live = {
    products: [],
    renders: [],
    creatives: [],
    viral: []
  };

  var sections = {
    overview: {
      label: 'Overview',
      title: 'Dashboard',
      sectionId: 'product-command-center',
      description: 'Overview, product command center, and campaign status in one isolated workspace.'
    },
    dashboard: {
      label: 'Dashboard',
      title: 'Dashboard',
      sectionId: 'product-command-center',
      description: 'Overview, product command center, and campaign status in one isolated workspace.'
    },
    'batch-builder': {
      label: 'Batch Builder',
      title: 'Batch Builder',
      sectionId: 'batch-builder',
      description: 'Generate 25 best-seller campaigns in one controlled run.'
    },
    'jordan-avatar': {
      label: 'Jordan Avatar',
      title: 'Jordan Avatar Video Builder',
      sectionId: 'jordan-avatar',
      description: 'Trust-first product video workflow with avatar enforcement.'
    },
    'ai-commercials': {
      label: 'AI Commercials',
      title: 'AI Cinematic Video Builder',
      sectionId: 'ai-commercials',
      description: 'Discovery-first premium commercials for short-form platforms.'
    },
    briefs: {
      label: 'Briefs',
      title: 'Product Creative Briefs',
      sectionId: 'briefs',
      description: 'Structured briefs for products, hooks, CTAs, and compliant claims.'
    },
    scoreboard: {
      label: 'Scoreboard',
      title: 'Viral Scoreboard',
      sectionId: 'scoreboard',
      description: 'Pre-publish scoring and quality gates for every creative asset.'
    },
    'render-queue': {
      label: 'Render Queue',
      title: 'Render Queue',
      sectionId: 'render-queue',
      description: 'Queued media generation jobs and launch states.'
    },
    'media-output': {
      label: 'Media Output',
      title: 'Media Output Center',
      sectionId: 'media-library',
      description: 'Live renders, generated creatives, viral media memory, and searchable output archive.'
    },
    exports: {
      label: 'Exports',
      title: 'Media Export Center',
      sectionId: 'exports',
      description: 'Aspect-ratio export matrix for product media assets.'
    },
    publishing: {
      label: 'Publishing',
      title: 'Publishing Planner',
      sectionId: 'publishing',
      description: 'Platform-specific publishing strategy with manual approval mode.'
    },
    'board-review': {
      label: 'Board Review',
      title: 'AI Board Review',
      sectionId: 'board-review',
      description: 'Executive review and regeneration decisions from the AI board.'
    },
    'learning-loop': {
      label: 'Learning Loop',
      title: 'Learning Loop',
      sectionId: 'learning-loop',
      description: 'Measured feedback and strategic improvements from published assets.'
    },
    regeneration: {
      label: 'Regeneration Queue',
      title: 'Regeneration Queue',
      sectionId: 'regeneration',
      description: 'Weak assets marked for hooks, scripts, or concept regeneration.'
    }
  };

  var navOrder = [
    'overview',
    'dashboard',
    'batch-builder',
    'jordan-avatar',
    'ai-commercials',
    'briefs',
    'scoreboard',
    'render-queue',
    'media-output',
    'exports',
    'publishing',
    'board-review',
    'learning-loop',
    'regeneration'
  ];

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

  function getSectionFromLocation() {
    var params = new URLSearchParams(window.location.search);
    var section = (params.get('section') || params.get('tab') || '').trim();
    if (!section && window.location.pathname.indexOf('/viral-media/') === 0) {
      section = window.location.pathname.replace('/viral-media/', '').split('/')[0];
    }
    if (!section) section = 'dashboard';
    section = section.replace(/_/g, '-').toLowerCase();
    if (section === 'media-output-center' || section === 'media-library' || section === 'output') section = 'media-output';
    if (section === 'render') section = 'render-queue';
    return sections[section] ? section : 'dashboard';
  }

  function sectionUrl(section) {
    return section === 'overview' ? '/viral-media?section=overview' : '/viral-media?section=' + encodeURIComponent(section);
  }

  function ensureQueryNav() {
    var nav = document.querySelector('.viral-nav');
    if (!nav) return;
    nav.innerHTML = navOrder.map(function (key) {
      var spec = sections[key];
      return '<a href="' + sectionUrl(key) + '" data-section="' + key + '" data-route="' + sectionUrl(key) + '">' + escapeHtml(spec.label) + '</a>';
    }).join('');
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  function applyFocus(scroll) {
    var key = getSectionFromLocation();
    var spec = sections[key] || sections.dashboard;
    setText('routeLabel', key === 'media-output' ? 'Media output focus' : 'Route focus');
    setText('routeTitle', spec.title);
    setText('routeDescription', spec.description);
    setText('dashboardFocus', spec.label);

    document.querySelectorAll('.viral-nav a').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === key);
    });

    if (scroll !== false) {
      window.setTimeout(function () {
        var section = $(spec.sectionId);
        if (section && typeof section.scrollIntoView === 'function') {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error(url + ' returned ' + response.status);
      return response.json();
    });
  }

  function getArray(payload, key) {
    return payload && Array.isArray(payload[key]) ? payload[key] : [];
  }

  function statusClass(status) {
    var value = String(status || '').toLowerCase();
    if (value.indexOf('complete') !== -1 || value.indexOf('approved') !== -1 || value.indexOf('ready') !== -1) return 'pill green';
    if (value.indexOf('submit') !== -1 || value.indexOf('queue') !== -1 || value.indexOf('review') !== -1) return 'pill gold';
    if (value.indexOf('fail') !== -1 || value.indexOf('error') !== -1 || value.indexOf('blocked') !== -1) return 'pill danger';
    return 'pill blue';
  }

  function numberText(value) {
    var numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : '0';
  }

  function statCard(label, value, detail) {
    return '<article class="stats-card"><span class="label">' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><p>' + escapeHtml(detail || '') + '</p></article>';
  }

  function listItem(title, meta, detail, status) {
    return '<div class="list-item"><header><div><h3>' + escapeHtml(title) + '</h3><small>' + escapeHtml(meta || '') + '</small></div>' +
      (status ? '<span class="' + statusClass(status) + '">' + escapeHtml(status) + '</span>' : '') +
      '</header>' + (detail ? '<p>' + escapeHtml(detail) + '</p>' : '') + '</div>';
  }

  function renderStats() {
    var summary = $('summaryCards');
    if (!summary) return;
    var completeRenders = live.renders.filter(function (item) {
      return String(item.status || item.render_status || '').toLowerCase().indexOf('complete') !== -1;
    }).length;
    summary.innerHTML = [
      statCard('Top Products', numberText(live.products.length), 'Best-seller products loaded from live Shopify media API'),
      statCard('Creatives', numberText(live.creatives.length), 'Generated creative assets'),
      statCard('Renders', numberText(live.renders.length), completeRenders + ' complete'),
      statCard('Viral Media', numberText(live.viral.length), 'Viral gallery entries'),
      statCard('Publishing Mode', 'Manual Approval', 'Safety gate remains active'),
      statCard('Route', sections[getSectionFromLocation()].label, 'Query-section routing active')
    ].join('');
  }

  function renderMediaPanels() {
    var queue = $('renderQueueList');
    if (queue && live.renders.length) {
      queue.innerHTML = live.renders.slice(0, 8).map(function (item) {
        return listItem(
          item.render_name || item.product_name || ('Render #' + item.id),
          (item.platform || 'EVICS') + ' | Grade ' + (item.render_grade || '-'),
          item.script || item.vault_destination || item.video_url || 'Queued media render',
          item.status || item.render_status || 'queued'
        );
      }).join('');
    }

    var exportsList = $('exportList');
    if (exportsList && live.renders.length) {
      exportsList.innerHTML = live.renders.slice(0, 6).map(function (item) {
        return listItem(
          item.product_name || item.render_name || ('Render #' + item.id),
          item.media_type || 'video',
          item.vault_destination || item.video_url || 'Awaiting output URL',
          item.status || item.render_status || 'ready'
        );
      }).join('');
    }

    var library = $('mediaLibraryList');
    if (library) {
      var renderItems = live.renders.slice(0, 8).map(function (item) {
        return listItem(item.product_name || item.render_name || ('Render #' + item.id), item.platform || 'Render', item.vault_destination || item.video_url || item.script || 'Media render', item.status || item.render_status || 'ready');
      });
      var creativeItems = live.creatives.slice(0, 6).map(function (item) {
        return listItem(item.product || item.asset || 'Generated creative', item.format || item.channel || 'Creative', item.hook || item.asset || 'Generated asset', item.status || 'Ready');
      });
      var viralItems = live.viral.slice(0, 6).map(function (item) {
        return listItem(item.title || item.hook || 'Viral entry', item.platform || item.source || 'Viral Gallery', item.product_match || item.hook || 'Viral media memory', 'Viral');
      });
      library.innerHTML = renderItems.concat(creativeItems, viralItems).join('') || '<div class="empty-state">No live media output returned yet.</div>';
    }
  }

  function renderProductFallback() {
    var body = $('productTableBody');
    if (!body || body.children.length > 1 || !live.products.length) return;
    body.innerHTML = live.products.map(function (product) {
      return '<tr data-handle="' + escapeHtml(product.productHandle || product.handle || '') + '">' +
        '<td><strong>' + escapeHtml(product.productName || product.name || product.title || 'Untitled Product') + '</strong></td>' +
        '<td>' + escapeHtml(product.productHandle || product.handle || '-') + '</td>' +
        '<td>' + escapeHtml(product.sku || '-') + '</td>' +
        '<td>' + escapeHtml(product.collectionName || 'Best Sellers') + '</td>' +
        '<td>' + escapeHtml(product.productCategory || product.category || '-') + '</td>' +
        '<td>' + escapeHtml(product.bestSellerRank || '-') + '</td>' +
        '<td><span class="pill green">Live</span></td>' +
        '<td><span class="pill gold">Manual Gate</span></td>' +
        '<td><span class="pill blue">Ready</span></td>' +
        '<td>9:16, 1:1, 16:9</td><td>TikTok, Reels, Shorts</td><td>-</td><td>-</td><td>-</td><td><span class="pill gold">Review</span></td><td><span class="pill blue">Tracking</span></td><td>-</td><td>Generate product media</td>' +
        '</tr>';
    }).join('');
  }

  function updateStatus() {
    var dashboardStatus = $('dashboardStatus');
    if (dashboardStatus) dashboardStatus.textContent = 'Products ' + live.products.length + ' | Media ' + (live.renders.length + live.creatives.length);
  }

  function refreshLivePanels() {
    return Promise.allSettled([
      fetchJson('/api/viral-media/products?limit=25'),
      fetchJson('/api/renders'),
      fetchJson('/api/creatives'),
      fetchJson('/api/viral/gallery')
    ]).then(function (results) {
      live.products = results[0].status === 'fulfilled' ? getArray(results[0].value, 'products') : live.products;
      live.renders = results[1].status === 'fulfilled' ? getArray(results[1].value, 'renders') : live.renders;
      live.creatives = results[2].status === 'fulfilled' ? getArray(results[2].value, 'creatives') : live.creatives;
      live.viral = results[3].status === 'fulfilled' ? getArray(results[3].value, 'videos') : live.viral;
      renderStats();
      renderProductFallback();
      renderMediaPanels();
      updateStatus();
      applyFocus();
    }).catch(function (error) {
      var dashboardStatus = $('dashboardStatus');
      if (dashboardStatus) dashboardStatus.textContent = 'Live panel error: ' + (error.message || 'Unknown');
    });
  }

  function bindNav() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('.viral-nav a[data-section]');
      if (!link) return;
      event.preventDefault();
      window.history.pushState({}, '', link.getAttribute('href'));
      applyFocus();
    });
    window.addEventListener('popstate', function () { applyFocus(); });
  }

  function init() {
    ensureQueryNav();
    bindNav();
    applyFocus(false);
    refreshLivePanels();
    window.setTimeout(function () { applyFocus(); }, 900);
    window.setTimeout(refreshLivePanels, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
