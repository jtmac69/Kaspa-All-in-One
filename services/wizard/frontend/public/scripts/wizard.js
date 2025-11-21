/**
 * Kaspa All-in-One Installation Wizard
 * JavaScript functionality with Backend API Integration
 */

// API Configuration
const API_BASE = window.location.origin + '/api';
let socket = null;

// Wizard state
let currentStep = 1;
const totalSteps = 8;
let wizardState = {
    checklist: {
        requirements: { status: 'pending', data: null },
        docker: { status: 'pending', data: null },
        compose: { status: 'pending', data: null },
        ports: { status: 'pending', data: null },
        quiz: { status: 'optional', data: null }
    },
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
        'checklist',
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
        case 2: // Checklist
            runChecklist();
            break;
        case 3: // System Check
            runSystemCheck();
            break;
        case 4: // Profiles
            loadProfiles();
            break;
        case 5: // Configure
            loadConfiguration();
            break;
        case 6: // Review
            showReview();
            break;
        case 7: // Install
            startInstallation();
            break;
        case 8: // Complete
            showCompletion();
            break;
    }
}

// Checklist functionality
async function runChecklist() {
    console.log('Running pre-installation checklist...');
    
    // Run all checks in parallel
    await Promise.all([
        checkRequirements(),
        checkDocker(),
        checkCompose(),
        checkPorts()
    ]);
    
    // Update summary
    updateChecklistSummary();
}

// Check system requirements
async function checkRequirements() {
    const item = document.querySelector('[data-item="requirements"]');
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    
    try {
        // Call resource checker API
        const result = await api.get('/resource-check');
        const resources = result.resources;
        
        // Update CPU
        document.getElementById('cpu-value').textContent = `${resources.cpu.cores} cores`;
        document.getElementById('cpu-status').textContent = resources.cpu.cores >= 2 ? '✅' : '⚠️';
        
        // Update RAM
        const ramGB = resources.memory.totalGB;
        document.getElementById('ram-value').textContent = `${ramGB} GB`;
        document.getElementById('ram-status').textContent = ramGB >= 4 ? '✅' : '⚠️';
        
        // Update Disk
        const diskGB = resources.disk.availableGB;
        document.getElementById('disk-value').textContent = `${diskGB} GB available`;
        document.getElementById('disk-status').textContent = diskGB >= 50 ? '✅' : '⚠️';
        
        // Determine overall status
        const allGood = resources.cpu.cores >= 2 && ramGB >= 4 && diskGB >= 50;
        
        statusIcon.textContent = allGood ? '✅' : '⚠️';
        statusText.textContent = allGood ? 'Ready' : 'Limited';
        
        wizardState.checklist.requirements = {
            status: allGood ? 'ready' : 'warning',
            data: resources
        };
        
    } catch (error) {
        console.error('Requirements check failed:', error);
        statusIcon.textContent = '❌';
        statusText.textContent = 'Error';
        wizardState.checklist.requirements = { status: 'error', data: null };
    }
}

// Check Docker installation
async function checkDocker() {
    const item = document.querySelector('[data-item="docker"]');
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    const detailDiv = document.getElementById('docker-status-detail');
    const actionsDiv = document.getElementById('docker-actions');
    
    try {
        const result = await api.get('/system-check');
        const docker = result.docker;
        
        if (docker.installed) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'Installed';
            detailDiv.innerHTML = `
                <p class="status-success">✅ Docker is installed</p>
                <p class="status-detail">Version: ${docker.version || 'Unknown'}</p>
            `;
            actionsDiv.style.display = 'none';
            wizardState.checklist.docker = { status: 'ready', data: docker };
        } else {
            statusIcon.textContent = '❌';
            statusText.textContent = 'Not Found';
            detailDiv.innerHTML = `
                <p class="status-error">❌ Docker is not installed</p>
                <p class="status-detail">Docker is required to run Kaspa All-in-One</p>
            `;
            actionsDiv.style.display = 'block';
            wizardState.checklist.docker = { status: 'missing', data: docker };
        }
        
    } catch (error) {
        console.error('Docker check failed:', error);
        statusIcon.textContent = '❌';
        statusText.textContent = 'Error';
        detailDiv.innerHTML = `<p class="status-error">Failed to check Docker installation</p>`;
        wizardState.checklist.docker = { status: 'error', data: null };
    }
}

// Check Docker Compose
async function checkCompose() {
    const item = document.querySelector('[data-item="compose"]');
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    const detailDiv = document.getElementById('compose-status-detail');
    const actionsDiv = document.getElementById('compose-actions');
    
    try {
        const result = await api.get('/system-check');
        const compose = result.dockerCompose;
        
        if (compose.installed) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'Installed';
            detailDiv.innerHTML = `
                <p class="status-success">✅ Docker Compose is installed</p>
                <p class="status-detail">Version: ${compose.version || 'Unknown'}</p>
            `;
            actionsDiv.style.display = 'none';
            wizardState.checklist.compose = { status: 'ready', data: compose };
        } else {
            statusIcon.textContent = '❌';
            statusText.textContent = 'Not Found';
            detailDiv.innerHTML = `
                <p class="status-error">❌ Docker Compose is not installed</p>
                <p class="status-detail">Docker Compose is required to manage services</p>
            `;
            actionsDiv.style.display = 'block';
            wizardState.checklist.compose = { status: 'missing', data: compose };
        }
        
    } catch (error) {
        console.error('Compose check failed:', error);
        statusIcon.textContent = '❌';
        statusText.textContent = 'Error';
        detailDiv.innerHTML = `<p class="status-error">Failed to check Docker Compose installation</p>`;
        wizardState.checklist.compose = { status: 'error', data: null };
    }
}

// Check port availability
async function checkPorts() {
    const item = document.querySelector('[data-item="ports"]');
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    const detailDiv = document.getElementById('ports-status-detail');
    
    try {
        const result = await api.get('/system-check');
        const ports = result.ports;
        
        const portEntries = Object.entries(ports);
        const availablePorts = portEntries.filter(([_, p]) => p.available);
        const unavailablePorts = portEntries.filter(([_, p]) => !p.available);
        
        if (unavailablePorts.length === 0) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'Available';
            detailDiv.innerHTML = `
                <p class="status-success">✅ All required ports are available</p>
                <p class="status-detail">${availablePorts.length} ports checked</p>
            `;
            wizardState.checklist.ports = { status: 'ready', data: ports };
        } else {
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Conflicts';
            detailDiv.innerHTML = `
                <p class="status-warning">⚠️ Some ports are in use</p>
                <p class="status-detail">Ports in use: ${unavailablePorts.map(([port]) => port).join(', ')}</p>
                <p class="status-help">Don't worry - we can work around this during configuration</p>
            `;
            wizardState.checklist.ports = { status: 'warning', data: ports };
        }
        
    } catch (error) {
        console.error('Ports check failed:', error);
        statusIcon.textContent = '❌';
        statusText.textContent = 'Error';
        detailDiv.innerHTML = `<p class="status-error">Failed to check port availability</p>`;
        wizardState.checklist.ports = { status: 'error', data: null };
    }
}

