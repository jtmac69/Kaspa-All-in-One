'use strict';

const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const http = require('http');

const execFileAsync = promisify(execFile);
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
      const cwd = path.join(projectRoot, 'services', 'wizard', 'backend');
      // spawn() errors do not throw — attach error handler or failures are silently dropped
      const child = spawn('node', [serverPath], { cwd, detached: true, stdio: 'ignore' });
      child.on('error', (err) => console.error('[ServiceController] Failed to spawn wizard:', err.message));
      child.unref();
    } else {
      const wizardScript = path.join(projectRoot, 'scripts', 'wizard.sh');
      // wizard.sh daemonizes itself, so we await the initial launch but not the
      // daemonized child. Propagate errors so the health-check timeout isn't the
      // only signal when the script itself fails (e.g. not found, not executable).
      await execFileAsync('bash', [wizardScript, 'start', 'install'], { cwd: projectRoot })
        .catch((err) => {
          throw new Error(`Failed to launch wizard.sh: ${err.message}`);
        });
    }
    // Throw if the service does not respond within the health-check window —
    // prevents silent failures where the caller assumes the service started.
    const healthy = await this._waitForHealth(`${this._config.wizardUrl}/api/health`);
    if (!healthy) {
      throw new Error('Wizard did not become healthy within 10 seconds. Check system logs.');
    }
  }

  async stopWizard() {
    const { projectRoot } = this._config;
    if (process.platform === 'win32') {
      const pidFile = path.join(projectRoot, '.wizard.pid');
      if (fs.existsSync(pidFile)) {
        const rawPid = fs.readFileSync(pidFile, 'utf8').trim();
        // Validate PID is numeric before use — prevents command injection via tampered PID file.
        // Use execFileAsync (no shell) as a second layer of defense.
        if (!/^\d+$/.test(rawPid)) {
          console.warn(`[ServiceController] Invalid PID in .wizard.pid: "${rawPid}" — skipping kill`);
          return;
        }
        await execFileAsync('taskkill', ['/PID', rawPid, '/F']).catch((err) =>
          console.warn(`[ServiceController] Could not kill wizard (PID ${rawPid}): ${err.message}`)
        );
      }
    } else {
      const wizardScript = path.join(projectRoot, 'scripts', 'wizard.sh');
      await execFileAsync('bash', [wizardScript, 'stop'], { cwd: projectRoot }).catch((err) =>
        console.error('[ServiceController] Failed to stop wizard:', err.message)
      );
    }
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────

  async startDashboard() {
    const { projectRoot } = this._config;
    if (process.platform === 'linux') {
      // Rethrow so the caller (menu click handler) shows the real error (e.g.
      // "user cancelled authentication") rather than a misleading health-check timeout.
      await execFileAsync('pkexec', ['systemctl', 'start', 'kaspa-dashboard']).catch((err) => {
        throw new Error(`Failed to start dashboard via systemctl: ${err.message}`);
      });
    } else if (process.platform === 'darwin') {
      const plist = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.kaspa-aio.dashboard.plist');
      await execFileAsync('launchctl', ['load', plist]).catch((err) => {
        throw new Error(`Failed to load dashboard LaunchAgent: ${err.message}`);
      });
    } else {
      // Windows: try NSSM service first, fall back to direct spawn
      const started = await execFileAsync('net', ['start', 'KaspaDashboard']).then(() => true).catch(() => false);
      if (!started) {
        const serverPath = path.join(projectRoot, 'services', 'dashboard', 'server.js');
        const cwd = path.join(projectRoot, 'services', 'dashboard');
        const child = spawn('node', [serverPath], { cwd, detached: true, stdio: 'ignore' });
        child.on('error', (err) => console.error('[ServiceController] Failed to spawn dashboard:', err.message));
        child.unref();
      }
    }
    const healthy = await this._waitForHealth(`${this._config.dashboardUrl}/health`);
    if (!healthy) {
      throw new Error('Dashboard did not become healthy within 10 seconds. Check system logs.');
    }
  }

  async stopDashboard() {
    if (process.platform === 'linux') {
      await execFileAsync('pkexec', ['systemctl', 'stop', 'kaspa-dashboard']).catch((err) =>
        console.error('[ServiceController] Failed to stop dashboard:', err.message)
      );
    } else if (process.platform === 'darwin') {
      const plist = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.kaspa-aio.dashboard.plist');
      await execFileAsync('launchctl', ['unload', plist]).catch((err) =>
        console.error('[ServiceController] Failed to stop dashboard:', err.message)
      );
    } else {
      // NSSM service is optional on Windows — warn rather than error if not registered
      await execFileAsync('net', ['stop', 'KaspaDashboard']).catch((err) =>
        console.warn('[ServiceController] Could not stop KaspaDashboard service (may not be registered):', err.message)
      );
    }
  }

  // ─── Docker Services ────────────────────────────────────────────────────

  // Reads active profiles from installation-config.json and passes --profile
  // flags so only the configured service set is started/stopped.
  async startAllDockerServices() {
    const { projectRoot } = this._config;
    const profileArgs = this._getActiveProfileArgs(projectRoot);
    const args = ['compose', ...profileArgs, 'up', '-d'];
    // Propagate errors to startAll()'s error accumulator
    await execFileAsync('docker', args, { cwd: projectRoot });
  }

  async stopAllDockerServices() {
    const { projectRoot } = this._config;
    await execFileAsync('docker', ['compose', 'down'], { cwd: projectRoot });
  }

  // ─── Composite: Start/Stop All ───────────────────────────────────────────

  // Collects per-service errors so partial failures are surfaced to the caller.
  async startAll() {
    const errors = [];
    await this.startWizard().catch((err) => errors.push(`Wizard: ${err.message}`));
    await this.startDashboard().catch((err) => errors.push(`Dashboard: ${err.message}`));
    await this.startAllDockerServices().catch((err) => errors.push(`Docker: ${err.message}`));
    if (errors.length > 0) throw new Error(`Some services failed to start:\n${errors.join('\n')}`);
  }

  // Stops in reverse start order: Docker containers first so they don't call
  // into node services that have already exited.
  async stopAll() {
    const errors = [];
    await this.stopAllDockerServices().catch((err) => errors.push(`Docker: ${err.message}`));
    await this.stopDashboard().catch((err) => errors.push(`Dashboard: ${err.message}`));
    await this.stopWizard().catch((err) => errors.push(`Wizard: ${err.message}`));
    if (errors.length > 0) throw new Error(`Some services failed to stop:\n${errors.join('\n')}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // Reads the `profiles` array from installation-config.json and returns the
  // corresponding --profile flag pairs for docker compose.
  _getActiveProfileArgs(projectRoot) {
    try {
      const configPath = path.join(projectRoot, 'services', 'installation-config.json');
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      // Key is `profiles` (not `activeProfiles`) as written by config-generator.js
      const profiles = Array.isArray(config.profiles) ? config.profiles : [];
      return profiles.flatMap((p) => ['--profile', p]);
    } catch (err) {
      // Config missing or unreadable — fall back to no profiles (starts only profile-less services)
      console.warn('[ServiceController] Could not read installation-config.json:', err.message, '— running docker compose without --profile');
      return [];
    }
  }

  // Lightweight probe used only by _waitForHealth. Uses a shorter timeout (2s)
  // than HealthMonitor._checkEndpoint because it is called in a tight polling loop.
  // Logs unexpected errors to distinguish transient "not up yet" from broken URLs.
  _checkEndpoint(url) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
        res.resume();
      });
      req.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
          console.warn(`[ServiceController] Health check ${url} — ${err.code || err.message}`);
        }
        resolve(false);
      });
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
