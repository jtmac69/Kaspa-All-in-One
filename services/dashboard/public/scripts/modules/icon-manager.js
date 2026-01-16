/**
 * Icon Manager Module
 * Handles icon creation and replacement for the Dashboard
 */

import { createIcon, createIconButton, Icons } from '/shared/icons/icons.js';

export class IconManager {
    constructor() {
        this.iconMap = {
            // Emoji to icon name mapping
            '⚡': 'zap',
            '🧙‍♂️': 'wand',
            '⚙️': 'settings',
            '⬆️': 'update',
            '🌐': 'globe',
            '📊': 'activity',
            '🧊': 'box',
            '🔄': 'refresh',
            '💪': 'cpu',
            '💰': 'coins',
            '🖥️': 'server',
            '⚠️': 'warning',
            '▶️': 'play',
            '⏹️': 'stop',
            '📋': 'logs',
            '💾': 'backup',
            '🔴': 'circle',
            '🟢': 'circle',
            '🔍': 'search',
            '🚨': 'emergency',
            '🐛': 'bug',
            '💡': 'lightbulb',
            '☕': 'coffee',
            '✕': 'close',
            '❌': 'error',
            '⛏️': 'hammer',
            '▶': 'chevron'
        };
    }

    /**
     * Initialize icon system
     */
    init() {
        console.log('Initializing icon system...');
        
        // Replace header icons
        this.replaceHeaderIcons();
        
        // Replace network stat icons
        this.replaceNetworkIcons();
        
        // Replace node status icons
        this.replaceNodeIcons();
        
        // Replace service action buttons
        this.replaceServiceActionIcons();
        
        // Replace quick action icons
        this.replaceQuickActionIcons();
        
        // Replace footer icons
        this.replaceFooterIcons();
        
        // Replace modal icons
        this.replaceModalIcons();
        
        console.log('Icon system initialized');
    }

    /**
     * Replace header icons
     */
    replaceHeaderIcons() {
        // Dashboard title
        const title = document.querySelector('header h1');
        if (title) {
            const icon = createIcon('zap', { size: 'md', color: 'kaspa-blue' });
            title.innerHTML = '';
            title.appendChild(icon);
            title.appendChild(document.createTextNode(' Kaspa All-in-One Dashboard'));
        }

        // Wizard button
        const wizardBtn = document.getElementById('wizard-link');
        if (wizardBtn) {
            const icon = createIcon('wand', { size: 'sm' });
            wizardBtn.innerHTML = '';
            wizardBtn.appendChild(icon);
            wizardBtn.appendChild(document.createTextNode(' Wizard'));
        }

        // Reconfigure button
        const reconfigureBtn = document.getElementById('reconfigure-btn');
        if (reconfigureBtn) {
            const icon = createIcon('settings', { size: 'sm' });
            const text = reconfigureBtn.textContent.replace('⚙️', '').trim();
            reconfigureBtn.innerHTML = '';
            reconfigureBtn.appendChild(icon);
            reconfigureBtn.appendChild(document.createTextNode(' ' + text));
        }

        // Updates button (icon only with tooltip)
        const updatesBtn = document.getElementById('updates-btn');
        if (updatesBtn) {
            const icon = createIcon('update', { size: 'sm', color: 'kaspa-blue' });
            updatesBtn.innerHTML = '';
            updatesBtn.appendChild(icon);
            updatesBtn.classList.add('icon-tooltip');
            updatesBtn.setAttribute('data-tooltip', 'Check for updates');
            
            // Re-add badge if it exists
            const badge = document.createElement('span');
            badge.className = 'update-badge';
            badge.id = 'update-badge';
            badge.style.display = 'none';
            badge.setAttribute('aria-live', 'polite');
            badge.textContent = '0';
            updatesBtn.appendChild(badge);
        }

        // Config button (icon only with tooltip)
        const configBtn = document.getElementById('config-btn');
        if (configBtn) {
            const icon = createIcon('config', { size: 'sm', color: 'kaspa-blue' });
            configBtn.innerHTML = '';
            configBtn.appendChild(icon);
            configBtn.classList.add('icon-tooltip');
            configBtn.setAttribute('data-tooltip', 'Configuration settings');
        }

        // Wizard running indicator
        const wizardIndicator = document.querySelector('.wizard-running-icon');
        if (wizardIndicator) {
            const icon = createIcon('settings', { size: 'md', rotating: true });
            wizardIndicator.innerHTML = '';
            wizardIndicator.appendChild(icon);
        }

        // Wizard dismiss button
        const wizardDismiss = document.querySelector('.wizard-running-dismiss');
        if (wizardDismiss) {
            const icon = createIcon('close', { size: 'sm' });
            wizardDismiss.innerHTML = '';
            wizardDismiss.appendChild(icon);
        }
    }

