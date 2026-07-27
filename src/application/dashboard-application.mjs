import {
  deleteGroup,
  deleteNote,
  deletePath,
  deleteProject,
  snapshotOf,
  upsertGroup,
  upsertNote,
  upsertPath,
  upsertProject
} from "../domain/dashboard-aggregate.mjs";
import { exportBackup, planBackupImport } from "../domain/backup.mjs";
import { dashboardError } from "../domain/errors.mjs";

export class DashboardApplication {
  constructor({ repository, clock, idGenerator, endpointProbe }) {
    this.repository = repository;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.endpointProbe = endpointProbe;
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
    return snapshotOf(state, payload.include || ["groups", "paths", "notes", "projects"]);
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
          if (!project) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `项目 ${id} 不存在。`);
          return project;
        })
      : state.projects;
    const results = await this.endpointProbe.probe(selected, { timeoutMs: payload.timeoutMs || 1200 });
    return { checkedAt: this.clock.now(), results };
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
      ["dashboard.snapshot.get", (payload) => this.snapshot(payload)],
      ["dashboard.group.upsert", (payload) => this.groupUpsert(payload)],
      ["dashboard.group.delete", (payload) => this.groupDelete(payload)],
      ["dashboard.path.upsert", (payload) => this.pathUpsert(payload)],
      ["dashboard.path.delete", (payload) => this.pathDelete(payload)],
      ["dashboard.note.upsert", (payload) => this.noteUpsert(payload)],
      ["dashboard.note.delete", (payload) => this.noteDelete(payload)],
      ["dashboard.project.upsert", (payload) => this.projectUpsert(payload)],
      ["dashboard.project.delete", (payload) => this.projectDelete(payload)],
      ["dashboard.project.probe", (payload) => this.projectProbe(payload)],
      ["dashboard.backup.export", () => this.backupExport()],
      ["dashboard.backup.import", (payload) => this.backupImport(payload)]
    ]);
  }
}
