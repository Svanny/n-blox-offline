# Tetris N-BLOX Offline

Play Tetris N-BLOX from a public browser page or from an offline Electron build.

## Recommended: Play in Browser

Use the browser version first:

```text
https://svanny.github.io/n-blox-offline/
```

No install is required, so there is no macOS Gatekeeper prompt, no Windows SmartScreen prompt, and no Terminal command to paste. On macOS Sonoma 14+, Safari can save the page as an app from `File > Add to Dock`; Apple documents that feature here:

```text
https://support.apple.com/en-kw/104996
```

## Offline App

Download the release zip only from:

```text
https://github.com/Svanny/n-blox-offline/releases/tag/v1.0.0
```

Checksums:

```text
bbbb85344012bc1e7f507ae4cae0a9d456ecf28e45caa602a3704396b1d5f696  tetris-nblox-wacz-offline-1.0.0-mac-x64.zip
16e14277e4d9b62890c224fb2a189e19b3c90d9ce984bd69532a3fed21a5357d  tetris-nblox-wacz-offline-1.0.0-win-x64.zip
```

This app is not Apple-notarized. macOS is warning you because Apple has not checked this build. The developer is an independent hobbyist and cannot justify Apple's $99/year Developer Program fee for this free offline game wrapper right now.

Windows may show SmartScreen because this free build is unsigned and has no Microsoft reputation yet.

Only open files downloaded from the GitHub release above, and check the SHA-256 checksum before running them. Do not disable Gatekeeper globally. Do not run modified copies from reposts, mirrors, or unknown websites.

### macOS Offline Guide

![Illustrated macOS guide for opening the unsigned app](docs/install-guide/macos-open-guide.png)

1. Download `tetris-nblox-wacz-offline-1.0.0-mac-x64.zip` from the GitHub release.
2. Unzip it.
3. Right-click `Tetris N-BLOX Offline.app`.
4. Click `Open`.
5. Click `Open` again in the unknown-developer prompt.
6. If needed, use `System Settings > Privacy & Security > Open Anyway`.

Apple documents the unknown-developer flow here:

```text
https://support.apple.com/en-kw/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac
```

### Windows Offline Guide

![Illustrated Windows guide for opening the unsigned app](docs/install-guide/windows-open-guide.png)

1. Download `tetris-nblox-wacz-offline-1.0.0-win-x64.zip` from the GitHub release.
2. Extract all files.
3. Open `Tetris N-BLOX Offline.exe`.
4. If SmartScreen appears, click `More info`.
5. Click `Run anyway` only if the file came from the official GitHub release and the checksum matches.

## Advanced: Build Locally From Source

Do not paste Terminal commands from the internet unless you trust the source and understand what they do. This script downloads code from GitHub, installs dependencies, builds an app, and copies it into `~/Applications`.

Building locally avoids downloading a prebuilt app, but it does not magically make the software safe. Read the script before running it:

```text
scripts/build-mac-from-source.sh
```

Run it on macOS with:

```bash
bash scripts/build-mac-from-source.sh
```

## Project Layout

This repo has two implementations:

- `wacz-offline-app/`: current offline HTML5/Cocos app rebuilt from `n-blox-free-tetris.wacz`
- `electron-app/` + `local/`: older SWF/Ruffle app kept for reference

Use `wacz-offline-app/` for new local builds and releases.

## Run the WACZ app locally

```bash
cd wacz-offline-app
pnpm install
pnpm dev
```

## Package macOS and Windows apps

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

## Offline behavior

The WACZ app serves the extracted `www.freetetris.org` game from a local `127.0.0.1` Electron server. The shell blocks all renderer requests outside that local server, and the captured ad/analytics loaders are removed or stubbed so gameplay starts without network access.

## Regenerate from WACZ

```bash
cd wacz-offline-app
pnpm extract:wacz
```

The extractor writes only successful `www.freetetris.org` response bodies from `n-blox-free-tetris.wacz` into `wacz-offline-app/site/`.

## Older SWF app

The previous SWF/Ruffle implementation is still available:

```bash
cd electron-app
pnpm install
pnpm dev
```
