const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

const APP_NAME = "Tetris N-BLOX Offline";
const LOCAL_ROOT = path.resolve(__dirname, "..", "local");
const SERVER_PORT = 8765;
const ICON_PATH = path.join(__dirname, "assets", "app-icon.png");
const DEV_DOCK_ICON_PNG = path.join(__dirname, "assets", "app-dock.png");
const PACKAGED_DOCK_ICON_PNG = path.join(process.resourcesPath, "app-dock.png");

app.setName(APP_NAME);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".swf": "application/x-shockwave-flash"
};

function safeResolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const normalized = decoded.replaceAll("\\", "/");
  const rawPath = normalized === "/" ? "/index.html" : normalized;
  const resolved = path.resolve(LOCAL_ROOT, `.${rawPath}`);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) return null;
  return resolved;
}

function isImmutableAsset(filePath) {
  const base = path.basename(filePath);
  if (base.endsWith(".wasm")) return true;
  if (base.startsWith("core.ruffle.") && base.endsWith(".js")) return true;
  if (base === "ruffle.js") return true;
  return false;
}

function createServer() {
  const server = http.createServer((req, res) => {
    const filePath = safeResolvePath(req.url || "/");
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    fs.stat(filePath, (statErr, stat) => {
      if (statErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
      const ext = path.extname(finalPath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      const headers = {
        "Content-Type": contentType
      };

      if (isImmutableAsset(finalPath)) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      } else {
        headers["Cache-Control"] = "no-cache";
      }

      const stream = fs.createReadStream(finalPath);
      stream.on("error", () => {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server error");
      });
      res.writeHead(200, headers);
      stream.pipe(res);
    });
  });

  return server;
}

function watchForHotReload({ win }) {
  if (process.env.TETRIS_HOT_RELOAD !== "1") {
    return () => {};
  }

  let reloadTimer = null;

  function scheduleReload(filename) {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      console.log(`[hot-reload] change detected${filename ? `: ${filename}` : ""} -> reload`);
      win.webContents.reloadIgnoringCache();
    }, 150);
  }

  try {
    const watcher = fs.watch(LOCAL_ROOT, { recursive: true }, (_eventType, filename) => {
      // Ignore noisy files.
      if (filename && (filename.includes(".DS_Store") || filename.includes("node_modules"))) return;
      scheduleReload(filename);
    });
    return () => watcher.close();
  } catch (error) {
    console.warn(`[hot-reload] fs.watch unavailable: ${String(error)}`);
    return () => {};
  }
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(SERVER_PORT, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected server address");
  return address.port;
}

function inputKeyCodeFromCode(code) {
  if (code === "ArrowLeft") return "Left";
  if (code === "ArrowRight") return "Right";
  if (code === "ArrowUp") return "Up";
  if (code === "ArrowDown") return "Down";
  if (code === "Space") return "Space";
  if (code === "Escape") return "Escape";
  if (code === "Enter") return "Enter";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

function resolveDockIconPath() {
  if (process.platform !== "darwin") return null;
  return app.isPackaged ? PACKAGED_DOCK_ICON_PNG : DEV_DOCK_ICON_PNG;
}

function applyDockIcon(reason) {
  if (process.platform !== "darwin") return;
  const dockIconPath = resolveDockIconPath();
  if (!dockIconPath || !fs.existsSync(dockIconPath)) {
    console.log(`[dock-icon] skip (${reason}) path missing: ${String(dockIconPath)}`);
    return;
  }

  try {
    app.dock.setIcon(dockIconPath);
    console.log(`[dock-icon] applied (${reason}) ${dockIconPath}`);
  } catch (error) {
    console.log(`[dock-icon] failed (${reason}) ${String(error)}`);
  }
}

async function createWindow(url) {
  const win = new BrowserWindow({
    width: 940,
    height: 980,
    title: APP_NAME,
    icon: process.platform === "darwin" ? undefined : (fs.existsSync(ICON_PATH) ? ICON_PATH : undefined),
    backgroundColor: "#0f0f0f",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  win.webContents.on("console-message", (event, ...args) => {
    // Electron 41: console-message is moving to a single details param.
    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      const details = args[0];
      const src = details.sourceId ? ` ${details.sourceId}:${details.lineNumber}` : "";
      console.log(`[renderer:${details.level}] ${details.message}${src}`);
      return;
    }

    const [level, message, line, sourceId] = args;
    const src = sourceId ? ` ${sourceId}:${line}` : "";
    console.log(`[renderer:${level}] ${message}${src}`);
  });

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[did-fail-load] ${errorCode} ${errorDescription} :: ${validatedURL}`);
  });

  win.webContents.on("render-process-gone", (event, details) => {
    console.error(`[render-process-gone] ${details.reason} (exitCode=${details.exitCode})`);
  });

  await win.loadURL(url);
  win.webContents.once("did-finish-load", () => {
    applyDockIcon("did-finish-load");
    setTimeout(() => applyDockIcon("post-load-2s"), 2000);
  });
  return win;
}

app.whenReady().then(async () => {
  console.log(`[dock-icon] app.isPackaged=${app.isPackaged}`);
  applyDockIcon("when-ready");

  const server = createServer();
  const port = await listen(server);
  const url = `http://127.0.0.1:${port}/`;

  const win = await createWindow(url);
  const stopHotReload = watchForHotReload({ win });

  ipcMain.on("tetris:status", (_event, status) => {
    console.log(`[tetris:status] ${status}`);
  });

  ipcMain.on("tetris:log", (_event, message) => {
    console.log(`[tetris:log] ${message}`);
  });

  ipcMain.on("tetris:sendInput", (event, payload) => {
    try {
      const wc = event.sender;
      const type = payload?.type === "keyup" ? "keyUp" : "keyDown";
      const keyCode = inputKeyCodeFromCode(String(payload?.code || ""));
      wc.sendInputEvent({
        type,
        keyCode,
        // Using repeat for keyDown events only; Electron ignores it for keyUp.
        isAutoRepeat: Boolean(payload?.repeat)
      });
    } catch (error) {
      console.error(`[tetris:sendInput] failed: ${String(error)}`);
    }
  });

  app.on("before-quit", () => {
    stopHotReload();
    server.close();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
