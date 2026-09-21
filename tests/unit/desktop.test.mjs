import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  acquirePerchServer,
  isPerchServerReady,
  resolveDesktopGenericEnginesRoot,
  resolveDesktopServerUrl,
  resolveProjectLauncherRoot
} from "../../electron/server-coordinator.mjs";
import { LocalEngineClient } from "../../electron/local-engine-client.mjs";
import { PERCH_ROOT } from "../helpers.mjs";

function response(payload, ok = true) {
  return { ok, async json() { return payload; } };
}

function describeResponse() {
  return response({
    protocol: "generic-engines/engine-message",
    version: "1.0",
    kind: "response",
    id: "desktop-test",
    engine: "perch",
    action: "engine.describe",
    status: "ok",
    payload: { id: "perch" }
  });
}

test("Desktop URL accepts only credential-free loopback HTTP roots", () => {
  assert.deepEqual(resolveDesktopServerUrl({ PERCH_DESKTOP_URL: "http://127.0.0.1:4173" }), {
    baseUrl: "http://127.0.0.1:4173",
    host: "127.0.0.1",
    port: 4173
  });
  assert.throws(() => resolveDesktopServerUrl({ PERCH_DESKTOP_URL: "https://example.com" }));
  assert.throws(() => resolveDesktopServerUrl({ PERCH_DESKTOP_URL: "http://localhost:4173/private" }));
  assert.throws(() => resolveDesktopServerUrl({ PERCH_DESKTOP_URL: "http://user:pass@localhost:4173" }));
});

test("Packaged Desktop resolves external governance before bundled resources", () => {
  const available = new Set([
    "/explicit/governance/protocol/engine-message/v1.0/envelope.schema.json",
    "/Applications/Perch.app/Contents/Resources/governance/protocol/engine-message/v1.0/envelope.schema.json"
  ]);
  const exists = (value) => available.has(value);
  assert.equal(resolveDesktopGenericEnginesRoot({
    environment: { GENERIC_ENGINES_ROOT: "/explicit" },
    homeDir: "/Users/test",
    resourcesPath: "/Applications/Perch.app/Contents/Resources",
    developmentRoot: "/workspace/generic_engines",
    isPackaged: true,
    exists
  }), "/explicit");
  assert.equal(resolveDesktopGenericEnginesRoot({
    environment: {},
    homeDir: "/Users/test",
    resourcesPath: "/Applications/Perch.app/Contents/Resources",
    developmentRoot: "/workspace/generic_engines",
    isPackaged: true,
    exists
  }), "/Applications/Perch.app/Contents/Resources");
  assert.throws(() => resolveDesktopGenericEnginesRoot({
    environment: {}, homeDir: "/Users/test", resourcesPath: "/missing", developmentRoot: "/missing", isPackaged: true, exists
  }));
});

test("Desktop resolves the packaged Project Launcher as a separate readonly resource", () => {
  const files = new Set([
    "/Applications/Perch.app/Contents/Resources/project-launcher/engine.manifest.json",
    "/Applications/Perch.app/Contents/Resources/project-launcher/src/composition/create-project-launcher-engine.mjs"
  ]);
  assert.equal(resolveProjectLauncherRoot({
    environment: {},
    resourcesPath: "/Applications/Perch.app/Contents/Resources",
    developmentRoot: "/workspace/generic_engines/engine_projects/project-launcher",
    isPackaged: true,
    exists: (value) => files.has(value)
  }), "/Applications/Perch.app/Contents/Resources/project-launcher");
});

test("Local EngineClient forwards only allowlisted complete Project Launcher messages", async () => {
  const received = [];
  const client = new LocalEngineClient({
    engine: { async handle(message) { received.push(message); return { ...message, kind: "response", status: "ok", payload: {} }; } },
    engineId: "project-launcher",
    allowedActions: ["launcher.runtime.get"]
  });
  const message = {
    protocol: "generic-engines/engine-message", version: "1.0", kind: "request", id: "local-client",
    engine: "project-launcher", action: "launcher.runtime.get", payload: {}
  };
  const response = await client.send(message);
  assert.equal(response.status, "ok");
  assert.deepEqual(received, [message]);
  await assert.rejects(() => client.send({ ...message, action: "launcher.definition.delete" }), /not allowed/);
  await assert.rejects(() => client.send({ engine: "project-launcher", action: "launcher.runtime.get" }), /complete EngineMessage/);
});

