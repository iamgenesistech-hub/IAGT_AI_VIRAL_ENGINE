/**
 * EVICS Workspace Boot Fix
 * Runs after app.js. If render failed, attempts recovery.
 * Also forces live data hydration if stuck in demo mode.
 */
(function() {
  "use strict";

  // Wait for app.js to finish executing (it loads async now)
  var checkInterval = setInterval(function() {
    if (typeof render !== 'function' || typeof state === 'undefined') return;
    clearInterval(checkInterval);

    var app = document.getElementById('app');
    if (!app) return;

    // If workspace already rendered, just ensure live data
    if (app.children.length > 0) {
      if (state.dataSource === 'Demo' && typeof hydrateFromServerApi === 'function') {
        setTimeout(function() {
          hydrateFromServerApi().then(function() { render(); }).catch(function(){});
        }, 2000);
      }
      return;
    }

    // Workspace empty: attempt recovery after 3s
    setTimeout(function() {
      if (app.children.length > 0) return;

      if (window.__evicsRenderers && typeof renderWorkspaceShell === 'function') {
        try {
          var html = renderWorkspaceShell();
          if (html && html.length > 100) {
            app.innerHTML = html;
            try { bindEvents(); } catch(e) {}
            var splash = document.getElementById('evics-boot-splash');
            if (splash) splash.style.display = 'none';
            // Also hydrate
            if (state.dataSource === 'Demo' && typeof hydrateFromServerApi === 'function') {
              hydrateFromServerApi().then(function() { render(); }).catch(function(){});
            }
            return;
          }
        } catch(e) {
          if (typeof window.__showEvicsError === 'function') window.__showEvicsError('Boot-fix: ' + e.message);
        }
      }
    }, 3000);
  }, 200);
})();
