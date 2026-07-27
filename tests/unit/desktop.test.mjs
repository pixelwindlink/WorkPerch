import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { acquireDashboardServer, isDashboardServerReady, resolveDesktopServerUrl } from "../../electron/server-coordinator.mjs";
import { DASHBOARD_ROOT } from "../helpers.mjs";

function response(payload, ok = true) {
  return { ok, async json() { return payload; } };
}

function describeResponse() {
  return response({
    protocol: "generic-engines/engine-message",
    version: "1.0",
    kind: "response",
    id: "desktop-test",
    engine: "dashboard",
    action: "engine.describe",
    status: "ok",
    payload: { id: "dashboard" }
  });
}

test("Desktop URL accepts only credential-free loopback HTTP roots", () => {
  assert.deepEqual(resolveDesktopServerUrl({ DASHBOARD_DESKTOP_URL: "http://127.0.0.1:4173" }), {
    baseUrl: "http://127.0.0.1:4173",
    host: "127.0.0.1",
    port: 4173
  });
  assert.throws(() => resolveDesktopServerUrl({ DASHBOARD_DESKTOP_URL: "https://example.com" }));
  assert.throws(() => resolveDesktopServerUrl({ DASHBOARD_DESKTOP_URL: "http://localhost:4173/private" }));
  assert.throws(() => resolveDesktopServerUrl({ DASHBOARD_DESKTOP_URL: "http://user:pass@localhost:4173" }));
});

test("Desktop readiness probe recognizes only Dashboard engine.describe", async () => {
  assert.equal(await isDashboardServerReady("http://127.0.0.1:4173", { fetchImpl: async () => describeResponse() }), true);
  assert.equal(await isDashboardServerReady("http://127.0.0.1:4173", { fetchImpl: async () => response({ status: "ok", payload: { id: "other" } }) }), false);
  assert.equal(await isDashboardServerReady("http://127.0.0.1:4173", { fetchImpl: async () => { throw new Error("offline"); } }), false);
});

test("Desktop reuses an existing Server and owns only a Server it starts", async () => {
  let createCalls = 0;
  const reused = await acquireDashboardServer({
    baseUrl: "http://127.0.0.1:4173",
    fetchImpl: async () => describeResponse(),
    createServer: async () => { createCalls += 1; }
  });
  assert.equal(reused.owned, false);
  assert.equal(createCalls, 0);

  let starts = 0;
  const server = { async start() { starts += 1; }, async stop() {} };
  const owned = await acquireDashboardServer({
    baseUrl: "http://127.0.0.1:4173",
    fetchImpl: async () => { throw new Error("offline"); },
    createServer: async () => server
  });
  assert.equal(owned.owned, true);
  assert.equal(owned.server, server);
  assert.equal(starts, 1);
});

test("Desktop preload exposes only dropped File path resolution", async () => {
  const [preload, main, renderer] = await Promise.all([
    fs.readFile(path.join(DASHBOARD_ROOT, "electron/preload.cjs"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "electron/main.mjs"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "app.js"), "utf8")
  ]);
  assert.match(preload, /contextBridge\.exposeInMainWorld\("dashboardDesktop"/);
  assert.match(preload, /webUtils\.getPathForFile/);
  assert.equal(/ipcRenderer|node:fs|child_process|shell\./.test(preload), false);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(renderer, /dashboardDesktop\?\.getPathForFile/);
  assert.match(renderer, /Desktop Shell 已识别真实绝对路径/);
  assert.match(renderer, /Finder 按 ⌥⌘C/);
});
