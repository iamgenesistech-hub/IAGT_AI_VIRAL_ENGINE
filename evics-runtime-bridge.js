const fs = require("fs");
const path = require("path");
const Module = require("module");

const PROJECT_ROOT = __dirname;
const RUNTIME_ROOT =
  "C:\\Users\\rolan\\Documents\\Codex\\2026-05-17\\https-1drv-ms-w-c-bf1f6564a15d3317\\evics-runtime";
const RUNTIME_NODE_MODULES = path.join(RUNTIME_ROOT, "node_modules");

if (!fs.existsSync(RUNTIME_NODE_MODULES)) {
  throw new Error(
    `Missing clean runtime packages at ${RUNTIME_NODE_MODULES}. Run the Codex runtime install first.`
  );
}

const originalResolveFilename = Module._resolveFilename;
const builtins = new Set([
  ...Module.builtinModules,
  ...Module.builtinModules.map((name) => `node:${name}`),
]);
const runtimeParent = {
  id: "evics-runtime-bridge",
  filename: path.join(RUNTIME_ROOT, "__bridge__.js"),
  paths: Module._nodeModulePaths(RUNTIME_ROOT),
};

function isPackageRequest(request) {
  return (
    !builtins.has(request) &&
    !request.startsWith(".") &&
    !path.isAbsolute(request)
  );
}

Module._resolveFilename = function resolveFromCleanRuntime(
  request,
  parent,
  isMain,
  options
) {
  if (isPackageRequest(request)) {
    try {
      return originalResolveFilename.call(
        this,
        request,
        runtimeParent,
        isMain,
        options
      );
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(PROJECT_ROOT, "backend", ".env"));

process.env.HOST = process.env.HOST || "localhost:3000";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "local-dev-placeholder";

process.chdir(PROJECT_ROOT);
require(path.join(PROJECT_ROOT, "backend", "server.js"));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
