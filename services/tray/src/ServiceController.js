'use strict';

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const http = require('http');

const execAsync = promisify(exec);
const HEALTH_WAIT_MS = 10_000;
const HEALTH_POLL_MS = 500;

/**
 * Platform-aware service start/stop/status for wizard, dashboard, and Docker.
 */
class ServiceController {
  constructor(config) {
    this._config = config;
  }

  // ─── Wizard ─────────────────────────────────────────────────────────────

  async startWizard() {
    const { projectRoot } = this._config;
    if (process.platform === 'win32') {
      const serverPath = path.join(projectRoot, 'services', 'wizard', 'backend', 'src', 'server.js');
      spawn('node', [serverPath], { cwd: path.join(projectRoot, 'services', 'wizard', 'backend'), detached: true, stdio: 'ignore' }).unref();
    } else {
      const wizardScript = path.join(projectRoot, 'scripts', 'wizard.sh');
      execAsync(`bash "${wizardScript}" start install`, { cwd: projectRoot }).catch((err) =>
        console.error('Failed to start wizard:', err.message)
      );
    }
    await this._waitForHealth(`${this._config.wizardUrl}/api/health`);
  }

  async stopWizard() {
    const { projectRoot } = this._config;
    if (process.platform === 'win32') {
      const pidFile = path.join(projectRoot, '.wizard.pid');
      if (fs.existsSync(pidFile)) {
        const pid = fs.readFileSync(pidFile, 'utf8').trim();
        execAsync(`taskkill /PID ${pid} /F`).catch(() => {});
      }
    } else {
      const wizardScript = path.join(projectRoot, 'scripts', 'wizard.sh');
      await execAsync(`bash "${wizardScript}" stop`, { cwd: projectRoot }).catch((err) =>
        console.error('Failed to stop wizard:', err.message)
      );
    }
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────

  async startDashboard() {
    const { projectRoot } = this._config;
    if (process.platform === 'linux') {
      await execAsync('pkexec systemctl start kaspa-dashboard').catch((err) =>
        console.error('Failed to start dashboard:', err.message)
      );
    } else if (process.platform === 'darwin') {
      const plist = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.kaspa-aio.dashboard.plist');
      await execAsync(`launchctl load "${plist}"`).catch((err) =>
        console.error('Failed to start dashboard:', err.message)
      );
    } else {
      // Windows: try NSSM service first, fall back to direct spawn
      const started = await execAsync('net start KaspaDashboard').then(() => true).catch(() => false);
      if (!started) {
        const serverPath = path.join(projectRoot, 'services', 'dashboard', 'server.js');
        spawn('node', [serverPath], { cwd: path.join(projectRoot, 'services', 'dashboard'), detached: true, stdio: 'ignore' }).unref();
      }
    }
    await this._waitForHealth(`${this._config.dashboardUrl}/health`);
  }

  async stopDashboard() {
    if (process.platform === 'linux') {
      await execAsync('pkexec systemctl stop kaspa-dashboard').catch((err) =>
        console.error('Failed to stop dashboard:', err.message)
      );
    } else if (process.platform === 'darwin') {
      const plist = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.kaspa-aio.dashboard.plist');
      await execAsync(`launchctl unload "${plist}"`).catch((err) =>
        console.error('Failed to stop dashboard:', err.message)
      );
    } else {
      await execAsync('net stop KaspaDashboard').catch(() => {});
    }
  }

  // ─── Docker Services ────────────────────────────────────────────────────

  async startAllDockerServices() {
    const { projectRoot } = this._config;
    await execAsync('docker compose up -d', { cwd: projectRoot }).catch((err) =>
      console.error('Failed to start Docker services:', err.message)
    );
  }

  async stopAllDockerServices() {
    const { projectRoot } = this._config;
    await execAsync('docker compose down', { cwd: projectRoot }).catch((err) =>
      console.error('Failed to stop Docker services:', err.message)
    );
  }

  // ─── Composite: Start/Stop All ───────────────────────────────────────────

  async startAll() {
    await this.startWizard();
    await this.startDashboard();
    await this.startAllDockerServices();
  }

  async stopAll() {
    await this.stopAllDockerServices();
    await this.stopDashboard();
    await this.stopWizard();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  _checkEndpoint(url) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  async _waitForHealth(url, timeoutMs = HEALTH_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this._checkEndpoint(url)) return true;
      await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
    }
    return false;
  }
}

module.exports = ServiceController;
