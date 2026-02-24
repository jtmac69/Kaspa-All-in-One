'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ServiceController = require('./ServiceController');

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir;
before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaspa-sc-test-')); });
after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

function makeController(projectRoot) {
  return new ServiceController({
    projectRoot: projectRoot || tmpDir,
    wizardUrl: 'http://localhost:3000',
    dashboardUrl: 'http://localhost:8080',
  });
}

function writeInstallConfig(dir, data) {
  const servicesDir = path.join(dir, 'services');
  fs.mkdirSync(servicesDir, { recursive: true });
  fs.writeFileSync(
    path.join(servicesDir, 'installation-config.json'),
    JSON.stringify(data),
    'utf8'
  );
}

// ─── _getActiveProfileArgs ────────────────────────────────────────────────────

describe('ServiceController._getActiveProfileArgs', () => {
  it('returns --profile flag pairs for each active profile', () => {
    writeInstallConfig(tmpDir, { profiles: ['kaspa-node', 'kasia-app'] });
    const sc = makeController();
    const args = sc._getActiveProfileArgs(tmpDir);
    assert.deepEqual(args, ['--profile', 'kaspa-node', '--profile', 'kasia-app']);
  });

  it('returns [] when profiles array is empty', () => {
    writeInstallConfig(tmpDir, { profiles: [] });
    assert.deepEqual(makeController()._getActiveProfileArgs(tmpDir), []);
  });

  it('returns [] when installation-config.json does not exist', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaspa-sc-noprofile-'));
    try {
      assert.deepEqual(makeController(emptyDir)._getActiveProfileArgs(emptyDir), []);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('returns [] when profiles key is missing', () => {
    writeInstallConfig(tmpDir, { someOtherKey: 'value' });
    assert.deepEqual(makeController()._getActiveProfileArgs(tmpDir), []);
  });

  it('returns [] when profiles is not an array', () => {
    writeInstallConfig(tmpDir, { profiles: 'kaspa-node' });
    assert.deepEqual(makeController()._getActiveProfileArgs(tmpDir), []);
  });

  it('returns [] when installation-config.json is invalid JSON', () => {
    const servicesDir = path.join(tmpDir, 'services');
    fs.mkdirSync(servicesDir, { recursive: true });
    fs.writeFileSync(path.join(servicesDir, 'installation-config.json'), 'not valid json', 'utf8');
    assert.deepEqual(makeController()._getActiveProfileArgs(tmpDir), []);
  });
});

// ─── _waitForHealth ───────────────────────────────────────────────────────────

describe('ServiceController._waitForHealth', () => {
  it('returns true when endpoint is immediately healthy', async () => {
    const sc = makeController();
    sc._checkEndpoint = () => Promise.resolve(true);
    assert.equal(await sc._waitForHealth('http://localhost:9999/', 200), true);
  });

  it('returns false after timeout when endpoint never becomes healthy', async () => {
    const sc = makeController();
    sc._checkEndpoint = () => Promise.resolve(false);
    assert.equal(await sc._waitForHealth('http://localhost:9999/', 50), false);
  });

  it('returns true on second poll when first poll fails', async () => {
    const sc = makeController();
    let callCount = 0;
    sc._checkEndpoint = () => { callCount++; return Promise.resolve(callCount >= 2); };
    // 1100ms timeout: enough time for the 500ms inter-poll delay before second attempt
    const result = await sc._waitForHealth('http://localhost:9999/', 1100);
    assert.equal(result, true);
    assert.ok(callCount >= 2, `expected at least 2 polls, got ${callCount}`);
  });
});

// ─── _checkEndpoint ───────────────────────────────────────────────────────────

describe('ServiceController._checkEndpoint', () => {
  it('resolves false for a connection-refused URL (no server running)', async () => {
    const sc = makeController();
    // Port 1 is almost certainly not listening
    assert.equal(await sc._checkEndpoint('http://localhost:1/health'), false);
  });

  it('does not throw on connection refused', async () => {
    const sc = makeController();
    await assert.doesNotReject(() => sc._checkEndpoint('http://localhost:1/'));
  });
});

// ─── startAll error aggregation ──────────────────────────────────────────────

describe('ServiceController.startAll', () => {
  it('resolves without throwing when all services start successfully', async () => {
    const sc = makeController();
    sc.startWizard = () => Promise.resolve();
    sc.startDashboard = () => Promise.resolve();
    sc.startAllDockerServices = () => Promise.resolve();
    await assert.doesNotReject(() => sc.startAll());
  });

  it('throws a combined error when all three services fail', async () => {
    const sc = makeController();
    sc.startWizard = () => Promise.reject(new Error('wizard failed'));
    sc.startDashboard = () => Promise.reject(new Error('dashboard failed'));
    sc.startAllDockerServices = () => Promise.reject(new Error('docker failed'));
    await assert.rejects(
      () => sc.startAll(),
      (err) => {
        assert.ok(err.message.includes('Wizard: wizard failed'), 'should include wizard error');
        assert.ok(err.message.includes('Dashboard: dashboard failed'), 'should include dashboard error');
        assert.ok(err.message.includes('Docker: docker failed'), 'should include docker error');
        return true;
      }
    );
  });

  it('includes only failed services in the error message', async () => {
    const sc = makeController();
    sc.startWizard = () => Promise.resolve();
    sc.startDashboard = () => Promise.reject(new Error('auth cancelled'));
    sc.startAllDockerServices = () => Promise.resolve();
    await assert.rejects(
      () => sc.startAll(),
      (err) => {
        assert.ok(err.message.includes('Dashboard: auth cancelled'));
        assert.ok(!err.message.includes('Wizard:'), 'should not mention wizard (succeeded)');
        assert.ok(!err.message.includes('Docker:'), 'should not mention docker (succeeded)');
        return true;
      }
    );
  });
});

// ─── stopAll error aggregation ───────────────────────────────────────────────

describe('ServiceController.stopAll', () => {
  it('resolves without throwing when all services stop successfully', async () => {
    const sc = makeController();
    sc.stopAllDockerServices = () => Promise.resolve();
    sc.stopDashboard = () => Promise.resolve();
    sc.stopWizard = () => Promise.resolve();
    await assert.doesNotReject(() => sc.stopAll());
  });

  it('throws a combined error when multiple services fail to stop', async () => {
    const sc = makeController();
    sc.stopAllDockerServices = () => Promise.reject(new Error('compose down failed'));
    sc.stopDashboard = () => Promise.resolve();
    sc.stopWizard = () => Promise.reject(new Error('pid kill failed'));
    await assert.rejects(
      () => sc.stopAll(),
      (err) => {
        assert.ok(err.message.includes('Docker: compose down failed'));
        assert.ok(err.message.includes('Wizard: pid kill failed'));
        assert.ok(!err.message.includes('Dashboard:'), 'should not mention dashboard (succeeded)');
        return true;
      }
    );
  });
});
