import test from "node:test";
import assert from "node:assert/strict";
import {
  assertAggregate,
  createInitialAggregate,
  deleteNote,
  deletePath,
  deleteProject,
  upsertNote,
  upsertPath,
  upsertProject,
} from "../../src/domain/dashboard-aggregate.mjs";

const times = [
  "2026-07-27T00:00:00.000Z",
  "2026-07-27T00:00:01.000Z",
  "2026-07-27T00:00:02.000Z",
  "2026-07-27T00:00:03.000Z",
  "2026-07-27T00:00:04.000Z",
  "2026-07-27T00:00:05.000Z",
  "2026-07-27T00:00:06.000Z",
];

function ids() {
  let value = 0;
  return (prefix) => `${prefix}-${++value}`;
}

test("path, note and project CRUD increments exactly one aggregate revision", () => {
  const idFactory = ids();
  let state = createInitialAggregate({ now: times[0], projects: [], idFactory });
  const pathResult = upsertPath(state, {
    expectedRevision: 0,
    item: { name: " Workspace ", path: "/tmp/workspace/", group: " Dev ", description: " Root ", pinned: false },
  }, { now: times[1], idFactory });
  state = pathResult.state;
  assert.equal(state.aggregateRevision, 1);
  assert.equal(pathResult.item.name, "Workspace");
  assert.equal(pathResult.item.group, "Dev");

  const noteResult = upsertNote(state, {
    expectedRevision: 1,
    item: { title: "Command", content: "npm start", pinned: true },
  }, { now: times[2], idFactory });
  state = noteResult.state;
  assert.equal(state.aggregateRevision, 2);

  const projectResult = upsertProject(state, {
    expectedRevision: 2,
    item: {
      name: "Dashboard",
      type: "engine",
      label: "Engine",
      description: "Catalog",
      path: "/tmp/dashboard",
      url: "http://127.0.0.1:4173",
      port: 4173,
      command: "npm start",
      tags: ["EngineMessage"],
      pinned: false,
    },
  }, { now: times[3], idFactory });
  state = projectResult.state;
  assert.equal(state.aggregateRevision, 3);
  assert.equal(projectResult.item.command, "npm start");

  state = deletePath(state, { id: pathResult.item.id, expectedRevision: 3 }, { now: times[4] }).state;
  state = deleteNote(state, { id: noteResult.item.id, expectedRevision: 4 }, { now: times[5] }).state;
  state = deleteProject(state, { id: projectResult.item.id, expectedRevision: 5 }, { now: times[6] }).state;
  assert.equal(state.aggregateRevision, 6);
  assert.deepEqual([state.paths, state.notes, state.projects], [[], [], []]);
});

test("revision conflict and normalized duplicate path never mutate the source aggregate", () => {
  const idFactory = ids();
  const initial = createInitialAggregate({ now: times[0], projects: [], idFactory });
  const first = upsertPath(initial, {
    expectedRevision: 0,
    item: { name: "A", path: "/TMP/Folder/", group: "G", description: "", pinned: false },
  }, { now: times[1], idFactory }).state;

  assert.throws(() => upsertPath(first, {
    expectedRevision: 0,
    item: { name: "B", path: "/tmp/other", group: "G", description: "", pinned: false },
  }, { now: times[2], idFactory }), (error) => error.code === "DASHBOARD_REVISION_CONFLICT");

  assert.throws(() => upsertPath(first, {
    expectedRevision: 1,
    item: { name: "Duplicate", path: "/tmp//folder", group: "G", description: "", pinned: false },
  }, { now: times[2], idFactory }), (error) => error.code === "DASHBOARD_PATH_ALREADY_EXISTS");
  assert.equal(first.paths.length, 1);
  assert.equal(first.aggregateRevision, 1);
});

test("stored aggregate validation rejects missing, noncanonical and time-reversed fields", () => {
  const state = createInitialAggregate({ now: times[0], projects: [], idFactory: ids() });
  const missing = structuredClone(state);
  missing.paths = [{ id: "path-one", name: "A", path: "/tmp/a" }];
  assert.throws(() => assertAggregate(missing), (error) => error.code === "DASHBOARD_STATE_CORRUPT");

  const noncanonical = structuredClone(state);
  noncanonical.paths = [{
    id: "path-one", name: " A ", path: "/tmp/a", group: "G", description: "", pinned: false,
    createdAt: times[0], updatedAt: times[0],
  }];
  assert.throws(() => assertAggregate(noncanonical), (error) => error.code === "DASHBOARD_STATE_CORRUPT");

  const reversed = structuredClone(state);
  reversed.updatedAt = "2026-07-26T23:59:59.000Z";
  assert.throws(() => assertAggregate(reversed), (error) => error.code === "DASHBOARD_STATE_CORRUPT");
});

test("project URL accepts HTTP(S) data but rejects executable schemes", () => {
  const state = createInitialAggregate({ now: times[0], projects: [], idFactory: ids() });
  assert.throws(() => upsertProject(state, {
    expectedRevision: 0,
    item: {
      name: "Unsafe", type: "other", label: "Other", description: "", path: "/tmp/unsafe",
      url: "javascript:alert(1)", port: 0, command: "", tags: [], pinned: false,
    },
  }, { now: times[1], idFactory: ids() }), (error) => error.code === "INVALID_PAYLOAD");
});
