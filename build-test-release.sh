#!/bin/bash
# Build test release package

set -e

VERSION="v0.9.1"
ARCHIVE_NAME="kaspa-aio-${VERSION}.tar.gz"
TEMP_DIR=$(mktemp -d)
BUILD_DIR="${TEMP_DIR}/kaspa-aio-${VERSION}"

echo "Building test release ${VERSION}..."
echo "Temp directory: ${TEMP_DIR}"

# Create build directory
mkdir -p "${BUILD_DIR}"

# Copy files, excluding unnecessary items
echo "Copying files..."
rsync -av \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.backup.*' \
  --exclude='logs' \
  --exclude='*.tar.gz' \
  --exclude='*.tar.gz.sha256' \
  --exclude='build-test-release.sh' \
  --exclude="${TEMP_DIR}" \
  ./ "${BUILD_DIR}/"

# Create the archive
echo "Creating archive..."
tar -czf "${ARCHIVE_NAME}" -C "${TEMP_DIR}" "kaspa-aio-${VERSION}"

# Generate checksum
echo "Generating checksum..."
sha256sum "${ARCHIVE_NAME}" > "${ARCHIVE_NAME}.sha256"

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo "✓ Release package created: ${ARCHIVE_NAME}"
echo "✓ Checksum file created: ${ARCHIVE_NAME}.sha256"
echo ""
echo "Package size: $(du -h ${ARCHIVE_NAME} | cut -f1)"
echo ""
cat "${ARCHIVE_NAME}.sha256"
