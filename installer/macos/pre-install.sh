#!/bin/bash
# Kaspa AIO — macOS pre-install script
# Checks for Homebrew, a Docker runtime (OrbStack preferred), and Node.js 20 LTS.
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

# ─── Docker runtime ──────────────────────────────────────────────────────────
# OrbStack is recommended over Docker Desktop for the following reasons:
#   • Disk: OrbStack's VM image shrinks automatically when images/containers
#     are removed. Docker Desktop's disk file (Docker.raw) grows permanently
#     and must be manually purged via "Clean / Purge data" in settings — even
#     after running `docker system prune`.
#   • Performance: OrbStack uses Apple's native Virtualization.framework,
#     giving it faster startup times and significantly lower RAM usage than
#     Docker Desktop's QEMU/HyperKit VM.
#   • OrbStack is free for personal use and is a full drop-in replacement —
#     no changes to Kaspa AIO or Docker Compose workflows are needed.
if command -v docker &>/dev/null; then
  log "Docker already installed: $(docker --version)"

  # If Docker Desktop is present but OrbStack is not, suggest switching.
  # OrbStack installs as a side-by-side replacement — Docker Desktop can be
  # removed afterwards if desired.
  if [ -d "/Applications/Docker.app" ] && [ ! -d "/Applications/OrbStack.app" ]; then
    log ""
    log "TIP: You are using Docker Desktop. OrbStack is a lighter-weight alternative:"
    log "  * Disk space: OrbStack's VM image shrinks when images are removed;"
    log "    Docker Desktop's disk file grows permanently until manually purged."
    log "  * Lower RAM usage and faster startup via Apple's native Virtualization.framework."
    log "  * Free for personal use — install with: brew install --cask orbstack"
    log "  * See https://orbstack.dev for details. Kaspa AIO needs no changes to switch."
    log ""
  fi
else
  # No Docker runtime found — install OrbStack, fall back to Docker Desktop guidance.
  log ""
  log "No Docker runtime found. Installing OrbStack (recommended)..."
  log ""
  log "Why OrbStack instead of Docker Desktop?"
  log "  * Disk: OrbStack's VM image shrinks automatically when images/containers are removed."
  log "    Docker Desktop's disk file grows permanently and must be manually purged."
  log "  * Uses Apple's native Virtualization.framework: faster startup, lower RAM usage."
  log "  * Free for personal use — full Docker Compose support, no project changes needed."
  log ""

  if brew install --cask orbstack; then
    log "OrbStack installed. Launch OrbStack from Applications to start the Docker runtime,"
    log "then re-run the Kaspa AIO setup."
  else
    log "OrbStack installation failed. Falling back to Docker Desktop:"
    log "  brew install --cask docker"
    log "  or visit https://www.docker.com/products/docker-desktop/"
    open "https://www.docker.com/products/docker-desktop/" 2>/dev/null || true
  fi
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
