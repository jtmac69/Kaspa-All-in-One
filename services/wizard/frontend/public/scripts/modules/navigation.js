/**
 * Navigation Module
 * Handles wizard step navigation and progress
 */

import { stateManager } from './state-manager.js';
import { buildConfig, isFeatureEnabled } from './build-config.js';
import { showNotification } from './utils.js';

export const TOTAL_STEPS = 9;

const STEP_IDS = [
    'welcome',
    'checklist',
    'system-check',
    'templates',
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
 * Show the Profiles step in the progress indicator
 */
export function showProfilesStep() {
    const profilesStep = document.getElementById('profiles-progress-step');
    const profilesLine = document.getElementById('profiles-progress-line');
    
    if (profilesStep) {
        profilesStep.style.display = 'flex';
        profilesStep.classList.add('visible');
    }
    if (profilesLine) {
        profilesLine.style.display = 'block';
        profilesLine.classList.add('visible');
    }
    
    console.log('[NAVIGATION] Profiles step shown in progress indicator');
}

/**
 * Hide the Profiles step from the progress indicator
 */
export function hideProfilesStep() {
    const profilesStep = document.getElementById('profiles-progress-step');
    const profilesLine = document.getElementById('profiles-progress-line');
    
    if (profilesStep) {
        profilesStep.style.display = 'none';
        profilesStep.classList.remove('visible');
    }
    if (profilesLine) {
        profilesLine.style.display = 'none';
        profilesLine.classList.remove('visible');
    }
    
    console.log('[NAVIGATION] Profiles step hidden from progress indicator');
}

/**
 * Update step numbering to reflect template-first flow
 */
export function updateStepNumbering() {
    const navigationPath = stateManager.get('navigationPath');
    
    if (navigationPath === 'template') {
        // Template path: Templates (4) → Configure (6) → Review (7) → Install (8) → Complete (9)
        hideProfilesStep();
        updateStepNumbers([1, 2, 3, 4, 6, 7, 8, 9]);
    } else if (navigationPath === 'custom') {
        // Custom path: Templates (4) → Profiles (5) → Configure (6) → Review (7) → Install (8) → Complete (9)
        showProfilesStep();
        updateStepNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    } else {
        // Default: show all steps
        hideProfilesStep(); // Start with template-first approach
        updateStepNumbers([1, 2, 3, 4, 6, 7, 8, 9]);
    }
}

/**
 * Update step numbers in the progress indicator
 */
function updateStepNumbers(activeSteps) {
    const progressSteps = document.querySelectorAll('.progress-step');
    let visibleStepIndex = 0;
    
    progressSteps.forEach((step, index) => {
        const stepNumber = index + 1;
        const stepElement = step.querySelector('.step-number');
        
        if (activeSteps.includes(stepNumber)) {
            step.style.display = 'flex';
            if (stepElement) {
                stepElement.textContent = activeSteps[visibleStepIndex];
            }
            visibleStepIndex++;
        } else if (!step.classList.contains('optional-step')) {
            step.style.display = 'none';
        }
    });
}

/**
 * Navigate to next step
 */
export async function nextStep() {
    const currentStep = stateManager.get('currentStep');
    const currentStepId = getStepId(currentStep);
    
    // Template step handling with path-aware navigation
    if (currentStepId === 'templates') {
        const selectedTemplate = stateManager.get('selectedTemplate');
        const templateApplied = stateManager.get('templateApplied');
        const navigationPath = stateManager.get('navigationPath');
        
        if (selectedTemplate && templateApplied && navigationPath === 'template') {
            // Template was selected and applied, skip profiles and go directly to configure
            stateManager.addToHistory(currentStep);
            updateStepNumbering(); // Update step visibility
            goToStep(6); // Configure is step 6
            return;
        } else if (navigationPath === 'custom') {
            // User chose "Build Custom", go to profiles step
            stateManager.addToHistory(currentStep);
            updateStepNumbering(); // Update step visibility
            goToStep(5); // Profiles is step 5
            return;
        }
        // If no clear path is set, user must make a selection
        return;
    }
    
    // Custom profiles step handling
    if (currentStepId === 'profiles') {
        const selectedProfiles = stateManager.get('selectedProfiles');
        if (selectedProfiles && selectedProfiles.length > 0) {
            stateManager.setNavigationPath('custom');
            stateManager.addToHistory(currentStep);
            goToStep(6); // Configuration
            return;
        }
        // If no profiles selected, user must select profiles
        return;
    }
    
    // Validate checklist before leaving checklist step
    if (currentStepId === 'checklist') {
        try {
            const systemCheckResults = stateManager.get('systemCheckResults');
            
            if (!systemCheckResults) {
                showNotification('Please run system check first', 'warning');
                return;
            }
            
            // Check if Docker is installed
            if (!systemCheckResults.docker?.installed) {
                showNotification(
                    'Docker is required but not installed. Please install Docker first.',
                    'error',
                    5000
                );
                return;
            }
            
            // Check if Docker Compose is installed
            if (!systemCheckResults.dockerCompose?.installed) {
                showNotification(
                    'Docker Compose is required but not installed. Please install Docker Compose first.',
                    'error',
                    5000
                );
                return;
            }
            
            // Warn if resources are insufficient
            if (!systemCheckResults.resources?.memory?.meetsMinimum || 
                !systemCheckResults.resources?.cpu?.meetsMinimum) {
                const proceed = confirm(
                    'Your system resources are below recommended levels. ' +
                    'Installation may be slow or fail. Continue anyway?'
                );
                if (!proceed) return;
            }
            
            console.log('CHECKLIST: Validation passed, proceeding to next step');
        } catch (error) {
            console.error('Failed to validate checklist:', error);
            showNotification('Failed to validate system check results', 'error');
            return;
        }
    }
    
    // Validate configuration before leaving configure step
    if (currentStepId === 'configure') {
        try {
            // Validate state consistency before proceeding
            const stateValidation = stateManager.validateStateConsistency();
            if (!stateValidation.valid) {
                console.error('State consistency validation failed:', stateValidation.errors);
                showNotification('Configuration state is inconsistent. Please review your selections.', 'error');
                return;
            }
            
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
 * Navigate to previous step with intelligent cleanup
 */
export function previousStep() {
    const currentStep = stateManager.get('currentStep');
    const currentStepId = getStepId(currentStep);
    const wizardMode = stateManager.get('wizardMode');
    
    console.log(`[NAVIGATION] Going back from step ${currentStep} (${currentStepId})`);
    console.log(`[NAVIGATION] Wizard mode: ${wizardMode}`);
    
    // CLEANUP: Handle reconfiguration mode navigation
    if (wizardMode === 'reconfigure' && currentStepId === 'profiles') {
        console.log('[NAVIGATION] Cleaning up reconfiguration UI elements before going back');
        
        // Hide custom setup if it's visible
        if (window.customSetup && typeof window.customSetup.hide === 'function') {
            window.customSetup.hide();
            console.log('[NAVIGATION] Custom setup hidden');
        }
        
        // Hide reconfiguration navigation (but don't destroy it)
        const reconfigNav = document.getElementById('reconfiguration-nav');
        if (reconfigNav) {
            reconfigNav.style.display = 'none';
            console.log('[NAVIGATION] Reconfiguration nav hidden');
        }
        
        // Show default profile grid again
        const defaultGrid = document.getElementById('default-profile-grid');
        if (defaultGrid) {
            defaultGrid.style.display = 'grid';
            console.log('[NAVIGATION] Default profile grid shown');
        }
    }
    
    // Smart back navigation from configuration
    if (currentStepId === 'configure') {
        const navigationPath = stateManager.get('navigationPath');
        
        console.log(`[NAVIGATION] Going back from configure, path: ${navigationPath}`);
        
        if (navigationPath === 'template') {
            goToStep(4); // Back to templates
        } else if (navigationPath === 'custom') {
            goToStep(5); // Back to profiles
        } else {
            // Fallback to templates if path is unclear
            console.warn('[NAVIGATION] Navigation path unclear, defaulting to templates');
            goToStep(4);
        }
        return;
    }
    
    // Back from profiles to templates
    if (currentStepId === 'profiles') {
        console.log('[NAVIGATION] Going back to templates from profiles');
        goToStep(4); // Back to templates
        return;
    }
    
    // Default back navigation using history
    const history = stateManager.get('navigationHistory') || [];
    if (history.length > 0) {
        const lastStep = history.pop();
        stateManager.set('navigationHistory', history);
        console.log(`[NAVIGATION] Using history, going to step ${lastStep}`);
        goToStep(lastStep);
    } else if (currentStep > 1) {
        console.log(`[NAVIGATION] No history, going to previous step`);
        goToStep(currentStep - 1);
    } else {
        console.log('[NAVIGATION] Already at first step, cannot go back');
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
    const currentStepId = getStepId(currentStep);
    const targetStepId = getStepId(stepNumber);
    
    console.log(`=== NAVIGATION: Going from step ${currentStep} (${currentStepId}) to step ${stepNumber} (${targetStepId}) ===`);
    
    // CLEANUP: Leaving profiles step - hide custom setup
    if (currentStepId === 'profiles' && targetStepId !== 'profiles') {
        console.log('[NAVIGATION] Leaving profiles step, hiding custom setup');
        
        if (window.customSetup && typeof window.customSetup.hide === 'function') {
            window.customSetup.hide();
        }
    }
    
    // Hide ALL steps first
    const allSteps = document.querySelectorAll('.wizard-step');
    console.log(`NAVIGATION: Found ${allSteps.length} wizard steps`);
    
    allSteps.forEach((step, index) => {
        const wasActive = step.classList.contains('active');
        step.classList.remove('active');
        if (wasActive) {
            console.log(`NAVIGATION: Deactivated step: ${step.id}`);
        }
    });
    
    // Show new step
    const stepId = getStepId(stepNumber);
    const newStepEl = document.querySelector(`#step-${stepId}`);
    if (newStepEl) {
        newStepEl.classList.add('active');
        console.log(`NAVIGATION: Activated step: ${newStepEl.id}`);
    } else {
        console.error(`Step element not found: #step-${stepId}`);
    }
    
    // Verify only one step is active
    const activeSteps = document.querySelectorAll('.wizard-step.active');
    console.log(`NAVIGATION: Active steps after navigation: ${activeSteps.length}`);
    if (activeSteps.length > 1) {
        console.error('NAVIGATION: Multiple steps are active!', Array.from(activeSteps).map(s => s.id));
    }
    
    // Update state
    stateManager.set('currentStep', stepNumber);
    
    // Update step numbering based on navigation path
    updateStepNumbering();
    
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
        case 'templates':
            // Initialize template selection
            initializeTemplateSelection();
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
 * Initialize template selection
 */
async function initializeTemplateSelection() {
    try {
        // Dynamically import template selection module
        const { default: TemplateSelection } = await import('./template-selection.js');
        
        // Initialize template selection if not already done
        if (!window.templateSelection) {
            window.templateSelection = new TemplateSelection();
        }
        
        await window.templateSelection.initialize();
    } catch (error) {
        console.error('Failed to initialize template selection:', error);
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
    
    // Initialize step numbering with template-first approach
    updateStepNumbering();
    
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

/**
 * Exit reconfiguration mode with full cleanup
 */
export function exitReconfigurationMode() {
    console.log('[NAVIGATION] Exiting reconfiguration mode');
    
    // Hide custom setup
    if (window.customSetup && typeof window.customSetup.hide === 'function') {
        window.customSetup.hide();
    }
    
    // Hide reconfiguration navigation
    const reconfigNav = document.getElementById('reconfiguration-nav');
    if (reconfigNav) {
        reconfigNav.style.display = 'none';
    }
    
    // RESET INITIALIZATION FLAG
    if (window.reconfigurationNavigation && 
        typeof window.reconfigurationNavigation.reset === 'function') {
        window.reconfigurationNavigation.reset();
        console.log('[NAVIGATION] Reconfiguration navigation reset');
    }
    
    // Reset wizard mode
    stateManager.set('wizardMode', 'normal');
    stateManager.set('reconfigurationFlow', null);
    
    // Show regular wizard progress
    const wizardProgress = document.querySelector('.wizard-progress');
    if (wizardProgress) {
        wizardProgress.style.display = 'block';
    }
    
    // Navigate to appropriate step
    const currentInstallState = stateManager.get('installationComplete');
    if (currentInstallState) {
        // Go to complete step
        goToStep(9); // Complete is step 9
    } else {
        // Go to beginning
        goToStep(1);
    }
    
    console.log('[NAVIGATION] Reconfiguration mode exited');
}

// Make exitReconfigurationMode globally available for HTML onclick handlers
window.exitReconfigurationMode = exitReconfigurationMode;
