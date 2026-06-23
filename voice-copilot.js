// EVICS directive copilot.
// This file intentionally keeps the UI simple: speak or type a command, then execute real app actions.

const voiceState = {
  isListening: false,
  isSpeaking: false,
  isExecuting: false,
  transcript: "",
  lastResponse: "Ready. Speak or type a directive.",
  lastTask: null,
  errorMessage: "",
  selectedVoice: null,
  recognitionSupported: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  synthesisSupported: Boolean(window.speechSynthesis)
};

window.voiceState = voiceState;

const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = voiceState.recognitionSupported ? new SpeechRecognitionApi() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    voiceState.isListening = true;
    voiceState.transcript = "Listening for directive...";
    voiceState.errorMessage = "";
    updateVoiceUI();
  };

  recognition.onresult = (event) => {
    voiceState.transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      voiceState.transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        handleVoiceCommand(voiceState.transcript.trim());
      }
    }
    updateVoiceUI();
  };

  recognition.onerror = (event) => {
    voiceState.errorMessage = event.error === "no-speech" ? "No directive detected. Speak clearly or type the directive." : event.error;
    voiceState.isListening = false;
    updateVoiceUI();
  };

  recognition.onend = () => {
    voiceState.isListening = false;
    updateVoiceUI();
  };
}

function startVoiceCapture() {
  if (!voiceState.recognitionSupported || !recognition) {
    voiceState.errorMessage = "Voice recognition is not available in this browser. Type the directive instead.";
    updateVoiceUI();
    return;
  }

  voiceState.errorMessage = "";
  voiceState.transcript = "";
  recognition.start();
}

function stopVoiceCapture() {
  if (recognition) {
    recognition.stop();
  }
  voiceState.isListening = false;
  updateVoiceUI();
}

async function handleVoiceCommand(text) {
  const command = String(text || "").trim();
  if (!command) return;

  voiceState.transcript = command;
  voiceState.lastResponse = "Executing: " + command;
  voiceState.errorMessage = "";
  voiceState.isExecuting = true;
  updateVoiceUI();

  try {
    const response = await executeDirective(command);
    voiceState.lastResponse = response;
    speakResponse(response);
  } catch (error) {
    console.error("Directive execution failed:", error);
    voiceState.lastResponse = "I could not complete that directive. I stopped before making an unsafe or incomplete change.";
    voiceState.errorMessage = "Directive could not be completed.";
    speakResponse(voiceState.lastResponse);
  } finally {
    voiceState.isExecuting = false;
    updateVoiceUI();
  }
}

