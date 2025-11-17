/**
 * Kaspa All-in-One Installation Wizard
 * JavaScript functionality with Backend API Integration
 */

// API Configuration
const API_BASE = window.location.origin + '/api';
let socket = null;

// Wizard state
let currentStep = 1;
const totalSteps = 7;
let wizardState = {
    systemCheck: {},
    selectedProfiles: [],
    configuration: {},
    installationProgress: {},
    profileData: {}
};

// API Client
const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },
    
    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || response.statusText);
        }
        return response.json();
    }
};

// Initialize wizard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Kaspa Installation Wizard initialized');
    updateProgressIndicator();
    initializeWebSocket();
    loadProgress();
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
    
    try {
        // Call backend API for system check
        const result = await api.get('/system-check');
        
        // Update UI with results
        const checkItems = document.querySelectorAll('.check-item');
        const checks = [
            { key: 'docker', element: checkItems[0], name: 'Docker Installation' },
            { key: 'dockerCompose', element: checkItems[1], name: 'Docker Compose' },
            { key: 'resources', element: checkItems[2], name: 'System Resources' },
            { key: 'ports', element: checkItems[3], name: 'Port Availability' }
        ];
        
        for (const check of checks) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const checkData = result[check.key];
            let passed = false;
            let message = '';
            
            if (check.key === 'docker') {
                passed = checkData.installed;
                message = checkData.message;
            } else if (check.key === 'dockerCompose') {
                passed = checkData.installed;
                message = checkData.message;
            } else if (check.key === 'resources') {
                passed = checkData.memory.meetsMinimum && checkData.cpu.meetsMinimum;
                message = `CPU: ${checkData.cpu.count} cores, RAM: ${checkData.memory.totalGB} GB`;
                if (checkData.disk) {
                    message += `, Disk: ${checkData.disk.availableGB} GB available`;
                }
            } else if (check.key === 'ports') {
                const portResults = Object.values(checkData);
                passed = portResults.every(p => p.available);
                const unavailablePorts = Object.entries(checkData)
                    .filter(([_, p]) => !p.available)
                    .map(([port, _]) => port);
                message = passed ? 
                    'All required ports are available' : 
                    `Ports in use: ${unavailablePorts.join(', ')}`;
            }
            
            check.element.classList.remove('checking');
            check.element.classList.add(passed ? 'pass' : 'fail');
            
            const icon = check.element.querySelector('.check-icon');
            icon.innerHTML = passed ? '✓' : '✗';
            
            const messageEl = check.element.querySelector('.check-message');
            messageEl.textContent = message;
            
            const status = check.element.querySelector('.check-status');
            status.textContent = passed ? 'Pass' : 'Fail';
            
            wizardState.systemCheck[check.key] = { passed, data: checkData };
        }
        
        // Store full system check result
        wizardState.systemCheck.fullResult = result;
        
        // Enable continue button if critical checks pass
        const canProceed = result.summary.canProceed;
        const continueBtn = document.querySelector('#step-system-check .btn-primary');
        continueBtn.disabled = !canProceed;
        
        if (!canProceed) {
            showNotification('System requirements not met. Please install Docker and Docker Compose.', 'error');
        } else if (result.summary.status === 'warning') {
            showNotification('System checks passed with warnings. You may proceed but performance may be affected.', 'warning');
        }
        
    } catch (error) {
        console.error('System check failed:', error);
        showNotification('Failed to run system check: ' + error.message, 'error');
        
        // Disable continue button on error
        const continueBtn = document.querySelector('#step-system-check .btn-primary');
        continueBtn.disabled = true;
    }
}

