/**
 * Kaspa All-in-One Installation Wizard
 * Main entry point - Refactored modular version
 */

// Import modules
import { api, WebSocketManager } from './modules/api-client.js';
import { stateManager } from './modules/state-manager.js';
import { initNavigation, nextStep, previousStep, goToStep } from './modules/navigation.js';
import { showNotification } from './modules/utils.js';
import { loadConfigurationForm, validateConfiguration, saveConfiguration, initializeProfileSelection, setupDeveloperModeToggle } from './modules/configure.js';
import { runSystemCheck, showDockerGuide, showComposeGuide, initializeQuiz } from './modules/checklist.js';
import { runFullSystemCheck, retrySystemCheck } from './modules/system-check.js';
import { displayConfigurationSummary, validateBeforeInstallation } from './modules/review.js';
import { 
    initializeWebSocket as initInstallWebSocket,
    startInstallation as startInstall,
    updateInstallationUI,
    handleInstallationComplete,
    handleInstallationError,
    cancelInstallation as cancelInstall,
    toggleInstallLogs
} from './modules/install.js';
import { displayValidationResults, runServiceVerification as runValidation } from './modules/complete.js';
import { checkAndShowResumeDialog, displayBackgroundTaskStatus } from './modules/resume.js';

// Initialize WebSocket
const wsManager = new WebSocketManager();

/**
 * Initialize wizard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Kaspa Installation Wizard initialized (Refactored)');
    
    // Clear old localStorage if version changed
    const WIZARD_VERSION = '3'; // Increment this when making breaking changes
    const storedVersion = localStorage.getItem('wizardVersion');
    if (storedVersion !== WIZARD_VERSION) {
        console.log('Wizard version changed, clearing old state');
        localStorage.clear();
        localStorage.setItem('wizardVersion', WIZARD_VERSION);
    }
    
    // Detect wizard mode
    const wizardMode = await detectWizardMode();
    console.log('Wizard mode:', wizardMode);
    
    // Store mode in state
    stateManager.set('wizardMode', wizardMode.mode);
    stateManager.set('wizardModeInfo', wizardMode);
    
    // Initialize modules
    initNavigation();
    initWebSocket();
    
    // Handle different modes
    if (wizardMode.mode === 'reconfigure') {
        await handleReconfigurationMode(wizardMode);
    } else if (wizardMode.mode === 'update') {
        await handleUpdateMode(wizardMode);
    } else {
        // Initial installation mode
        await handleInitialMode(wizardMode);
    }
    
    // Set up global event listeners
    setupEventListeners();
    
    console.log('Wizard ready');
});

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
    const socket = wsManager.connect();
    
    // Initialize install module with WebSocket manager
    initInstallWebSocket(wsManager);
    
    // Installation progress
    wsManager.on('install:progress', (data) => {
        console.log('Installation progress:', data);
        updateInstallationUI(data);
    });
    
    // Installation complete
    wsManager.on('install:complete', (data) => {
        console.log('Installation complete:', data);
        handleInstallationComplete(data);
    });
    
    // Installation error
    wsManager.on('install:error', (data) => {
        console.error('Installation error:', data);
        handleInstallationError(data);
    });
    
    // Background task events
    wsManager.on('sync:start', (data) => {
        console.log('Sync started:', data);
        showNotification(`${data.service} synchronization started`, 'info');
    });
    
    wsManager.on('sync:progress', (data) => {
        console.log('Sync progress:', data);
        updateBackgroundTaskProgress(data);
    });
    
    wsManager.on('sync:complete', (data) => {
        console.log('Sync complete:', data);
        showNotification(`${data.service} synchronization complete`, 'success');
        updateBackgroundTaskProgress(data);
    });
    
    wsManager.on('sync:error', (data) => {
        console.error('Sync error:', data);
        showNotification(`${data.service} synchronization error: ${data.error}`, 'error');
    });
    
    wsManager.on('node:ready', (data) => {
        console.log('Node ready:', data);
        showNotification(`Local node ${data.service} is synced and ready`, 'success');
    });
}

/**
 * Update background task progress in UI
 */
