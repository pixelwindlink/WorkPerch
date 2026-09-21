import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createProjectLauncherEngine } from "../../../project-launcher/src/composition/create-project-launcher-engine.mjs";
import { LocalEngineClient } from "../../electron/local-engine-client.mjs";
import { createPerchEngine } from "../../src/composition/create-perch-engine.mjs";
import { GENERIC_ENGINES_ROOT, removeRuntime, request, tempRuntime } from "../helpers.mjs";

class FakeProcessRunner {
  constructor() { this.children = new Map(); }
  async start(_definition, { runId, onExit }) {
    this.children.set(runId, { onExit });
    return { runId, pid: 9200 + this.children.size };
  }
  async stop(runId) {
    const child = this.children.get(runId);
    if (!child) throw new Error("not owned");
    this.children.delete(runId);
    Promise.resolve(child.onExit?.({ runId, exitCode: 0 })).catch(() => {});
    return { exitCode: 0 };
  }
  async stopAll() { this.children.clear(); }
}

test("Perch and Project Launcher keep separate runtimes and communicate only by EngineMessage", async () => {
  const perchRuntime = await tempRuntime("perch-launcher-perch-");
  const launcherRuntime = await tempRuntime("perch-launcher-engine-");
  const launcher = await createProjectLauncherEngine({
    mode: "standalone",
    runtimeDir: launcherRuntime,
    genericEnginesRoot: GENERIC_ENGINES_ROOT,
    processRunner: new FakeProcessRunner()
  });
  await launcher.start();
  const engineClient = new LocalEngineClient({
    engine: launcher,
    engineId: "project-launcher",
    allowedActions: ["launcher.definition.upsert", "launcher.project.start", "launcher.project.stop", "launcher.runtime.get"]
  });
  const perch = await createPerchEngine({
    mode: "standalone",
    runtimeDir: perchRuntime,
    genericEnginesRoot: GENERIC_ENGINES_ROOT,
    engineClient
  });
  await perch.start();
  try {
    const initial = await perch.handle(request("perch.snapshot.get", {}, { id: "launcher-integration-initial" }));
    const project = await perch.handle(request("perch.project.upsert", {
      expectedRevision: initial.payload.aggregateRevision,
      item: { name: "Launch Demo", type: "application", label: "App", description: "", path: "/tmp", url: "", port: 0, command: "", pinned: false }
    }, { id: "launcher-integration-project" }));
    const projectId = project.payload.item.id;
    const configured = await perch.handle(request("perch.project.launch.configure", {
      projectId, expectedLauncherRevision: 0, executable: "node", args: ["server.mjs"]
    }, { id: "launcher-integration-configure" }));
    assert.equal(configured.payload.definition.cwd, "/tmp");
    const started = await perch.handle(request("perch.project.launch.start", { projectId }, { id: "launcher-integration-start" }));
    assert.equal(started.payload.run.status, "running");
    const status = await perch.handle(request("perch.project.launch.status", { projectIds: [projectId] }, { id: "launcher-integration-status" }));
    assert.equal(status.payload.runs.at(-1).status, "running");
    const stopped = await perch.handle(request("perch.project.launch.stop", { projectId }, { id: "launcher-integration-stop" }));
    assert.equal(stopped.payload.run.status, "stopped");
    assert.equal((await fs.stat(path.join(perchRuntime, "perch-state.json"))).isFile(), true);
    assert.equal((await fs.stat(path.join(launcherRuntime, "state", "launcher-state.json"))).isFile(), true);
    await assert.rejects(fs.access(path.join(perchRuntime, "state", "launcher-state.json")));
  } finally {
    await perch.shutdown();
    await launcher.shutdown();
    await removeRuntime(perchRuntime);
    await removeRuntime(launcherRuntime);
  }
});
