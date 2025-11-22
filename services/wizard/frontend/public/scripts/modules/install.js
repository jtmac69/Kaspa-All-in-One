/**
 * Install Module
 * Handles installation process with WebSocket connection
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * WebSocket connection for installation
 */
let wsManager = null;

/**
 * Initialize WebSocket manager
 */
export function initializeWebSocket(manager) {
    wsManager = manager;
}

/**
 * Start installation process
 */
export async function startInstallation() {
    if (!wsManager) {
        showNotification('WebSocket not initialized', 'error');
        return;
    }
    
    const config = stateManager.get('configuration');
    const profiles = stateManager.get('selectedProfiles');
    
    if (!profiles || profiles.length === 0) {
        showNotification('Please select at least one profile', 'error');
        return;
    }
    
    console.log('Starting installation with config:', config, 'profiles:', profiles);
    
    // Reset installation state
    stateManager.set('installationProgress', {
        stage: 'init',
        message: 'Starting installation...',
        progress: 0
    });
    
    // Emit installation start event
    wsManager.emit('install:start', {
        config,
        profiles
    });
    
    // Update UI to show installation started
    updateInstallationUI({
        stage: 'init',
        message: 'Starting installation...',
        progress: 0
    });
}

/**
 * Update installation UI with progress
 */
export function updateInstallationUI(data) {
    const { stage, message, progress, details } = data;
    
    console.log('Installation progress:', { stage, message, progress });
    
    // Update progress bar with smooth animation
    const progressBar = document.getElementById('install-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.style.transition = 'width 0.5s ease-in-out';
        
        // Add color coding based on progress
        if (progress < 30) {
            progressBar.style.backgroundColor = '#3498db'; // Blue for early stages
        } else if (progress < 70) {
            progressBar.style.backgroundColor = '#f39c12'; // Orange for middle stages
        } else if (progress < 100) {
            progressBar.style.backgroundColor = '#e67e22'; // Darker orange for late stages
        } else {
            progressBar.style.backgroundColor = '#27ae60'; // Green for complete
        }
    }
    
    // Update progress percentage with animation
    const progressPercentage = document.getElementById('install-progress-percentage');
    if (progressPercentage) {
        const currentProgress = Math.round(progress);
        progressPercentage.textContent = `${currentProgress}%`;
        
        // Add pulse animation on significant progress
        if (currentProgress % 10 === 0 && currentProgress > 0) {
            progressPercentage.classList.add('pulse');
            setTimeout(() => progressPercentage.classList.remove('pulse'), 500);
        }
    }
    
    // Update status title and message with stage-specific styling
    const statusTitle = document.getElementById('install-status-title');
    if (statusTitle) {
        statusTitle.textContent = getStageTitle(stage);
        statusTitle.style.color = getStageColor(stage);
    }
    
    const statusMessage = document.getElementById('install-status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        
        // Add detailed information if available
        if (details) {
            const detailsText = formatDetails(details);
            if (detailsText) {
                statusMessage.innerHTML = `${message}<br><small style="opacity: 0.8;">${detailsText}</small>`;
            }
        }
    }
    
    // Update install steps with enhanced feedback
    updateInstallSteps(stage, progress, details);
    
    // Add to logs with timestamp and formatting
    const logMessage = formatLogMessage(stage, message, details);
    addToLogs(logMessage);
    
    // Update time estimate
    updateTimeEstimate(stage, progress);
    
    // Store in state
    stateManager.update('installationProgress', {
        stage,
        message,
        progress,
        details,
        timestamp: new Date().toISOString()
    });
}

/**
 * Get human-readable stage title
 */
function getStageTitle(stage) {
    const titles = {
        'init': 'Initializing Installation',
        'config': 'Configuring Environment',
        'pull': 'Downloading Docker Images',
        'build': 'Building Services',
        'deploy': 'Starting Services',
        'validate': 'Validating Installation'
    };
    return titles[stage] || 'Installing...';
}

/**
 * Get stage-specific color
 */
