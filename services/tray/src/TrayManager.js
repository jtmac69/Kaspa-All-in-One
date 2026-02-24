'use strict';

const { Tray, Menu, shell, nativeImage, app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/**
 * Manages the system tray icon and context menu.
 *
 * Icon states:
 *   green  — both wizard + dashboard healthy
 *   yellow — one healthy, one not
 *   red    — neither healthy
 *   grey   — initial/unknown state (before first poll)
 */
class TrayManager {
  constructor(config) {
    this._config = config;
    this._tray = null;
    this._serviceController = null;
    this._healthMonitor = null;
    this._status = null; // null = unknown
    this._prereqsOk = true; // set to false if prerequisites are missing
  }

  build(serviceController, healthMonitor, prereqsOk = true) {
    this._serviceController = serviceController;
    this._healthMonitor = healthMonitor;
    this._prereqsOk = prereqsOk;

    const icon = this._loadIcon('tray-grey');
    this._tray = new Tray(icon);
    this._tray.setToolTip('Kaspa AIO');
    this._rebuildMenu();
  }

  updateStatus(status) {
    this._status = status;
    const iconName = this._iconForStatus(status);
    this._tray.setImage(this._loadIcon(iconName));
    const tooltip = `Kaspa AIO — Wizard: ${status.wizard ? 'Running' : 'Stopped'} | Dashboard: ${status.dashboard ? 'Running' : 'Stopped'}`;
    this._tray.setToolTip(tooltip);
    this._rebuildMenu();
  }

  _iconForStatus(status) {
    if (status === null) return 'tray-grey';
    if (status.wizard && status.dashboard) return 'tray-green';
    if (status.wizard || status.dashboard) return 'tray-yellow';
    return 'tray-red';
  }

  _loadIcon(name) {
    // C2: Check that the icon file exists before calling createFromPath.
    // nativeImage.createFromPath() silently returns an empty image for missing files.
    const suffix = process.platform === 'darwin' ? `${name}Template.png` : `${name}.png`;
    const iconPath = path.join(ASSETS_DIR, suffix);
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Tray icon not found: ${iconPath}. Ensure assets are packaged correctly.`);
    }
    return nativeImage.createFromPath(iconPath);
  }

  _statusLabel(name, isRunning) {
    const dot = isRunning ? '●' : '○';
    const state = isRunning ? 'Running' : 'Stopped';
    return `${dot}  ${name}: ${state}`;
  }

  // H1: Shared error handler for all menu action failures — shows dialog + logs
  _handleActionError(actionName, err) {
    console.error(`[TrayManager] Action "${actionName}" failed:`, err.message);
    dialog.showMessageBox({
      type: 'error',
      title: 'Kaspa AIO — Action Failed',
      message: `"${actionName}" failed:\n\n${err.message}`,
      buttons: ['OK'],
    }).catch(() => {}); // dialog itself should never fail, but guard anyway
  }

  _rebuildMenu() {
    const status = this._status;
    const wizardRunning = status ? status.wizard : false;
    const dashboardRunning = status ? status.dashboard : false;
    const { wizardUrl, dashboardUrl } = this._config;
    const sc = this._serviceController;
    const hm = this._healthMonitor;
    // H8: Disable service-start actions when prerequisites are missing
    const actionsEnabled = this._prereqsOk;

    const template = [
      {
        label: 'Kaspa AIO',
        enabled: false,
      },
      ...(actionsEnabled ? [] : [{
        label: '⚠ Prerequisites missing — service actions disabled',
        enabled: false,
      }]),
      { type: 'separator' },
      {
        label: this._statusLabel('Wizard', wizardRunning),
        enabled: actionsEnabled,
        // H1: All click handlers attach .catch() so async failures surface as dialogs
        click: () => {
          const action = wizardRunning
            ? shell.openExternal(wizardUrl)
            : sc.startWizard().then(() => shell.openExternal(wizardUrl));
          Promise.resolve(action).catch((err) => this._handleActionError('Open Wizard', err));
        },
      },
      {
        label: this._statusLabel('Dashboard', dashboardRunning),
        enabled: actionsEnabled,
        click: () => {
          const action = dashboardRunning
            ? shell.openExternal(dashboardUrl)
            : sc.startDashboard().then(() => shell.openExternal(dashboardUrl));
          Promise.resolve(action).catch((err) => this._handleActionError('Open Dashboard', err));
        },
      },
      { type: 'separator' },
      {
        label: 'Open Wizard',
        enabled: actionsEnabled,
        click: () => {
          const action = wizardRunning
            ? shell.openExternal(wizardUrl)
            : sc.startWizard().then(() => shell.openExternal(wizardUrl));
          Promise.resolve(action).catch((err) => this._handleActionError('Open Wizard', err));
        },
      },
      {
        label: 'Open Dashboard',
        enabled: actionsEnabled,
        click: () => {
          const action = dashboardRunning
            ? shell.openExternal(dashboardUrl)
            : sc.startDashboard().then(() => shell.openExternal(dashboardUrl));
          Promise.resolve(action).catch((err) => this._handleActionError('Open Dashboard', err));
        },
      },
      { type: 'separator' },
      {
        label: 'Start All Services',
        enabled: actionsEnabled,
        // M2: Use public pollNow() instead of accessing private _poll()
        click: () => sc.startAll()
          .then(() => hm && hm.pollNow())
          .catch((err) => this._handleActionError('Start All Services', err)),
      },
      {
        label: 'Stop All Services',
        enabled: actionsEnabled,
        click: () => sc.stopAll()
          .then(() => hm && hm.pollNow())
          .catch((err) => this._handleActionError('Stop All Services', err)),
      },
      { type: 'separator' },
      {
        label: 'About Kaspa AIO',
        click: () => shell.openExternal('https://github.com/jtmac69/Kaspa-All-in-One'),
      },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    this._tray.setContextMenu(menu);
  }
}

module.exports = TrayManager;
