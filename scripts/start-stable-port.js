#!/usr/bin/env node

const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_CANDIDATES = [8081, 8080, 8082, 8083, 8084, 8090];

function parseCandidates() {
  const raw = String(process.env.EVICS_PORT_CANDIDATES || "").trim();
  if (!raw) return DEFAULT_CANDIDATES;
  const values = raw
    .split(",")
    .map((item) => Number(String(item || "").trim()))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 65536);
  return values.length ? values : DEFAULT_CANDIDATES;
}

function canListen(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

async function choosePort() {
  const explicit = Number(process.env.PORT || 0);
  if (Number.isFinite(explicit) && explicit > 0) {
    const available = await canListen(explicit);
    return available ? explicit : null;
  }

  const candidates = parseCandidates();
  for (const port of candidates) {
    const available = await canListen(port);
    if (available) return port;
  }
  return null;
}

async function main() {
  const selectedPort = await choosePort();
  if (!selectedPort) {
    console.error("No available EVICS port in candidate list. Set PORT or EVICS_PORT_CANDIDATES.");
    process.exit(2);
  }

  process.env.PORT = String(selectedPort);
  console.log(`EVICS stable-port startup selected PORT=${selectedPort}`);

  const projectRoot = path.resolve(__dirname, "..");
  const serverEntry = path.join(projectRoot, "server.js");

  const child = spawn(process.execPath, [serverEntry], {
    stdio: "inherit",
    env: process.env,
    cwd: projectRoot,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error(`start-stable-port failed: ${error.message || error}`);
  process.exit(1);
});
