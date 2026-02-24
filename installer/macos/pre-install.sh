#!/bin/bash
# Kaspa AIO — macOS pre-install script
# Checks for Homebrew, Docker Desktop, and Node.js 18+.
set -euo pipefail

log() { echo "[kaspa-aio-pre-install] $*"; }

# ─── Homebrew ────────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  log "Homebrew not found — installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to path for Apple Silicon
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

# ─── Docker Desktop ──────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Docker not found — please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
  log "Or install via Homebrew: brew install --cask docker"
  # Non-interactive installer can't launch Docker Desktop GUI, so just warn
  open "https://www.docker.com/products/docker-desktop/" 2>/dev/null || true
else
  log "Docker already installed: $(docker --version)"
fi

# ─── Node.js 18+ ─────────────────────────────────────────────────────────────
NODE_MAJOR=0
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo 0)
fi

if [ "$NODE_MAJOR" -lt 18 ]; then
  log "Node.js 18+ not found — installing via Homebrew..."
  brew install node@18
  brew link node@18 --force --overwrite 2>/dev/null || true
  log "Node.js installed: $(node --version)"
else
  log "Node.js already installed: $(node --version)"
fi

log "macOS pre-install complete."
