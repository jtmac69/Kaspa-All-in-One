'use strict';

const http = require('http');

const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Polls wizard and dashboard health endpoints.
 * Fires callback(status) whenever status changes.
 * Status shape: { wizard: boolean, dashboard: boolean }
 */
class HealthMonitor {
  constructor(config, onStatusChange) {
    this._config = config;
    this._onStatusChange = onStatusChange;
    this._interval = null;
    this._lastStatus = { wizard: false, dashboard: false };
  }

  // H2: Attach .catch() to all _poll() calls so async exceptions don't become
  // unhandled rejections that silently kill the polling loop.
  start() {
    this._poll().catch((err) => console.error('[HealthMonitor] Poll error:', err.message));
    this._interval = setInterval(
      () => this._poll().catch((err) => console.error('[HealthMonitor] Poll error:', err.message)),
      POLL_INTERVAL_MS
    );
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  // M2: Public method for external callers (replaces direct _poll() access from TrayManager)
  pollNow() {
    this._poll().catch((err) => console.error('[HealthMonitor] Poll error:', err.message));
  }

  async _poll() {
    const [wizard, dashboard] = await Promise.all([
      this._checkEndpoint(`${this._config.wizardUrl}/api/health`),
      this._checkEndpoint(`${this._config.dashboardUrl}/health`),
    ]);
    const status = { wizard, dashboard };
    if (status.wizard !== this._lastStatus.wizard || status.dashboard !== this._lastStatus.dashboard) {
      this._lastStatus = status;
      this._onStatusChange(status);
    }
  }

  _checkEndpoint(url) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
        res.resume(); // drain response
      });
      req.on('error', (err) => {
        // Log non-connection-refused errors to aid debugging (ENOTFOUND, EHOSTUNREACH, etc.)
        if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
          console.warn(`[HealthMonitor] ${url} — ${err.code || err.message}`);
        }
        resolve(false);
      });
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  /** Returns the most recently known status without polling */
  getLastStatus() {
    return { ...this._lastStatus };
  }
}

module.exports = HealthMonitor;
