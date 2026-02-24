'use strict';

const { app, dialog } = require('electron');
const path = require('path');
const TrayManager = require('./src/TrayManager');
const HealthMonitor = require('./src/HealthMonitor');
const ServiceController = require('./src/ServiceController');
const ConfigManager = require('./src/ConfigManager');
const PrerequisiteChecker = require('./src/PrerequisiteChecker');
const AutoLaunch = require('auto-launch');

// Tray-only app — no Dock icon on macOS
if (process.platform === 'darwin') app.dock.hide();

// Single-instance lock — prevent duplicate tray icons
if (!app.requestSingleInstanceLock()) {
  app.quit();
  // Use process.exit() to ensure immediate termination before whenReady fires
  process.exit(0);
}

// Top-level .catch() ensures any startup exception shows a dialog and quits
// rather than silently failing with no tray icon and no user feedback.
app.whenReady().then(async () => {
  // Load config (.env port overrides + project root detection)
  const config = await ConfigManager.load();

  // Check prerequisites at startup. Show a warning but continue — the tray
  // app is still useful for monitoring, and the user may fix prerequisites
  // without restarting. Service-start actions are disabled until prereqs are met.
  const prereqs = await PrerequisiteChecker.check();
  if (!prereqs.ok) {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Kaspa AIO — Missing Prerequisites',
      message: prereqs.message,
      buttons: ['OK'],
    });
  }

  // Wire up core components
  const serviceController = new ServiceController(config);
  const trayManager = new TrayManager(config);
  const healthMonitor = new HealthMonitor(config, (status) => {
    trayManager.updateStatus(status);
  });

  trayManager.build(serviceController, healthMonitor, prereqs.ok);

  // Register auto-launch on login (silent — don't bother user if it fails)
  try {
    const autoLauncher = new AutoLaunch({
      name: 'Kaspa AIO',
      path: app.getPath('exe'),
    });
    const enabled = await autoLauncher.isEnabled();
    if (!enabled) await autoLauncher.enable();
  } catch (err) {
    console.warn('[main] Auto-launch setup failed:', err.message);
  }

  // Start health polling (immediate first poll + every 30s)
  healthMonitor.start();

}).catch((err) => {
  // Fatal startup error — show dialog and quit rather than silently hanging
  console.error('[main] Fatal startup error:', err);
  dialog.showMessageBoxSync({
    type: 'error',
    title: 'Kaspa AIO — Startup Failed',
    message: `Kaspa AIO could not start.\n\n${err.message}\n\nCheck the application logs for details.`,
    buttons: ['OK'],
  });
  app.quit();
});

// Keep app running when all windows are closed (tray-only)
app.on('window-all-closed', () => {});
