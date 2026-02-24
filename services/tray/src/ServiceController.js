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
      // C4: Listen for spawn errors so failures are logged, not silently dropped
      const child = spawn('node', [serverPath], { cwd, detached: true, stdio: 'ignore' });
      child.on('error', (err) => console.error('[ServiceController] Failed to spawn wizard:', err.message));
      child.unref();
    } else {
      const wizardScript = path.join(projectRoot, 'scripts', 'wizard.sh');
      // wizard.sh daemonizes itself — fire-and-forget is intentional, but log failures
      execFileAsync('bash', [wizardScript, 'start', 'install'], { cwd: projectRoot })
        .catch((err) => console.error('[ServiceController] Failed to start wizard:', err.message));
    }
    // H3/H4: Check return value — throw if service never became healthy
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
        // C5: Validate PID is numeric before using it in a command
        if (!/^\d+$/.test(rawPid)) {
          console.warn(`[ServiceController] Invalid PID in .wizard.pid: "${rawPid}" — skipping kill`);
          return;
        }
        // C5: Use execFileAsync (no shell) to prevent injection via PID file
        // H7: Await and log errors — don't silently swallow stop failures
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
      await execFileAsync('pkexec', ['systemctl', 'start', 'kaspa-dashboard']).catch((err) =>
        console.error('[ServiceController] Failed to start dashboard:', err.message)
      );
    } else if (process.platform === 'darwin') {
      const plist = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.kaspa-aio.dashboard.plist');
      await execFileAsync('launchctl', ['load', plist]).catch((err) =>
        console.error('[ServiceController] Failed to start dashboard:', err.message)
      );
    } else {
      // Windows: try NSSM service first, fall back to direct spawn
      const started = await execFileAsync('net', ['start', 'KaspaDashboard']).then(() => true).catch(() => false);
      if (!started) {
        const serverPath = path.join(projectRoot, 'services', 'dashboard', 'server.js');
        const cwd = path.join(projectRoot, 'services', 'dashboard');
        // C4: Listen for spawn errors
        const child = spawn('node', [serverPath], { cwd, detached: true, stdio: 'ignore' });
        child.on('error', (err) => console.error('[ServiceController] Failed to spawn dashboard:', err.message));
        child.unref();
      }
    }
    // H3: Check return value — throw if service never became healthy
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
      // C3: Log stop errors instead of silently swallowing them
      await execFileAsync('net', ['stop', 'KaspaDashboard']).catch((err) =>
        console.warn('[ServiceController] Could not stop KaspaDashboard service (may not be registered):', err.message)
      );
    }
  }

  // ─── Docker Services ────────────────────────────────────────────────────

  // C7: Read active profiles from installation state so we start only what was configured
  async startAllDockerServices() {
    const { projectRoot } = this._config;
    const profileArgs = this._getActiveProfileArgs(projectRoot);
    const args = ['compose', ...profileArgs, 'up', '-d'];
    await execFileAsync('docker', args, { cwd: projectRoot }).catch((err) =>
      console.error('[ServiceController] Failed to start Docker services:', err.message)
    );
  }

  async stopAllDockerServices() {
    const { projectRoot } = this._config;
    await execFileAsync('docker', ['compose', 'down'], { cwd: projectRoot }).catch((err) =>
      console.error('[ServiceController] Failed to stop Docker services:', err.message)
    );
  }

  // ─── Composite: Start/Stop All ───────────────────────────────────────────

  // M2: Collect results so partial failures can be surfaced to the caller
  async startAll() {
    const errors = [];
    await this.startWizard().catch((err) => errors.push(`Wizard: ${err.message}`));
    await this.startDashboard().catch((err) => errors.push(`Dashboard: ${err.message}`));
    await this.startAllDockerServices().catch((err) => errors.push(`Docker: ${err.message}`));
    if (errors.length > 0) throw new Error(`Some services failed to start:\n${errors.join('\n')}`);
  }

  async stopAll() {
    const errors = [];
    await this.stopAllDockerServices().catch((err) => errors.push(`Docker: ${err.message}`));
    await this.stopDashboard().catch((err) => errors.push(`Dashboard: ${err.message}`));
    await this.stopWizard().catch((err) => errors.push(`Wizard: ${err.message}`));
    if (errors.length > 0) throw new Error(`Some services failed to stop:\n${errors.join('\n')}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // C7: Read active profiles from installation-config.json
  _getActiveProfileArgs(projectRoot) {
    try {
      const configPath = path.join(projectRoot, 'services', 'installation-config.json');
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      const profiles = Array.isArray(config.activeProfiles) ? config.activeProfiles : [];
      return profiles.flatMap((p) => ['--profile', p]);
    } catch (err) {
      // If config is missing or unreadable, fall back to no-profile (starts only profile-less services)
      console.warn('[ServiceController] Could not read installation-config.json:', err.message, '— running docker compose without --profile');
      return [];
    }
  }

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
