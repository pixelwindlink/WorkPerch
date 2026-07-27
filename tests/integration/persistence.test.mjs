import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDashboardEngine } from "../../src/composition/create-dashboard-engine.mjs";
import { GENERIC_ENGINES_ROOT, removeRuntime, request, tempRuntime } from "../helpers.mjs";

test("new runtime initializes atomically, persists across restart and preserves revision backups", async () => {
  const runtimeDir = await tempRuntime("dashboard-persist-");
  const first = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  try {
    await first.start();
    const initial = await first.handle(request("dashboard.snapshot.get", {}, { id: "initial" }));
    assert.equal(initial.payload.aggregateRevision, 0);
    const saved = await first.handle(request("dashboard.path.upsert", {
      expectedRevision: 0,
      item: { name: "Persistent", path: "/tmp/persistent", group: "Test", description: "restart", pinned: true },
    }, { id: "save" }));
    assert.equal(saved.payload.aggregateRevision, 1);
  } finally {
    await first.shutdown();
  }

  const statePath = path.join(runtimeDir, "dashboard-state.json");
  const backupPath = path.join(runtimeDir, "backups/revision-00000000.json");
  assert.equal(JSON.parse(await fs.readFile(statePath, "utf8")).aggregateRevision, 1);
  assert.equal(JSON.parse(await fs.readFile(backupPath, "utf8")).aggregateRevision, 0);
  const names = await fs.readdir(runtimeDir);
  assert.equal(names.some((name) => name.endsWith(".tmp")), false);

  const second = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  try {
    await second.start();
    const restored = await second.handle(request("dashboard.snapshot.get", {}, { id: "restored" }));
    assert.equal(restored.payload.aggregateRevision, 1);
    assert.equal(restored.payload.paths[0].name, "Persistent");
  } finally {
    await second.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("corrupt state is reported and never silently overwritten", async () => {
  const runtimeDir = await tempRuntime("dashboard-corrupt-");
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await engine.start();
  await engine.shutdown();
  const statePath = path.join(runtimeDir, "dashboard-state.json");
  const corrupt = "{\"schemaVersion\":\"1.0\",\"aggregateRevision\":";
  await fs.writeFile(statePath, corrupt, "utf8");

  const restart = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await assert.rejects(() => restart.start(), (error) => error.code === "DASHBOARD_STATE_CORRUPT");
  assert.equal(await fs.readFile(statePath, "utf8"), corrupt);
  await restart.shutdown();
  await removeRuntime(runtimeDir);
});

test("only one writer owns a runtime root and confirmed stale local locks recover", async () => {
  const runtimeDir = await tempRuntime("dashboard-lock-");
  const first = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const second = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await first.start();
  await assert.rejects(() => second.start(), (error) => error.code === "STATE_OWNERSHIP_CONFLICT");
  const stillReady = await first.handle(request("system.health", {}, { id: "owner-health" }));
  assert.equal(stillReady.payload.state, "ready");
  await second.shutdown();
  await first.shutdown();

  await fs.writeFile(path.join(runtimeDir, ".dashboard-owner.lock"), JSON.stringify({
    token: "stale-token",
    pid: 99999999,
    host: os.hostname(),
    ownerMode: "standalone",
    acquiredAt: new Date().toISOString(),
  }), "utf8");
  const recovered = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await recovered.start();
  assert.equal((await recovered.readiness()).ready, true);
  await recovered.shutdown();
  await removeRuntime(runtimeDir);
});

test("invalid legacy import produces no partial state write", async () => {
  const runtimeDir = await tempRuntime("dashboard-import-atomic-");
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  try {
    await engine.start();
    const before = await engine.handle(request("dashboard.snapshot.get", {}, { id: "before" }));
    const invalid = await engine.handle(request("dashboard.backup.import", {
      mode: "merge",
      dryRun: false,
      expectedRevision: before.payload.aggregateRevision,
      backup: {
        format: "dashboard-key-value-list",
        version: 1,
        paths: [{ name: "Good", path: "/tmp/good" }, { name: "Bad", path: "relative/path" }],
        notes: [],
      },
    }, { id: "invalid-import" }));
    assert.equal(invalid.status, "error");
    assert.equal(invalid.error.code, "INVALID_PAYLOAD");
    const after = await engine.handle(request("dashboard.snapshot.get", {}, { id: "after" }));
    assert.equal(after.payload.aggregateRevision, before.payload.aggregateRevision);
    assert.deepEqual(after.payload.paths, before.payload.paths);
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});
