import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const perchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(perchRoot, "assets", "app-icon");
const icoPath = path.join(iconDir, "Perch.ico");
const candidates = [
  path.join(iconDir, "Perch.iconset", "icon_256x256@2x.png"),
  path.join(iconDir, "perch-icon-1024.png"),
];

function sourcePng() {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Windows icon source PNG missing. Run: node scripts/build-app-icon.mjs");
}

if (fs.existsSync(icoPath)) {
  process.stdout.write(`${icoPath}\n`);
  process.exit(0);
}

const input = sourcePng();
try {
  execFileSync(
    "npx",
    ["--yes", "png-to-ico", input, "--output", icoPath],
    { cwd: perchRoot, stdio: "inherit" },
  );
} catch {
  process.stderr.write("png-to-ico failed; copying PNG as interim icon source for packager.\n");
  fs.copyFileSync(input, path.join(iconDir, "Perch.pack-icon.png"));
  process.stdout.write(`${path.join(iconDir, "Perch.pack-icon.png")}\n`);
  process.exit(0);
}
process.stdout.write(`${icoPath}\n`);
