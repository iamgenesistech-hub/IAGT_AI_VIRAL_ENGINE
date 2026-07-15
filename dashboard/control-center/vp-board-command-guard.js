(function () {
  const MODE_KEY = "evics_vp_exec_mode";
  const AUTH_STORAGE_KEY = "evics_vp_last_authority_phrase";
  const ADMIN_PHRASES = [
    { key: "admin override", label: "Admin Override", pattern: /\badmin\s+override\b/i },
    { key: "admin command", label: "Admin Command", pattern: /\badmin(?:istrator)?\s+command\b/i },
    { key: "executive authority", label: "Executive Authority", pattern: /\bexecutive\s+authority\b/i },
    { key: "board command", label: "Board Command", pattern: /\bboard\s+command\b/i },
    { key: "vp authority", label: "VP Authority", pattern: /\bvp\s+authority\b/i }
  ];

  const macroCommands = [
    {
      id: "board-brief",
      label: "Board Brief",
      command: "board command board brief",
      note: "Executive status summary"
    },
    {
      id: "executive-workspace",
      label: "Open Board",
      command: "board command open executive workspace",
      note: "Board of Directors"
    },
    {
      id: "media-review",
      label: "Media Review",
      command: "board command open media review",
      note: "Review output assets"
    },
    {
      id: "quality-standards",
      label: "A+ Quality",
      command: "board command open analytics",
      note: "Validator and telemetry"
    },
    {
      id: "launch-mission",
      label: "Launch Mission",
      command: "admin override launch mission",
      note: "Autonomous VP mission"
    }
  ];

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getGlobalFunction(name) {
    try {
      if (typeof globalThis[name] === "function") return globalThis[name];
      return eval(`typeof ${name} === "function" ? ${name} : null`);
    } catch (e) {
      return null;
    }
  }

  function safePush(role, text, meta) {
    const pushFn = getGlobalFunction("pushVpMessage");
    if (pushFn) {
      pushFn(role, text, meta || {});
    }
  }

  function safeRender() {
    const renderFn = getGlobalFunction("render");
    if (renderFn) renderFn();
  }

  function safeSpeak(text) {
    const speakFn = getGlobalFunction("speakVpReply");
    if (speakFn) speakFn(text);
  }

  function setMode(mode) {
    const next = mode === "off" || mode === "responsive" ? mode : "on";
    localStorage.setItem(MODE_KEY, next);
    window.dispatchEvent(new CustomEvent("evics:vp-mode-changed", { detail: { mode: next } }));
    return next;
  }

  function readMode() {
    const value = String(localStorage.getItem(MODE_KEY) || "on").toLowerCase();
    return value === "off" || value === "responsive" ? value : "on";
  }

  function extractAuthority(text) {
    const raw = String(text || "");
    const found = ADMIN_PHRASES.find((entry) => entry.pattern.test(raw));
    if (!found) {
      return { authorized: false, phrase: null, cleanText: raw.trim() };
    }
    const cleanText = raw.replace(found.pattern, "").replace(/^\s*[:,;-]?\s*/, "").trim();
    try { localStorage.setItem(AUTH_STORAGE_KEY, found.label); } catch (e) { /* ignore storage */ }
    return { authorized: true, phrase: found.label, cleanText: cleanText || raw.trim() };
  }

  function isSensitiveCommand(text) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    return /^(open|go to|switch to|navigate to|run|execute|start|trigger|click|set|adjust|change)\b/.test(normalized)
      || /\b(board of directors|autonomous mission|launch mission|mission status|vp mode|mode on|mode off|mode responsive)\b/.test(normalized);
  }

  function modeCommand(text) {
    const normalized = normalizeText(text);
    if (!/\b(mode|vp mode)\b/.test(normalized)) return null;
    if (/\boff\b/.test(normalized)) return "off";
    if (/\bresponsive\b/.test(normalized)) return "responsive";
    if (/\bon\b/.test(normalized)) return "on";
    return null;
  }

  function sectionLabel(sectionId) {
    const st = globalThis.state || {};
    const sections = Array.isArray(globalThis.WORKSPACE_SECTIONS) ? globalThis.WORKSPACE_SECTIONS : [];
    const found = sections.find((section) => section.id === sectionId);
    return found ? found.label : (st.currentSection || sectionId || "Current Workspace");
  }

  function buildBoardBrief() {
    const st = globalThis.state || {};
    const mode = readMode().toUpperCase();
    const currentSection = sectionLabel(st.currentSection || "workspace");
    const mission = st.vpMission || null;
    const missionLine = mission
      ? `Mission ${mission.missionId || "active"}: ${mission.status || "running"}; approved ${Number(mission.approvedCount || 0)}, review ${Number(mission.reviewCount || 0)}, blocked ${Number(mission.blockedCount || 0)}.`
      : "No active VP mission is currently loaded in this workspace session.";
    const syncLine = st.syncMessage ? `System signal: ${st.syncMessage}` : "System signal: executive telemetry is available from the active workspace.";
    const qualityLine = st.qualityResult && st.qualityResult.grade
      ? `Latest quality grade: ${st.qualityResult.grade} at ${st.qualityResult.score || "unscored"}.`
      : "Latest quality grade: not yet validated in this panel.";

    return [
      `Board Brief: VP mode is ${mode}.`,
      `Current workspace: ${currentSection}.`,
      missionLine,
      qualityLine,
      syncLine,
      "Authority model: Admin voice commands require one of these phrases before execution: Admin Override, Executive Authority, Board Command, or VP Authority."
    ].join(" ");
  }

  function handleBoardMacro(cleanText) {
    const normalized = normalizeText(cleanText);
    if (/\b(board brief|brief board|brief the board|status brief|executive brief)\b/.test(normalized)) {
      return buildBoardBrief();
    }
    if (/\b(a\+ quality|quality standards|quality validator|telemetry)\b/.test(normalized)) {
      const setCurrentSection = getGlobalFunction("setCurrentSection");
      if (setCurrentSection) setCurrentSection("analytics");
      return "A+ Quality workspace opened. Review thresholds, score evidence, and telemetry before approving any render.";
    }
    if (/\b(media review|review media|output assets)\b/.test(normalized)) {
      const setCurrentSection = getGlobalFunction("setCurrentSection");
      if (setCurrentSection) setCurrentSection("media-output");
      const loadMediaOutputs = getGlobalFunction("loadMediaOutputs");
      if (loadMediaOutputs) loadMediaOutputs();
      return "Media Output Review opened. Use this space for final asset inspection, CTA confirmation, and approval control.";
    }
    return null;
  }

  function installStyles() {
    if (document.getElementById("vp-board-command-guard-styles")) return;
    const style = document.createElement("style");
    style.id = "vp-board-command-guard-styles";
    style.textContent = `
      .vp-board-macro-panel {
        display: grid;
        gap: 9px;
        padding: 10px;
        border: 1px solid rgba(247, 212, 122, 0.24);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(247, 212, 122, 0.07), rgba(0, 0, 0, 0.16));
      }
      .vp-board-macro-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        color: #f7d47a;
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .vp-board-macro-head small {
        color: #b8a67d;
        letter-spacing: 0;
        text-transform: none;
      }
      .vp-board-macro-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }
      .vp-board-macro-btn {
        display: grid;
        gap: 2px;
        min-height: 48px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(247, 212, 122, 0.27);
        background: rgba(0, 0, 0, 0.23);
        color: #f6df9e;
        text-align: left;
        cursor: pointer;
      }
      .vp-board-macro-btn strong {
        font-size: 12px;
        letter-spacing: 0.04em;
      }
      .vp-board-macro-btn small {
        color: #b9a783;
        font-size: 10px;
      }
      .vp-authority-note {
        color: #d8c59b;
        font-size: 11px;
        line-height: 1.4;
      }
      @media (max-width: 520px) {
        .vp-board-macro-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function installMacroPanel() {
    const shell = document.querySelector("#vp-assistant-shell");
    if (!shell || shell.querySelector("#vp-board-macro-panel")) return;

    const host = shell.querySelector(".vp-assistant-mission-card") || shell.querySelector(".vp-assistant-body");
    if (!host) return;

    const panel = document.createElement("div");
    panel.className = "vp-board-macro-panel";
    panel.id = "vp-board-macro-panel";
    panel.innerHTML = [
      '<div class="vp-board-macro-head"><span>Board Command Macros</span><small>Admin-gated</small></div>',
      '<div class="vp-board-macro-grid">',
      macroCommands.map((macro) => `
        <button class="vp-board-macro-btn" type="button" data-vp-board-macro="${macro.id}">
          <strong>${macro.label}</strong>
          <small>${macro.note}</small>
        </button>
      `).join(""),
      '</div>',
      '<div class="vp-authority-note">Voice authority phrases: <strong>Admin Override</strong>, <strong>Executive Authority</strong>, <strong>Board Command</strong>, or <strong>VP Authority</strong>.</div>'
    ].join("");

    const modePanel = shell.querySelector("#vp-mode-panel");
    if (modePanel && modePanel.parentNode) {
      modePanel.parentNode.insertBefore(panel, modePanel.nextSibling);
    } else {
      host.appendChild(panel);
    }

    panel.querySelectorAll("[data-vp-board-macro]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const macro = macroCommands.find((item) => item.id === btn.getAttribute("data-vp-board-macro"));
        if (!macro) return;
        const sendFn = getGlobalFunction("sendVpAssistantMessage");
        if (sendFn) sendFn(macro.command, { source: "board-macro" });
      });
    });
  }

  function installCommandGuard() {
    const original = getGlobalFunction("sendVpAssistantMessage");
    if (!original || original.__vpBoardGuardWrapped) return;

    const guarded = async function (message, options = {}) {
      const rawText = String(message || options.message || "").trim();
      if (!rawText) return original(message, options);

      const authority = extractAuthority(rawText);
      const cleanText = authority.cleanText || rawText;
      const requestedMode = modeCommand(cleanText);

      if (requestedMode) {
        if (!authority.authorized) {
          safePush("user", rawText, { source: options.source || "typed" });
          safePush("assistant", "For VP mode changes, say: Admin Override VP mode on, responsive, or off.");
          safeRender();
          return;
        }
        const nextMode = setMode(requestedMode);
        safePush("user", rawText, { source: options.source || "typed" });
        safePush("assistant", `Authority accepted (${authority.phrase}). VP mode is now ${nextMode.toUpperCase()}.`);
        if (nextMode === "on") safeSpeak(`VP mode is now ${nextMode}. Executive command link is active.`);
        safeRender();
        return;
      }

      const macroReply = authority.authorized ? handleBoardMacro(cleanText) : null;
      if (macroReply) {
        safePush("user", rawText, { source: options.source || "typed" });
        safePush("assistant", macroReply);
        if (readMode() === "on") safeSpeak(macroReply);
        safeRender();
        return;
      }

      if (isSensitiveCommand(cleanText) && !authority.authorized) {
        safePush("user", rawText, { source: options.source || "typed" });
        safePush("assistant", "Authority phrase required before I execute that command. Say: Admin Override, Executive Authority, Board Command, or VP Authority, followed by the command.");
        safeRender();
        return;
      }

      if (authority.authorized) {
        const nextOptions = Object.assign({}, options, {
          message: cleanText,
          authorityPhrase: authority.phrase,
          source: options.source || "authorized-voice"
        });
        return original(cleanText, nextOptions);
      }

      return original(message, options);
    };

    guarded.__vpBoardGuardWrapped = true;
    try { sendVpAssistantMessage = guarded; } catch (e) { /* lexical binding may be locked */ }
    globalThis.sendVpAssistantMessage = guarded;
  }

  function applyBoardGuardEnhancements() {
    installStyles();
    installCommandGuard();
    installMacroPanel();
  }

  function boot() {
    applyBoardGuardEnhancements();
    const root = document.getElementById("app");
    if (root) {
      const observer = new MutationObserver(() => applyBoardGuardEnhancements());
      observer.observe(root, { childList: true, subtree: true });
    }
    window.addEventListener("evics:vp-mode-changed", () => applyBoardGuardEnhancements());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
