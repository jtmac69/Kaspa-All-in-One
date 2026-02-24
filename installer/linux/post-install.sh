#!/bin/bash
# Kaspa AIO — Linux post-install script (runs as root via .deb postinst)
# Sets up system group/user, project directory, systemd service, and XDG autostart.
set -euo pipefail

log() { echo "[kaspa-aio-post-install] $*"; }

PROJECT_ROOT="${KASPA_AIO_ROOT:-/opt/kaspa-aio}"
TRAY_BIN="/opt/KaspaAIO/kaspa-aio-tray"
TRAY_ICON="/opt/KaspaAIO/resources/app/assets/icon.png"

# ─── System group + service user ─────────────────────────────────────────────
if ! getent group kaspa-aio &>/dev/null; then
  groupadd --system kaspa-aio
  log "Created system group: kaspa-aio"
fi

if ! id -u kaspa-dashboard &>/dev/null; then
  useradd --system --gid kaspa-aio --home /opt/kaspa-dashboard --shell /usr/sbin/nologin kaspa-dashboard
  log "Created system user: kaspa-dashboard"
fi

# ─── Project root ─────────────────────────────────────────────────────────────
mkdir -p "$PROJECT_ROOT"
chown root:kaspa-aio "$PROJECT_ROOT"
chmod 775 "$PROJECT_ROOT"
log "Project root: $PROJECT_ROOT"

# ─── Dashboard systemd service ────────────────────────────────────────────────
DASHBOARD_SERVICE="$PROJECT_ROOT/services/dashboard/kaspa-dashboard.service"
if [ -f "$DASHBOARD_SERVICE" ]; then
  cp "$DASHBOARD_SERVICE" /etc/systemd/system/kaspa-dashboard.service
  systemctl daemon-reload
  systemctl enable kaspa-dashboard
  log "Dashboard systemd service installed and enabled."
else
  log "Warning: kaspa-dashboard.service not found at $DASHBOARD_SERVICE — skipping."
fi

# ─── Wizard systemd service (optional user service) ──────────────────────────
WIZARD_SERVICE="$(dirname "$0")/kaspa-wizard.service"
if [ -f "$WIZARD_SERVICE" ]; then
  cp "$WIZARD_SERVICE" /etc/systemd/system/kaspa-wizard.service
  systemctl daemon-reload
  log "Wizard systemd service installed (not auto-enabled — wizard is on-demand)."
fi

# ─── XDG autostart entry for tray app ─────────────────────────────────────────
AUTOSTART_DIR="/etc/xdg/autostart"
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_DIR/kaspa-aio-tray.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Kaspa AIO
Comment=Kaspa blockchain infrastructure manager
Exec=${TRAY_BIN}
Icon=${TRAY_ICON}
Categories=Network;
X-GNOME-Autostart-enabled=true
Hidden=false
NoDisplay=false
EOF
log "XDG autostart entry created: $AUTOSTART_DIR/kaspa-aio-tray.desktop"

# ─── Add current user to docker group (if running as non-root installer) ──────
if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER" 2>/dev/null && \
    log "Added $SUDO_USER to docker group (re-login required)." || true
fi

log "Post-install complete."
