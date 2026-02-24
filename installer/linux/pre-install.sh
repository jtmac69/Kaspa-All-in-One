#!/bin/bash
# Kaspa AIO — Linux pre-install script (runs as root via .deb preinst)
# Installs Docker and Node.js 20 LTS if not already present.
set -euo pipefail

log() { echo "[kaspa-aio-pre-install] $*"; }

# M5: Guard against running on non-Debian systems (this script is .deb-only)
if ! command -v apt-get &>/dev/null; then
  log "ERROR: apt-get not found. This installer requires a Debian/Ubuntu-based system."
  exit 1
fi

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

# ─── Node.js 20 LTS ──────────────────────────────────────────────────────────
# C6: Node 18 is EOL (Apr 2025). Use Node 20 LTS.
# C6: Avoid curl|bash by using the NodeSource apt repository directly.
NODE_MAJOR=0
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node --version 2>/dev/null | grep -oP '(?<=v)\d+' || echo 0)
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  log "Node.js 20+ not found (found v${NODE_MAJOR}) — installing via NodeSource apt repository..."

  # Download the NodeSource GPG key and repo list (no piped execution)
  apt-get install -y ca-certificates curl gnupg
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y nodejs

  log "Node.js installed: $(node --version)"
else
  log "Node.js already installed: $(node --version)"
fi

log "Pre-install complete."
