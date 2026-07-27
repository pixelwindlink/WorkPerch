import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  acquireDashboardServer,
  isDashboardServerReady,
  resolveDesktopGenericEnginesRoot,
  resolveDesktopServerUrl
} from "../../electron/server-coordinator.mjs";
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

test("Packaged Desktop resolves external governance before bundled resources", () => {
  const available = new Set([
    "/explicit/governance/protocol/engine-message/v1.0/envelope.schema.json",
    "/Applications/Dashboard.app/Contents/Resources/governance/protocol/engine-message/v1.0/envelope.schema.json"
  ]);
  const exists = (value) => available.has(value);
  assert.equal(resolveDesktopGenericEnginesRoot({
    environment: { GENERIC_ENGINES_ROOT: "/explicit" },
    homeDir: "/Users/test",
    resourcesPath: "/Applications/Dashboard.app/Contents/Resources",
    developmentRoot: "/workspace/generic_engines",
    isPackaged: true,
    exists
  }), "/explicit");
  assert.equal(resolveDesktopGenericEnginesRoot({
    environment: {},
    homeDir: "/Users/test",
    resourcesPath: "/Applications/Dashboard.app/Contents/Resources",
    developmentRoot: "/workspace/generic_engines",
    isPackaged: true,
    exists
  }), "/Applications/Dashboard.app/Contents/Resources");
  assert.throws(() => resolveDesktopGenericEnginesRoot({
    environment: {}, homeDir: "/Users/test", resourcesPath: "/missing", developmentRoot: "/missing", isPackaged: true, exists
  }));
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

test("Desktop compact floating window keeps IPC and bundle capabilities narrow", async () => {
  const [preload, main, renderer, packaging] = await Promise.all([
    fs.readFile(path.join(DASHBOARD_ROOT, "electron/preload.cjs"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "electron/main.mjs"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "app.js"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "scripts/package-desktop.mjs"), "utf8")
  ]);
  assert.match(preload, /contextBridge\.exposeInMainWorld\("dashboardDesktop"/);
  assert.match(preload, /webUtils\.getPathForFile/);
  assert.match(preload, /ipcRenderer\.invoke\(WINDOW_GET_ALWAYS_ON_TOP\)/);
  assert.match(preload, /ipcRenderer\.invoke\(WINDOW_SET_ALWAYS_ON_TOP, enabled\)/);
  assert.equal(/ipcRenderer\.(?:send|sendSync|postMessage|on|once)|node:fs|child_process|shell\./.test(preload), false);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /minWidth:\s*360/);
  assert.match(main, /minHeight:\s*320/);
  assert.match(main, /setAlwaysOnTop\(true,\s*process\.platform === "darwin" \? "floating"/);
  assert.match(main, /setVisibleOnAllWorkspaces\(enabled,\s*\{\s*visibleOnFullScreen:\s*enabled\s*\}\)/);
  assert.match(main, /sourceWindow !== mainWindow/);
  assert.match(renderer, /dashboardDesktop\?\.getPathForFile/);
  assert.match(renderer, /initializeDesktopWindowControls/);
  assert.match(renderer, /setAlwaysOnTopPreference/);
  assert.match(renderer, /local-dashboard\.window-always-on-top\.v1/);
  assert.match(renderer, /Desktop Shell 已识别真实绝对路径/);
  assert.match(renderer, /Finder 按 ⌥⌘C/);
  assert.match(packaging, /platform:\s*"darwin"/);
  assert.match(packaging, /arch:\s*"arm64"/);
  assert.match(packaging, /asar:\s*true/);
  assert.match(packaging, /identity:\s*"-"/);
  assert.match(packaging, /identityValidation:\s*false/);
  assert.match(packaging, /extraResource:\s*\[governanceRoot\]/);
  for (const excluded of ["tests", "openspec", "runtime_data", "exports", "\\.agents"]) assert.match(packaging, new RegExp(excluded));
});
