import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genericEnginesRoot = path.resolve(dashboardRoot, "../..");
const governanceRoot = path.join(genericEnginesRoot, "governance");
const projectLauncherRoot = path.join(genericEnginesRoot, "engine_projects", "project-launcher");
const outputRoot = path.join(dashboardRoot, "dist", "desktop");
const resourceStagingRoot = path.join(dashboardRoot, "dist", "package-resources");
const launcherResourceRoot = path.join(resourceStagingRoot, "project-launcher");
const electronZipDir = process.env.ELECTRON_ZIP_DIR ? path.resolve(process.env.ELECTRON_ZIP_DIR) : null;
const packageJson = JSON.parse(await fs.readFile(path.join(dashboardRoot, "package.json"), "utf8"));

await fs.access(path.join(governanceRoot, "protocol", "engine-message", "v1.0", "envelope.schema.json"));
await fs.rm(resourceStagingRoot, { recursive: true, force: true });
await fs.mkdir(launcherResourceRoot, { recursive: true });
await Promise.all([
  fs.copyFile(path.join(projectLauncherRoot, "engine.manifest.json"), path.join(launcherResourceRoot, "engine.manifest.json")),
  fs.cp(path.join(projectLauncherRoot, "contracts"), path.join(launcherResourceRoot, "contracts"), { recursive: true }),
  fs.cp(path.join(projectLauncherRoot, "src"), path.join(launcherResourceRoot, "src"), { recursive: true })
]);

const appPaths = await packager({
  dir: dashboardRoot,
  out: outputRoot,
  name: "Dashboard",
  executableName: "Dashboard",
  appBundleId: "local.ugreen.dashboard",
  appVersion: packageJson.version,
  buildVersion: packageJson.version,
  platform: "darwin",
  arch: "arm64",
  overwrite: true,
  ...(electronZipDir ? { electronZipDir } : {}),
  asar: true,
  prune: true,
  osxSign: {
    identity: "-",
    identityValidation: false,
    hardenedRuntime: false,
    preAutoEntitlements: false,
    optionsForFile: () => ({ entitlements: [], hardenedRuntime: false })
  },
  extraResource: [governanceRoot, launcherResourceRoot],
  ignore: [
    /^\/\.git(?:\/|$)/,
    /^\/dist(?:\/|$)/,
    /^\/tests(?:\/|$)/,
    /^\/openspec(?:\/|$)/,
    /^\/runtime_data(?:\/|$)/,
    /^\/exports(?:\/|$)/,
    /^\/release(?:\/|$)/,
    /^\/\.agents(?:\/|$)/,
    /^\/skills(?:\/|$)/,
    /^\/prompts(?:\/|$)/,
    /^\/scripts(?:\/|$)/,
    /^\/node_modules\/\.cache(?:\/|$)/,
    /^\/(?:README|AGENT)\.md$/,
    /\.log$/
  ]
});

process.stdout.write(`${appPaths.join("\n")}\n`);
