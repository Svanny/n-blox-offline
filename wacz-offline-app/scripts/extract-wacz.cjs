const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const waczPath = path.resolve(__dirname, "..", "..", "n-blox-free-tetris.wacz");
const outputRoot = path.resolve(__dirname, "..", "site");
const sourceHost = "www.freetetris.org";

function parseHeaders(text) {
  const headers = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    headers.set(line.slice(0, index).toLowerCase(), line.slice(index + 1).trim());
  }
  return headers;
}

function safeOutputPath(url) {
  if (url.hostname !== sourceHost) return null;

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname.endsWith("/")) pathname += "index.html";

  const resolved = path.resolve(outputRoot, `.${pathname}`);
  if (!resolved.startsWith(outputRoot + path.sep)) {
    throw new Error(`Refusing to write outside output root: ${url.href}`);
  }
  return resolved;
}

function splitHttpBody(payload) {
  const headerEnd = payload.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;

  const statusLineEnd = payload.indexOf("\r\n");
  const statusLine = payload.slice(0, statusLineEnd).toString("utf8");
  const status = Number(statusLine.split(" ")[1]);
  if (status !== 200) return null;

  return payload.subarray(headerEnd + 4);
}

function extract() {
  const zippedWarc = execFileSync("unzip", ["-p", waczPath, "archive/data.warc.gz"], {
    maxBuffer: 32 * 1024 * 1024
  });
  const warc = zlib.gunzipSync(zippedWarc);

  let cursor = 0;
  let written = 0;

  while (cursor < warc.length) {
    while (warc[cursor] === 13 || warc[cursor] === 10) cursor += 1;
    if (cursor >= warc.length) break;

    const headerEnd = warc.indexOf("\r\n\r\n", cursor);
    if (headerEnd === -1) break;

    const warcHeaderText = warc.subarray(cursor, headerEnd).toString("utf8");
    const warcHeaders = parseHeaders(warcHeaderText);
    const contentLength = Number(warcHeaders.get("content-length"));
    if (!Number.isFinite(contentLength)) {
      throw new Error(`Missing Content-Length near byte ${cursor}`);
    }

    const payloadStart = headerEnd + 4;
    const payloadEnd = payloadStart + contentLength;
    cursor = payloadEnd;

    if (warcHeaders.get("warc-type") !== "response") continue;

    const target = warcHeaders.get("warc-target-uri");
    if (!target) continue;

    const url = new URL(target);
    const outputPath = safeOutputPath(url);
    if (!outputPath) continue;

    const body = splitHttpBody(warc.subarray(payloadStart, payloadEnd));
    if (!body) continue;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, body);
    written += 1;
  }

  console.log(`Extracted ${written} files to ${outputRoot}`);
}

extract();
