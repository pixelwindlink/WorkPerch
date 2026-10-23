import fs from "node:fs";
import path from "node:path";

export function clipboardBlobDirectory(userDataDir) {
  return path.join(userDataDir, "clipboard-blobs");
}

export function imageBlobPath(userDataDir, id) {
  return path.join(clipboardBlobDirectory(userDataDir), `${id}.png`);
}

export function saveImageBlob(userDataDir, id, pngBuffer) {
  const directory = clipboardBlobDirectory(userDataDir);
  fs.mkdirSync(directory, { recursive: true });
  const target = imageBlobPath(userDataDir, id);
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, pngBuffer);
  fs.renameSync(temp, target);
  return path.relative(userDataDir, target);
}

export function readImageBlob(userDataDir, relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;
  const target = path.resolve(userDataDir, relativePath);
  const relative = path.relative(userDataDir, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  try {
    return fs.readFileSync(target);
  } catch {
    return null;
  }
}

export function deleteImageBlob(userDataDir, relativePath) {
  if (!relativePath) return;
  const target = path.resolve(userDataDir, relativePath);
  const relative = path.relative(userDataDir, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  try { fs.unlinkSync(target); } catch { /* ignore */ }
}
