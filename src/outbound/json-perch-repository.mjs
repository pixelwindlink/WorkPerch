import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PerchRepositoryPort } from "../application/ports/perch-repository.mjs";
import { assertAggregate, createInitialAggregate, migrateAggregateToV2 } from "../domain/perch-aggregate.mjs";
import { perchError, isPerchError } from "../domain/errors.mjs";

export class JsonPerchRepository extends PerchRepositoryPort {
  constructor({ runtimeDir, clock, idGenerator, seed }) {
    super();
    this.runtimeDir = runtimeDir;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.seed = seed;
    this.statePath = path.join(runtimeDir, "perch-state.json");
    this.backupsDir = path.join(runtimeDir, "backups");
  }

  async initialize() {
    await fs.mkdir(this.backupsDir, { recursive: true });
    try {
      await fs.access(this.statePath);
      const current = await this.#readRaw();
      const migration = migrateAggregateToV2(current, {
        now: this.clock.now(),
        idFactory: (prefix) => this.idGenerator.next(prefix)
      });
      if (!migration.changed) return structuredClone(migration.state);
      await this.#writeAtomic(migration.state, { backup: true, previous: current });
      return structuredClone(migration.state);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const legacyPath = path.join(this.runtimeDir, "dashboard-state.json");
    try {
      await fs.access(legacyPath);
      const legacyText = await fs.readFile(legacyPath, "utf8");
      const legacyCurrent = JSON.parse(legacyText);
      const legacyMigration = migrateAggregateToV2(legacyCurrent, {
        now: this.clock.now(),
        idFactory: (prefix) => this.idGenerator.next(prefix)
      });
      assertAggregate(legacyMigration.state);
      // No previous perch-state.json exists, so do not ask for a revision backup of it.
      // The legacy file itself is retained as recovery evidence.
      await this.#writeAtomic(legacyMigration.state, { backup: false });
      return structuredClone(legacyMigration.state);
    } catch (legacyError) {
      if (legacyError?.code === "ENOENT") {
        // No legacy state; proceed with first-run seed.
      } else if (isPerchError(legacyError)) {
        throw legacyError;
      } else {
        throw perchError("PERCH_STATE_CORRUPT", "旧状态文件 dashboard-state.json 无法迁移到 perch-state.json。", { cause: legacyError });
      }
    }
    const now = this.clock.now();
    const projects = await this.seed.projects();
    const aggregate = createInitialAggregate({ now, projects, idFactory: (prefix) => this.idGenerator.next(prefix) });
    await this.#writeAtomic(aggregate, { backup: false });
    return structuredClone(aggregate);
  }

  async load() {
    const aggregate = await this.#readRaw();
    try {
      assertAggregate(aggregate);
      return structuredClone(aggregate);
    } catch (error) {
      if (isPerchError(error)) throw error;
      throw perchError("PERCH_STATE_CORRUPT", "状态文件不是合法 Perch 状态。", { cause: error });
    }
  }

  async #readRaw() {
    let text;
    try {
      text = await fs.readFile(this.statePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") throw perchError("PERCH_STATE_CORRUPT", "状态文件不存在。", { cause: error });
      throw error;
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw perchError("PERCH_STATE_CORRUPT", "状态文件不是合法 JSON。", { cause: error });
    }
  }

  async save(aggregate) {
    assertAggregate(aggregate);
    await this.#writeAtomic(aggregate, { backup: true });
    return structuredClone(aggregate);
  }

  async #writeAtomic(aggregate, { backup, previous = null }) {
    await fs.mkdir(this.backupsDir, { recursive: true });
    const tempPath = path.join(this.runtimeDir, `.perch-state.${process.pid}.${randomUUID()}.tmp`);
    try {
      const handle = await fs.open(tempPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (backup) {
        const previousState = previous || await this.load();
        const backupPath = path.join(this.backupsDir, `revision-${String(previousState.aggregateRevision).padStart(8, "0")}.json`);
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
