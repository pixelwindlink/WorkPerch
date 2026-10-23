const SUPPORTED = {
  darwin: new Set(["arm64", "x64"]),
  win32: new Set(["x64", "arm64"]),
};

export function resolveDesktopPackTarget(environment = process.env, hostPlatform = process.platform) {
  const platform = environment.PERCH_DESKTOP_PLATFORM || hostPlatform;
  const arch = environment.PERCH_DESKTOP_ARCH
    || (platform === "darwin" ? "arm64" : "x64");
  if (!SUPPORTED[platform]?.has(arch)) {
    throw new Error(`Unsupported desktop pack target: ${platform}-${arch}`);
  }
  return { platform, arch };
}
