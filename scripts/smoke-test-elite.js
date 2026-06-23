#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const baseUrl = (process.env.EVICS_BASE_URL || "http://localhost:8081").replace(/\/$/, "");
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-");

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function run() {
  const checks = [];

  const addResult = (name, pass, detail, data = null) => {
    checks.push({ name, pass, detail, data });
  };

  try {
    await requestJson(`${baseUrl}/status`);
    addResult("Status endpoint", true, "Server status is reachable");
  } catch (err) {
    addResult("Status endpoint", false, err.message);
  }

  let affiliateId = null;
  try {
    const email = `smoke_${Date.now()}@evics.test`;
    const reg = await requestJson(`${baseUrl}/api/affiliate/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test Affiliate",
        email,
        track: "viral",
        niche: ["tech"],
        paymentMethod: "paypal",
      }),
    });

    affiliateId = reg.affiliate && reg.affiliate.id;
    addResult("Affiliate registration", Boolean(affiliateId), `affiliateId=${affiliateId || "missing"}`);
  } catch (err) {
    addResult("Affiliate registration", false, err.message);
  }

  if (affiliateId) {
    try {
      const switched = await requestJson(`${baseUrl}/api/affiliate/track/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId,
          newTrack: "high-commission",
        }),
      });
      const pass = switched.affiliate && switched.affiliate.track === "high-commission";
      addResult(
        "Track switch",
        pass,
        `track=${switched.affiliate ? switched.affiliate.track : "missing"}`
      );
    } catch (err) {
      addResult("Track switch", false, err.message);
    }

    try {
      await requestJson(`${baseUrl}/api/notifications/send-daily-digest`, { method: "POST" });
      const unread = await requestJson(
        `${baseUrl}/api/affiliate/notifications/unread?affiliateId=${encodeURIComponent(affiliateId)}`
      );
      addResult(
        "Daily digest delivery",
        typeof unread.unreadCount === "number" && unread.unreadCount >= 1,
        `unreadCount=${unread.unreadCount}`
      );
    } catch (err) {
      addResult("Daily digest delivery", false, err.message);
    }
  }

  try {
    const backup = await requestJson(`${baseUrl}/api/admin/backup/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataType: "high_commission_products",
        approvedBy: "ceo",
        reason: "smoke-test",
      }),
    });

    const backupId = backup.backup && backup.backup.id;
    if (!backupId) {
      addResult("Backup create", false, "backup id missing");
    } else {
      addResult("Backup create", true, `backupId=${backupId}`);

      try {
        const restore = await requestJson(`${baseUrl}/api/admin/backup/restore/${encodeURIComponent(backupId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedBy: "ceo",
            reason: "smoke-test-restore",
          }),
        });

        addResult(
          "Backup restore",
          Boolean(restore.success),
          `restoredRecords=${restore.recovery ? restore.recovery.restoredRecords : "unknown"}`
        );
      } catch (err) {
        addResult("Backup restore", false, err.message);
      }
    }
  } catch (err) {
    addResult("Backup create", false, err.message);
  }

  try {
    const audit = await requestJson(`${baseUrl}/api/governance/audit-trail?limit=5`);
    addResult("Governance audit", Array.isArray(audit.auditTrail), `entries=${audit.count}`);
  } catch (err) {
    addResult("Governance audit", false, err.message);
  }

  const report = {
    generatedAt: now.toISOString(),
    baseUrl,
    passCount: checks.filter((c) => c.pass).length,
    failCount: checks.filter((c) => !c.pass).length,
    checks,
  };

  const reportDir = path.join(__dirname, "..", "work", "smoke-reports");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, `elite-smoke-${timestamp}.json`);
  const mdPath = path.join(reportDir, `elite-smoke-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const lines = [];
  lines.push("# EVICS Elite Smoke Test Report");
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Passed: ${report.passCount}`);
  lines.push(`- Failed: ${report.failCount}`);
  lines.push("");
  lines.push("| Check | Result | Detail |");
  lines.push("|---|---|---|");

  for (const check of checks) {
    lines.push(`| ${check.name} | ${check.pass ? "PASS" : "FAIL"} | ${String(check.detail).replace(/\|/g, "\\|")} |`);
  }

  fs.writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Smoke report JSON: ${jsonPath}`);
  console.log(`Smoke report MD: ${mdPath}`);
  console.log(`Summary: ${report.passCount} passed, ${report.failCount} failed`);

  if (report.failCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(`Smoke test failed: ${err.message}`);
  process.exit(1);
});