function getStageColor(stage) {
    const colors = {
        'init': '#3498db',
        'config': '#9b59b6',
        'pull': '#f39c12',
        'build': '#e67e22',
        'deploy': '#e74c3c',
        'validate': '#27ae60'
    };
    return colors[stage] || '#34495e';
}

/**
 * Format details object into readable text
 */
function formatDetails(details) {
    if (!details) return '';
    
    const parts = [];
    
    if (details.service) {
        parts.push(`Service: ${details.service}`);
    }
    
    if (details.image) {
        parts.push(`Image: ${details.image}`);
    }
    
    if (details.current && details.total) {
        parts.push(`${details.current}/${details.total}`);
    }
    
    if (details.size) {
        parts.push(`Size: ${formatBytes(details.size)}`);
    }
    
    if (details.downloaded && details.total) {
        const percent = Math.round((details.downloaded / details.total) * 100);
        parts.push(`${percent}% downloaded`);
    }
    
    return parts.join(' • ');
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format log message with enhanced information
 */
function formatLogMessage(stage, message, details) {
    let logMsg = `[${stage.toUpperCase()}] ${message}`;
    
    if (details) {
        if (details.service) {
            logMsg += ` (${details.service})`;
        }
        if (details.image) {
            logMsg += ` - ${details.image}`;
        }
    }
    
    return logMsg;
}

/**
 * Update time estimate based on stage and progress
 */
function updateTimeEstimate(stage, progress) {
    // Estimated time remaining based on stage
    const stageEstimates = {
        'init': 0.5,      // 30 seconds
        'config': 0.5,    // 30 seconds
        'pull': 5,        // 5 minutes (varies by connection)
        'build': 3,       // 3 minutes
        'deploy': 2,      // 2 minutes
        'validate': 1     // 1 minute
    };
    
    const totalEstimate = Object.values(stageEstimates).reduce((a, b) => a + b, 0);
    const completedTime = (progress / 100) * totalEstimate;
    const remainingTime = totalEstimate - completedTime;
    
    // Update time estimate display if element exists
    const timeEstimate = document.getElementById('install-time-estimate');
    if (timeEstimate) {
        if (remainingTime > 0) {
            const minutes = Math.ceil(remainingTime);
            timeEstimate.textContent = `Estimated time remaining: ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            timeEstimate.style.display = 'block';
        } else {
            timeEstimate.style.display = 'none';
        }
    }
}

/**
 * Update install step indicators
 */
function updateInstallSteps(stage, progress, details) {
    const steps = {
        'init': 'env',
        'config': 'env',
        'pull': 'pull',
        'build': 'pull',
        'deploy': 'start',
        'validate': 'health'
    };
    
    const currentStep = steps[stage];
    if (!currentStep) return;
    
    // Update step statuses
    const stepElements = document.querySelectorAll('.install-step');
    stepElements.forEach(stepEl => {
        const stepName = stepEl.dataset.step;
        const icon = stepEl.querySelector('.install-step-icon');
        const status = stepEl.querySelector('.install-step-status');
        
        if (!icon || !status) return;
        
        // Determine step state
        const stepOrder = ['env', 'pull', 'start', 'health'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepName);
        
        if (stepIndex < currentIndex) {
            // Completed
            icon.innerHTML = '<span style="color: #27ae60; font-size: 24px;">✓</span>';
            status.textContent = 'Complete';
            status.style.color = '#27ae60';
            stepEl.classList.remove('active', 'pending');
            stepEl.classList.add('complete');
            
            // Add completion animation
            stepEl.style.opacity = '0.8';
        } else if (stepIndex === currentIndex) {
            // In progress
            icon.innerHTML = '<div class="spinner-small"></div>';
            
            // Show detailed status for current step
            let statusText = 'In Progress';
            if (details) {
                if (stepName === 'pull' && details.current && details.total) {
                    statusText = `Pulling ${details.current}/${details.total}`;
                } else if (stepName === 'start' && details.service) {
                    statusText = `Starting ${details.service}`;
                } else if (stepName === 'health' && details.service) {
                    statusText = `Checking ${details.service}`;
                }
            }
            
            status.textContent = statusText;
            status.style.color = '#3498db';
            stepEl.classList.remove('complete', 'pending');
            stepEl.classList.add('active');
            
            // Highlight current step
            stepEl.style.opacity = '1';
            stepEl.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
        } else {
            // Pending
            icon.innerHTML = '<span style="opacity: 0.5;">⏳</span>';
            status.textContent = 'Pending';
            status.style.color = '#95a5a6';
            stepEl.classList.remove('complete', 'active');
            stepEl.classList.add('pending');
            
            // Dim pending steps
            stepEl.style.opacity = '0.6';
            stepEl.style.backgroundColor = 'transparent';
        }
    });
}

/**
 * Add message to installation logs
 */
function addToLogs(message) {
    const logsText = document.getElementById('install-logs-text');
    if (!logsText) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // Initialize logs if empty
    if (logsText.textContent === 'Waiting for installation to start...') {
        logsText.textContent = '';
    }
    
    logsText.textContent += logEntry;
    
    // Auto-scroll to bottom with smooth behavior
    logsText.scrollTop = logsText.scrollHeight;
    
    // Limit log size to prevent memory issues (keep last 1000 lines)
    const lines = logsText.textContent.split('\n');
    if (lines.length > 1000) {
        logsText.textContent = lines.slice(-1000).join('\n');
    }
    
    // Update log count badge if it exists
    const logCount = document.getElementById('install-log-count');
    if (logCount) {
        const count = lines.length;
        logCount.textContent = count;
        logCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Handle installation complete
 */
export function handleInstallationComplete(data) {
    console.log('Installation complete:', data);
    
    showNotification('Installation completed successfully!', 'success');
    
    // Update UI to show completion
    updateInstallationUI({
        stage: 'validate',
        message: 'Installation complete!',
        progress: 100
    });
    
    // Store completion data
    stateManager.set('installationComplete', {
        timestamp: new Date().toISOString(),
        validation: data.validation
    });
    
    // Add final log entry
    addToLogs('Installation completed successfully!');
    
    // Enable navigation to next step
    const continueBtn = document.querySelector('#step-install .btn-primary');
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue to Complete';
        continueBtn.onclick = () => {
            // This will be handled by navigation
            if (window.nextStep) {
                window.nextStep();
            }
        };
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-install-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

/**
 * Handle installation error
 */
export function handleInstallationError(data) {
    const { stage, message, error, errors, results } = data;
    
    console.error('Installation error:', data);
    
    showNotification(`Installation failed: ${message}`, 'error', 10000);
    
    // Update UI to show error state
    const statusTitle = document.getElementById('install-status-title');
    if (statusTitle) {
        statusTitle.textContent = '❌ Installation Failed';
        statusTitle.style.color = '#e74c3c';
    }
    
    const statusMessage = document.getElementById('install-status-message');
    if (statusMessage) {
        statusMessage.innerHTML = `<strong>${message}</strong>`;
        statusMessage.style.color = '#e74c3c';
    }
    
    // Update progress bar to show error state
    const progressBar = document.getElementById('install-progress-bar');
    if (progressBar) {
        progressBar.style.backgroundColor = '#e74c3c';
        progressBar.style.transition = 'background-color 0.3s ease';
    }
    
    // Mark current step as failed
    markStepAsFailed(stage);
    
    // Add error to logs with detailed information
    addToLogs(`❌ ERROR: ${message}`);
    if (error) {
        addToLogs(`Details: ${error}`);
    }
    if (errors && Array.isArray(errors)) {
        errors.forEach(err => addToLogs(`  - ${err}`));
    }
    if (results && Array.isArray(results)) {
        const failed = results.filter(r => !r.success);
        failed.forEach(r => addToLogs(`  - ${r.service || r.image}: ${r.error || 'Failed'}`));
    }
    
    // Store comprehensive error data
    stateManager.set('installationError', {
        stage,
        message,
        error,
        errors,
        results,
        timestamp: new Date().toISOString(),
        recoverable: isRecoverableError(stage, error)
    });
    
    // Display error recovery UI
    displayErrorRecovery(data);
    
    // Update button states
    updateErrorButtons();
}

/**
 * Mark installation step as failed
 */
function markStepAsFailed(stage) {
    const steps = {
        'init': 'env',
        'config': 'env',
        'pull': 'pull',
        'build': 'pull',
        'deploy': 'start',
        'validate': 'health'
    };
    
    const failedStep = steps[stage];
    if (!failedStep) return;
    
    const stepElements = document.querySelectorAll('.install-step');
    stepElements.forEach(stepEl => {
        const stepName = stepEl.dataset.step;
        if (stepName === failedStep) {
            const icon = stepEl.querySelector('.install-step-icon');
            const status = stepEl.querySelector('.install-step-status');
            
            if (icon) {
                icon.innerHTML = '<span style="color: #e74c3c; font-size: 24px;">✗</span>';
            }
            if (status) {
                status.textContent = 'Failed';
                status.style.color = '#e74c3c';
            }
            
            stepEl.classList.remove('active', 'pending', 'complete');
            stepEl.classList.add('failed');
            stepEl.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
            stepEl.style.borderLeft = '3px solid #e74c3c';
        }
    });
}

/**
 * Determine if error is recoverable
 */
function isRecoverableError(stage, error) {
    // Network errors, timeouts, and temporary failures are usually recoverable
    const recoverablePatterns = [
        /network/i,
        /timeout/i,
        /connection/i,
        /temporary/i,
        /rate limit/i,
        /try again/i
    ];
    
    const errorText = error || '';
    return recoverablePatterns.some(pattern => pattern.test(errorText));
}

/**
 * Display error recovery UI
 */
function displayErrorRecovery(errorData) {
    const { stage, message, error, errors } = errorData;
    
    // Create or update error panel
    let errorPanel = document.getElementById('install-error-panel');
    
    if (!errorPanel) {
        // Create error panel
        errorPanel = document.createElement('div');
        errorPanel.id = 'install-error-panel';
        errorPanel.className = 'install-error-panel';
        
        const installProgress = document.querySelector('.install-progress');
        if (installProgress) {
            installProgress.appendChild(errorPanel);
        }
    }
    
    // Build error details
    let errorDetails = `<p><strong>Stage:</strong> ${stage}</p>`;
    errorDetails += `<p><strong>Message:</strong> ${message}</p>`;
    
    if (error) {
        errorDetails += `<p><strong>Details:</strong> ${error}</p>`;
    }
    
    if (errors && Array.isArray(errors) && errors.length > 0) {
        errorDetails += '<p><strong>Validation Errors:</strong></p><ul>';
        errors.forEach(err => {
            errorDetails += `<li>${err}</li>`;
        });
        errorDetails += '</ul>';
    }
    
    // Get troubleshooting suggestions
    const suggestions = getTroubleshootingSuggestions(stage, error);
    
    // Build recovery options
    const recoveryOptions = buildRecoveryOptions(errorData);
    
    errorPanel.innerHTML = `
        <div class="error-panel-header">
            <span class="error-icon">⚠️</span>
            <h3>Installation Error</h3>
        </div>
        <div class="error-panel-body">
            <div class="error-details">
                ${errorDetails}
            </div>
            ${suggestions ? `
                <div class="error-suggestions">
                    <h4>💡 Troubleshooting Suggestions:</h4>
                    ${suggestions}
                </div>
            ` : ''}
            <div class="error-recovery-options">
                <h4>🔧 Recovery Options:</h4>
                ${recoveryOptions}
            </div>
        </div>
    `;
    
    errorPanel.style.display = 'block';
}

/**
 * Get troubleshooting suggestions based on error
 */
function getTroubleshootingSuggestions(stage, error) {
    const errorText = (error || '').toLowerCase();
    const suggestions = [];
    
    // Stage-specific suggestions
    if (stage === 'config') {
        suggestions.push('Check that all required configuration values are provided');
        suggestions.push('Verify IP addresses and ports are valid');
        suggestions.push('Ensure passwords meet minimum requirements');
    } else if (stage === 'pull') {
        if (errorText.includes('network') || errorText.includes('timeout')) {
            suggestions.push('Check your internet connection');
            suggestions.push('Verify Docker Hub is accessible');
            suggestions.push('Try again in a few minutes if rate limited');
        }
        suggestions.push('Ensure Docker daemon is running');
        suggestions.push('Check available disk space');
    } else if (stage === 'build') {
        suggestions.push('Check Docker build logs for specific errors');
        suggestions.push('Verify all required files are present');
        suggestions.push('Ensure sufficient disk space for builds');
    } else if (stage === 'deploy') {
        if (errorText.includes('port') || errorText.includes('address')) {
            suggestions.push('Check that required ports are not in use');
            suggestions.push('Stop any conflicting services');
        }
        suggestions.push('Verify Docker Compose configuration');
        suggestions.push('Check service dependencies are met');
    } else if (stage === 'validate') {
        suggestions.push('Services may need more time to start');
        suggestions.push('Check service logs for startup errors');
        suggestions.push('Verify network connectivity between services');
    }
    
    // Error-specific suggestions
    if (errorText.includes('permission')) {
        suggestions.push('Check file and directory permissions');
        suggestions.push('Ensure Docker has necessary permissions');
    }
    
    if (errorText.includes('disk') || errorText.includes('space')) {
        suggestions.push('Free up disk space');
        suggestions.push('Remove unused Docker images and containers');
    }
    
    if (suggestions.length === 0) {
        return null;
    }
    
    return '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
}

/**
 * Build recovery options HTML
 */
function buildRecoveryOptions(errorData) {
    const { stage, recoverable } = errorData;
    
    let options = '';
    
    // Retry option (always available)
    options += `
        <button class="btn-primary error-recovery-btn" onclick="window.retryInstallation()">
            <span class="btn-icon">🔄</span>
            Retry Installation
        </button>
    `;
    
    // View logs option
    options += `
        <button class="btn-secondary error-recovery-btn" onclick="window.showInstallationLogs()">
            <span class="btn-icon">📋</span>
            View Full Logs
        </button>
    `;
    
    // Export diagnostics option
    options += `
        <button class="btn-secondary error-recovery-btn" onclick="window.exportDiagnostics()">
            <span class="btn-icon">📊</span>
            Export Diagnostics
        </button>
    `;
    
    // Go back option
    options += `
        <button class="btn-secondary error-recovery-btn" onclick="window.goBackFromError()">
            <span class="btn-icon">←</span>
            Go Back to Configuration
        </button>
    `;
    
    // Start over option
    options += `
        <button class="btn-danger error-recovery-btn" onclick="window.startOverFromError()">
            <span class="btn-icon">🔄</span>
            Start Over
        </button>
    `;
    
    return options;
}

/**
 * Update button states after error
 */
function updateErrorButtons() {
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-install-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    // Disable continue button
    const continueBtn = document.querySelector('#step-install .btn-primary');
    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.style.opacity = '0.5';
    }
}

/**
 * Cancel installation
 */
export function cancelInstallation() {
    if (!confirm('Are you sure you want to cancel the installation?')) {
        return;
    }
    
    if (wsManager) {
        wsManager.emit('install:cancel');
    }
    
    showNotification('Installation cancelled', 'info');
    
    // Go back to previous step
    if (window.previousStep) {
        window.previousStep();
    }
}

/**
 * Retry installation after error
 */
export function retryInstallation() {
    console.log('Retrying installation...');
    
    // Clear error state
    stateManager.delete('installationError');
    
    // Hide error panel
    const errorPanel = document.getElementById('install-error-panel');
    if (errorPanel) {
        errorPanel.style.display = 'none';
    }
    
    // Reset UI
    resetInstallationUI();
    
    // Show notification
    showNotification('Retrying installation...', 'info');
    
    // Start installation again
    setTimeout(() => {
        startInstallation();
    }, 500);
}

/**
 * Reset installation UI to initial state
 */
function resetInstallationUI() {
    // Reset progress bar
    const progressBar = document.getElementById('install-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#3498db';
    }
    
    // Reset progress percentage
    const progressPercentage = document.getElementById('install-progress-percentage');
    if (progressPercentage) {
        progressPercentage.textContent = '0%';
    }
    
    // Reset status
    const statusTitle = document.getElementById('install-status-title');
    if (statusTitle) {
        statusTitle.textContent = 'Preparing Installation';
        statusTitle.style.color = '#2c3e50';
    }
    
    const statusMessage = document.getElementById('install-status-message');
    if (statusMessage) {
        statusMessage.textContent = 'Getting ready to install...';
        statusMessage.style.color = '#7f8c8d';
    }
    
    // Reset steps
    const stepElements = document.querySelectorAll('.install-step');
    stepElements.forEach(stepEl => {
        const icon = stepEl.querySelector('.install-step-icon');
        const status = stepEl.querySelector('.install-step-status');
        
        if (icon) {
            icon.innerHTML = '<span style="opacity: 0.5;">⏳</span>';
        }
        if (status) {
            status.textContent = 'Pending';
            status.style.color = '#95a5a6';
        }
        
        stepEl.classList.remove('active', 'complete', 'failed');
        stepEl.classList.add('pending');
        stepEl.style.opacity = '0.6';
        stepEl.style.backgroundColor = 'transparent';
        stepEl.style.borderLeft = 'none';
    });
    
    // Clear logs
    const logsText = document.getElementById('install-logs-text');
    if (logsText) {
        logsText.textContent = 'Waiting for installation to start...';
    }
    
    // Show cancel button
    const cancelBtn = document.getElementById('cancel-install-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = cancelInstallation;
    }
    
    // Disable continue button
    const continueBtn = document.querySelector('#step-install .btn-primary');
    if (continueBtn) {
        continueBtn.disabled = true;
    }
}

/**
 * Show installation logs in expanded view
 */
export function showInstallationLogs() {
    const logsContent = document.getElementById('install-logs-content');
    if (logsContent) {
        logsContent.style.display = 'block';
        
        // Scroll to logs
        logsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Update toggle text
    const toggleText = document.getElementById('logs-toggle-text');
    if (toggleText) {
        toggleText.textContent = 'Hide Details';
    }
}

/**
 * Export diagnostic information
 */
export function exportDiagnostics() {
    const errorData = stateManager.get('installationError');
    const progressData = stateManager.get('installationProgress');
    const config = stateManager.get('configuration');
    const profiles = stateManager.get('selectedProfiles');
    
    // Get logs
    const logsText = document.getElementById('install-logs-text');
    const logs = logsText ? logsText.textContent : 'No logs available';
    
    // Build diagnostic report
    const diagnostics = {
        timestamp: new Date().toISOString(),
        error: errorData,
        progress: progressData,
        configuration: {
            profiles: profiles,
            // Redact sensitive information
            externalIp: config?.externalIp ? '[REDACTED]' : null,
            publicNode: config?.publicNode
        },
        logs: logs,
        browser: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        },
        system: {
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`
        }
    };
    
    // Create downloadable file
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspa-wizard-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Diagnostic report downloaded', 'success');
}

/**
 * Go back to configuration from error state
 */
export function goBackFromError() {
    // Clear error state
    stateManager.delete('installationError');
    
    // Navigate back
    if (window.previousStep) {
        window.previousStep();
    }
}

/**
 * Start over from error state
 */
export function startOverFromError() {
    if (!confirm('Are you sure you want to start over? This will clear all your configuration.')) {
        return;
    }
    
    // Clear all state
    stateManager.clear();
    
    // Navigate to first step
    if (window.goToStep) {
        window.goToStep(1);
    }
    
    showNotification('Starting over...', 'info');
}

/**
 * Toggle installation logs visibility
 */
export function toggleInstallLogs() {
    const logsContent = document.getElementById('install-logs-content');
    const toggleText = document.getElementById('logs-toggle-text');
    
    if (!logsContent || !toggleText) return;
    
    const isHidden = logsContent.style.display === 'none';
    logsContent.style.display = isHidden ? 'block' : 'none';
    toggleText.textContent = isHidden ? 'Hide Details' : 'Show Details';
}

/**
 * Display service-specific progress indicators
 */
export function updateServiceProgress(services) {
    if (!services || !Array.isArray(services)) return;
    
    // Create or update service progress container
    let serviceProgressContainer = document.getElementById('service-progress-container');
    
    if (!serviceProgressContainer) {
        // Create container if it doesn't exist
        const installProgress = document.querySelector('.install-progress');
        if (!installProgress) return;
        
        serviceProgressContainer = document.createElement('div');
        serviceProgressContainer.id = 'service-progress-container';
        serviceProgressContainer.className = 'service-progress-container';
        
        // Insert after install-status
        const installStatus = document.querySelector('.install-status');
        if (installStatus) {
            installStatus.after(serviceProgressContainer);
        }
    }
    
    // Update service progress items
    serviceProgressContainer.innerHTML = services.map(service => `
        <div class="service-progress-item ${service.status}">
            <div class="service-progress-icon">
                ${getServiceIcon(service.status)}
            </div>
            <div class="service-progress-content">
                <div class="service-progress-name">${service.name}</div>
                <div class="service-progress-status">${service.message || getServiceStatusText(service.status)}</div>
            </div>
            ${service.progress !== undefined ? `
                <div class="service-progress-bar-mini">
                    <div class="service-progress-fill" style="width: ${service.progress}%"></div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

/**
 * Get icon for service status
 */
function getServiceIcon(status) {
    const icons = {
        'pending': '<span style="opacity: 0.5;">⏳</span>',
        'pulling': '<div class="spinner-tiny"></div>',
        'building': '<div class="spinner-tiny"></div>',
        'starting': '<div class="spinner-tiny"></div>',
        'running': '<span style="color: #27ae60;">✓</span>',
        'error': '<span style="color: #e74c3c;">✗</span>'
    };
    return icons[status] || icons['pending'];
}

/**
 * Get status text for service
 */
function getServiceStatusText(status) {
    const texts = {
        'pending': 'Waiting',
        'pulling': 'Downloading',
        'building': 'Building',
        'starting': 'Starting',
        'running': 'Running',
        'error': 'Failed'
    };
    return texts[status] || 'Unknown';
}

/**
 * Update overall installation statistics
 */
export function updateInstallationStats(stats) {
    if (!stats) return;
    
    // Create or update stats container
    let statsContainer = document.getElementById('install-stats-container');
    
    if (!statsContainer) {
        const progressBarContainer = document.querySelector('.progress-bar-container');
        if (!progressBarContainer) return;
        
        statsContainer = document.createElement('div');
        statsContainer.id = 'install-stats-container';
        statsContainer.className = 'install-stats-container';
        progressBarContainer.after(statsContainer);
    }
    
    // Update stats display
    const statsHTML = [];
    
    if (stats.servicesTotal) {
        statsHTML.push(`
            <div class="install-stat">
                <span class="stat-label">Services:</span>
                <span class="stat-value">${stats.servicesComplete || 0}/${stats.servicesTotal}</span>
            </div>
        `);
    }
    
    if (stats.imagesTotal) {
        statsHTML.push(`
            <div class="install-stat">
                <span class="stat-label">Images:</span>
                <span class="stat-value">${stats.imagesComplete || 0}/${stats.imagesTotal}</span>
            </div>
        `);
    }
    
    if (stats.downloadedBytes && stats.totalBytes) {
        const downloadedMB = Math.round(stats.downloadedBytes / 1024 / 1024);
        const totalMB = Math.round(stats.totalBytes / 1024 / 1024);
        statsHTML.push(`
            <div class="install-stat">
                <span class="stat-label">Downloaded:</span>
                <span class="stat-value">${downloadedMB} MB / ${totalMB} MB</span>
            </div>
        `);
    }
    
    if (stats.elapsedTime) {
        const minutes = Math.floor(stats.elapsedTime / 60);
        const seconds = stats.elapsedTime % 60;
        statsHTML.push(`
            <div class="install-stat">
                <span class="stat-label">Elapsed:</span>
                <span class="stat-value">${minutes}m ${seconds}s</span>
            </div>
        `);
    }
    
    statsContainer.innerHTML = statsHTML.join('');
    statsContainer.style.display = statsHTML.length > 0 ? 'flex' : 'none';
}
