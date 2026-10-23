import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const LSREGISTER =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

/**
 * macOS 26+ uses Assets.car (CFBundleIconName). Leaving CFBundleIconFile=electron.icns
 * makes Dock/LaunchServices keep showing the default Electron atom icon.
 */
export function applyFinderCustomAppIcon(appPath, iconImagePath) {
  if (process.platform !== "darwin") return false;
  if (!appPath || !iconImagePath || !fsSync.existsSync(appPath) || !fsSync.existsSync(iconImagePath)) {
    return false;
  }
  const swift = `
import AppKit
let app = ${JSON.stringify(appPath)}
let iconURL = URL(fileURLWithPath: ${JSON.stringify(iconImagePath)})
guard let img = NSImage(contentsOf: iconURL) else { exit(1) }
let ok = NSWorkspace.shared.setIcon(img, forFile: app, options: [])
exit(ok ? 0 : 2)
`;
  try {
    execFileSync("swift", ["-e", swift], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function finalizeMacAppIconBundle(appPath, { perchIcnsPath = null, iconImagePath = null } = {}) {
  if (!appPath || !fsSync.existsSync(appPath)) return false;
  const resourcesDir = path.join(appPath, "Contents", "Resources");
  const plistPath = path.join(appPath, "Contents", "Info.plist");
  const assetsCar = path.join(resourcesDir, "Assets.car");
  if (!fsSync.existsSync(assetsCar)) return false;

  const legacyIcns = path.join(resourcesDir, "electron.icns");
  await fs.rm(legacyIcns, { force: true });

  if (perchIcnsPath && fsSync.existsSync(perchIcnsPath)) {
    await fs.copyFile(perchIcnsPath, path.join(resourcesDir, "Perch.icns"));
  }

  if (fsSync.existsSync(plistPath)) {
    try {
      execFileSync("/usr/bin/plutil", ["-remove", "CFBundleIconFile", plistPath]);
    } catch {
      /* already removed */
    }
    execFileSync("/usr/bin/plutil", ["-replace", "CFBundleIconName", "-string", "Icon", plistPath]);
  }

  if (iconImagePath) {
    applyFinderCustomAppIcon(appPath, iconImagePath);
  }

  if (fsSync.existsSync(LSREGISTER)) {
    execFileSync(LSREGISTER, ["-f", "-R", "-trusted", appPath], { stdio: "ignore" });
  }
  return true;
}

export function clearLocalIconServicesCache() {
  const cacheRoots = [
    path.join(process.env.HOME || "", "Library", "Caches", "com.apple.iconservices.store"),
    path.join(process.env.HOME || "", "Library", "Caches", "com.apple.iconservices"),
  ];
  for (const cacheRoot of cacheRoots) {
    try {
      fsSync.rmSync(cacheRoot, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}
