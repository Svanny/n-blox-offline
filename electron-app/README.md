# Tetris N-BLOX Offline

Runs the SWF-backed Tetris N-BLOX build in a dedicated Electron window (avoids the Codex in-app-browser quirks).

## Run

```bash
cd electron-app
pnpm install
pnpm dev
```

Use `pnpm dev:watch` only when editing local files and you want the game window to reload after changes.

## Build macOS app

Save the pasted logo PNG to:

```bash
electron-app/assets/app-icon.png
```

Then build:

```bash
cd electron-app
pnpm build:mac
```

The built app appears at:

```bash
../dist/Tetris N-BLOX Offline.app
```

You can then move that `.app` into `/Applications`.

## Build Windows app (on Windows)

From `electron-app` in PowerShell:

```powershell
pnpm install
pnpm dlx @electron/packager . "Tetris N-BLOX Offline" `
  --platform=win32 `
  --arch=x64 `
  --overwrite `
  --out=../dist `
  --extra-resource=../local
```

Output:

```powershell
..\dist\Tetris N-BLOX Offline-win32-x64\
```

Run:

```powershell
..\dist\Tetris N-BLOX Offline-win32-x64\Tetris N-BLOX Offline.exe
```

Optional icon generation:

```powershell
magick assets/app-icon.png -define icon:auto-resize=256,128,64,48,32,16 assets/app-icon.ico
```

Then add:

```powershell
--icon=assets/app-icon.ico
```