async function executeDirective(text) {
  const lower = text.toLowerCase();
  const actions = window.evicsActions;
  const backendTask = await createBackendTask(text);

  if (!actions) {
    return "EVICS is still loading. Wait one moment, then give the directive again.";
  }

  if (hasAny(lower, ["office agent", "twin agent", "run the system", "run itself", "beginning to end", "hands on", "continuous bot", "bot mode"])) {
    const continuous = hasAny(lower, ["continuous", "continual", "keep running", "stay active", "always on"]);
    const response = await fetch(continuous ? "/api/agents/office-continuous" : "/api/agents/office-run", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        enabled: continuous,
        continuous,
        directive: text,
        mode: continuous ? "Continuous" : "Manual",
        intervalMinutes: 60,
        maxProducts: 5
      })
    });
    const payload = await response.json();
    if (!payload.success) {
      return payload.error || "The Office Agent could not complete the directive.";
    }
    if (continuous) {
      return "Continuous Office Agent mode is active. EVICS will keep running the workflow on the configured interval while the server is running.";
    }
    return withTaskProof(`Office Agent run completed. ${payload.generated || 0} concepts were generated from ${payload.products || 0} products. ${payload.exceptions?.length || 0} review items need attention.`, backendTask);
  }

  if (hasAny(lower, ["owner ai", "openai directives", "open ai directives", "engineering directives", "codex directives", "engineering command"])) {
    window.location.href = "/owner-ai";
    return withTaskProof("Opening the owner-only OpenAI engineering directive center now.", backendTask);
  }

  if (hasAny(lower, ["vault", "secret", "password", "keys"])) {
    window.location.href = "/secret-vault";
    return withTaskProof("Opening the protected Secret Vault now.", backendTask);
  }

  if (hasAny(lower, ["status", "report", "evidence", "functional", "connected"])) {
    await actions.refreshEvidence();
    actions.navigate("command");
    const status = actions.getStatus();
    return withTaskProof(`Status complete. Shopify is ${connected(status.shopifyConfigured)}, Supabase is ${connected(status.supabaseConfigured)}, ${status.syncedProductCount || status.products} products are loaded, ${status.selectedProducts} products are selected, and ${status.approved} concepts are approved.`, backendTask);
  }

  if (hasAny(lower, ["sync", "load inventory", "load products", "shopify products", "refresh products"])) {
    actions.navigate("matching");
    await actions.syncProducts();
    await actions.refreshEvidence();
    const status = actions.getStatus();
    return withTaskProof(`Shopify sync completed. ${status.syncedProductCount || status.products} products are available in Product Library.`, backendTask);
  }

  if (lower.includes("select") && hasAny(lower, ["top", "best", "products", "performers"])) {
    actions.navigate("matching");
    actions.selectTopProducts(hasAny(lower, ["six", "6"]) ? 6 : 5);
    const status = actions.getStatus();
    return withTaskProof(`${status.selectedProducts} top products selected and ready for generation.`, backendTask);
  }

  if (hasAny(lower, ["generate", "create ads", "make ads", "build ads", "campaign", "ad concepts"])) {
    const before = actions.getStatus();
    if (!before.selectedProducts) {
      actions.selectTopProducts(5);
    }
    actions.navigate("command");
    await actions.generateAds();
    actions.navigate("export");
    const status = actions.getStatus();
    return withTaskProof(`Generation completed. EVICS created ${status.creatives} campaign concepts and routed them into strict pipeline media drafts. Continue through Render, Review, and Publish.`, backendTask);
  }

  if (hasAny(lower, ["automation", "autopilot", "daily workflow", "run workflow", "full workflow"])) {
    actions.navigate("command");
    await actions.runAutopilot();
    const status = actions.getStatus();
    return withTaskProof(`Daily workflow completed. ${status.selectedProducts} products are selected and ${status.creatives} campaign concepts are available.`, backendTask);
  }

  if (lower.includes("download")) {
    actions.navigate("export");
    actions.downloadApprovedPack();
    return withTaskProof("Approved campaign package download has been started.", backendTask);
  }

  if (lower.includes("export")) {
    actions.navigate("export");
    actions.exportApprovedPack();
    return withTaskProof("Approved campaign export has been prepared.", backendTask);
  }

  if (hasAny(lower, ["schedule", "publish"])) {
    window.location.href = "/workspace.html";
    return withTaskProof("Opening the strict workflow. Publish is available only after media has completed Render, Review, and approval.", backendTask);
  }

  if (hasAny(lower, ["connection", "api", "service", "integrations"])) {
    await actions.refreshEvidence();
    actions.navigate("connections");
    return withTaskProof("API Connections refreshed. Connected and missing services are shown without exposing private keys.", backendTask);
  }

  if (hasAny(lower, ["seed media", "proof outputs", "seed proof", "demo videos"])) {
    actions.navigate("media");
    await actions.seedMediaOutputs();
    return withTaskProof("Media proof outputs have been seeded in the Media Output Center with playback evidence, Buy Now routing, scanner visibility, and archive lifecycle data.", backendTask);
  }

  if (hasAny(lower, ["create video", "make video", "generate video", "video output", "media output"])) {
    actions.navigate("media");
    await actions.createMediaOutput("copilot");
    return withTaskProof("Video output created in the Media Output Center from the selected Shopify product. It now has EVICS playback evidence and product Buy Now routing where a product link is available.", backendTask);
  }

  if (hasAny(lower, ["render heygen", "heygen video", "submit render", "render video"])) {
    actions.navigate("media");
    const mediaId = actions.getStatus().selectedMediaId || "";
    await actions.submitRenderJob("heygen", mediaId);
    return withTaskProof("HeyGen render job submitted. EVICS will not mark it complete until a provider media URL is returned.", backendTask);
  }

  if (hasAny(lower, ["scan media", "run scanner", "media scanner", "scan outputs"])) {
    actions.navigate("media");
    await actions.runMediaScanner();
    return withTaskProof("Media scanner completed. Findings and audit events are updated in the Media Output Center.", backendTask);
  }

  if (hasAny(lower, ["archive media", "archive video", "send to google", "google archive"])) {
    actions.navigate("media");
    await actions.archiveSelectedMedia();
    return withTaskProof("Selected media archive action completed. If the output is a video, EVICS updated its archive lifecycle and playback route.", backendTask);
  }

  if (hasAny(lower, ["brand", "profile", "logo", "founder story"])) {
    actions.navigate("brand-settings");
    return withTaskProof("Brand Settings opened for profile, logo, claims, voice, and founder story updates.", backendTask);
  }

  if (hasAny(lower, ["compliance", "claims", "disclaimer", "risk", "review"])) {
    actions.navigate("compliance");
    return withTaskProof("Compliance Review opened for claim safety and disclaimer review.", backendTask);
  }

  if (lower.includes("queue")) {
    actions.navigate("queue");
    return withTaskProof("Strict media draft queue opened. Publishing is locked until Create, Render, Review, and approval are complete.", backendTask);
  }

  if (lower.includes("product")) {
    actions.navigate("matching");
    return withTaskProof("Product Library opened.", backendTask);
  }

  if (hasAny(lower, ["video", "render"])) {
    actions.navigate("media");
    return withTaskProof("Media Output Center opened. Use create video, seed proof outputs, run scanner, or archive media to execute media operations.", backendTask);
  }

  actions.navigate("command");
  return withTaskProof("Directive received. I need a more direct command to execute. Try: sync Shopify products, select top products, generate ads, create video output, submit render, show status, open brand settings, or open the vault.", backendTask);
}

