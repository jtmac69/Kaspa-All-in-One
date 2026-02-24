'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Checks for Docker, Docker Compose, and Node.js 18+ at startup.
 */
async function check() {
  const missing = [];

  // Use execFile (no shell) to be consistent with the rest of the codebase.
  // Log unexpected failures (e.g. ENOMEM, EACCES) so they are not misattributed
  // to the tool being missing.
  const run = (cmd, args) =>
    execFileAsync(cmd, args)
      .then(() => true)
      .catch((err) => {
        if (err.code !== 'ENOENT' && err.code !== 127) {
          console.warn(`[PrerequisiteChecker] ${cmd} check failed unexpectedly:`, err.message);
        }
        return false;
      });

  // Docker
  const dockerOk = await run('docker', ['--version']);
  if (!dockerOk) missing.push('Docker');

  // Docker Compose (v2 plugin)
  const composeOk = await run('docker', ['compose', 'version']);
  if (!composeOk) missing.push('Docker Compose');

  // Node.js >= 18
  const nodeOk = await execFileAsync('node', ['--version'])
    .then(({ stdout }) => {
      const match = stdout.trim().match(/^v(\d+)/);
      return match ? parseInt(match[1], 10) >= 18 : false;
    })
    .catch((err) => {
      if (err.code !== 'ENOENT' && err.code !== 127) {
        console.warn('[PrerequisiteChecker] node --version check failed unexpectedly:', err.message);
      }
      return false;
    });
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
