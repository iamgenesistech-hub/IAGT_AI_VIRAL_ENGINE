"use client";

import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { hasDownload } from "../../../lib/validation";

export function PublishPanel() {
  const { assets, publishNow } = useWorkspaceStore();
  const approvedAssets = assets.filter((asset) => asset.stage === "approved");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Publish</h2>
        <p className="text-sm text-slate-400">Only approved assets can be published.</p>
      </div>

      {approvedAssets.length ? (
        <div className="space-y-2">
          {approvedAssets.map((asset) => (
            <article key={asset.id} className="rounded border border-slate-800 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">{asset.title}</h3>
                  <p className="text-xs text-slate-400">{asset.stage}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => publishNow(asset.id)}>
                    Publish Now
                  </button>
                  {/* Download is hidden unless a real asset URL exists. */}
                  {hasDownload(asset) ? (
                    <a className="rounded bg-slate-800 px-4 py-2 text-sm text-white" href={asset.downloadUrl} download>
                      Download
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded border border-slate-800 p-3 text-sm text-slate-400">No approved assets.</p>
      )}
    </section>
  );
}

export default PublishPanel;
