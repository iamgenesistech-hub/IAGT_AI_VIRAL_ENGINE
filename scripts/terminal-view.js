#!/usr/bin/env node

const DEFAULT_PORTS = [8080, 8081, 8082, 8083];
const DEFAULT_INTERVAL_SECONDS = 4;

function parseArgs(argv) {
  const args = {
    watch: false,
    once: false,
    intervalSeconds: DEFAULT_INTERVAL_SECONDS,
    baseUrl: process.env.EVICS_BASE_URL || ""
  };

  for (const part of argv.slice(2)) {
    if (part === "--watch") args.watch = true;
    else if (part === "--once") args.once = true;
    else if (part.startsWith("--interval=")) {
      const raw = Number(part.split("=")[1]);
      if (Number.isFinite(raw) && raw > 0) args.intervalSeconds = raw;
    } else if (part.startsWith("--base=")) {
      args.baseUrl = String(part.split("=")[1] || "").trim();
    }
  }

  if (!args.watch && !args.once) args.watch = true;
  if (args.once) args.watch = false;
  return args;
}

async function fetchJson(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timeoutId);
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { ok: response.ok, status: response.status, body: json };
  } catch (error) {
    return { ok: false, status: 0, error: error.message || "fetch failed" };
  }
}

async function resolveBaseUrl(preferredBase) {
  if (preferredBase) {
    const candidate = preferredBase.replace(/\/$/, "");
    const status = await fetchJson(`${candidate}/status`);
    if (status.ok) return candidate;
  }

  for (const port of DEFAULT_PORTS) {
    const candidate = `http://localhost:${port}`;
    const status = await fetchJson(`${candidate}/status`);
    if (status.ok) return candidate;
  }

  return "";
}

function formatProviders(systemStatusBody) {
  const providers = Array.isArray(systemStatusBody?.providers) ? systemStatusBody.providers : [];
  if (!providers.length) return "none";

  return providers
    .map((item) => {
      const provider = String(item.provider || "unknown");
      if (item.ready) return `${provider}:ready`;
      const code = String(item.errorCode || item.error || "blocked");
      return `${provider}:blocked(${code})`;
    })
    .join(" | ");
}

function formatPipeline(systemStatusBody) {
  const pipeline = systemStatusBody?.pipeline || {};
  const total = Number(pipeline.totalMedia || 0);
  const render = pipeline.byRenderState || {};

  return [
    `totalMedia=${total}`,
    `renderComplete=${Number(render.complete || 0)}`,
    `renderFailed=${Number(render.failed || 0)}`,
    `rendering=${Number(render.rendering || 0)}`
  ].join(" | ");
}

function formatJobSummary(systemStatusBody) {
  const jobs = systemStatusBody?.jobs || {};
  const failed = Array.isArray(jobs.failed) ? jobs.failed : [];
  if (!failed.length) return "no failed jobs";

  const latest = failed[0] || {};
  const provider = String(latest.provider || "unknown");
  const error = String(latest.error || latest.status || "error");
  return `latestFailed=${provider} :: ${error}`;
}

function printDashboard(snapshot) {
  const line = "-".repeat(88);
  console.log(line);
  console.log("EVICS TERMINAL VIEW");
  console.log(`time=${new Date().toISOString()}`);
  console.log(`base=${snapshot.baseUrl || "unavailable"}`);

  if (!snapshot.status.ok) {
    console.log(`status=offline (${snapshot.status.error || snapshot.status.status || "unknown"})`);
    console.log("tip=start the API with `npm run start` and rerun this dashboard");
    console.log(line);
    return;
  }

  const body = snapshot.status.body || {};
  console.log(`status=online (${snapshot.status.status})`);
  console.log(`shopifyConfigured=${Boolean(body.shopifyConfigured)} | supabaseConfigured=${Boolean(body.supabaseConfigured)}`);
  console.log(`store=${String(body.shopifyStoreDomain || "unset")}`);

  if (!snapshot.system.ok) {
    console.log(`systemStatus=unavailable (${snapshot.system.error || snapshot.system.status || "unknown"})`);
    console.log(line);
    return;
  }

  console.log(`providers=${formatProviders(snapshot.system.body)}`);
  console.log(`pipeline=${formatPipeline(snapshot.system.body)}`);
  console.log(`jobs=${formatJobSummary(snapshot.system.body)}`);

  if (snapshot.health.ok) {
    const health = snapshot.health.body?.health || {};
    console.log(`shopifyAppReady=${Boolean(health.ready)} | missing=${Array.isArray(health.missing) ? health.missing.length : 0}`);
  } else {
    console.log(`shopifyAppReady=unknown (${snapshot.health.status || snapshot.health.error || "unavailable"})`);
  }

  console.log(line);
}

async function readSnapshot(baseUrl) {
  const status = await fetchJson(`${baseUrl}/status`);
  const system = status.ok ? await fetchJson(`${baseUrl}/api/agents/system-status`) : { ok: false, status: 0, error: "status unavailable" };
  const health = status.ok ? await fetchJson(`${baseUrl}/api/shopify/app-health`) : { ok: false, status: 0, error: "status unavailable" };

  return {
    baseUrl,
    status,
    system,
    health
  };
}

async function run() {
  const args = parseArgs(process.argv);
  const baseUrl = await resolveBaseUrl(args.baseUrl);

  if (!baseUrl) {
    printDashboard({
      baseUrl: "",
      status: { ok: false, status: 0, error: "No EVICS API detected on localhost ports 8080-8083." },
      system: { ok: false, status: 0, error: "unavailable" },
      health: { ok: false, status: 0, error: "unavailable" }
    });
    process.exit(1);
  }

  if (!args.watch) {
    const snapshot = await readSnapshot(baseUrl);
    printDashboard(snapshot);
    return;
  }

  // Live terminal mode for operations monitoring.
  const renderLoop = async () => {
    process.stdout.write("\x1Bc");
    const snapshot = await readSnapshot(baseUrl);
    printDashboard(snapshot);
    console.log(`refresh every ${args.intervalSeconds}s | Ctrl+C to exit`);
  };

  await renderLoop();
  setInterval(renderLoop, args.intervalSeconds * 1000);
}

run().catch((error) => {
  console.error(`terminal-view failed: ${error.message || error}`);
  process.exit(1);
});
