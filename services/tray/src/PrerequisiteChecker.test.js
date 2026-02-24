'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('child_process');
const { promisify } = require('util');

// ─── execFile mock infrastructure ────────────────────────────────────────────
//
// PrerequisiteChecker binds execFileAsync = promisify(execFile) at module load
// time, so we must replace childProcess.execFile BEFORE requiring the module.
// We reload the module for each variant by deleting the require cache entry.

const PREREQ_PATH = require.resolve('./PrerequisiteChecker');
const origExecFile = childProcess.execFile;

after(() => {
  childProcess.execFile = origExecFile;
  delete require.cache[PREREQ_PATH];
});

/**
 * Builds a mock execFile.
 * resultOf(cmd, args) returns { stdout } on success, or throws on failure.
 * Defines promisify.custom so execFileAsync resolves with { stdout, stderr },
 * matching the real child_process.execFile contract.
 */
function makeMockExecFile(resultOf) {
  function mock(cmd, args, optsOrCb, maybeCb) {
    const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
    try {
      const { stdout = '' } = resultOf(cmd, args) || {};
      setImmediate(() => cb(null, stdout, ''));
    } catch (err) {
      setImmediate(() => cb(err, '', ''));
    }
  }
  // Without this, promisify() would resolve with just the first callback arg
  // (a string), not { stdout, stderr }. The real execFile uses the same trick.
  mock[promisify.custom] = (cmd, args) =>
    new Promise((resolve, reject) => {
      try {
        const { stdout = '' } = resultOf(cmd, args) || {};
        resolve({ stdout, stderr: '' });
      } catch (err) {
        reject(err);
      }
    });
  return mock;
}

/** Returns a fresh PrerequisiteChecker module backed by the given mock. */
function loadChecker(resultOf) {
  delete require.cache[PREREQ_PATH];
  childProcess.execFile = makeMockExecFile(resultOf);
  const mod = require('./PrerequisiteChecker');
  childProcess.execFile = origExecFile;
  return mod;
}

function enoent(cmd) {
  return Object.assign(new Error(`${cmd}: not found`), { code: 'ENOENT' });
}

// Scenario helpers
const ALL_OK = (cmd) => {
  if (cmd === 'node') return { stdout: 'v20.0.0\n' };
  return { stdout: 'Docker version 24.0.0\n' };
};
const ALL_MISSING = () => { throw enoent('any'); };

// ─── Return shape ─────────────────────────────────────────────────────────────

describe('PrerequisiteChecker.check — return shape', () => {
  it('returns { ok: true, missing: [], message: "" } when all prerequisites present', async () => {
    const { check } = loadChecker(ALL_OK);
    const result = await check();
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
    assert.equal(result.message, '');
  });

  it('always returns { ok (bool), missing (array), message (string) }', async () => {
    const { check } = loadChecker(ALL_MISSING);
    const result = await check();
    assert.equal(typeof result.ok, 'boolean');
    assert.ok(Array.isArray(result.missing));
    assert.equal(typeof result.message, 'string');
  });
});

// ─── Missing prerequisites ────────────────────────────────────────────────────

describe('PrerequisiteChecker.check — missing prerequisites', () => {
  it('reports Docker missing when docker --version fails', async () => {
    const { check } = loadChecker((cmd, args) => {
      if (cmd === 'docker' && args[0] === '--version') throw enoent('docker');
      if (cmd === 'node') return { stdout: 'v20.0.0\n' };
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.ok(result.missing.includes('Docker'));
    assert.ok(!result.missing.includes('Node.js 18+'));
  });

  it('reports Docker Compose missing when docker compose version fails', async () => {
    const { check } = loadChecker((cmd, args) => {
      if (cmd === 'docker' && args[0] === 'compose') throw enoent('docker compose');
      if (cmd === 'node') return { stdout: 'v20.0.0\n' };
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.ok(result.missing.includes('Docker Compose'));
    assert.ok(!result.missing.includes('Docker'), 'docker --version succeeded; only compose is missing');
  });

  it('reports Node.js 18+ missing when node executable is absent', async () => {
    const { check } = loadChecker((cmd) => {
      if (cmd === 'node') throw enoent('node');
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.ok(result.missing.includes('Node.js 18+'));
  });

  it('rejects Node.js v17 as too old', async () => {
    const { check } = loadChecker((cmd) => {
      if (cmd === 'node') return { stdout: 'v17.9.0\n' };
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes('Node.js 18+'));
  });

  it('accepts Node.js v18', async () => {
    const { check } = loadChecker((cmd) => {
      if (cmd === 'node') return { stdout: 'v18.0.0\n' };
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.ok(!result.missing.includes('Node.js 18+'));
  });

  it('accepts Node.js v20', async () => {
    const { check } = loadChecker(ALL_OK);
    const result = await check();
    assert.ok(!result.missing.includes('Node.js 18+'));
  });

  it('ok=false and message non-empty when any prerequisite is missing', async () => {
    const { check } = loadChecker((cmd) => {
      if (cmd === 'node') throw enoent('node');
      return { stdout: 'ok\n' };
    });
    const result = await check();
    assert.equal(result.ok, false);
    assert.ok(result.message.length > 0);
  });

  it('message mentions every item in missing[]', async () => {
    const { check } = loadChecker(ALL_MISSING);
    const result = await check();
    assert.ok(result.missing.length > 0, 'should report at least one missing item');
    for (const item of result.missing) {
      assert.ok(result.message.includes(item), `message should mention "${item}"`);
    }
  });

  it('ok=false when all three checks fail', async () => {
    const { check } = loadChecker(ALL_MISSING);
    const result = await check();
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes('Docker'));
    assert.ok(result.missing.includes('Docker Compose'));
    assert.ok(result.missing.includes('Node.js 18+'));
  });
});
