#!/bin/bash
# Kaspa AIO — Linux pre-install script (runs as root via .deb preinst)
# Installs Docker and Node.js 18+ if not already present.
set -euo pipefail

log() { echo "[kaspa-aio-pre-install] $*"; }

# ─── Docker ──────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Docker not found — installing docker.io + docker-compose-plugin..."
  apt-get update -qq
  apt-get install -y docker.io docker-compose-plugin
  systemctl enable --now docker
  log "Docker installed."
else
  log "Docker already installed: $(docker --version)"
fi

# ─── Docker Compose v2 ───────────────────────────────────────────────────────
if ! docker compose version &>/dev/null 2>&1; then
  log "Docker Compose plugin not found — installing..."
  apt-get install -y docker-compose-plugin
  log "Docker Compose installed."
else
  log "Docker Compose already installed: $(docker compose version)"
fi

# ─── Node.js 18+ ─────────────────────────────────────────────────────────────
NODE_MAJOR=0
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node --version 2>/dev/null | grep -oP '(?<=v)\d+' || echo 0)
fi

if [ "$NODE_MAJOR" -lt 18 ]; then
  log "Node.js 18+ not found (found v${NODE_MAJOR}) — installing via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
  log "Node.js installed: $(node --version)"
else
  log "Node.js already installed: $(node --version)"
fi

log "Pre-install complete."
