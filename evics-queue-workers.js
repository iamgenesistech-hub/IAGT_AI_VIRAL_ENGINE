const mediaOps = require("./media-ops");
const renderRouter = require("./render-provider-router");
const persistence = require("./evics-persistence");

function sourceIngestWorker(mediaId, actor = "trend-scout-agent") {
  const media = getMedia(mediaId);
  const sourceUrl = media.metadata_json?.sourceViralUrl || media.metadata_json?.source_viral_url || "";
  if (!sourceUrl) throw new Error("Source viral URL is required for source ingest.");
  const sourceQuality = evaluateSourceQuality(sourceUrl);
  const output = persistence.upsertRecord("prompt_compiler_outputs", {
    id: `source-${media.id}`,
    mediaId: media.id,
    lifecycle: "source_ingested",
    sourceUrl,
    sourceThumbnailUrl: media.metadata_json?.sourceViralThumbnail || "",
    sourceTitle: media.title,
    sourceScript: media.metadata_json?.sourceScript || media.description || media.title,
    origin_section_id: media.origin_section_id,
    metadata: {
      platform: media.metadata_json?.sourcePlatform || "manual_ingest",
      scrapeMode: sourceQuality.mode,
      sourceConfidence: sourceQuality.confidence,
      sourceSignals: sourceQuality.signals
    }
  });
  logWorkerEvent(actor, media.id, "source_ingested", "Source viral reference ingested.", { sourceUrl, compilerOutputId: output.id });
  return output;
}

function compilerWorker(mediaId, actor = "compiler-worker") {
  const media = getMedia(mediaId);
  const output = persistence.upsertRecord("prompt_compiler_outputs", {
    id: `compiler-${media.id}`,
    mediaId: media.id,
    lifecycle: "compiled",
    rankedScript: media.metadata_json?.script || media.description || media.title,
    rankedFormat: media.metadata_json?.format || "hook-problem-solution-cta",
    origin_section_id: media.origin_section_id,
    metadata: {
      title: media.title,
      productUrl: media.product_url,
      source: media.created_source
    }
  });
  mediaOps.updateRenderLifecycle(media.id, "queued", {
    message: "Compiler completed.",
    metadata: { renderJobLifecycle: "compiled", compilerOutputId: output.id }
  }, actor);
  logWorkerEvent(actor, media.id, "compiled", "Compiler output persisted.", { compilerOutputId: output.id });
  return output;
}

function productMatchWorker(mediaId, actor = "product-match-worker") {
  const media = getMedia(mediaId);
  const output = persistence.upsertRecord("prompt_compiler_outputs", {
    id: `match-${media.id}`,
    mediaId: media.id,
    lifecycle: "matched",
    productUrl: media.product_url,
    productSku: media.metadata_json?.productSku || media.metadata_json?.sku || "",
    origin_section_id: media.origin_section_id,
    metadata: {
      matched: Boolean(media.product_url),
      productName: media.metadata_json?.productName || "",
      productImageUrl: media.metadata_json?.productImageUrl || ""
    }
  });
  logWorkerEvent(actor, media.id, "matched", "Product matching completed.", { productUrl: media.product_url });
  return output;
}

function scriptWriterWorker(mediaId, actor = "script-writer-agent") {
  const media = getMedia(mediaId);
  const source = persistence.listRecords("prompt_compiler_outputs", (item) => item.id === `source-${media.id}`)[0] || {};
  const match = persistence.listRecords("prompt_compiler_outputs", (item) => item.id === `match-${media.id}`)[0] || {};
  const productName = match.metadata?.productName || media.metadata_json?.productName || media.title;
  const productImageUrl = match.metadata?.productImageUrl || media.metadata_json?.productImageUrl || "";
  const sourceScript = source.sourceScript || media.description || media.title;

  const displayScriptSeed = [
    `[0-5s] Hook: Stop scrolling, ${productName} belongs in your daily routine.`,
    `[5-12s] Proof: show the ${productName} mockup while narration explains the key benefit.`,
    `[12-20s] ${sourceScript}`,
    `[20-26s] Social proof and product close-up with brand-safe claims only.`,
    `[26-30s] CTA: click now to learn more and shop.`
  ].join(" ");
  const spokenScriptSeed = [
    `${productName} supports a stronger daily wellness routine.`,
    sourceScript,
    `Click now to learn more and shop ${productName}.`
  ].join(" ");
  const directorNotes = [
    `Use the source reference at ${source.sourceUrl || media.metadata_json?.sourceViralUrl || "source URL missing"} for pacing only.`,
    `Keep the ${productName} product mockup visible in the first five seconds, proof section, and CTA close.`,
    productImageUrl ? `Use this product mockup asset in HeyGen dev tools: ${productImageUrl}` : "Product mockup asset is required before render.",
    "Narration must only speak the spokenScript and never speak production directions."
  ];
  const optimized = optimizeScriptPasses({
    title: media.title,
    productName,
    displayScript: displayScriptSeed,
    spokenScript: spokenScriptSeed,
    sourceScript,
    productImageUrl
  });

  const output = persistence.upsertRecord("prompt_compiler_outputs", {
    id: `script-${media.id}`,
    mediaId: media.id,
    lifecycle: "script_written",
    displayScript: optimized.displayScript,
    spokenScript: optimized.spokenScript,
    directorNotes,
    origin_section_id: media.origin_section_id,
    metadata: {
      productName,
      productImageUrl,
      sourceUrl: source.sourceUrl || media.metadata_json?.sourceViralUrl || "",
      generationMode: "multi_pass_optimizer",
      optimizationPasses: optimized.passes,
      scriptQuality: optimized.quality
    }
  });

  mediaOps.updateMediaMetadata(media.id, {
    description: optimized.displayScript,
    metadata: {
      sourceScript,
      script: optimized.displayScript,
      spokenScript: optimized.spokenScript,
      directorNotes,
      sceneInstructions: directorNotes,
      productName,
      productImageUrl,
      sourceViralUrl: source.sourceUrl || media.metadata_json?.sourceViralUrl || "",
      sourceViralThumbnail: source.sourceThumbnailUrl || media.metadata_json?.sourceViralThumbnail || "",
      scriptQuality: optimized.quality,
      generationMode: "multi_pass_optimizer"
    },
    note: "Script writer output persisted."
  }, actor);

  logWorkerEvent(actor, media.id, "script_written", "Script writer output generated.", { compilerOutputId: output.id });
  return output;
}

