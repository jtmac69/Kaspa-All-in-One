'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolves project root and reads .env for port overrides.
 * Priority: KASPA_AIO_ROOT env var → platform default path → repo root fallback.
 */

const PLATFORM_DEFAULTS = {
  linux: '/opt/kaspa-aio',
  darwin: path.join(os.homedir(), 'Library', 'Application Support', 'kaspa-aio'),
  win32: path.join(process.env.APPDATA || os.homedir(), 'kaspa-aio'),
};

function getProjectRoot() {
  if (process.env.KASPA_AIO_ROOT) return process.env.KASPA_AIO_ROOT;
  const platformDefault = PLATFORM_DEFAULTS[process.platform] || '/opt/kaspa-aio';
  if (!fs.existsSync(platformDefault)) {
    // Dev fallback: __dirname is services/tray/src, so three levels up is the repo root
    const repoRoot = path.resolve(__dirname, '../../..');
    if (fs.existsSync(path.join(repoRoot, 'docker-compose.yml'))) return repoRoot;
    // Warn when no valid root found so downstream failures are diagnosable
    console.warn(
      `[ConfigManager] Project root not found at "${platformDefault}" and no ` +
      `docker-compose.yml found at "${repoRoot}". ` +
      `Set KASPA_AIO_ROOT to the correct path. Defaulting to "${platformDefault}".`
    );
  }
  return platformDefault;
}

function parseEnvFile(envPath) {
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  let content;
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    // Fall back to defaults on any read error (e.g. EACCES, EISDIR) —
    // the .env file is optional for the tray app
    console.warn(`[ConfigManager] Could not read .env at ${envPath}: ${err.message}. Using default ports.`);
    return vars;
  }
  for (const line of content.split('\n')) {
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

// Validates the parsed port value and falls back to the default on invalid input.
// Accepts the full 1–65535 range; the deployment environment controls whether
// the process can bind to privileged ports (< 1024).
function parsePort(rawValue, defaultPort, varName) {
  const parsed = parseInt(rawValue, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`[ConfigManager] Invalid value for ${varName}: "${rawValue}". Using default port ${defaultPort}.`);
    return defaultPort;
  }
  return parsed;
}

async function load() {
  const projectRoot = getProjectRoot();
  const envVars = parseEnvFile(path.join(projectRoot, '.env'));

  const wizardPort = parsePort(
    envVars.WIZARD_PORT || process.env.WIZARD_PORT || '3000',
    3000,
    'WIZARD_PORT'
  );
  const dashboardPort = parsePort(
    envVars.PORT || process.env.PORT || '8080',
    8080,
    'PORT'
  );

  return {
    projectRoot,
    wizardPort,
    dashboardPort,
    wizardUrl: `http://localhost:${wizardPort}`,
    dashboardUrl: `http://localhost:${dashboardPort}`,
  };
}

module.exports = { load, getProjectRoot, parseEnvFile };
