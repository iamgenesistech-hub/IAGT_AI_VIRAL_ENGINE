#!/usr/bin/env node

const { spawn } = require("child_process");

const PORTS = [8081, 8080, 8082, 8083];

async function isAlive(port) {
  try {
    const response = await fetch(`http://localhost:${port}/status`, {
      headers: { Accept: "application/json" }
    });
    return response.ok;
  } catch {
    return false;
  }
}

function openUrl(url) {
  const platform = process.platform;

  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true });
    return;
  }

  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true });
    return;
  }

  spawn("xdg-open", [url], { stdio: "ignore", detached: true });
}

async function main() {
  for (const port of PORTS) {
    if (await isAlive(port)) {
      const url = `http://localhost:${port}/workspace.html`;
      openUrl(url);
      console.log(`Opened EVICS app: ${url}`);
      return;
    }
  }

  console.error("No EVICS API detected on localhost ports 8081/8080/8082/8083.");
  console.error("Start the API first using: npm run start:stable");
  process.exit(1);
}

main().catch((error) => {
  console.error(`open-app failed: ${error.message || error}`);
  process.exit(1);
});
