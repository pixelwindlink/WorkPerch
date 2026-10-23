import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";
import { finalizeMacAppIconBundle } from "./finalize-mac-app-icon.mjs";

function resolveXcodeDeveloperDir() {
  const candidates = [
    process.env.DEVELOPER_DIR,
    "/Applications/Xcode.app/Contents/Developer",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fsSync.existsSync(path.join(candidate, "usr/bin/actool"))) return candidate;
  }
  return null;
}

const perchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genericEnginesRoot = path.resolve(perchRoot, "../..");
const governanceRoot = path.join(genericEnginesRoot, "governance");
const engineProviderSpiRoot = path.join(genericEnginesRoot, "common_components", "engine-provider-spi");
const projectLauncherRoot = path.join(genericEnginesRoot, "engine_projects", "project-launcher");
const outputRoot = path.join(perchRoot, "dist", "desktop");
const resourceStagingRoot = path.join(perchRoot, "dist", "package-resources");
const launcherResourceRoot = path.join(resourceStagingRoot, "project-launcher");
const commonComponentsResourceRoot = path.join(resourceStagingRoot, "common_components");
const engineProviderSpiResourceRoot = path.join(commonComponentsResourceRoot, "engine-provider-spi");
const electronZipDir = process.env.ELECTRON_ZIP_DIR ? path.resolve(process.env.ELECTRON_ZIP_DIR) : null;
const packageJson = JSON.parse(await fs.readFile(path.join(perchRoot, "package.json"), "utf8"));
const appIconBase = path.join(perchRoot, "assets", "app-icon", "Perch");
const appIconPath = `${appIconBase}.icns`;
const appIconComposerPath = `${appIconBase}.icon`;
const appIconImagePath = path.join(perchRoot, "assets", "app-icon", "perch-icon-1024.png");

execFileSync(process.execPath, [path.join(perchRoot, "scripts", "build-app-icon.mjs")], {
  cwd: perchRoot,
  stdio: "inherit",
});
await fs.access(appIconPath);
await fs.access(appIconComposerPath);

const xcodeDeveloperDir = resolveXcodeDeveloperDir();
if (xcodeDeveloperDir) {
  process.env.DEVELOPER_DIR = xcodeDeveloperDir;
} else {
  process.stderr.write(
    "Warning: Xcode actool not found; macOS 26+ Dock icons need Perch.icon compiled with full Xcode.\n",
  );
}

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
  dir: perchRoot,
  out: outputRoot,
  name: "Perch",
  executableName: "Perch",
  appBundleId: "local.ugreen.perch",
  appVersion: packageJson.version,
  buildVersion: packageJson.version,
  platform: "darwin",
  arch: "arm64",
  overwrite: true,
  icon: [appIconPath, appIconComposerPath],
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
      path.join(buildPath, "Perch.app", "Contents", "common_components"),
      { recursive: true }
    );
  }],
  afterComplete: [
    async ({ buildPath }) => {
      await finalizeMacAppIconBundle(path.join(buildPath, "Perch.app"), {
        perchIcnsPath: appIconPath,
        iconImagePath: appIconImagePath,
      });
    },
  ],
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
