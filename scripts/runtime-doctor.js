#!/usr/bin/env node

const DEFAULT_PORTS = [8081, 8080, 8082, 8083];

function parseArgs(argv) {
  const options = {
    baseUrl: String(process.env.EVICS_BASE_URL || "").trim(),
    resetAuth: false
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--reset-auth") options.resetAuth = true;
    else if (arg.startsWith("--base=")) options.baseUrl = String(arg.slice(7)).trim();
  }

  return options;
}

async function fetchJson(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timeoutId);
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, error: error.message || "fetch failed" };
  }
}

async function resolveBase(baseUrl) {
  if (baseUrl) {
    const preferred = baseUrl.replace(/\/$/, "");
    const status = await fetchJson(`${preferred}/status`);
    if (status.ok) return preferred;
  }

  for (const port of DEFAULT_PORTS) {
    const candidate = `http://localhost:${port}`;
    const status = await fetchJson(`${candidate}/status`);
    if (status.ok) return candidate;
  }

  return "";
}

function printLine(label, value) {
  console.log(`${label.padEnd(24)} ${value}`);
}

function providerSummary(label, preflight) {
  const ready = Boolean(preflight?.body?.preflight?.ready);
  const code = String(preflight?.body?.preflight?.errorCode || "");
  if (ready) return `${label}:ready`;
  return `${label}:blocked${code ? `(${code})` : ""}`;
}

async function main() {
  const options = parseArgs(process.argv);
  const base = await resolveBase(options.baseUrl);
  if (!base) {
    console.log("EVICS runtime doctor");
    console.log("No running EVICS API found on localhost ports 8081/8080/8082/8083.");
    console.log("Recommendation: start API using `npm run start:stable`.");
    process.exit(1);
  }

  const heygenPreflightPath = options.resetAuth
    ? "/api/render/heygen/preflight?resetAuth=1"
    : "/api/render/heygen/preflight";

  const [
    status,
    systemStatus,
    shopifyHealth,
    heygen,
    runway,
    kling
  ] = await Promise.all([
    fetchJson(`${base}/status`),
    fetchJson(`${base}/api/agents/system-status`),
    fetchJson(`${base}/api/shopify/app-health`),
    fetchJson(`${base}${heygenPreflightPath}`),
    fetchJson(`${base}/api/render/runway/preflight`),
    fetchJson(`${base}/api/render/kling/preflight`)
  ]);

  const recommendations = [];

  if (!status.ok) recommendations.push("API status is failing. Restart with npm run start:stable.");

  const shopifyReady = Boolean(shopifyHealth?.body?.health?.ready);
  if (!shopifyReady) {
    const missing = shopifyHealth?.body?.health?.missing || [];
    recommendations.push(`Shopify app not ready. Fill missing vars: ${missing.join(", ") || "unknown"}.`);
  }

  const providerStates = [
    providerSummary("heygen", heygen),
    providerSummary("runway", runway),
    providerSummary("kling", kling)
  ];

  const heygenCode = String(heygen?.body?.preflight?.errorCode || "");
  if (heygenCode === "PROVIDER_AUTH_FAILED") {
    recommendations.push("HeyGen credentials were rejected. Rotate HEYGEN_API_KEY and rerun doctor.");
  }

  const runwayReady = Boolean(runway?.body?.preflight?.ready);
  if (!runwayReady) {
    recommendations.push("Runway is not ready. Set RUNWAY_API_KEY in your environment.");
  }

  const pipeline = systemStatus?.body?.pipeline || {};
  const renderState = pipeline.byRenderState || {};

  console.log("EVICS runtime doctor");
  console.log("=".repeat(72));
  printLine("base", base);
  printLine("status", `${status.status}${status.ok ? " (ok)" : " (failed)"}`);
  printLine("shopify", shopifyReady ? "ready" : "not ready");
  printLine("providers", providerStates.join(" | "));
  printLine("render complete", String(renderState.complete || 0));
  printLine("render failed", String(renderState.failed || 0));
  printLine("rendering", String(renderState.rendering || 0));
  console.log("=".repeat(72));

  if (!recommendations.length) {
    console.log("No blocking runtime recommendations detected.");
    return;
  }

  console.log("Recommendations:");
  recommendations.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`);
  });
}

main().catch((error) => {
  console.error(`runtime-doctor failed: ${error.message || error}`);
  process.exit(1);
});
