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
        'syncing': 'Synchronizing Blockchain',
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
        'syncing': '#70C7BA',
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
        'syncing': 0,     // Variable - handled separately
        'validate': 1     // 1 minute
    };
    
    const totalEstimate = Object.values(stageEstimates).reduce((a, b) => a + b, 0);
    const completedTime = (progress / 100) * totalEstimate;
    const remainingTime = totalEstimate - completedTime;
    
    // Update time estimate display if element exists
    const timeEstimate = document.getElementById('install-time-estimate');
    if (timeEstimate) {
        if (stage === 'syncing') {
            // For syncing stage, time is shown in sync progress section
            timeEstimate.style.display = 'none';
        } else if (remainingTime > 0) {
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
        'syncing': 'sync',
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
        const stepOrder = ['env', 'pull', 'start', 'sync', 'health'];
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
                } else if (stepName === 'sync' && details.percentage !== undefined) {
                    statusText = `${details.percentage.toFixed(1)}% synced`;
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
 * Mark all installation steps as complete
 */
function markAllStepsComplete() {
    const stepElements = document.querySelectorAll('.install-step');
    stepElements.forEach(stepEl => {
        const icon = stepEl.querySelector('.install-step-icon');
        const status = stepEl.querySelector('.install-step-status');
        
        if (icon) {
            icon.innerHTML = '<span style="color: #27ae60; font-size: 24px;">✓</span>';
        }
        if (status) {
            status.textContent = 'Complete';
            status.style.color = '#27ae60';
        }
        
        stepEl.classList.remove('active', 'pending', 'failed');
        stepEl.classList.add('complete');
        stepEl.style.opacity = '0.8';
        stepEl.style.backgroundColor = 'transparent';
        stepEl.style.borderLeft = 'none';
    });
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
    
    // Mark all install steps as complete
    markAllStepsComplete();
    
    // Replace spinner with checkmark in status icon
    const statusIcon = document.querySelector('.install-status .status-icon');
    if (statusIcon) {
        statusIcon.innerHTML = '<span style="color: #27ae60; font-size: 48px;">✓</span>';
    }
    
    // Store completion data
    stateManager.set('installationComplete', {
        timestamp: new Date().toISOString(),
        validation: data.validation
    });
    
    // Add final log entry
    addToLogs('Installation completed successfully!');
    
    // Show infrastructure validation if available
    if (data.validation && data.validation.infrastructure) {
        displayInfrastructureValidation(data.validation.infrastructure, data.validation.infrastructureSummary);
    }
    
    // Enable navigation to next step
    const continueBtn = document.getElementById('install-continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.innerHTML = 'Continue to Complete <span class="btn-icon">→</span>';
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
    const continueBtn = document.getElementById('install-continue-btn');
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
    const continueBtn = document.getElementById('install-continue-btn');
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

/**
 * Show node sync strategy dialog
 * Presents user with 3 options for handling node synchronization
 * @param {Object} syncData - Sync status and options
 * @returns {Promise<string>} User's choice: 'wait', 'background', or 'skip'
 */
export function showSyncStrategyDialog(syncData) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'sync-strategy-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'sync-strategy-dialog';
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;

        // Build dialog content
        const { syncStatus, estimatedTime, options } = syncData;
        
        dialog.innerHTML = `
            <div class="sync-strategy-header">
                <div class="sync-strategy-icon">⏱️</div>
                <h2 style="margin: 16px 0 8px 0; color: #2c3e50; font-size: 24px;">
                    Node Synchronization Required
                </h2>
                <p style="color: #7f8c8d; margin: 0 0 24px 0; font-size: 14px;">
                    Your Kaspa node needs to sync with the blockchain before it can be used.
                </p>
            </div>

            <div class="sync-strategy-status" style="
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
                border-left: 4px solid #70C7BA;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #7f8c8d; font-size: 13px;">Sync Progress</span>
                    <span style="color: #2c3e50; font-weight: 600; font-size: 13px;">
                        ${syncStatus.percentage.toFixed(1)}%
                    </span>
                </div>
                <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="
                        background: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);
                        height: 100%;
                        width: ${syncStatus.percentage}%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #95a5a6;">
                    <span>Block ${syncStatus.currentBlock.toLocaleString()} of ${syncStatus.targetBlock.toLocaleString()}</span>
                    <span>${estimatedTime || 'Calculating...'}</span>
                </div>
            </div>

            <div class="sync-strategy-options" style="margin-bottom: 24px;">
                <p style="color: #2c3e50; font-weight: 600; margin-bottom: 16px; font-size: 14px;">
                    How would you like to proceed?
                </p>
                ${options.map(option => `
                    <div class="sync-strategy-option ${option.recommended ? 'recommended' : ''}" 
                         data-choice="${option.id}"
                         style="
                            border: 2px solid ${option.recommended ? '#70C7BA' : '#e0e0e0'};
                            border-radius: 8px;
                            padding: 16px;
                            margin-bottom: 12px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            position: relative;
                            background: ${option.recommended ? 'rgba(112, 199, 186, 0.05)' : 'white'};
                         "
                         onmouseover="this.style.borderColor='#70C7BA'; this.style.transform='translateX(4px)';"
                         onmouseout="this.style.borderColor='${option.recommended ? '#70C7BA' : '#e0e0e0'}'; this.style.transform='translateX(0)';">
                        ${option.recommended ? `
                            <div style="
                                position: absolute;
                                top: -10px;
                                right: 16px;
                                background: #70C7BA;
                                color: white;
                                padding: 4px 12px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 600;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            ">Recommended</div>
                        ` : ''}
                        <div style="display: flex; align-items: start;">
                            <div style="
                                width: 24px;
                                height: 24px;
                                border: 2px solid ${option.recommended ? '#70C7BA' : '#bdc3c7'};
                                border-radius: 50%;
                                margin-right: 12px;
                                flex-shrink: 0;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: white;
                            ">
                                <div class="option-radio" style="
                                    width: 12px;
                                    height: 12px;
                                    border-radius: 50%;
                                    background: ${option.recommended ? '#70C7BA' : 'transparent'};
                                    transition: background 0.2s ease;
                                "></div>
                            </div>
                            <div style="flex: 1;">
                                <div style="
                                    color: #2c3e50;
                                    font-weight: 600;
                                    margin-bottom: 4px;
                                    font-size: 15px;
                                ">${option.label}</div>
                                <div style="
                                    color: #7f8c8d;
                                    font-size: 13px;
                                    line-height: 1.5;
                                ">${option.description}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="sync-strategy-actions" style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            ">
                <button id="sync-strategy-cancel" style="
                    padding: 12px 24px;
                    border: 2px solid #e0e0e0;
                    background: white;
                    color: #7f8c8d;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                " onmouseover="this.style.borderColor='#bdc3c7';" 
                   onmouseout="this.style.borderColor='#e0e0e0';">
                    Cancel
                </button>
                <button id="sync-strategy-confirm" disabled style="
                    padding: 12px 32px;
                    border: none;
                    background: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);
                    color: white;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    opacity: 0.5;
                " onmouseover="if(!this.disabled) this.style.transform='translateY(-2px)';" 
                   onmouseout="this.style.transform='translateY(0)';">
                    Continue
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Handle option selection
        let selectedChoice = null;
        const optionElements = dialog.querySelectorAll('.sync-strategy-option');
        const confirmBtn = dialog.querySelector('#sync-strategy-confirm');

        optionElements.forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                // Deselect all options
                optionElements.forEach(el => {
                    el.style.borderColor = el.classList.contains('recommended') ? '#70C7BA' : '#e0e0e0';
                    el.style.background = el.classList.contains('recommended') ? 'rgba(112, 199, 186, 0.05)' : 'white';
                    const radio = el.querySelector('.option-radio');
                    if (radio) radio.style.background = 'transparent';
                });

                // Select clicked option
                optionEl.style.borderColor = '#70C7BA';
                optionEl.style.background = 'rgba(112, 199, 186, 0.1)';
                const radio = optionEl.querySelector('.option-radio');
                if (radio) radio.style.background = '#70C7BA';

                selectedChoice = optionEl.dataset.choice;

                // Enable confirm button
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            });
        });

        // Handle confirm
        confirmBtn.addEventListener('click', () => {
            if (selectedChoice) {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
                resolve(selectedChoice);
            }
        });

        // Handle cancel
        const cancelBtn = dialog.querySelector('#sync-strategy-cancel');
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.head.removeChild(style);
            resolve(null); // User cancelled
        });

        // Pre-select recommended option
        const recommendedOption = dialog.querySelector('.sync-strategy-option.recommended');
        if (recommendedOption) {
            recommendedOption.click();
        }
    });
}

