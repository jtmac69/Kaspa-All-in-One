'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Checks for Docker, Docker Compose, and Node.js 18+ at startup.
 */
async function check() {
  const missing = [];

  // Docker
  const dockerOk = await execAsync('docker --version').then(() => true).catch(() => false);
  if (!dockerOk) missing.push('Docker');

  // Docker Compose (v2 plugin)
  const composeOk = await execAsync('docker compose version').then(() => true).catch(() => false);
  if (!composeOk) missing.push('Docker Compose');

  // Node.js >= 18
  const nodeOk = await execAsync('node --version')
    .then(({ stdout }) => {
      const match = stdout.trim().match(/^v(\d+)/);
      return match ? parseInt(match[1], 10) >= 18 : false;
    })
    .catch(() => false);
  if (!nodeOk) missing.push('Node.js 18+');

  if (missing.length === 0) return { ok: true, missing: [], message: '' };

  const message = [
    'Kaspa AIO requires the following to be installed:',
    '',
    missing.map((m) => `  • ${m}`).join('\n'),
    '',
    'Please install the missing prerequisites and relaunch Kaspa AIO.',
    '',
    'Install guides:',
    '  Docker: https://docs.docker.com/get-docker/',
    '  Node.js: https://nodejs.org/',
  ].join('\n');

  return { ok: false, missing, message };
}

module.exports = { check };
