const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const DIST_DIR = path.join(ROOT, "dist");
const ICONSET = path.join(DIST_DIR, "app-icon.iconset");
const ICNS_PATH = path.join(DIST_DIR, "Tetris N-BLOX Offline.app", "Contents", "Resources", "app-icon.icns");
const DOCK_ICON_PATH = path.join(DIST_DIR, "Tetris N-BLOX Offline.app", "Contents", "Resources", "app-dock.png");
const MAIN_ICON = path.join(ICONSET, "icon_512x512@2x.png");
const DEV_DOCK_ICON_PATH = path.join(ROOT, "electron-app", "assets", "app-dock.png");

function run(command, args, options = {}) {
  return childProcess.execFileSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pixelAt(imagePath, x, y) {
  return run("magick", [imagePath, "-format", `%[pixel:p{${x},${y}}]`, "info:"]).trim();
}

function main() {
  run("node", [path.join(ROOT, "electron-app", "scripts", "build-macos-app.cjs"), "--icons-only"], { stdio: "inherit" });

  assert(fs.existsSync(MAIN_ICON), `Missing iconset image: ${MAIN_ICON}`);
  assert(fs.existsSync(ICNS_PATH), `Missing ICNS: ${ICNS_PATH}`);
  assert(fs.existsSync(DOCK_ICON_PATH), `Missing dock icon PNG: ${DOCK_ICON_PATH}`);
  assert(fs.existsSync(DEV_DOCK_ICON_PATH), `Missing dev dock icon PNG: ${DEV_DOCK_ICON_PATH}`);

  const dimensions = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", MAIN_ICON]);
  assert(dimensions.includes("pixelWidth: 1024"), "Main icon width is not 1024");
  assert(dimensions.includes("pixelHeight: 1024"), "Main icon height is not 1024");

  const alphaInfo = run("identify", ["-format", "%[fx:minima.a] %[fx:maxima.a]", MAIN_ICON]).trim();
  assert(alphaInfo === "0 1", `Unexpected alpha range for main icon: ${alphaInfo}`);

  const cornerPixel = pixelAt(MAIN_ICON, 0, 0);
  const centerPixel = pixelAt(MAIN_ICON, 512, 512);
  assert(cornerPixel.includes(",0)"), `Expected transparent rounded corner, got ${cornerPixel}`);
  assert(!centerPixel.includes(",0)"), `Expected opaque center, got ${centerPixel}`);

  const dockDimensions = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", DOCK_ICON_PATH]);
  assert(dockDimensions.includes("pixelWidth: 1024"), "Dock icon width is not 1024");
  assert(dockDimensions.includes("pixelHeight: 1024"), "Dock icon height is not 1024");

  const dockAlphaFlag = run("sips", ["-g", "hasAlpha", DOCK_ICON_PATH]);
  assert(dockAlphaFlag.includes("hasAlpha: yes"), `Dock icon should keep alpha for rounded corners, got: ${dockAlphaFlag.trim()}`);

  const dockCorner = pixelAt(DOCK_ICON_PATH, 0, 0);
  const dockCenter = pixelAt(DOCK_ICON_PATH, 512, 512);
  assert(dockCorner.includes(",0)"), `Dock icon corner should be transparent for rounding, got ${dockCorner}`);
  assert(!dockCenter.includes(",0)"), `Dock icon center should be opaque, got ${dockCenter}`);

  const devDockDimensions = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", DEV_DOCK_ICON_PATH]);
  assert(devDockDimensions.includes("pixelWidth: 1024"), "Dev dock icon width is not 1024");
  assert(devDockDimensions.includes("pixelHeight: 1024"), "Dev dock icon height is not 1024");

  const devDockAlphaFlag = run("sips", ["-g", "hasAlpha", DEV_DOCK_ICON_PATH]);
  assert(devDockAlphaFlag.includes("hasAlpha: yes"), `Dev dock icon should keep alpha for rounded corners, got: ${devDockAlphaFlag.trim()}`);

  const devDockCorner = pixelAt(DEV_DOCK_ICON_PATH, 0, 0);
  const devDockCenter = pixelAt(DEV_DOCK_ICON_PATH, 512, 512);
  assert(devDockCorner.includes(",0)"), `Dev dock icon corner should be transparent for rounding, got ${devDockCorner}`);
  assert(!devDockCenter.includes(",0)"), `Dev dock icon center should be opaque, got ${devDockCenter}`);

  console.log("Icon preflight passed.");
}

main();
