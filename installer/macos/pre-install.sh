#!/bin/bash
# Kaspa AIO — macOS pre-install script
# Checks for Homebrew, Docker Desktop, and Node.js 20 LTS.
set -euo pipefail

log() { echo "[kaspa-aio-pre-install] $*"; }

# ─── Homebrew ────────────────────────────────────────────────────────────────
# Homebrew is the standard package manager for macOS developer tools and has
# no alternative non-interactive installer. The official install script is the
# only supported method; see https://brew.sh for source and security details.
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

# ─── Node.js 20 LTS ──────────────────────────────────────────────────────────
# Node 18 is EOL (Apr 2025) — use Node 20 LTS to match the Linux installer.
NODE_MAJOR=0
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo 0)
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  log "Node.js 20+ not found (found v${NODE_MAJOR}) — installing via Homebrew..."
  brew install node@20
  brew link node@20 --force --overwrite 2>/dev/null || true
  log "Node.js installed: $(node --version)"
else
  log "Node.js already installed: $(node --version)"
fi

log "macOS pre-install complete."
