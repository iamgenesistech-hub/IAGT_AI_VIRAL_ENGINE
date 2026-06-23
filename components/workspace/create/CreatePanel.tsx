"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

export function CreatePanel() {
  const { selectedAsset, saveDraft, sendToRender } = useWorkspaceStore();
  const [title, setTitle] = useState(selectedAsset?.title || "");
  const [script, setScript] = useState(selectedAsset?.stage === "draft" ? selectedAsset.script : "");
  const canSubmit = Boolean(script.trim());

  useEffect(() => {
    if (selectedAsset?.stage === "draft" || selectedAsset?.stage === "rework_requested") {
      setTitle(selectedAsset.title);
      setScript(selectedAsset.script);
    }
  }, [selectedAsset?.id, selectedAsset?.script, selectedAsset?.stage, selectedAsset?.title]);

  function handleSendToRender() {
    if (!canSubmit) return;
    // If no draft exists, sendToRender creates one before moving it to queued.
    sendToRender({ title, script });
  }

  function handleSaveDraft() {
    if (!canSubmit) return;
    saveDraft({ title, script });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Create</h2>
        <p className="text-sm text-slate-400">Write the video script, save it as a draft, then send it to render.</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Title</span>
        <input
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Script</span>
        <textarea
          className="min-h-56 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          value={script}
          onChange={(event) => setScript(event.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <button type="button" className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!canSubmit} onClick={handleSaveDraft}>
          Save Draft
        </button>
        <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!canSubmit} onClick={handleSendToRender}>
          Send to Render
        </button>
      </div>
    </section>
  );
}

export default CreatePanel;
