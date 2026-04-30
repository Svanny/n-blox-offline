const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APP_NAME = "Tetris N-BLOX Offline";
const BUNDLE_ID = "offline.tetris.nblox";
const ELECTRON_EXECUTABLE = "Electron";
const ROOT = path.resolve(__dirname, "..", "..");
const ELECTRON_APP = path.resolve(require("electron"), "..", "..", "..");
const DIST_DIR = path.join(ROOT, "dist");
const OUT_APP = path.join(DIST_DIR, `${APP_NAME}.app`);
const SOURCE_ICON = path.join(__dirname, "..", "assets", "app-icon.png");
const ICONSET = path.join(DIST_DIR, "app-icon.iconset");
const ICONS_DIR = path.join(OUT_APP, "Contents", "Resources");
const ICNS_PATH = path.join(ICONS_DIR, "app-icon.icns");
const DOCK_ICON_PNG_PATH = path.join(ICONS_DIR, "app-dock.png");
const DEV_DOCK_ICON_PNG_PATH = path.join(__dirname, "..", "assets", "app-dock.png");
const ICON_SCALE = 0.9;
const MASTER_ICON_PATH = path.join(DIST_DIR, "app-master-1024.png");
const ICONS_ONLY = process.argv.includes("--icons-only");

function run(command, args, options = {}) {
  childProcess.execFileSync(command, args, {
    stdio: "inherit",
    ...options
  });
}

function runQuiet(command, args) {
  childProcess.execFileSync(command, args, {
    stdio: "pipe"
  });
}

function copyDir(src, dest, options = {}) {
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    dereference: false,
    filter: (source) => {
      const relative = path.relative(src, source);
      return !options.exclude?.some((part) => relative === part || relative.startsWith(`${part}${path.sep}`));
    }
  });
}

function replacePlistValue(plist, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);
  if (pattern.test(plist)) return plist.replace(pattern, `$1${value}$3`);
  return plist.replace("</dict>", `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`);
}

function iconSourceArgs(size) {
  const scaledSize = Math.round(size * ICON_SCALE);
  return [
    SOURCE_ICON,
    "-alpha", "set",
    "-bordercolor", "white",
    "-border", "1x1",
    "-fuzz", "10%",
    "-fill", "none",
    "-draw", "color 0,0 floodfill",
    "-shave", "1x1",
    "-set", "colorspace", "sRGB",
    "-colorspace", "sRGB",
    "-background", "none",
    "-gravity", "center",
    "-resize", `${scaledSize}x${scaledSize}`,
    "-extent", `${size}x${size}`
  ];
}

function renderMasterIcon() {
  const size = 1024;
  const radius = Math.round(size * 0.22);
  const logoPath = path.join(DIST_DIR, ".app-logo-1024.png");
  const tilePath = path.join(DIST_DIR, ".app-tile-1024.png");

  run("magick", [...iconSourceArgs(size), `PNG32:${logoPath}`]);
  run("magick", [
    "-size", `${size}x${size}`,
    "xc:none",
    "-fill", "white",
    "-draw", `roundrectangle 0,0 ${size - 1},${size - 1},${radius},${radius}`,
    `PNG32:${tilePath}`
  ]);
  run("magick", [tilePath, logoPath, "-gravity", "center", "-compose", "over", "-composite", `PNG32:${MASTER_ICON_PATH}`]);

  fs.rmSync(logoPath, { force: true });
  fs.rmSync(tilePath, { force: true });
}

function resizeFromMaster({ size, outPath }) {
  run("sips", ["-z", String(size), String(size), MASTER_ICON_PATH, "--out", outPath]);
}

function writeDockIcon(outPath) {
  run("magick", [path.join(ICONSET, "icon_512x512@2x.png"), `PNG32:${outPath}`]);
}

