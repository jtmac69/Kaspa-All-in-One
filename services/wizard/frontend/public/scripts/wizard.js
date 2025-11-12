/**
 * Kaspa All-in-One Installation Wizard
 * JavaScript functionality
 */

// Wizard state
let currentStep = 1;
const totalSteps = 7;
let wizardState = {
    systemCheck: {},
    selectedProfiles: [],
    configuration: {},
    installationProgress: {}
};

// Initialize wizard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Kaspa Installation Wizard initialized');
    updateProgressIndicator();
});

// Navigation functions
function nextStep() {
    if (currentStep < totalSteps) {
        // Hide current step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.remove('active');
        
        // Move to next step
        currentStep++;
        
        // Show next step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.add('active');
        
        // Update progress indicator
        updateProgressIndicator();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Handle step-specific logic
        handleStepEntry(currentStep);
    }
}

function previousStep() {
    if (currentStep > 1) {
        // Hide current step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.remove('active');
        
        // Move to previous step
        currentStep--;
        
        // Show previous step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.add('active');
        
        // Update progress indicator
        updateProgressIndicator();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToStep(step) {
    if (step >= 1 && step <= totalSteps) {
        // Hide current step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.remove('active');
        
        // Update current step
        currentStep = step;
        
        // Show target step
        document.querySelector(`#step-${getStepId(currentStep)}`).classList.add('active');
        
        // Update progress indicator
        updateProgressIndicator();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Handle step-specific logic
        handleStepEntry(currentStep);
    }
}

// Get step ID from step number
function getStepId(stepNumber) {
    const stepIds = [
        'welcome',
        'system-check',
        'profiles',
        'configure',
        'review',
        'install',
        'complete'
    ];
    return stepIds[stepNumber - 1];
}

// Update progress indicator
function updateProgressIndicator() {
    const steps = document.querySelectorAll('.progress-step');
    
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        
        // Remove all classes
        step.classList.remove('active', 'completed');
        
        // Add appropriate class
        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
}

// Handle step entry logic
function handleStepEntry(step) {
    switch(step) {
        case 2: // System Check
            runSystemCheck();
            break;
        case 3: // Profiles
            loadProfiles();
            break;
        case 4: // Configure
            loadConfiguration();
            break;
        case 5: // Review
            showReview();
            break;
        case 6: // Install
            startInstallation();
            break;
        case 7: // Complete
            showCompletion();
            break;
    }
}

// System check functionality
async function runSystemCheck() {
    console.log('Running system check...');
    
    const checks = [
        { id: 'docker', name: 'Docker Installation' },
        { id: 'docker-compose', name: 'Docker Compose' },
        { id: 'resources', name: 'System Resources' },
        { id: 'ports', name: 'Port Availability' }
    ];
    
    // Simulate system checks (replace with actual API calls)
    for (let i = 0; i < checks.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const checkItem = document.querySelectorAll('.check-item')[i];
        const passed = Math.random() > 0.2; // 80% pass rate for demo
        
        checkItem.classList.remove('checking');
        checkItem.classList.add(passed ? 'pass' : 'fail');
        
        const icon = checkItem.querySelector('.check-icon');
        icon.innerHTML = passed ? '✓' : '✗';
        
        const message = checkItem.querySelector('.check-message');
        message.textContent = passed ? 
            `${checks[i].name} found and verified` : 
            `${checks[i].name} not found or insufficient`;
        
        const status = checkItem.querySelector('.check-status');
        status.textContent = passed ? 'Pass' : 'Fail';
        
        wizardState.systemCheck[checks[i].id] = passed;
    }
    
    // Enable continue button if all checks pass
    const allPassed = Object.values(wizardState.systemCheck).every(v => v);
    const continueBtn = document.querySelector('#step-system-check .btn-primary');
    continueBtn.disabled = !allPassed;
}

// Profile selection
function loadProfiles() {
    console.log('Loading profiles...');
    // Profile cards are already in HTML
    // Add click handlers
    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const profile = card.dataset.profile;
            
            if (card.classList.contains('selected')) {
                if (!wizardState.selectedProfiles.includes(profile)) {
                    wizardState.selectedProfiles.push(profile);
                }
            } else {
                wizardState.selectedProfiles = wizardState.selectedProfiles.filter(p => p !== profile);
            }
            
            console.log('Selected profiles:', wizardState.selectedProfiles);
        });
    });
}

// Configuration
function loadConfiguration() {
    console.log('Loading configuration...');
    // Configuration form will be loaded here
}

// Review
function showReview() {
    console.log('Showing review...');
    // Show summary of selections
}

// Installation
async function startInstallation() {
    console.log('Starting installation...');
    // Start installation process
}

// Completion
function showCompletion() {
    console.log('Installation complete!');
    // Show completion screen
}

// Utility functions
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Implement toast notifications
}

function saveProgress() {
    localStorage.setItem('kaspa-wizard-state', JSON.stringify({
        currentStep,
        wizardState
    }));
}

function loadProgress() {
    const saved = localStorage.getItem('kaspa-wizard-state');
    if (saved) {
        const data = JSON.parse(saved);
        currentStep = data.currentStep;
        wizardState = data.wizardState;
        goToStep(currentStep);
    }
}

// Auto-save progress
setInterval(saveProgress, 5000);
