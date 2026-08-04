import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { batchUpsertEntries, createInitialAggregate, planPathCandidates, repairPath } from "../../src/domain/dashboard-aggregate.mjs";
import { LocalPathInspector } from "../../src/outbound/local-path-inspector.mjs";
import { removeRuntime, tempRuntime } from "../helpers.mjs";

const times = ["2026-07-27T00:00:00.000Z", "2026-07-27T00:00:01.000Z", "2026-07-27T00:00:02.000Z"];
function idFactory(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 10)}`; }

test("LocalPathInspector recognizes bounded root metadata without reading scripts", async () => {
  const root = await tempRuntime("dashboard-inspect-");
  try {
    await fs.mkdir(path.join(root, ".git"));
    await fs.writeFile(path.join(root, "package.json"), "{ definitely not parsed }", "utf8");
    const inspector = new LocalPathInspector({ clock: { now: () => times[1] }, concurrency: 2 });
    const result = await inspector.inspect(root);
    assert.equal(result.status, "available");
    assert.equal(result.kind, "directory");
    assert.equal(result.gitRoot, true);
    assert.equal(result.projectType, "application");
    assert.equal((await inspector.inspect("relative/path")).status, "invalid");
    assert.equal((await inspector.inspect(path.join(root, "missing"))).status, "missing");
  } finally {
    await removeRuntime(root);
  }
});

test("preflight identifies existing and within-batch duplicates without mutation", () => {
  const state = createInitialAggregate({ now: times[0], projects: [], idFactory });
  const inspections = [
    { path: "/tmp/a", status: "available", kind: "directory", gitRoot: true, projectType: "workspace", suggestedName: "a", checkedAt: times[1] },
    { path: "/tmp/a/", status: "available", kind: "directory", gitRoot: true, projectType: "workspace", suggestedName: "a", checkedAt: times[1] },
  ];
  const plan = planPathCandidates(state, inspections);
  assert.equal(plan[0].suggestedTarget, "project");
  assert.equal(plan[1].duplicateOf, 0);
  assert.equal(state.aggregateRevision, 0);
});

test("preflight treats nested directories as distinct from an existing parent entry", () => {
  let state = createInitialAggregate({ now: times[0], projects: [], idFactory });
  const inspection = { status: "available", kind: "directory", gitRoot: true, projectType: "workspace", suggestedName: "app", checkedAt: times[1] };
  state = batchUpsertEntries(state, {
    expectedRevision: 0,
    items: [{ target: "project", inspection, item: { name: "[OpenSpec][app]", type: "workspace", label: "Workspace", description: "", path: "/tmp/app", url: "", port: 0, command: "", tagIds: [], pinned: false } }],
  }, { now: times[1], idFactory }).state;
  const plan = planPathCandidates(state, [
    { path: "/tmp/app/openspec", status: "available", kind: "directory", gitRoot: true, projectType: "workspace", suggestedName: "openspec", checkedAt: times[2] },
    { path: "/tmp/app", status: "available", kind: "directory", gitRoot: true, projectType: "workspace", suggestedName: "app", checkedAt: times[2] },
  ]);
  assert.equal(plan[0].existing, null);
  assert.equal(plan[1].existing?.kind, "project");
  assert.equal(plan[1].existing?.name, "[OpenSpec][app]");
  assert.equal(plan[1].existing?.path, "/tmp/app");
});

test("batch commit increments once and repair preserves identity and usage", () => {
  let state = createInitialAggregate({ now: times[0], projects: [], idFactory });
  const inspection = { status: "available", kind: "directory", gitRoot: false, projectType: "", suggestedName: "a", checkedAt: times[1] };
  const batch = batchUpsertEntries(state, {
    expectedRevision: 0,
    items: [{ target: "path", inspection, item: { name: "A", path: "/tmp/a", tagIds: [], description: "", pinned: false } }],
  }, { now: times[1], idFactory });
  state = batch.state;
  assert.equal(state.aggregateRevision, 1);
  const id = batch.items[0].id;
  const repaired = repairPath(state, { id, path: "/tmp/b", expectedRevision: 1, inspection }, { now: times[2] });
  assert.equal(repaired.item.id, id);
  assert.deepEqual(repaired.item.usage, { count: 0, lastUsedAt: null });
  assert.equal(repaired.state.aggregateRevision, 2);
});
