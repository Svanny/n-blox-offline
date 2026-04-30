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
  const pathname = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalized = pathname.replaceAll("\\", "/");
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

      res.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType
      });
      fs.createReadStream(finalPath).pipe(res);
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
    if (details.url.startsWith(allowedOrigin)) {
      callback({ cancel: false });
      return;
    }

    console.log(`[blocked-request] ${details.url}`);
    callback({ cancel: true });
  });
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
