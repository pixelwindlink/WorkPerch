import {
  deleteGroup,
  deleteNote,
  deletePath,
  deleteProject,
  deleteSavedView,
  deleteTag,
  batchUpsertEntries,
  planPathCandidates,
  recordEntryUsage,
  repairPath,
  refreshAllPathInspections,
  setEntryInspection,
  snapshotOf,
  upsertGroup,
  upsertNote,
  upsertPath,
  upsertProject,
  upsertSavedView,
  upsertTag
} from "../domain/perch-aggregate.mjs";
import { exportBackup, planBackupImport } from "../domain/backup.mjs";
import { perchError } from "../domain/errors.mjs";

export class PerchApplication {
  constructor({ repository, clock, idGenerator, endpointProbe, pathInspector, engineClient = null }) {
    this.repository = repository;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.endpointProbe = endpointProbe;
    this.pathInspector = pathInspector;
    this.engineClient = engineClient;
    this.writeTail = Promise.resolve();
  }

  idFactory = (prefix) => this.idGenerator.next(prefix);

  async #write(operation) {
    let release;
    const previous = this.writeTail;
    this.writeTail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async snapshot(payload) {
    const state = await this.repository.load();
    return snapshotOf(state);
  }

  async groupUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertGroup(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async groupDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deleteGroup(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async tagUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertTag(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async tagDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deleteTag(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async pathUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertPath(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async pathDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deletePath(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async pathInspect(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const collection = payload.kind === "project" ? current.projects : current.paths;
      const item = collection.find((candidate) => candidate.id === payload.id);
      if (!item) throw perchError("PERCH_ITEM_NOT_FOUND", `${payload.kind} ${payload.id} 不存在。`);
      const { path: _path, ...inspection } = await this.pathInspector.inspect(item.path);
      const result = setEntryInspection(current, { ...payload, inspection }, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, kind: payload.kind, id: payload.id, inspection: result.item.inspection };
    });
  }

  async pathRefreshAll(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const now = this.clock.now();
      if (current.paths.length === 0) {
        const empty = refreshAllPathInspections(current, { expectedRevision: payload.expectedRevision, inspections: [] }, { now });
        await this.repository.save(empty.state);
        return {
          aggregateRevision: empty.state.aggregateRevision,
          checkedAt: now,
          summary: { total: 0, available: 0, missing: 0, denied: 0, invalid: 0 },
          items: [],
        };
      }
      const inspected = [];
      const batchSize = 50;
      for (let offset = 0; offset < current.paths.length; offset += batchSize) {
        const slice = current.paths.slice(offset, offset + batchSize);
        const batch = await this.pathInspector.inspectMany(slice.map((item) => item.path));
        for (let index = 0; index < slice.length; index += 1) {
          const { path: _path, ...inspection } = batch[index];
          inspected.push({ id: slice[index].id, inspection });
        }
      }
      const result = refreshAllPathInspections(current, { expectedRevision: payload.expectedRevision, inspections: inspected }, { now });
      await this.repository.save(result.state);
      const summary = { total: result.items.length, available: 0, missing: 0, denied: 0, invalid: 0 };
      for (const item of result.items) {
        if (summary[item.inspection.status] !== undefined) summary[item.inspection.status] += 1;
      }
      return {
        aggregateRevision: result.state.aggregateRevision,
        checkedAt: now,
        summary,
        items: result.items,
      };
    });
  }

  async pathPreflight(payload) {
    const current = await this.repository.load();
    const inspections = await this.pathInspector.inspectMany(payload.paths);
    return { checkedAt: this.clock.now(), candidates: planPathCandidates(current, inspections) };
  }

  async pathBatchCommit(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = batchUpsertEntries(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, items: result.items };
    });
  }

