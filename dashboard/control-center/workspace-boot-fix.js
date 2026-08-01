/**
 * EVICS Workspace Boot Fix
 * Safety net: if the initial render fails, attempts recovery.
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  if (!app) return;

  // If app already has content, workspace rendered successfully
  if (app.children.length > 0) {
    // Check if still demo mode and force hydration
    if (typeof state !== "undefined" && state.dataSource === "Demo" && typeof hydrateFromServerApi === "function") {
      setTimeout(function() {
        hydrateFromServerApi().then(function() {
          if (typeof render === "function") render();
        }).catch(function() {});
      }, 2000);
    }
    return;
  }

  // App is empty after app.js - render failed silently
  // Try recovery in 3 seconds
  setTimeout(function() {
    if (app.children.length > 0) return;

    if (window.__evicsRenderers && typeof renderWorkspaceShell === "function") {
      try {
        var html = renderWorkspaceShell();
        if (html && html.length > 100) {
          app.innerHTML = html;
          try { if (typeof bindEvents === "function") bindEvents(); } catch(e) {}
          var splash = document.getElementById("evics-boot-splash");
          if (splash) splash.style.display = "none";
          return;
        }
      } catch(e) {
        if (typeof window.__showEvicsError === "function") {
          window.__showEvicsError("Boot-fix recovery: " + e.message);
        }
      }
    }
  }, 3000);
})();
