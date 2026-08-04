import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await fs.readFile(path.join(dashboardRoot, "package.json"), "utf8"));
const appPath = path.join(dashboardRoot, "dist", "desktop", "Dashboard-darwin-arm64", "Dashboard.app");
const stagingRoot = path.join(dashboardRoot, "dist", "dmg", `Dashboard-${packageJson.version}`);
const stagedApp = path.join(stagingRoot, "Dashboard.app");
const releaseRoot = path.join(dashboardRoot, "release");
const dmgName = `Dashboard-${packageJson.version}-arm64.dmg`;
const dmgPath = path.join(releaseRoot, dmgName);
const checksumPath = `${dmgPath}.sha256`;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}: ${stderr.trim()}`)));
  });
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

await fs.access(path.join(appPath, "Contents", "MacOS", "Dashboard"));
await fs.rm(stagingRoot, { recursive: true, force: true });
await fs.mkdir(stagingRoot, { recursive: true });
await run("ditto", [appPath, stagedApp]);
await fs.symlink("/Applications", path.join(stagingRoot, "Applications"));
await fs.mkdir(releaseRoot, { recursive: true });
await fs.rm(dmgPath, { force: true });
await fs.rm(checksumPath, { force: true });
await run("hdiutil", ["create", "-volname", "Dashboard", "-srcfolder", stagingRoot, "-ov", "-format", "UDZO", dmgPath]);
const digest = await sha256(dmgPath);
await fs.writeFile(checksumPath, `${digest}  ${dmgName}\n`, "utf8");
process.stdout.write(`${dmgPath}\n${checksumPath}\n${digest}\n`);
