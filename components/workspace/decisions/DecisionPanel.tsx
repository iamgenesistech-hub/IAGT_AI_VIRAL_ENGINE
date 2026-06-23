"use client";

import PublishPanel from "../publish/PublishPanel";
import ReviewPanel from "../review/ReviewPanel";

export function DecisionPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded border border-slate-800 p-4">
        <ReviewPanel />
      </div>
      <div className="rounded border border-slate-800 p-4">
        <PublishPanel />
      </div>
    </section>
  );
}

export default DecisionPanel;
