#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
TETRIS_DESKTOP=1 npm --prefix client-nuxt run generate
mkdir -p public
cp -R client-nuxt/.output/public/. public/
printf '{"version":"3.16.0","hash":"%s"}' "$(git rev-parse --short HEAD)" > public/version.json
STAGING=$(mktemp -d "${TMPDIR:-/tmp}/tetris-build.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
APP="$STAGING/Tetris Battle.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
go build -trimpath -o "$APP/Contents/Resources/tetris-server" ./cmd/macos
swiftc -O macos/App.swift macos/DualKeyboard.swift -framework AppKit -framework WebKit -framework IOKit -o "$APP/Contents/MacOS/Tetris Battle"
cp macos/Info.plist "$APP/Contents/Info.plist"
cp LICENSE "$APP/Contents/Resources/LICENSE"
cp macos/REFERENCE-LICENSE "$APP/Contents/Resources/REFERENCE-LICENSE"
if [ -f macos/AppIcon.icns ]; then cp macos/AppIcon.icns "$APP/Contents/Resources/"; fi
xattr -cr "$APP"
# A stable certificate identity keeps macOS privacy grants valid across updates.
SIGN_IDENTITY="${TETRIS_SIGN_IDENTITY:-$(security find-identity -v -p codesigning | sed -n 's/.*) \([A-F0-9]\{40\}\) "Apple Development:.*$/\1/p' | head -1)}"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"
codesign --force --sign "$SIGN_IDENTITY" "$APP/Contents/Resources/tetris-server"
codesign --force --sign "$SIGN_IDENTITY" "$APP"
codesign --verify --deep --strict "$APP"
mkdir -p dist
ditto --norsrc --noextattr "$APP" "dist/Tetris Battle.app"
ditto --norsrc --noextattr -c -k --keepParent "$APP" "dist/Tetris Battle.zip"
echo "$PWD/dist/Tetris Battle.zip"
