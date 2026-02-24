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

  start() {
    this._poll();
    this._interval = setInterval(() => this._poll(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
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
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  /** Returns the most recently known status without polling */
  getLastStatus() {
    return { ...this._lastStatus };
  }
}

module.exports = HealthMonitor;