test("Desktop readiness probe recognizes only Perch engine.describe", async () => {
  assert.equal(await isPerchServerReady("http://127.0.0.1:4173", { fetchImpl: async () => describeResponse() }), true);
  assert.equal(await isPerchServerReady("http://127.0.0.1:4173", { fetchImpl: async () => response({ status: "ok", payload: { id: "other" } }) }), false);
  assert.equal(await isPerchServerReady("http://127.0.0.1:4173", { fetchImpl: async () => { throw new Error("offline"); } }), false);
});

test("Desktop reuses an existing Server and owns only a Server it starts", async () => {
  let createCalls = 0;
  const reused = await acquirePerchServer({
    baseUrl: "http://127.0.0.1:4173",
    fetchImpl: async () => describeResponse(),
    createServer: async () => { createCalls += 1; }
  });
  assert.equal(reused.owned, false);
  assert.equal(createCalls, 0);
  await assert.rejects(() => acquirePerchServer({
    baseUrl: "http://127.0.0.1:4173",
    allowReuse: false,
    fetchImpl: async () => describeResponse(),
    createServer: async () => { createCalls += 1; }
  }), /需要拥有组合式 Server/);

  let starts = 0;
  const server = { async start() { starts += 1; }, async stop() {} };
  const owned = await acquirePerchServer({
    baseUrl: "http://127.0.0.1:4173",
    fetchImpl: async () => { throw new Error("offline"); },
    createServer: async () => server
  });
  assert.equal(owned.owned, true);
  assert.equal(owned.server, server);
  assert.equal(starts, 1);
});

