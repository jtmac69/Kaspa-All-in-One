'use strict';

const { describe, it, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// ─── Electron mock ────────────────────────────────────────────────────────────
//
// Electron is a devDependency that is not installed in CI (no npm ci is run
// for the tray-unit-tests job). We intercept 'electron' at the Node module
// resolver level so TrayManager's `require('electron')` gets our stub.
//
// IMPORTANT: the mock is wired up synchronously here, before any require()
// of TrayManager, because module-level code runs at require time (not inside
// before() hooks which are async).

let capturedTemplate = null; // set by MockTray.setContextMenu each _rebuildMenu call

const mockElectron = {
  Tray: class MockTray {
    setToolTip() {}
    setImage() {}
    setContextMenu(menu) { capturedTemplate = menu._template; }
  },
  Menu: {
    buildFromTemplate(t) { return { _template: t }; },
  },
  shell: { openExternal: () => Promise.resolve() },
  nativeImage: { createFromPath: (p) => ({ _path: p }) },
  app: { quit: () => {} },
  dialog: { showMessageBox: () => Promise.resolve() },
};

const MOCK_ELECTRON_ID = '__kaspa_aio_tray_test_electron__';
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (req, ...rest) {
  if (req === 'electron') return MOCK_ELECTRON_ID;
  return origResolve.call(this, req, ...rest);
};
require.cache[MOCK_ELECTRON_ID] = {
  id: MOCK_ELECTRON_ID, filename: MOCK_ELECTRON_ID,
  loaded: true, exports: mockElectron, children: [],
};

after(() => {
  Module._resolveFilename = origResolve;
  delete require.cache[MOCK_ELECTRON_ID];
  delete require.cache[require.resolve('./TrayManager')];
});

// TrayManager is now required with the electron mock in place.
const TrayManager = require('./TrayManager');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_CONFIG = {
  wizardUrl: 'http://localhost:3000',
  dashboardUrl: 'http://localhost:8080',
  projectRoot: '/opt/kaspa-aio',
};

const mockSC = {
  startAll: () => Promise.resolve(),
  stopAll: () => Promise.resolve(),
  startWizard: () => Promise.resolve(),
  startDashboard: () => Promise.resolve(),
};
const mockHM = { pollNow: () => {} };

/**
 * Creates a TrayManager with _tray, _serviceController, and _healthMonitor
 * pre-wired so _rebuildMenu() can be called directly without going through build().
 */
function makeWiredManager(prereqsOk = true) {
  const tm = new TrayManager(TEST_CONFIG);
  tm._tray = new mockElectron.Tray();
  tm._serviceController = mockSC;
  tm._healthMonitor = mockHM;
  tm._prereqsOk = prereqsOk;
  return tm;
}

// ─── _iconForStatus ───────────────────────────────────────────────────────────

describe('TrayManager._iconForStatus', () => {
  const tm = new TrayManager(TEST_CONFIG);

  it('returns "tray-grey" for null (unknown) status', () => {
    assert.equal(tm._iconForStatus(null), 'tray-grey');
  });

  it('returns "tray-green" when both wizard and dashboard are healthy', () => {
    assert.equal(tm._iconForStatus({ wizard: true, dashboard: true }), 'tray-green');
  });

  it('returns "tray-yellow" when only wizard is healthy', () => {
    assert.equal(tm._iconForStatus({ wizard: true, dashboard: false }), 'tray-yellow');
  });

  it('returns "tray-yellow" when only dashboard is healthy', () => {
    assert.equal(tm._iconForStatus({ wizard: false, dashboard: true }), 'tray-yellow');
  });

  it('returns "tray-red" when both are down', () => {
    assert.equal(tm._iconForStatus({ wizard: false, dashboard: false }), 'tray-red');
  });
});

// ─── _statusLabel ─────────────────────────────────────────────────────────────

describe('TrayManager._statusLabel', () => {
  const tm = new TrayManager(TEST_CONFIG);

  it('uses filled dot and "Running" when service is running', () => {
    const label = tm._statusLabel('Wizard', true);
    assert.ok(label.includes('●'), 'running state should use filled dot');
    assert.ok(label.includes('Running'));
    assert.ok(label.includes('Wizard'));
  });

  it('uses empty dot and "Stopped" when service is stopped', () => {
    const label = tm._statusLabel('Dashboard', false);
    assert.ok(label.includes('○'), 'stopped state should use empty dot');
    assert.ok(label.includes('Stopped'));
    assert.ok(label.includes('Dashboard'));
  });

  it('includes the service name in the label', () => {
    assert.ok(tm._statusLabel('TestService', true).includes('TestService'));
    assert.ok(tm._statusLabel('TestService', false).includes('TestService'));
  });
});

// ─── _rebuildMenu ─────────────────────────────────────────────────────────────

describe('TrayManager._rebuildMenu', () => {
  beforeEach(() => { capturedTemplate = null; });

  it('includes all standard menu labels', () => {
    const tm = makeWiredManager();
    tm._rebuildMenu();
    const labels = capturedTemplate.map((i) => i.label).filter(Boolean);
    assert.ok(labels.includes('Kaspa AIO'));
    assert.ok(labels.includes('Open Wizard'));
    assert.ok(labels.includes('Open Dashboard'));
    assert.ok(labels.includes('Start All Services'));
    assert.ok(labels.includes('Stop All Services'));
    assert.ok(labels.includes('Quit'));
  });

  it('enables Open Wizard and Open Dashboard when prerequisites are met', () => {
    const tm = makeWiredManager(true);
    tm._rebuildMenu();
    const openWizard = capturedTemplate.find((i) => i.label === 'Open Wizard');
    const openDashboard = capturedTemplate.find((i) => i.label === 'Open Dashboard');
    assert.equal(openWizard.enabled, true);
    assert.equal(openDashboard.enabled, true);
  });

  it('disables all action items when prerequisites are missing', () => {
    const tm = makeWiredManager(false);
    tm._rebuildMenu();
    const actionLabels = ['Open Wizard', 'Open Dashboard', 'Start All Services', 'Stop All Services'];
    for (const label of actionLabels) {
      const item = capturedTemplate.find((i) => i.label === label);
      assert.equal(item?.enabled, false, `"${label}" should be disabled when prereqs missing`);
    }
  });

  it('shows a prerequisites warning banner when prerequisites are missing', () => {
    const tm = makeWiredManager(false);
    tm._rebuildMenu();
    const hasWarning = capturedTemplate.some(
      (i) => typeof i.label === 'string' && i.label.toLowerCase().includes('prerequisites')
    );
    assert.ok(hasWarning, 'should include a prerequisites warning item');
  });

  it('does not show a prerequisites warning when prerequisites are met', () => {
    const tm = makeWiredManager(true);
    tm._rebuildMenu();
    const hasWarning = capturedTemplate.some(
      (i) => typeof i.label === 'string' && i.label.toLowerCase().includes('prerequisites')
    );
    assert.ok(!hasWarning, 'should not include prerequisites warning when prereqs are ok');
  });

  it('status rows are informational only (enabled: false)', () => {
    const tm = makeWiredManager();
    tm._status = { wizard: true, dashboard: false };
    tm._rebuildMenu();
    // Status rows contain the service name and a status dot but have no click action
    const wizardRow = capturedTemplate.find(
      (i) => i.label && i.label.includes('Wizard') && (i.label.includes('●') || i.label.includes('○'))
    );
    const dashboardRow = capturedTemplate.find(
      (i) => i.label && i.label.includes('Dashboard') && (i.label.includes('●') || i.label.includes('○'))
    );
    assert.equal(wizardRow?.enabled, false, 'wizard status row should be non-interactive');
    assert.equal(dashboardRow?.enabled, false, 'dashboard status row should be non-interactive');
  });

  it('reflects wizard running / dashboard stopped in status row labels', () => {
    const tm = makeWiredManager();
    tm._status = { wizard: true, dashboard: false };
    tm._rebuildMenu();
    const wizardRow = capturedTemplate.find(
      (i) => i.label && i.label.includes('Wizard') && (i.label.includes('●') || i.label.includes('○'))
    );
    const dashboardRow = capturedTemplate.find(
      (i) => i.label && i.label.includes('Dashboard') && (i.label.includes('●') || i.label.includes('○'))
    );
    assert.ok(wizardRow?.label.includes('●'), 'running wizard should show filled dot');
    assert.ok(dashboardRow?.label.includes('○'), 'stopped dashboard should show empty dot');
  });

  it('includes separator items for visual grouping', () => {
    const tm = makeWiredManager();
    tm._rebuildMenu();
    const separators = capturedTemplate.filter((i) => i.type === 'separator');
    assert.ok(separators.length >= 2, 'menu should have at least 2 separators');
  });
});