    /**
     * Replace network stat icons
     */
    replaceNetworkIcons() {
        // Network section heading
        const networkHeading = document.querySelector('.kaspa-stats h2');
        if (networkHeading) {
            const icon = createIcon('globe', { size: 'md', color: 'kaspa-blue' });
            networkHeading.innerHTML = '';
            networkHeading.appendChild(icon);
            networkHeading.appendChild(document.createTextNode(' Kaspa Network'));
        }

        // Replace stat label icons
        const statLabels = {
            'TPS 📊': { icon: 'activity', text: 'TPS' },
            'BPS 🧊': { icon: 'box', text: 'BPS' },
            'Mempool 🔄': { icon: 'refresh', text: 'Mempool' },
            'Hashrate 💪': { icon: 'cpu', text: 'Hashrate' },
            'Circulating 📊': { icon: 'trending', text: 'Circulating' },
            'Recent Block Reward': { icon: 'coins', text: 'Recent Block Reward' }
        };

        document.querySelectorAll('.stat .label').forEach(label => {
            const text = label.textContent.trim();
            for (const [oldText, config] of Object.entries(statLabels)) {
                if (text.includes(oldText.split(' ')[0])) {
                    const icon = createIcon(config.icon, { size: 'xs', class: 'icon-inline' });
                    label.innerHTML = '';
                    label.appendChild(icon);
                    label.appendChild(document.createTextNode(' ' + config.text));
                    break;
                }
            }
        });

        // Technical details toggle
        const detailsSummary = document.querySelector('.network-technical-details summary');
        if (detailsSummary) {
            const icon = createIcon('chevron', { size: 'xs', class: 'icon-chevron' });
            const text = detailsSummary.textContent.replace('📋', '').trim();
            detailsSummary.innerHTML = '';
            detailsSummary.appendChild(icon);
            detailsSummary.appendChild(document.createTextNode(' ' + text));
            
            // Add rotation on open
            const details = detailsSummary.closest('details');
            if (details) {
                details.addEventListener('toggle', () => {
                    icon.classList.toggle('expanded', details.open);
                });
            }
        }
    }

    /**
     * Replace node status icons
     */
    replaceNodeIcons() {
        // Node section heading
        const nodeHeading = document.querySelector('.node-info h2');
        if (nodeHeading) {
            const icon = createIcon('server', { size: 'md', color: 'kaspa-blue' });
            nodeHeading.innerHTML = '';
            nodeHeading.appendChild(icon);
            nodeHeading.appendChild(document.createTextNode(' Local Node Status'));
        }

        // Sync notification icon
        const syncNotification = document.querySelector('.sync-notification .notification-icon');
        if (syncNotification) {
            const icon = createIcon('warning', { size: 'sm', color: 'warning' });
            syncNotification.innerHTML = '';
            syncNotification.appendChild(icon);
        }
    }

    /**
     * Replace service action button icons
     */
    replaceServiceActionIcons() {
        // This will be called dynamically when services are rendered
        // We'll add a method to update service cards
    }