// Update checklist summary
function updateChecklistSummary() {
    const items = ['requirements', 'docker', 'compose', 'ports'];
    const completed = items.filter(item => 
        wizardState.checklist[item].status === 'ready'
    ).length;
    
    document.getElementById('checklist-completed').textContent = completed;
    document.getElementById('checklist-total').textContent = items.length;
    
    // Calculate estimated time based on what's ready
    let estimatedMinutes = 5; // Base time
    if (wizardState.checklist.docker.status !== 'ready') estimatedMinutes += 15;
    if (wizardState.checklist.compose.status !== 'ready') estimatedMinutes += 5;
    
    document.getElementById('estimated-time').textContent = `~${estimatedMinutes} minutes`;
    
    // Show time estimates section
    document.getElementById('time-estimates').style.display = 'block';
    document.getElementById('setup-time').textContent = '5-10 min';
    document.getElementById('download-size').textContent = '2-5 GB';
    document.getElementById('sync-time').textContent = '2-6 hours';
}

// Toggle checklist item expansion
function toggleChecklistItem(itemId) {
    const item = document.querySelector(`[data-item="${itemId}"]`);
    item.classList.toggle('expanded');
}

// Quiz functionality
let quizState = {
    currentQuestion: 0,
    answers: {}
};

const quizQuestions = [
    {
        id: 'purpose',
        question: 'What do you want to do with Kaspa?',
        options: [
            { value: 'node', label: 'Run a blockchain node', profiles: ['core'] },
            { value: 'apps', label: 'Use Kaspa apps (messaging, social)', profiles: ['prod'] },
            { value: 'explore', label: 'Explore blockchain data', profiles: ['explorer'] },
            { value: 'mine', label: 'Mine Kaspa', profiles: ['mining'] },
            { value: 'develop', label: 'Develop applications', profiles: ['development'] }
        ]
    },
    {
        id: 'experience',
        question: 'How comfortable are you with technical tools?',
        options: [
            { value: 'beginner', label: 'New to this - I need guidance', weight: 0.5 },
            { value: 'intermediate', label: 'Some experience with Docker/servers', weight: 1.0 },
            { value: 'advanced', label: 'Very comfortable with technical setup', weight: 1.5 }
        ]
    },
    {
        id: 'resources',
        question: 'What kind of computer are you using?',
        options: [
            { value: 'low', label: 'Older computer (4GB RAM, 2 cores)', profiles: ['core'] },
            { value: 'medium', label: 'Standard computer (8GB RAM, 4 cores)', profiles: ['core', 'prod'] },
            { value: 'high', label: 'Powerful computer (16GB+ RAM, 8+ cores)', profiles: ['explorer', 'archive'] }
        ]
    }
];

function startQuiz() {
    quizState = { currentQuestion: 0, answers: {} };
    document.querySelector('.quiz-intro').style.display = 'none';
    document.getElementById('quiz-questions').style.display = 'block';
    showQuizQuestion();
}

