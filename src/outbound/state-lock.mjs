import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StateOwnershipLockPort } from "../application/ports/state-ownership-lock.mjs";
import { perchError } from "../domain/errors.mjs";

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

export class StateOwnershipLock extends StateOwnershipLockPort {
  constructor({ runtimeDir, ownerMode, clock }) {
    super();
    this.runtimeDir = runtimeDir;
    this.ownerMode = ownerMode;
    this.clock = clock;
    this.lockPath = path.join(runtimeDir, ".perch-owner.lock");
    this.token = null;
  }

  async acquire() {
    if (this.token) return;
    await fs.mkdir(this.runtimeDir, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = randomUUID();
      try {
        const handle = await fs.open(this.lockPath, "wx", 0o600);
        try {
          const record = {
            token,
            pid: process.pid,
            host: os.hostname(),
            ownerMode: this.ownerMode,
            acquiredAt: this.clock.now()
          };
          await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
          await handle.sync();
        } catch (error) {
          await fs.unlink(this.lockPath).catch(() => {});
          throw error;
        } finally {
          await handle.close().catch(() => {});
        }
        this.token = token;
        return;
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        const removed = attempt === 0 && await this.#removeConfirmedStaleLock();
        if (removed) continue;
        throw perchError("STATE_OWNERSHIP_CONFLICT", `状态目录已由其他 Perch 写入者占用：${this.runtimeDir}`);
      }
    }
  }

  async #removeConfirmedStaleLock() {
    let record;
    try {
      record = JSON.parse(await fs.readFile(this.lockPath, "utf8"));
    } catch {
      return false;
    }
    if (record.host !== os.hostname() || processIsAlive(record.pid)) return false;
    try {
      await fs.unlink(this.lockPath);
      return true;
    } catch {
      return false;
    }
  }

  isOwned() {
    return Boolean(this.token);
  }

  async release() {
    if (!this.token) return;
    try {
      const record = JSON.parse(await fs.readFile(this.lockPath, "utf8"));
      if (record.token === this.token) await fs.unlink(this.lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    } finally {
      this.token = null;
    }
  }
}