    /**
     * Update service card with icons
     * Called when service cards are rendered
     */
    updateServiceCard(card) {
        // Find action buttons
        const startBtn = card.querySelector('[data-action="start"]');
        const stopBtn = card.querySelector('[data-action="stop"]');
        const restartBtn = card.querySelector('[data-action="restart"]');
        const logsBtn = card.querySelector('[data-action="logs"]');

        if (startBtn && !startBtn.querySelector('.lucide')) {
            const icon = createIcon('play', { size: 'xs' });
            startBtn.insertBefore(icon, startBtn.firstChild);
            if (startBtn.textContent.trim()) {
                startBtn.appendChild(document.createTextNode(' '));
            }
        }

        if (stopBtn && !stopBtn.querySelector('.lucide')) {
            const icon = createIcon('stop', { size: 'xs' });
            stopBtn.insertBefore(icon, stopBtn.firstChild);
            if (stopBtn.textContent.trim()) {
                stopBtn.appendChild(document.createTextNode(' '));
            }
        }

        if (restartBtn && !restartBtn.querySelector('.lucide')) {
            const icon = createIcon('restart', { size: 'xs' });
            restartBtn.insertBefore(icon, restartBtn.firstChild);
            if (restartBtn.textContent.trim()) {
                restartBtn.appendChild(document.createTextNode(' '));
            }
        }

        if (logsBtn && !logsBtn.querySelector('.lucide')) {
            const icon = createIcon('logs', { size: 'xs' });
            logsBtn.insertBefore(icon, logsBtn.firstChild);
            if (logsBtn.textContent.trim()) {
                logsBtn.appendChild(document.createTextNode(' '));
            }
        }

        // Update error icon if present
        const errorIcon = card.querySelector('.error-icon');
        if (errorIcon && !errorIcon.querySelector('.lucide')) {
            const icon = createIcon('warning', { size: 'sm', color: 'warning' });
            errorIcon.appendChild(icon);
        }
    }

    /**
     * Replace quick action icons
     */
    replaceQuickActionIcons() {
        // Services header buttons
        const toggleViewBtn = document.getElementById('toggle-view');
        if (toggleViewBtn) {
            const icon = createIcon('layout', { size: 'xs' });
            const text = toggleViewBtn.textContent.replace('📊', '').trim();
            toggleViewBtn.innerHTML = '';
            toggleViewBtn.appendChild(icon);
            toggleViewBtn.appendChild(document.createTextNode(' ' + text));
        }

        const refreshBtn = document.getElementById('refresh-services');
        if (refreshBtn) {
            const icon = createIcon('refresh', { size: 'xs' });
            const text = refreshBtn.textContent.replace('🔄', '').trim();
            refreshBtn.innerHTML = '';
            refreshBtn.appendChild(icon);
            refreshBtn.appendChild(document.createTextNode(' ' + text));
            
            // Add rotation on click
            refreshBtn.addEventListener('click', () => {
                icon.classList.add('icon-rotating');
                setTimeout(() => icon.classList.remove('icon-rotating'), 1000);
            });
        }

        // Quick action buttons
        const restartAllBtn = document.getElementById('restart-all-btn');
        if (restartAllBtn) {
            const icon = createIcon('restart', { size: 'sm' });
            const text = restartAllBtn.textContent.replace('🔄', '').trim();
            restartAllBtn.innerHTML = '';
            restartAllBtn.appendChild(icon);
            restartAllBtn.appendChild(document.createTextNode(' ' + text));
        }

        const updateServicesBtn = document.getElementById('update-services-btn');
        if (updateServicesBtn) {
            const icon = createIcon('download', { size: 'sm' });
            const text = updateServicesBtn.textContent.replace('⬆️', '').trim();
            updateServicesBtn.innerHTML = '';
            updateServicesBtn.appendChild(icon);
            updateServicesBtn.appendChild(document.createTextNode(' ' + text));
        }

        const backupBtn = document.getElementById('backup-data-btn');
        if (backupBtn) {
            const icon = createIcon('backup', { size: 'sm' });
            const text = backupBtn.textContent.replace('💾', '').trim();
            backupBtn.innerHTML = '';
            backupBtn.appendChild(icon);
            backupBtn.appendChild(document.createTextNode(' ' + text));
        }

        // Resource monitoring buttons
        const monitoringBtn = document.getElementById('monitoring-status');
        if (monitoringBtn) {
            const icon = createIcon('circle', { size: 'xs', color: 'error' });
            const text = monitoringBtn.textContent.replace('🔴', '').trim();
            monitoringBtn.innerHTML = '';
            monitoringBtn.appendChild(icon);
            monitoringBtn.appendChild(document.createTextNode(' ' + text));
        }

        const quickCheckBtn = document.getElementById('quick-check-btn');
        if (quickCheckBtn) {
            const icon = createIcon('search', { size: 'xs' });
            const text = quickCheckBtn.textContent.replace('🔍', '').trim();
            quickCheckBtn.innerHTML = '';
            quickCheckBtn.appendChild(icon);
            quickCheckBtn.appendChild(document.createTextNode(' ' + text));
        }

        const emergencyBtn = document.getElementById('emergency-stop');
        if (emergencyBtn) {
            const icon = createIcon('emergency', { size: 'sm', color: 'error' });
            const text = emergencyBtn.textContent.replace('🚨', '').trim();
            emergencyBtn.innerHTML = '';
            emergencyBtn.appendChild(icon);
            emergencyBtn.appendChild(document.createTextNode(' ' + text));
        }
    }

