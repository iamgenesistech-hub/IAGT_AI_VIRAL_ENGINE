"use client";

import CreatePanel from "../create/CreatePanel";
import RenderPanel from "../render/RenderPanel";

export function MediaPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <div className="rounded border border-slate-800 p-4">
        <CreatePanel />
      </div>
      <div className="rounded border border-slate-800 p-4">
        <RenderPanel />
      </div>
    </section>
  );
}

export default MediaPanel;
