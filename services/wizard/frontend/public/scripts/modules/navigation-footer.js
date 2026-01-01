/**
 * Navigation Footer Module
 * Manages the global navigation footer with developer mode and step actions
 */

import { stateManager } from './state-manager.js';

// Steps that should show developer mode
const DEVELOPER_MODE_STEPS = ['profiles', 'configure'];

// Steps that should hide the entire navigation footer
const HIDE_NAVIGATION_STEPS = ['welcome', 'complete'];

/**
 * Update the navigation footer based on current step
 */
export function updateNavigationFooter(stepId) {
    const navFooter = document.getElementById('wizard-navigation-footer');
    const developerModeSection = document.getElementById('global-developer-mode-section');
    const stepActionsContainer = document.getElementById('global-step-actions');
    
    if (!navFooter || !developerModeSection || !stepActionsContainer) {
        console.error('[NAV-FOOTER] Required elements not found');
        return;
    }
    
    // Hide navigation footer on certain steps
    if (HIDE_NAVIGATION_STEPS.includes(stepId)) {
        navFooter.style.display = 'none';
        return;
    }
    
    // Show navigation footer
    navFooter.style.display = 'block';
    
    // Show/hide developer mode section
    if (DEVELOPER_MODE_STEPS.includes(stepId)) {
        developerModeSection.style.display = 'block';
    } else {
        developerModeSection.style.display = 'none';
    }
    
    // Update step actions buttons
    updateStepActions(stepId, stepActionsContainer);
}

/**
 * Update step action buttons based on current step
 */
function updateStepActions(stepId, container) {
    // Clear existing buttons
    container.innerHTML = '';
    
    // Get step-specific navigation buttons
    const buttons = getStepButtons(stepId);
    
    // Create button elements
    buttons.forEach(buttonConfig => {
        const button = document.createElement('button');
        button.className = buttonConfig.className;
        button.onclick = buttonConfig.onclick;
        
        if (buttonConfig.disabled) {
            button.disabled = true;
        }
        
        if (buttonConfig.id) {
            button.id = buttonConfig.id;
        }
        
        button.innerHTML = buttonConfig.html;
        container.appendChild(button);
    });
}

/**
 * Get button configuration for each step
 */
function getStepButtons(stepId) {
    const buttons = [];
    
    // Back button (for most steps)
    if (!['welcome', 'checklist'].includes(stepId)) {
        buttons.push({
            className: 'btn-secondary',
            onclick: () => window.previousStep(),
            html: '<span class="btn-icon">←</span> Back'
        });
    }
    
    // Step-specific continue buttons
    switch (stepId) {
        case 'checklist':
            buttons.push({
                className: 'btn-secondary',
                onclick: () => window.previousStep(),
                html: '<span class="btn-icon">←</span> Back'
            });
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                id: 'checklist-continue',
                html: 'Continue to System Check <span class="btn-icon">→</span>'
            });
            break;
            
        case 'system-check':
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                id: 'system-check-continue',
                disabled: true,
                html: 'Continue <span class="btn-icon">→</span>'
            });
            break;
            
        case 'templates':
            // Templates step has its own navigation
            break;
            
        case 'profiles':
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                html: 'Continue <span class="btn-icon">→</span>'
            });
            break;
            
        case 'configure':
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                html: 'Continue <span class="btn-icon">→</span>'
            });
            break;
            
        case 'review':
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                html: 'Start Installation <span class="btn-icon">→</span>'
            });
            break;
            
        case 'install':
            // Check if installation is complete
            const installationComplete = stateManager?.get('installationComplete');
            
            if (installationComplete) {
                // Installation complete - show completion status and continue button
                buttons.push({
                    className: 'btn-secondary disabled',
                    onclick: () => {}, // No action - just shows status
                    id: 'cancel-install-btn',
                    disabled: true,
                    html: 'Installation Complete'
                });
                buttons.push({
                    className: 'btn-primary',
                    onclick: () => window.nextStep(),
                    id: 'install-continue-btn',
                    html: 'Continue to Complete <span class="btn-icon">→</span>'
                });
            } else {
                // Installation in progress - show cancel button only
                buttons.push({
                    className: 'btn-secondary',
                    onclick: () => window.cancelInstallation(),
                    id: 'cancel-install-btn',
                    html: 'Cancel Installation'
                });
            }
            break;
            
        default:
            buttons.push({
                className: 'btn-primary',
                onclick: () => window.nextStep(),
                html: 'Continue <span class="btn-icon">→</span>'
            });
    }
    
    return buttons;
}

/**
 * Enable or disable a specific step button
 */
export function setStepButtonEnabled(buttonId, enabled, title = '') {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.warn(`[NAV-FOOTER] Button not found: ${buttonId}`);
        return;
    }
    
    button.disabled = !enabled;
    button.title = title;
    
    console.log(`[NAV-FOOTER] Button ${buttonId} ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Initialize navigation footer
 */
export function initNavigationFooter() {
    console.log('[NAV-FOOTER] Initializing navigation footer');
    
    // Listen for step changes
    document.addEventListener('stepEntry', (event) => {
        const { stepId } = event.detail;
        console.log(`[NAV-FOOTER] Step changed to: ${stepId}`);
        updateNavigationFooter(stepId);
    });
    
    // Initialize with current step
    const currentStep = stateManager.get('currentStep');
    const stepIds = ['welcome', 'checklist', 'system-check', 'templates', 'profiles', 'configure', 'review', 'install', 'complete'];
    const currentStepId = stepIds[currentStep - 1];
    updateNavigationFooter(currentStepId);
}