    /**
     * Replace footer icons
     */
    replaceFooterIcons() {
        const reportBugBtn = document.getElementById('report-bug-btn');
        if (reportBugBtn) {
            const icon = createIcon('bug', { size: 'sm' });
            const text = reportBugBtn.textContent.replace('🐛', '').trim();
            reportBugBtn.innerHTML = '';
            reportBugBtn.appendChild(icon);
            reportBugBtn.appendChild(document.createTextNode(' ' + text));
        }

        const suggestFeatureBtn = document.getElementById('suggest-feature-btn');
        if (suggestFeatureBtn) {
            const icon = createIcon('lightbulb', { size: 'sm' });
            const text = suggestFeatureBtn.textContent.replace('💡', '').trim();
            suggestFeatureBtn.innerHTML = '';
            suggestFeatureBtn.appendChild(icon);
            suggestFeatureBtn.appendChild(document.createTextNode(' ' + text));
        }

        const donateBtn = document.getElementById('donate-btn');
        if (donateBtn) {
            const icon = createIcon('coffee', { size: 'sm' });
            const text = donateBtn.textContent.replace('☕', '').trim();
            donateBtn.innerHTML = '';
            donateBtn.appendChild(icon);
            donateBtn.appendChild(document.createTextNode(' ' + text));
        }
    }

    /**
     * Replace modal icons
     */
    replaceModalIcons() {
        // Close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            const icon = createIcon('close', { size: 'md' });
            closeBtn.innerHTML = '';
            closeBtn.appendChild(icon);
        });
    }

    /**
     * Create icon element
     */
    createIcon(name, options = {}) {
        return createIcon(name, options);
    }

    /**
     * Create icon button
     */
    createIconButton(name, options = {}) {
        return createIconButton(name, options);
    }

    /**
     * Update monitoring status icon
     */
    updateMonitoringStatus(isActive) {
        const monitoringBtn = document.getElementById('monitoring-status');
        if (monitoringBtn) {
            const icon = monitoringBtn.querySelector('.lucide');
            if (icon) {
                icon.classList.remove('icon-error', 'icon-success');
                icon.classList.add(isActive ? 'icon-success' : 'icon-error');
            }
            
            const text = isActive ? 'Monitoring: On' : 'Monitoring: Off';
            const textNode = Array.from(monitoringBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = ' ' + text;
            }
        }
    }

    /**
     * Add rotating animation to icon
     */
    addRotatingAnimation(element) {
        const icon = element.querySelector('.lucide');
        if (icon) {
            icon.classList.add('icon-rotating');
        }
    }

    /**
     * Remove rotating animation from icon
     */
    removeRotatingAnimation(element) {
        const icon = element.querySelector('.lucide');
        if (icon) {
            icon.classList.remove('icon-rotating');
        }
    }
}

// Export singleton instance
export default new IconManager();