function updateBackgroundTaskProgress(data) {
    const backgroundTasks = stateManager.get('backgroundTasks') || [];
    
    // Find and update the task
    const taskIndex = backgroundTasks.findIndex(t => t.id === data.taskId);
    
    if (taskIndex >= 0) {
        backgroundTasks[taskIndex] = {
            ...backgroundTasks[taskIndex],
            ...data,
            lastUpdate: new Date().toISOString()
        };
    } else {
        // Add new task
        backgroundTasks.push({
            id: data.taskId,
            service: data.service,
            type: data.type,
            status: data.status || 'in-progress',
            progress: data.progress || 0,
            ...data
        });
    }
    
    stateManager.set('backgroundTasks', backgroundTasks);
    
    // Update UI
    displayBackgroundTaskStatus(backgroundTasks);
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Listen for step entry events
    document.addEventListener('stepEntry', (e) => {
        const { stepNumber, stepId } = e.detail;
        console.log(`Entered step ${stepNumber}: ${stepId}`);
        
        // Run system check when entering checklist step
        if (stepId === 'checklist') {
            runSystemCheck().catch(error => {
                console.error('Failed to run system check:', error);
            });
        }
        
        // Run full system check when entering system check step
        if (stepId === 'system-check') {
            runFullSystemCheck().catch(error => {
                console.error('Failed to run full system check:', error);
            });
        }
        
        // Setup Developer Mode toggle when entering profiles step
        if (stepId === 'profiles') {
            setTimeout(() => {
                import('./modules/configure.js').then(module => {
                    module.setupDeveloperModeToggle();
                });
            }, 100);
        }
        
        // Load configuration and setup validation when entering configure step
        if (stepId === 'configure') {
            loadConfigurationForm().catch(error => {
                console.error('Failed to load configuration:', error);
            });
            // Setup form validation after a short delay to ensure DOM is ready
            setTimeout(() => {
                import('./modules/configure.js').then(module => {
                    module.setupFormValidation();
                });
            }, 100);
        }
        
        // Display configuration summary when entering review step
        if (stepId === 'review') {
            displayConfigurationSummary();
        }
        
        // Start installation when entering install step
        if (stepId === 'install') {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                startInstall().catch(error => {
                    console.error('Failed to start installation:', error);
                    showNotification('Failed to start installation', 'error');
                });
            }, 500);
        }
        
        // Display validation results when entering complete step
        if (stepId === 'complete') {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                displayValidationResults().catch(error => {
                    console.error('Failed to display validation results:', error);
                    showNotification('Failed to validate services', 'error');
                });
            }, 500);
        }
        
        // Checkpoint creation removed - not needed during wizard flow
        // Rollback functionality preserved for post-installation use
    });
    
    // Listen for configuration changes (just log, don't auto-save)
    stateManager.subscribe('configuration', (config) => {
        console.log('Configuration updated:', config);
    });
    
    // Listen for profile changes (just log, don't auto-save)
    stateManager.subscribe('selectedProfiles', (profiles) => {
        console.log('Profiles updated:', profiles);
    });
}

/**
 * Detect wizard mode from URL and backend
 */
async function detectWizardMode() {
    try {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('mode');
        
        // Build query string
        const query = urlMode ? `?mode=${urlMode}` : '';
        
        // Get mode from backend
        const response = await api.get(`/wizard/mode${query}`);
        
        return {
            mode: response.mode || 'initial',
            reason: response.reason || 'Default mode',
            hasExistingConfig: response.hasExistingConfig || false,
            hasInstallationState: response.hasInstallationState || false,
            installationPhase: response.installationPhase || null,
            canReconfigure: response.canReconfigure || false,
            canUpdate: response.canUpdate || false,
            isFirstRun: response.isFirstRun || false,
            autoStart: response.autoStart || false
        };
    } catch (error) {
        console.error('Error detecting wizard mode:', error);
        // Fallback to initial mode
        return {
            mode: 'initial',
            reason: 'Error during detection, defaulting to initial mode',
            hasExistingConfig: false,
            hasInstallationState: false,
            canReconfigure: false,
            canUpdate: false,
            isFirstRun: false,
            autoStart: false
        };
    }
}

/**
 * Handle initial installation mode
 */
async function handleInitialMode(wizardMode) {
    console.log('Handling initial installation mode');
    
    // Show welcome message
    updateWizardTitle('Welcome to Kaspa All-in-One Installation');
    
    // Check for resumable state and show dialog if applicable
    const isResuming = await checkAndShowResumeDialog();
    
    // If not resuming, load saved progress from localStorage
    if (!isResuming) {
        loadProgress();
    }
}

/**
 * Handle reconfiguration mode
 */
