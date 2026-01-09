/**
 * Complete Step Module
 * Handles the completion step including validation results display
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Display validation results
 * Shows the results of service validation after installation
 */
export async function displayValidationResults() {
    const verificationStatus = document.getElementById('verification-status');
    const serviceStatusList = document.getElementById('service-status-list');
    const verificationSummary = document.getElementById('verification-summary');
    
    if (!verificationStatus || !serviceStatusList || !verificationSummary) {
        console.error('Validation result elements not found');
        return;
    }
    
    try {
        // Show loading state
        verificationStatus.style.display = 'block';
        verificationStatus.innerHTML = `
            <div class="verification-progress">
                <div class="spinner-small"></div>
                <span>Checking services...</span>
            </div>
        `;
        serviceStatusList.style.display = 'none';
        verificationSummary.style.display = 'none';
        
        // Get selected profiles from state
        const selectedProfiles = stateManager.get('selectedProfiles') || [];
        
        if (selectedProfiles.length === 0) {
            throw new Error('No profiles selected');
        }
        
        // Call validation API
        console.log('Calling validation API with profiles:', selectedProfiles);
        const apiResponse = await api.post('/install/validate', {
            profiles: selectedProfiles
        });
        console.log('Received API response:', apiResponse);
        
        // Extract validation data from nested response structure
        const validationData = {
            services: apiResponse.services.services || apiResponse.services,
            allRunning: apiResponse.services.allRunning,
            anyFailed: apiResponse.services.anyFailed,
            summary: apiResponse.services.summary,
            timestamp: apiResponse.timestamp
        };
        console.log('Processed validation data:', validationData);
        
        // Store validation results in state
        stateManager.set('validationResults', validationData);
        
        // Hide loading state
        verificationStatus.style.display = 'none';
        
        // Display service status list
        if (validationData && validationData.services) {
            console.log('Displaying service status list');
            displayServiceStatusList(validationData.services);
            serviceStatusList.style.display = 'block';
        } else {
            console.warn('No services data in validation response');
        }
        
        // Display summary
        console.log('Displaying validation summary');
        displayValidationSummary(validationData);
        verificationSummary.style.display = 'block';
        
    } catch (error) {
        console.error('Failed to validate services:', error);
        verificationStatus.innerHTML = `
            <div class="verification-error">
                <span class="error-icon">⚠️</span>
                <span>Failed to validate services: ${error.message}</span>
                <button class="btn-text" onclick="window.retryValidation()">
                    <span class="btn-icon">🔄</span> Retry
                </button>
            </div>
        `;
        showNotification('Failed to validate services', 'error');
    }
}

/**
 * Display service status list
 * @param {Object} services - Service status data
 */
function displayServiceStatusList(services) {
    const serviceStatusList = document.getElementById('service-status-list');
    
    if (!serviceStatusList) {
        return;
    }
    
    // Clear existing content
    serviceStatusList.innerHTML = '';
    
    // Create service status items
    const serviceEntries = Object.entries(services);
    
    if (serviceEntries.length === 0) {
        serviceStatusList.innerHTML = '<p class="no-services">No services to display</p>';
        return;
    }
    
    serviceEntries.forEach(([serviceName, status]) => {
        const serviceItem = createServiceStatusItem(serviceName, status);
        serviceStatusList.appendChild(serviceItem);
    });
}

/**
 * Create a service status item element
 * @param {string} serviceName - Name of the service
 * @param {Object} status - Service status data
 * @returns {HTMLElement} Service status item element
 */