function promptGenerationWorker(mediaId, actor = "prompt-generation-worker") {
  const media = getMedia(mediaId);
  const scriptOutput = persistence.listRecords("prompt_compiler_outputs", (item) => item.id === `script-${media.id}`)[0] || {};
  const prompt = [
    scriptOutput.spokenScript || media.metadata_json?.spokenScript || media.description || media.title,
    Array.isArray(scriptOutput.directorNotes) ? `HeyGen dev tools directions: ${scriptOutput.directorNotes.join(" ")}` : "",
    "Include product reveal, CTA timing, Buy Now timing in the final 8-10 seconds, product zoom-in, and product page link metadata.",
    media.product_url ? `Product URL: ${media.product_url}` : "Product URL: pending"
  ].join("\n\n");
  const output = persistence.upsertRecord("prompt_compiler_outputs", {
    id: `prompt-${media.id}`,
    mediaId: media.id,
    lifecycle: "prompt_generated",
    eliteScript: scriptOutput.displayScript || media.description || media.title,
    eliteVideoPrompt: prompt,
    origin_section_id: media.origin_section_id,
    metadata: {
      ctaWindowSeconds: 9,
      buyNowRequired: true,
      spokenScript: scriptOutput.spokenScript || media.metadata_json?.spokenScript || "",
      directorNotes: scriptOutput.directorNotes || media.metadata_json?.directorNotes || []
    }
  });
  logWorkerEvent(actor, media.id, "prompt_generated", "Elite video prompt generated.", { compilerOutputId: output.id });
  return output;
}

async function renderSubmissionWorker(mediaId, provider = "heygen", actor = "twin-agent") {
  const media = getMedia(mediaId);
  const compiled = persistence.listRecords("prompt_compiler_outputs", (item) => item.id === `prompt-${media.id}`)[0] || {};
  mediaOps.updateRenderLifecycle(media.id, "queued", {
    message: "Twin Agent accepted render submission.",
    originSectionId: media.origin_section_id,
    metadata: { renderJobLifecycle: "ready_for_compiler" }
  }, actor);
  const result = await renderRouter.submitRender(provider, {
    mediaId: media.id,
    originSectionId: media.origin_section_id,
    prompt: compiled.eliteVideoPrompt || media.description || media.title,
    spokenScript: compiled.metadata?.spokenScript || media.metadata_json?.spokenScript || media.description || media.title,
    renderDirectives: compiled.metadata?.directorNotes || media.metadata_json?.directorNotes || [],
    sceneInstructions: compiled.metadata?.directorNotes || media.metadata_json?.directorNotes || [],
    devToolsDirections: Array.isArray(compiled.metadata?.directorNotes) ? compiled.metadata.directorNotes.join(" ") : "",
    heygenDevToolsDirections: Array.isArray(compiled.metadata?.directorNotes) ? compiled.metadata.directorNotes.join(" ") : "",
    productName: media.metadata_json?.productName || "",
    productImageUrl: media.metadata_json?.productImageUrl || "",
    script: media.description || media.title
  }, actor);
  logWorkerEvent(actor, media.id, result.job?.lifecycle || result.status || "submitted_to_renderer", result.error || "Render submission worker completed.", { provider, renderJobId: result.job?.jobId });
  return result;
}

async function renderMonitoringWorker(actor = "twin-agent-monitor") {
  const jobs = await renderRouter.listRenderJobs();
  logWorkerEvent(actor, "", "provider_monitoring", `${jobs.length} render jobs inspected.`, { count: jobs.length });
  return jobs;
}

