const fs = require("node:fs");
const path = require("node:path");

const MAIN_PATH = path.join(__dirname, "..", "main.cjs");
const BUILD_SCRIPT_PATH = path.join(__dirname, "build-macos-app.cjs");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const source = fs.readFileSync(MAIN_PATH, "utf8");
  const buildSource = fs.readFileSync(BUILD_SCRIPT_PATH, "utf8");

  assert(source.includes("const PACKAGED_DOCK_ICON_PNG = path.join(process.resourcesPath, \"app-dock.png\")"),
    "Missing packaged dock icon path constant");
  assert(source.includes("const DEV_DOCK_ICON_PNG = path.join(__dirname, \"assets\", \"app-dock.png\")"),
    "Missing dev dock icon path constant");
  assert(source.includes("function resolveDockIconPath()"),
    "Missing resolveDockIconPath helper");
  assert(source.includes("function applyDockIcon(reason)"),
    "Missing applyDockIcon helper");
  assert(source.includes("app.dock.setIcon(dockIconPath)"),
    "Missing app.dock.setIcon call");

  assert(source.includes("applyDockIcon(\"when-ready\")"),
    "Missing when-ready dock icon apply");
  assert(source.includes("win.webContents.once(\"did-finish-load\""),
    "Missing did-finish-load dock icon hook");
  assert(source.includes("setTimeout(() => applyDockIcon(\"post-load-2s\"), 2000)"),
    "Missing delayed post-load dock icon reapply");
  assert(source.includes("return app.isPackaged ? PACKAGED_DOCK_ICON_PNG : DEV_DOCK_ICON_PNG"),
    "Dock icon path should use packaged and dev square dock icons");

  assert(source.includes("icon: process.platform === \"darwin\" ? undefined :"),
    "BrowserWindow icon is not disabled for darwin");

  assert(buildSource.includes("const ICON_SCALE = 0.9;"),
    "Icon inset rule changed: expected ICON_SCALE = 0.9");
  assert(buildSource.includes("roundrectangle 0,0 ${size - 1},${size - 1},${radius},${radius}"),
    "Rounded-square mask generation is missing");
  assert(buildSource.includes("function writeDockIcon(outPath)"),
    "Missing dock icon generation helper");
  assert(buildSource.includes("PNG32:${outPath}"),
    "Dock icon should preserve alpha (PNG32)");
  assert(!buildSource.includes("\"-alpha\", \"remove\""),
    "Dock icon generation should not flatten alpha");

  console.log("Icon runtime wiring preflight passed.");
}

main();
