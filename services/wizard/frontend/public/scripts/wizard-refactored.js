/**
 * Kaspa All-in-One Installation Wizard
 * Main entry point - Refactored modular version
 */

// Import modules
import { api, WebSocketManager } from './modules/api-client.js';
import { stateManager } from './modules/state-manager.js';
import { initNavigation, nextStep, previousStep, goToStep } from './modules/navigation.js';
import { showNotification } from './modules/utils.js';
import { loadConfigurationForm, validateConfiguration, saveConfiguration } from './modules/configure.js';
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

// Initialize WebSocket
const wsManager = new WebSocketManager();

/**
 * Initialize wizard on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Kaspa Installation Wizard initialized (Refactored)');
    
    // Clear old localStorage if version changed
    const WIZARD_VERSION = '3'; // Increment this when making breaking changes
    const storedVersion = localStorage.getItem('wizardVersion');
    if (storedVersion !== WIZARD_VERSION) {
        console.log('Wizard version changed, clearing old state');
        localStorage.clear();
        localStorage.setItem('wizardVersion', WIZARD_VERSION);
    }
    
    // Initialize modules
    initNavigation();
    initWebSocket();
    
    // Load saved progress
    loadProgress();
    
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
        if (stepId === 'step-checklist') {
            runSystemCheck().catch(error => {
                console.error('Failed to run system check:', error);
            });
        }
        
        // Run full system check when entering system check step
        if (stepId === 'step-system-check') {
            runFullSystemCheck().catch(error => {
                console.error('Failed to run full system check:', error);
            });
        }
        
        // Load configuration and setup validation when entering configure step
        if (stepId === 'step-configure') {
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
        if (stepId === 'step-review') {
            displayConfigurationSummary();
        }
        
        // Start installation when entering install step
        if (stepId === 'step-install') {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                startInstall().catch(error => {
                    console.error('Failed to start installation:', error);
                    showNotification('Failed to start installation', 'error');
                });
            }, 500);
        }
        
        // Display validation results when entering complete step
        if (stepId === 'step-complete') {
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
