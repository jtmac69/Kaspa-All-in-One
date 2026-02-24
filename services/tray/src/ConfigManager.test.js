'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { parseEnvFile, parsePort, getProjectRoot, getActiveProfiles } = require('./ConfigManager');

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir;
before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaspa-cm-test-')); });
after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

function tmpFile(name, content) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ─── parseEnvFile ─────────────────────────────────────────────────────────────

describe('parseEnvFile', () => {
  it('returns {} for a non-existent file', () => {
    assert.deepEqual(parseEnvFile('/no/such/path/.env'), {});
  });

  it('returns {} for an empty file', () => {
    assert.deepEqual(parseEnvFile(tmpFile('empty.env', '')), {});
  });

  it('returns {} for a comments-only file', () => {
    assert.deepEqual(parseEnvFile(tmpFile('comments.env', '# comment\n# another\n')), {});
  });

  it('parses a simple KEY=value pair', () => {
    assert.deepEqual(parseEnvFile(tmpFile('simple.env', 'PORT=8080\n')), { PORT: '8080' });
  });

  it('strips double quotes from values', () => {
    assert.deepEqual(parseEnvFile(tmpFile('dq.env', 'PORT="3000"\n')), { PORT: '3000' });
  });

  it('strips single quotes from values', () => {
    assert.deepEqual(parseEnvFile(tmpFile('sq.env', "PORT='3000'\n")), { PORT: '3000' });
  });

  it('uses only the first = to split key/value (value may contain =)', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('eq.env', 'DATABASE_URL=postgres://u:p@host/db?ssl=true\n')),
      { DATABASE_URL: 'postgres://u:p@host/db?ssl=true' }
    );
  });

  it('skips lines without an = character', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('noeq.env', 'INVALID_LINE\nPORT=9000\n')),
      { PORT: '9000' }
    );
  });

  it('trims whitespace around key and value', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('ws.env', '  PORT = 8080  \n')),
      { PORT: '8080' }
    );
  });

  it('parses multiple entries and skips comments', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('multi.env', 'WIZARD_PORT=3000\n# comment\nPORT=8080\n')),
      { WIZARD_PORT: '3000', PORT: '8080' }
    );
  });

  it('returns {} and does not throw when given a directory path', () => {
    // A directory passes existsSync but fails readFileSync — should fall back gracefully
    assert.deepEqual(parseEnvFile(tmpDir), {});
  });

  it('handles Windows CRLF line endings', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('crlf.env', 'PORT=8080\r\nWIZARD_PORT=3000\r\n')),
      { PORT: '8080', WIZARD_PORT: '3000' }
    );
  });

  it('last entry wins when a key is duplicated', () => {
    assert.deepEqual(
      parseEnvFile(tmpFile('dup.env', 'PORT=1111\nPORT=2222\n')),
      { PORT: '2222' }
    );
  });
});

// ─── parsePort ────────────────────────────────────────────────────────────────

describe('parsePort', () => {
  it('parses a valid numeric string', () => {
    assert.equal(parsePort('3000', 3000, 'TEST'), 3000);
  });

  it('parses lower boundary 1', () => {
    assert.equal(parsePort('1', 80, 'TEST'), 1);
  });

  it('parses upper boundary 65535', () => {
    assert.equal(parsePort('65535', 80, 'TEST'), 65535);
  });

  it('falls back to default for port 0', () => {
    assert.equal(parsePort('0', 3000, 'TEST'), 3000);
  });

  it('falls back to default for port 65536', () => {
    assert.equal(parsePort('65536', 3000, 'TEST'), 3000);
  });

  it('falls back to default for non-numeric string', () => {
    assert.equal(parsePort('abc', 3000, 'TEST'), 3000);
  });

  it('falls back to default for empty string', () => {
    assert.equal(parsePort('', 3000, 'TEST'), 3000);
  });

  it('parses a numeric string with leading zeros (parseInt behaviour)', () => {
    // parseInt('08', 10) === 8, which is valid
    assert.equal(parsePort('08080', 80, 'TEST'), 8080);
  });

  it('parses "3001.9" as 3001 (parseInt truncates fractional part)', () => {
    assert.equal(parsePort('3001.9', 80, 'TEST'), 3001);
  });
});

