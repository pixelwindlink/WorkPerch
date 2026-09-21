import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createPerchEngine } from "../../src/composition/create-perch-engine.mjs";
import { loadContractRegistry } from "../../src/inbound/contract-registry.mjs";
import { errorResponse } from "../../src/inbound/dispatcher.mjs";
import { validateJsonSchema } from "../../src/inbound/json-schema-validator.mjs";
import { PERCH_ROOT, GENERIC_ENGINES_ROOT, removeRuntime, request, tempRuntime } from "../helpers.mjs";

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
  const runtimeDir = await tempRuntime("perch-contract-");
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const launcher = new FakeLauncherClient();
  const engine = await createPerchEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT, engineClient: launcher });
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
    const snapshot = await invoke("perch.snapshot.get", {});
    const tagUpsert = await invoke("perch.tag.upsert", {
      expectedRevision: snapshot.aggregateRevision,
      item: { name: "Contract Tag", color: "#38BDF8" },
    });
    const groupUpsert = await invoke("perch.group.upsert", {
      expectedRevision: tagUpsert.aggregateRevision,
      item: { name: "Contract Group", color: "#A855F7" },
    });
    const pathUpsert = await invoke("perch.path.upsert", {
      expectedRevision: groupUpsert.aggregateRevision,
      item: { name: "Contract Path", path: "/tmp/contract-path", groupId: groupUpsert.item.id, group: groupUpsert.item.name, description: "", pinned: false },
    });
    const inspected = await invoke("perch.path.inspect", { kind: "path", id: pathUpsert.item.id, expectedRevision: pathUpsert.aggregateRevision });
    const refreshed = await invoke("perch.path.refresh-all", { expectedRevision: inspected.aggregateRevision });
    await invoke("perch.path.preflight", { paths: ["/tmp", "/tmp"] });
    const batch = await invoke("perch.path.batch-upsert", {
      expectedRevision: refreshed.aggregateRevision,
      items: [{
        target: "path",
        inspection: { status: "missing", kind: "unknown", gitRoot: false, projectType: "", suggestedName: "contract-batch", checkedAt: "2026-07-27T00:00:00.000Z" },
        item: { name: "Contract Batch", path: "/tmp/contract-batch", tagIds: [], description: "", pinned: false },
      }],
    });
    const repaired = await invoke("perch.path.repair", { id: batch.items[0].id, path: "/private/tmp", expectedRevision: batch.aggregateRevision });
    const noteUpsert = await invoke("perch.note.upsert", {
      expectedRevision: repaired.aggregateRevision,
      item: { title: "Contract Note", content: "value", pinned: false },
    });
    const projectUpsert = await invoke("perch.project.upsert", {
      expectedRevision: noteUpsert.aggregateRevision,
      item: {
        name: "Contract Project", type: "other", label: "Other", description: "", path: "/tmp/contract-project",
        url: "", port: 0, command: "echo inert", tags: ["contract"], pinned: false,
      },
    });
    const usage = await invoke("perch.entry.usage.record", { kind: "path", id: pathUpsert.item.id });
    const viewUpsert = await invoke("perch.view.upsert", {
      expectedRevision: usage.aggregateRevision,
      item: { name: "Contract View", scope: "all", query: "contract", tagIds: [tagUpsert.item.id], pathStatus: "any", sort: "smart" },
    });
    await invoke("perch.project.probe", { projectIds: [projectUpsert.item.id], timeoutMs: 100 });
    await invoke("perch.project.launch.configure", { projectId: projectUpsert.item.id, expectedLauncherRevision: 0, executable: "npm", args: ["run", "dev"] });
    await invoke("perch.project.launch.start", { projectId: projectUpsert.item.id });
    await invoke("perch.project.launch.status", { projectIds: [projectUpsert.item.id] });
    await invoke("perch.project.launch.stop", { projectId: projectUpsert.item.id });
    assert.equal(launcher.messages.every((message) => message.engine === "project-launcher" && message.protocol === "generic-engines/engine-message"), true);
    assert.equal(launcher.messages[0].payload.item.cwd, projectUpsert.item.path);
    const exported = await invoke("perch.backup.export", {});
    await invoke("perch.backup.import", { backup: exported.backup, mode: "merge", dryRun: true });
    const viewDelete = await invoke("perch.view.delete", { id: viewUpsert.item.id, expectedRevision: viewUpsert.aggregateRevision });
    const tagDelete = await invoke("perch.tag.delete", { id: tagUpsert.item.id, expectedRevision: viewDelete.aggregateRevision });
    const repairedDelete = await invoke("perch.path.delete", { id: repaired.item.id, expectedRevision: tagDelete.aggregateRevision });
    const pathDelete = await invoke("perch.path.delete", { id: pathUpsert.item.id, expectedRevision: repairedDelete.aggregateRevision });
    const groupDelete = await invoke("perch.group.delete", { id: groupUpsert.item.id, expectedRevision: pathDelete.aggregateRevision });
    const noteDelete = await invoke("perch.note.delete", { id: noteUpsert.item.id, expectedRevision: groupDelete.aggregateRevision });
    await invoke("perch.project.delete", { id: projectUpsert.item.id, expectedRevision: noteDelete.aggregateRevision });
    assert.deepEqual([...seen].sort(), [...contracts.actions.keys()].sort());
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("Launcher Actions return dependency unavailable when no EngineClient is injected", async () => {
  const runtimeDir = await tempRuntime("perch-launcher-unavailable-");
  const engine = await createPerchEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await engine.start();
  try {
    const initial = await engine.handle(request("perch.snapshot.get", {}, { id: "launcher-unavailable-initial" }));
    const project = await engine.handle(request("perch.project.upsert", {
      expectedRevision: initial.payload.aggregateRevision,
      item: { name: "Unavailable", type: "other", label: "Other", description: "", path: "/tmp/unavailable", url: "", port: 0, command: "", pinned: false },
    }, { id: "launcher-unavailable-project" }));
    const response = await engine.handle(request("perch.project.launch.start", { projectId: project.payload.item.id }, { id: "launcher-unavailable-start" }));
    assert.equal(response.status, "error");
    assert.equal(response.error.code, "DEPENDENCY_UNAVAILABLE");
  } finally {
    await engine.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("strict v1 envelope and structured errors remain mutually exclusive", async () => {
  const runtimeDir = await tempRuntime("perch-envelope-");
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const engine = await createPerchEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await engine.start();
  try {
    const withMetadata = { ...request("perch.snapshot.get"), metadata: { trace: "forbidden" } };
    assert.notEqual(validateJsonSchema(contracts.envelope.schema, withMetadata).length, 0);
    const metadataResponse = await engine.handle(withMetadata);
    assert.equal(metadataResponse.status, "error");
    assert.equal(metadataResponse.error.code, "INVALID_PAYLOAD");

    const wrongEngine = await engine.handle(request("engine.describe", {}, { engine: "other-engine", id: "wrong-engine" }));
    assert.equal(wrongEngine.error.code, "WRONG_ENGINE");
    assert.equal(wrongEngine.engine, "other-engine");

    const unsupported = await engine.handle(request("perch.unsupported", {}, { id: "unsupported" }));
    assert.equal(unsupported.error.code, "UNSUPPORTED_ACTION");

    const invalidPayload = await engine.handle(request("perch.path.upsert", { expectedRevision: 0, item: {} }, { id: "invalid-payload" }));
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
    ...(await fs.readdir(path.join(PERCH_ROOT, "contracts/actions"))).map((name) => path.join(PERCH_ROOT, "contracts/actions", name)),
    path.join(PERCH_ROOT, "contracts/state/perch-state.schema.json"),
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
    "PERCH_ITEM_NOT_FOUND", "PERCH_REVISION_CONFLICT", "PERCH_IMPORT_INVALID", "PERCH_IMPORT_REJECTED",
    "PERCH_GROUP_ALREADY_EXISTS", "PERCH_GROUP_IN_USE", "PERCH_TAG_ALREADY_EXISTS", "PERCH_TAG_IN_USE", "PERCH_VIEW_ALREADY_EXISTS", "PERCH_STATE_CORRUPT", "PERCH_PROBE_FORBIDDEN", "STATE_OWNERSHIP_CONFLICT", "INVALID_PAYLOAD",
    "DEPENDENCY_UNAVAILABLE", "LAUNCHER_REVISION_CONFLICT", "LAUNCHER_DEFINITION_INVALID", "LAUNCHER_PROJECT_RUNNING",
    "LAUNCHER_CWD_UNAVAILABLE", "LAUNCHER_START_FAILED", "LAUNCHER_ITEM_NOT_FOUND", "LAUNCHER_PROCESS_NOT_OWNED", "LAUNCHER_STOP_FAILED", "LAUNCHER_STATE_CORRUPT",
    "UNSUPPORTED_ACTION", "INTERNAL_ERROR",
  ];
  for (const code of codes) {
    const response = errorResponse(request("perch.snapshot.get", {}, { id: code.toLowerCase() }), code, `${code} test`);
    assertValid(contracts.envelope.schema, response, code);
  }
  assertValid(contracts.envelope.schema, errorResponse(null, "INVALID_PAYLOAD", "invalid transport input"), "null request fallback");
});
