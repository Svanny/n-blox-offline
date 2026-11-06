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
Both desktop wrappers use the oldest supported Electron line, 43.8.7+, for its
Chromium, installer, and embedded Node.js security fixes.
[Electron 43.8.7 bundles Node.js 24.22.1](https://releases.electronjs.org/release/v43.8.7),
which includes the October 21 security fixes. Build-time Node.js and Electron's
embedded runtime are separate; verify both versions when rebuilding apps.
Existing release downloads are unchanged until new desktop artifacts are built
and published. Electron 43 support is scheduled to end on January 5, 2027; see
[the release schedule](https://releases.electronjs.org/schedule).

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
The examples show an Intel (`mac-x64`) build. The macOS ZIP suffix is read from
the actual Electron executable: `mac-x64`, `mac-arm64`, or `mac-universal`.
Use that suffix in the commands below when building on a different architecture.

The Windows artifact contains a portable x64 folder with `Tetris N-BLOX Offline.exe`.
The Windows Electron ZIP is checksum-verified by `@electron/get` against the
official checksums bundled in the installed Electron package, including cache hits.

Local macOS builds are ad-hoc signed. To distribute without Gatekeeper malware warnings, sign with a `Developer ID Application` certificate, notarize with `xcrun notarytool`, staple the ticket with `xcrun stapler`, then zip the stapled `.app`. See `wacz-offline-app/README.md` for the exact command sequence.

## Verification

Install both wrappers before running the shared test suite:

```bash
(cd electron-app && corepack pnpm install --frozen-lockfile --ignore-scripts)
(cd wacz-offline-app && corepack pnpm install --frozen-lockfile --ignore-scripts)
node --test tests/*.test.mjs
node electron-app/scripts/check-icon-runtime-wiring.cjs
```

On macOS, also run `corepack pnpm check:icon:all` and `corepack pnpm build:mac`
from `electron-app/`, then `corepack pnpm package:all` from `wacz-offline-app/`.
These require macOS packaging tools and ImageMagick. Launch both development
wrappers and the packaged apps to verify gameplay, keyboard input, audio,
offline loading, and icons. Keep the renderer sandbox enabled during testing;
the older Ruffle wrapper now uses a sandboxed preload. Automated tests do not
replace these native checks or Windows portable-app testing.

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