// ─── getProjectRoot ───────────────────────────────────────────────────────────

describe('getProjectRoot', () => {
  const origEnv = process.env.KASPA_AIO_ROOT;

  after(() => {
    if (origEnv === undefined) delete process.env.KASPA_AIO_ROOT;
    else process.env.KASPA_AIO_ROOT = origEnv;
  });

  it('returns KASPA_AIO_ROOT env var when set', () => {
    process.env.KASPA_AIO_ROOT = '/custom/root';
    assert.equal(getProjectRoot(), '/custom/root');
    delete process.env.KASPA_AIO_ROOT;
  });

  it('returns the repo root when running from within the repo (dev fallback)', () => {
    // When tests run from the repo, __dirname is services/tray/src
    // so three levels up is the repo root which contains docker-compose.yml
    delete process.env.KASPA_AIO_ROOT;
    const repoRoot = path.resolve(__dirname, '../../..');
    const hasCompose = fs.existsSync(path.join(repoRoot, 'docker-compose.yml'));
    if (hasCompose) {
      assert.equal(getProjectRoot(), repoRoot);
    } else {
      // In a CI environment without docker-compose.yml, it falls back to platform default
      const result = getProjectRoot();
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0);
    }
  });
});

// ─── getActiveProfiles ────────────────────────────────────────────────────────

describe('getActiveProfiles', () => {
  it('returns [] when the installation-config.json file does not exist', () => {
    const nonExistentRoot = path.join(tmpDir, 'no-such-root');
    assert.deepEqual(getActiveProfiles(nonExistentRoot), []);
  });

  it('returns [] when installation-config.json has no profiles key', () => {
    const root = path.join(tmpDir, 'no-profiles');
    fs.mkdirSync(path.join(root, 'services'), { recursive: true });
    fs.writeFileSync(path.join(root, 'services', 'installation-config.json'), JSON.stringify({ version: '1.0.0' }));
    assert.deepEqual(getActiveProfiles(root), []);
  });

  it('returns [] when profiles key is not an array', () => {
    const root = path.join(tmpDir, 'bad-profiles');
    fs.mkdirSync(path.join(root, 'services'), { recursive: true });
    fs.writeFileSync(path.join(root, 'services', 'installation-config.json'), JSON.stringify({ profiles: 'kaspa-node' }));
    assert.deepEqual(getActiveProfiles(root), []);
  });

  it('returns [] and logs a warning when installation-config.json contains invalid JSON', () => {
    const root = path.join(tmpDir, 'invalid-json');
    fs.mkdirSync(path.join(root, 'services'), { recursive: true });
    fs.writeFileSync(path.join(root, 'services', 'installation-config.json'), 'not valid json {{{');
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      assert.deepEqual(getActiveProfiles(root), []);
      assert.ok(warnings.some((w) => w.includes('installation-config.json')),
        'should log a warning mentioning installation-config.json');
    } finally {
      console.warn = origWarn;
    }
  });

  it('returns the profiles array from a valid installation-config.json', () => {
    const root = path.join(tmpDir, 'valid-profiles');
    fs.mkdirSync(path.join(root, 'services'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'services', 'installation-config.json'),
      JSON.stringify({ profiles: ['kaspa-node', 'portainer'] })
    );
    assert.deepEqual(getActiveProfiles(root), ['kaspa-node', 'portainer']);
  });

  it('returns [] for an empty profiles array', () => {
    const root = path.join(tmpDir, 'empty-profiles');
    fs.mkdirSync(path.join(root, 'services'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'services', 'installation-config.json'),
      JSON.stringify({ profiles: [] })
    );
    assert.deepEqual(getActiveProfiles(root), []);
  });
});
