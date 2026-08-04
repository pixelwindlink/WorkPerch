import fs from "node:fs/promises";
import path from "node:path";
import { PathInspectorPort } from "../application/ports/path-inspector.mjs";

export const MAX_INSPECTION_BATCH = 50;
const MAX_PATH_LENGTH = 4096;
const MARKERS = [
  ["engine.manifest.json", "engine"],
  ["package.json", "application"],
  ["settings.gradle.kts", "application"],
  ["settings.gradle", "application"],
  ["build.gradle.kts", "application"],
  ["build.gradle", "application"],
  ["pyproject.toml", "tool"],
  ["Cargo.toml", "tool"],
];

function invalidResult(localPath, checkedAt) {
  return { path: String(localPath || ""), status: "invalid", kind: "unknown", gitRoot: false, projectType: "", suggestedName: "", checkedAt };
}

function resultForError(localPath, error, checkedAt) {
  const status = error?.code === "EACCES" || error?.code === "EPERM" ? "denied" : error?.code === "ENOENT" || error?.code === "ENOTDIR" ? "missing" : "invalid";
  return { path: localPath, status, kind: "unknown", gitRoot: false, projectType: "", suggestedName: path.basename(localPath) || localPath, checkedAt };
}

async function exists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

export class LocalPathInspector extends PathInspectorPort {
  constructor({ clock, concurrency = 6 } = {}) {
    super();
    this.clock = clock;
    this.concurrency = Math.max(1, Math.min(12, concurrency));
  }

  async inspect(localPath) {
    const checkedAt = this.clock.now();
    if (typeof localPath !== "string" || !localPath || localPath.length > MAX_PATH_LENGTH || localPath.includes("\0") || !path.isAbsolute(localPath)) {
      return invalidResult(localPath, checkedAt);
    }
    let entry;
    try {
      entry = await fs.stat(localPath);
    } catch (error) {
      return resultForError(localPath, error, checkedAt);
    }
    const kind = entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other";
    let gitRoot = false;
    let inferredType = "";
    if (kind === "directory") {
      gitRoot = await exists(path.join(localPath, ".git"));
      for (const [marker, type] of MARKERS) {
        if (await exists(path.join(localPath, marker))) {
          inferredType = type;
          break;
        }
      }
      if (!inferredType && gitRoot) inferredType = "workspace";
    }
    return {
      path: localPath,
      status: "available",
      kind,
      gitRoot,
      projectType: inferredType,
      suggestedName: path.basename(localPath) || localPath,
      checkedAt
    };
  }

  async inspectMany(paths) {
    if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_INSPECTION_BATCH) {
      throw new TypeError(`paths 必须是 1 到 ${MAX_INSPECTION_BATCH} 项的数组。`);
    }
    const results = new Array(paths.length);
    let next = 0;
    const worker = async () => {
      while (next < paths.length) {
        const index = next++;
        results[index] = await this.inspect(paths[index]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, paths.length) }, worker));
    return results;
  }
}
