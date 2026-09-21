import test from "node:test";
import assert from "node:assert/strict";
import { createInitialAggregate, upsertNote, upsertPath } from "../../src/domain/perch-aggregate.mjs";
import { exportBackup, planBackupImport } from "../../src/domain/backup.mjs";

const t0 = "2026-07-27T00:00:00.000Z";
const t1 = "2026-07-27T00:00:01.000Z";
const t2 = "2026-07-27T00:00:02.000Z";

function idFactory(prefix) { return `${prefix}-generated`; }

function populatedState() {
  let state = createInitialAggregate({ now: t0, projects: [], idFactory });
  state = upsertPath(state, { expectedRevision: 0, item: { name: "A", path: "/tmp/a", group: "G", description: "", pinned: false } }, { now: t1, idFactory }).state;
  state = upsertNote(state, { expectedRevision: 1, item: { title: "N", content: "old", pinned: false } }, { now: t2, idFactory }).state;
  return state;
}

test("legacy merge dry-run plans without changing revision or source", () => {
  const state = populatedState();
  const backup = {
    format: "perch-key-value-list",
    version: 1,
    paths: [{ id: "legacy-path", name: "A2", path: "/tmp/a", group: "G", color: "#ec4899", description: "new", pinned: true }],
    notes: [{ id: "legacy-note", title: "Imported", content: "value", pinned: false }],
  };
  const plan = planBackupImport(state, { backup, mode: "merge", dryRun: true }, { now: t2, idFactory });
  assert.equal(plan.candidate.aggregateRevision, state.aggregateRevision);
  assert.equal(plan.summary.paths.updated, 1);
  assert.equal(plan.summary.notes.added, 1);
  assert.equal(plan.candidate.paths[0].tagIds.length, 1);
  assert.equal(plan.candidate.tags.find((tag) => tag.id === plan.candidate.paths[0].tagIds[0])?.color, "#EC4899");
  assert.equal(state.paths[0].name, "A");
});

test("replace commit increments once and Engine backup round-trips", () => {
  const state = populatedState();
  const backup = exportBackup(state, t2);
  const plan = planBackupImport(state, {
    backup,
    mode: "replace",
    dryRun: false,
    expectedRevision: state.aggregateRevision,
  }, { now: t2, idFactory });
  assert.equal(plan.candidate.aggregateRevision, state.aggregateRevision + 1);
  assert.deepEqual(plan.candidate.paths, state.paths);
  assert.deepEqual(plan.candidate.notes, state.notes);
  assert.deepEqual(plan.candidate.tags, state.tags);
  assert.deepEqual(plan.candidate.savedViews, state.savedViews);
});

test("old Engine v1 backups materialize one shared Tag Registry", () => {
  const state = populatedState();
  const backup = {
    format: "perch-engine-backup",
    version: 1,
    aggregateRevision: 7,
    exportedAt: t2,
    paths: [{ id: "old-path", name: "Old", path: "/tmp/old", group: "工程", groupColor: "#FF8A00", description: "", pinned: false, createdAt: t0, updatedAt: t1 }],
    notes: [],
    projects: [],
  };
  const plan = planBackupImport(state, {
    backup,
    mode: "replace",
    dryRun: false,
    expectedRevision: state.aggregateRevision,
  }, { now: t2, idFactory });
  assert.equal(plan.candidate.tags.length, 1);
  assert.equal(plan.candidate.tags[0].color, "#FF8A00");
  assert.equal(plan.candidate.paths[0].tagIds[0], plan.candidate.tags[0].id);
});

test("invalid or duplicated backup items reject the complete import", () => {
  const state = populatedState();
  const duplicate = {
    format: "perch-key-value-list",
    version: 1,
    paths: [],
    notes: [
      { id: "note-same", title: "A", content: "1" },
      { id: "note-same", title: "B", content: "2" },
    ],
  };
  assert.throws(() => planBackupImport(state, { backup: duplicate, mode: "merge", dryRun: true }, { now: t2, idFactory }), (error) => error.code === "PERCH_IMPORT_INVALID");
  assert.equal(state.aggregateRevision, 2);
  assert.equal(state.notes.length, 1);
});

test("merge candidate invariant conflicts are reported as import rejection", () => {
  const state = populatedState();
  const backup = {
    format: "perch-key-value-list",
    version: 1,
    paths: [{ id: state.paths[0].id, name: "Different", path: "/tmp/different" }],
    notes: [],
  };
  assert.throws(() => planBackupImport(state, { backup, mode: "merge", dryRun: true }, { now: t2, idFactory }), (error) => error.code === "PERCH_IMPORT_REJECTED");
  assert.equal(state.paths.length, 1);
});
