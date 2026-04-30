# Tetris N-BLOX Offline (WACZ build)

Standalone offline Electron wrapper built from `../n-blox-free-tetris.wacz`.

## Run

```bash
pnpm install
pnpm dev
```

For local verification without reinstalling dependencies, the repo's existing Electron binary can also run this app:

```bash
../electron-app/node_modules/.bin/electron .
```

## Package Local Apps

```bash
pnpm package:all
```

Outputs:

```text
../releases/tetris-nblox-wacz-offline-1.0.0-mac-x64.zip
../releases/tetris-nblox-wacz-offline-1.0.0-win-x64.zip
```

The macOS zip contains `Tetris N-BLOX Offline.app`.

The Windows zip contains a portable x64 app folder. Open `Tetris N-BLOX Offline.exe` inside it.

## macOS Signing and Notarization

Local builds are ad-hoc signed by default so the bundle is structurally valid on this Mac:

```bash
pnpm package:mac
```

For public distribution without Gatekeeper malware warnings, use an Apple Developer Program account and a `Developer ID Application` certificate. After installing that certificate locally:

```bash
MAC_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" pnpm package:mac
```

Then notarize and staple the built app before zipping it for release:

```bash
ditto -c -k --keepParent "build/mac/Tetris N-BLOX Offline.app" "build/mac/Tetris N-BLOX Offline-notary.zip"
xcrun notarytool submit "build/mac/Tetris N-BLOX Offline-notary.zip" --keychain-profile "notarytool-password" --wait
xcrun stapler staple "build/mac/Tetris N-BLOX Offline.app"
```

Create the distributable zip after stapling:

```bash
ditto -c -k --keepParent "build/mac/Tetris N-BLOX Offline.app" "../releases/tetris-nblox-wacz-offline-1.0.0-mac-x64.zip"
```

Store notarization credentials once with:

```bash
xcrun notarytool store-credentials "notarytool-password" --apple-id "you@example.com" --team-id "TEAMID" --password "app-specific-password"
```

## Regenerate Captured Site

```bash
pnpm extract:wacz
```

The extractor writes only successful `www.freetetris.org` responses from the WACZ into `site/`. The app shell blocks every request except its own `127.0.0.1` server.
