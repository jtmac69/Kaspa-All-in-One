'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolves project root and reads .env for port overrides.
 * Priority: KASPA_AIO_ROOT env var → platform default path.
 */

const PLATFORM_DEFAULTS = {
  linux: '/opt/kaspa-aio',
  darwin: path.join(os.homedir(), 'Library', 'Application Support', 'kaspa-aio'),
  win32: path.join(process.env.APPDATA || os.homedir(), 'kaspa-aio'),
};

function getProjectRoot() {
  if (process.env.KASPA_AIO_ROOT) return process.env.KASPA_AIO_ROOT;
  const platformDefault = PLATFORM_DEFAULTS[process.platform] || '/opt/kaspa-aio';
  // If we can't find the platform default, fall back to directory relative to this file
  // (useful for development: running tray app from the repo)
  if (!fs.existsSync(platformDefault)) {
    const repoRoot = path.resolve(__dirname, '../../..');
    if (fs.existsSync(path.join(repoRoot, 'docker-compose.yml'))) return repoRoot;
  }
  return platformDefault;
}

function parseEnvFile(envPath) {
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    vars[key] = value;
  }
  return vars;
}

async function load() {
  const projectRoot = getProjectRoot();
  const envVars = parseEnvFile(path.join(projectRoot, '.env'));

  const wizardPort = parseInt(envVars.WIZARD_PORT || process.env.WIZARD_PORT || '3000', 10);
  const dashboardPort = parseInt(envVars.PORT || process.env.PORT || '8080', 10);

  return {
    projectRoot,
    wizardPort,
    dashboardPort,
    wizardUrl: `http://localhost:${wizardPort}`,
    dashboardUrl: `http://localhost:${dashboardPort}`,
  };
}

module.exports = { load, getProjectRoot, parseEnvFile };