// Profile selection
async function loadProfiles() {
    console.log('Loading profiles...');
    
    try {
        // Load profile data from backend
        const profiles = await api.get('/profiles');
        wizardState.profileData = profiles;
        
        // Add click handlers to profile cards
        document.querySelectorAll('.profile-card').forEach(card => {
            // Remove any existing listeners
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            newCard.addEventListener('click', async () => {
                newCard.classList.toggle('selected');
                const profileId = newCard.dataset.profile;
                
                if (newCard.classList.contains('selected')) {
                    if (!wizardState.selectedProfiles.includes(profileId)) {
                        wizardState.selectedProfiles.push(profileId);
                    }
                } else {
                    wizardState.selectedProfiles = wizardState.selectedProfiles.filter(p => p !== profileId);
                }
                
                console.log('Selected profiles:', wizardState.selectedProfiles);
                
                // Validate selection
                if (wizardState.selectedProfiles.length > 0) {
                    try {
                        const validation = await api.post('/profiles/validate', {
                            profiles: wizardState.selectedProfiles
                        });
                        
                        if (!validation.valid) {
                            showNotification('Profile selection has issues: ' + validation.errors.map(e => e.message).join(', '), 'warning');
                        } else if (validation.warnings && validation.warnings.length > 0) {
                            showNotification(validation.warnings[0].message, 'info');
                        }
                        
                        // Store validation result
                        wizardState.profileValidation = validation;
                    } catch (error) {
                        console.error('Profile validation failed:', error);
                    }
                }
                
                saveProgress();
            });
        });
        
        // Restore previous selections
        if (wizardState.selectedProfiles.length > 0) {
            wizardState.selectedProfiles.forEach(profileId => {
                const card = document.querySelector(`.profile-card[data-profile="${profileId}"]`);
                if (card) {
                    card.classList.add('selected');
                }
            });
        }
        
    } catch (error) {
        console.error('Failed to load profiles:', error);
        showNotification('Failed to load profile data', 'error');
    }
}

// Configuration
async function loadConfiguration() {
    console.log('Loading configuration...');
    
    try {
        // Load default configuration for selected profiles
        const defaultConfig = await api.post('/config/default', {
            profiles: wizardState.selectedProfiles
        });
        
        // Merge with any existing configuration
        wizardState.configuration = {
            ...defaultConfig.config,
            ...wizardState.configuration
        };
        
        // Populate form fields
        if (wizardState.configuration.EXTERNAL_IP) {
            const externalIpInput = document.getElementById('external-ip');
            if (externalIpInput) {
                externalIpInput.value = wizardState.configuration.EXTERNAL_IP;
            }
        }
        
        if (wizardState.configuration.PUBLIC_NODE !== undefined) {
            const publicNodeCheckbox = document.getElementById('public-node');
            if (publicNodeCheckbox) {
                publicNodeCheckbox.checked = wizardState.configuration.PUBLIC_NODE === 'true';
            }
        }
        
        // Generate secure password if not exists
        if (!wizardState.configuration.POSTGRES_PASSWORD) {
            const passwordData = await api.get('/config/password?length=32');
            wizardState.configuration.POSTGRES_PASSWORD = passwordData.password;
            
            const dbPasswordInput = document.getElementById('db-password');
            if (dbPasswordInput) {
                dbPasswordInput.value = passwordData.password;
            }
        }
        
        // Add event listener for advanced mode toggle
        const advancedCheckbox = document.getElementById('advanced-mode');
        const advancedOptions = document.getElementById('advanced-options');
        
        if (advancedCheckbox && advancedOptions) {
            advancedCheckbox.addEventListener('change', (e) => {
                advancedOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }
        
        // Add change listeners to save configuration
        const configInputs = ['external-ip', 'public-node', 'db-password', 'custom-env'];
        configInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    saveConfigurationFromForm();
                });
            }
        });
        
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showNotification('Failed to load configuration', 'error');
    }
}

function saveConfigurationFromForm() {
    const externalIp = document.getElementById('external-ip')?.value;
    const publicNode = document.getElementById('public-node')?.checked;
    const dbPassword = document.getElementById('db-password')?.value;
    const customEnv = document.getElementById('custom-env')?.value;
    
    wizardState.configuration = {
        ...wizardState.configuration,
        EXTERNAL_IP: externalIp || 'auto',
        PUBLIC_NODE: publicNode ? 'true' : 'false',
        POSTGRES_PASSWORD: dbPassword || wizardState.configuration.POSTGRES_PASSWORD
    };
    
    if (customEnv) {
        // Parse custom environment variables
        const lines = customEnv.split('\n');
        lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                wizardState.configuration[key.trim()] = valueParts.join('=').trim();
            }
        });
    }
    
    saveProgress();
}