/**
 * Handle node sync event from backend
 * Shows sync strategy dialog and sends user's choice back
 * @param {Object} data - Sync event data
 */
export async function handleNodeSyncEvent(data) {
    console.log('Node sync required:', data);

    // Show sync strategy dialog
    const choice = await showSyncStrategyDialog(data);

    if (!choice) {
        // User cancelled - show error
        showNotification('Installation cancelled', 'info');
        return;
    }

    // Store choice in state
    stateManager.set('syncStrategy', {
        choice,
        timestamp: new Date().toISOString(),
        nodeKey: data.nodeKey
    });

    // Send choice to backend via WebSocket
    if (wsManager) {
        wsManager.emit('sync:strategy-chosen', {
            choice,
            nodeKey: data.nodeKey
        });
    }

    // Update UI based on choice
    updateUIForSyncStrategy(choice, data);
}

/**
 * Update UI based on selected sync strategy
 * @param {string} strategy - Chosen strategy: 'wait', 'background', or 'skip'
 * @param {Object} syncData - Sync status data
 */
function updateUIForSyncStrategy(strategy, syncData) {
    const statusMessage = document.getElementById('install-status-message');
    
    if (strategy === 'wait') {
        if (statusMessage) {
            statusMessage.innerHTML = `
                <strong>Waiting for node synchronization...</strong><br>
                <small>This may take some time. You can see progress below.</small>
            `;
        }
        showNotification('Waiting for node to sync', 'info');
        
        // Show sync progress section
        showSyncProgressSection(syncData);
    } else if (strategy === 'background') {
        if (statusMessage) {
            statusMessage.innerHTML = `
                <strong>Node syncing in background</strong><br>
                <small>Installation will continue. Services will use public network until sync completes.</small>
            `;
        }
        showNotification('Node syncing in background', 'info');
        
        // Show background sync indicator
        showBackgroundSyncIndicator(syncData);
    } else if (strategy === 'skip') {
        if (statusMessage) {
            statusMessage.innerHTML = `
                <strong>Using public Kaspa network</strong><br>
                <small>Services will connect to public nodes.</small>
            `;
        }
        showNotification('Using public network', 'info');
    }
}

