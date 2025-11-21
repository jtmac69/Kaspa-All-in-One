/**
 * Kaspa All-in-One Installation Wizard
 * Main entry point - Refactored modular version
 */

// Import modules
import { api, WebSocketManager } from './modules/api-client.js';
import { stateManager } from './modules/state-manager.js';
import { initNavigation, nextStep, previousStep, goToStep } from './modules/navigation.js';
import { showNotification } from './modules/utils.js';

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
    
    // Installation progress
    wsManager.on('install:progress', (data) => {
        console.log('Installation progress:', data);
        updateInstallationProgress(data);
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
 * Update installation progress
 */
function updateInstallationProgress(data) {
    const { stage, message, progress, details } = data;
    
    // Update progress bar
    const progressBar = document.querySelector('.install-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    // Update progress text
    const progressText = document.querySelector('.install-progress-text');
    if (progressText) {
        progressText.textContent = message;
    }
    
    // Update stage indicator
    const stageIndicator = document.querySelector('.install-stage');
    if (stageIndicator) {
        stageIndicator.textContent = stage;
    }
    
    // Store in state
    stateManager.update('installationProgress', {
        stage,
        message,
        progress,
        details,
        timestamp: new Date().toISOString()
    });
    
    // Create checkpoint at major milestones
    if (progress === 25 || progress === 50 || progress === 75) {
        createCheckpoint(`install-${progress}pct`, {
            stage,
            progress,
            message
        });
    }
}

/**
 * Handle installation complete
 */
function handleInstallationComplete(data) {
    showNotification('Installation completed successfully!', 'success');
    
    // Store completion data
    stateManager.set('installationComplete', {
        timestamp: new Date().toISOString(),
        validation: data.validation
    });
    
    // Move to complete step
    goToStep(8);
    
    // Clear checkpoint (installation finished)
    localStorage.removeItem('lastCheckpoint');
}

/**
 * Handle installation error
 */
function handleInstallationError(data) {
    const { stage, message, error } = data;
    
    showNotification(`Installation failed: ${message}`, 'error', 10000);
    
    // Store error data
    stateManager.set('installationError', {
        stage,
        message,
        error,
        timestamp: new Date().toISOString()
    });
    
    // Show error recovery options
    showErrorRecoveryDialog(data);
}

/**
 * Show error recovery dialog
 */
function showErrorRecoveryDialog(errorData) {
    const dialog = document.getElementById('error-recovery-dialog');
    if (!dialog) return;
    
    // Populate error details
    const errorMessage = dialog.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = errorData.message;
    }
    
    const errorStage = dialog.querySelector('.error-stage');
    if (errorStage) {
        errorStage.textContent = errorData.stage;
    }
    
    // Show dialog
    dialog.style.display = 'block';
}

/**
 * Start installation
 */
export async function startInstallation() {
    const config = stateManager.get('configuration');
    const profiles = stateManager.get('selectedProfiles');
    
    if (!profiles || profiles.length === 0) {
        showNotification('Please select at least one profile', 'error');
        return;
    }
    
    // Create pre-installation checkpoint
    await createCheckpoint('pre-installation', {
        config,
        profiles
    });
    
    // Start installation via WebSocket
    wsManager.emit('install:start', {
        config,
        profiles
    });
    
    // Move to install step
    goToStep(7);
}

// Export for global access (for inline onclick handlers)
if (typeof window !== 'undefined') {
    // Core wizard object
    window.wizard = {
        nextStep,
        previousStep,
        goToStep,
        startInstallation,
        api,
        stateManager
    };
    
    // Expose functions globally for inline onclick handlers
    window.nextStep = nextStep;
    window.previousStep = previousStep;
    window.goToStep = goToStep;
    window.startInstallation = startInstallation;
    
    // Placeholder functions for features not yet implemented
    window.toggleChecklistItem = (item) => {
        const element = document.querySelector(`.checklist-item[data-item="${item}"]`);
        if (element) {
            element.classList.toggle('expanded');
        }
    };
    
    window.showDockerGuide = () => {
        showNotification('Docker installation guide coming soon', 'info');
    };
    
    window.showComposeGuide = () => {
        showNotification('Docker Compose installation guide coming soon', 'info');
    };
    
    window.startQuiz = () => {
        showNotification('Profile selection quiz coming soon', 'info');
    };
    
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
    
    window.toggleLogs = () => {
        const logs = document.getElementById('install-logs');
        const toggleText = document.getElementById('logs-toggle-text');
        if (logs && toggleText) {
            const isHidden = logs.style.display === 'none';
            logs.style.display = isHidden ? 'block' : 'none';
            toggleText.textContent = isHidden ? 'Hide Details' : 'Show Details';
        }
    };
    
    window.cancelInstallation = () => {
        if (confirm('Are you sure you want to cancel the installation?')) {
            wsManager.emit('install:cancel');
            showNotification('Installation cancelled', 'info');
            goToStep(1);
        }
    };
    
    window.skipTour = () => {
        showNotification('Tour skipped', 'info');
    };
    
    window.startTour = () => {
        showNotification('Interactive tour coming soon', 'info');
    };
    
    window.runServiceVerification = async () => {
        showNotification('Running service verification...', 'info');
        // This would call the validation API
    };
    
    window.openDashboard = () => {
        window.open('http://localhost:8080', '_blank');
    };
    
    window.startDashboardTour = () => {
        showNotification('Dashboard tour coming soon', 'info');
    };
    
    window.showServiceManagementGuide = () => {
        showNotification('Service management guide coming soon', 'info');
    };
    
    window.showResourcesModal = () => {
        showNotification('Resources modal coming soon', 'info');
    };
    
    window.checkSyncStatus = async () => {
        showNotification('Checking sync status...', 'info');
    };
    
    window.viewLogs = () => {
        showNotification('Log viewer coming soon', 'info');
    };
    
    window.showGlossaryModal = (term) => {
        // This would show a glossary modal with term definition
        showNotification(`Glossary: ${term} - Feature coming soon`, 'info');
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
