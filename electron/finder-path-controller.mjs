import fs from "node:fs/promises";
import path from "node:path";

export const MAX_FINDER_PATH_LENGTH = 4_096;

export class FinderPathError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FinderPathError";
    this.code = code;
  }
}

export function assertFinderPath(value) {
  if (typeof value !== "string" || !value || value.length > MAX_FINDER_PATH_LENGTH || value.includes("\0")) {
    throw new FinderPathError("INVALID_FINDER_PATH", "本机路径格式无效。");
  }
  if (!path.isAbsolute(value)) {
    throw new FinderPathError("INVALID_FINDER_PATH", "只能在访达中打开绝对路径。");
  }
  return value;
}

function mapStatError(error) {
  if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
    return new FinderPathError("FINDER_PATH_NOT_FOUND", "路径不存在或已经被移动。");
  }
  if (error?.code === "EACCES" || error?.code === "EPERM") {
    return new FinderPathError("FINDER_PATH_ACCESS_DENIED", "没有权限访问该路径。");
  }
  return new FinderPathError("FINDER_PATH_UNAVAILABLE", "无法读取该本机路径。");
}

export async function openPathInFinder(value, {
  stat = fs.stat,
  openDirectory,
  showItemInFolder,
} = {}) {
  const localPath = assertFinderPath(value);
  if (typeof openDirectory !== "function" || typeof showItemInFolder !== "function") {
    throw new FinderPathError("FINDER_UNAVAILABLE", "访达打开能力不可用。");
  }

  let entry;
  try {
    entry = await stat(localPath);
  } catch (error) {
    throw mapStatError(error);
  }

  if (entry.isDirectory()) {
    const errorMessage = await openDirectory(localPath);
    if (errorMessage) {
      throw new FinderPathError("FINDER_OPEN_FAILED", "访达无法打开该目录。");
    }
    return { ok: true, kind: "directory" };
  }

  showItemInFolder(localPath);
  return { ok: true, kind: entry.isFile() ? "file" : "entry" };
}