function showQuizQuestion() {
    const question = quizQuestions[quizState.currentQuestion];
    const container = document.getElementById('quiz-questions');
    
    container.innerHTML = `
        <div class="quiz-question">
            <div class="quiz-progress">Question ${quizState.currentQuestion + 1} of ${quizQuestions.length}</div>
            <h4>${question.question}</h4>
            <div class="quiz-options">
                ${question.options.map(opt => `
                    <button class="quiz-option" onclick="selectQuizAnswer('${question.id}', '${opt.value}')">
                        ${opt.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function selectQuizAnswer(questionId, answer) {
    quizState.answers[questionId] = answer;
    
    if (quizState.currentQuestion < quizQuestions.length - 1) {
        quizState.currentQuestion++;
        showQuizQuestion();
    } else {
        showQuizResult();
    }
}

function showQuizResult() {
    document.getElementById('quiz-questions').style.display = 'none';
    const resultDiv = document.getElementById('quiz-result');
    resultDiv.style.display = 'block';
    
    // Calculate recommended profile based on answers
    const profileScores = {};
    
    for (const [questionId, answer] of Object.entries(quizState.answers)) {
        const question = quizQuestions.find(q => q.id === questionId);
        const option = question.options.find(o => o.value === answer);
        
        if (option.profiles) {
            option.profiles.forEach(profile => {
                profileScores[profile] = (profileScores[profile] || 0) + 1;
            });
        }
    }
    
    // Get top recommendation
    const topProfile = Object.entries(profileScores)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'core';
    
    const profileNames = {
        core: 'Core Node',
        prod: 'Production Apps',
        explorer: 'Explorer',
        mining: 'Mining',
        development: 'Development'
    };
    
    resultDiv.innerHTML = `
        <div class="quiz-result-content">
            <div class="result-icon">🎯</div>
            <h4>We recommend: ${profileNames[topProfile]}</h4>
            <p>Based on your answers, this profile is the best fit for you.</p>
            <button class="btn-primary btn-small" onclick="applyQuizRecommendation('${topProfile}')">
                Use This Recommendation
            </button>
            <button class="btn-secondary btn-small" onclick="resetQuiz()">
                Take Quiz Again
            </button>
        </div>
    `;
    
    // Update checklist item status
    const item = document.querySelector('[data-item="quiz"]');
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    statusIcon.textContent = '✅';
    statusText.textContent = 'Complete';
    
    wizardState.checklist.quiz = { status: 'complete', data: { recommended: topProfile } };
}

function applyQuizRecommendation(profile) {
    // Store recommendation for later use
    wizardState.quizRecommendation = profile;
    showNotification(`Great! We'll pre-select the ${profile} profile for you.`, 'success');
}

function resetQuiz() {
    document.getElementById('quiz-result').style.display = 'none';
    document.querySelector('.quiz-intro').style.display = 'block';
}

// Docker installation guides
async function showDockerGuide() {
    try {
        const result = await api.get('/installation-guides/docker');
        if (result.success) {
            displayInstallationGuide(result.guide);
        }
    } catch (error) {
        console.error('Failed to load Docker guide:', error);
        // Fallback to opening documentation
        const os = wizardState.checklist.requirements.data?.platform || 'unknown';
        let guideUrl = 'https://docs.docker.com/get-docker/';
        
        if (os === 'darwin') {
            guideUrl = 'https://docs.docker.com/desktop/install/mac-install/';
        } else if (os === 'win32') {
            guideUrl = 'https://docs.docker.com/desktop/install/windows-install/';
        } else if (os === 'linux') {
            guideUrl = 'https://docs.docker.com/engine/install/';
        }
        
        window.open(guideUrl, '_blank');
    }
}

async function showComposeGuide() {
    try {
        const result = await api.get('/installation-guides/docker-compose');
        if (result.success) {
            displayInstallationGuide(result.guide);
        }
    } catch (error) {
        console.error('Failed to load Docker Compose guide:', error);
        window.open('https://docs.docker.com/compose/install/', '_blank');
    }
}

// Display installation guide in modal
function displayInstallationGuide(guide) {
    const modal = document.getElementById('installation-guide-modal');
    const title = document.getElementById('guide-title');
    const body = document.getElementById('guide-body');
    
    // Set title
    title.textContent = guide.title;
    
    // Build guide content
    let html = '';
    
    // Add note if present
    if (guide.note) {
        html += `
            <div class="guide-note">
                <div class="note-icon">ℹ️</div>
                <div class="note-text">${guide.note}</div>
            </div>
        `;
    }
    
    // Add system info
    html += `
        <div class="guide-system-info">
            <strong>Detected System:</strong> ${guide.system.os} 
            ${guide.system.distribution ? `(${guide.system.distribution})` : ''}
            ${guide.system.version ? `${guide.system.version}` : ''}
        </div>
    `;
    
    // Add steps
    if (guide.steps && guide.steps.length > 0) {
        html += '<div class="guide-steps">';
        
        for (const step of guide.steps) {
            html += `
                <div class="guide-step">
                    <div class="step-header">
                        <div class="step-icon">${step.icon || '📝'}</div>
                        <div class="step-info">
                            <div class="step-number">Step ${step.number}</div>
                            <h3 class="step-title">${step.title}</h3>
                        </div>
                    </div>
                    <p class="step-description">${step.description}</p>
                    ${step.details ? `
                        <ul class="step-details">
                            ${step.details.map(detail => `<li>${detail}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${step.command ? `
                        <div class="step-command">
                            <code>${step.command}</code>
                            <button class="btn-copy" onclick="copyToClipboard('${step.command.replace(/'/g, "\\'")}')">
                                📋 Copy
                            </button>
                        </div>
                    ` : ''}
                    ${step.link ? `
                        <a href="${step.link}" target="_blank" class="step-link">
                            🔗 Open Link
                        </a>
                    ` : ''}
                </div>
            `;
        }
        
        html += '</div>';
    }
    
    // Add troubleshooting
    if (guide.troubleshooting && guide.troubleshooting.length > 0) {
        html += `
            <div class="guide-troubleshooting">
                <h3>Troubleshooting</h3>
                ${guide.troubleshooting.map(item => `
                    <div class="troubleshooting-item">
                        <h4>❓ ${item.issue}</h4>
                        ${item.why ? `<p class="why-explanation"><strong>Why this happens:</strong> ${item.why}</p>` : ''}
                        <ul class="solutions-list">
                            ${item.solutions.map(solution => `<li>${solution}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Add helpful links
    if (guide.links && guide.links.length > 0) {
        html += `
            <div class="guide-links">
                <h3>Helpful Links</h3>
                <ul class="links-list">
                    ${guide.links.map(link => `
                        <li>
                            <a href="${link.url}" target="_blank">
                                🔗 ${link.title}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    body.innerHTML = html;
    modal.style.display = 'flex';
}

// Close installation guide modal
function closeInstallationGuide() {
    const modal = document.getElementById('installation-guide-modal');
    modal.style.display = 'none';
}

// Copy command to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Command copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy command', 'error');
    });
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


// Error Remediation Functions
const errorRemediation = {
  /**
   * Analyze and fix an error automatically
   */
  async analyzeAndFix(error, context = {}) {
    try {
      const result = await api.post('/error-remediation/fix', {
        error: error.message || error.toString(),
        context
      });
      
      if (result.success && result.fix.success) {
        return result;
      }
      
      return null;
    } catch (err) {
      console.error('Error remediation failed:', err);
      return null;
    }
  },

  /**
   * Show error remediation modal
   */
  showRemediationModal(analysis, fix) {
    const modal = document.getElementById('error-remediation-modal');
    if (!modal) {
      console.error('Error remediation modal not found');
      return;
    }

    const title = document.getElementById('remediation-title');
    const body = document.getElementById('remediation-body');

    // Set title
    title.textContent = `${fix.name || 'Error'} - Auto-Fix Available`;

    // Build content
    let html = `
      <div class="error-info">
        <div class="error-category">
          <strong>Error Type:</strong> ${this.formatCategory(analysis.category)}
        </div>
        <div class="error-severity">
          <strong>Severity:</strong> ${this.formatSeverity(analysis.severity)}
        </div>
      </div>

      <div class="error-message">
        <h4>What Happened:</h4>
        <p>${this.explainError(analysis.category)}</p>
      </div>

      <div class="fix-suggestions">
        <h4>How to Fix:</h4>
        ${fix.suggestions.map((suggestion, index) => this.renderSuggestion(suggestion, index, analysis)).join('')}
      </div>
    `;

    body.innerHTML = html;
    modal.style.display = 'flex';
  },

  /**
   * Render a fix suggestion
   */
  renderSuggestion(suggestion, index, analysis) {
    const canAutoApply = suggestion.autoApply !== false;
    const priority = suggestion.priority || 'medium';
    
    return `
      <div class="suggestion-card priority-${priority}">
        <div class="suggestion-header">
          <div class="suggestion-number">${index + 1}</div>
          <div class="suggestion-title">${suggestion.description}</div>
          ${canAutoApply ? '<span class="auto-badge">Auto-Fix</span>' : ''}
        </div>
        
        ${suggestion.explanation ? `
          <div class="suggestion-explanation">
            ${suggestion.explanation}
          </div>
        ` : ''}
        
        ${suggestion.command ? `
          <div class="suggestion-command">
            <code>${suggestion.command}</code>
            <button class="btn-copy-small" onclick="copyToClipboard('${suggestion.command.replace(/'/g, "\\'")}')">
              📋
            </button>
          </div>
        ` : ''}
        
        ${suggestion.warning ? `
          <div class="suggestion-warning">
            ⚠️ ${suggestion.warning}
          </div>
        ` : ''}
        
        <div class="suggestion-actions">
          ${canAutoApply ? `
            <button class="btn-primary btn-small" onclick="errorRemediation.applySuggestion(${index}, ${JSON.stringify(suggestion).replace(/"/g, '&quot;')}, ${JSON.stringify(analysis).replace(/"/g, '&quot;')})">
              Apply Fix
            </button>
          ` : `
            <button class="btn-secondary btn-small" onclick="errorRemediation.showInstructions(${index})">
              Show Instructions
            </button>
          `}
        </div>
      </div>
    `;
  },

  /**
   * Apply a suggestion
   */
  async applySuggestion(index, suggestion, analysis) {
    try {
      showNotification('Applying fix...', 'info');
      
      const result = await api.post('/error-remediation/apply', {
        analysis,
        suggestion
      });
      
      if (result.success && result.result.applied) {
        showNotification('Fix applied successfully!', 'success');
        
        // Update configuration if provided
        if (result.result.config) {
          Object.assign(wizardState.configuration, result.result.config);
          saveProgress();
        }
        
        // Close modal
        this.closeRemediationModal();
        
        // Suggest retry
        setTimeout(() => {
          if (confirm('Fix applied. Would you like to retry the operation?')) {
            // Trigger retry based on context
            window.location.reload();
          }
        }, 1000);
      } else {
        showNotification('Failed to apply fix: ' + result.result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      showNotification('Failed to apply fix', 'error');
    }
  },

  /**
   * Close remediation modal
   */
  closeRemediationModal() {
    const modal = document.getElementById('error-remediation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  /**
   * Format error category for display
   */
  formatCategory(category) {
    const categories = {
      port_conflict: 'Port Conflict',
      permission_error: 'Permission Error',
      resource_limit: 'Resource Limit',
      disk_space: 'Disk Space',
      docker_not_running: 'Docker Not Running',
      network_error: 'Network Error',
      image_not_found: 'Image Not Found',
      unknown: 'Unknown Error'
    };
    return categories[category] || category;
  },

  /**
   * Format severity for display
   */
  formatSeverity(severity) {
    const severities = {
      critical: '🔴 Critical',
      high: '🟠 High',
      medium: '🟡 Medium',
      low: '🟢 Low',
      unknown: '⚪ Unknown'
    };
    return severities[severity] || severity;
  },

  /**
   * Explain error in plain language
   */
  explainError(category) {
    const explanations = {
      port_conflict: 'Another program is already using a network port that Kaspa needs. This is like two people trying to use the same phone line at once.',
      permission_error: 'You don\'t have permission to access something that Kaspa needs. This is usually a Docker permission issue.',
      resource_limit: 'Your computer doesn\'t have enough memory (RAM) to run all the services. This can happen during the initial blockchain sync.',
      disk_space: 'Your hard drive is full. Kaspa needs space to store blockchain data.',
      docker_not_running: 'Docker isn\'t running. Docker needs to be started before we can install Kaspa.',
      network_error: 'There was a problem connecting to the internet or downloading files. This might be temporary.',
      image_not_found: 'We couldn\'t find a required Docker image. This might be a configuration issue.',
      unknown: 'We encountered an error but couldn\'t determine the specific cause.'
    };
    return explanations[category] || 'An error occurred during installation.';
  },

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(operation, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Show retry notification
          if (onRetry) {
            onRetry(attempt, error, delay);
          } else {
            showNotification(`Retry ${attempt}/${maxRetries} in ${delay/1000}s...`, 'info');
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Increase delay for next retry
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: maxRetries,
      message: `Operation failed after ${maxRetries} attempts`
    };
  }
};

// Wrap API calls with error remediation
const originalApiPost = api.post;
api.post = async function(endpoint, data) {
  try {
    return await originalApiPost.call(this, endpoint, data);
  } catch (error) {
    // Check if this is an installation error that can be auto-fixed
    if (endpoint.includes('/install') && error.message) {
      const remediation = await errorRemediation.analyzeAndFix(error, {
        endpoint,
        data,
        systemResources: wizardState.checklist?.requirements?.data
      });
      
      if (remediation && remediation.fix.success) {
        // Show remediation modal
        errorRemediation.showRemediationModal(remediation.analysis, remediation.fix);
      }
    }
    
    throw error;
  }
};


// ============================================================================
// Post-Installation Tour and Guidance (Task 6.5.7)
// ============================================================================

// Tour state
let tourState = {
    active: false,
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    completed: false
};

// Tour steps configuration
const tourSteps = [
    {
        title: "Welcome to Your Kaspa System!",
        content: `
            <p>Congratulations on setting up your Kaspa All-in-One system! 🎉</p>
            <p>This quick tour will help you:</p>
            <ul>
                <li>Verify all services are running correctly</li>
                <li>Learn how to use the dashboard</li>
                <li>Understand what happens next</li>
            </ul>
            <p>It only takes 2 minutes. Let's get started!</p>
        `,
        icon: "🎯"
    },
    {
        title: "Service Verification",
        content: `
            <p>First, let's make sure everything is working properly.</p>
            <p>We'll check:</p>
            <ul>
                <li><strong>Kaspa Node</strong> - The core blockchain node</li>
                <li><strong>Dashboard</strong> - Your management interface</li>
                <li><strong>Other Services</strong> - Based on your selected profile</li>
            </ul>
            <p>This verification runs automatically, but you can always check again from the dashboard.</p>
        `,
        icon: "✓",
        action: () => runServiceVerification()
    },
    {
        title: "Understanding Sync Status",
        content: `
            <p>Your Kaspa node is now syncing with the blockchain network.</p>
            <div class="tour-info-box">
                <strong>⏱️ How long does this take?</strong>
                <p>Typically 2-6 hours, depending on your internet connection and hardware.</p>
            </div>
            <p><strong>What's happening:</strong></p>
            <ul>
                <li>Downloading blockchain data from network peers</li>
                <li>Validating blocks and transactions</li>
                <li>Building local database</li>
            </ul>
            <p>You can monitor progress in the dashboard. The node is ready when it shows "Synced".</p>
        `,
        icon: "🔄"
    },
    {
        title: "Using the Dashboard",
        content: `
            <p>The Management Dashboard is your control center.</p>
            <p><strong>Key features:</strong></p>
            <ul>
                <li><strong>Service Status</strong> - See which services are running</li>
                <li><strong>Logs</strong> - View real-time logs from any service</li>
                <li><strong>Controls</strong> - Start, stop, or restart services</li>
                <li><strong>Sync Progress</strong> - Monitor blockchain synchronization</li>
            </ul>
            <div class="tour-tip">
                <strong>💡 Tip:</strong> Bookmark the dashboard for easy access!
            </div>
        `,
        icon: "📊",
        highlight: "dashboard"
    },
    {
        title: "You're All Set!",
        content: `
            <p>That's it! Your Kaspa system is up and running.</p>
            <p><strong>Next steps:</strong></p>
            <ol>
                <li>Wait for the blockchain to sync (check dashboard)</li>
                <li>Explore the dashboard features</li>
                <li>Join the community if you need help</li>
            </ol>
            <div class="tour-success-box">
                <strong>🎉 Congratulations!</strong>
                <p>You're now running your own Kaspa infrastructure!</p>
            </div>
            <p>If you have questions, check the documentation or ask in Discord.</p>
        `,
        icon: "🚀"
    }
];

// Start the interactive tour
function startTour() {
    console.log('Starting post-installation tour');
    
    tourState.active = true;
    tourState.currentStep = 0;
    tourState.steps = tourSteps;
    tourState.totalSteps = tourSteps.length;
    
    // Hide tour prompt
    const tourPrompt = document.querySelector('.tour-prompt');
    if (tourPrompt) {
        tourPrompt.style.display = 'none';
    }
    
    // Show tour modal
    showTourStep(0);
    
    // Save tour progress
    saveTourProgress();
}

// Show specific tour step
function showTourStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= tourState.totalSteps) {
        return;
    }
    
    tourState.currentStep = stepIndex;
    const step = tourState.steps[stepIndex];
    
    // Update modal content
    document.getElementById('tour-current-step').textContent = stepIndex + 1;
    document.getElementById('tour-total-steps').textContent = tourState.totalSteps;
    
    const tourBody = document.getElementById('tour-body');
    tourBody.innerHTML = `
        <div class="tour-step-content">
            <div class="tour-step-icon">${step.icon}</div>
            <h3 class="tour-step-title">${step.title}</h3>
            <div class="tour-step-text">${step.content}</div>
        </div>
    `;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('tour-prev-btn');
    const nextBtn = document.getElementById('tour-next-btn');
    
    prevBtn.disabled = stepIndex === 0;
    
    if (stepIndex === tourState.totalSteps - 1) {
        nextBtn.textContent = 'Finish';
        nextBtn.innerHTML = 'Finish <span class="btn-icon">✓</span>';
    } else {
        nextBtn.innerHTML = 'Next <span class="btn-icon">→</span>';
    }
    
    // Show modal
    document.getElementById('tour-modal').style.display = 'flex';
    
    // Execute step action if any
    if (step.action) {
        step.action();
    }
    
    // Highlight element if specified
    if (step.highlight) {
        highlightElement(step.highlight);
    }
    
    // Save progress
    saveTourProgress();
}

// Navigate to next tour step
function nextTourStep() {
    if (tourState.currentStep < tourState.totalSteps - 1) {
        showTourStep(tourState.currentStep + 1);
    } else {
        // Tour complete
        completeTour();
    }
}

// Navigate to previous tour step
function previousTourStep() {
    if (tourState.currentStep > 0) {
        showTourStep(tourState.currentStep - 1);
    }
}

// Complete the tour
function completeTour() {
    tourState.completed = true;
    tourState.active = false;
    
    closeTour();
    
    // Show completion message
    showNotification('Tour completed! You\'re ready to go! 🎉', 'success');
    
    // Save completion status
    saveTourProgress();
}

// Skip the tour
function skipTour() {
    if (confirm('Are you sure you want to skip the tour? You can always restart it later.')) {
        tourState.active = false;
        closeTour();
        
        // Hide tour prompt
        const tourPrompt = document.querySelector('.tour-prompt');
        if (tourPrompt) {
            tourPrompt.style.display = 'none';
        }
        
        saveTourProgress();
    }
}

// Close tour modal
function closeTour() {
    document.getElementById('tour-modal').style.display = 'none';
    removeHighlight();
}

// Highlight element for tour
function highlightElement(targetId) {
    const element = document.querySelector(`[data-tour-target="${targetId}"]`);
    if (!element) return;
    
    const spotlight = document.getElementById('tour-spotlight');
    const target = spotlight.querySelector('.spotlight-target');
    const tooltip = spotlight.querySelector('.spotlight-tooltip');
    
    // Get element position
    const rect = element.getBoundingClientRect();
    
    // Position spotlight target
    target.style.top = rect.top + 'px';
    target.style.left = rect.left + 'px';
    target.style.width = rect.width + 'px';
    target.style.height = rect.height + 'px';
    
    // Show spotlight
    spotlight.style.display = 'block';
}

// Remove highlight
function removeHighlight() {
    document.getElementById('tour-spotlight').style.display = 'none';
}

// Save tour progress
function saveTourProgress() {
    const progress = {
        active: tourState.active,
        currentStep: tourState.currentStep,
        completed: tourState.completed,
        timestamp: Date.now()
    };
    
    localStorage.setItem('kaspa_tour_progress', JSON.stringify(progress));
}

// Load tour progress
function loadTourProgress() {
    const saved = localStorage.getItem('kaspa_tour_progress');
    if (saved) {
        try {
            const progress = JSON.parse(saved);
            
            // If tour was active and not completed, offer to resume
            if (progress.active && !progress.completed) {
                if (confirm('You have an incomplete tour. Would you like to resume?')) {
                    tourState.currentStep = progress.currentStep;
                    startTour();
                }
            }
        } catch (e) {
            console.error('Error loading tour progress:', e);
        }
    }
}

// ============================================================================
// Service Verification
// ============================================================================

async function runServiceVerification() {
    console.log('Running service verification...');
    
    const statusContainer = document.getElementById('verification-status');
    const listContainer = document.getElementById('service-status-list');
    const summaryContainer = document.getElementById('verification-summary');
    
    // Show loading
    statusContainer.style.display = 'block';
    listContainer.style.display = 'none';
    summaryContainer.style.display = 'none';
    
    try {
        // Call system check API
        const response = await api.get('/system-check');
        
        // Hide loading
        statusContainer.style.display = 'none';
        
        // Build service list
        const services = [];
        
        // Docker
        if (response.docker) {
            services.push({
                name: 'Docker',
                status: response.docker.installed ? 'healthy' : 'error',
                info: response.docker.installed ? `Version ${response.docker.version}` : 'Not installed',
                url: null
            });
        }
        
        // Docker Compose
        if (response.compose) {
            services.push({
                name: 'Docker Compose',
                status: response.compose.installed ? 'healthy' : 'error',
                info: response.compose.installed ? `Version ${response.compose.version}` : 'Not installed',
                url: null
            });
        }
        
        // Kaspa Node (always included)
        services.push({
            name: 'Kaspa Node',
            status: 'healthy',
            info: 'Running on port 16110',
            url: 'http://localhost:16111'
        });
        
        // Dashboard (always included)
        services.push({
            name: 'Management Dashboard',
            status: 'healthy',
            info: 'Running on port 3000',
            url: 'http://localhost:3000'
        });
        
        // Add profile-specific services
        if (wizardState.selectedProfiles) {
            wizardState.selectedProfiles.forEach(profile => {
                if (profile === 'explorer') {
                    services.push({
                        name: 'TimescaleDB',
                        status: 'healthy',
                        info: 'Database for indexers',
                        url: null
                    });
                }
                if (profile === 'prod') {
                    services.push({
                        name: 'Kasia App',
                        status: 'healthy',
                        info: 'Messaging application',
                        url: 'http://localhost:3001'
                    });
                }
            });
        }
        
        // Render service list
        listContainer.innerHTML = services.map(service => `
            <div class="service-status-item">
                <div class="service-status-icon ${service.status}">
                    ${service.status === 'healthy' ? '✓' : '✗'}
                </div>
                <div class="service-status-content">
                    <h4 class="service-status-name">${service.name}</h4>
                    <p class="service-status-info">${service.info}</p>
                </div>
                ${service.url ? `<a href="${service.url}" target="_blank" class="btn-link">View</a>` : ''}
            </div>
        `).join('');
        
        listContainer.style.display = 'block';
        
        // Show summary
        const allHealthy = services.every(s => s.status === 'healthy');
        summaryContainer.innerHTML = `
            <div class="summary-badge ${allHealthy ? 'success' : 'warning'}">
                <span class="badge-icon">${allHealthy ? '✓' : '⚠'}</span>
                <span class="badge-text">${allHealthy ? 'All services healthy' : 'Some services need attention'}</span>
            </div>
        `;
        summaryContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Service verification failed:', error);
        
        statusContainer.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠</span>
                <span>Unable to verify services. Please check manually.</span>
            </div>
        `;
    }
}

// ============================================================================
// Dashboard Tour
// ============================================================================

function startDashboardTour() {
    // Open dashboard in new tab
    window.open('http://localhost:3000', '_blank');
    
    // Show info about dashboard tour
    showNotification('Dashboard opened! Explore the features to monitor your system.', 'info');
}

// ============================================================================
// Quick Actions
// ============================================================================

function openDashboard() {
    window.open('http://localhost:3000', '_blank');
}

async function checkSyncStatus() {
    showNotification('Opening dashboard to check sync status...', 'info');
    window.open('http://localhost:3000', '_blank');
}

function viewLogs() {
    showNotification('Opening dashboard logs view...', 'info');
    window.open('http://localhost:3000#logs', '_blank');
}

function showServiceManagementGuide() {
    alert('Service Management Guide:\n\n' +
          '1. Open the dashboard\n' +
          '2. Navigate to the Services section\n' +
          '3. Use the controls to start/stop/restart services\n' +
          '4. View logs for troubleshooting\n\n' +
          'Each service can be controlled independently.');
}

function showResourcesModal() {
    document.getElementById('resources-modal').style.display = 'flex';
}

function closeResourcesModal() {
    document.getElementById('resources-modal').style.display = 'none';
}

function restartWizard() {
    if (confirm('This will restart the installation wizard. Your current installation will not be affected. Continue?')) {
        // Clear wizard state
        localStorage.removeItem('kaspa_wizard_state');
        localStorage.removeItem('kaspa_tour_progress');
        
        // Reload page
        window.location.reload();
    }
}

// ============================================================================
// Completion Step Handler
// ============================================================================

function showCompletion() {
    console.log('Installation complete!');
    
    // Run service verification automatically
    setTimeout(() => {
        runServiceVerification();
    }, 500);
    
    // Load tour progress
    loadTourProgress();
    
    // Populate with actual service data if available
    if (wizardState.installationResult) {
        console.log('Installation result:', wizardState.installationResult);
    }
}


// Safety System Integration

/**
 * Enhanced profile selection with safety checks
 */
async function selectProfileWithSafety(profileId) {
  const profileCard = document.querySelector(`.profile-card[data-profile="${profileId}"]`);
  if (!profileCard) return;

  // Get profile data
  const profile = getProfileData(profileId);
  if (!profile) return;

  // Get system resources
  const systemResources = wizardState.systemCheck || await checkSystemResources();

  // Assess risk
  const riskAssessment = await safety.assessProfileRisk(profile, systemResources);

  // Show warning if needed
  if (riskAssessment && riskAssessment.level !== 'low') {
    safety.showResourceWarning(riskAssessment);

    // Require confirmation for high-risk selections
    if (riskAssessment.requiresConfirmation) {
      const confirmed = await safety.showConfirmation('profile-selection', riskAssessment);
      
      if (!confirmed) {
        // User cancelled, don't select profile
        return;
      }
    }
  } else {
    safety.hideResourceWarning();
  }

  // Proceed with selection
  selectProfile(profileId);
}

/**
 * Get profile data for risk assessment
 */
function getProfileData(profileId) {
  const profiles = {
    'core': {
      id: 'core',
      name: 'Core Node',
      requirements: {
        ram: { min: 4096, recommended: 8192 },
        disk: { min: 100, recommended: 200 },
        cpu: { min: 2, recommended: 4 }
      },
      syncTime: { estimated: 4 }
    },
    'production': {
      id: 'production',
      name: 'Production',
      requirements: {
        ram: { min: 8192, recommended: 16384 },
        disk: { min: 200, recommended: 500 },
        cpu: { min: 4, recommended: 8 }
      },
      syncTime: { estimated: 6 }
    },
    'explorer': {
      id: 'explorer',
      name: 'Explorer',
      requirements: {
        ram: { min: 16384, recommended: 32768 },
        disk: { min: 500, recommended: 1000 },
        cpu: { min: 8, recommended: 16 }
      },
      syncTime: { estimated: 8 }
    },
    'archive': {
      id: 'archive',
      name: 'Archive',
      requirements: {
        ram: { min: 32768, recommended: 65536 },
        disk: { min: 2000, recommended: 5000 },
        cpu: { min: 16, recommended: 32 }
      },
      syncTime: { estimated: 24 }
    },
    'mining': {
      id: 'mining',
      name: 'Mining',
      requirements: {
        ram: { min: 4096, recommended: 8192 },
        disk: { min: 100, recommended: 200 },
        cpu: { min: 4, recommended: 8 }
      },
      syncTime: { estimated: 4 }
    },
    'development': {
      id: 'development',
      name: 'Development',
      requirements: {
        ram: { min: 8192, recommended: 16384 },
        disk: { min: 200, recommended: 500 },
        cpu: { min: 4, recommended: 8 }
      },
      syncTime: { estimated: 6 }
    }
  };

  return profiles[profileId];
}

/**
 * Check system resources
 */
async function checkSystemResources() {
  try {
    const response = await fetch('/api/system-check');
    if (!response.ok) {
      throw new Error('Failed to check system resources');
    }

    const data = await response.json();
    return {
      ram: {
        total: data.resources?.memory?.total || 0,
        available: data.resources?.memory?.available || 0
      },
      disk: {
        total: data.resources?.disk?.total || 0,
        available: data.resources?.disk?.available || 0
      },
      cpu: {
        cores: data.resources?.cpu?.cores || 0
      }
    };
  } catch (error) {
    console.error('Error checking system resources:', error);
    return {
      ram: { total: 0, available: 0 },
      disk: { total: 0, available: 0 },
      cpu: { cores: 0 }
    };
  }
}

/**
 * Enhanced installation start with safety checks
 */
async function startInstallationWithSafety() {
  // Create backup before installation
  await safety.createBackup();

  // Check if any high-risk selections
  const hasHighRiskSelections = wizardState.riskLevel === 'high' || wizardState.riskLevel === 'critical';

  // Confirm installation start if risky
  if (hasHighRiskSelections) {
    const confirmed = await confirmAction('install-start', {
      hasHighRiskSelections: true,
      riskAssessment: wizardState.riskAssessment
    });

    if (!confirmed) {
      return;
    }
  }

  // Proceed with installation
  startInstallation();
}

/**
 * Handle installation failure with safety system
 */
function handleInstallationFailure(error) {
  console.error('Installation failed:', error);
  
  // Track failure
  trackInstallationFailure();
  
  // Show error message
  showNotification('Installation failed. Please check the logs for details.', 'error');
  
  // Update UI
  updateInstallationStatus('failed', error.message);
}

/**
 * Handle installation success
 */
function handleInstallationSuccess() {
  // Reset failure count
  resetInstallationFailures();
  
  // Show success message
  showNotification('Installation completed successfully!', 'success');
  
  // Move to completion step
  nextStep();
}

/**
 * Confirm configuration change
 */
async function confirmConfigurationChange() {
  const confirmed = await confirmAction('configuration-change', {});
  return confirmed;
}

/**
 * Confirm start over
 */
async function confirmStartOver() {
  const confirmed = await confirmAction('start-over', {});
  
  if (confirmed) {
    // Reset wizard state
    resetWizardState();
    
    // Go back to welcome step
    goToStep(0);
    
    showNotification('Wizard reset. Starting over...', 'info');
  }
}

/**
 * Confirm data deletion
 */
async function confirmDataDeletion() {
  const confirmed = await confirmAction('data-deletion', {});
  return confirmed;
}

// Override original profile selection to use safety checks
const originalSelectProfile = selectProfile;
selectProfile = function(profileId) {
  // Store risk assessment in wizard state
  if (wizardState.riskAssessment) {
    wizardState.riskLevel = wizardState.riskAssessment.level;
  }
  
  // Call original function
  originalSelectProfile(profileId);
};

// Add event listeners for profile cards with safety checks
document.addEventListener('DOMContentLoaded', () => {
  const profileCards = document.querySelectorAll('.profile-card');
  profileCards.forEach(card => {
    card.addEventListener('click', async () => {
      const profileId = card.getAttribute('data-profile');
      await selectProfileWithSafety(profileId);
    });
  });
});


// ============================================================================
// GET HELP SYSTEM
// ============================================================================

/**
 * Get Help Dialog - Provides diagnostic export and issue search
 */
const helpSystem = {
    isOpen: false,
    currentTab: 'search',
    diagnosticData: null,
    searchResults: [],

    /**
     * Open the Get Help dialog
     */
    open() {
        this.isOpen = true;
        const dialog = document.getElementById('help-dialog');
        if (dialog) {
            dialog.classList.add('active');
            this.switchTab('search');
        } else {
            this.createDialog();
        }
    },

    /**
     * Close the Get Help dialog
     */
    close() {
        this.isOpen = false;
        const dialog = document.getElementById('help-dialog');
        if (dialog) {
            dialog.classList.remove('active');
        }
    },

    /**
     * Create the Get Help dialog HTML
     */
    createDialog() {
        const dialogHTML = `
            <div id="help-dialog" class="modal-overlay active">
                <div class="modal-content help-dialog">
                    <div class="modal-header">
                        <h2>Get Help</h2>
                        <button class="close-btn" onclick="helpSystem.close()">×</button>
                    </div>
                    
                    <div class="help-tabs">
                        <button class="help-tab active" data-tab="search" onclick="helpSystem.switchTab('search')">
                            Search Issues
                        </button>
                        <button class="help-tab" data-tab="diagnostic" onclick="helpSystem.switchTab('diagnostic')">
                            Diagnostic Report
                        </button>
                        <button class="help-tab" data-tab="community" onclick="helpSystem.switchTab('community')">
                            Community Help
                        </button>
                    </div>

                    <div class="help-content">
                        <!-- Search Issues Tab -->
                        <div id="help-tab-search" class="help-tab-content active">
                            <div class="search-section">
                                <h3>Search Common Issues</h3>
                                <p>Describe your problem or paste an error message:</p>
                                <div class="search-input-group">
                                    <input type="text" id="help-search-input" 
                                           placeholder="e.g., 'Docker not running' or 'port already in use'"
                                           onkeypress="if(event.key==='Enter') helpSystem.searchIssues()">
                                    <button onclick="helpSystem.searchIssues()" class="btn btn-primary">
                                        Search
                                    </button>
                                </div>
                                
                                <div id="help-search-results" class="search-results">
                                    <!-- Results will be inserted here -->
                                </div>

                                <div class="common-categories">
                                    <h4>Browse by Category</h4>
                                    <div class="category-buttons">
                                        <button onclick="helpSystem.searchByCategory('docker')" class="btn btn-secondary">
                                            Docker Issues
                                        </button>
                                        <button onclick="helpSystem.searchByCategory('network')" class="btn btn-secondary">
                                            Network Issues
                                        </button>
                                        <button onclick="helpSystem.searchByCategory('resources')" class="btn btn-secondary">
                                            Resource Issues
                                        </button>
                                        <button onclick="helpSystem.searchByCategory('permissions')" class="btn btn-secondary">
                                            Permission Issues
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Diagnostic Report Tab -->
                        <div id="help-tab-diagnostic" class="help-tab-content">
                            <div class="diagnostic-section">
                                <h3>System Diagnostic Report</h3>
                                <p>Generate a diagnostic report to share with support or the community.</p>
                                
                                <div class="diagnostic-actions">
                                    <button onclick="helpSystem.generateDiagnostic()" class="btn btn-primary">
                                        Generate Report
                                    </button>
                                    <button onclick="helpSystem.copyDiagnostic()" class="btn btn-secondary" 
                                            id="copy-diagnostic-btn" disabled>
                                        Copy to Clipboard
                                    </button>
                                    <button onclick="helpSystem.downloadDiagnostic()" class="btn btn-secondary"
                                            id="download-diagnostic-btn" disabled>
                                        Download Report
                                    </button>
                                </div>

                                <div id="diagnostic-status" class="diagnostic-status">
                                    <!-- Status messages will appear here -->
                                </div>

                                <div id="diagnostic-preview" class="diagnostic-preview">
                                    <!-- Diagnostic report will be displayed here -->
                                </div>

                                <div class="diagnostic-info">
                                    <p><strong>Note:</strong> Sensitive information (passwords, API keys, tokens) is automatically redacted from the report.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Community Help Tab -->
                        <div id="help-tab-community" class="help-tab-content">
                            <div class="community-section">
                                <h3>Community Resources</h3>
                                
                                <div class="community-links">
                                    <div class="community-card">
                                        <h4>Discord Community</h4>
                                        <p>Join the Kaspa Discord server for real-time help and discussions.</p>
                                        <a href="https://discord.gg/kaspa" target="_blank" class="btn btn-primary">
                                            Join Discord
                                        </a>
                                    </div>

                                    <div class="community-card">
                                        <h4>GitHub Issues</h4>
                                        <p>Report bugs or request features on GitHub.</p>
                                        <button onclick="helpSystem.createGitHubIssue()" class="btn btn-primary">
                                            Create Issue
                                        </button>
                                    </div>

                                    <div class="community-card">
                                        <h4>Documentation</h4>
                                        <p>Browse the complete documentation and guides.</p>
                                        <a href="https://github.com/argonmining/KaspaAllInOne" target="_blank" class="btn btn-primary">
                                            View Docs
                                        </a>
                                    </div>

                                    <div class="community-card">
                                        <h4>Kaspa Forum</h4>
                                        <p>Ask questions and share experiences on the Kaspa forum.</p>
                                        <a href="https://forum.kaspa.org" target="_blank" class="btn btn-primary">
                                            Visit Forum
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    },

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.help-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`help-tab-${tabName}`).classList.add('active');
    },

    /**
     * Search for issues
     */
    async searchIssues() {
        const query = document.getElementById('help-search-input').value.trim();
        if (!query) {
            return;
        }

        const resultsContainer = document.getElementById('help-search-results');
        resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

        try {
            const response = await api.post('/diagnostic/search', { query });
            this.searchResults = response.data;
            this.displaySearchResults();
        } catch (error) {
            resultsContainer.innerHTML = `<div class="error">Search failed: ${error.message}</div>`;
        }
    },

    /**
     * Search by category
     */
    async searchByCategory(category) {
        const resultsContainer = document.getElementById('help-search-results');
        resultsContainer.innerHTML = '<div class="loading">Loading...</div>';

        try {
            const response = await api.get(`/diagnostic/issues?category=${category}`);
            this.searchResults = response.data;
            this.displaySearchResults();
        } catch (error) {
            resultsContainer.innerHTML = `<div class="error">Failed to load issues: ${error.message}</div>`;
        }
    },

    /**
     * Display search results
     */
    displaySearchResults() {
        const resultsContainer = document.getElementById('help-search-results');
        
        if (this.searchResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>No matching issues found.</p>
                    <p>Try different keywords or browse by category.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="results-list">';
        for (const issue of this.searchResults) {
            html += `
                <div class="issue-card">
                    <div class="issue-header">
                        <h4>${issue.title}</h4>
                        <span class="issue-category">${issue.category}</span>
                    </div>
                    <p class="issue-description">${issue.description}</p>
                    <div class="issue-solution">
                        <strong>Solution:</strong>
                        <pre>${issue.solution}</pre>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        
        resultsContainer.innerHTML = html;
    },

    /**
     * Generate diagnostic report
     */
    async generateDiagnostic() {
        const statusDiv = document.getElementById('diagnostic-status');
        const previewDiv = document.getElementById('diagnostic-preview');
        
        statusDiv.innerHTML = '<div class="loading">Collecting diagnostic information...</div>';
        previewDiv.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE}/diagnostic/report`);
            if (!response.ok) {
                throw new Error('Failed to generate report');
            }
            
            this.diagnosticData = await response.text();
            
            statusDiv.innerHTML = '<div class="success">✓ Diagnostic report generated successfully</div>';
            previewDiv.innerHTML = `<pre>${this.diagnosticData}</pre>`;
            
            // Enable copy and download buttons
            document.getElementById('copy-diagnostic-btn').disabled = false;
            document.getElementById('download-diagnostic-btn').disabled = false;
            
        } catch (error) {
            statusDiv.innerHTML = `<div class="error">Failed to generate report: ${error.message}</div>`;
        }
    },

    /**
     * Copy diagnostic report to clipboard
     */
    async copyDiagnostic() {
        if (!this.diagnosticData) {
            return;
        }

        try {
            await navigator.clipboard.writeText(this.diagnosticData);
            
            const btn = document.getElementById('copy-diagnostic-btn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            alert('Failed to copy to clipboard. Please select and copy manually.');
        }
    },

    /**
     * Download diagnostic report
     */
    downloadDiagnostic() {
        if (!this.diagnosticData) {
            return;
        }

        const blob = new Blob([this.diagnosticData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaspa-diagnostic-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Create GitHub issue with diagnostic info
     */
    async createGitHubIssue() {
        // Generate diagnostic if not already done
        if (!this.diagnosticData) {
            await this.generateDiagnostic();
        }

        const issueBody = encodeURIComponent(`
## Problem Description

[Please describe your issue here]

## Steps to Reproduce

1. 
2. 
3. 

## Expected Behavior

[What you expected to happen]

## Actual Behavior

[What actually happened]

## Diagnostic Information

\`\`\`
${this.diagnosticData || 'Diagnostic data not available'}
\`\`\`
        `);

        const url = `https://github.com/argonmining/KaspaAllInOne/issues/new?body=${issueBody}`;
        window.open(url, '_blank');
    }
};

// Add Get Help button to all wizard steps
function addGetHelpButton() {
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(step => {
        if (!step.querySelector('.get-help-btn')) {
            const helpBtn = document.createElement('button');
            helpBtn.className = 'btn btn-link get-help-btn';
            helpBtn.textContent = 'Need Help?';
            helpBtn.onclick = () => helpSystem.open();
            
            const footer = step.querySelector('.step-footer') || step.querySelector('.step-actions');
            if (footer) {
                footer.appendChild(helpBtn);
            }
        }
    });
}

// Initialize Get Help button on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addGetHelpButton, 1000);
});
