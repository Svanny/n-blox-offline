import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, "..");

function loadMain(wrapper, root, fsOverride = fs) {
  let requestFilter;
  class BrowserWindow {
    constructor(options) {
      this.options = options;
      this.handlers = {};
      this.webContents = {
        on: (name, handler) => { this.handlers[name] = handler; },
        once() {},
        setWindowOpenHandler: (handler) => { this.openWindow = handler; }
      };
    }
    setMenuBarVisibility() {}
    async loadURL() {}
  }
  const source = fs.readFileSync(path.join(repoRoot, wrapper, "main.cjs"), "utf8");
  const context = {
    require: (name) => name === "electron" ? {
      app: { setName() {}, whenReady: () => ({ then() {} }), on() {} },
      BrowserWindow,
      session: { defaultSession: { webRequest: {
        onBeforeRequest: (handler) => { requestFilter = handler; }
      } } }
    } : name === "node:fs" ? fsOverride : require(name),
    __dirname: path.join(root, wrapper),
    process: { ...process, resourcesPath: root },
    console: { log() {}, warn() {}, error() {} },
    URL,
    module: { exports: {} }
  };
  const exports = "{ safeResolvePath, createServer, createWindow" +
    (wrapper === "wacz-offline-app" ? ", blockExternalRequests" : "") + " }";
  vm.runInNewContext(source + `\nmodule.exports = ${exports};`, context);
  return { ...context.module.exports, getRequestFilter: () => requestFilter };
}

function get(port, requestPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: requestPath }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

for (const wrapper of ["electron-app", "wacz-offline-app"]) {
  test(`${wrapper}: sandbox stays enabled and off-origin navigation/windows are denied`, async () => {
    const shell = loadMain(wrapper, "/tmp/nblox-test");
    const win = await shell.createWindow(wrapper === "electron-app" ? "http://127.0.0.1:1234/" : 1234);
    assert.equal(win.options.webPreferences.sandbox, true);
    assert.equal(win.options.webPreferences.nodeIntegration, false);
    assert.equal(win.options.webPreferences.contextIsolation, true);
    assert.equal(win.openWindow().action, "deny");
    for (const name of ["will-navigate", "will-redirect"]) {
      for (const [url, blocked] of [["http://127.0.0.1:1234/next", false], ["http://127.0.0.1:12340/", true], ["https://example.com/", true], ["file:///tmp/a", true], ["bad URL", true]]) {
        let prevented = false;
        win.handlers[name]({ preventDefault() { prevented = true; } }, url);
        assert.equal(prevented, blocked, `${name}: ${url}`);
      }
    }
  });

  test(`${wrapper}: malformed and escaping paths fail closed`, () => {
    const { safeResolvePath } = loadMain(wrapper, "/tmp/nblox-test");
    for (const value of ["/%", "/%zz", "/%E0%A4%A", "/%00", "/../secret", "/%2e%2e/secret", "/..%5csecret", "http://example.com/"]) {
      assert.equal(safeResolvePath(value), null, value);
    }
    assert.ok(safeResolvePath("/index.html?cache=1").endsWith("index.html"));
  });

  test(`${wrapper}: invalid requests and missing directory indexes do not crash the server`, async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nblox-server-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const site = path.join(root, wrapper === "electron-app" ? "local" : `${wrapper}/site`);
    fs.mkdirSync(path.join(site, "empty"), { recursive: true });
    fs.writeFileSync(path.join(site, "index.html"), "game");
    const server = loadMain(wrapper, root).createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const port = server.address().port;
    assert.equal((await get(port, "/%zz")).status, 400);
    assert.equal((await get(port, "/empty/")).status, 404);
    assert.deepEqual(await get(port, "/"), { status: 200, body: "game" });
  });

  test(`${wrapper}: read errors before and after headers are contained`, async (t) => {
    const streams = [];
    const fsOverride = { ...fs,
      stat: (_file, callback) => callback(null, { isDirectory: () => false }),
      createReadStream: () => { const stream = new PassThrough(); streams.push(stream); return stream; }
    };
    const server = loadMain(wrapper, "/tmp/nblox-test", fsOverride).createServer();
    t.after(() => server.close());
    for (const opened of [false, true]) {
      const response = new PassThrough();
      let status;
      response.headersSent = false;
      response.writeHead = (value) => { status = value; response.headersSent = true; };
      server.emit("request", { url: "/index.html" }, response);
      const stream = streams.at(-1);
      if (opened) stream.emit("open", 1);
      stream.emit("error", Object.assign(new Error("read failed"), { code: "EIO" }));
      if (opened) assert.equal(response.destroyed, true);
      else assert.equal(status, 500);
    }
  });
}

test("WACZ request filter compares parsed origins and rejects credentials", () => {
  const shell = loadMain("wacz-offline-app", "/tmp/nblox-test");
  shell.blockExternalRequests(1234);
  const allows = (url) => {
    let result;
    shell.getRequestFilter()({ url }, (value) => { result = value; });
    return !result.cancel;
  };
  assert.equal(allows("http://127.0.0.1:1234/index.html?x=1"), true);
  for (const url of ["http://127.0.0.1:12340/", "http://127.0.0.1:1234@example.com/", "http://user@127.0.0.1:1234/", "https://127.0.0.1:1234/", "http://localhost:1234/", "file:///tmp/a", "not a URL"]) {
    assert.equal(allows(url), false, url);
  }
});