async function handleReconfigurationMode(wizardMode) {
    console.log('Handling reconfiguration mode');
    
    // Update wizard title
    updateWizardTitle('Reconfigure Kaspa All-in-One');
    
    // Show notification
    showNotification('Loading existing configuration...', 'info');
    
    try {
        // Load existing configuration
        const response = await api.get('/wizard/current-config');
        
        if (response.success) {
            // Store existing configuration in state
            stateManager.set('existingConfig', response.config);
            stateManager.set('existingProfiles', response.profiles);
            stateManager.set('existingInstallationState', response.installationState);
            
            // Pre-populate wizard with existing configuration
            if (response.profiles && response.profiles.length > 0) {
                stateManager.set('selectedProfiles', response.profiles);
            }
            
            if (response.config) {
                stateManager.set('configuration', response.config);
            }
            
            showNotification('Configuration loaded successfully', 'success');
            
            // Start from profile selection step (skip welcome and system check)
            goToStep(3); // Step 3 is typically profile selection
        } else {
            showNotification('Failed to load configuration: ' + response.error, 'error');
            // Fall back to initial mode
            await handleInitialMode(wizardMode);
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showNotification('Failed to load configuration', 'error');
        // Fall back to initial mode
        await handleInitialMode(wizardMode);
    }
}

/**
 * Handle update mode
 */
async function handleUpdateMode(wizardMode) {
    console.log('Handling update mode');
    
    // Update wizard title
    updateWizardTitle('Update Kaspa All-in-One Services');
    
    // Parse updates from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const updatesParam = urlParams.get('updates');
    
    let availableUpdates = [];
    
    if (updatesParam) {
        try {
            availableUpdates = JSON.parse(decodeURIComponent(updatesParam));
        } catch (error) {
            console.error('Error parsing updates parameter:', error);
        }
    }
    
    // If no updates in URL, fetch from API
    if (availableUpdates.length === 0) {
        try {
            const response = await fetch('/api/wizard/updates/available');
            const data = await response.json();
            
            if (data.success) {
                availableUpdates = data.updates.filter(u => u.updateAvailable);
            }
        } catch (error) {
            console.error('Error fetching available updates:', error);
            showNotification('Failed to fetch available updates', 'error');
            return;
        }
    }
    
    // Show update interface
    await showUpdateInterface(availableUpdates);
}

/**
 * Show update interface with available updates
 */
async function showUpdateInterface(updates) {
    // Hide all wizard steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Create update interface
    const updateContainer = document.createElement('div');
    updateContainer.id = 'update-interface';
    updateContainer.className = 'wizard-step active';
    updateContainer.innerHTML = `
        <div class="update-interface">
            <h2>Available Service Updates</h2>
            <p class="update-description">
                Select the services you want to update. A backup will be created before applying updates.
            </p>
            
            ${updates.length === 0 ? `
                <div class="no-updates">
                    <p>✓ All services are up to date!</p>
                    <button onclick="window.location.href='/dashboard'" class="btn btn-primary">
                        Return to Dashboard
                    </button>
                </div>
            ` : `
                <div class="updates-list">
                    ${updates.map(update => `
                        <div class="update-card" data-service="${update.service}">
                            <div class="update-header">
                                <input type="checkbox" 
                                       id="update-${update.service}" 
                                       class="update-checkbox"
                                       ${update.breaking ? '' : 'checked'}>
                                <label for="update-${update.service}">
                                    <strong>${update.service}</strong>
                                    ${update.breaking ? '<span class="breaking-badge">Breaking Change</span>' : ''}
                                </label>
                            </div>
                            <div class="update-versions">
                                <span class="current-version">${update.currentVersion}</span>
                                <span class="arrow">→</span>
                                <span class="new-version">${update.latestVersion}</span>
                            </div>
                            <div class="update-details">
                                <button class="btn-link" onclick="showChangelog('${update.service}', '${update.latestVersion}')">
                                    View Changelog
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="update-actions">
                    <button onclick="applySelectedUpdates()" class="btn btn-primary">
                        Apply Selected Updates
                    </button>
                    <button onclick="window.location.href='/dashboard'" class="btn btn-secondary">
                        Cancel
                    </button>
                </div>
                
                <div id="update-progress" class="update-progress" style="display: none;">
                    <h3>Applying Updates...</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" id="update-progress-fill"></div>
                    </div>
                    <div id="update-status" class="update-status"></div>
                    <div id="update-logs" class="update-logs"></div>
                </div>
                
                <div id="update-results" class="update-results" style="display: none;">
                    <h3>Update Results</h3>
                    <div id="results-list"></div>
                    <div class="update-actions">
                        <button onclick="window.location.href='/dashboard'" class="btn btn-primary">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
    
    // Add to wizard container
    const wizardContainer = document.querySelector('.wizard-container');
    if (wizardContainer) {
        wizardContainer.appendChild(updateContainer);
    }
}

/**
 * Show changelog for a service
 */
async function showChangelog(service, version) {
    try {
        const response = await fetch(`/api/wizard/updates/changelog/${service}/${version}`);
        const data = await response.json();
        
        if (data.success) {
            const changelog = data.changelog;
            
            // Create modal with changelog
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${service} ${version} Changelog</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Release Date:</strong> ${new Date(changelog.releaseDate).toLocaleDateString()}</p>
                        ${changelog.breaking ? '<p class="warning">⚠️ This update contains breaking changes</p>' : ''}
                        <h4>Changes:</h4>
                        <ul>
                            ${changelog.changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                        ${changelog.notes ? `<p><strong>Notes:</strong> ${changelog.notes}</p>` : ''}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
    } catch (error) {
        console.error('Error fetching changelog:', error);
        showNotification('Failed to fetch changelog', 'error');
    }
}

/**
 * Apply selected updates
 */
async function applySelectedUpdates() {
    // Get selected updates
    const checkboxes = document.querySelectorAll('.update-checkbox:checked');
    const selectedUpdates = Array.from(checkboxes).map(cb => {
        const service = cb.id.replace('update-', '');
        const card = document.querySelector(`[data-service="${service}"]`);
        const newVersion = card.querySelector('.new-version').textContent;
        
        return { service, version: newVersion };
    });
    
    if (selectedUpdates.length === 0) {
        showNotification('Please select at least one update', 'warning');
        return;
    }
    
    // Confirm with user
    const confirmed = confirm(
        `Apply ${selectedUpdates.length} update(s)?\n\n` +
        `A backup will be created before applying updates.\n` +
        `Services will be restarted during the update process.`
    );
    
    if (!confirmed) {
        return;
    }
    
    // Hide update list, show progress
    document.querySelector('.updates-list').style.display = 'none';
    document.querySelector('.update-actions').style.display = 'none';
    document.getElementById('update-progress').style.display = 'block';
    
    try {
        // Apply updates
        const response = await fetch('/api/wizard/updates/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updates: selectedUpdates,
                createBackup: true
            })
        });
        
        const data = await response.json();
        
        // Show results
        showUpdateResults(data);
    } catch (error) {
        console.error('Error applying updates:', error);
        showNotification('Failed to apply updates: ' + error.message, 'error');
        
        // Show rollback option
        document.getElementById('update-status').innerHTML = `
            <p class="error">Update failed: ${error.message}</p>
            <button onclick="rollbackUpdates()" class="btn btn-warning">
                Rollback to Previous Version
            </button>
        `;
    }
}

/**
 * Show update results
 */
function showUpdateResults(data) {
    document.getElementById('update-progress').style.display = 'none';
    document.getElementById('update-results').style.display = 'block';
    
    const resultsList = document.getElementById('results-list');
    
    if (data.success) {
        resultsList.innerHTML = `
            <div class="success-message">
                <h4>✓ All updates applied successfully!</h4>
                <p>Services have been updated and restarted.</p>
            </div>
            <div class="results-details">
                ${data.results.map(result => `
                    <div class="result-item success">
                        <strong>${result.service}</strong>: ${result.oldVersion} → ${result.newVersion}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        resultsList.innerHTML = `
            <div class="error-message">
                <h4>⚠ Some updates failed</h4>
                <p>The following updates were applied:</p>
            </div>
            <div class="results-details">
                ${data.results.map(result => `
                    <div class="result-item ${result.success ? 'success' : 'error'}">
                        <strong>${result.service}</strong>: 
                        ${result.success 
                            ? `${result.oldVersion} → ${result.newVersion} ✓` 
                            : `Failed - ${result.error}`}
                    </div>
                `).join('')}
            </div>
            ${data.results.some(r => r.rollbackAvailable) ? `
                <div class="rollback-option">
                    <p>A backup was created before updates. You can rollback if needed.</p>
                    <button onclick="rollbackUpdates('${data.backup.timestamp}')" class="btn btn-warning">
                        Rollback All Changes
                    </button>
                </div>
            ` : ''}
        `;
    }
}

/**
 * Rollback updates
 */
async function rollbackUpdates(backupTimestamp) {
    const confirmed = confirm(
        'Rollback to previous configuration?\n\n' +
        'This will restore all configuration files and restart services.'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/wizard/updates/rollback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ backupTimestamp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Rollback completed successfully', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            showNotification('Rollback failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error during rollback:', error);
        showNotification('Rollback failed: ' + error.message, 'error');
    }
}

/**
 * Update wizard title
 */
function updateWizardTitle(title) {
    const titleElement = document.querySelector('.wizard-header h1');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

/**
 * Load saved progress
 */
function loadProgress() {
    const currentStep = stateManager.get('currentStep');
    console.log(`Resuming from step ${currentStep}`);
    
    // Resume from saved step without prompting
    // User can always use "Start Over" if they want to reset
    if (currentStep > 1) {
        goToStep(currentStep);
    }
}

/**
 * Start installation (wrapper for install module)
 */
export async function startInstallation() {
    await startInstall();
}

// Export for global access (for inline onclick handlers)
if (typeof window !== 'undefined') {
    // Core wizard object
    window.wizard = {
        nextStep,
        previousStep,
        goToStep,
        startInstallation,
        loadConfigurationForm,
        validateConfiguration,
        saveConfiguration,
        api,
        stateManager
    };
    
    // Expose functions globally for inline onclick handlers
    window.nextStep = nextStep;
    window.previousStep = previousStep;
    window.goToStep = goToStep;
    window.startInstallation = startInstallation;
    
    // Checklist functions
    window.toggleChecklistItem = (item) => {
        const element = document.querySelector(`.checklist-item[data-item="${item}"]`);
        if (element) {
            element.classList.toggle('expanded');
        }
    };
    
    window.showDockerGuide = showDockerGuide;
    window.showComposeGuide = showComposeGuide;
    window.startQuiz = initializeQuiz;
    
    window.detectExternalIP = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const input = document.getElementById('external-ip');
            if (input) {
                input.value = data.ip;
                showNotification(`Detected IP: ${data.ip}`, 'success');
            }
        } catch (error) {
            showNotification('Failed to detect external IP', 'error');
        }
    };
    
    window.togglePasswordVisibility = (inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    };
    
    window.generatePassword = (inputId) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const input = document.getElementById(inputId);
        if (input) {
            input.value = password;
            showNotification('Password generated', 'success');
        }
    };
    
    window.toggleLogs = toggleInstallLogs;
    
    window.cancelInstallation = cancelInstall;
    
    // Error recovery functions
    window.retryInstallation = async () => {
        const { retryInstallation } = await import('./modules/install.js');
        retryInstallation();
    };
    
    window.showInstallationLogs = async () => {
        const { showInstallationLogs } = await import('./modules/install.js');
        showInstallationLogs();
    };
    
    window.exportDiagnostics = async () => {
        const { exportDiagnostics } = await import('./modules/install.js');
        exportDiagnostics();
    };
    
    window.goBackFromError = async () => {
        const { goBackFromError } = await import('./modules/install.js');
        goBackFromError();
    };
    
    window.startOverFromError = async () => {
        const { startOverFromError } = await import('./modules/install.js');
        startOverFromError();
    };
    
    window.runServiceVerification = runValidation;
    
    // Tour and resource functions are now implemented in complete.js module
    // window.skipTour - implemented in complete.js
    // window.startTour - implemented in complete.js
    // window.startDashboardTour - implemented in complete.js
    // window.showResourcesModal - implemented in complete.js
    
    // Service management functions are now in complete.js module
    // window.showServiceManagementGuide - implemented in complete.js
    // window.checkSyncStatus - implemented in complete.js
    // window.viewLogs - implemented in complete.js
    // window.openDashboard - implemented in complete.js
    
    window.showGlossaryModal = (term) => {
        // This would show a glossary modal with term definition
        showNotification(`Glossary: ${term} - Feature coming soon`, 'info');
    };
    
    window.retrySystemCheck = () => {
        retrySystemCheck().catch(error => {
            console.error('Failed to retry system check:', error);
        });
    };
    
    window.selectProfile = (profileId) => {
        const profileCard = document.querySelector(`.profile-card[data-profile="${profileId}"]`);
        if (profileCard) {
            profileCard.classList.toggle('selected');
            
            // Update state
            const selectedProfiles = stateManager.get('selectedProfiles') || [];
            const index = selectedProfiles.indexOf(profileId);
            
            if (index > -1) {
                selectedProfiles.splice(index, 1);
            } else {
                selectedProfiles.push(profileId);
            }
            
            stateManager.set('selectedProfiles', selectedProfiles);
            showNotification(`Profile ${profileId} ${index > -1 ? 'deselected' : 'selected'}`, 'success');
        }
    };
    
    // Add click handlers to profile cards
    document.addEventListener('click', (e) => {
        const profileCard = e.target.closest('.profile-card');
        if (profileCard) {
            const profileId = profileCard.dataset.profile;
            if (profileId) {
                window.selectProfile(profileId);
            }
        }
    });
}

console.log('Wizard module loaded');
