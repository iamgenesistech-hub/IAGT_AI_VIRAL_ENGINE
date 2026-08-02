// EVICS Media Review Center — Viral Product Media Command Center
// Self-contained module that mounts a full-featured review workspace
// into the safe shell. Handles preview, edit, approve/deny (VP mode),
// delete, re-render, filters, and auto-refresh.
(function () {
  'use strict';

  const API = {
    list: '/api/media-output/outputs',
    detail: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}`,
    action: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}/actions`,
    vpDecision: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}/vp-decision`,
    renderRoute: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}/render-route`,
    gcsInfo: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}/gcs-info`,
    autoGrade: '/api/media-output/auto-grade-batch',
    del: (id) => `/api/media-output/outputs/${encodeURIComponent(id)}`
  };

  const REFRESH_MS = 30000;
  const ADMIN_KEY_STORAGE = 'evics_admin_key';

  const state = {
    items: [],
    loading: false,
    error: null,
    filters: {
      search: '',
      mediaType: 'all',
      status: 'all',
      tier: 'all',
      vpMode: false
    },
    refreshTimer: null,
    mounted: false
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function $(selector, root) { return (root || document).querySelector(selector); }

  function isMediaOutputSection() {
    const params = new URLSearchParams(window.location.search);
    const section = (params.get('section') || params.get('tab') || '').toLowerCase();
    return section === 'media-output' || section === 'media-library' || section === 'output';
  }

  function tierClass(tier) {
    switch (tier) {
      case 'A+': return 'tier-aplus';
      case 'A': return 'tier-a';
      case 'B+': return 'tier-bplus';
      default: return 'tier-review';
    }
  }
  function statusClass(status) {
    const v = String(status || '').toLowerCase();
    if (v.indexOf('approved') !== -1 || v.indexOf('completed') !== -1 || v.indexOf('published') !== -1) return 'pill green';
    if (v.indexOf('awaiting') !== -1 || v.indexOf('queue') !== -1 || v.indexOf('review') !== -1) return 'pill gold';
    if (v.indexOf('reject') !== -1 || v.indexOf('block') !== -1 || v.indexOf('fail') !== -1) return 'pill danger';
    if (v.indexOf('render') !== -1) return 'pill blue';
    return 'pill blue';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso); }
  }

  function getAdminKey() {
    try { return String(window.localStorage.getItem(ADMIN_KEY_STORAGE) || '').trim(); } catch (e) { return ''; }
  }
  function setAdminKey(v) {
    try { window.localStorage.setItem(ADMIN_KEY_STORAGE, String(v || '').trim()); } catch (e) {}
  }

  async function api(url, opts) {
    opts = opts || {};
    const headers = Object.assign({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }, opts.headers || {});
    const adminKey = getAdminKey();
    if (adminKey && (opts.method === 'DELETE' || (opts.method === 'POST' && /vp-decision|auto-grade/.test(url)))) {
      headers['x-admin-key'] = adminKey;
    }
    const resp = await fetch(url, Object.assign({}, opts, { headers, cache: 'no-store' }));
    let payload = {};
    try { payload = await resp.json(); } catch (e) {}
    if (!resp.ok || payload.success === false) {
      const msg = payload.error || 'Request failed (' + resp.status + ')';
      throw new Error(msg);
    }
    return payload;
  }

  function injectStyles() {
    if (document.getElementById('mr-styles')) return;
    const css = [
      '.mr-shell { display: flex; flex-direction: column; gap: 18px; padding-top: 4px; }',
      '.mr-toolbar { display: grid; grid-template-columns: 1fr auto auto auto auto auto; gap: 10px; align-items: center;',
      '  padding: 14px 16px; background: rgba(9,17,28,0.85); border: 1px solid rgba(126,161,204,0.22);',
      '  border-radius: 12px; }',
      '@media (max-width: 960px) { .mr-toolbar { grid-template-columns: 1fr 1fr; } }',
      '.mr-toolbar input, .mr-toolbar select {',
      '  background: rgba(4,7,13,0.9); color: #ebf2fb;',
      '  border: 1px solid rgba(126,161,204,0.28);',
      '  border-radius: 8px; padding: 8px 10px; font: inherit;',
      '}',
      '.mr-toolbar input { min-width: 220px; }',
      '.mr-btn { display: inline-flex; align-items: center; gap: 6px;',
      '  padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(99,229,255,0.4);',
      '  background: rgba(26,168,216,0.12); color: #ebf2fb; cursor: pointer;',
      '  font: inherit; font-weight: 500; transition: background .15s, transform .05s; }',
      '.mr-btn:hover { background: rgba(26,168,216,0.24); }',
      '.mr-btn:active { transform: translateY(1px); }',
      '.mr-btn.primary { background: linear-gradient(135deg, #1aa8d8, #0d6c94); border-color: #66e7ff; color: #04070d; font-weight: 700; }',
      '.mr-btn.danger { background: rgba(255,140,140,0.15); border-color: rgba(255,140,140,0.55); color: #ffb0b0; }',
      '.mr-btn.good { background: rgba(115,230,183,0.15); border-color: rgba(115,230,183,0.55); color: #a8f2d0; }',
      '.mr-btn.ghost { background: transparent; border-color: rgba(126,161,204,0.28); }',
      '.mr-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
      '.mr-vp-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px;',
      '  background: rgba(242,213,150,0.10); border: 1px solid rgba(242,213,150,0.4); border-radius: 8px; color: #f2d596; }',
      '.mr-vp-toggle input { accent-color: #f2d596; }',
      '.mr-status-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; color: #9bb0c6; font-size: 13px; }',
      '.mr-status-row strong { color: #ebf2fb; }',
      '.mr-grid { display: grid; gap: 16px;',
      '  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }',
      '.mr-card { display: flex; flex-direction: column; overflow: hidden;',
      '  background: rgba(14,20,31,0.94); border: 1px solid rgba(126,161,204,0.22);',
      '  border-radius: 14px; transition: border-color .15s, transform .1s; }',
      '.mr-card:hover { border-color: rgba(99,229,255,0.5); }',
      '.mr-preview { position: relative; aspect-ratio: 9/16; background: #000; overflow: hidden;',
      '  display: flex; align-items: center; justify-content: center; }',
      '.mr-preview img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }',
      '.mr-preview .mr-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;',
      '  color: #fff; font-size: 42px; text-shadow: 0 2px 12px rgba(0,0,0,0.7);',
      '  background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7)); cursor: pointer; }',
      '.mr-preview .mr-no-media { color: #6a7d95; font-size: 13px; text-align: center; padding: 20px; }',
      '.mr-badges { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; gap: 6px; pointer-events: none; }',
      '.mr-tier-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }',
      '.mr-tier-badge.tier-aplus { background: linear-gradient(135deg, #f2d596, #c8aa5c); color: #04070d; box-shadow: 0 0 12px rgba(242,213,150,0.6); }',
      '.mr-tier-badge.tier-a { background: rgba(115,230,183,0.9); color: #04070d; }',
      '.mr-tier-badge.tier-bplus { background: rgba(102,231,255,0.85); color: #04070d; }',
      '.mr-tier-badge.tier-review { background: rgba(255,210,125,0.85); color: #04070d; }',
      '.pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;',
      '  letter-spacing: 0.3px; text-transform: uppercase; }',
      '.pill.green { background: rgba(115,230,183,0.85); color: #04070d; }',
      '.pill.gold { background: rgba(242,213,150,0.9); color: #04070d; }',
      '.pill.blue { background: rgba(102,231,255,0.85); color: #04070d; }',
      '.pill.danger { background: rgba(255,140,140,0.85); color: #180404; }',
      '.mr-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }',
      '.mr-title { font-weight: 700; font-size: 15px; line-height: 1.3; margin: 0; color: #ebf2fb;',
      '  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }',
      '.mr-meta { color: #9bb0c6; font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap; }',
      '.mr-meta span { display: inline-flex; align-items: center; gap: 4px; }',
      '.mr-score { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #9bb0c6; }',
      '.mr-score .bar { flex: 1; height: 4px; background: rgba(126,161,204,0.14); border-radius: 3px; overflow: hidden; }',
      '.mr-score .fill { height: 100%; background: linear-gradient(90deg, #ff8c8c 0%, #ffd27d 60%, #73e6b7 85%, #f2d596 100%); }',
      '.mr-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }',
      '.mr-actions .mr-btn { padding: 6px 8px; font-size: 12px; justify-content: center; }',
      '.mr-empty { padding: 40px 20px; text-align: center; color: #9bb0c6;',
      '  border: 1px dashed rgba(126,161,204,0.28); border-radius: 12px; }',
      '.mr-modal-backdrop { position: fixed; inset: 0; background: rgba(4,7,13,0.85); backdrop-filter: blur(6px);',
      '  display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }',
      '.mr-modal { max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto;',
      '  background: rgba(9,17,28,0.98); border: 1px solid rgba(99,229,255,0.5);',
      '  border-radius: 14px; padding: 20px 22px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }',
      '.mr-modal header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; }',
      '.mr-modal h3 { margin: 0; font-size: 18px; color: #ebf2fb; }',
      '.mr-modal video { width: 100%; max-height: 60vh; background: #000; border-radius: 10px; }',
      '.mr-modal label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #9bb0c6; margin-bottom: 12px; }',
      '.mr-modal label input, .mr-modal label textarea, .mr-modal label select {',
      '  background: rgba(4,7,13,0.85); color: #ebf2fb;',
      '  border: 1px solid rgba(126,161,204,0.28); border-radius: 8px;',
      '  padding: 8px 10px; font: inherit; font-size: 14px;',
      '}',
      '.mr-modal textarea { min-height: 80px; resize: vertical; }',
      '.mr-modal .mr-actions-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }',
      '.mr-close { background: transparent; border: 0; color: #9bb0c6; font-size: 24px; cursor: pointer; line-height: 1; }',
      '.mr-close:hover { color: #ebf2fb; }',
      '.mr-toast { position: fixed; bottom: 20px; right: 20px; z-index: 10000;',
      '  padding: 10px 16px; border-radius: 10px; background: rgba(9,17,28,0.96);',
      '  border: 1px solid rgba(99,229,255,0.5); color: #ebf2fb; box-shadow: 0 12px 30px rgba(0,0,0,0.5);',
      '  max-width: 380px; font-size: 13px; }',
      '.mr-toast.ok { border-color: rgba(115,230,183,0.6); }',
      '.mr-toast.err { border-color: rgba(255,140,140,0.6); }',
      '.mr-loading { padding: 30px; text-align: center; color: #9bb0c6; }',
      '.mr-error { padding: 20px; border-radius: 12px; background: rgba(255,140,140,0.12);',
      '  border: 1px solid rgba(255,140,140,0.5); color: #ffb0b0; }'
    ].join('\n');
    const style = document.createElement('style');
    style.id = 'mr-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showToast(message, kind) {
    const el = document.createElement('div');
    el.className = 'mr-toast ' + (kind === 'err' ? 'err' : 'ok');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; }, 3200);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function mountContainer() {
    const anchor = document.getElementById('media-library');
    if (!anchor) return null;

    let host = document.getElementById('mr-shell');
    if (host) return host;

    const head = anchor.querySelector('.panel-head');
    const wrap = anchor.querySelector('.list-stack') || anchor;

    if (head) {
      const eyebrow = head.querySelector('.eyebrow');
      const h2 = head.querySelector('h2');
      if (eyebrow) eyebrow.textContent = 'Media Review Center';
      if (h2) h2.textContent = 'Product video output — review, approve, publish';
    }

    host = document.createElement('div');
    host.id = 'mr-shell';
    host.className = 'mr-shell';
    host.innerHTML =
      '<div class="mr-toolbar" id="mr-toolbar">' +
        '<input type="search" id="mr-search" placeholder="Search title, product, provider…" />' +
        '<select id="mr-tier">' +
          '<option value="all">All grades</option>' +
          '<option value="A+">A+ Elite Viral</option>' +
          '<option value="A">A grade</option>' +
          '<option value="B+">B+ grade</option>' +
          '<option value="needs-review">Needs review</option>' +
        '</select>' +
        '<select id="mr-status">' +
          '<option value="all">All statuses</option>' +
          '<option value="awaiting_review">Awaiting VP review</option>' +
          '<option value="approved">Approved</option>' +
          '<option value="rejected">Rejected</option>' +
          '<option value="published">Published</option>' +
          '<option value="completed">Completed</option>' +
          '<option value="rendering">Rendering</option>' +
        '</select>' +
        '<select id="mr-media-type">' +
          '<option value="all">All media</option>' +
          '<option value="video">Video</option>' +
          '<option value="image">Image</option>' +
        '</select>' +
        '<label class="mr-vp-toggle" title="Show only renders awaiting VP approval">' +
          '<input type="checkbox" id="mr-vp-mode" />' +
          '<span>VP mode</span>' +
        '</label>' +
        '<button type="button" class="mr-btn primary" id="mr-refresh">Refresh</button>' +
      '</div>' +
      '<div class="mr-status-row" id="mr-status-row"></div>' +
      '<div id="mr-container"></div>';

    wrap.replaceWith(host);

    bindToolbar(host);
    return host;
  }

  function bindToolbar(host) {
    const s = $('#mr-search', host);
    const t = $('#mr-tier', host);
    const st = $('#mr-status', host);
    const mt = $('#mr-media-type', host);
    const vp = $('#mr-vp-mode', host);
    const rf = $('#mr-refresh', host);

    let searchTimer = null;
    s.addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.filters.search = e.target.value.trim().toLowerCase();
        renderGrid();
      }, 180);
    });
    t.addEventListener('change', function (e) { state.filters.tier = e.target.value; renderGrid(); });
    st.addEventListener('change', function (e) { state.filters.status = e.target.value; renderGrid(); });
    mt.addEventListener('change', function (e) { state.filters.mediaType = e.target.value; renderGrid(); });
    vp.addEventListener('change', function (e) {
      state.filters.vpMode = e.target.checked;
      if (e.target.checked) {
        state.filters.status = 'awaiting_review';
        st.value = 'awaiting_review';
      }
      renderGrid();
    });
    rf.addEventListener('click', function () { loadAndRender(true); });
  }

  function applyFilters(items) {
    const f = state.filters;
    return items.filter(function (it) {
      if (f.tier !== 'all' && (it.tier || 'needs-review') !== f.tier) return false;
      if (f.status !== 'all') {
        const s = String(it.status || '').toLowerCase();
        if (s !== f.status.toLowerCase()) return false;
      }
      if (f.mediaType !== 'all' && (it.mediaType || 'video') !== f.mediaType) return false;
      if (f.search) {
        const hay = [it.title, it.providerPackage, it.sourceProvider, it.status, it.tier].join(' ').toLowerCase();
        if (hay.indexOf(f.search) === -1) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const container = document.getElementById('mr-container');
    const statusRow = document.getElementById('mr-status-row');
    if (!container) return;

    if (state.loading) {
      container.innerHTML = '<div class="mr-loading">Loading media output…</div>';
      return;
    }
    if (state.error) {
      container.innerHTML = '<div class="mr-error">Media Review error: ' + esc(state.error) + '</div>';
      return;
    }
    const filtered = applyFilters(state.items);
    if (statusRow) {
      const counts = {
        total: state.items.length,
        shown: filtered.length,
        aplus: state.items.filter(function (it) { return it.tier === 'A+'; }).length,
        awaiting: state.items.filter(function (it) { return String(it.status).toLowerCase() === 'awaiting_review'; }).length,
        approved: state.items.filter(function (it) { return String(it.status).toLowerCase() === 'approved'; }).length,
        rejected: state.items.filter(function (it) { return String(it.status).toLowerCase() === 'rejected'; }).length
      };
      statusRow.innerHTML =
        '<span>Showing <strong>' + counts.shown + '</strong> of <strong>' + counts.total + '</strong></span>' +
        '<span>· A+ Elite: <strong>' + counts.aplus + '</strong></span>' +
        '<span>· Awaiting VP: <strong>' + counts.awaiting + '</strong></span>' +
        '<span>· Approved: <strong>' + counts.approved + '</strong></span>' +
        '<span>· Rejected: <strong>' + counts.rejected + '</strong></span>' +
        '<span style="margin-left:auto">' +
          '<button type="button" class="mr-btn ghost" id="mr-auto-grade" title="Rescore every render and auto-approve A+ items">Rescore all &amp; auto-approve A+</button> ' +
          '<button type="button" class="mr-btn ghost" id="mr-admin-key" title="Set admin key for delete/approve actions">Admin key…</button>' +
        '</span>';
      const ag = document.getElementById('mr-auto-grade');
      if (ag) ag.addEventListener('click', runAutoGrade);
      const ak = document.getElementById('mr-admin-key');
      if (ak) ak.addEventListener('click', promptAdminKey);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="mr-empty">No media matches these filters. Try clearing search or switching VP mode off.</div>';
    } else {
      container.innerHTML = '<div class="mr-grid">' + filtered.map(renderCard).join('') + '</div>';
      bindCardActions(container);
    }
  }

  function renderCard(item) {
    const tier = item.tier || 'needs-review';
    const tLabel = item.tierLabel || (tier === 'A+' ? 'A+ Elite Viral' : tier);
    const status = item.status || 'pending';
    const score = Math.max(0, Math.min(100, Number(item.grade || item.readinessScore || 0)));
    const poster = item.posterUrl || item.previewUrl;
    const hasVideo = Boolean(item.playbackUrl);
    const provider = item.sourceProvider || 'EVICS';
    const product = item.providerPackage || '—';

    return (
      '<article class="mr-card" data-mr-id="' + esc(item.id) + '">' +
        '<div class="mr-preview" data-mr-preview="' + esc(item.id) + '">' +
          (poster ? '<img src="' + esc(poster) + '" alt="" loading="lazy" />' : '') +
          (hasVideo ? '<div class="mr-play" title="Preview render">▶</div>' : '<div class="mr-no-media">No playback URL yet</div>') +
          '<div class="mr-badges">' +
            '<span class="mr-tier-badge ' + tierClass(tier) + '">' + esc(tLabel) + '</span>' +
            '<span class="' + statusClass(status) + '">' + esc(status) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mr-body">' +
          '<h4 class="mr-title" title="' + esc(item.title) + '">' + esc(item.title) + '</h4>' +
          '<div class="mr-meta">' +
            '<span>📦 ' + esc(product) + '</span>' +
            '<span>🛠 ' + esc(provider) + '</span>' +
            '<span>⏱ ' + esc(fmtDate(item.createdAt)) + '</span>' +
          '</div>' +
          '<div class="mr-score" title="Render grade ' + score + '/100 — A+ threshold ' + (item.aPlusMinimum || 95) + '">' +
            '<span>Grade ' + score + '/100</span>' +
            '<div class="bar"><div class="fill" style="width:' + score + '%"></div></div>' +
          '</div>' +
          '<div class="mr-actions">' +
            '<button type="button" class="mr-btn good" data-mr-action="approve" data-mr-id="' + esc(item.id) + '">Approve</button>' +
            '<button type="button" class="mr-btn danger" data-mr-action="deny" data-mr-id="' + esc(item.id) + '">Deny</button>' +
            '<button type="button" class="mr-btn ghost" data-mr-action="edit" data-mr-id="' + esc(item.id) + '">Edit</button>' +
            '<button type="button" class="mr-btn ghost" data-mr-action="rerender" data-mr-id="' + esc(item.id) + '">Re-render</button>' +
            '<button type="button" class="mr-btn ghost" data-mr-action="preview" data-mr-id="' + esc(item.id) + '">Preview</button>' +
            '<button type="button" class="mr-btn danger" data-mr-action="delete" data-mr-id="' + esc(item.id) + '">Delete</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function bindCardActions(container) {
    // Remove prior listener, add fresh delegated listener
    container.onclick = function (ev) {
      const previewTarget = ev.target.closest && ev.target.closest('[data-mr-preview]');
      const btn = ev.target.closest && ev.target.closest('[data-mr-action]');
      if (btn) {
        const action = btn.getAttribute('data-mr-action');
        const id = btn.getAttribute('data-mr-id');
        handleAction(action, id, btn);
        return;
      }
      if (previewTarget) {
        const id = previewTarget.getAttribute('data-mr-preview');
        openPreview(id);
      }
    };
  }

  async function handleAction(action, id, btn) {
    const item = state.items.find(function (it) { return String(it.id) === String(id); });
    if (!item) { showToast('Item not found in current list — refreshing…', 'err'); return loadAndRender(true); }
    if (btn) btn.disabled = true;
    try {
      switch (action) {
        case 'approve':
          await api(API.vpDecision(id), { method: 'POST', body: JSON.stringify({ decision: 'approve', actor: 'vp-ui' }) });
          showToast('Approved: ' + item.title, 'ok');
          break;
        case 'deny': {
          const reason = window.prompt('Deny reason (optional):', '') || '';
          await api(API.vpDecision(id), { method: 'POST', body: JSON.stringify({ decision: 'deny', reason: reason, actor: 'vp-ui' }) });
          showToast('Denied: ' + item.title, 'ok');
          break;
        }
        case 'rerender':
          await api(API.renderRoute(id), { method: 'POST', body: JSON.stringify({ action: 'rerenderCurrentOutput', context: { presetKey: 'original' } }) });
          showToast('Re-render queued.', 'ok');
          break;
        case 'delete': {
          if (!window.confirm('Permanently delete "' + item.title + '" including its GCS file? This cannot be undone.')) { if (btn) btn.disabled = false; return; }
          if (!getAdminKey()) promptAdminKey();
          if (!getAdminKey()) { showToast('Admin key required to delete.', 'err'); if (btn) btn.disabled = false; return; }
          const result = await api(API.del(id), { method: 'DELETE' });
          showToast('Deleted. GCS: ' + (result.gcsDeleted ? 'yes' : 'no') + ' · Supabase: ' + (result.supabaseDeleted ? 'yes' : 'no'), 'ok');
          break;
        }
        case 'preview':
          openPreview(id);
          if (btn) btn.disabled = false;
          return;
        case 'edit':
          openEdit(id);
          if (btn) btn.disabled = false;
          return;
        default:
          break;
      }
      await loadAndRender(true);
    } catch (err) {
      showToast(err.message || 'Action failed', 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function closeModal() {
    const back = document.getElementById('mr-modal-backdrop');
    if (back) back.remove();
  }
  function openModal(innerHtml) {
    closeModal();
    const back = document.createElement('div');
    back.id = 'mr-modal-backdrop';
    back.className = 'mr-modal-backdrop';
    back.innerHTML = '<div class="mr-modal">' + innerHtml + '</div>';
    back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
    const escClose = function (e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escClose); } };
    document.addEventListener('keydown', escClose);
    document.body.appendChild(back);
    return back;
  }

  function openPreview(id) {
    const item = state.items.find(function (it) { return String(it.id) === String(id); });
    if (!item) return;
    const src = item.playbackUrl || item.previewUrl || item.storageUrl;
    const body =
      '<header>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<button class="mr-close" data-mr-close>×</button>' +
      '</header>' +
      (src
        ? '<video controls autoplay ' + (item.posterUrl ? 'poster="' + esc(item.posterUrl) + '"' : '') + ' src="' + esc(src) + '"></video>'
        : '<div class="mr-empty">No playback URL for this render yet.</div>') +
      '<div style="margin-top:12px; font-size:13px; color: #9bb0c6;">' +
        'Grade: <strong style="color:#ebf2fb">' + esc(item.grade || 0) + '/100</strong> · Tier: <strong style="color:#ebf2fb">' + esc(item.tierLabel || item.tier || '—') + '</strong> · Status: <strong style="color:#ebf2fb">' + esc(item.status) + '</strong>' +
      '</div>' +
      '<div class="mr-actions-row">' +
        (item.productUrl ? '<a class="mr-btn ghost" href="' + esc(item.productUrl) + '" target="_blank" rel="noopener">Open product page</a>' : '') +
        (item.storageUrl ? '<a class="mr-btn ghost" href="' + esc(item.storageUrl) + '" target="_blank" rel="noopener">Open GCS file</a>' : '') +
        '<button class="mr-btn primary" data-mr-close>Close</button>' +
      '</div>';
    const back = openModal(body);
    back.querySelectorAll('[data-mr-close]').forEach(function (el) { el.addEventListener('click', closeModal); });
  }

  function openEdit(id) {
    const item = state.items.find(function (it) { return String(it.id) === String(id); });
    if (!item) return;
    const body =
      '<header>' +
        '<h3>Edit render metadata</h3>' +
        '<button class="mr-close" data-mr-close>×</button>' +
      '</header>' +
      '<label>Title<input type="text" id="mr-edit-title" value="' + esc(item.title) + '" /></label>' +
      '<label>Playback URL<input type="text" id="mr-edit-playback" value="' + esc(item.playbackUrl || '') + '" placeholder="https://…mp4" /></label>' +
      '<label>Poster URL<input type="text" id="mr-edit-poster" value="' + esc(item.posterUrl || '') + '" placeholder="https://…jpg" /></label>' +
      '<label>Product URL<input type="text" id="mr-edit-product" value="' + esc(item.productUrl || '') + '" placeholder="https://iamgenesistech.com/products/…" /></label>' +
      '<label>Storage URL (GCS)<input type="text" id="mr-edit-storage" value="' + esc(item.storageUrl || '') + '" placeholder="gs://…" /></label>' +
      '<label>Notes<textarea id="mr-edit-notes" placeholder="VP review notes, improvement guidance, etc.">' + esc(item.notes || '') + '</textarea></label>' +
      '<div class="mr-actions-row">' +
        '<button class="mr-btn ghost" data-mr-close>Cancel</button>' +
        '<button class="mr-btn primary" id="mr-edit-save">Save changes</button>' +
      '</div>';
    const back = openModal(body);
    back.querySelectorAll('[data-mr-close]').forEach(function (el) { el.addEventListener('click', closeModal); });
    back.querySelector('#mr-edit-save').addEventListener('click', async function () {
      try {
        const payload = {
          title: back.querySelector('#mr-edit-title').value,
          playbackUrl: back.querySelector('#mr-edit-playback').value,
          posterUrl: back.querySelector('#mr-edit-poster').value,
          productUrl: back.querySelector('#mr-edit-product').value,
          storageUrl: back.querySelector('#mr-edit-storage').value,
          notes: back.querySelector('#mr-edit-notes').value
        };
        await api(API.detail(id), { method: 'PATCH', body: JSON.stringify(payload) });
        closeModal();
        showToast('Saved.', 'ok');
        await loadAndRender(true);
      } catch (err) {
        showToast(err.message || 'Save failed', 'err');
      }
    });
  }

  function promptAdminKey() {
    const current = getAdminKey();
    const v = window.prompt('Enter Admin API key (stored in this browser only).', current || '');
    if (v === null) return;
    setAdminKey(v);
    showToast(v ? 'Admin key saved to browser.' : 'Admin key cleared.', 'ok');
  }

  async function runAutoGrade() {
    if (!getAdminKey()) promptAdminKey();
    if (!getAdminKey()) { showToast('Admin key required.', 'err'); return; }
    if (!window.confirm('Rescore every recent render and auto-approve every A+ result? Sub-A+ items will be routed to VP review.')) return;
    try {
      const result = await api(API.autoGrade, { method: 'POST', body: JSON.stringify({ autoApprove: true, limit: 200 }) });
      const s = result.summary || {};
      showToast('Regraded ' + s.regraded + ' · Auto-approved ' + s.autoApproved + ' · Awaiting review ' + s.awaitingReview, 'ok');
      await loadAndRender(true);
    } catch (err) {
      showToast(err.message || 'Auto-grade failed', 'err');
    }
  }

  async function loadAndRender(skipSpinner) {
    if (!skipSpinner) { state.loading = true; renderGrid(); }
    state.error = null;
    try {
      const result = await api(API.list, { method: 'GET' });
      state.items = Array.isArray(result.items) ? result.items : [];
    } catch (err) {
      state.error = err.message || 'Failed to load media output.';
      state.items = [];
    } finally {
      state.loading = false;
      renderGrid();
    }
  }

  function scheduleRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(function () {
      if (isMediaOutputSection() && document.visibilityState === 'visible') {
        loadAndRender(true);
      }
    }, REFRESH_MS);
  }

  function tryMount() {
    if (!isMediaOutputSection()) return;
    injectStyles();
    const host = mountContainer();
    if (!host) {
      setTimeout(tryMount, 300);
      return;
    }
    if (!state.mounted) {
      state.mounted = true;
      loadAndRender(false);
      scheduleRefresh();
    } else {
      renderGrid();
    }
  }

  function init() {
    tryMount();
    window.addEventListener('popstate', tryMount);
    window.addEventListener('hashchange', tryMount);
    const origPush = history.pushState;
    history.pushState = function () {
      const result = origPush.apply(this, arguments);
      setTimeout(tryMount, 60);
      return result;
    };
    setTimeout(tryMount, 500);
    setTimeout(tryMount, 1500);
    setTimeout(tryMount, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
