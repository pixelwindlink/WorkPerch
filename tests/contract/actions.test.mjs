import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createDashboardEngine } from "../../src/composition/create-dashboard-engine.mjs";
import { loadContractRegistry } from "../../src/inbound/contract-registry.mjs";
import { errorResponse } from "../../src/inbound/dispatcher.mjs";
import { validateJsonSchema } from "../../src/inbound/json-schema-validator.mjs";
import { DASHBOARD_ROOT, GENERIC_ENGINES_ROOT, removeRuntime, request, tempRuntime } from "../helpers.mjs";

function assertValid(schema, value, label) {
  const errors = validateJsonSchema(schema, value);
  assert.deepEqual(errors, [], `${label}: ${errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
}

class FakeLauncherClient {
  constructor() {
    this.revision = 0;
    this.definitions = [];
    this.runs = [];
    this.messages = [];
  }

  async send(message) {
    this.messages.push(structuredClone(message));
    const now = "2026-07-27T00:00:00.000Z";
    let payload;
    if (message.action === "launcher.definition.upsert") {
      const definition = { ...message.payload.item, createdAt: now, updatedAt: now };
      this.definitions = [definition];
      this.revision += 1;
      payload = { aggregateRevision: this.revision, item: definition };
    } else if (message.action === "launcher.project.start") {
      const run = { runId: "run-contract", projectId: message.payload.projectId, status: "running", pid: 9001, startedAt: now, endedAt: null, exitCode: null };
      this.runs.push(run);
      this.revision += 1;
      payload = { run };
    } else if (message.action === "launcher.project.stop") {
      const current = this.runs.at(-1);
      const run = { ...current, status: "stopped", endedAt: now, exitCode: 0 };
      this.runs[this.runs.length - 1] = run;
      this.revision += 1;
      payload = { run };
    } else if (message.action === "launcher.runtime.get") {
      payload = { aggregateRevision: this.revision, definitions: this.definitions, runs: this.runs };
    } else {
      throw new Error(`Unexpected Launcher Action ${message.action}`);
    }
    return { ...message, kind: "response", status: "ok", payload };
  }
}

test("every declared Action uses its canonical request and success Schema", async () => {
  const runtimeDir = await tempRuntime("dashboard-contract-");
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const launcher = new FakeLauncherClient();
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT, engineClient: launcher });
  await engine.start();
  try {
    assert.equal(contracts.actions.size, 28);
    const seen = new Set();
    async function invoke(action, payload) {
      const contract = contracts.actions.get(action);
      assert.ok(contract, `missing contract for ${action}`);
      assertValid(contract.request.schema, payload, `${action} request`);
      const response = await engine.handle(request(action, payload, { id: `contract-${seen.size}` }));
      assert.equal(response.status, "ok", JSON.stringify(response));
      assertValid(contract.success.schema, response.payload, `${action} success`);
      assertValid(contracts.envelope.schema, response, `${action} envelope`);
      seen.add(action);
      return response.payload;
    }

    await invoke("engine.describe", {});
    await invoke("system.health", {});
    const snapshot = await invoke("dashboard.snapshot.get", {});
    const tagUpsert = await invoke("dashboard.tag.upsert", {
      expectedRevision: snapshot.aggregateRevision,
      item: { name: "Contract Tag", color: "#38BDF8" },
    });
    const groupUpsert = await invoke("dashboard.group.upsert", {
      expectedRevision: tagUpsert.aggregateRevision,
      item: { name: "Contract Group", color: "#A855F7" },
    });
    const pathUpsert = await invoke("dashboard.path.upsert", {
      expectedRevision: groupUpsert.aggregateRevision,
      item: { name: "Contract Path", path: "/tmp/contract-path", groupId: groupUpsert.item.id, group: groupUpsert.item.name, description: "", pinned: false },
    });
    const inspected = await invoke("dashboard.path.inspect", { kind: "path", id: pathUpsert.item.id, expectedRevision: pathUpsert.aggregateRevision });
    const refreshed = await invoke("dashboard.path.refresh-all", { expectedRevision: inspected.aggregateRevision });
    await invoke("dashboard.path.preflight", { paths: ["/tmp", "/tmp"] });
    const batch = await invoke("dashboard.path.batch-upsert", {
      expectedRevision: refreshed.aggregateRevision,
      items: [{
        target: "path",
        inspection: { status: "missing", kind: "unknown", gitRoot: false, projectType: "", suggestedName: "contract-batch", checkedAt: "2026-07-27T00:00:00.000Z" },
        item: { name: "Contract Batch", path: "/tmp/contract-batch", tagIds: [], description: "", pinned: false },
      }],
    });
    const repaired = await invoke("dashboard.path.repair", { id: batch.items[0].id, path: "/private/tmp", expectedRevision: batch.aggregateRevision });
    const noteUpsert = await invoke("dashboard.note.upsert", {
      expectedRevision: repaired.aggregateRevision,
      item: { title: "Contract Note", content: "value", pinned: false },
    });
    const projectUpsert = await invoke("dashboard.project.upsert", {
      expectedRevision: noteUpsert.aggregateRevision,
      item: {
        name: "Contract Project", type: "other", label: "Other", description: "", path: "/tmp/contract-project",
        url: "", port: 0, command: "echo inert", tags: ["contract"], pinned: false,
      },
    });
    const usage = await invoke("dashboard.entry.usage.record", { kind: "path", id: pathUpsert.item.id });
    const viewUpsert = await invoke("dashboard.view.upsert", {
      expectedRevision: usage.aggregateRevision,
      item: { name: "Contract View", scope: "all", query: "contract", tagIds: [tagUpsert.item.id], pathStatus: "any", sort: "smart" },
    });
    await invoke("dashboard.project.probe", { projectIds: [projectUpsert.item.id], timeoutMs: 100 });
    await invoke("dashboard.project.launch.configure", { projectId: projectUpsert.item.id, expectedLauncherRevision: 0, executable: "npm", args: ["run", "dev"] });
    await invoke("dashboard.project.launch.start", { projectId: projectUpsert.item.id });
    await invoke("dashboard.project.launch.status", { projectIds: [projectUpsert.item.id] });
    await invoke("dashboard.project.launch.stop", { projectId: projectUpsert.item.id });
    assert.equal(launcher.messages.every((message) => message.engine === "project-launcher" && message.protocol === "generic-engines/engine-message"), true);
    assert.equal(launcher.messages[0].payload.item.cwd, projectUpsert.item.path);
    const exported = await invoke("dashboard.backup.export", {});
    await invoke("dashboard.backup.import", { backup: exported.backup, mode: "merge", dryRun: true });
    const viewDelete = await invoke("dashboard.view.delete", { id: viewUpsert.item.id, expectedRevision: viewUpsert.aggregateRevision });
    const tagDelete = await invoke("dashboard.tag.delete", { id: tagUpsert.item.id, expectedRevision: viewDelete.aggregateRevision });
    const repairedDelete = await invoke("dashboard.path.delete", { id: repaired.item.id, expectedRevision: tagDelete.aggregateRevision });
    const pathDelete = await invoke("dashboard.path.delete", { id: pathUpsert.item.id, expectedRevision: repairedDelete.aggregateRevision });
    const groupDelete = await invoke("dashboard.group.delete", { id: groupUpsert.item.id, expectedRevision: pathDelete.aggregateRevision });
    const noteDelete = await invoke("dashboard.note.delete", { id: noteUpsert.item.id, expectedRevision: groupDelete.aggregateRevision });
    await invoke("dashboard.project.delete", { id: projectUpsert.item.id, expectedRevision: noteDelete.aggregateRevision });
    assert.deepEqual([...seen].sort(), [...contracts.actions.keys()].sort());
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("Launcher Actions return dependency unavailable when no EngineClient is injected", async () => {
  const runtimeDir = await tempRuntime("dashboard-launcher-unavailable-");
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await engine.start();
  try {
    const initial = await engine.handle(request("dashboard.snapshot.get", {}, { id: "launcher-unavailable-initial" }));
    const project = await engine.handle(request("dashboard.project.upsert", {
      expectedRevision: initial.payload.aggregateRevision,
      item: { name: "Unavailable", type: "other", label: "Other", description: "", path: "/tmp/unavailable", url: "", port: 0, command: "", pinned: false },
    }, { id: "launcher-unavailable-project" }));
    const response = await engine.handle(request("dashboard.project.launch.start", { projectId: project.payload.item.id }, { id: "launcher-unavailable-start" }));
    assert.equal(response.status, "error");
    assert.equal(response.error.code, "DEPENDENCY_UNAVAILABLE");
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("strict v1 envelope and structured errors remain mutually exclusive", async () => {
  const runtimeDir = await tempRuntime("dashboard-envelope-");
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await engine.start();
  try {
    const withMetadata = { ...request("dashboard.snapshot.get"), metadata: { trace: "forbidden" } };
    assert.notEqual(validateJsonSchema(contracts.envelope.schema, withMetadata).length, 0);
    const metadataResponse = await engine.handle(withMetadata);
    assert.equal(metadataResponse.status, "error");
    assert.equal(metadataResponse.error.code, "INVALID_PAYLOAD");

    const wrongEngine = await engine.handle(request("engine.describe", {}, { engine: "other-engine", id: "wrong-engine" }));
    assert.equal(wrongEngine.error.code, "WRONG_ENGINE");
    assert.equal(wrongEngine.engine, "other-engine");

    const unsupported = await engine.handle(request("dashboard.unsupported", {}, { id: "unsupported" }));
    assert.equal(unsupported.error.code, "UNSUPPORTED_ACTION");

    const invalidPayload = await engine.handle(request("dashboard.path.upsert", { expectedRevision: 0, item: {} }, { id: "invalid-payload" }));
    assert.equal(invalidPayload.error.code, "INVALID_PAYLOAD");

    for (const response of [metadataResponse, wrongEngine, unsupported, invalidPayload]) {
      assertValid(contracts.envelope.schema, response, response.id);
      assert.equal(Object.hasOwn(response, "payload"), false);
      assert.equal(Object.hasOwn(response, "error"), true);
    }
    const success = await engine.handle(request("engine.describe", {}, { id: "success" }));
    assert.equal(Object.hasOwn(success, "payload"), true);
    assert.equal(Object.hasOwn(success, "error"), false);
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("all Action and state object Schemas close additional properties", async () => {
  const files = [
    ...(await fs.readdir(path.join(DASHBOARD_ROOT, "contracts/actions"))).map((name) => path.join(DASHBOARD_ROOT, "contracts/actions", name)),
    path.join(DASHBOARD_ROOT, "contracts/state/dashboard-state.schema.json"),
  ];
  function inspect(schema, location, failures) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
    if (schema.type === "object" && schema.additionalProperties !== false) failures.push(location);
    for (const [name, child] of Object.entries(schema.properties || {})) inspect(child, `${location}.properties.${name}`, failures);
    if (schema.items) inspect(schema.items, `${location}.items`, failures);
    for (const keyword of ["oneOf", "anyOf", "allOf"]) (schema[keyword] || []).forEach((child, index) => inspect(child, `${location}.${keyword}[${index}]`, failures));
  }
  for (const file of files) {
    const schema = JSON.parse(await fs.readFile(file, "utf8"));
    const failures = [];
    inspect(schema, path.basename(file), failures);
    assert.deepEqual(failures, []);
  }
});

test("standard and domain error codes produce legal EngineMessage responses", async () => {
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const codes = [
    "DASHBOARD_ITEM_NOT_FOUND", "DASHBOARD_REVISION_CONFLICT", "DASHBOARD_IMPORT_INVALID", "DASHBOARD_IMPORT_REJECTED",
    "DASHBOARD_GROUP_ALREADY_EXISTS", "DASHBOARD_GROUP_IN_USE", "DASHBOARD_TAG_ALREADY_EXISTS", "DASHBOARD_TAG_IN_USE", "DASHBOARD_VIEW_ALREADY_EXISTS", "DASHBOARD_STATE_CORRUPT", "DASHBOARD_PROBE_FORBIDDEN", "STATE_OWNERSHIP_CONFLICT", "INVALID_PAYLOAD",
    "DEPENDENCY_UNAVAILABLE", "LAUNCHER_REVISION_CONFLICT", "LAUNCHER_DEFINITION_INVALID", "LAUNCHER_PROJECT_RUNNING",
    "LAUNCHER_CWD_UNAVAILABLE", "LAUNCHER_START_FAILED", "LAUNCHER_ITEM_NOT_FOUND", "LAUNCHER_PROCESS_NOT_OWNED", "LAUNCHER_STOP_FAILED", "LAUNCHER_STATE_CORRUPT",
    "UNSUPPORTED_ACTION", "INTERNAL_ERROR",
  ];
  for (const code of codes) {
    const response = errorResponse(request("dashboard.snapshot.get", {}, { id: code.toLowerCase() }), code, `${code} test`);
    assertValid(contracts.envelope.schema, response, code);
  }
  assertValid(contracts.envelope.schema, errorResponse(null, "INVALID_PAYLOAD", "invalid transport input"), "null request fallback");
});
