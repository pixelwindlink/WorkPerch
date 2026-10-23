import path from "node:path";

export function parseCFHdrop(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 20) return [];
  const pFiles = buffer.readUInt32LE(0);
  const fWide = buffer.readUInt32LE(16) !== 0;
  if (pFiles >= buffer.length) return [];
  if (fWide) {
    const paths = [];
    let index = pFiles;
    while (index < buffer.length - 1) {
      const start = index;
      while (index < buffer.length - 1 && !(buffer[index] === 0 && buffer[index + 1] === 0)) index += 2;
      if (index > start) {
        const value = buffer.subarray(start, index).toString("utf16le");
        if (value) paths.push(value);
      }
      index += 2;
      if (index < buffer.length - 1 && buffer[index] === 0 && buffer[index + 1] === 0) break;
    }
    return paths;
  }
  return buffer
    .subarray(pFiles)
    .toString("latin1")
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildCFHdrop(filePaths) {
  const resolved = filePaths
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => path.win32.normalize(entry.trim()));
  if (!resolved.length) return null;
  const header = Buffer.alloc(20);
  header.writeUInt32LE(20, 0);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(1, 16);
  const body = Buffer.from(`${resolved.join("\0")}\0\0`, "utf16le");
  return Buffer.concat([header, body]);
}
