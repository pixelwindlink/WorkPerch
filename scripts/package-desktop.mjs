import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";
import { finalizeMacAppIconBundle } from "./finalize-mac-app-icon.mjs";
import { resolveDesktopPackTarget } from "./resolve-desktop-pack-target.mjs";

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
const { platform, arch } = resolveDesktopPackTarget();
const appIconBase = path.join(perchRoot, "assets", "app-icon", "Perch");
const appIconPath = `${appIconBase}.icns`;
const appIconComposerPath = `${appIconBase}.icon`;
const appIconImagePath = path.join(perchRoot, "assets", "app-icon", "perch-icon-1024.png");
const winIconPath = path.join(perchRoot, "assets", "app-icon", "Perch.ico");
const winIconFallbackPath = path.join(perchRoot, "assets", "app-icon", "Perch.pack-icon.png");

const sharedIgnore = [
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
  /\.log$/,
];

if (platform === "darwin") {
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
} else {
  execFileSync(process.execPath, [path.join(perchRoot, "scripts", "ensure-win-icon.mjs")], {
    cwd: perchRoot,
    stdio: "inherit",
  });
}

await fs.access(path.join(governanceRoot, "protocol", "engine-message", "v1.0", "envelope.schema.json"));
await fs.access(path.join(engineProviderSpiRoot, "src", "index.mjs"));
await fs.rm(resourceStagingRoot, { recursive: true, force: true });
await Promise.all([
  fs.mkdir(launcherResourceRoot, { recursive: true }),
  fs.mkdir(engineProviderSpiResourceRoot, { recursive: true }),
]);
await Promise.all([
  fs.copyFile(path.join(projectLauncherRoot, "engine.manifest.json"), path.join(launcherResourceRoot, "engine.manifest.json")),
  fs.cp(path.join(projectLauncherRoot, "contracts"), path.join(launcherResourceRoot, "contracts"), { recursive: true }),
  fs.cp(path.join(projectLauncherRoot, "src"), path.join(launcherResourceRoot, "src"), { recursive: true }),
  fs.copyFile(path.join(engineProviderSpiRoot, "package.json"), path.join(engineProviderSpiResourceRoot, "package.json")),
  fs.copyFile(path.join(engineProviderSpiRoot, "component.manifest.json"), path.join(engineProviderSpiResourceRoot, "component.manifest.json")),
  fs.cp(path.join(engineProviderSpiRoot, "src"), path.join(engineProviderSpiResourceRoot, "src"), { recursive: true }),
]);

const packIcon = platform === "darwin"
  ? [appIconPath, appIconComposerPath]
  : (fsSync.existsSync(winIconPath) ? winIconPath : winIconFallbackPath);

const packagerOptions = {
  dir: perchRoot,
  out: outputRoot,
  name: "Perch",
  executableName: "Perch",
  appBundleId: "local.ugreen.perch",
  appVersion: packageJson.version,
  buildVersion: packageJson.version,
  platform,
  arch,
  overwrite: true,
  icon: packIcon,
  ...(electronZipDir ? { electronZipDir } : {}),
  asar: true,
  prune: true,
  extraResource: [governanceRoot, launcherResourceRoot],
  afterCopyExtraResources: [async ({ buildPath }) => {
    const destination = platform === "darwin"
      ? path.join(buildPath, "Perch.app", "Contents", "common_components")
      : path.join(buildPath, "resources", "common_components");
    await fs.cp(commonComponentsResourceRoot, destination, { recursive: true });
  }],
  ignore: sharedIgnore,
};

if (platform === "darwin") {
  Object.assign(packagerOptions, {
    osxSign: {
      identity: "-",
      identityValidation: false,
      hardenedRuntime: false,
      preAutoEntitlements: false,
      optionsForFile: () => ({ entitlements: [], hardenedRuntime: false }),
    },
    afterComplete: [
      async ({ buildPath }) => {
        await finalizeMacAppIconBundle(path.join(buildPath, "Perch.app"), {
          perchIcnsPath: appIconPath,
          iconImagePath: appIconImagePath,
        });
      },
    ],
  });
}

const appPaths = await packager(packagerOptions);
process.stdout.write(`${appPaths.join("\n")}\n`);
