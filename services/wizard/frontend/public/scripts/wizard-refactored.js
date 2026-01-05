/**
 * Kaspa All-in-One Installation Wizard
 * Main entry point - Refactored modular version
 */

// Import modules
import { api, WebSocketManager } from './modules/api-client.js';
import { stateManager } from './modules/state-manager.js';
import { initNavigation, nextStep, previousStep, goToStep } from './modules/navigation.js';
import { initNavigationFooter } from './modules/navigation-footer.js';
import { showNotification, dismissBanner } from './modules/utils.js';
import { loadConfigurationForm, validateConfiguration, saveConfiguration, initializeProfileSelection, initializeProfileSelectionWithReconfiguration, setupDeveloperModeToggle, setupNetworkChangeDetection, setupAdvancedOptionsToggle } from './modules/configure.js';
import { runSystemCheck, showDockerGuide, showComposeGuide, initializeQuiz } from './modules/checklist.js';
import { runFullSystemCheck, retrySystemCheck } from './modules/system-check.js';
import { displayConfigurationSummary, validateBeforeInstallation } from './modules/review.js';
import { 
    initializeWebSocket as initInstallWebSocket,
    startInstallation as startInstall,
    updateInstallationUI,
    handleInstallationComplete,
    handleInstallationError,
    handleInfrastructureValidation,
    cancelInstallation as cancelInstall,
    toggleInstallLogs
} from './modules/install.js';
import { displayValidationResults, runServiceVerification as runValidation } from './modules/complete.js';
import { checkAndShowResumeDialog, displayBackgroundTaskStatus } from './modules/resume.js';
import { 
    initReconfigurationNavigation, 
    showReconfigurationNavigation, 
    hideReconfigurationNavigation,
    updateBreadcrumbs,
    startOperation,
    updateOperationProgress,
    completeOperation
} from './modules/reconfiguration-navigation.js';

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
    
    // Initialize launch context from URL parameters
    const { initializeLaunchContext } = await import('./modules/launch-context.js');
    const launchContext = initializeLaunchContext();
    
    // Detect wizard mode
    const wizardMode = await detectWizardMode();
    console.log('Wizard mode:', wizardMode);
    
    // Store mode in state
    stateManager.set('wizardMode', wizardMode.mode);
    stateManager.set('wizardModeInfo', wizardMode);
    
    // Apply launch context to wizard mode if present
    if (launchContext) {
        console.log('Launch context detected:', launchContext);
        
        // If context specifies an action, ensure we're in reconfiguration mode
        if (launchContext.action && launchContext.action !== 'view') {
            stateManager.set('wizardMode', 'reconfigure');
            wizardMode.mode = 'reconfigure';
        }
    }
    
    // Initialize modules
    initNavigation();
    initNavigationFooter();
    initWebSocket();
    
    // Handle different modes
    if (wizardMode.mode === 'reconfigure') {
        await handleReconfigurationMode(wizardMode, launchContext);
    } else if (wizardMode.mode === 'update') {
        await handleUpdateMode(wizardMode);
    } else {
        // Initial installation mode
        await handleInitialMode(wizardMode);
    }
    
    // Set up global event listeners
    setupEventListeners();
    
    // Check if test release banner was previously dismissed
    const bannerDismissed = localStorage.getItem('testReleaseBannerDismissed');
    if (bannerDismissed === 'true') {
        const banner = document.getElementById('test-release-banner');
        if (banner) {
            banner.classList.add('dismissed');
        }
    }
    
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
        
        // Use enhanced troubleshooting if available
        if (window.enhancedTroubleshooting && data.troubleshootingGuide) {
            window.enhancedTroubleshooting.handleInstallationError(data);
        } else {
            // Fallback to original error handling
            handleInstallationError(data);
        }
    });
    
    // Infrastructure validation
    wsManager.on('infrastructure:validation', (data) => {
        console.log('Infrastructure validation:', data);
        handleInfrastructureValidation(data);
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
                    // Initialize profile selection with reconfiguration support
                    module.initializeProfileSelectionWithReconfiguration();
                });
            }, 100);
        }
        
        // Load configuration and setup validation when entering configure step
        if (stepId === 'configure') {
            loadConfigurationForm().catch(error => {
                console.error('Failed to load configuration:', error);
            });
            // Setup form validation and new configuration features after a short delay to ensure DOM is ready
            setTimeout(() => {
                import('./modules/configure.js').then(module => {
                    module.setupFormValidation();
                    module.setupNetworkChangeDetection();
                    module.setupAdvancedOptionsToggle();
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
            setTimeout(async () => {
                try {
                    // Initialize completion page with context-aware navigation
                    const { initializeCompletionPage } = await import('./modules/complete.js');
                    initializeCompletionPage();
                    
                    // Display validation results
                    displayValidationResults().catch(error => {
                        console.error('Failed to display validation results:', error);
                        showNotification('Failed to validate services', 'error');
                    });
                } catch (error) {
                    console.error('Failed to initialize completion page:', error);
                    // Still try to display validation results
                    displayValidationResults().catch(error => {
                        console.error('Failed to display validation results:', error);
                        showNotification('Failed to validate services', 'error');
                    });
                }
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
async function handleReconfigurationMode(wizardMode, launchContext = null) {
    console.log('Handling reconfiguration mode', { wizardMode, launchContext });
    
    // Update wizard title
    updateWizardTitle('Reconfigure Kaspa All-in-One');
    
    // Initialize reconfiguration navigation
    initReconfigurationNavigation();
    
    // Show reconfiguration navigation
    showReconfigurationNavigation();
    
    // Set initial breadcrumbs
    updateBreadcrumbs([
        { id: 'reconfigure-home', title: 'Reconfiguration', description: 'Main reconfiguration options' }
    ]);
    
    // Show reconfiguration landing page
    await showReconfigurationLanding(launchContext);
}

/**
 * Show reconfiguration landing page
 */
async function showReconfigurationLanding(launchContext = null) {
    console.log('Showing reconfiguration landing page', { launchContext });
    
    // Show the reconfiguration landing step
    const landingStep = document.getElementById('step-reconfigure-landing');
    if (landingStep) {
        landingStep.style.display = 'block';
        
        // Hide other steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            if (step.id !== 'step-reconfigure-landing') {
                step.style.display = 'none';
            }
        });
        
        // Update progress indicator (hide it for reconfiguration mode)
        const progressIndicator = document.querySelector('.wizard-progress');
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
        }
        
        // Load installation state and profile information
        await loadReconfigurationData();
        
        // Apply launch context pre-selections if available
        if (launchContext) {
            applyLaunchContextToReconfiguration(launchContext);
        }
    }
}

/**
 * Load reconfiguration data (installation state, profile states, suggestions)
 */
async function loadReconfigurationData() {
    try {
        // Show loading state
        updateInstallationStatus('checking', 'Loading installation details...');
        
        // Load profile states
        const response = await api.get('/wizard/profiles/status');
        
        if (response.success) {
            // Update installation summary
            updateInstallationSummary(response);
            
            // Update profile status overview
            updateProfileStatusOverview(response.profileStates);
            
            // Update configuration suggestions
            updateConfigurationSuggestions(response.suggestions);
            
            // Update installation status
            const statusText = `${response.runningServicesCount} of ${response.totalServicesCount} services running`;
            const statusType = response.runningServicesCount === response.totalServicesCount ? 'healthy' : 
                              response.runningServicesCount > 0 ? 'warning' : 'error';
            updateInstallationStatus(statusType, statusText);
            
            // Show installation details
            const detailsSection = document.getElementById('installation-details');
            if (detailsSection) {
                detailsSection.style.display = 'block';
            }
            
            // Show profile status overview if there are profiles
            if (response.profileStates && response.profileStates.length > 0) {
                const overviewSection = document.getElementById('profile-status-overview');
                if (overviewSection) {
                    overviewSection.style.display = 'block';
                }
            }
            
            // Show suggestions if there are any
            if (response.suggestions && response.suggestions.length > 0) {
                const suggestionsSection = document.getElementById('configuration-suggestions');
                if (suggestionsSection) {
                    suggestionsSection.style.display = 'block';
                }
            }
            
            // Store data in state for later use
            stateManager.set('reconfigurationData', response);
            
        } else {
            updateInstallationStatus('error', 'Failed to load installation data');
            showNotification('Failed to load installation data: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error loading reconfiguration data:', error);
        updateInstallationStatus('error', 'Error loading installation data');
        showNotification('Error loading installation data', 'error');
    }
}

/**
 * Update installation summary display
 */
function updateInstallationSummary(data) {
    // Update summary text
    const summaryText = document.getElementById('installation-summary-text');
    if (summaryText) {
        const installedCount = data.installedProfiles?.length || 0;
        const totalProfiles = data.profileStates?.length || 0;
        summaryText.textContent = `${installedCount} of ${totalProfiles} profiles installed`;
    }
    
    // Update detail values
    const installationDate = document.getElementById('installation-date');
    if (installationDate && data.installationDate) {
        installationDate.textContent = new Date(data.installationDate).toLocaleDateString();
    }
    
    const lastModifiedDate = document.getElementById('last-modified-date');
    if (lastModifiedDate && data.lastModified) {
        lastModifiedDate.textContent = new Date(data.lastModified).toLocaleDateString();
    } else if (lastModifiedDate) {
        lastModifiedDate.textContent = 'Never';
    }
    
    const runningServicesCount = document.getElementById('running-services-count');
    if (runningServicesCount) {
        runningServicesCount.textContent = `${data.runningServicesCount}/${data.totalServicesCount}`;
    }
    
    const installationVersion = document.getElementById('installation-version');
    if (installationVersion) {
        installationVersion.textContent = data.version || 'Unknown';
    }
}

/**
 * Update installation status indicator
 */
function updateInstallationStatus(type, text) {
    const statusIndicator = document.querySelector('#installation-status .status-indicator');
    const statusText = document.querySelector('#installation-status .status-text');
    
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${type}`;
    }
    
    if (statusText) {
        statusText.textContent = text;
    }
}

/**
 * Update profile status overview
 */
function updateProfileStatusOverview(profileStates) {
    const grid = document.getElementById('profile-status-grid');
    if (!grid || !profileStates) return;
    
    grid.innerHTML = '';
    
    profileStates.forEach(profile => {
        const card = document.createElement('div');
        card.className = `profile-status-card ${profile.installationState}`;
        
        const statusIcon = getProfileStatusIcon(profile);
        const statusBadge = getProfileStatusBadge(profile);
        
        card.innerHTML = `
            <div class="profile-status-icon">${statusIcon}</div>
            <div class="profile-status-content">
                <div class="profile-status-name">${profile.name}</div>
                <div class="profile-status-description">${profile.description}</div>
            </div>
            <div class="profile-status-badge ${profile.installationState}">
                ${statusBadge}
            </div>
        `;
        
        grid.appendChild(card);
    });
}

/**
 * Get profile status icon
 */
function getProfileStatusIcon(profile) {
    const icons = {
        'core': '⚡',
        'kaspa-user-applications': '📱',
        'indexer-services': '🔍',
        'archive-node': '📚',
        'mining': '⛏️'
    };
    return icons[profile.id] || '⚙️';
}

/**
 * Get profile status badge text
 */
function getProfileStatusBadge(profile) {
    switch (profile.installationState) {
        case 'installed':
            return profile.status === 'running' ? '✓ Running' : '✓ Installed';
        case 'partial':
            return '⚠ Partial';
        case 'not-installed':
            return 'Not Installed';
        default:
            return 'Unknown';
    }
}

/**
 * Update configuration suggestions
 */
function updateConfigurationSuggestions(suggestions) {
    const list = document.getElementById('suggestions-list');
    if (!list || !suggestions || suggestions.length === 0) return;
    
    list.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.onclick = () => applySuggestion(suggestion);
        
        const priorityIcon = getPriorityIcon(suggestion.priority);
        
        item.innerHTML = `
            <div class="suggestion-icon">${priorityIcon}</div>
            <div class="suggestion-content">
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="suggestion-description">${suggestion.description}</div>
            </div>
            <a href="#" class="suggestion-action" onclick="event.stopPropagation(); applySuggestion('${suggestion.id}')">
                Apply →
            </a>
        `;
        
        list.appendChild(item);
    });
}

/**
 * Get priority icon for suggestions
 */
function getPriorityIcon(priority) {
    switch (priority) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🟢';
        default: return '💡';
    }
}

/**
 * Apply launch context to reconfiguration landing page
 */
function applyLaunchContextToReconfiguration(launchContext) {
    console.log('Applying launch context to reconfiguration:', launchContext);
    
    // Pre-select action based on context
    if (launchContext.action) {
        const actionMapping = {
            'add': 'add-profiles',
            'modify': 'modify-config',
            'remove': 'remove-profiles'
        };
        
        const actionId = actionMapping[launchContext.action];
        if (actionId) {
            // Auto-select the action
            selectReconfigurationAction(actionId);
            
            // Show notification about pre-selection
            const actionMessages = {
                'add-profiles': 'Ready to add new services',
                'modify-config': 'Ready to modify configuration',
                'remove-profiles': 'Ready to remove services'
            };
            
            showNotification(actionMessages[actionId] || 'Action pre-selected', 'info');
            
            // If we have a specific profile, show additional context
            if (launchContext.profile) {
                const profileMessage = launchContext.action === 'add' 
                    ? `Adding ${launchContext.profile} profile`
                    : launchContext.action === 'remove'
                    ? `Removing ${launchContext.profile} profile`
                    : `Modifying ${launchContext.profile} profile`;
                
                showNotification(profileMessage, 'info');
            }
            
            // Auto-proceed if we have enough context
            if (launchContext.profile && (launchContext.action === 'add' || launchContext.action === 'remove')) {
                // Wait a moment for user to see the selection, then proceed
                setTimeout(() => {
                    proceedWithReconfiguration();
                }, 2000);
            }
        }
    }
}

/**
 * Select reconfiguration action
 */
function selectReconfigurationAction(action) {
    // Remove previous selections
    document.querySelectorAll('.action-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select current action
    const actionCard = document.getElementById(`${action}-action`);
    if (actionCard) {
        actionCard.classList.add('selected');
    }
    
    // Store selected action
    stateManager.set('reconfigurationAction', action);
    
    // Enable continue button
    const continueBtn = document.getElementById('reconfigure-continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
    }
}

/**
 * Proceed with selected reconfiguration action
 */
function proceedWithReconfiguration() {
    const selectedAction = stateManager.get('reconfigurationAction');
    
    if (!selectedAction) {
        showNotification('Please select a reconfiguration option', 'warning');
        return;
    }
    
    // Store reconfiguration mode context
    stateManager.set('wizardMode', 'reconfigure');
    stateManager.set('reconfigurationContext', selectedAction);
    
    // Update breadcrumbs based on selected action
    const actionBreadcrumbs = {
        'add-profiles': [
            { id: 'reconfigure-home', title: 'Reconfiguration', description: 'Main reconfiguration options' },
            { id: 'add-profiles', title: 'Add Profiles', description: 'Select new profiles to install' }
        ],
        'modify-config': [
            { id: 'reconfigure-home', title: 'Reconfiguration', description: 'Main reconfiguration options' },
            { id: 'modify-config', title: 'Modify Configuration', description: 'Change existing settings' }
        ],
        'remove-profiles': [
            { id: 'reconfigure-home', title: 'Reconfiguration', description: 'Main reconfiguration options' },
            { id: 'remove-profiles', title: 'Remove Profiles', description: 'Uninstall existing profiles' }
        ]
    };
    
    updateBreadcrumbs(actionBreadcrumbs[selectedAction]);
    
    // Start operation tracking
    const operationConfigs = {
        'add-profiles': {
            id: 'add-profiles-operation',
            type: 'Profile Addition',
            title: 'Adding New Profiles',
            steps: [
                { title: 'Profile Selection', description: 'Choose profiles to install' },
                { title: 'Configuration', description: 'Configure new services' },
                { title: 'Validation', description: 'Validate configuration changes' },
                { title: 'Installation', description: 'Install and start new services' },
                { title: 'Verification', description: 'Verify services are running correctly' }
            ]
        },
        'modify-config': {
            id: 'modify-config-operation',
            type: 'Configuration Modification',
            title: 'Modifying Configuration',
            steps: [
                { title: 'Load Current Config', description: 'Load existing configuration' },
                { title: 'Modify Settings', description: 'Update configuration values' },
                { title: 'Validation', description: 'Validate configuration changes' },
                { title: 'Apply Changes', description: 'Apply new configuration' },
                { title: 'Restart Services', description: 'Restart affected services' }
            ]
        },
        'remove-profiles': {
            id: 'remove-profiles-operation',
            type: 'Profile Removal',
            title: 'Removing Profiles',
            steps: [
                { title: 'Profile Selection', description: 'Choose profiles to remove' },
                { title: 'Data Options', description: 'Choose what to do with data' },
                { title: 'Backup Creation', description: 'Create backup before removal' },
                { title: 'Service Shutdown', description: 'Stop services gracefully' },
                { title: 'Cleanup', description: 'Remove services and configuration' }
            ]
        }
    };
    
    startOperation(operationConfigs[selectedAction]);
    
    switch (selectedAction) {
        case 'add-profiles':
            // Go to profile selection with context to show available profiles
            goToProfileSelection('add');
            break;
        case 'modify-config':
            // Go to configuration step with current config loaded
            goToConfiguration('modify');
            break;
        case 'remove-profiles':
            // Go to profile selection with context to show installed profiles for removal
            goToProfileSelection('remove');
            break;
        default:
            showNotification('Unknown reconfiguration action', 'error');
    }
}

/**
 * Go to profile selection with reconfiguration context
 */
function goToProfileSelection(context) {
    // Update progress
    updateOperationProgress(20, 'Loading profile selection...', 0);
    
    // Update breadcrumbs
    const currentBreadcrumbs = stateManager.get('breadcrumbs') || [];
    const newBreadcrumbs = [...currentBreadcrumbs];
    
    if (context === 'add') {
        newBreadcrumbs.push({ id: 'profile-selection', title: 'Select Profiles', description: 'Choose profiles to add' });
    } else if (context === 'remove') {
        newBreadcrumbs.push({ id: 'profile-selection', title: 'Select Profiles', description: 'Choose profiles to remove' });
    }
    
    updateBreadcrumbs(newBreadcrumbs);
    
    // Show profile selection step
    goToStep(5); // Assuming step 5 is profile selection
    
    // Set context for profile selection
    stateManager.set('profileSelectionContext', context);
    
    // Update profile selection UI based on context
    updateProfileSelectionForReconfiguration(context);
    
    // Update progress
    updateOperationProgress(40, 'Profile selection ready', 0);
}

/**
 * Go to configuration with reconfiguration context
 */
function goToConfiguration(context) {
    // Update progress
    updateOperationProgress(20, 'Loading existing configuration...', 0);
    
    // Load existing configuration first
    loadExistingConfiguration().then(() => {
        // Update breadcrumbs
        const currentBreadcrumbs = stateManager.get('breadcrumbs') || [];
        const newBreadcrumbs = [...currentBreadcrumbs];
        newBreadcrumbs.push({ id: 'configuration', title: 'Configuration', description: 'Modify service settings' });
        updateBreadcrumbs(newBreadcrumbs);
        
        // Show configuration step
        goToStep(6); // Assuming step 6 is configuration
        
        // Set context for configuration
        stateManager.set('configurationContext', context);
        
        // Update progress
        updateOperationProgress(40, 'Configuration loaded, ready for modifications', 0);
    }).catch(error => {
        console.error('Failed to load configuration:', error);
        completeOperation(false, 'Failed to load existing configuration');
    });
}

/**
 * Load existing configuration for modification
 */
async function loadExistingConfiguration() {
    try {
        const response = await api.get('/wizard/current-config');
        
        if (response.success) {
            // Store existing configuration
            stateManager.set('existingConfig', response.config);
            stateManager.set('existingProfiles', response.profiles);
            
            // Pre-populate configuration form
            populateConfigurationForm(response.config);
            
            showNotification('Configuration loaded successfully', 'success');
        } else {
            showNotification('Failed to load configuration: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showNotification('Error loading configuration', 'error');
    }
}

/**
 * Update profile selection UI for reconfiguration context
 */
function updateProfileSelectionForReconfiguration(context) {
    // The new implementation handles this in initializeProfileSelectionWithReconfiguration
    // This function is kept for backward compatibility
    console.log('Profile selection context updated:', context);
}

/**
 * Update profile cards with installation state indicators
 */
function updateProfileCardsForReconfiguration(context, reconfigData) {
    const profileCards = document.querySelectorAll('.profile-card');
    
    profileCards.forEach(card => {
        const profileId = card.dataset.profile;
        const profileState = reconfigData.profiles.find(p => p.id === profileId);
        
        if (profileState) {
            // Add installation state class
            card.classList.add(`profile-${profileState.installationState}`);
            
            // Add installation state indicator
            let indicator = card.querySelector('.profile-installation-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'profile-installation-indicator';
                card.appendChild(indicator);
            }
            
            // Update indicator based on context and state
            if (context === 'add' && profileState.installationState === 'installed') {
                indicator.innerHTML = '<span class="installed-badge">✓ Installed</span>';
                card.classList.add('profile-disabled');
            } else if (context === 'remove' && profileState.installationState === 'not-installed') {
                indicator.innerHTML = '<span class="not-installed-badge">Not Installed</span>';
                card.classList.add('profile-disabled');
            } else if (profileState.installationState === 'installed') {
                indicator.innerHTML = '<span class="installed-badge">✓ Installed</span>';
            } else if (profileState.installationState === 'partial') {
                indicator.innerHTML = '<span class="partial-badge">⚠ Partial</span>';
            }
        }
    });
}

/**
 * Apply a configuration suggestion
 */
function applySuggestion(suggestionId) {
    const reconfigData = stateManager.get('reconfigurationData');
    if (!reconfigData || !reconfigData.suggestions) return;
    
    const suggestion = reconfigData.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    // Store suggestion context
    stateManager.set('appliedSuggestion', suggestion);
    
    // Apply the suggestion based on its action
    switch (suggestion.action) {
        case 'add-profiles':
            selectReconfigurationAction('add-profiles');
            proceedWithReconfiguration();
            break;
        case 'modify-config':
            selectReconfigurationAction('modify-config');
            proceedWithReconfiguration();
            break;
        default:
            showNotification('Suggestion applied', 'success');
    }
}

/**
 * Go to initial installation mode
 */
function goToInitialMode() {
    // Clear reconfiguration state
    stateManager.remove('reconfigurationData');
    stateManager.remove('reconfigurationAction');
    stateManager.remove('reconfigurationContext');
    
    // Show progress indicator again
    const progressIndicator = document.querySelector('.wizard-progress');
    if (progressIndicator) {
        progressIndicator.style.display = 'block';
    }
    
    // Go to welcome step
    goToStep(1);
    
    // Update title
    updateWizardTitle('Kaspa All-in-One Installation Wizard');
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
        // Use only alphanumeric characters to avoid database URL parsing issues
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
    
    window.dismissBanner = () => {
        const banner = document.getElementById('test-release-banner');
        if (banner) {
            banner.classList.add('dismissed');
            // Store dismissal in localStorage to persist across page reloads
            localStorage.setItem('testReleaseBannerDismissed', 'true');
        }
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
    
    // Reconfiguration functions
    window.selectReconfigurationAction = selectReconfigurationAction;
    window.proceedWithReconfiguration = proceedWithReconfiguration;
    window.goToInitialMode = () => {
        // Clear reconfiguration mode and restart wizard in initial mode
        stateManager.set('wizardMode', 'initial');
        stateManager.set('reconfigurationAction', null);
        window.location.href = '/?mode=initial';
    };
    window.applySuggestion = (suggestionId) => {
        const reconfigData = stateManager.get('reconfigurationData');
        if (!reconfigData || !reconfigData.suggestions) return;
        
        const suggestion = reconfigData.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;
        
        // Apply the suggestion based on its action
        if (suggestion.action === 'add-profiles') {
            stateManager.set('reconfigurationAction', 'add-profiles');
            stateManager.set('suggestedProfiles', suggestion.context.profiles);
            proceedWithReconfiguration();
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
