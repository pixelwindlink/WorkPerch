import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseDarwinFilenamesBuffer(buffer) {
  if (!buffer?.length) return [];
  const prefix = buffer.subarray(0, 12).toString("utf8");
  if (prefix.includes("<?xml") || prefix.includes("<plist")) {
    const xml = buffer.toString("utf8");
    const paths = [];
    for (const match of xml.matchAll(/<string>([^<]+)<\/string>/g)) {
      const value = match[1];
      if (path.isAbsolute(value)) paths.push(value);
    }
    return paths;
  }
  const tmp = path.join(os.tmpdir(), `perch-clip-${process.pid}-${Date.now()}.plist`);
  try {
    fs.writeFileSync(tmp, buffer);
    const json = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", tmp], { encoding: "utf8" });
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === "string" && path.isAbsolute(entry));
  } catch {
    return [];
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

export function readDarwinClipboardFilePaths(clipboard) {
  const formats = clipboard.availableFormats?.() || [];
  if (!formats.includes("NSFilenamesPboardType")) return [];
  try {
    return parseDarwinFilenamesBuffer(clipboard.readBuffer("NSFilenamesPboardType"));
  } catch {
    return [];
  }
}

export function writeDarwinClipboardFilePaths(clipboard, filePaths) {
  const paths = filePaths.filter((entry) => typeof entry === "string" && path.isAbsolute(entry));
  if (!paths.length) return false;
  const tmpJson = path.join(os.tmpdir(), `perch-clip-write-${process.pid}-${Date.now()}.json`);
  const tmpPlist = `${tmpJson}.plist`;
  try {
    fs.writeFileSync(tmpJson, JSON.stringify(paths), "utf8");
    execFileSync("/usr/bin/plutil", ["-convert", "binary1", "-o", tmpPlist, tmpJson]);
    const buffer = fs.readFileSync(tmpPlist);
    clipboard.writeBuffer("NSFilenamesPboardType", buffer);
    return true;
  } catch {
    return false;
  } finally {
    for (const file of [tmpJson, tmpPlist]) {
      try { fs.unlinkSync(file); } catch { /* ignore */ }
    }
  }
}