  async pathRepair(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const inspected = await this.pathInspector.inspect(payload.path);
      if (inspected.status !== "available") throw perchError("PERCH_PATH_UNAVAILABLE", `新路径当前状态为 ${inspected.status}。`);
      const { path: _path, ...inspection } = inspected;
      const result = repairPath(current, { ...payload, inspection }, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async noteUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertNote(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async noteDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deleteNote(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async projectUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertProject(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async projectDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deleteProject(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async projectProbe(payload) {
    const state = await this.repository.load();
    const selected = payload.projectIds
      ? payload.projectIds.map((id) => {
          const project = state.projects.find((item) => item.id === id);
          if (!project) throw perchError("PERCH_ITEM_NOT_FOUND", `项目 ${id} 不存在。`);
          return project;
        })
      : state.projects;
    const results = await this.endpointProbe.probe(selected, { timeoutMs: payload.timeoutMs || 1200 });
    return { checkedAt: this.clock.now(), results };
  }

  #projectById(state, projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw perchError("PERCH_ITEM_NOT_FOUND", `项目 ${projectId} 不存在。`);
    return project;
  }

  async #sendToLauncher(action, payload) {
    if (!this.engineClient || typeof this.engineClient.send !== "function") {
      throw perchError("DEPENDENCY_UNAVAILABLE", "Project Launcher 当前未接入 Perch。");
    }
    const message = {
      protocol: "generic-engines/engine-message",
      version: "1.0",
      kind: "request",
      id: this.idGenerator.next("launcher-message"),
      engine: "project-launcher",
      action,
      payload
    };
    let response;
    try {
      response = await this.engineClient.send(message);
    } catch (error) {
      throw perchError("DEPENDENCY_UNAVAILABLE", `Project Launcher 调用失败：${String(error?.message || error).slice(0, 300)}`);
    }
    if (!response || response.kind !== "response" || response.id !== message.id || response.engine !== message.engine || response.action !== message.action) {
      throw perchError("DEPENDENCY_UNAVAILABLE", "Project Launcher 返回了无法关联的响应。");
    }
    if (response.status === "error") {
      throw perchError(response.error?.code || "DEPENDENCY_UNAVAILABLE", response.error?.message || "Project Launcher 请求失败。");
    }
    if (response.status !== "ok" || !response.payload || typeof response.payload !== "object") {
      throw perchError("DEPENDENCY_UNAVAILABLE", "Project Launcher 返回了无效响应。");
    }
    return response.payload;
  }

  async projectLaunchConfigure(payload) {
    const state = await this.repository.load();
    const project = this.#projectById(state, payload.projectId);
    const result = await this.#sendToLauncher("launcher.definition.upsert", {
      expectedRevision: payload.expectedLauncherRevision,
      item: {
        projectId: project.id,
        cwd: project.path,
        executable: payload.executable,
        args: payload.args
      }
    });
    return { projectId: project.id, launcherRevision: result.aggregateRevision, definition: result.item };
  }

  async projectLaunchStart(payload) {
    const state = await this.repository.load();
    const project = this.#projectById(state, payload.projectId);
    const result = await this.#sendToLauncher("launcher.project.start", { projectId: project.id });
    return { projectId: project.id, run: result.run };
  }

  async projectLaunchStop(payload) {
    const state = await this.repository.load();
    const project = this.#projectById(state, payload.projectId);
    const result = await this.#sendToLauncher("launcher.project.stop", { projectId: project.id });
    return { projectId: project.id, run: result.run };
  }

  async projectLaunchStatus(payload) {
    const state = await this.repository.load();
    const projectIds = payload.projectIds || state.projects.map((item) => item.id);
    projectIds.forEach((projectId) => this.#projectById(state, projectId));
    const result = await this.#sendToLauncher("launcher.runtime.get", { projectIds });
    return { launcherRevision: result.aggregateRevision, definitions: result.definitions, runs: result.runs };
  }

  async usageRecord(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = recordEntryUsage(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, kind: payload.kind, id: payload.id, usage: result.item.usage };
    });
  }

  async savedViewUpsert(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = upsertSavedView(current, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, item: result.item };
    });
  }

  async savedViewDelete(payload) {
    return this.#write(async () => {
      const current = await this.repository.load();
      const result = deleteSavedView(current, payload, { now: this.clock.now() });
      await this.repository.save(result.state);
      return { aggregateRevision: result.state.aggregateRevision, deletedId: result.deletedId };
    });
  }

  async backupExport() {
    const state = await this.repository.load();
    return { backup: exportBackup(state, this.clock.now()) };
  }

  async backupImport(payload) {
    if (payload.dryRun) {
      const state = await this.repository.load();
      const plan = planBackupImport(state, payload, { now: this.clock.now(), idFactory: this.idFactory });
      return { dryRun: true, mode: plan.mode, aggregateRevision: state.aggregateRevision, summary: plan.summary };
    }
    return this.#write(async () => {
      const state = await this.repository.load();
      const plan = planBackupImport(state, payload, { now: this.clock.now(), idFactory: this.idFactory });
      await this.repository.save(plan.candidate);
      return { dryRun: false, mode: plan.mode, aggregateRevision: plan.candidate.aggregateRevision, summary: plan.summary };
    });
  }

  handlers() {
    return new Map([
      ["perch.snapshot.get", (payload) => this.snapshot(payload)],
      ["perch.group.upsert", (payload) => this.groupUpsert(payload)],
      ["perch.group.delete", (payload) => this.groupDelete(payload)],
      ["perch.tag.upsert", (payload) => this.tagUpsert(payload)],
      ["perch.tag.delete", (payload) => this.tagDelete(payload)],
      ["perch.path.upsert", (payload) => this.pathUpsert(payload)],
      ["perch.path.delete", (payload) => this.pathDelete(payload)],
      ["perch.path.inspect", (payload) => this.pathInspect(payload)],
      ["perch.path.refresh-all", (payload) => this.pathRefreshAll(payload)],
      ["perch.path.preflight", (payload) => this.pathPreflight(payload)],
      ["perch.path.batch-upsert", (payload) => this.pathBatchCommit(payload)],
      ["perch.path.repair", (payload) => this.pathRepair(payload)],
      ["perch.note.upsert", (payload) => this.noteUpsert(payload)],
      ["perch.note.delete", (payload) => this.noteDelete(payload)],
      ["perch.project.upsert", (payload) => this.projectUpsert(payload)],
      ["perch.project.delete", (payload) => this.projectDelete(payload)],
      ["perch.project.probe", (payload) => this.projectProbe(payload)],
      ["perch.project.launch.configure", (payload) => this.projectLaunchConfigure(payload)],
      ["perch.project.launch.start", (payload) => this.projectLaunchStart(payload)],
      ["perch.project.launch.stop", (payload) => this.projectLaunchStop(payload)],
      ["perch.project.launch.status", (payload) => this.projectLaunchStatus(payload)],
      ["perch.entry.usage.record", (payload) => this.usageRecord(payload)],
      ["perch.view.upsert", (payload) => this.savedViewUpsert(payload)],
      ["perch.view.delete", (payload) => this.savedViewDelete(payload)],
      ["perch.backup.export", () => this.backupExport()],
      ["perch.backup.import", (payload) => this.backupImport(payload)]
    ]);
  }
}
