#!/bin/bash
# Kaspa AIO — macOS post-install script
# Creates LaunchAgent plists for dashboard auto-start.
set -euo pipefail

log() { echo "[kaspa-aio-post-install] $*"; }

PROJECT_ROOT="${KASPA_AIO_ROOT:-/opt/kaspa-aio}"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
NODE_BIN=$(command -v node || echo "/usr/local/bin/node")

mkdir -p "$LAUNCH_AGENTS_DIR"

# M4: Determine the log directory first so the plist and the mkdir are always consistent.
# Try /var/log/kaspa-aio (requires root write access); fall back to user-local path.
if mkdir -p /var/log/kaspa-aio 2>/dev/null; then
  LOG_DIR="/var/log/kaspa-aio"
else
  LOG_DIR="$HOME/.kaspa-aio/logs"
  mkdir -p "$LOG_DIR"
fi
log "Log directory: $LOG_DIR"

# ─── Dashboard LaunchAgent ────────────────────────────────────────────────────
DASHBOARD_PLIST="$LAUNCH_AGENTS_DIR/com.kaspa-aio.dashboard.plist"
cat > "$DASHBOARD_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.kaspa-aio.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_ROOT}/services/dashboard/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${PROJECT_ROOT}/services/dashboard</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/dashboard.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/dashboard-error.log</string>
</dict>
</plist>
EOF

log "Dashboard LaunchAgent created: $DASHBOARD_PLIST"

# Load the agent for the current login session
launchctl load "$DASHBOARD_PLIST" 2>/dev/null || true
log "Dashboard LaunchAgent loaded."

log "macOS post-install complete."
