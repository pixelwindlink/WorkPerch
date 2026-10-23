import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const perchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(perchRoot, "assets", "app-icon");
const svgPath = path.join(iconDir, "perch-icon.svg");
const masterPng = path.join(iconDir, "perch-icon-1024.png");
const iconsetDir = path.join(iconDir, "Perch.iconset");
const icnsPath = path.join(iconDir, "Perch.icns");
const iconComposerDir = path.join(iconDir, "Perch.icon");
const iconComposerJson = path.join(iconComposerDir, "icon.json");
const iconComposerAssetsDir = path.join(iconComposerDir, "Assets");

const ICON_COMPOSER_MANIFEST = {
  fill: "automatic",
  groups: [
    {
      layers: [
        {
          "image-name": "perch-icon.svg",
          name: "perch-icon",
        },
      ],
      shadow: {
        kind: "neutral",
        opacity: 0.5,
      },
    },
  ],
  "supported-platforms": {
    circles: ["watchOS"],
    squares: "shared",
  },
};

const SIZES = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

const swiftRender = `
import AppKit
let svg = URL(fileURLWithPath: ${JSON.stringify(svgPath)})
let out = URL(fileURLWithPath: ${JSON.stringify(masterPng)})
guard let img = NSImage(contentsOf: svg) else { fatalError("svg load failed") }
let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: 1024,
  pixelsHigh: 1024,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
img.draw(in: NSRect(x: 0, y: 0, width: 1024, height: 1024))
NSGraphicsContext.restoreGraphicsState()
let data = rep.representation(using: .png, properties: [:])!
try! data.write(to: out)
`;

if (process.platform !== "darwin") {
  if (!fsSync.existsSync(icnsPath)) {
    process.stderr.write("Perch.icns missing; build app icon on macOS with: node scripts/build-app-icon.mjs\n");
    process.exit(1);
  }
  process.stdout.write(`${icnsPath}\n`);
  process.exit(0);
}

await fs.access(svgPath);
execFileSync("swift", ["-e", swiftRender], { stdio: "inherit" });

await fs.rm(iconsetDir, { recursive: true, force: true });
await fs.mkdir(iconsetDir, { recursive: true });
for (const { name, size } of SIZES) {
  const target = path.join(iconsetDir, name);
  execFileSync("sips", ["-z", String(size), String(size), masterPng, "--out", target], { stdio: "inherit" });
}
execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", icnsPath], { stdio: "inherit" });
await fs.rm(iconsetDir, { recursive: true, force: true });

await fs.rm(iconComposerDir, { recursive: true, force: true });
await fs.mkdir(iconComposerAssetsDir, { recursive: true });
await fs.copyFile(svgPath, path.join(iconComposerAssetsDir, "perch-icon.svg"));
await fs.writeFile(iconComposerJson, `${JSON.stringify(ICON_COMPOSER_MANIFEST, null, 2)}\n`, "utf8");

process.stdout.write(`${icnsPath}\n${iconComposerDir}\n`);
