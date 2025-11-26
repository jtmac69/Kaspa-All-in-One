/**
 * Navigation Module
 * Handles wizard step navigation and progress
 */

import { stateManager } from './state-manager.js';
import { buildConfig, isFeatureEnabled } from './build-config.js';

export const TOTAL_STEPS = 8;

const STEP_IDS = [
    'welcome',
    'checklist',
    'system-check',
    'profiles',
    'configure',
    'review',
    'install',
    'complete'
];

/**
 * Get step ID from step number
 */
export function getStepId(stepNumber) {
    return STEP_IDS[stepNumber - 1];
}

/**
 * Get step number from step ID
 */
export function getStepNumber(stepId) {
    return STEP_IDS.indexOf(stepId) + 1;
}

/**
 * Navigate to next step
 */
export async function nextStep() {
    const currentStep = stateManager.get('currentStep');
    const currentStepId = getStepId(currentStep);
    
    // Validate configuration before leaving configure step
    if (currentStepId === 'configure') {
        try {
            const { validateConfiguration } = await import('./configure.js');
            const isValid = await validateConfiguration();
            if (!isValid) {
                console.log('Configuration validation failed, staying on configure step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate configuration:', error);
            return;
        }
    }
    
    // Validate before leaving review step
    if (currentStepId === 'review') {
        try {
            const { validateBeforeInstallation } = await import('./review.js');
            const isValid = validateBeforeInstallation();
            if (!isValid) {
                console.log('Review validation failed, staying on review step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate review:', error);
            return;
        }
    }
    
    if (currentStep < TOTAL_STEPS) {
        goToStep(currentStep + 1);
    }
}

/**
 * Navigate to previous step
 */
export function previousStep() {
    const currentStep = stateManager.get('currentStep');
    
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

/**
 * Navigate to specific step
 */
export function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > TOTAL_STEPS) {
        console.error('Invalid step number:', stepNumber);
        return;
    }
    
    const currentStep = stateManager.get('currentStep');
    
    // Hide ALL steps first
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show new step
    const newStepEl = document.querySelector(`#step-${getStepId(stepNumber)}`);
    if (newStepEl) {
        newStepEl.classList.add('active');
    } else {
        console.error(`Step element not found: #step-${getStepId(stepNumber)}`);
    }
    
    // Update state
    stateManager.set('currentStep', stepNumber);
    
    // Update progress indicator
    updateProgressIndicator(stepNumber);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Handle step-specific entry logic
    handleStepEntry(stepNumber);
}

/**
 * Update progress indicator
 */
export function updateProgressIndicator(currentStep) {
    const steps = document.querySelectorAll('.progress-step');
    
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

/**
 * Handle step entry logic
 */
function handleStepEntry(stepNumber) {
    const stepId = getStepId(stepNumber);
    
    // Dispatch custom event for step entry
    const event = new CustomEvent('stepEntry', {
        detail: { stepNumber, stepId }
    });
    document.dispatchEvent(event);
    
    // Step-specific logic
    switch (stepId) {
        case 'checklist':
            // Checklist module will handle this
            // Testing shortcut: auto-enable continue button (ONLY in test builds)
            if (isFeatureEnabled('autoEnableContinueButtons')) {
                console.warn('[TEST MODE] Auto-enabling continue button for checklist');
                enableContinueButton('checklist-continue');
            }
            break;
        case 'system-check':
            // System check module will handle this
            // Testing shortcut: auto-enable continue button (ONLY in test builds)
            if (isFeatureEnabled('autoEnableContinueButtons')) {
                console.warn('[TEST MODE] Auto-enabling continue button for system-check');
                setTimeout(() => {
                    enableContinueButton('step-system-check');
                }, 1000);
            }
            break;
        case 'profiles':
            // Profiles module will handle this
            break;
        case 'configure':
            // Load configuration form from API
            loadConfigurationFormHandler();
            // Set up configuration form listeners
            setupConfigurationListeners();
            break;
        case 'review':
            // Review module will handle this
            break;
        case 'install':
            // Installation module will handle this
            break;
        case 'complete':
            // Complete module will handle this
            break;
    }
}

/**
 * Load configuration form handler
 */
async function loadConfigurationFormHandler() {
    try {
        // Dynamically import configure module
        const { loadConfigurationForm } = await import('./configure.js');
        await loadConfigurationForm();
    } catch (error) {
        console.error('Failed to load configuration form:', error);
    }
}

/**
 * Set up configuration form listeners
 */
function setupConfigurationListeners() {
    // Import stateManager
    import('./state-manager.js').then(({ stateManager }) => {
        // External IP input
        const externalIpInput = document.getElementById('external-ip');
        if (externalIpInput) {
            externalIpInput.addEventListener('change', (e) => {
                stateManager.update('configuration', { externalIp: e.target.value });
            });
        }
        
        // Public node toggle
        const publicNodeToggle = document.getElementById('public-node');
        if (publicNodeToggle) {
            publicNodeToggle.addEventListener('change', (e) => {
                stateManager.update('configuration', { publicNode: e.target.checked });
            });
        }
        
        // Database password
        const dbPasswordInput = document.getElementById('db-password');
        if (dbPasswordInput) {
            dbPasswordInput.addEventListener('change', (e) => {
                stateManager.update('configuration', { dbPassword: e.target.value });
            });
        }
        
        // Advanced mode toggle
        const advancedModeToggle = document.getElementById('advanced-mode');
        if (advancedModeToggle) {
            advancedModeToggle.addEventListener('change', (e) => {
                const advancedOptions = document.getElementById('advanced-options');
                if (advancedOptions) {
                    advancedOptions.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Custom env textarea
        const customEnvTextarea = document.getElementById('custom-env');
        if (customEnvTextarea) {
            customEnvTextarea.addEventListener('change', (e) => {
                stateManager.update('configuration', { customEnv: e.target.value });
            });
        }
    });
}

/**
 * Enable continue button for testing
 */
function enableContinueButton(stepId) {
    // Find continue button in the step
    const step = document.getElementById(`step-${stepId}`) || document.getElementById(stepId);
    if (step) {
        const continueBtn = step.querySelector('.btn-primary[onclick*="nextStep"]');
        if (continueBtn) {
            continueBtn.disabled = false;
        }
    }
    
    // Also try finding by direct selector
    const buttons = document.querySelectorAll('.btn-primary[disabled]');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Continue')) {
            btn.disabled = false;
        }
    });
}

/**
 * Initialize navigation
 */
export function initNavigation() {
    const currentStep = stateManager.get('currentStep');
    updateProgressIndicator(currentStep);
    
    // Set up navigation button listeners
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-action="next"]')) {
            nextStep();
        } else if (e.target.matches('[data-action="previous"]')) {
            previousStep();
        } else if (e.target.matches('[data-action="goto"]')) {
            const step = parseInt(e.target.dataset.step, 10);
            if (!isNaN(step)) {
                goToStep(step);
            }
        }
    });
}
