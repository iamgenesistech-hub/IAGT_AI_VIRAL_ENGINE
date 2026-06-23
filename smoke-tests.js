#!/usr/bin/env node

/**
 * EVICS Elite Pipeline - Comprehensive Smoke Tests
 * Validates all critical workflows end-to-end
 */

const http = require("http");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL || "http://localhost:8082";
const REPORT_FILE = path.join(__dirname, "smoke-test-report.json");

let testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: [],
  summary: { total: 0, passed: 0, failed: 0, errors: [] },
};

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...( body ? { "Content-Length": Buffer.byteLength(JSON.stringify(body)) } : {} ),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, rawBody: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, rawBody: data, parseError: e.message });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test(name, fn) {
  const test = { name, status: "PASS", detail: "", duration: 0 };
  const start = Date.now();
  try {
    await fn();
    test.detail = "OK";
  } catch (err) {
    test.status = "FAIL";
    test.detail = err.message || String(err);
    testResults.summary.errors.push({ test: name, error: test.detail });
  }
  test.duration = Date.now() - start;
  testResults.tests.push(test);
  testResults.summary.total++;
  if (test.status === "PASS") {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  console.log(`[${test.status}] ${name} (${test.duration}ms)`);
}

async function runTests() {
  console.log(`\n🧪 EVICS Smoke Test Suite\nBase URL: ${BASE_URL}\n`);

  // ===== CORE SYSTEM CHECKS =====
  await test("Health check", async () => {
    const res = await makeRequest("GET", "/status");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test("Viral products available", async () => {
    const res = await makeRequest("GET", "/api/viral-products");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.products || res.data.products.length === 0) {
      throw new Error("No viral products");
    }
  });

  await test("High-commission products available", async () => {
    const res = await makeRequest("GET", "/api/high-commission/products");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.products) throw new Error("No products field");
  });

  // ===== AFFILIATE WORKFLOW =====
  const testEmail = `test_${Date.now()}@evics.test`;
  let affiliateId = null;

  await test("Register viral affiliate", async () => {
    const res = await makeRequest("POST", "/api/affiliate/register", {
      name: "Viral Tester",
      email: testEmail,
      track: "viral",
      niche: ["tech", "lifestyle"],
      paymentMethod: "paypal",
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.affiliate?.id) throw new Error("No affiliate ID");
    affiliateId = res.data.affiliate.id;
  });

  await test("Switch affiliate to high-commission", async () => {
    if (!affiliateId) throw new Error("No affiliate ID from previous test");
    const res = await makeRequest("POST", "/api/affiliate/track/switch", {
      affiliateId,
      newTrack: "high-commission",
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.affiliate?.track !== "high-commission") {
      throw new Error(`Track is ${res.data.affiliate?.track}, expected high-commission`);
    }
  });

  await test("Get track statistics", async () => {
    const res = await makeRequest("GET", "/api/affiliate/track/all-stats");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.tracks) throw new Error("No tracks data");
  });

  // ===== NOTIFICATIONS =====
  await test("Send daily digest", async () => {
    const res = await makeRequest("POST", "/api/notifications/send-daily-digest");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.count !== "number") throw new Error("No count in response");
  });

  await test("Read affiliate notifications", async () => {
    if (!affiliateId) throw new Error("No affiliate ID");
    const res = await makeRequest("GET", `/api/affiliate/notifications?affiliateId=${affiliateId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.notifications)) throw new Error("Not an array");
  });

  // ===== GOVERNANCE =====
  await test("Get governance policies", async () => {
    const res = await makeRequest("GET", "/api/governance/policies");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.policies) throw new Error("No policies");
  });

  await test("Get board structure", async () => {
    const res = await makeRequest("GET", "/api/governance/board-structure");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.boardStructure) throw new Error("No board structure");
  });

  await test("Query governance audit trail", async () => {
    const res = await makeRequest("GET", "/api/governance/audit-trail?limit=10");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.auditTrail)) throw new Error("Not an array");
  });

  // ===== BACKUP & RECOVERY =====
  let backupId = null;

  await test("Create backup (viral products)", async () => {
    const res = await makeRequest("POST", "/api/admin/backup/create", {
      dataType: "viral_products",
      approvedBy: "ceo",
      reason: "smoke test",
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.backup?.id) throw new Error("No backup ID");
    backupId = res.data.backup.id;
  });

  await test("List backups", async () => {
    const res = await makeRequest("GET", "/api/admin/backup/list?limit=5");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.total !== "number") throw new Error("No total count");
  });

  await test("Get backup manifest", async () => {
    const res = await makeRequest("GET", "/api/admin/backup/manifest");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.manifest) throw new Error("No manifest");
  });

  await test("Restore backup", async () => {
    if (!backupId) throw new Error("No backup ID from create test");
    const res = await makeRequest("POST", `/api/admin/backup/restore/${backupId}`, {
      approvedBy: "ceo",
      reason: "smoke test",
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.recovery?.id) throw new Error("No recovery ID");
    if (typeof res.data.recovery.restoredRecords !== "number") {
      throw new Error("No restored records count");
    }
  });

  await test("Get backup history", async () => {
    const res = await makeRequest("GET", "/api/admin/backup/history?limit=10");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.history)) throw new Error("Not an array");
  });

  // ===== PRODUCT VERSIONING =====
  await test("Get product versions", async () => {
    const res = await makeRequest("GET", "/api/admin/products/versions?limit=5");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.total !== "number") throw new Error("No total");
  });

  await test("Get product changelog", async () => {
    const res = await makeRequest("GET", "/api/admin/products/changelog?limit=10");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.changelog)) throw new Error("Not an array");
  });

  // ===== SUMMARY & REPORT =====
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${testResults.summary.total}`);
  console.log(`   Passed: ${testResults.summary.passed} ✅`);
  console.log(`   Failed: ${testResults.summary.failed} ❌`);

  if (testResults.summary.failed > 0) {
    console.log(`\n⚠️  Failed Tests:`);
    testResults.summary.errors.forEach((e) => {
      console.log(`   - ${e.test}: ${e.error}`);
    });
  }

  // Write report to file
  fs.writeFileSync(REPORT_FILE, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Report saved to: ${REPORT_FILE}\n`);

  return testResults.summary.failed === 0 ? 0 : 1;
}

runTests()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  });
