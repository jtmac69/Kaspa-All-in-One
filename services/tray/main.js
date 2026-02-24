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
  return;
}

app.whenReady().then(async () => {
  // Load config (.env port overrides + project root detection)
  const config = await ConfigManager.load();

  // Check prerequisites at first launch
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

  trayManager.build(serviceController, healthMonitor);

  // Register auto-launch on login (silent — don't bother user if it fails)
  try {
    const autoLauncher = new AutoLaunch({
      name: 'Kaspa AIO',
      path: app.getPath('exe'),
    });
    const enabled = await autoLauncher.isEnabled();
    if (!enabled) await autoLauncher.enable();
  } catch (err) {
    console.warn('Auto-launch setup failed:', err.message);
  }

  // Start health polling (immediate first poll + every 30s)
  healthMonitor.start();
});

// Keep app running when all windows are closed (tray-only)
app.on('window-all-closed', () => {});