function createIcon() {
  if (!fs.existsSync(SOURCE_ICON)) {
    throw new Error(`Missing icon file: ${SOURCE_ICON}\nSave the pasted logo PNG there, then rerun pnpm build:mac.`);
  }

  fs.rmSync(ICONSET, { recursive: true, force: true });
  fs.mkdirSync(ICONSET, { recursive: true });
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.rmSync(MASTER_ICON_PATH, { force: true });

  renderMasterIcon();

  resizeFromMaster({ size: 16, outPath: path.join(ICONSET, "icon_16x16.png") });
  resizeFromMaster({ size: 32, outPath: path.join(ICONSET, "icon_16x16@2x.png") });
  resizeFromMaster({ size: 32, outPath: path.join(ICONSET, "icon_32x32.png") });
  resizeFromMaster({ size: 64, outPath: path.join(ICONSET, "icon_32x32@2x.png") });
  resizeFromMaster({ size: 128, outPath: path.join(ICONSET, "icon_128x128.png") });
  resizeFromMaster({ size: 256, outPath: path.join(ICONSET, "icon_128x128@2x.png") });
  resizeFromMaster({ size: 256, outPath: path.join(ICONSET, "icon_256x256.png") });
  resizeFromMaster({ size: 512, outPath: path.join(ICONSET, "icon_256x256@2x.png") });
  resizeFromMaster({ size: 512, outPath: path.join(ICONSET, "icon_512x512.png") });
  fs.copyFileSync(MASTER_ICON_PATH, path.join(ICONSET, "icon_512x512@2x.png"));

  fs.rmSync(ICNS_PATH, { force: true });
  try {
    runQuiet("iconutil", ["-c", "icns", "-o", ICNS_PATH, ICONSET]);
  } catch (error) {
    console.warn("[build] iconutil failed; writing .icns directly.");
  }

  if (!fs.existsSync(ICNS_PATH)) {
    writeIcnsFromPngs([
      ["icp4", path.join(ICONSET, "icon_16x16.png")],
      ["ic11", path.join(ICONSET, "icon_16x16@2x.png")],
      ["icp5", path.join(ICONSET, "icon_32x32.png")],
      ["ic12", path.join(ICONSET, "icon_32x32@2x.png")],
      ["ic07", path.join(ICONSET, "icon_128x128.png")],
      ["ic13", path.join(ICONSET, "icon_128x128@2x.png")],
      ["ic08", path.join(ICONSET, "icon_256x256.png")],
      ["ic14", path.join(ICONSET, "icon_256x256@2x.png")],
      ["ic09", path.join(ICONSET, "icon_512x512.png")],
      ["ic10", path.join(ICONSET, "icon_512x512@2x.png")]
    ]);
  }

  writeDockIcon(DOCK_ICON_PNG_PATH);
  writeDockIcon(DEV_DOCK_ICON_PNG_PATH);

  fs.rmSync(MASTER_ICON_PATH, { force: true });
}

function writeIcnsFromPngs(entries) {
  const chunks = entries.map(([type, file]) => {
    const png = fs.readFileSync(file);
    const chunk = Buffer.alloc(8 + png.length);
    chunk.write(type, 0, 4, "ascii");
    chunk.writeUInt32BE(chunk.length, 4);
    png.copy(chunk, 8);
    return chunk;
  });
  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(totalLength, 4);
  fs.writeFileSync(ICNS_PATH, Buffer.concat([header, ...chunks], totalLength));
}

function patchInfoPlist() {
  const plistPath = path.join(OUT_APP, "Contents", "Info.plist");
  let plist = fs.readFileSync(plistPath, "utf8");
  plist = replacePlistValue(plist, "CFBundleName", APP_NAME);
  plist = replacePlistValue(plist, "CFBundleDisplayName", APP_NAME);
  plist = replacePlistValue(plist, "CFBundleExecutable", ELECTRON_EXECUTABLE);
  plist = replacePlistValue(plist, "CFBundleIdentifier", BUNDLE_ID);
  plist = replacePlistValue(plist, "CFBundleIconFile", "app-icon");
  fs.writeFileSync(plistPath, plist);
}

function signApp() {
  run("codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    OUT_APP
  ]);
}

function main() {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  if (ICONS_ONLY) {
    createIcon();
    console.log(`Generated icon preflight artifacts in ${DIST_DIR}`);
    return;
  }

  if (!fs.existsSync(path.join(ELECTRON_APP, "Contents", "MacOS", "Electron"))) {
    throw new Error(`Could not find Electron.app at ${ELECTRON_APP}`);
  }

  fs.rmSync(OUT_APP, { recursive: true, force: true });
  run("ditto", [ELECTRON_APP, OUT_APP]);

  const packagedAppDir = path.join(OUT_APP, "Contents", "Resources", "app");
  fs.rmSync(packagedAppDir, { recursive: true, force: true });
  fs.mkdirSync(packagedAppDir, { recursive: true });
  copyDir(path.join(ROOT, "electron-app"), packagedAppDir, {
    exclude: ["node_modules", "scripts"]
  });
  copyDir(path.join(ROOT, "local"), path.join(OUT_APP, "Contents", "Resources", "local"));

  createIcon();
  patchInfoPlist();
  signApp();

  console.log(`Built ${OUT_APP}`);
}

main();
