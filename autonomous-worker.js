const DEFAULT_BASE_URL = "http://127.0.0.1:4175";

const baseUrl = (process.env.EVICS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const intervalMinutes = Math.max(15, Number(process.env.EVICS_AUTONOMY_INTERVAL_MINUTES || 60));
const maxProducts = Math.max(1, Math.min(Number(process.env.EVICS_AUTONOMY_MAX_PRODUCTS || 5), 10));
const directive = process.env.EVICS_AUTONOMY_DIRECTIVE || "Run EVICS from beginning to end.";
const agentToken = process.env.EVICS_AGENT_TOKEN || "";
const renderProvider = String(process.env.EVICS_AUTONOMY_RENDER_PROVIDER || process.env.EVICS_AUTONOMY_PROVIDER || "heygen").toLowerCase();

let running = false;

function log(message) {
  console.log(`[EVICS Autonomous Worker] ${new Date().toISOString()} ${message}`);
}

async function runOnce(reason = "scheduled") {
  if (running) {
    log("Skipped because previous run is still active.");
    return;
  }

  running = true;
  try {
    log(`Starting ${reason} run against ${baseUrl}.`);
    const response = await fetch(`${baseUrl}/api/agents/office-run`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(agentToken ? { "X-EVICS-Agent-Token": agentToken } : {})
      },
      body: JSON.stringify({
        directive,
        mode: "External Worker",
        continuous: true,
        maxProducts,
        agentToken,
        renderProvider
      })
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || `Worker request failed with ${response.status}`);
    }

    log(`Completed: ${payload.generated || 0} concepts from ${payload.products || 0} products. Review items: ${payload.exceptions?.length || 0}.`);
  } catch (error) {
    log(`Failed: ${error.message}`);
  } finally {
    running = false;
  }
}

async function main() {
  log(`Worker online. Interval: ${intervalMinutes} minutes. Max products: ${maxProducts}.`);
  await runOnce("startup");
  setInterval(() => runOnce("scheduled"), intervalMinutes * 60 * 1000);
}

main().catch((error) => {
  log(`Fatal: ${error.message}`);
  process.exit(1);
});
