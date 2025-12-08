#!/bin/bash
# Build script for Kaspa Explorer

set -e

echo "Building Kaspa Explorer..."
docker build -t kaspa-explorer:latest .

echo "✓ Kaspa Explorer built successfully"
