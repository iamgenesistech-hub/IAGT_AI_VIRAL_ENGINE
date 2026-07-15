(function () {
  const QUALITY_THRESHOLD_STORAGE_KEY = "evics_quality_thresholds";

  function clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  if (typeof window.loadPersistedQualityThresholds !== "function") {
    window.loadPersistedQualityThresholds = function loadPersistedQualityThresholds() {
      const appState = window.state;
      if (!appState || !appState.qualityThresholds) return;
      if (window.__evicsQualityThresholdsLoaded) return;
      window.__evicsQualityThresholdsLoaded = true;

      try {
        const raw = localStorage.getItem(QUALITY_THRESHOLD_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;

        Object.keys(appState.qualityThresholds).forEach((key) => {
          const clamped = clampScore(parsed[key]);
          if (clamped !== null) appState.qualityThresholds[key] = clamped;
        });
      } catch (error) {
        console.warn("[EVICS] Ignoring malformed persisted quality thresholds.", error);
      }
    };
  }

  if (typeof window.persistQualityThresholds !== "function") {
    window.persistQualityThresholds = function persistQualityThresholds() {
      const appState = window.state;
      if (!appState || !appState.qualityThresholds) return;
      try {
        localStorage.setItem(QUALITY_THRESHOLD_STORAGE_KEY, JSON.stringify(appState.qualityThresholds));
      } catch (error) {
        console.warn("[EVICS] Unable to persist quality thresholds.", error);
      }
    };
  }
})();
