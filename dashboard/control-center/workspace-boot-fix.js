/**
 * EVICS Workspace Boot Fix
 * Loaded AFTER app.js — patches render to eliminate performance bottleneck
 * and prevent page from appearing stuck during boot.
 *
 * Root cause: The render wrapper calls __evicsOriginalRender() on every render,
 * which builds a full HTML template (~390KB of string concatenation) that is
 * NEVER USED. Its only purpose is to register window.__evicsRenderers on the
 * first call. After that, subsequent calls just waste CPU and block the main
 * thread, making the page appear unresponsive.
 */
(function () {
  "use strict";

  // By the time this script loads, app.js has already:
  // 1. Defined the render wrapper (which calls __evicsOriginalRender)
  // 2. Called boot() which called render() once (registering __evicsRenderers)
  // So window.__evicsRenderers is already populated.

  if (typeof render !== "function" || typeof renderWorkspaceShell !== "function") {
    console.warn("[EVICS boot-fix] render or renderWorkspaceShell not found — skipping patch.");
    return;
  }

  if (typeof bindEvents !== "function") {
    console.warn("[EVICS boot-fix] bindEvents not found — skipping patch.");
    return;
  }

  // Debounce: coalesce rapid render() calls into a single rAF pass
  var pendingRender = false;
  var immediateRenderCount = 0;
  var lastRenderTime = 0;
  var DEBOUNCE_MS = 16; // one frame

  function doRender() {
    pendingRender = false;
    immediateRenderCount = 0;
    var result = "";
    try {
      // Ensure renderers are registered (only needed if somehow cleared)
      if (!window.__evicsRenderers && typeof window.__evicsOriginalRenderRef === "function") {
        window.__evicsOriginalRenderRef();
      }
      result = renderWorkspaceShell();
      var app = document.getElementById("app");
      if (app && typeof result === "string" && result.length > 0) {
        app.innerHTML = result;
        if (typeof registerExecControls === "function") registerExecControls(app);
        if (typeof bindExecControlLiveStates === "function") bindExecControlLiveStates(app);
        var splash = document.getElementById("evics-boot-splash");
        if (splash) splash.style.display = "none";
      }
    } catch (err) {
      console.error("[EVICS] Render error:", err);
      // Attempt to show something even on error
      var fallbackApp = document.getElementById("app");
      if (fallbackApp && fallbackApp.innerHTML.length === 0) {
        fallbackApp.innerHTML = '<div style="padding:40px;color:#eff5fb"><h2>Workspace render error</h2><p>Please reload the page (Ctrl+Shift+R).</p></div>';
      }
    }
    try {
      bindEvents();
    } catch (e) {
      console.error("[EVICS] bindEvents error:", e);
    }
    // Media output center binding
    try {
      if (
        (state.currentSection === "media-output" ||
          state.currentSection === "video-generation" ||
          state.currentSection === "executive-workspace") &&
        typeof window.bindMediaOutputCenter === "function"
      ) {
        window.bindMediaOutputCenter();
      }
    } catch (e) { /* non-fatal */ }
    lastRenderTime = Date.now();
  }

  // Save reference to original render for emergency re-registration
  if (typeof window.__evicsOriginalRenderRef === "undefined") {
    // The current render variable holds our wrapper; reach through closure if possible
    // We stored the original in __evicsOriginalRender (lexical) — expose it
    try {
      // Trigger one render to ensure renderers are set, then patch
      if (!window.__evicsRenderers) {
        render();
      }
    } catch (e) { /* already registered or will be */ }
  }

  // Replace render with optimized version
  render = function optimizedRender() {
    var now = Date.now();
    var elapsed = now - lastRenderTime;

    // Allow immediate render if enough time has passed
    if (elapsed >= DEBOUNCE_MS || immediateRenderCount === 0) {
      immediateRenderCount++;
      doRender();
      return;
    }

    // Otherwise debounce via rAF
    if (!pendingRender) {
      pendingRender = true;
      requestAnimationFrame(doRender);
    }
  };

  // Force one immediate render to ensure the current state is displayed
  // (boot() may have already set state.dataSource = "Shopify + Supabase")
  setTimeout(function () {
    try {
      immediateRenderCount = 0;
      lastRenderTime = 0;
      doRender();
    } catch (e) {
      console.error("[EVICS boot-fix] Post-patch render failed:", e);
    }
  }, 100);

  console.info("[EVICS boot-fix] Render optimized — skipping redundant __evicsOriginalRender calls.");
})();
