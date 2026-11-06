import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appRoot = path.join(repoRoot, "wacz-offline-app");
const require = createRequire(path.join(appRoot, "package.json"));
const { downloadArtifact } = require("@electron/get");
const electronVersion = require("electron/package.json").version;
const officialChecksums = require("electron/checksums.json");
const windowsFile = `electron-v${electronVersion}-win32-x64.zip`;

function loadPackager({ architectures = "x86_64", download = async () => { throw new Error("Unexpected download"); } } = {}) {
  const commands = [];
  const mutations = [];
  const mockedFs = Object.fromEntries(["rmSync", "mkdirSync", "copyFileSync", "cpSync", "writeFileSync", "renameSync"].map((name) => [name, (...args) => mutations.push([name, ...args])]));
  mockedFs.existsSync = () => true;
  const context = {
    require: (name) => name === "@electron/get" ? { downloadArtifact: download }
      : name === "node:fs" ? mockedFs
      : name === "node:child_process" ? { execFileSync: (command, args) => {
        commands.push([command, ...args]);
        return command === "lipo" ? architectures : "";
      } } : require(name),
    __dirname: path.join(appRoot, "scripts"),
    process: { env: {}, argv: ["node", "package-release.cjs", "test"], execPath: process.execPath },
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} }
  };
  const source = fs.readFileSync(path.join(appRoot, "scripts", "package-release.cjs"), "utf8");
  vm.runInNewContext(source + "\nmodule.exports = { packageMac, packageWindows };", context);
  return { ...context.module.exports, commands, mutations };
}

test("macOS package name follows the actual Electron binary, not the host architecture", () => {
  for (const [architectures, suffix] of [["x86_64\n", "x64"], ["arm64\n", "arm64"], ["x86_64 arm64\n", "universal"], ["arm64 x86_64\n", "universal"]]) {
    const packager = loadPackager({ architectures });
    packager.packageMac();
    const zip = packager.commands.find(([command]) => command === "zip");
    assert.ok(zip[2].endsWith(`-mac-${suffix}.zip`));
    assert.deepEqual(Array.from(packager.commands[0]), ["lipo", "-archs", path.join(appRoot, "node_modules", "electron", "dist", "Electron.app", "Contents", "MacOS", "Electron")]);
  }
  const invalid = loadPackager({ architectures: "unknown" });
  assert.throws(() => invalid.packageMac(), /Unsupported Electron macOS architecture/);
  assert.equal(invalid.mutations.length, 0);
});

test("Windows packaging supplies official checksums and never extracts a rejected download", async () => {
  let options;
  const packager = loadPackager({ download: async (value) => {
    options = value;
    throw new Error("Checksum mismatch");
  } });
  await assert.rejects(packager.packageWindows(), /Checksum mismatch/);
  assert.equal(options.version, electronVersion);
  assert.equal(options.artifactName, "electron");
  assert.equal(options.platform, "win32");
  assert.equal(options.arch, "x64");
  assert.equal(options.checksums, officialChecksums);
  assert.match(options.checksums[windowsFile], /^[a-f0-9]{64}$/);
  assert.equal(options.unsafelyDisableChecksums, undefined);
  assert.equal(packager.commands.length, 0);
  assert.equal(packager.mutations.length, 0);
});

test("supported downloader validates fresh and cached Windows ZIP bytes before extraction", async (t) => {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nblox-download-"));
  t.after(() => fs.rmSync(cacheRoot, { recursive: true, force: true }));
  const bytes = Buffer.from("verified runtime fixture");
  let requests = 0;
  let corruptDownload = false;
  let downloadedPath;
  const packager = loadPackager({ download: async (options) => {
    downloadedPath = await downloadArtifact({
      ...options,
      cacheRoot,
      checksums: { [windowsFile]: createHash("sha256").update(bytes).digest("hex") },
      downloader: { async download(_url, destination) {
        requests += 1;
        fs.writeFileSync(destination, corruptDownload ? "corrupt" : bytes);
      } }
    });
    return downloadedPath;
  } });
  await packager.packageWindows();
  assert.equal(requests, 1);
  assert.ok(packager.commands.some(([command]) => command === "ditto"));
  await packager.packageWindows();
  assert.equal(requests, 1, "valid cache is reused");
  fs.writeFileSync(downloadedPath, "corrupted cache");
  await packager.packageWindows();
  assert.equal(requests, 2, "corrupt cache is replaced, not trusted");
  fs.writeFileSync(downloadedPath, "corrupted cache again");
  corruptDownload = true;
  const count = packager.commands.length;
  await assert.rejects(packager.packageWindows(), /checksum/i);
  assert.equal(packager.commands.length, count, "rejected bytes never reach extraction");
});