/**
 * Show sync progress section for "wait" strategy
 * @param {Object} syncData - Sync status data
 */
function showSyncProgressSection(syncData) {
    let syncSection = document.getElementById('sync-progress-section');
    
    if (!syncSection) {
        syncSection = document.createElement('div');
        syncSection.id = 'sync-progress-section';
        syncSection.className = 'sync-progress-section';
        syncSection.style.cssText = `
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #70C7BA;
        `;
        
        const installProgress = document.querySelector('.install-progress');
        if (installProgress) {
            const statusDiv = installProgress.querySelector('.install-status');
            if (statusDiv) {
                statusDiv.after(syncSection);
            }
        }
    }
    
    syncSection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #2c3e50; font-size: 16px;">
                🔄 Node Synchronization Progress
            </h3>
            <div id="sync-control-buttons" style="display: flex; gap: 8px;">
                <button id="pause-sync-btn" onclick="window.pauseSync()" style="
                    padding: 6px 12px;
                    border: 1px solid #70C7BA;
                    background: white;
                    color: #70C7BA;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
                   onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                    <span>⏸</span> Pause
                </button>
                <button id="resume-sync-btn" onclick="window.resumeSync()" style="
                    padding: 6px 12px;
                    border: 1px solid #70C7BA;
                    background: white;
                    color: #70C7BA;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: none;
                    align-items: center;
                    gap: 4px;
                " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
                   onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                    <span>▶</span> Resume
                </button>
            </div>
        </div>
        <div id="sync-progress-details">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                <span style="color: #7f8c8d;">Progress</span>
                <span id="sync-percentage" style="color: #2c3e50; font-weight: 600;">
                    ${syncData.syncStatus.percentage.toFixed(1)}%
                </span>
            </div>
            <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                <div id="sync-progress-bar" style="
                    background: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);
                    height: 100%;
                    width: ${syncData.syncStatus.percentage}%;
                    transition: width 0.5s ease;
                "></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 12px;">
                <div>
                    <div style="color: #7f8c8d; margin-bottom: 4px;">Current Block</div>
                    <div id="sync-current-block" style="color: #2c3e50; font-weight: 600;">
                        ${syncData.syncStatus.currentBlock.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style="color: #7f8c8d; margin-bottom: 4px;">Target Block</div>
                    <div id="sync-target-block" style="color: #2c3e50; font-weight: 600;">
                        ${syncData.syncStatus.targetBlock.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style="color: #7f8c8d; margin-bottom: 4px;">Blocks Remaining</div>
                    <div id="sync-blocks-remaining" style="color: #2c3e50; font-weight: 600;">
                        ${syncData.syncStatus.blocksRemaining.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div style="color: #7f8c8d; margin-bottom: 4px;">Time Remaining</div>
                    <div id="sync-time-remaining" style="color: #2c3e50; font-weight: 600;">
                        ${syncData.estimatedTime || 'Calculating...'}
                    </div>
                </div>
            </div>
            <div id="sync-status-message" style="
                padding: 8px 12px;
                background: rgba(112, 199, 186, 0.1);
                border-radius: 6px;
                font-size: 12px;
                color: #2c3e50;
                display: none;
            "></div>
        </div>
    `;
    
    syncSection.style.display = 'block';
}

/**
 * Show background sync indicator for "background" strategy
 * @param {Object} syncData - Sync status data
 */
function showBackgroundSyncIndicator(syncData) {
    let indicator = document.getElementById('background-sync-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'background-sync-indicator';
        indicator.className = 'background-sync-indicator';
        indicator.style.cssText = `
            background: linear-gradient(135deg, rgba(112, 199, 186, 0.1) 0%, rgba(73, 200, 181, 0.1) 100%);
            border: 1px solid #70C7BA;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 16px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
        `;
        
        const installProgress = document.querySelector('.install-progress');
        if (installProgress) {
            const statusDiv = installProgress.querySelector('.install-status');
            if (statusDiv) {
                statusDiv.after(indicator);
            }
        }
    }
    
    indicator.innerHTML = `
        <div id="background-sync-icon" style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        ">
            <div class="spinner-small"></div>
        </div>
        <div style="flex: 1;">
            <div id="background-sync-title" style="color: #2c3e50; font-weight: 600; margin-bottom: 2px;">
                Node syncing in background
            </div>
            <div style="color: #7f8c8d; font-size: 12px;">
                <span id="background-sync-percentage">${syncData.syncStatus.percentage.toFixed(1)}%</span> complete •
                <span id="background-sync-time">${syncData.estimatedTime || 'Calculating...'}</span> remaining
            </div>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="background-pause-btn" onclick="window.pauseBackgroundSync()" style="
                padding: 6px 12px;
                border: 1px solid #70C7BA;
                background: white;
                color: #70C7BA;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
               onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                <span>⏸</span>
            </button>
            <button id="background-resume-btn" onclick="window.resumeBackgroundSync()" style="
                padding: 6px 12px;
                border: 1px solid #70C7BA;
                background: white;
                color: #70C7BA;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: none;
                align-items: center;
                gap: 4px;
            " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
               onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                <span>▶</span>
            </button>
            <button onclick="window.showBackgroundSyncDetails()" style="
                padding: 6px 12px;
                border: 1px solid #70C7BA;
                background: white;
                color: #70C7BA;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
               onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                Details
            </button>
        </div>
    `;
    
    indicator.style.display = 'flex';
}

/**
 * Pause background sync
 */
window.pauseBackgroundSync = function() {
    console.log('Pausing background sync...');
    
    // Send pause command
    if (wsManager) {
        wsManager.emit('sync:pause');
    }
    
    // Update UI
    const pauseBtn = document.getElementById('background-pause-btn');
    const resumeBtn = document.getElementById('background-resume-btn');
    const icon = document.getElementById('background-sync-icon');
    const title = document.getElementById('background-sync-title');
    
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (resumeBtn) resumeBtn.style.display = 'flex';
    
    if (icon) {
        icon.innerHTML = '<span style="color: #f1c40f; font-size: 18px;">⏸</span>';
    }
    
    if (title) {
        title.textContent = 'Node sync paused';
    }
    
    showNotification('Background sync paused', 'info');
    stateManager.set('syncPaused', true);
};

/**
 * Resume background sync
 */
window.resumeBackgroundSync = function() {
    console.log('Resuming background sync...');
    
    // Send resume command
    if (wsManager) {
        wsManager.emit('sync:resume');
    }
    
    // Update UI
    const pauseBtn = document.getElementById('background-pause-btn');
    const resumeBtn = document.getElementById('background-resume-btn');
    const icon = document.getElementById('background-sync-icon');
    const title = document.getElementById('background-sync-title');
    
    if (pauseBtn) pauseBtn.style.display = 'flex';
    if (resumeBtn) resumeBtn.style.display = 'none';
    
    if (icon) {
        icon.innerHTML = '<div class="spinner-small"></div>';
    }
    
    if (title) {
        title.textContent = 'Node syncing in background';
    }
    
    showNotification('Background sync resumed', 'success');
    stateManager.delete('syncPaused');
};

/**
 * Update sync progress display
 * Called periodically when sync progress updates are received
 * @param {Object} syncStatus - Updated sync status
 */
export function updateSyncProgress(syncStatus) {
    // Update sync progress section (for "wait" strategy)
    const syncPercentage = document.getElementById('sync-percentage');
    if (syncPercentage) {
        syncPercentage.textContent = `${syncStatus.percentage.toFixed(1)}%`;
    }
    
    const syncProgressBar = document.getElementById('sync-progress-bar');
    if (syncProgressBar) {
        syncProgressBar.style.width = `${syncStatus.percentage}%`;
    }
    
    const syncCurrentBlock = document.getElementById('sync-current-block');
    if (syncCurrentBlock) {
        syncCurrentBlock.textContent = syncStatus.currentBlock.toLocaleString();
    }
    
    const syncTargetBlock = document.getElementById('sync-target-block');
    if (syncTargetBlock) {
        syncTargetBlock.textContent = syncStatus.targetBlock.toLocaleString();
    }
    
    const syncBlocksRemaining = document.getElementById('sync-blocks-remaining');
    if (syncBlocksRemaining) {
        syncBlocksRemaining.textContent = syncStatus.blocksRemaining.toLocaleString();
    }
    
    const syncTimeRemaining = document.getElementById('sync-time-remaining');
    if (syncTimeRemaining && syncStatus.estimatedTimeRemaining !== null) {
        syncTimeRemaining.textContent = formatSyncTime(syncStatus.estimatedTimeRemaining);
    }
    
    // Update background sync indicator (for "background" strategy)
    const backgroundSyncPercentage = document.getElementById('background-sync-percentage');
    if (backgroundSyncPercentage) {
        backgroundSyncPercentage.textContent = `${syncStatus.percentage.toFixed(1)}%`;
    }
    
    const backgroundSyncTime = document.getElementById('background-sync-time');
    if (backgroundSyncTime && syncStatus.estimatedTimeRemaining !== null) {
        backgroundSyncTime.textContent = `${formatSyncTime(syncStatus.estimatedTimeRemaining)} remaining`;
    }
}

/**
 * Format sync time in human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatSyncTime(seconds) {
    if (seconds === null || seconds === undefined) {
        return 'Calculating...';
    }
    
    if (seconds === 0) {
        return 'Complete';
    }
    
    if (seconds < 60) {
        return `${seconds} seconds`;
    }
    
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
    }
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hr` : ''}`;
}

/**
 * Handle sync complete event
 * @param {Object} data - Sync completion data
 */
export function handleSyncComplete(data) {
    console.log('Node sync complete:', data);
    
    showNotification('Node synchronization complete!', 'success');
    
    // Hide sync progress section
    const syncSection = document.getElementById('sync-progress-section');
    if (syncSection) {
        syncSection.style.display = 'none';
    }
    
    // Hide background sync indicator
    const indicator = document.getElementById('background-sync-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
    
    // Update status message
    const statusMessage = document.getElementById('install-status-message');
    if (statusMessage) {
        statusMessage.innerHTML = `
            <strong>✓ Node synchronized successfully</strong><br>
            <small>Services are now using the local node.</small>
        `;
    }
    
    // Add to logs
    addToLogs('✓ Node synchronization complete');
}

/**
 * Show background sync details dialog
 */
window.showBackgroundSyncDetails = function() {
    const syncSection = document.getElementById('sync-progress-section');
    if (syncSection) {
        syncSection.style.display = 'block';
        syncSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Create and show sync details
        const syncData = stateManager.get('syncStatus');
        if (syncData) {
            showSyncProgressSection(syncData);
        }
    }
};

/**
 * Pause node synchronization
 */
window.pauseSync = function() {
    console.log('Pausing node synchronization...');
    
    // Send pause command to backend
    if (wsManager) {
        wsManager.emit('sync:pause');
    }
    
    // Update UI
    const pauseBtn = document.getElementById('pause-sync-btn');
    const resumeBtn = document.getElementById('resume-sync-btn');
    
    if (pauseBtn) {
        pauseBtn.style.display = 'none';
    }
    if (resumeBtn) {
        resumeBtn.style.display = 'flex';
    }
    
    // Show status message
    const statusMessage = document.getElementById('sync-status-message');
    if (statusMessage) {
        statusMessage.innerHTML = '<strong>⏸ Synchronization paused</strong> - Click Resume to continue';
        statusMessage.style.display = 'block';
        statusMessage.style.background = 'rgba(241, 196, 15, 0.1)';
        statusMessage.style.borderLeft = '3px solid #f1c40f';
    }
    
    // Update progress bar to paused state
    const progressBar = document.getElementById('sync-progress-bar');
    if (progressBar) {
        progressBar.style.background = '#f1c40f';
    }
    
    showNotification('Node synchronization paused', 'info');
    addToLogs('⏸ Node synchronization paused');
    
    // Store paused state
    stateManager.set('syncPaused', true);
};

/**
 * Resume node synchronization
 */
window.resumeSync = function() {
    console.log('Resuming node synchronization...');
    
    // Send resume command to backend
    if (wsManager) {
        wsManager.emit('sync:resume');
    }
    
    // Update UI
    const pauseBtn = document.getElementById('pause-sync-btn');
    const resumeBtn = document.getElementById('resume-sync-btn');
    
    if (pauseBtn) {
        pauseBtn.style.display = 'flex';
    }
    if (resumeBtn) {
        resumeBtn.style.display = 'none';
    }
    
    // Hide status message
    const statusMessage = document.getElementById('sync-status-message');
    if (statusMessage) {
        statusMessage.style.display = 'none';
    }
    
    // Restore progress bar color
    const progressBar = document.getElementById('sync-progress-bar');
    if (progressBar) {
        progressBar.style.background = 'linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%)';
    }
    
    showNotification('Node synchronization resumed', 'success');
    addToLogs('▶ Node synchronization resumed');
    
    // Clear paused state
    stateManager.delete('syncPaused');
};

/**
 * Display infrastructure validation results
 * @param {Object} infrastructureResults - Infrastructure validation results
 * @param {Object} summary - Infrastructure validation summary
 */
export function displayInfrastructureValidation(infrastructureResults, summary) {
    console.log('Displaying infrastructure validation:', infrastructureResults, summary);
    
    // Create infrastructure validation section
    let validationSection = document.getElementById('infrastructure-validation-section');
    
    if (!validationSection) {
        validationSection = document.createElement('div');
        validationSection.id = 'infrastructure-validation-section';
        validationSection.className = 'infrastructure-validation-section';
        validationSection.style.cssText = `
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid ${getStatusColor(summary.overallStatus)};
        `;
        
        const installProgress = document.querySelector('.install-progress');
        if (installProgress) {
            installProgress.appendChild(validationSection);
        }
    }
    
    // Build validation content
    validationSection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #2c3e50; font-size: 16px;">
                ${getStatusIcon(summary.overallStatus)} Infrastructure Validation
            </h3>
            <div style="display: flex; gap: 8px;">
                ${summary.totalFailed > 0 ? `
                    <button id="retry-infrastructure-btn" onclick="window.retryInfrastructureValidation()" style="
                        padding: 6px 12px;
                        border: 1px solid #e74c3c;
                        background: white;
                        color: #e74c3c;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    " onmouseover="this.style.background='#e74c3c'; this.style.color='white';"
                       onmouseout="this.style.background='white'; this.style.color='#e74c3c';">
                        <span>🔄</span> Retry Failed
                    </button>
                ` : ''}
                <button onclick="window.toggleInfrastructureDetails()" style="
                    padding: 6px 12px;
                    border: 1px solid #70C7BA;
                    background: white;
                    color: #70C7BA;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#70C7BA'; this.style.color='white';"
                   onmouseout="this.style.background='white'; this.style.color='#70C7BA';">
                    Details
                </button>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center; padding: 12px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${summary.totalPassed}</div>
                <div style="font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Passed</div>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${summary.totalFailed}</div>
                <div style="font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Failed</div>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #f39c12;">${summary.totalWarnings}</div>
                <div style="font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Warnings</div>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #70C7BA;">${summary.passRate}%</div>
                <div style="font-size: 12px; color: #7f8c8d; text-transform: uppercase;">Pass Rate</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
            ${buildComponentStatus('nginx', summary.components.nginx, infrastructureResults.nginx)}
            ${summary.components.timescaledb.tested ? buildComponentStatus('timescaledb', summary.components.timescaledb, infrastructureResults.timescaledb) : ''}
        </div>
        
        <div id="infrastructure-details" style="display: none; margin-top: 16px;">
            ${buildInfrastructureDetails(infrastructureResults)}
        </div>
    `;
    
    validationSection.style.display = 'block';
    
    // Store validation results for retry functionality
    stateManager.set('infrastructureValidation', {
        results: infrastructureResults,
        summary: summary,
        timestamp: new Date().toISOString()
    });
    
    // Add to logs
    addToLogs(`Infrastructure validation: ${summary.overallStatus} (${summary.totalPassed}/${summary.totalTests} passed)`);
    if (summary.totalFailed > 0) {
        addToLogs(`⚠️ ${summary.totalFailed} infrastructure tests failed - see details above`);
    }
}

/**
 * Build component status display
 * @param {string} component - Component name
 * @param {Object} componentSummary - Component summary
 * @param {Object} componentResults - Component detailed results
 * @returns {string} HTML for component status
 */
function buildComponentStatus(component, componentSummary, componentResults) {
    const statusColor = componentSummary.status === 'healthy' ? '#27ae60' : '#e74c3c';
    const statusIcon = componentSummary.status === 'healthy' ? '✓' : '✗';
    
    return `
        <div style="
            background: white;
            border-radius: 6px;
            padding: 12px;
            border-left: 3px solid ${statusColor};
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #2c3e50; text-transform: capitalize;">
                    ${statusIcon} ${component}
                </div>
                <div style="font-size: 12px; color: ${statusColor}; font-weight: 600;">
                    ${componentSummary.passRate}%
                </div>
            </div>
            <div style="font-size: 12px; color: #7f8c8d;">
                ${componentResults.passed}/${componentResults.totalTests} tests passed
                ${componentResults.failed > 0 ? ` • ${componentResults.failed} failed` : ''}
                ${componentResults.warnings > 0 ? ` • ${componentResults.warnings} warnings` : ''}
            </div>
        </div>
    `;
}

/**
 * Build detailed infrastructure test results
 * @param {Object} results - Infrastructure validation results
 * @returns {string} HTML for detailed results
 */
function buildInfrastructureDetails(results) {
    let html = '';
    
    // Nginx details
    if (results.nginx.tested) {
        html += buildComponentDetails('Nginx', results.nginx);
    }
    
    // TimescaleDB details
    if (results.timescaledb.tested) {
        html += buildComponentDetails('TimescaleDB', results.timescaledb);
    }
    
    return html;
}

/**
 * Build detailed component test results
 * @param {string} componentName - Component display name
 * @param {Object} componentResults - Component test results
 * @returns {string} HTML for component details
 */
function buildComponentDetails(componentName, componentResults) {
    const tests = componentResults.tests || [];
    
    if (tests.length === 0) {
        return `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #2c3e50; margin-bottom: 12px;">${componentName} Tests</h4>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; color: #7f8c8d;">
                    No test results available
                </div>
            </div>
        `;
    }
    
    // Group tests by category
    const testsByCategory = {};
    tests.forEach(test => {
        const category = test.category || 'general';
        if (!testsByCategory[category]) {
            testsByCategory[category] = [];
        }
        testsByCategory[category].push(test);
    });
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #2c3e50; margin-bottom: 12px;">${componentName} Tests</h4>
    `;
    
    Object.entries(testsByCategory).forEach(([category, categoryTests]) => {
        html += `
            <div style="margin-bottom: 16px;">
                <h5 style="color: #7f8c8d; font-size: 13px; text-transform: uppercase; margin-bottom: 8px;">
                    ${category.replace(/([A-Z])/g, ' $1').trim()}
                </h5>
                <div style="display: flex; flex-direction: column; gap: 6px;">
        `;
        
        categoryTests.forEach(test => {
            const statusColor = getTestStatusColor(test.status);
            const statusIcon = getTestStatusIcon(test.status);
            
            html += `
                <div style="
                    display: flex;
                    align-items: flex-start;
                    padding: 8px 12px;
                    background: white;
                    border-radius: 4px;
                    border-left: 3px solid ${statusColor};
                    font-size: 13px;
                ">
                    <div style="
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 8px;
                        flex-shrink: 0;
                    ">
                        <span style="color: ${statusColor}; font-size: 14px;">${statusIcon}</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                            ${test.name}
                        </div>
                        <div style="color: #7f8c8d; margin-bottom: 4px;">
                            ${test.message}
                        </div>
                        ${test.remediation ? `
                            <div style="
                                background: rgba(231, 76, 60, 0.1);
                                padding: 6px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                color: #e74c3c;
                                margin-top: 4px;
                            ">
                                <strong>Remediation:</strong> ${test.remediation}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Get status color for overall status
 * @param {string} status - Status string
 * @returns {string} Color code
 */
function getStatusColor(status) {
    const colors = {
        'healthy': '#27ae60',
        'degraded': '#f39c12',
        'unhealthy': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
}

/**
 * Get status icon for overall status
 * @param {string} status - Status string
 * @returns {string} Icon
 */
function getStatusIcon(status) {
    const icons = {
        'healthy': '✅',
        'degraded': '⚠️',
        'unhealthy': '❌'
    };
    return icons[status] || '❓';
}

/**
 * Get test status color
 * @param {string} status - Test status
 * @returns {string} Color code
 */
function getTestStatusColor(status) {
    const colors = {
        'pass': '#27ae60',
        'fail': '#e74c3c',
        'warn': '#f39c12'
    };
    return colors[status] || '#95a5a6';
}

/**
 * Get test status icon
 * @param {string} status - Test status
 * @returns {string} Icon
 */
function getTestStatusIcon(status) {
    const icons = {
        'pass': '✓',
        'fail': '✗',
        'warn': '⚠'
    };
    return icons[status] || '?';
}

/**
 * Toggle infrastructure validation details
 */
window.toggleInfrastructureDetails = function() {
    const details = document.getElementById('infrastructure-details');
    if (!details) return;
    
    const isHidden = details.style.display === 'none';
    details.style.display = isHidden ? 'block' : 'none';
    
    // Update button text
    const button = event.target;
    if (button) {
        button.textContent = isHidden ? 'Hide Details' : 'Details';
    }
    
    // Scroll to details if showing
    if (isHidden) {
        details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

/**
 * Retry infrastructure validation
 */
window.retryInfrastructureValidation = async function() {
    console.log('Retrying infrastructure validation...');
    
    const profiles = stateManager.get('selectedProfiles');
    if (!profiles || profiles.length === 0) {
        showNotification('No profiles selected for retry', 'error');
        return;
    }
    
    // Show loading state
    const retryBtn = document.getElementById('retry-infrastructure-btn');
    if (retryBtn) {
        retryBtn.innerHTML = '<div class="spinner-small"></div> Retrying...';
        retryBtn.disabled = true;
    }
    
    try {
        // Call infrastructure validation API
        const response = await fetch('/api/infrastructure/retry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profiles: profiles,
                failedTests: [] // Retry all tests for now
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update display with new results
            displayInfrastructureValidation(data.results, data.summary);
            showNotification('Infrastructure validation retry completed', 'success');
            addToLogs('Infrastructure validation retry completed');
        } else {
            throw new Error(data.message || 'Retry failed');
        }
        
    } catch (error) {
        console.error('Infrastructure retry error:', error);
        showNotification(`Infrastructure retry failed: ${error.message}`, 'error');
        addToLogs(`❌ Infrastructure retry failed: ${error.message}`);
        
        // Restore button state
        if (retryBtn) {
            retryBtn.innerHTML = '<span>🔄</span> Retry Failed';
            retryBtn.disabled = false;
        }
    }
};

/**
 * Run infrastructure validation manually
 * @param {string[]} profiles - Selected profiles
 * @returns {Promise<Object>} Validation results
 */
export async function runInfrastructureValidation(profiles) {
    try {
        const response = await fetch('/api/infrastructure/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profiles: profiles
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                results: data.results,
                summary: data.summary
            };
        } else {
            throw new Error(data.message || 'Validation failed');
        }
        
    } catch (error) {
        console.error('Infrastructure validation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle infrastructure validation event from WebSocket
 * @param {Object} data - Infrastructure validation event data
 */
export function handleInfrastructureValidation(data) {
    console.log('Infrastructure validation event:', data);
    
    if (data.results && data.summary) {
        displayInfrastructureValidation(data.results, data.summary);
    } else if (data.error) {
        showNotification(`Infrastructure validation failed: ${data.error}`, 'error');
        addToLogs(`❌ Infrastructure validation failed: ${data.error}`);
    }
}