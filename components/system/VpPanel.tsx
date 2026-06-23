"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface VpPanelProps {
  onClose: () => void;
}

export function VpPanel({ onClose }: VpPanelProps) {
  const { summary, scanner, setActiveStage, refreshMissionHandoffs, controlPlane } = useWorkspaceStore();
  const [directive, setDirective] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState("Ready. Use voice or type a directive.");
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    refreshMissionHandoffs();
  }, [refreshMissionHandoffs]);

  useEffect(() => {
    const api = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
    setRecognitionSupported(Boolean(api));
  }, []);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function applyDirective(rawDirective: string) {
    const command = rawDirective.trim();
    if (!command) return;

    const normalized = command.toLowerCase();
    let response = "Directive acknowledged. I can route command, scan, and workflow actions from this panel.";

    if (normalized.includes("scan")) {
      setActiveStage("scanners");
      response = "Opening scanner command center.";
    } else if (normalized.includes("command")) {
      setActiveStage("command");
      response = "Opening command center now.";
    } else if (normalized.includes("media") || normalized.includes("render")) {
      setActiveStage("media");
      response = "Opening media pipeline now.";
    } else if (normalized.includes("decision") || normalized.includes("review")) {
      setActiveStage("decisions");
      response = "Opening review and decision controls now.";
    } else if (normalized.includes("evidence")) {
      setActiveStage("evidence");
      response = "Opening evidence panel now.";
    } else if (normalized.includes("insight")) {
      setActiveStage("insights");
      response = "Opening insights stage now.";
    } else if (normalized.includes("legacy") || normalized.includes("classic")) {
      setActiveStage("command");
      response = "Legacy routing disabled. Staying in the master command workspace.";
    } else if (normalized.includes("strict") || normalized.includes("workflow")) {
      setActiveStage("media");
      response = "Opening master workflow stage.";
    } else if (normalized.includes("product") || normalized.includes("library") || normalized.includes("matching")) {
      setActiveStage("media");
      response = "Opening product-linked workflow stage.";
    } else if (normalized.includes("compliance")) {
      setActiveStage("decisions");
      response = "Opening compliance and decision controls.";
    } else if (normalized.includes("queue") || normalized.includes("publish")) {
      setActiveStage("decisions");
      response = "Opening publishing queue controls.";
    } else if (normalized.includes("connection") || normalized.includes("api")) {
      setActiveStage("scanners");
      response = "Opening system and scanner diagnostics.";
    }

    setLastResponse(response);
    speak(response);
  }

  function startListening() {
    const SpeechRecognitionApi =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
        : null;

    if (!SpeechRecognitionApi) {
      const response = "Voice recognition is not available in this browser. Use typed directives below.";
      setLastResponse(response);
      speak(response);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => {
      setIsListening(false);
      setLastResponse("Voice capture failed. Try again or use typed directives.");
    };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript || "";
      setDirective(text);
      applyDirective(text);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
    } finally {
      setIsListening(false);
    }
  }

  function runTypedDirective() {
    applyDirective(directive);
  }

  return (
    <aside className="fixed right-4 top-4 z-30 w-[min(92vw,28rem)] rounded-2xl border border-emerald-400/30 bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">VP Copilot</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Vice President of Marketing Intelligence</h2>
          <p className="mt-1 text-sm text-slate-300">Voice and directive command center.</p>
        </div>
        <button type="button" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white transition hover:border-slate-400" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <span className="text-xs uppercase tracking-wide text-slate-400">Scanner</span>
          <p className="mt-2 text-sm text-white">{String((controlPlane?.productIntelStatus as Record<string, unknown> | undefined)?.running ? "running" : scanner.status)}</p>
          <p className="text-xs text-slate-400">Health {scanner.summary?.healthScore ?? 100}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <span className="text-xs uppercase tracking-wide text-slate-400">Handoff Gate</span>
          <p className="mt-2 text-sm text-white">{Number((controlPlane?.handoffSummary as Record<string, unknown> | undefined)?.approved || 0)} approved</p>
          <p className="text-xs text-slate-400">{Number((controlPlane?.handoffSummary as Record<string, unknown> | undefined)?.blocked || 0)} blocked</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Pipeline</span>
          <p className="mt-2 text-sm text-white">{summary.drafts + summary.activeMedia} active items</p>
          <p className="text-xs text-slate-400">{summary.blocked} blocked / {summary.approved} approved</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100 transition hover:bg-emerald-500/25"
            onClick={startListening}
            disabled={isListening}
          >
            {isListening ? "Listening..." : "Start Voice"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-white transition hover:border-slate-400"
            onClick={stopListening}
            disabled={!isListening}
          >
            Stop Voice
          </button>
        </div>
        <div className="space-y-2">
          <input
            value={directive}
            onChange={(event) => setDirective(event.target.value)}
            placeholder="Type VP directive..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
          />
          <button type="button" className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-white transition hover:border-slate-400" onClick={runTypedDirective}>
            Run Directive
          </button>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
          {lastResponse}
        </div>
        <button type="button" className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-white transition hover:border-slate-400" onClick={() => setActiveStage("command")}>
          Open Command Center
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-400">
        Voice recognition support: {recognitionSupported ? "available" : "not available in this browser"}. For full legacy commands, open Classic EVICS Dashboard.
      </div>
    </aside>
  );
}

export default VpPanel;
