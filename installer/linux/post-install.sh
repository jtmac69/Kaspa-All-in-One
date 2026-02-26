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

# ─── Download and extract project files ───────────────────────────────────────
# The .deb installs the tray binary but the project code (wizard, dashboard,
# docker-compose, etc.) lives in a separate tarball on GitHub Releases.
# We detect the installed version from the dpkg database and pull the matching
# tarball so /opt/kaspa-aio contains a fully working installation.
#
# This section runs BEFORE the systemd service install so the service file
# (services/dashboard/kaspa-dashboard.service) is present when we need it.

REPO="jtmac69/Kaspa-All-in-One"

# dpkg version may include a Debian revision suffix (e.g. "0.9.2-1") — strip
# it so we construct a clean semver GitHub tag (e.g. "0.9.2").
VERSION=$(dpkg-query -W -f='${Version}' kaspa-aio 2>/dev/null | sed 's/-[0-9]*$//' || true)

if [ -z "$VERSION" ]; then
  log "Warning: Could not detect installed package version via dpkg. Skipping project file download."
  log "  Manually extract the release tarball to ${PROJECT_ROOT}:"
  log "  https://github.com/${REPO}/releases"
else
  TARBALL_URL="https://github.com/${REPO}/releases/download/v${VERSION}/kaspa-aio-${VERSION}.tar.gz"
  TARBALL_TMP="/tmp/kaspa-aio-${VERSION}.tar.gz"

  # Ensure the temp file is removed on any exit (success, error, or signal).
  trap 'rm -f "$TARBALL_TMP"' EXIT

  log "Downloading project files v${VERSION} from GitHub..."
  if ! curl -fsSL -o "$TARBALL_TMP" "$TARBALL_URL"; then
    log "Error: Failed to download project files from ${TARBALL_URL}"
    log "  Check network connectivity and retry with: dpkg --configure -a"
    log "  Or manually extract the tarball to ${PROJECT_ROOT} and re-run dpkg."
    exit 1
  fi

  # Reject HTML or plain-text responses that curl accepted (CDN edge case: some
  # CDNs return 200 with an HTML error page when the object is missing, passing
  # curl's -f check while delivering unusable content).
  if file "$TARBALL_TMP" | grep -qiE 'HTML|text'; then
    log "Error: Downloaded file is not a gzip archive (got HTML/text — possible CDN error page)."
    log "  URL: ${TARBALL_URL}"
    exit 1
  fi

  log "Extracting to ${PROJECT_ROOT}..."
  # The archive is created with `tar czf archive.tar.gz .` from the repo root,
  # producing entries with a leading `.` component (e.g. `./services/foo`).
  # --strip-components=1 drops that leading `.` component so files extract
  # directly into PROJECT_ROOT (e.g. `./services/foo` → `services/foo`).
  tar -xzf "$TARBALL_TMP" -C "$PROJECT_ROOT" --strip-components=1

  # Verify that the extraction actually populated PROJECT_ROOT.
  # A wrong --strip-components depth or unexpected archive structure would leave
  # the directory empty; we catch that here instead of letting systemd fail later.
  if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    log "Error: Extraction completed but docker-compose.yml is missing from ${PROJECT_ROOT}."
    log "  The archive may have an unexpected internal structure."
    log "  Re-download and inspect with: tar tzf <archive> | head -20"
    exit 1
  fi

  # Re-apply ownership after extraction.
  chown -R root:kaspa-aio "$PROJECT_ROOT"
  chmod -R g+rX "$PROJECT_ROOT"
  log "Project files installed to ${PROJECT_ROOT}"
fi

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