function deliveryWorker(mediaId, actor = "office-agent") {
  const media = getMedia(mediaId);
  if (media.render_status !== "complete") {
    logWorkerEvent(actor, media.id, "delivery_skipped", "Delivery waits for complete render status.", { renderStatus: media.render_status });
    return { delivered: false, reason: "not_complete" };
  }
  const delivery = media.delivery_destinations_json || {};
  logWorkerEvent(actor, media.id, media.delivery_status || "delivery_checked", "Office Agent verified delivery routing.", delivery);
  return { delivered: media.delivery_status === "delivered", delivery };
}

function reworkWorker(mediaId, reason = "Manual rework requested.", actor = "rework-worker") {
  const state = mediaOps.updateRenderLifecycle(mediaId, "rework", {
    message: reason,
    retryEligible: true,
    reworkEligible: true,
    metadata: { renderJobLifecycle: "rework" }
  }, actor);
  logWorkerEvent(actor, mediaId, "rework", reason);
  return state.media.find((item) => item.id === mediaId);
}

function getMedia(mediaId) {
  const media = mediaOps.readState().media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media asset not found.");
  return media;
}

function evaluateSourceQuality(url = "") {
  const value = String(url || "").trim();
  let confidence = 0.45;
  const signals = [];
  if (/^https?:\/\//i.test(value)) {
    confidence += 0.35;
    signals.push("absolute_url");
  }
  if (/tiktok|instagram|youtube|facebook|pinterest|x\.com|twitter/i.test(value)) {
    confidence += 0.2;
    signals.push("social_source");
  }
  return {
    mode: confidence >= 0.7 ? "live_source_ingest" : "source_url_ingest",
    confidence: Math.min(0.98, Number(confidence.toFixed(2))),
    signals
  };
}

function optimizeScriptPasses(input = {}) {
  const maxPasses = 3;
  let displayScript = String(input.displayScript || "").trim();
  let spokenScript = sanitizeSpokenScript(input.spokenScript || input.displayScript || "");
  let quality = scoreScriptQuality(displayScript, spokenScript);
  let pass = 1;

  while (pass < maxPasses && quality.score < 82) {
    const missing = quality.missing;
    if (missing.includes("hook")) {
      displayScript = `Hook instantly: if you want reliable daily support, ${input.productName} is built for consistency. ${displayScript}`;
    }
    if (missing.includes("cta")) {
      displayScript = `${displayScript} Final CTA: tap shop now and claim your ${input.productName} today.`;
    }
    if (missing.includes("proof")) {
      displayScript = `${displayScript} Show visual proof: close-up product handling, before-after context, and routine usage.`;
    }
    spokenScript = sanitizeSpokenScript([spokenScript, input.sourceScript, `Shop now to get ${input.productName} and start your daily routine.`].join(" "));
    if (spokenScript.split(/\s+/).filter(Boolean).length < 85) {
      spokenScript = `${spokenScript} Keep the message simple, benefits clear, and outcomes grounded in daily use with no exaggerated claims.`;
    }
    quality = scoreScriptQuality(displayScript, spokenScript);
    pass += 1;
  }

  return {
    displayScript: displayScript.replace(/\s+/g, " ").trim(),
    spokenScript: spokenScript.replace(/\s+/g, " ").trim(),
    quality: { ...quality, score: Number(quality.score.toFixed(1)) },
    passes: pass
  };
}

function sanitizeSpokenScript(value = "") {
  return String(value || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\b(Hook|Proof|CTA|Final CTA)\s*:/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreScriptQuality(displayScript = "", spokenScript = "") {
  const display = String(displayScript || "").toLowerCase();
  const spoken = String(spokenScript || "").toLowerCase();
  const spokenWords = spoken.split(/\s+/).filter(Boolean).length;
  const signals = {
    hook: /(stop scrolling|hook|attention|instantly|if you want)/.test(display),
    proof: /(proof|social proof|show|close-up|benefit)/.test(display),
    cta: /(shop now|buy now|learn more|order now|tap)/.test(display),
    spokenLength: spokenWords >= 85,
    complianceTone: !/(cure|treat|guaranteed|instant results)/.test(spoken)
  };
  const score = [
    signals.hook ? 20 : 0,
    signals.proof ? 20 : 0,
    signals.cta ? 20 : 0,
    signals.spokenLength ? 20 : 0,
    signals.complianceTone ? 20 : 0
  ].reduce((sum, value) => sum + value, 0);
  const missing = Object.entries(signals)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return { score, missing, spokenWords, signals };
}

function logWorkerEvent(actor, mediaId, lifecycle, message, metadata = {}) {
  return persistence.logAgentEvent({
    type: "queue_worker",
    actor,
    mediaId,
    lifecycle,
    status: lifecycle,
    message,
    metadata
  });
}

module.exports = {
  sourceIngestWorker,
  compilerWorker,
  productMatchWorker,
  scriptWriterWorker,
  promptGenerationWorker,
  renderSubmissionWorker,
  renderMonitoringWorker,
  deliveryWorker,
  reworkWorker
};