// Review
async function showReview() {
    console.log('Showing review...');
    
    try {
        // Get profile validation with resource requirements
        const validation = await api.post('/profiles/validate', {
            profiles: wizardState.selectedProfiles
        });
        
        // Update review with selected profiles
        const profileNames = wizardState.selectedProfiles
            .map(id => {
                const profile = wizardState.profileData.find(p => p.id === id);
                return profile ? profile.name : id;
            })
            .join(', ');
        
        const reviewProfiles = document.getElementById('review-profiles');
        if (reviewProfiles) {
            reviewProfiles.textContent = profileNames || 'None selected';
        }
        
        // Count total services
        let totalServices = 0;
        if (validation.resolvedProfiles) {
            validation.resolvedProfiles.forEach(profileId => {
                const profile = wizardState.profileData.find(p => p.id === profileId);
                if (profile) {
                    totalServices += profile.services.length;
                }
            });
        }
        
        const reviewServiceCount = document.getElementById('review-service-count');
        if (reviewServiceCount) {
            reviewServiceCount.textContent = `${totalServices} services`;
        }
        
        // Update resource requirements
        if (validation.requirements) {
            const reviewCpu = document.getElementById('review-cpu');
            if (reviewCpu) {
                reviewCpu.textContent = `${validation.requirements.minCpu} cores (${validation.requirements.recommendedCpu} recommended)`;
            }
            
            const reviewRam = document.getElementById('review-ram');
            if (reviewRam) {
                reviewRam.textContent = `${validation.requirements.minMemory} GB (${validation.requirements.recommendedMemory} GB recommended)`;
            }
            
            const reviewDisk = document.getElementById('review-disk');
            if (reviewDisk) {
                reviewDisk.textContent = `${validation.requirements.minDisk} GB (${validation.requirements.recommendedDisk} GB recommended)`;
            }
        }
        
        // Update network configuration review
        const reviewExternalIp = document.getElementById('review-external-ip');
        if (reviewExternalIp) {
            reviewExternalIp.textContent = wizardState.configuration.EXTERNAL_IP || 'Auto-detect';
        }
        
        const reviewPublicNode = document.getElementById('review-public-node');
        if (reviewPublicNode) {
            reviewPublicNode.textContent = wizardState.configuration.PUBLIC_NODE === 'true' ? 'Enabled' : 'Disabled';
        }
        
    } catch (error) {
        console.error('Failed to load review data:', error);
        showNotification('Failed to load review data', 'error');
    }
}

