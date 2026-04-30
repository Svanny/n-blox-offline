# Tetris N-BLOX Offline

Offline Electron builds for Tetris N-BLOX.

This repo now has two implementations:

- `wacz-offline-app/`: current offline HTML5/Cocos app rebuilt from `n-blox-free-tetris.wacz`
- `electron-app/` + `local/`: older SWF/Ruffle app kept for reference

Use `wacz-offline-app/` for new local builds and releases.

## Install

Download the release zip directly from:

```text
https://github.com/Svanny/n-blox-offline/releases/tag/v1.0.0
```

Checksums:

```text
bbbb85344012bc1e7f507ae4cae0a9d456ecf28e45caa602a3704396b1d5f696  tetris-nblox-wacz-offline-1.0.0-mac-x64.zip
16e14277e4d9b62890c224fb2a189e19b3c90d9ce984bd69532a3fed21a5357d  tetris-nblox-wacz-offline-1.0.0-win-x64.zip
```

macOS may ask you to approve the app on first launch because the free build is ad-hoc signed, not Apple-notarized. Windows may show SmartScreen because the executable is unsigned. The package-manager installs below are free and checksum-backed, but they do not remove those operating-system warnings.

### macOS with Homebrew

Install Homebrew from the official site first:

```text
https://brew.sh/
```

Then install:

```bash
brew tap Svanny/n-blox-offline https://github.com/Svanny/n-blox-offline
brew install --cask tetris-nblox-offline
```

### Windows with Scoop

Install Scoop from the official site first:

```text
https://scoop.sh/
```

Then install:

```powershell
scoop bucket add n-blox-offline https://github.com/Svanny/n-blox-offline
scoop install tetris-nblox-offline
```

### Windows with WinGet

WinGet is Microsoft's Windows Package Manager:

```text
https://learn.microsoft.com/windows/package-manager/winget/
```

This repo includes a local WinGet manifest in `manifests/winget/`. Until the package is accepted into the public WinGet community repository, install from a local clone:

```powershell
winget install --manifest .\manifests\winget\Svanny.TetrisNBloxOffline.yaml
```

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
