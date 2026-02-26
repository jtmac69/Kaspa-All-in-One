#!/bin/bash
# create-icns.sh — Convert assets/icon.png to assets/icon.icns on macOS
# Requires: macOS with sips and iconutil (both built-in to macOS)
# Run via: npm run icons:icns
set -euo pipefail

ASSETS_DIR="$(dirname "$0")/../assets"
PNG="$ASSETS_DIR/icon.png"
ICONSET="$ASSETS_DIR/icon.iconset"
ICNS="$ASSETS_DIR/icon.icns"

if [ ! -f "$PNG" ]; then
  echo "Error: $PNG not found. Run 'npm run icons' first." >&2
  exit 1
fi

if [ -f "$ICNS" ]; then
  echo "Skipped: assets/icon.icns already exists"
  exit 0
fi

mkdir -p "$ICONSET"

# Clean up the temporary iconset directory on any exit (success or failure)
# so partial runs don't leave stale intermediate PNGs behind.
trap 'rm -rf "$ICONSET"' EXIT

# Apple recommends all ten sizes for sharp rendering at every scale factor.
# iconutil will accept a subset and scale up, but omitting sizes produces blurry results.
sips -z 16   16   "$PNG" --out "$ICONSET/icon_16x16.png"       >/dev/null
sips -z 32   32   "$PNG" --out "$ICONSET/icon_16x16@2x.png"    >/dev/null
sips -z 32   32   "$PNG" --out "$ICONSET/icon_32x32.png"        >/dev/null
sips -z 64   64   "$PNG" --out "$ICONSET/icon_32x32@2x.png"    >/dev/null
sips -z 128  128  "$PNG" --out "$ICONSET/icon_128x128.png"      >/dev/null
sips -z 256  256  "$PNG" --out "$ICONSET/icon_128x128@2x.png"  >/dev/null
sips -z 256  256  "$PNG" --out "$ICONSET/icon_256x256.png"      >/dev/null
sips -z 512  512  "$PNG" --out "$ICONSET/icon_256x256@2x.png"  >/dev/null
sips -z 512  512  "$PNG" --out "$ICONSET/icon_512x512.png"      >/dev/null
sips -z 1024 1024 "$PNG" --out "$ICONSET/icon_512x512@2x.png"  >/dev/null

iconutil -c icns "$ICONSET" -o "$ICNS"

echo "Created: assets/icon.icns"