function createServiceStatusItem(serviceName, status) {
    const item = document.createElement('div');
    item.className = 'service-status-item';
    
    // Determine status class and icon
    let statusClass = 'unknown';
    let statusIcon = '❓';
    let statusText = 'Unknown';
    
    if (!status.exists) {
        statusClass = 'missing';
        statusIcon = '⚠️';
        statusText = 'Not Found';
    } else if (status.running) {
        statusClass = 'running';
        statusIcon = '✓';
        statusText = 'Running';
    } else {
        statusClass = 'stopped';
        statusIcon = '⏸️';
        statusText = 'Stopped';
    }
    
    item.classList.add(`status-${statusClass}`);
    
    // Format service name for display
    const displayName = formatServiceName(serviceName);
    
    item.innerHTML = `
        <div class="service-status-icon">${statusIcon}</div>
        <div class="service-status-content">
            <h4 class="service-status-name">${displayName}</h4>
            <p class="service-status-text">${statusText}</p>
            ${status.health ? `<p class="service-health">${status.health}</p>` : ''}
        </div>
        <div class="service-status-badge ${statusClass}">${statusText}</div>
    `;
    
    return item;
}

/**
 * Format service name for display
 * @param {string} serviceName - Raw service name
 * @returns {string} Formatted service name
 */
