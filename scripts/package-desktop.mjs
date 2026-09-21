import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genericEnginesRoot = path.resolve(dashboardRoot, "../..");
const governanceRoot = path.join(genericEnginesRoot, "governance");
const engineProviderSpiRoot = path.join(genericEnginesRoot, "common_components", "engine-provider-spi");
const projectLauncherRoot = path.join(genericEnginesRoot, "engine_projects", "project-launcher");
const outputRoot = path.join(dashboardRoot, "dist", "desktop");
const resourceStagingRoot = path.join(dashboardRoot, "dist", "package-resources");
const launcherResourceRoot = path.join(resourceStagingRoot, "project-launcher");
const commonComponentsResourceRoot = path.join(resourceStagingRoot, "common_components");
const engineProviderSpiResourceRoot = path.join(commonComponentsResourceRoot, "engine-provider-spi");
const electronZipDir = process.env.ELECTRON_ZIP_DIR ? path.resolve(process.env.ELECTRON_ZIP_DIR) : null;
const packageJson = JSON.parse(await fs.readFile(path.join(dashboardRoot, "package.json"), "utf8"));

await fs.access(path.join(governanceRoot, "protocol", "engine-message", "v1.0", "envelope.schema.json"));
await fs.access(path.join(engineProviderSpiRoot, "src", "index.mjs"));
await fs.rm(resourceStagingRoot, { recursive: true, force: true });
await Promise.all([
  fs.mkdir(launcherResourceRoot, { recursive: true }),
  fs.mkdir(engineProviderSpiResourceRoot, { recursive: true })
]);
await Promise.all([
  fs.copyFile(path.join(projectLauncherRoot, "engine.manifest.json"), path.join(launcherResourceRoot, "engine.manifest.json")),
  fs.cp(path.join(projectLauncherRoot, "contracts"), path.join(launcherResourceRoot, "contracts"), { recursive: true }),
  fs.cp(path.join(projectLauncherRoot, "src"), path.join(launcherResourceRoot, "src"), { recursive: true }),
  fs.copyFile(path.join(engineProviderSpiRoot, "package.json"), path.join(engineProviderSpiResourceRoot, "package.json")),
  fs.copyFile(path.join(engineProviderSpiRoot, "component.manifest.json"), path.join(engineProviderSpiResourceRoot, "component.manifest.json")),
  fs.cp(path.join(engineProviderSpiRoot, "src"), path.join(engineProviderSpiResourceRoot, "src"), { recursive: true })
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
  afterCopyExtraResources: [async ({ buildPath }) => {
    await fs.cp(
      commonComponentsResourceRoot,
      path.join(buildPath, "Dashboard.app", "Contents", "common_components"),
      { recursive: true }
    );
  }],
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