test("Desktop compact window and Finder opening keep IPC and bundle capabilities narrow", async () => {
  const uiDir = path.join(PERCH_ROOT, "ui");
  const [preload, main, finder, windowState, appEntry, desktopUi, summonUi, eventsUi, renderPaths, renderProjects, dropBatch, stateUi, packaging, release] = await Promise.all([
    fs.readFile(path.join(PERCH_ROOT, "electron/preload.cjs"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "electron/main.mjs"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "electron/finder-path-controller.mjs"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "electron/window-state.mjs"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "app.js"), "utf8"),
    fs.readFile(path.join(uiDir, "desktop.js"), "utf8"),
    fs.readFile(path.join(uiDir, "summon.js"), "utf8"),
    fs.readFile(path.join(uiDir, "events.js"), "utf8"),
    fs.readFile(path.join(uiDir, "render-paths.js"), "utf8"),
    fs.readFile(path.join(uiDir, "render-projects.js"), "utf8"),
    fs.readFile(path.join(uiDir, "drop-batch.js"), "utf8"),
    fs.readFile(path.join(uiDir, "state.js"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "scripts/package-desktop.mjs"), "utf8"),
    fs.readFile(path.join(PERCH_ROOT, "scripts/build-release.mjs"), "utf8")
  ]);
  const renderer = [appEntry, desktopUi, summonUi, eventsUi, renderPaths, renderProjects, dropBatch, stateUi].join("\n");
  assert.match(preload, /contextBridge\.exposeInMainWorld\("perchDesktop"/);
  assert.match(preload, /webUtils\.getPathForFile/);
  assert.match(preload, /ipcRenderer\.invoke\(WINDOW_GET_ALWAYS_ON_TOP\)/);
  assert.match(preload, /ipcRenderer\.invoke\(WINDOW_SET_ALWAYS_ON_TOP, enabled\)/);
  assert.match(preload, /ipcRenderer\.invoke\(PATH_OPEN_IN_FINDER, localPath\)/);
  assert.match(preload, /onSummon\(handler\)/);
  assert.match(preload, /ipcRenderer\.on\(SUMMON_CHANNEL, listener\)/);
  assert.equal(/ipcRenderer\.(?:send|sendSync|postMessage)\b/.test(preload), false);
  assert.equal(/node:fs|child_process|shell\./.test(preload), false);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /minWidth:\s*360/);
  assert.match(main, /minHeight:\s*320/);
  assert.match(main, /createWindowStateTracker/);
  assert.match(main, /saved\.maximized/);
  assert.match(windowState, /window-state\.json/);
  assert.match(windowState, /getNormalBounds/);
  assert.match(main, /setAlwaysOnTop\(true,\s*process\.platform === "darwin" \? "floating"/);
  assert.match(main, /setVisibleOnAllWorkspaces\(enabled,\s*\{\s*visibleOnFullScreen:\s*enabled\s*\}\)/);
  assert.match(main, /sourceWindow !== mainWindow/);
  assert.match(main, /ipcMain\.handle\(PATH_OPEN_IN_FINDER/);
  assert.match(main, /globalShortcut\.register/);
  assert.match(main, /SUMMON_CHANNEL/);
  assert.match(main, /Command\+Shift\+D/);
  assert.match(main, /new LocalEngineClient/);
  assert.match(main, /allowReuse:\s*false/);
  assert.match(main, /createRuntimeHost/);
  assert.match(main, /startMonitorHall/);
  assert.match(main, /sourceEngine:\s*"perch"/);
  assert.match(main, /Project Launcher unavailable; Perch CRUD remains available/);
  assert.match(main, /currentPerchWindow\(event\)/);
  assert.match(main, /openDirectory:\s*\(value\) => shell\.openPath\(value\)/);
  assert.match(main, /showItemInFolder:\s*\(value\) => shell\.showItemInFolder\(value\)/);
  assert.match(finder, /path\.isAbsolute\(value\)/);
  assert.match(finder, /entry\.isDirectory\(\)/);
  assert.match(finder, /showItemInFolder\(localPath\)/);
  assert.match(renderer, /perchDesktop\?\.getPathForFile/);
  assert.match(renderer, /perchDesktop\?\.openPathInFinder/);
  assert.match(renderer, /onSummon/);
  assert.match(renderer, /open-path-in-finder/);
  assert.match(renderer, /open-project-path-in-finder/);
  assert.match(renderer, /普通浏览器不能打开本机访达/);
  assert.equal(/function\s+fileUrl|href="\$\{escapeHtml\(fileUrl/.test(renderer), false);
  assert.match(renderer, /initializeDesktopWindowControls/);
  assert.match(renderer, /setAlwaysOnTopPreference/);
  assert.match(renderer, /local-dashboard\.window-always-on-top\.v1/);
  assert.match(renderer, /local-dashboard\.active-tab\.v1/);
  assert.match(renderer, /Desktop Shell 已识别真实绝对路径/);
  assert.match(renderer, /Finder 按 ⌥⌘C/);
  assert.match(packaging, /platform:\s*"darwin"/);
  assert.match(packaging, /arch:\s*"arm64"/);
  assert.match(packaging, /asar:\s*true/);
  assert.match(packaging, /identity:\s*"-"/);
  assert.match(packaging, /identityValidation:\s*false/);
  assert.match(packaging, /extraResource:\s*\[governanceRoot, launcherResourceRoot\]/);
  assert.match(packaging, /engineProviderSpiRoot/);
  assert.match(packaging, /afterCopyExtraResources/);
  assert.match(packaging, /"Perch\.app", "Contents", "common_components"/);
  assert.match(packaging, /engineProviderSpiRoot, "src"/);
  assert.match(packaging, /engineProviderSpiRoot, "package\.json"/);
  assert.match(packaging, /engineProviderSpiRoot, "component\.manifest\.json"/);
  assert.equal(/engineProviderSpiRoot, "tests"|engineProviderSpiRoot, "fixtures"|engineProviderSpiRoot, "bin"/.test(packaging), false);
  assert.match(packaging, /ELECTRON_ZIP_DIR/);
  assert.match(packaging, /electronZipDir/);
  assert.match(packaging, /projectLauncherRoot/);
  assert.match(packaging, /fs\.cp\(path\.join\(projectLauncherRoot, "contracts"\)/);
  assert.match(packaging, /fs\.cp\(path\.join\(projectLauncherRoot, "src"\)/);
  assert.equal(/projectLauncherRoot, "tests"|projectLauncherRoot, "openspec"|projectLauncherRoot, "runtime_data"/.test(packaging), false);
  assert.match(release, /spawn\(command, args, \{ shell: false/);
  assert.match(release, /hdiutil/);
  assert.match(release, /createHash\("sha256"\)/);
  for (const excluded of ["tests", "openspec", "runtime_data", "exports", "release", "\\.agents"]) assert.match(packaging, new RegExp(excluded));
});
