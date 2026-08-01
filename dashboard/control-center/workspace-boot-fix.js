/**
 * EVICS Workspace Boot Fix + Live Diagnostics
 * Shows visible on-screen diagnostics when the workspace fails to render.
 */
(function () {
  "use strict";

  var diag = [];
  function log(msg) { diag.push("[" + new Date().toISOString().slice(11,19) + "] " + msg); }

  log("workspace-boot-fix.js loaded");
  log("render type: " + typeof render);
  log("renderWorkspaceShell type: " + typeof renderWorkspaceShell);
  log("bindEvents type: " + typeof bindEvents);
  log("window.__evicsRenderers: " + (window.__evicsRenderers ? Object.keys(window.__evicsRenderers).length + " renderers" : "NOT SET"));
  log("state.dataSource: " + (typeof state !== "undefined" ? state.dataSource : "state undefined"));
  log("state.syncLevel: " + (typeof state !== "undefined" ? state.syncLevel : "state undefined"));
  log("state.currentSection: " + (typeof state !== "undefined" ? state.currentSection : "state undefined"));

  // Check if the first render already succeeded
  var app = document.getElementById("app");
  log("app element: " + (app ? "found, children=" + app.children.length + ", innerHTML length=" + app.innerHTML.length : "NOT FOUND"));

  // If app is empty after app.js, the initial render FAILED
  if (app && app.innerHTML.length < 100) {
    log("PROBLEM: app is empty - initial render failed");

    // Try to figure out why
    if (!window.__evicsRenderers) {
      log("ROOT CAUSE: __evicsRenderers not registered - __evicsOriginalRender() must have thrown");
    }

    // Try a manual render
    log("Attempting manual renderWorkspaceShell()...");
    try {
      if (typeof renderWorkspaceShell === "function") {
        var result = renderWorkspaceShell();
        log("renderWorkspaceShell returned: " + (typeof result) + ", length=" + (result ? result.length : 0));
        if (result && result.length > 100) {
          app.innerHTML = result;
          log("Set app.innerHTML successfully");
          try { if (typeof bindEvents === "function") bindEvents(); log("bindEvents() OK"); } catch (e) { log("bindEvents error: " + e.message); }
          var splash = document.getElementById("evics-boot-splash");
          if (splash) splash.style.display = "none";
        }
      }
    } catch (e) {
      log("renderWorkspaceShell THREW: " + e.message);
    }
  }

  // If still broken after 2s, show diagnostics panel
  setTimeout(function () {
    var appEl = document.getElementById("app");
    var hasContent = appEl && appEl.innerHTML.length > 200;

    if (!hasContent) {
      log("TIMEOUT: app still empty after 2s");
      log("Boot errors: " + JSON.stringify(window.__evicsBootErrors || []));

      // Show diagnostic panel
      var panel = document.createElement("div");
      panel.id = "evics-diag";
      panel.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a1a2e;color:#0f0;font-family:monospace;font-size:11px;padding:12px;max-height:60vh;overflow:auto;border-bottom:2px solid #f00;";
      panel.innerHTML = "<h3 style='color:#ff5a68;margin:0 0 8px'>EVICS Boot Diagnostic</h3><pre>" + diag.join("\\n") + "</pre>";
      document.body.insertBefore(panel, document.body.firstChild);
      var splash2 = document.getElementById("evics-boot-splash");
      if (splash2) splash2.style.display = "none";
    } else if (typeof state !== "undefined" && state.dataSource === "Demo") {
      // Rendered but still demo mode
      log("Rendered but still Demo mode after 2s");
      // Try forcing hydration
      if (typeof hydrateFromServerApi === "function") {
        hydrateFromServerApi().then(function () {
          log("Forced hydration done. dataSource=" + state.dataSource);
          if (typeof render === "function") render();
        }).catch(function (e) { log("Forced hydration failed: " + e.message); });
      }
    }
  }, 2000);

  // 6s check — show status banner
  setTimeout(function () {
    if (typeof state === "undefined") return;
    var appEl = document.getElementById("app");
    var rendered = appEl && appEl.innerHTML.length > 200;

    // Always show a status bar so user knows what mode we're in
    var banner = document.createElement("div");
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#070b11;color:#90a4bb;font-family:monospace;font-size:11px;padding:6px 12px;border-top:1px solid #333;display:flex;gap:16px;";
    banner.innerHTML = "<span>Source: <b style='color:" + (state.dataSource === "Demo" ? "#ff5a68" : "#0f0") + "'>" + state.dataSource + "</b></span>" +
      "<span>Sync: <b>" + state.syncLevel + "</b></span>" +
      "<span>Section: <b>" + state.currentSection + "</b></span>" +
      "<span>Rendered: <b>" + (rendered ? "YES" : "NO") + "</b></span>" +
      "<span>Renderers: <b>" + (window.__evicsRenderers ? Object.keys(window.__evicsRenderers).length : 0) + "</b></span>" +
      "<span>Products: <b>" + (typeof products !== "undefined" ? products.length : "?") + "</b></span>" +
      "<span>Viral: <b>" + (state.viralVideos ? state.viralVideos.length : 0) + "</b></span>";
    document.body.appendChild(banner);
  }, 6000);

  console.info("[EVICS boot-fix] Diagnostic version active.");
})();
