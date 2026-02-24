'use strict';

const { Tray, Menu, shell, nativeImage, app } = require('electron');
const path = require('path');

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
  }

  build(serviceController, healthMonitor) {
    this._serviceController = serviceController;
    this._healthMonitor = healthMonitor;

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
    // On macOS, use template images (white/black adaptive)
    if (process.platform === 'darwin') {
      return nativeImage.createFromPath(path.join(ASSETS_DIR, `${name}Template.png`));
    }
    return nativeImage.createFromPath(path.join(ASSETS_DIR, `${name}.png`));
  }

  _statusLabel(name, isRunning) {
    const dot = isRunning ? '●' : '○';
    const state = isRunning ? 'Running' : 'Stopped';
    return `${dot}  ${name}: ${state}`;
  }

  _rebuildMenu() {
    const status = this._status;
    const wizardRunning = status ? status.wizard : false;
    const dashboardRunning = status ? status.dashboard : false;
    const { wizardUrl, dashboardUrl } = this._config;
    const sc = this._serviceController;
    const hm = this._healthMonitor;
    const self = this;

    const template = [
      {
        label: 'Kaspa AIO',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: this._statusLabel('Wizard', wizardRunning),
        enabled: true,
        click: () => wizardRunning
          ? shell.openExternal(wizardUrl)
          : sc.startWizard().then(() => shell.openExternal(wizardUrl)),
      },
      {
        label: this._statusLabel('Dashboard', dashboardRunning),
        enabled: true,
        click: () => dashboardRunning
          ? shell.openExternal(dashboardUrl)
          : sc.startDashboard().then(() => shell.openExternal(dashboardUrl)),
      },
      { type: 'separator' },
      {
        label: 'Open Wizard',
        click: () => wizardRunning
          ? shell.openExternal(wizardUrl)
          : sc.startWizard().then(() => shell.openExternal(wizardUrl)),
      },
      {
        label: 'Open Dashboard',
        click: () => dashboardRunning
          ? shell.openExternal(dashboardUrl)
          : sc.startDashboard().then(() => shell.openExternal(dashboardUrl)),
      },
      { type: 'separator' },
      {
        label: 'Start All Services',
        click: () => sc.startAll().then(() => hm && self._poll(hm)),
      },
      {
        label: 'Stop All Services',
        click: () => sc.stopAll().then(() => hm && self._poll(hm)),
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

  _poll(healthMonitor) {
    // Trigger an immediate re-poll after a state change action
    healthMonitor._poll();
  }
}

module.exports = TrayManager;
