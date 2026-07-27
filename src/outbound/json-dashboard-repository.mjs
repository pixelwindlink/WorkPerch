import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DashboardRepositoryPort } from "../application/ports/dashboard-repository.mjs";
import { assertAggregate, createInitialAggregate } from "../domain/dashboard-aggregate.mjs";
import { dashboardError, isDashboardError } from "../domain/errors.mjs";

export class JsonDashboardRepository extends DashboardRepositoryPort {
  constructor({ runtimeDir, clock, idGenerator, seed }) {
    super();
    this.runtimeDir = runtimeDir;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.seed = seed;
    this.statePath = path.join(runtimeDir, "dashboard-state.json");
    this.backupsDir = path.join(runtimeDir, "backups");
  }

  async initialize() {
    await fs.mkdir(this.backupsDir, { recursive: true });
    try {
      await fs.access(this.statePath);
      return await this.load();
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const now = this.clock.now();
    const projects = await this.seed.projects();
    const aggregate = createInitialAggregate({ now, projects, idFactory: (prefix) => this.idGenerator.next(prefix) });
    await this.#writeAtomic(aggregate, { backup: false });
    return structuredClone(aggregate);
  }

  async load() {
    let text;
    try {
      text = await fs.readFile(this.statePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") throw dashboardError("DASHBOARD_STATE_CORRUPT", "状态文件不存在。", { cause: error });
      throw error;
    }
    try {
      const aggregate = JSON.parse(text);
      assertAggregate(aggregate);
      return structuredClone(aggregate);
    } catch (error) {
      if (isDashboardError(error)) throw error;
      throw dashboardError("DASHBOARD_STATE_CORRUPT", "状态文件不是合法 JSON。", { cause: error });
    }
  }

  async save(aggregate) {
    assertAggregate(aggregate);
    await this.#writeAtomic(aggregate, { backup: true });
    return structuredClone(aggregate);
  }

  async #writeAtomic(aggregate, { backup }) {
    await fs.mkdir(this.backupsDir, { recursive: true });
    const tempPath = path.join(this.runtimeDir, `.dashboard-state.${process.pid}.${randomUUID()}.tmp`);
    try {
      const handle = await fs.open(tempPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (backup) {
        const previous = await this.load();
        const backupPath = path.join(this.backupsDir, `revision-${String(previous.aggregateRevision).padStart(8, "0")}.json`);
        try {
          await fs.copyFile(this.statePath, backupPath, constants.COPYFILE_EXCL);
        } catch (error) {
          if (error?.code !== "EEXIST") throw error;
        }
      }
      await fs.rename(tempPath, this.statePath);
      try {
        const directory = await fs.open(this.runtimeDir, "r");
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      } catch {
        // Directory fsync is best-effort on platforms that support it.
      }
    } catch (error) {
      await fs.unlink(tempPath).catch(() => {});
      throw error;
    }
  }
}
