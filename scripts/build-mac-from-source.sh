#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Tetris N-BLOX Offline"
REPO_URL="https://github.com/Svanny/n-blox-offline.git"
WORKDIR="${TMPDIR:-/tmp}/n-blox-offline-build"
DEST="$HOME/Applications"

echo "Advanced source build for $APP_NAME"
echo
echo "Warning: do not paste Terminal commands from the internet unless you trust"
echo "the source and understand what they do."
echo
echo "This script downloads code from GitHub, installs dependencies, builds an app,"
echo "and copies it into:"
echo "  $DEST"
echo
echo "Building locally avoids downloading a prebuilt app, but it does not magically"
echo "make the software safe."
echo

if ! command -v git >/dev/null 2>&1; then
  echo "git is required."
  echo "Install Apple Command Line Tools with:"
  echo "  xcode-select --install"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  echo "Install the LTS version from https://nodejs.org/, then run this script again."
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack is required. It usually ships with modern Node.js."
  exit 1
fi

rm -rf "$WORKDIR"
git clone --depth 1 "$REPO_URL" "$WORKDIR"

cd "$WORKDIR/wacz-offline-app"

corepack enable

if ! command -v pnpm >/dev/null 2>&1; then
  corepack prepare pnpm@latest --activate
fi

pnpm install
pnpm package:mac

mkdir -p "$DEST"
rm -rf "$DEST/$APP_NAME.app"
ditto "build/mac/$APP_NAME.app" "$DEST/$APP_NAME.app"

echo
echo "Installed:"
echo "$DEST/$APP_NAME.app"
echo
echo "Open Finder, go to your home Applications folder, then open the app."
open "$DEST"
