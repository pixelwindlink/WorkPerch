import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genericEnginesRoot = path.resolve(dashboardRoot, "../..");
const governanceRoot = path.join(genericEnginesRoot, "governance");
const outputRoot = path.join(dashboardRoot, "dist", "desktop");
const packageJson = JSON.parse(await fs.readFile(path.join(dashboardRoot, "package.json"), "utf8"));

await fs.access(path.join(governanceRoot, "protocol", "engine-message", "v1.0", "envelope.schema.json"));

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
  asar: true,
  prune: true,
  osxSign: {
    identity: "-",
    identityValidation: false,
    hardenedRuntime: false,
    preAutoEntitlements: false,
    optionsForFile: () => ({ entitlements: [], hardenedRuntime: false })
  },
  extraResource: [governanceRoot],
  ignore: [
    /^\/\.git(?:\/|$)/,
    /^\/dist(?:\/|$)/,
    /^\/tests(?:\/|$)/,
    /^\/openspec(?:\/|$)/,
    /^\/runtime_data(?:\/|$)/,
    /^\/exports(?:\/|$)/,
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
