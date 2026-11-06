const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { app, BrowserWindow, session } = require("electron");

const APP_NAME = "Tetris N-BLOX Offline";
const SITE_ROOT = path.join(__dirname, "site");
const APP_ICON_PATH = path.join(__dirname, "assets", "app-icon.png");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

app.setName(APP_NAME);

function safeResolvePath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent((urlPath || "/").split("?")[0]);
  } catch {
    return null;
  }
  const normalized = pathname.replaceAll("\\", "/");
  if (!normalized.startsWith("/") || normalized.includes("\0")) return null;
  const relativePath = normalized === "/" ? "/index.html" : normalized;
  const resolved = path.resolve(SITE_ROOT, `.${relativePath}`);
  if (!resolved.startsWith(SITE_ROOT + path.sep)) return null;
  return resolved;
}

function createServer() {
  return http.createServer((req, res) => {
    const filePath = safeResolvePath(req.url);
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
      const contentType = MIME_TYPES[path.extname(finalPath)] || "application/octet-stream";

      const headers = {
        "Cache-Control": "no-store",
        "Content-Type": contentType
      };
      const stream = fs.createReadStream(finalPath);
      stream.on("error", (error) => {
        if (res.headersSent) {
          res.destroy();
          return;
        }
        const status = error.code === "ENOENT" ? 404 : 500;
        res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(status === 404 ? "Not found" : "Server error");
      });
      stream.once("open", () => {
        res.writeHead(200, headers);
        stream.pipe(res);
      });
      res.once("close", () => stream.destroy());
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unexpected server address"));
        return;
      }
      resolve(address.port);
    });
  });
}

function blockExternalRequests(port) {
  const allowedOrigin = `http://127.0.0.1:${port}`;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (isLocalUrl(details.url, allowedOrigin)) {
      callback({ cancel: false });
      return;
    }

    console.log(`[blocked-request] ${details.url}`);
    callback({ cancel: true });
  });
}

function isLocalUrl(url, allowedOrigin) {
  try {
    const parsed = new URL(url);
    return parsed.origin === allowedOrigin && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

async function createWindow(port) {
  if (process.platform === "darwin" && fs.existsSync(APP_ICON_PATH)) {
    app.dock.setIcon(APP_ICON_PATH);
  }

  const win = new BrowserWindow({
    width: 760,
    height: 640,
    title: APP_NAME,
    backgroundColor: "#061018",
    icon: fs.existsSync(APP_ICON_PATH) ? APP_ICON_PATH : undefined,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const allowedOrigin = `http://127.0.0.1:${port}`;
  for (const eventName of ["will-navigate", "will-redirect"]) {
    win.webContents.on(eventName, (event, url) => {
      if (!isLocalUrl(url, allowedOrigin)) event.preventDefault();
    });
  }
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} ${sourceId || ""}:${line || ""}`);
  });
  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`[did-fail-load] ${code} ${description} ${url}`);
  });

  await win.loadURL(`http://127.0.0.1:${port}/`);
  return win;
}

app.whenReady().then(async () => {
  const server = createServer();
  const port = await listen(server);
  blockExternalRequests(port);
  await createWindow(port);
});

app.on("window-all-closed", () => {
  app.quit();
});