// WebSocket initialization
function initializeWebSocket() {
    try {
        socket = io(window.location.origin);
        
        socket.on('connect', () => {
            console.log('WebSocket connected');
        });
        
        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
        
        socket.on('install:progress', (data) => {
            handleInstallProgress(data);
        });
        
        socket.on('install:complete', (data) => {
            handleInstallComplete(data);
        });
        
        socket.on('install:error', (data) => {
            handleInstallError(data);
        });
        
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Installation
async function startInstallation() {
    console.log('Starting installation...');
    
    try {
        // Disable cancel button during installation
        const cancelBtn = document.getElementById('cancel-install-btn');
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }
        
        // Clear previous logs
        const logsText = document.getElementById('install-logs-text');
        if (logsText) {
            logsText.textContent = 'Starting installation...\n';
        }
        
        // Validate configuration before starting
        const configValidation = await api.post('/config/validate', wizardState.configuration);
        if (!configValidation.valid) {
            showNotification('Configuration validation failed: ' + configValidation.errors.join(', '), 'error');
            if (cancelBtn) cancelBtn.disabled = false;
            return;
        }
        
        // Start installation via WebSocket
        if (socket && socket.connected) {
            socket.emit('install:start', {
                config: wizardState.configuration,
                profiles: wizardState.selectedProfiles
            });
        } else {
            throw new Error('WebSocket not connected');
        }
        
    } catch (error) {
        console.error('Installation failed:', error);
        showNotification('Failed to start installation: ' + error.message, 'error');
        
        const cancelBtn = document.getElementById('cancel-install-btn');
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

function handleInstallProgress(data) {
    const { stage, message, progress, details } = data;
    
    console.log('Install progress:', stage, progress + '%', message);
    
    // Update progress bar
    updateInstallProgress(progress, message);
    
    // Update step status
    const stageMap = {
        'init': 'env',
        'config': 'env',
        'pull': 'pull',
        'build': 'pull',
        'deploy': 'start',
        'validate': 'health'
    };
    
    const stepId = stageMap[stage];
    if (stepId) {
        if (progress >= 100 || (stage === 'validate' && progress >= 95)) {
            updateInstallStep(stepId, 'completed');
        } else {
            updateInstallStep(stepId, 'active');
        }
    }
    
    // Append to logs
    const logsText = document.getElementById('install-logs-text');
    if (logsText && message) {
        logsText.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
        logsText.scrollTop = logsText.scrollHeight;
    }
}

function handleInstallComplete(data) {
    console.log('Installation complete:', data);
    
    updateInstallProgress(100, 'Installation complete!');
    
    // Mark all steps as completed
    ['env', 'pull', 'start', 'health'].forEach(step => {
        updateInstallStep(step, 'completed');
    });
    
    // Store validation results
    wizardState.installationResult = data;
    
    showNotification('Installation completed successfully!', 'success');
    
    // Move to completion step after a short delay
    setTimeout(() => {
        nextStep();
        populateCompletionScreen(data);
    }, 2000);
}

function handleInstallError(data) {
    console.error('Installation error:', data);
    
    const { stage, message, error } = data;
    
    // Update UI to show error
    const stageMap = {
        'config': 'env',
        'pull': 'pull',
        'build': 'pull',
        'deploy': 'start',
        'validate': 'health'
    };
    
    const stepId = stageMap[stage];
    if (stepId) {
        updateInstallStep(stepId, 'failed');
    }
    
    showNotification(`Installation failed: ${message}`, 'error');
    
    // Append error to logs
    const logsText = document.getElementById('install-logs-text');
    if (logsText) {
        logsText.textContent += `\n[ERROR] ${message}\n`;
        if (error) {
            logsText.textContent += `Details: ${error}\n`;
        }
        logsText.scrollTop = logsText.scrollHeight;
    }
    
    // Re-enable cancel button
    const cancelBtn = document.getElementById('cancel-install-btn');
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Go Back';
        cancelBtn.onclick = () => goToStep(4); // Go back to configuration
    }
}

function updateInstallProgress(percentage, message) {
    const progressBar = document.getElementById('install-progress-bar');
    const progressPercentage = document.getElementById('install-progress-percentage');
    const statusTitle = document.getElementById('install-status-title');
    const statusMessage = document.getElementById('install-status-message');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
    
    if (statusTitle) {
        statusTitle.textContent = message;
    }
    
    if (statusMessage) {
        statusMessage.textContent = `Step ${Math.ceil(percentage / 25)} of 4`;
    }
}

function updateInstallStep(stepId, status) {
    const step = document.querySelector(`.install-step[data-step="${stepId}"]`);
    if (!step) return;
    
    // Remove all status classes
    step.classList.remove('active', 'completed', 'failed');
    
    // Add new status
    step.classList.add(status);
    
    // Update icon
    const icon = step.querySelector('.install-step-icon');
    const statusText = step.querySelector('.install-step-status');
    
    if (status === 'active') {
        icon.innerHTML = '<div class="spinner"></div>';
        statusText.textContent = 'In progress...';
    } else if (status === 'completed') {
        icon.textContent = '✓';
        statusText.textContent = 'Completed';
    } else if (status === 'failed') {
        icon.textContent = '✗';
        statusText.textContent = 'Failed';
    }
}

function cancelInstallation() {
    if (confirm('Are you sure you want to cancel the installation?')) {
        console.log('Installation cancelled');
        goToStep(1);
    }
}

function toggleLogs() {
    const logsContent = document.getElementById('install-logs-content');
    const toggleText = document.getElementById('logs-toggle-text');
    
    if (logsContent && toggleText) {
        const isVisible = logsContent.style.display !== 'none';
        logsContent.style.display = isVisible ? 'none' : 'block';
        toggleText.textContent = isVisible ? 'Show Details' : 'Hide Details';
    }
}

// Completion
function showCompletion() {
    console.log('Installation complete!');
    // Populate with actual service data if available
    if (wizardState.installationResult) {
        populateCompletionScreen(wizardState.installationResult);
    }
}

function populateCompletionScreen(data) {
    if (!data.validation || !data.validation.services) {
        return;
    }
    
    // Update service status list
    const serviceStatusList = document.querySelector('.service-status-list');
    if (serviceStatusList) {
        serviceStatusList.innerHTML = '';
        
        data.validation.services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-status-item';
            
            const statusClass = service.healthy ? 'success' : 'warning';
            const statusIcon = service.healthy ? '✓' : '⚠';
            
            serviceItem.innerHTML = `
                <div class="service-status-icon ${statusClass}">${statusIcon}</div>
                <div class="service-status-content">
                    <h4 class="service-status-name">${service.name}</h4>
                    <p class="service-status-info">${service.status || 'Running'}</p>
                </div>
                ${service.url ? `<a href="${service.url}" target="_blank" class="btn-link">View</a>` : ''}
            `;
            
            serviceStatusList.appendChild(serviceItem);
        });
    }
}

