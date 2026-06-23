"use client";

import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function LogsDrawer() {
  const { logs, logsOpen, toggleLogs } = useWorkspaceStore();
  if (!logsOpen || !logs.length) return null;

  return (
    <div className="fixed inset-0 z-20 bg-black/60">
      <aside className="ml-auto h-full w-full max-w-md overflow-auto border-l border-slate-800 bg-slate-950 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Logs</h2>
          <button type="button" className="rounded bg-slate-800 px-3 py-2 text-sm text-white" onClick={toggleLogs}>
            Close
          </button>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <article key={log.id} className="rounded border border-slate-800 p-3 text-sm">
              <p className={log.level === "error" ? "text-red-300" : "text-slate-200"}>{log.message}</p>
              <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default LogsDrawer;