async function createBackendTask(command) {
  try {
    const response = await fetch("/api/agents/command", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ command, source: "vp" })
    });
    const payload = await response.json();
    voiceState.lastTask = payload.success ? payload.task : null;
    updateVoiceUI();
    return voiceState.lastTask;
  } catch (error) {
    console.warn("Backend agent task could not be created.", error);
    return null;
  }
}

function withTaskProof(message, task) {
  if (!task?.taskId) return message;
  return `${message} Backend task ${task.taskId} is ${task.currentStatus}.`;
}

function renderTaskStatus(task) {
  if (!task) return `<div class="vp-task-empty">Backend task log ready.</div>`;
  const logs = Array.isArray(task.stepLogs) ? task.stepLogs : [];
  const lastLog = logs.length ? logs[logs.length - 1] : null;
  return `
    <div class="vp-task-card">
      <div class="vp-task-line"><strong>${escapeCommand(task.currentStatus || "created")}</strong><span>${escapeCommand(task.assignedModule || "EVICS")}</span></div>
      <small>${escapeCommand(task.taskId || "")}</small>
      <p>${escapeCommand(lastLog?.detail || "Task recorded.")}</p>
    </div>
  `;
}

function speakResponse(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    let selectedVoice = voices.find((voice) => voice.name.includes("Google") && voice.lang.startsWith("en"));
    if (!selectedVoice) selectedVoice = voices.find((voice) => voice.name.includes("Neural") && voice.lang.startsWith("en"));
    if (!selectedVoice) selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      voiceState.selectedVoice = selectedVoice.name;
    }
  }

  utterance.onstart = () => {
    voiceState.isSpeaking = true;
    updateVoiceUI();
  };

  utterance.onend = () => {
    voiceState.isSpeaking = false;
    updateVoiceUI();
  };

  utterance.onerror = () => {
    voiceState.isSpeaking = false;
    voiceState.errorMessage = "";
    updateVoiceUI();
  };

  window.speechSynthesis.speak(utterance);
}

function updateVoiceUI() {
  const voicePanel = document.querySelector(".copilot-panel");
  if (!voicePanel) return;

  const statusClass = voiceState.isListening ? "listening" : voiceState.isExecuting ? "executing" : voiceState.isSpeaking ? "speaking" : "ready";
  voicePanel.className = "copilot-panel " + statusClass;

  const statusEl = voicePanel.querySelector("[data-voice-status]");
  if (statusEl) {
    statusEl.textContent = voiceState.isListening ? "Listening" : voiceState.isExecuting ? "Executing" : voiceState.isSpeaking ? "Responding" : "Ready";
  }

  const transcriptEl = voicePanel.querySelector(".voice-transcript");
  if (transcriptEl) {
    transcriptEl.textContent = voiceState.lastResponse || voiceState.transcript || "Ready for your directive.";
  }

  const micButton = voicePanel.querySelector("[data-voice-mic]");
  if (micButton) {
    micButton.className = "voice-button " + (voiceState.isListening ? "active" : "");
    micButton.textContent = voiceState.isListening ? "Stop" : "Speak";
  }

  const errorEl = voicePanel.querySelector(".voice-error");
  if (errorEl) {
    errorEl.textContent = voiceState.errorMessage || "";
  }

  const taskEl = voicePanel.querySelector("[data-vp-task]");
  if (taskEl) {
    taskEl.innerHTML = renderTaskStatus(voiceState.lastTask);
  }
}

function renderVoiceCopilot() {
  const recognitionSupported = voiceState.recognitionSupported;

  return `
    <div class="copilot-panel">
      <div class="copilot-header">
        <div class="copilot-title">
          <span class="copilot-icon">VP</span>
          <div>
            <h3>EVICS Directive Control</h3>
            <p><span data-voice-status>Ready</span></p>
          </div>
        </div>
        <div class="copilot-controls">
          ${recognitionSupported ? `<button class="voice-button" data-voice-mic title="Speak directive">Speak</button>` : ""}
          <button class="close-button" data-close-copilot title="Close">X</button>
        </div>
      </div>

      <div class="directive-input-row">
        <input data-voice-text placeholder="Type directive..." autocomplete="off" />
        <button class="primary compact-action" data-voice-submit>Run</button>
      </div>

      <div class="voice-commands">
        ${[
          "Show system status",
          "Sync Shopify products",
          "Select top products",
          "Generate ads",
          "Create video output",
          "Render HeyGen video",
          "Run media scanner",
          "Run Office Agent",
          "Open vault"
        ].map((command) => `<button class="voice-command-btn" data-voice-command="${escapeCommand(command)}">${command}</button>`).join("")}
      </div>

      <div class="voice-transcript">${voiceState.lastResponse}</div>
      <div class="vp-task-status" data-vp-task>${renderTaskStatus(voiceState.lastTask)}</div>
      <div class="voice-error"></div>
    </div>
  `;
}

function hasAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function connected(value) {
  return value ? "connected" : "not connected";
}

function escapeCommand(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.handleVoiceCommand = handleVoiceCommand;
window.startVoiceCapture = startVoiceCapture;
window.stopVoiceCapture = stopVoiceCapture;
window.renderVoiceCopilot = renderVoiceCopilot;
