# Development

This file is for maintainers and technical contributors. Normal users should start with the browser page or release downloads in `README.md`.

## Project Layout

This repo has two implementations:

- `wacz-offline-app/`: current offline HTML5/Cocos app rebuilt from `n-blox-free-tetris.wacz`
- `electron-app/` + `local/`: older SWF/Ruffle app kept for reference

Use `wacz-offline-app/` for new local builds and releases.

Source builds require a patched Node.js release: 22.23.4+, 24.22.1+, or
26.12.1+ within the corresponding major version. `.nvmrc` selects 24.22.1.
See the [October 2026 Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
Both desktop wrappers use the oldest supported Electron line, 43.8.3+, for its
Chromium and installer security fixes. Electron bundles its own Node.js runtime:
[43.8.3 still reports Node.js 24.22.0](https://releases.electronjs.org/release/v43.8.3),
so updating build-time Node.js does not establish that the packaged runtime has
the October 21 fixes. Check the embedded Node.js version and certificate store
when rebuilding apps with a later patched Electron release.

## Run the WACZ App Locally

```bash
cd wacz-offline-app
pnpm install
pnpm dev
```

## Package macOS and Windows Apps

```bash
cd wacz-offline-app
pnpm package:all
```

Outputs:

```text
releases/tetris-nblox-wacz-offline-1.0.0-mac-x64.zip
releases/tetris-nblox-wacz-offline-1.0.0-win-x64.zip
```

The macOS artifact contains `Tetris N-BLOX Offline.app`.

The Windows artifact contains a portable x64 folder with `Tetris N-BLOX Offline.exe`.

Local macOS builds are ad-hoc signed. To distribute without Gatekeeper malware warnings, sign with a `Developer ID Application` certificate, notarize with `xcrun notarytool`, staple the ticket with `xcrun stapler`, then zip the stapled `.app`. See `wacz-offline-app/README.md` for the exact command sequence.

## Offline Behavior

The WACZ app serves the extracted `www.freetetris.org` game from a local `127.0.0.1` Electron server. The shell blocks all renderer requests outside that local server, and the captured ad/analytics loaders are removed or stubbed so gameplay starts without network access.

## Regenerate From WACZ

```bash
cd wacz-offline-app
pnpm extract:wacz
```

The extractor writes only successful `www.freetetris.org` response bodies from `n-blox-free-tetris.wacz` into `wacz-offline-app/site/`.

## Older SWF App

The previous SWF/Ruffle implementation is still available:

```bash
cd electron-app
pnpm install
pnpm dev
```
