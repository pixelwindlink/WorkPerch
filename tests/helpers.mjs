import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DASHBOARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GENERIC_ENGINES_ROOT = path.resolve(DASHBOARD_ROOT, "../..");

export function request(action, payload = {}, options = {}) {
  return {
    protocol: "generic-engines/engine-message",
    version: "1.0",
    kind: "request",
    id: options.id || `test-${action}`,
    engine: options.engine || "dashboard",
    action,
    payload,
  };
}

export async function tempRuntime(prefix = "dashboard-test-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeRuntime(runtimeDir) {
  await fs.rm(runtimeDir, { recursive: true, force: true });
}

export function runCli({ runtimeDir, input = "", args = [], environment = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["cli.mjs", ...args], {
      cwd: DASHBOARD_ROOT,
      env: {
        ...process.env,
        GENERIC_ENGINES_ROOT,
        ...(runtimeDir ? { DASHBOARD_RUNTIME_DIR: runtimeDir } : {}),
        ...environment,
      },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input, "utf8");
  });
}