// Configuration utility functions
async function detectExternalIP() {
    console.log('Detecting external IP...');
    showNotification('Detecting external IP address...', 'info');
    
    try {
        // Use external service to detect IP
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        const input = document.getElementById('external-ip');
        if (input && data.ip) {
            input.value = data.ip;
            wizardState.configuration.EXTERNAL_IP = data.ip;
            saveProgress();
            showNotification(`Detected IP: ${data.ip}`, 'success');
        }
    } catch (error) {
        console.error('Failed to detect IP:', error);
        showNotification('Failed to detect external IP. Please enter manually.', 'error');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

async function generatePassword(inputId) {
    try {
        // Use backend API to generate secure password
        const data = await api.get('/config/password?length=32');
        
        const input = document.getElementById(inputId);
        if (input && data.password) {
            input.value = data.password;
            input.type = 'text'; // Show the generated password
            
            // Save to configuration
            if (inputId === 'db-password') {
                wizardState.configuration.POSTGRES_PASSWORD = data.password;
                saveProgress();
            }
            
            showNotification('Secure password generated', 'success');
        }
    } catch (error) {
        console.error('Failed to generate password:', error);
        
        // Fallback to client-side generation
        const length = 32;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        const input = document.getElementById(inputId);
        if (input) {
            input.value = password;
            input.type = 'text';
        }
        
        showNotification('Password generated (fallback method)', 'success');
    }
}

function openDashboard() {
    window.open('http://localhost:3000', '_blank');
}

// Utility functions
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Implement toast notifications
    // For now, just log to console
}

function saveProgress() {
    try {
        localStorage.setItem('kaspa-wizard-state', JSON.stringify({
            currentStep,
            wizardState,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Failed to save progress:', e);
    }
}

function loadProgress() {
    try {
        const saved = localStorage.getItem('kaspa-wizard-state');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Only restore if saved within last 24 hours
            const age = Date.now() - (data.timestamp || 0);
            if (age < 24 * 60 * 60 * 1000) {
                currentStep = data.currentStep;
                wizardState = data.wizardState;
                goToStep(currentStep);
                showNotification('Restored previous session', 'info');
            }
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
}

function clearProgress() {
    try {
        localStorage.removeItem('kaspa-wizard-state');
        console.log('Progress cleared');
    } catch (e) {
        console.error('Failed to clear progress:', e);
    }
}

// Auto-save progress
setInterval(saveProgress, 5000);
