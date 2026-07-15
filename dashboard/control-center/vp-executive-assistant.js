(function () {
  const MODE_KEY = "evics_vp_exec_mode";
  const LAUNCHER_X_KEY = "evics_vp_launcher_offset_x";
  const LAUNCHER_Y_KEY = "evics_vp_launcher_offset_y";

  const modeDetails = {
    on: "ON - Executive authority active for voice and direct command execution.",
    responsive: "RESPONSIVE - Listening and assisting on demand with controlled execution.",
    off: "OFF - Assistant actions paused until re-enabled by Admin."
  };

  function safeReadNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function readMode() {
    const raw = String(localStorage.getItem(MODE_KEY) || "on").toLowerCase();
    return raw === "off" || raw === "responsive" ? raw : "on";
  }

  function writeMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
  }

  function getSectionCatalog() {
    if (typeof WORKSPACE_SECTIONS !== "undefined" && Array.isArray(WORKSPACE_SECTIONS)) {
      return WORKSPACE_SECTIONS;
    }
    const buttons = Array.from(document.querySelectorAll("[data-section]"));
    return buttons.map((btn) => ({
      id: String(btn.dataset.section || ""),
      label: String(btn.textContent || "").trim()
    })).filter((s) => s.id);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function navigateToSection(phrase) {
    const normalized = normalizeText(phrase);
    if (!normalized) return null;

    if (normalized.includes("board") || normalized.includes("director") || normalized.includes("executive")) {
      if (typeof setCurrentSection === "function") setCurrentSection("executive-workspace");
      return "Executive Workspace opened for Board of Directors oversight.";
    }

    const sections = getSectionCatalog();
    const found = sections.find((section) => {
      const id = normalizeText(section.id);
      const label = normalizeText(section.label);
      return normalized.includes(id) || normalized.includes(label);
    });

    if (!found) return null;
    if (typeof setCurrentSection === "function") setCurrentSection(found.id);
    return `${found.label || found.id} workspace opened.`;
  }

  function tryRunFunctionByLabel(phrase) {
    const action = normalizeText(phrase).replace(/^(run|execute|start|trigger|click)\s+/, "").trim();
    if (!action) return null;

    const tokens = action.split(" ").filter((token) => token.length > 2);
    const controls = Array.from(document.querySelectorAll("#app button, #app [role='button']"));
    const candidate = controls.find((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest(".vp-assistant-shell")) return false;
      if (node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true") return false;
      const text = normalizeText(node.innerText || node.textContent || "");
      if (!text) return false;
      return tokens.every((token) => text.includes(token));
    });

    if (!candidate) return null;
    candidate.click();
    return `Executed: ${candidate.innerText.trim() || "requested function"}.`;
  }

  function tryAdjustSlider(message) {
    const match = normalizeText(message).match(/(?:set|adjust|change)\s+(.+?)\s+(?:to|at)\s+([0-9]{1,3})\b/);
    if (!match) return null;

    const metric = String(match[1] || "").trim();
    const value = Math.max(0, Math.min(100, Number(match[2])));
    if (!Number.isFinite(value)) return null;

    const tokens = metric.split(" ").filter((token) => token.length > 2);
    const sliders = Array.from(document.querySelectorAll("#app input[type='range']"));
    const target = sliders.find((slider) => {
      if (!(slider instanceof HTMLInputElement)) return false;
      const context = normalizeText([
        slider.id,
        slider.name,
        slider.getAttribute("data-quality-key"),
        slider.getAttribute("data-threshold-key"),
        slider.closest("label") ? slider.closest("label").innerText : "",
        slider.closest(".panel") ? slider.closest(".panel").innerText.slice(0, 220) : ""
      ].join(" "));
      return tokens.every((token) => context.includes(token));
    }) || sliders[0];

    if (!target || !(target instanceof HTMLInputElement)) return null;

    const min = Number(target.min || 0);
    const max = Number(target.max || 100);
    const clamped = Math.max(min, Math.min(max, value));
    target.value = String(clamped);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return `Adjusted ${metric || "current slider"} to ${Math.round(clamped)}.`;
  }

  function detectModeCommand(text) {
    const normalized = normalizeText(text);
    if (!normalized.includes("mode") && !normalized.startsWith("vp ")) return null;
    if (normalized.includes(" off")) return "off";
    if (normalized.includes(" responsive")) return "responsive";
    if (normalized.includes(" on")) return "on";
    return null;
  }

  function syncModeUi(shell) {
    const mode = readMode();
    shell.dataset.vpMode = mode;

    const status = shell.querySelector("#vp-mode-status");
    if (status) status.textContent = modeDetails[mode] || modeDetails.on;

    shell.querySelectorAll("[data-vp-mode-btn]").forEach((btn) => {
      const active = btn.getAttribute("data-vp-mode") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const off = mode === "off";
    const responsive = mode === "responsive";
    const textarea = shell.querySelector("#vp-assistant-input");
    const sendBtn = shell.querySelector("#vp-send-btn");
    const micBtn = shell.querySelector("#vp-mic-btn");
    const speakToggle = shell.querySelector("#vp-speak-toggle");

    if (textarea) textarea.disabled = off;
    if (sendBtn) sendBtn.disabled = off;
    if (micBtn) micBtn.disabled = off;

    if (speakToggle instanceof HTMLInputElement) {
      if (responsive) {
        speakToggle.checked = false;
        speakToggle.dispatchEvent(new Event("change", { bubbles: true }));
      }
      speakToggle.disabled = off;
    }
  }

  function ensureModeControls(shell) {
    if (shell.querySelector("#vp-mode-panel")) {
      syncModeUi(shell);
      return;
    }

    const host = shell.querySelector(".vp-assistant-mission-card");
    if (!host) return;

    const panel = document.createElement("div");
    panel.className = "vp-mode-panel";
    panel.id = "vp-mode-panel";
    panel.innerHTML = [
      '<div class="vp-mode-title">VP Communications Mode</div>',
      '<div class="vp-mode-options">',
      '<button class="vp-mode-btn" data-vp-mode-btn data-vp-mode="on" type="button"><i class="vp-mode-light"></i>On</button>',
      '<button class="vp-mode-btn" data-vp-mode-btn data-vp-mode="responsive" type="button"><i class="vp-mode-light"></i>Responsive</button>',
      '<button class="vp-mode-btn" data-vp-mode-btn data-vp-mode="off" type="button"><i class="vp-mode-light"></i>Off</button>',
      '</div>',
      '<div class="vp-mode-status" id="vp-mode-status"></div>'
    ].join("");

    host.appendChild(panel);

    panel.querySelectorAll("[data-vp-mode-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-vp-mode") || "on";
        writeMode(mode);
        syncModeUi(shell);
      });
    });

    syncModeUi(shell);
  }

  function decorateLauncher(launcher) {
    const button = launcher.querySelector("#vp-assistant-open-btn");
    if (!(button instanceof HTMLButtonElement)) return;

    if (!button.dataset.vpEnhanced) {
      button.dataset.vpEnhanced = "true";
      button.classList.add("vp-gold-emblem");
      button.innerHTML = [
        '<span class="vp-emblem-starburst" aria-hidden="true">',
        '<span class="vp-emblem-pyramid">',
        '<span class="vp-emblem-eye"></span>',
        '<span class="vp-emblem-letters">VP</span>',
        '</span>',
        '</span>',
        '<span class="vp-launcher-copy">',
        '<strong>VP COMMAND</strong>',
        '<small>Executive Link</small>',
        '</span>'
      ].join("");
    }
  }

  function clampOffset(x, y, width, height) {
    const maxX = Math.max(0, window.innerWidth - width - 10);
    const maxY = Math.max(0, window.innerHeight - height - 10);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }

  function setLauncherOffset(launcher, x, y, persist) {
    const rect = launcher.getBoundingClientRect();
    const clamped = clampOffset(x, y, rect.width || 220, rect.height || 64);
    launcher.style.setProperty("--vp-launcher-offset-x", `${clamped.x}px`);
    launcher.style.setProperty("--vp-launcher-offset-y", `${clamped.y}px`);
    launcher.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;

    if (persist) {
      localStorage.setItem(LAUNCHER_X_KEY, String(clamped.x));
      localStorage.setItem(LAUNCHER_Y_KEY, String(clamped.y));
      localStorage.setItem("evics_vp_assistant_offset_x", String(clamped.x));
      localStorage.setItem("evics_vp_assistant_offset_y", String(clamped.y));
      if (typeof setVpAssistantOffset === "function") {
        setVpAssistantOffset(clamped.x, clamped.y, { persist: true });
      }
    }
  }

  function bindLauncherDrag(launcher) {
    if (launcher.dataset.vpDragBound === "true") return;
    launcher.dataset.vpDragBound = "true";

    const button = launcher.querySelector("#vp-assistant-open-btn");
    if (!(button instanceof HTMLButtonElement)) return;

    const startOffsetX = safeReadNumber(LAUNCHER_X_KEY, 0);
    const startOffsetY = safeReadNumber(LAUNCHER_Y_KEY, 0);
    setLauncherOffset(launcher, startOffsetX, startOffsetY, false);

    let drag = null;

    button.addEventListener("pointerdown", (event) => {
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: safeReadNumber(LAUNCHER_X_KEY, 0),
        originY: safeReadNumber(LAUNCHER_Y_KEY, 0),
        moved: false
      };
      button.setPointerCapture(event.pointerId);
    });

    button.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
      setLauncherOffset(launcher, drag.originX + dx, drag.originY + dy, false);
    });

    button.addEventListener("pointerup", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setLauncherOffset(launcher, drag.originX + dx, drag.originY + dy, true);
      if (drag.moved) {
        event.preventDefault();
        event.stopPropagation();
      }
      drag = null;
      button.releasePointerCapture(event.pointerId);
    });
  }

  function bindPanelDrag(shell) {
    if (shell.dataset.vpTouchDragBound === "true") return;
    shell.dataset.vpTouchDragBound = "true";
    shell.classList.add("vp-executive-shell");

    const header = shell.querySelector("#vp-assistant-header");
    if (!(header instanceof HTMLElement)) return;

    let drag = null;

    header.addEventListener("pointerdown", (event) => {
      if ((event.target instanceof HTMLElement) && event.target.closest("button")) return;
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: safeReadNumber("evics_vp_assistant_offset_x", 0),
        originY: safeReadNumber("evics_vp_assistant_offset_y", 0)
      };
      header.setPointerCapture(event.pointerId);
    });

    header.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextX = drag.originX + dx;
      const nextY = drag.originY + dy;
      if (typeof setVpAssistantOffset === "function") {
        setVpAssistantOffset(nextX, nextY, { persist: false });
      } else {
        shell.style.setProperty("--vp-assistant-offset-x", `${nextX}px`);
        shell.style.setProperty("--vp-assistant-offset-y", `${nextY}px`);
      }
    });

    header.addEventListener("pointerup", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextX = drag.originX + dx;
      const nextY = drag.originY + dy;
      if (typeof setVpAssistantOffset === "function") {
        setVpAssistantOffset(nextX, nextY, { persist: true });
      } else {
        localStorage.setItem("evics_vp_assistant_offset_x", String(nextX));
        localStorage.setItem("evics_vp_assistant_offset_y", String(nextY));
      }
      drag = null;
      header.releasePointerCapture(event.pointerId);
    });
  }

  function enhanceSpeechVoiceProfile() {
    const globalFn = (typeof speakVpReply === "function" ? speakVpReply : globalThis.speakVpReply);
    if (typeof globalFn !== "function" || globalFn.__vpExecutiveWrapped) return;

    const wrapped = function (text) {
      if (!window.speechSynthesis || !text) return;
      const voices = window.speechSynthesis.getVoices() || [];
      const preferred = voices.find((voice) => /female|zira|samantha|ava|salli|aria|joanna|lucy|en-us/i.test(String(voice.name || "")));
      const utterance = new SpeechSynthesisUtterance(String(text));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    wrapped.__vpExecutiveWrapped = true;

    try { speakVpReply = wrapped; } catch (e) { /* lexical binding may be locked */ }
    globalThis.speakVpReply = wrapped;
  }

  function installCommandInterceptor() {
    const original = (typeof sendVpAssistantMessage === "function" ? sendVpAssistantMessage : globalThis.sendVpAssistantMessage);
    if (typeof original !== "function" || original.__vpExecutiveWrapped) return;

    const wrapped = async function (message, options = {}) {
      const text = String(message || options.message || "").trim();
      if (!text) return original(message, options);

      const mode = readMode();
      if (mode === "off") {
        if (typeof pushVpMessage === "function") {
          pushVpMessage("assistant", "VP is currently OFF. Switch to ON or RESPONSIVE to execute commands.");
        }
        if (typeof render === "function") render();
        return;
      }

      const modeFromVoice = detectModeCommand(text);
      if (modeFromVoice) {
        writeMode(modeFromVoice);
        if (typeof pushVpMessage === "function") {
          pushVpMessage("user", text, { source: options.source || "typed" });
          pushVpMessage("assistant", `VP mode set to ${modeFromVoice.toUpperCase()}. ${modeDetails[modeFromVoice]}`);
        }
        if (typeof render === "function") render();
        return;
      }

      let handledReply = null;

      if (/^(go to|open|switch to|navigate to)\b/i.test(text) || /board of directors/i.test(text)) {
        handledReply = navigateToSection(text);
      }

      if (!handledReply && /^(run|execute|start|trigger|click)\b/i.test(text)) {
        handledReply = tryRunFunctionByLabel(text);
      }

      if (!handledReply && /(set|adjust|change).+(to|at)\s+[0-9]{1,3}/i.test(text)) {
        handledReply = tryAdjustSlider(text);
      }

      if (handledReply) {
        if (typeof pushVpMessage === "function") {
          pushVpMessage("user", text, { source: options.source || "typed" });
          pushVpMessage("assistant", handledReply);
        }
        if (readMode() === "on" && typeof speakVpReply === "function") {
          speakVpReply(handledReply);
        }
        if (typeof render === "function") render();
        return;
      }

      return original(message, options);
    };

    wrapped.__vpExecutiveWrapped = true;

    try { sendVpAssistantMessage = wrapped; } catch (e) { /* lexical binding may be locked */ }
    globalThis.sendVpAssistantMessage = wrapped;
  }

  function applyEnhancements() {
    const launcher = document.querySelector(".vp-assistant-launcher");
    if (launcher) {
      decorateLauncher(launcher);
      bindLauncherDrag(launcher);
    }

    const shell = document.querySelector("#vp-assistant-shell");
    if (shell) {
      ensureModeControls(shell);
      bindPanelDrag(shell);
      syncModeUi(shell);
    }

    installCommandInterceptor();
    enhanceSpeechVoiceProfile();
  }

  function bootEnhancer() {
    applyEnhancements();

    const appRoot = document.getElementById("app");
    if (appRoot) {
      const observer = new MutationObserver(() => {
        applyEnhancements();
      });
      observer.observe(appRoot, { childList: true, subtree: true });
    }

    window.addEventListener("resize", () => {
      const launcher = document.querySelector(".vp-assistant-launcher");
      if (!launcher) return;
      setLauncherOffset(
        launcher,
        safeReadNumber(LAUNCHER_X_KEY, 0),
        safeReadNumber(LAUNCHER_Y_KEY, 0),
        false
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootEnhancer);
  } else {
    bootEnhancer();
  }
})();