function formatServiceName(serviceName) {
    // Convert kebab-case to Title Case
    return serviceName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Display validation summary
 * @param {Object} validationData - Complete validation data
 */
function displayValidationSummary(validationData) {
    const verificationSummary = document.getElementById('verification-summary');
    
    if (!verificationSummary) {
        return;
    }
    
    const { allRunning, anyFailed, summary } = validationData;
    
    // Clear existing content
    verificationSummary.innerHTML = '';
    
    // Determine overall status
    let summaryClass = 'success';
    let summaryIcon = '✓';
    let summaryText = 'All services healthy';
    
    if (anyFailed) {
        summaryClass = 'warning';
        summaryIcon = '⚠️';
        summaryText = 'Some services need attention';
    } else if (!allRunning) {
        summaryClass = 'info';
        summaryIcon = 'ℹ️';
        summaryText = 'Services are starting up';
    }
    
    // Create summary badge
    const summaryBadge = document.createElement('div');
    summaryBadge.className = `summary-badge ${summaryClass}`;
    summaryBadge.innerHTML = `
        <span class="badge-icon">${summaryIcon}</span>
        <span class="badge-text">${summaryText}</span>
    `;
    
    verificationSummary.appendChild(summaryBadge);
    
    // Create summary stats
    if (summary) {
        const summaryStats = document.createElement('div');
        summaryStats.className = 'summary-stats';
        summaryStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total:</span>
                <span class="stat-value">${summary.total}</span>
            </div>
            <div class="stat-item stat-success">
                <span class="stat-label">Running:</span>
                <span class="stat-value">${summary.running}</span>
            </div>
            ${summary.stopped > 0 ? `
                <div class="stat-item stat-warning">
                    <span class="stat-label">Stopped:</span>
                    <span class="stat-value">${summary.stopped}</span>
                </div>
            ` : ''}
            ${summary.missing > 0 ? `
                <div class="stat-item stat-error">
                    <span class="stat-label">Missing:</span>
                    <span class="stat-value">${summary.missing}</span>
                </div>
            ` : ''}
        `;
        
        verificationSummary.appendChild(summaryStats);
    }
}

/**
 * Retry validation
 * Re-runs the validation check
 */
export async function retryValidation() {
    await displayValidationResults();
}

/**
 * Run service verification
 * Wrapper function for button onclick
 */
export async function runServiceVerification() {
    await displayValidationResults();
}

/**
 * Check sync status of Kaspa node
 * Fetches and displays the current blockchain sync progress
 */
export async function checkSyncStatus() {
    try {
        console.log('Checking sync status...');
        showNotification('Checking sync status...', 'info');
        
        // Get kaspa-node status
        const status = await api.get('/install/status/kaspa-node');
        console.log('Received status:', status);
        
        if (!status) {
            console.warn('No status data received');
            showNotification('Unable to get node status', 'warning');
            return;
        }
        
        if (!status.exists) {
            console.warn('Node does not exist');
            showNotification('Kaspa node container not found', 'warning');
            return;
        }
        
        if (!status.running) {
            console.warn('Node is not running');
            showNotification('Kaspa node is not running', 'warning');
            return;
        }
        
        // Try to get detailed sync info from the node
        // This would require additional API endpoints to query the node
        // For now, show basic status
        const state = status.state || 'unknown';
        console.log('Node state:', state);
        showNotification(`Kaspa node is ${state}. Check dashboard for detailed sync progress.`, 'success');
        
    } catch (error) {
        console.error('Failed to check sync status:', error);
        showNotification(`Failed to check sync status: ${error.message}`, 'error');
    }
}

/**
 * View logs for a specific service
 * Opens a modal with service logs
 * @param {string} serviceName - Name of the service (optional)
 */
export async function viewLogs(serviceName = null) {
    try {
        // If no service specified, show service selector
        if (!serviceName) {
            const validationResults = stateManager.get('validationResults');
            if (!validationResults || !validationResults.services) {
                showNotification('No services available', 'warning');
                return;
            }
            
            // Get list of running services
            const runningServices = Object.entries(validationResults.services)
                .filter(([_, status]) => status.exists)
                .map(([name, _]) => name);
            
            if (runningServices.length === 0) {
                showNotification('No services are running', 'warning');
                return;
            }
            
            // For now, show the first service's logs
            // In a full implementation, this would show a service selector modal
            serviceName = runningServices[0];
        }
        
        showNotification(`Loading logs for ${serviceName}...`, 'info');
        
        const logData = await api.get(`/install/logs/${serviceName}?lines=100`);
        
        // Create and show logs modal
        showLogsModal(serviceName, logData.logs || []);
        
    } catch (error) {
        console.error('Failed to view logs:', error);
        showNotification('Failed to load logs. Please check the dashboard.', 'error');
    }
}

/**
 * Show logs modal
 * @param {string} serviceName - Name of the service
 * @param {Array} logs - Array of log lines
 */
function showLogsModal(serviceName, logs) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
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
        padding: 20px;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'logs-modal';
    modal.style.cssText = `
        background: var(--bg-primary, #1a1a1a);
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;
    
    // Modal header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color, #333);
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; color: var(--text-primary, #fff); font-size: 18px;">
            📝 ${formatServiceName(serviceName)} Logs
        </h3>
        <button class="close-modal-btn" style="
            background: none;
            border: none;
            color: var(--text-secondary, #999);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        ">×</button>
    `;
    
    // Modal body
    const body = document.createElement('div');
    body.style.cssText = `
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
    `;
    
    // Logs container
    const logsContainer = document.createElement('pre');
    logsContainer.style.cssText = `
        background: var(--bg-secondary, #0a0a0a);
        border: 1px solid var(--border-color, #333);
        border-radius: 8px;
        padding: 16px;
        margin: 0;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-secondary, #ccc);
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
    `;
    
    if (logs.length === 0) {
        logsContainer.textContent = 'No logs available';
    } else {
        logsContainer.textContent = logs.join('\n');
    }
    
    body.appendChild(logsContainer);
    
    // Modal footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 16px 24px;
        border-top: 1px solid var(--border-color, #333);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    `;
    footer.innerHTML = `
        <button class="btn-secondary close-modal-btn">Close</button>
    `;
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Add close handlers
    const closeButtons = overlay.querySelectorAll('.close-modal-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // Add to DOM
    document.body.appendChild(overlay);
}

/**
 * Show service management guide
 * Displays information about managing services
 */
export function showServiceManagementGuide() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
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
        padding: 20px;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'guide-modal';
    modal.style.cssText = `
        background: var(--bg-primary, #1a1a1a);
        border-radius: 12px;
        max-width: 700px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;
    
    modal.innerHTML = `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--text-primary, #fff); font-size: 20px;">
                    🔧 Service Management Guide
                </h3>
                <button class="close-modal-btn" style="
                    background: none;
                    border: none;
                    color: var(--text-secondary, #999);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                ">×</button>
            </div>
            
            <div style="color: var(--text-secondary, #ccc); line-height: 1.6;">
                <h4 style="color: var(--text-primary, #fff); margin-top: 0;">Using Docker Compose</h4>
                <p>All services are managed through Docker Compose. Here are the most common commands:</p>
                
                <div style="background: var(--bg-secondary, #0a0a0a); border: 1px solid var(--border-color, #333); border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h5 style="margin-top: 0; color: var(--text-primary, #fff);">View Service Status</h5>
                    <code style="display: block; font-family: monospace; color: var(--primary-color, #70c7ba);">
                        docker compose ps
                    </code>
                </div>
                
                <div style="background: var(--bg-secondary, #0a0a0a); border: 1px solid var(--border-color, #333); border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h5 style="margin-top: 0; color: var(--text-primary, #fff);">View Service Logs</h5>
                    <code style="display: block; font-family: monospace; color: var(--primary-color, #70c7ba); margin-bottom: 8px;">
                        docker compose logs [service-name]
                    </code>
                    <p style="margin: 8px 0 0 0; font-size: 14px;">
                        Example: <code style="color: var(--primary-color, #70c7ba);">docker compose logs kaspa-node</code>
                    </p>
                </div>
                
                <div style="background: var(--bg-secondary, #0a0a0a); border: 1px solid var(--border-color, #333); border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h5 style="margin-top: 0; color: var(--text-primary, #fff);">Restart a Service</h5>
                    <code style="display: block; font-family: monospace; color: var(--primary-color, #70c7ba); margin-bottom: 8px;">
                        docker compose restart [service-name]
                    </code>
                    <p style="margin: 8px 0 0 0; font-size: 14px;">
                        Example: <code style="color: var(--primary-color, #70c7ba);">docker compose restart dashboard</code>
                    </p>
                </div>
                
                <div style="background: var(--bg-secondary, #0a0a0a); border: 1px solid var(--border-color, #333); border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h5 style="margin-top: 0; color: var(--text-primary, #fff);">Stop All Services</h5>
                    <code style="display: block; font-family: monospace; color: var(--primary-color, #70c7ba);">
                        docker compose down
                    </code>
                </div>
                
                <div style="background: var(--bg-secondary, #0a0a0a); border: 1px solid var(--border-color, #333); border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h5 style="margin-top: 0; color: var(--text-primary, #fff);">Start All Services</h5>
                    <code style="display: block; font-family: monospace; color: var(--primary-color, #70c7ba);">
                        docker compose up -d
                    </code>
                </div>
                
                <h4 style="color: var(--text-primary, #fff); margin-top: 24px;">Using the Dashboard</h4>
                <p>The dashboard provides a web interface for monitoring and managing services:</p>
                <ul style="margin: 12px 0; padding-left: 24px;">
                    <li>View real-time service status</li>
                    <li>Monitor resource usage</li>
                    <li>Check sync progress</li>
                    <li>View service logs</li>
                    <li>Restart services</li>
                </ul>
                
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color, #333);">
                    <button class="btn-primary" onclick="window.openDashboard()" style="width: 100%;">
                        Open Dashboard →
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add close handler
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * Open dashboard in new tab
 * Automatically starts dashboard if not running, then opens it
 */
export async function openDashboard() {
    try {
        // Dashboard runs on port 8080 as a Node service
        const dashboardUrl = 'http://localhost:8080';
        
        // Check if dashboard is accessible
        showNotification('Checking dashboard status...', 'info');
        
        const isDashboardRunning = await checkDashboardStatus();
        
        if (isDashboardRunning) {
            // Dashboard is running - open it in new window
            showNotification('Opening dashboard...', 'success');
            window.open(dashboardUrl, '_blank');
        } else {
            // Dashboard is not running, start it
            showNotification('Dashboard not running. Starting dashboard service...', 'info');
            
            try {
                // Call backend API to start dashboard service
                const startResponse = await fetch('/api/dashboard/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await startResponse.json();
                
                if (result.success) {
                    showNotification('Dashboard starting... Please wait...', 'info');
                    
                    // Wait for dashboard to be ready
                    const isReady = await waitForDashboardReady();
                    
                    if (isReady) {
                        showNotification('Dashboard started successfully! Opening...', 'success');
                        window.open(dashboardUrl, '_blank');
                    } else {
                        showNotification('Dashboard failed to start within 30 seconds. Please start it manually: npm start in services/dashboard', 'error', 10000);
                    }
                } else {
                    showNotification('Failed to start dashboard. Please start it manually: npm start in services/dashboard', 'error', 10000);
                }
                
            } catch (startError) {
                console.error('Error starting dashboard:', startError);
                showNotification('Failed to start dashboard. Please start it manually: npm start in services/dashboard', 'error', 10000);
            }
        }
        
    } catch (error) {
        console.error('Error checking dashboard:', error);
        showNotification('Error checking dashboard status', 'error');
    }
}

/**
 * Check if dashboard is running
 * @returns {Promise<boolean>} True if dashboard is accessible
 */
async function checkDashboardStatus() {
    try {
        const response = await fetch('http://localhost:8080/health', {
            method: 'GET',
            timeout: 3000
        });
        return response.ok;
    } catch (error) {
        console.log('Dashboard service not accessible:', error.message);
        return false;
    }
}

/**
 * Wait for dashboard to be ready
 * @returns {Promise<boolean>} True if dashboard becomes ready
 */
async function waitForDashboardReady() {
    const maxAttempts = 30;
    const delayMs = 1000;
    
    for (let i = 0; i < maxAttempts; i++) {
        const isReady = await checkDashboardStatus();
        if (isReady) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    return false;
}

/**
 * Show resources modal with documentation and learning materials
 */
export function showResourcesModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
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
        padding: 20px;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'resources-modal';
    modal.style.cssText = `
        background: var(--bg-primary, #1a1a1a);
        border-radius: 12px;
        max-width: 800px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;
    
    modal.innerHTML = `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--text-primary, #fff); font-size: 20px;">
                    📚 Resources & Documentation
                </h3>
                <button class="close-modal-btn" style="
                    background: none;
                    border: none;
                    color: var(--text-secondary, #999);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                ">×</button>
            </div>
            
            <div style="color: var(--text-secondary, #ccc); line-height: 1.6;">
                <h4 style="color: var(--text-primary, #fff); margin-top: 0;">📖 Documentation</h4>
                <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                    <a href="https://kaspa.org/docs" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">📘</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Official Documentation</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Complete guides and API references</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                    
                    <a href="./QUICK_START.md" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">⚡</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Quick Start Guide</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Get up and running quickly</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                    
                    <a href="./README.md" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">📄</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Project README</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Overview and architecture</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                </div>
                
                <h4 style="color: var(--text-primary, #fff); margin-top: 24px;">💬 Community</h4>
                <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                    <a href="https://discord.com/invite/ssB46MXzRU" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">💬</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Discord Community</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Get help and connect with others</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                    
                    <a href="https://github.com/kaspanet" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">🐙</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">GitHub Repository</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Source code and issue tracking</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                    
                    <a href="https://kaspa.org" target="_blank" class="resource-link" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        text-decoration: none;
                        color: var(--text-primary, #fff);
                        transition: all 0.2s;
                    ">
                        <span style="font-size: 24px;">🌐</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Kaspa Website</div>
                            <div style="font-size: 14px; color: var(--text-secondary, #999);">Official project website</div>
                        </div>
                        <span style="color: var(--primary-color, #70c7ba);">→</span>
                    </a>
                </div>
                
                <h4 style="color: var(--text-primary, #fff); margin-top: 24px;">🎓 Learning Resources</h4>
                <div style="display: grid; gap: 12px;">
                    <div style="
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                    ">
                        <div style="font-weight: 600; margin-bottom: 4px;">📹 Video Tutorials</div>
                        <div style="font-size: 14px; color: var(--text-secondary, #999);">Coming soon - Step-by-step video guides</div>
                    </div>
                    
                    <div style="
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                    ">
                        <div style="font-weight: 600; margin-bottom: 4px;">🔧 Troubleshooting Guide</div>
                        <div style="font-size: 14px; color: var(--text-secondary, #999);">Common issues and solutions</div>
                    </div>
                    
                    <div style="
                        padding: 12px 16px;
                        background: var(--bg-secondary, #0a0a0a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                    ">
                        <div style="font-weight: 600; margin-bottom: 4px;">💡 Best Practices</div>
                        <div style="font-size: 14px; color: var(--text-secondary, #999);">Tips for optimal performance</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add close handler
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // Add hover effects to resource links
    const resourceLinks = modal.querySelectorAll('.resource-link');
    resourceLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.borderColor = 'var(--primary-color, #70c7ba)';
            link.style.transform = 'translateX(4px)';
        });
        link.addEventListener('mouseleave', () => {
            link.style.borderColor = 'var(--border-color, #333)';
            link.style.transform = 'translateX(0)';
        });
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * Start interactive tour of the complete step
 */
export function startTour() {
    // Hide tour prompt
    const tourPrompt = document.querySelector('.tour-prompt');
    if (tourPrompt) {
        tourPrompt.style.display = 'none';
    }
    
    // Store tour state
    stateManager.set('tourStarted', true);
    
    // Show tour introduction
    showNotification('Starting tour...', 'info');
    
    // Create tour overlay
    const overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    // Tour steps
    const tourSteps = [
        {
            title: '✓ Service Verification',
            description: 'This section shows the status of all your installed services. Green means running, orange means stopped, and red means there\'s an issue.',
            target: '#service-verification',
            action: 'Next'
        },
        {
            title: '🚀 Getting Started',
            description: 'Here you\'ll find guides for common tasks like monitoring your system, managing services, and learning more about Kaspa.',
            target: '#getting-started',
            action: 'Next'
        },
        {
            title: '📊 Dashboard',
            description: 'The dashboard is your control center. Use it to monitor services, check sync progress, view logs, and manage your system.',
            target: null,
            action: 'Open Dashboard'
        }
    ];
    
    let currentStep = 0;
    
    function showTourStep(stepIndex) {
        if (stepIndex >= tourSteps.length) {
            // Tour complete
            document.body.removeChild(overlay);
            showNotification('Tour complete! 🎉', 'success');
            return;
        }
        
        const step = tourSteps[stepIndex];
        
        // Highlight target element
        if (step.target) {
            const targetElement = document.querySelector(step.target);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.style.position = 'relative';
                targetElement.style.zIndex = '10000';
                targetElement.style.boxShadow = '0 0 0 4px var(--primary-color, #70c7ba)';
                targetElement.style.borderRadius = '8px';
            }
        }
        
        // Create tour card
        overlay.innerHTML = `
            <div class="tour-card" style="
                background: var(--bg-primary, #1a1a1a);
                border-radius: 12px;
                padding: 32px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                text-align: center;
            ">
                <h3 style="margin: 0 0 16px 0; color: var(--text-primary, #fff); font-size: 24px;">
                    ${step.title}
                </h3>
                <p style="margin: 0 0 24px 0; color: var(--text-secondary, #ccc); font-size: 16px; line-height: 1.6;">
                    ${step.description}
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-secondary skip-tour-btn">Skip Tour</button>
                    <button class="btn-primary next-step-btn">${step.action}</button>
                </div>
                <div style="margin-top: 16px; color: var(--text-secondary, #999); font-size: 14px;">
                    Step ${stepIndex + 1} of ${tourSteps.length}
                </div>
            </div>
        `;
        
        // Add event listeners
        const skipBtn = overlay.querySelector('.skip-tour-btn');
        const nextBtn = overlay.querySelector('.next-step-btn');
        
        skipBtn.addEventListener('click', () => {
            // Remove highlight
            if (step.target) {
                const targetElement = document.querySelector(step.target);
                if (targetElement) {
                    targetElement.style.position = '';
                    targetElement.style.zIndex = '';
                    targetElement.style.boxShadow = '';
                }
            }
            document.body.removeChild(overlay);
            showNotification('Tour skipped', 'info');
        });
        
        nextBtn.addEventListener('click', () => {
            // Remove highlight
            if (step.target) {
                const targetElement = document.querySelector(step.target);
                if (targetElement) {
                    targetElement.style.position = '';
                    targetElement.style.zIndex = '';
                    targetElement.style.boxShadow = '';
                }
            }
            
            // Last step opens dashboard
            if (stepIndex === tourSteps.length - 1) {
                document.body.removeChild(overlay);
                openDashboard();
            } else {
                showTourStep(stepIndex + 1);
            }
        });
    }
    
    document.body.appendChild(overlay);
    showTourStep(0);
}

/**
 * Skip the tour
 */
export function skipTour() {
    const tourPrompt = document.querySelector('.tour-prompt');
    if (tourPrompt) {
        tourPrompt.style.display = 'none';
    }
    stateManager.set('tourSkipped', true);
    showNotification('You can always access help from the dashboard', 'info');
}

/**
 * Start dashboard-specific tour
 */
export function startDashboardTour() {
    showNotification('Opening dashboard with tour...', 'info');
    // Open dashboard and set tour flag
    stateManager.set('dashboardTourRequested', true);
    openDashboard();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.retryValidation = retryValidation;
    window.runServiceVerification = runServiceVerification;
    window.checkSyncStatus = checkSyncStatus;
    window.viewLogs = viewLogs;
    window.showServiceManagementGuide = showServiceManagementGuide;
    window.openDashboard = openDashboard;
    window.showResourcesModal = showResourcesModal;
    window.startTour = startTour;
    window.skipTour = skipTour;
    window.startDashboardTour = startDashboardTour;
}
/**
 * Copy dashboard URL to clipboard
 */
export function copyDashboardUrl() {
    const urlInput = document.getElementById('dashboard-url');
    if (!urlInput) {
        showNotification('Unable to copy URL', 'error');
        return;
    }
    
    try {
        // Select and copy the URL
        urlInput.select();
        urlInput.setSelectionRange(0, 99999); // For mobile devices
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                showNotification('Dashboard URL copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback to execCommand
                document.execCommand('copy');
                showNotification('Dashboard URL copied to clipboard!', 'success');
            });
        } else {
            // Fallback to execCommand
            document.execCommand('copy');
            showNotification('Dashboard URL copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Failed to copy URL:', error);
        showNotification('Failed to copy URL. Please copy manually.', 'error');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.copyDashboardUrl = copyDashboardUrl;
}
/**
 * Handle completion navigation - either return to previous page or go to dashboard
 */
export async function handleCompletionNavigation() {
    try {
        // Import launch context module
        const { getReturnUrl, navigateToReturnUrl } = await import('./launch-context.js');
        
        // Check if we have a return URL
        const returnUrl = getReturnUrl();
        
        if (returnUrl) {
            // Navigate back to the return URL (likely Dashboard)
            showNotification('Returning to previous page...', 'info');
            const navigated = navigateToReturnUrl();
            
            if (!navigated) {
                // Fallback to dashboard if navigation failed
                window.location.href = 'http://localhost:8080';
            }
        } else {
            // No return URL, go to dashboard
            window.location.href = 'http://localhost:8080';
        }
    } catch (error) {
        console.error('Error handling completion navigation:', error);
        // Fallback to dashboard
        window.location.href = 'http://localhost:8080';
    }
}

/**
 * Initialize completion page with context-aware navigation
 */
export function initializeCompletionPage() {
    try {
        // Import launch context module and check for return URL
        import('./launch-context.js').then(({ getReturnUrl }) => {
            const returnUrl = getReturnUrl();
            const navText = document.getElementById('completion-nav-text');
            
            if (returnUrl && navText) {
                // Update button text to indicate return navigation
                navText.textContent = 'Return to Dashboard';
            }
        }).catch(error => {
            console.warn('Could not load launch context:', error);
        });
    } catch (error) {
        console.warn('Error initializing completion page:', error);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.handleCompletionNavigation = handleCompletionNavigation;
    window.initializeCompletionPage = initializeCompletionPage;
}