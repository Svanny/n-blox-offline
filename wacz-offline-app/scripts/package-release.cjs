const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
const releasesRoot = path.join(repoRoot, "releases");
const buildRoot = path.join(root, "build");
const appName = "Tetris N-BLOX Offline";
const artifactBase = "tetris-nblox-wacz-offline";
const version = process.env.RELEASE_VERSION || "1.0.0";
const electronVersion = require(path.join(root, "node_modules", "electron", "package.json")).version;
const sourceIconPng = path.join(repoRoot, "electron-app", "assets", "app-dock.png");
const macSigningIdentity = process.env.MAC_SIGN_IDENTITY || "-";

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (filePath) => {
      const relative = path.relative(root, filePath);
      if (!relative) return true;
      if (relative === "node_modules" || relative.startsWith(`node_modules${path.sep}`)) return false;
      if (relative === "build" || relative.startsWith(`build${path.sep}`)) return false;
      return true;
    }
  });
}

function writeAppSource(target) {
  fs.mkdirSync(target, { recursive: true });
  copyFile(path.join(root, "main.cjs"), path.join(target, "main.cjs"));
  copyDir(path.join(root, "site"), path.join(target, "site"));
  copyFile(sourceIconPng, path.join(target, "assets", "app-icon.png"));
  fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify({
      name: "tetris-nblox-wacz-offline",
      version,
      productName: appName,
      main: "main.cjs"
    }, null, 2) + "\n"
  );
}

function createMacIcon(resourcesDir) {
  const iconset = path.join(buildRoot, "mac", "app-icon.iconset");
  const icnsPath = path.join(resourcesDir, "app-icon.icns");
  const sizes = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024]
  ];

  remove(iconset);
  fs.mkdirSync(iconset, { recursive: true });
  for (const [filename, size] of sizes) {
    execFileSync("sips", ["-z", String(size), String(size), sourceIconPng, "--out", path.join(iconset, filename)], {
      stdio: "ignore"
    });
  }
  remove(icnsPath);
  try {
    execFileSync("iconutil", ["-c", "icns", "-o", icnsPath, iconset]);
  } catch (error) {
    writeIcnsFromPngs(icnsPath, [
      ["icp4", path.join(iconset, "icon_16x16.png")],
      ["ic11", path.join(iconset, "icon_16x16@2x.png")],
      ["icp5", path.join(iconset, "icon_32x32.png")],
      ["ic12", path.join(iconset, "icon_32x32@2x.png")],
      ["ic07", path.join(iconset, "icon_128x128.png")],
      ["ic13", path.join(iconset, "icon_128x128@2x.png")],
      ["ic08", path.join(iconset, "icon_256x256.png")],
      ["ic14", path.join(iconset, "icon_256x256@2x.png")],
      ["ic09", path.join(iconset, "icon_512x512.png")],
      ["ic10", path.join(iconset, "icon_512x512@2x.png")]
    ]);
  }
}

function writeIcnsFromPngs(target, entries) {
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
  fs.writeFileSync(target, Buffer.concat([header, ...chunks], totalLength));
}

function createWindowsIcon(target) {
  try {
    execFileSync("magick", [
      sourceIconPng,
      "-define",
      "icon:auto-resize=256,128,64,48,32,16",
      target
    ], { stdio: "inherit" });
  } catch (error) {
    console.warn("[package] Could not generate Windows .ico; the app will still use the PNG at runtime.");
  }
}

function zipDirectory(source, target) {
  remove(target);
  execFileSync("zip", ["-qry", target, path.basename(source)], {
    cwd: path.dirname(source),
    stdio: "inherit"
  });
}

function patchPlist(plistPath) {
  const replacements = [
    ["CFBundleDisplayName", appName],
    ["CFBundleExecutable", appName],
    ["CFBundleName", appName],
    ["CFBundleIdentifier", "org.svanny.nblox.waczoffline"],
    ["CFBundleIconFile", "app-icon"],
    ["CFBundleShortVersionString", version],
    ["CFBundleVersion", version],
    ["LSApplicationCategoryType", "public.app-category.games"]
  ];

  for (const [key, value] of replacements) {
    execFileSync("plutil", ["-replace", key, "-string", value, plistPath]);
  }

  try {
    execFileSync("plutil", ["-remove", "ElectronAsarIntegrity", plistPath]);
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

function signMacApp(targetApp) {
  const args = ["--force", "--sign", macSigningIdentity];
  if (macSigningIdentity !== "-") {
    args.push("--options", "runtime", "--timestamp");
  }
  args.push(targetApp);
  execFileSync("codesign", args, { stdio: "inherit" });
}

function packageMac() {
  const sourceApp = path.join(root, "node_modules", "electron", "dist", "Electron.app");
  const targetApp = path.join(buildRoot, "mac", `${appName}.app`);
  remove(path.join(buildRoot, "mac"));
  fs.mkdirSync(path.dirname(targetApp), { recursive: true });
  execFileSync("ditto", [sourceApp, targetApp]);
  fs.renameSync(
    path.join(targetApp, "Contents", "MacOS", "Electron"),
    path.join(targetApp, "Contents", "MacOS", appName)
  );

  patchPlist(path.join(targetApp, "Contents", "Info.plist"));
  createMacIcon(path.join(targetApp, "Contents", "Resources"));
  remove(path.join(targetApp, "Contents", "Resources", "default_app.asar"));
  remove(path.join(targetApp, "Contents", "Resources", "app"));
  writeAppSource(path.join(targetApp, "Contents", "Resources", "app"));
  signMacApp(targetApp);

  const artifact = path.join(releasesRoot, `${artifactBase}-${version}-mac-x64.zip`);
  fs.mkdirSync(releasesRoot, { recursive: true });
  zipDirectory(targetApp, artifact);
  console.log(`macOS artifact: ${artifact}`);
}

function download(url, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(target);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        remove(target);
        download(response.headers.location, target).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        remove(target);
        reject(new Error(`Download failed (${response.statusCode}): ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (error) => {
      file.close();
      remove(target);
      reject(error);
    });
  });
}

async function packageWindows() {
  const cacheDir = path.join(root, ".cache");
  const electronZip = path.join(cacheDir, `electron-v${electronVersion}-win32-x64.zip`);
  const url = `https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-win32-x64.zip`;
  await download(url, electronZip);

  const winRoot = path.join(buildRoot, "win");
  const appDir = path.join(winRoot, `${appName}-win32-x64`);
  remove(winRoot);
  fs.mkdirSync(appDir, { recursive: true });
  execFileSync("ditto", ["-x", "-k", electronZip, appDir]);

  fs.renameSync(path.join(appDir, "electron.exe"), path.join(appDir, `${appName}.exe`));
  remove(path.join(appDir, "resources", "default_app.asar"));
  writeAppSource(path.join(appDir, "resources", "app"));
  createWindowsIcon(path.join(appDir, "resources", "app", "assets", "app-icon.ico"));

  const artifact = path.join(releasesRoot, `${artifactBase}-${version}-win-x64.zip`);
  fs.mkdirSync(releasesRoot, { recursive: true });
  zipDirectory(appDir, artifact);
  console.log(`Windows artifact: ${artifact}`);
}

async function main() {
  const target = process.argv[2] || "all";
  if (target === "mac" || target === "all") packageMac();
  if (target === "win" || target === "all") await packageWindows();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
