/**
 * System Check Module
 * Handles Step 3: System Requirements Check
 * Runs comprehensive system validation and displays results
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';
import { setStepButtonEnabled } from './navigation-footer.js';

/**
 * Run full system check
 */
export async function runFullSystemCheck() {
    console.log('Running full system check...');
    
    try {
        // Get required ports (excluding 3000 since wizard uses it, and 8080 since Dashboard uses it)
        // Updated for Database-Per-Service Architecture: 5433 (k-social-db), 5434 (simply-kaspa-db)
        const requiredPorts = [16110, 16111, 5433, 5434];
        
        // Call backend API
        const results = await api.get(`/system-check?ports=${requiredPorts.join(',')}`);
        
        console.log('System check results:', results);
        
        // Store results in state
        stateManager.set('systemCheckResults', results);
        
        // Update check items
        await updateCheckItem('docker', results.docker);
        await updateCheckItem('compose', results.dockerCompose);
        await updateCheckItem('resources', results.resources);
        await updateCheckItem('ports', results.ports);
        
        // Determine if we can proceed
        const canProceed = results.summary?.canProceed !== false;
        updateContinueButton(canProceed, results.summary?.message);
        
        // Show summary notification
        if (canProceed) {
            showNotification('System check passed! Ready to proceed.', 'success', 3000);
        } else {
            showNotification('System check found issues. Please review below.', 'warning', 5000);
        }
        
        return results;
    } catch (error) {
        console.error('System check failed:', error);
        showNotification('System check failed. Please try again.', 'error');
        
        // Show error state for all items
        showAllChecksFailed(error);
        
        throw error;
    }
}

/**
 * Update a check item with results
 */
async function updateCheckItem(checkId, data) {
    const checkItems = document.querySelectorAll('.check-item');
    let checkItem = null;
    
    // Find the check item by title
    const titleMap = {
        'docker': 'Docker Installation',
        'compose': 'Docker Compose',
        'resources': 'System Resources',
        'ports': 'Port Availability'
    };
    
    const targetTitle = titleMap[checkId];
    
    for (const item of checkItems) {
        const title = item.querySelector('.check-title');
        if (title && title.textContent.trim() === targetTitle) {
            checkItem = item;
            break;
        }
    }
    
    if (!checkItem) {
        console.warn(`Check item not found: ${checkId}`);
        return;
    }
    
    // Determine status
    let status, icon, message, details;
    
    switch (checkId) {
        case 'docker':
            status = data.installed ? 'success' : 'error';
            icon = data.installed ? '✅' : '❌';
            message = data.message;
            details = data.installed 
                ? `Docker ${data.version} is installed and ready`
                : `Docker is not installed. ${data.remediation || 'Please install Docker to continue.'}`;
            break;
            
        case 'compose':
            status = data.installed ? 'success' : 'error';
            icon = data.installed ? '✅' : '❌';
            message = data.message;
            details = data.installed
                ? `Docker Compose ${data.version} is installed and ready`
                : `Docker Compose is not installed. ${data.remediation || 'Please install Docker Compose to continue.'}`;
            break;
            
        case 'resources':
            status = getResourcesStatus(data);
            icon = getResourcesIcon(status);
            message = getResourcesMessage(data);
            details = getResourcesDetails(data);
            break;
            
        case 'ports':
            status = getPortsStatus(data);
            icon = getPortsIcon(status);
            message = getPortsMessage(data);
            details = getPortsDetails(data);
            break;
    }
    
    // Update UI
    updateCheckItemUI(checkItem, status, icon, message, details);
    
    // Store in state
    stateManager.update('systemCheck', {
        [checkId]: { status, data }
    });
}

/**
 * Update check item UI
 */
function updateCheckItemUI(checkItem, status, icon, message, details) {
    // Remove checking state
    checkItem.classList.remove('checking');
    
    // Add status class
    checkItem.classList.remove('success', 'warning', 'error');
    checkItem.classList.add(status);
    
    // Update icon
    const iconElement = checkItem.querySelector('.check-icon');
    if (iconElement) {
        // Remove spinner
        const spinner = iconElement.querySelector('.spinner');
        if (spinner) {
            spinner.remove();
        }
        
        // Add status icon
        iconElement.innerHTML = `<div class="status-icon-large">${icon}</div>`;
    }
    
    // Update message
    const messageElement = checkItem.querySelector('.check-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Update status text
    const statusElement = checkItem.querySelector('.check-status');
    if (statusElement) {
        const statusText = {
            'success': 'Passed',
            'warning': 'Warning',
            'error': 'Failed'
        };
        statusElement.textContent = statusText[status] || 'Unknown';
    }
    
    // Add details if provided
    if (details) {
        addCheckDetails(checkItem, details, status);
    }
}

/**
 * Add details section to check item
 */
function addCheckDetails(checkItem, details, status) {
    // Remove existing details
    const existingDetails = checkItem.querySelector('.check-details');
    if (existingDetails) {
        existingDetails.remove();
    }
    
    // Create details element
    const detailsElement = document.createElement('div');
    detailsElement.className = `check-details check-details-${status}`;
    detailsElement.innerHTML = details;
    
    // Insert after check-content
    const checkContent = checkItem.querySelector('.check-content');
    if (checkContent) {
        checkContent.insertAdjacentElement('afterend', detailsElement);
    }
}

/**
 * Get resources status
 */
function getResourcesStatus(resources) {
    const memoryOk = resources.memory.meetsMinimum;
    const cpuOk = resources.cpu.meetsMinimum;
    const diskOk = resources.disk?.meetsMinimum !== false;
    
    if (memoryOk && cpuOk && diskOk) {
        return 'success';
    } else if (!memoryOk || !cpuOk) {
        return 'error';
    } else {
        return 'warning';
    }
}

/**
 * Get resources icon
 */
function getResourcesIcon(status) {
    const icons = {
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    return icons[status] || '❓';
}

/**
 * Get resources message
 */
function getResourcesMessage(resources) {
    const memoryOk = resources.memory.meetsMinimum;
    const cpuOk = resources.cpu.meetsMinimum;
    const diskOk = resources.disk?.meetsMinimum !== false;
    
    if (memoryOk && cpuOk && diskOk) {
        return 'System resources meet all requirements';
    } else if (!memoryOk || !cpuOk) {
        return 'System resources below minimum requirements';
    } else {
        return 'System resources meet minimum requirements with warnings';
    }
}

/**
 * Get resources details
 */
function getResourcesDetails(resources) {
    const items = [];
    
    // CPU
    const cpuIcon = resources.cpu.meetsMinimum ? '✅' : '❌';
    items.push(`
        <div class="detail-item">
            <span class="detail-icon">${cpuIcon}</span>
            <span class="detail-label">CPU:</span>
            <span class="detail-value">${resources.cpu.count} cores</span>
            <span class="detail-note">${resources.cpu.message}</span>
        </div>
    `);
    
    // Memory
    const memoryIcon = resources.memory.meetsMinimum ? '✅' : '❌';
    items.push(`
        <div class="detail-item">
            <span class="detail-icon">${memoryIcon}</span>
            <span class="detail-label">RAM:</span>
            <span class="detail-value">${resources.memory.totalGB} GB total (${resources.memory.freeGB} GB free)</span>
            <span class="detail-note">${resources.memory.message}</span>
        </div>
    `);
    
    // Disk
    if (resources.disk) {
        const diskIcon = resources.disk.meetsMinimum ? '✅' : '⚠️';
        items.push(`
            <div class="detail-item">
                <span class="detail-icon">${diskIcon}</span>
                <span class="detail-label">Disk:</span>
                <span class="detail-value">${resources.disk.availableGB} GB available</span>
                <span class="detail-note">${resources.disk.message}</span>
            </div>
        `);
    }
    
    return items.join('');
}

/**
 * Get ports status
 */
function getPortsStatus(ports) {
    const portEntries = Object.entries(ports);
    if (portEntries.length === 0) return 'success';
    
    const allAvailable = portEntries.every(([_, status]) => status.available);
    const someUnavailable = portEntries.some(([_, status]) => !status.available);
    
    if (allAvailable) {
        return 'success';
    } else if (someUnavailable) {
        return 'warning';
    } else {
        return 'success';
    }
}

/**
 * Get ports icon
 */
function getPortsIcon(status) {
    const icons = {
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    return icons[status] || '❓';
}

/**
 * Get ports message
 */
function getPortsMessage(ports) {
    const portEntries = Object.entries(ports);
    if (portEntries.length === 0) return 'No ports to check';
    
    const allAvailable = portEntries.every(([_, status]) => status.available);
    const unavailableCount = portEntries.filter(([_, status]) => !status.available).length;
    
    if (allAvailable) {
        return 'All required ports are available';
    } else {
        return `${unavailableCount} port${unavailableCount > 1 ? 's' : ''} in use (may cause conflicts)`;
    }
}

/**
 * Get ports details
 */
function getPortsDetails(ports) {
    const portEntries = Object.entries(ports);
    if (portEntries.length === 0) {
        return '<p class="detail-note">No ports to check</p>';
    }
    
    // Port descriptions
    const portDescriptions = {
        5433: 'K-Social Database',
        5434: 'Simply Kaspa Database',
        16110: 'Kaspa Node (P2P)',
        16111: 'Kaspa Node (RPC)'
    };
    
    const items = portEntries.map(([port, status]) => {
        const icon = status.available ? '✅' : '⚠️';
        const className = status.available ? 'detail-item-success' : 'detail-item-warning';
        const description = portDescriptions[port] ? ` (${portDescriptions[port]})` : '';
        return `
            <div class="detail-item ${className}">
                <span class="detail-icon">${icon}</span>
                <span class="detail-label">Port ${port}${description}:</span>
                <span class="detail-value">${status.message}</span>
            </div>
        `;
    });
    
    return items.join('');
}

/**
 * Update continue button
 */
function updateContinueButton(canProceed, message) {
    // Use the navigation footer function to enable/disable the button
    setStepButtonEnabled('system-check-continue', canProceed, message || '');
    
    console.log(`[SYSTEM-CHECK] Continue button ${canProceed ? 'enabled' : 'disabled'}`);
}

/**
 * Show all checks failed
 */
function showAllChecksFailed(error) {
    const checkItems = document.querySelectorAll('.check-item');
    
    checkItems.forEach(checkItem => {
        // Remove checking state
        checkItem.classList.remove('checking');
        checkItem.classList.add('error');
        
        // Update icon
        const iconElement = checkItem.querySelector('.check-icon');
        if (iconElement) {
            const spinner = iconElement.querySelector('.spinner');
            if (spinner) {
                spinner.remove();
            }
            iconElement.innerHTML = '<div class="status-icon-large">❌</div>';
        }
        
        // Update message
        const messageElement = checkItem.querySelector('.check-message');
        if (messageElement) {
            messageElement.textContent = 'Check failed - please try again';
        }
        
        // Update status
        const statusElement = checkItem.querySelector('.check-status');
        if (statusElement) {
            statusElement.textContent = 'Failed';
        }
    });
    
    // Disable continue button
    updateContinueButton(false, 'System check failed. Please resolve issues and try again.');
}

/**
 * Retry system check
 */
export async function retrySystemCheck() {
    // Reset all check items to checking state
    const checkItems = document.querySelectorAll('.check-item');
    
    checkItems.forEach(checkItem => {
        checkItem.classList.remove('success', 'warning', 'error');
        checkItem.classList.add('checking');
        
        // Reset icon to spinner
        const iconElement = checkItem.querySelector('.check-icon');
        if (iconElement) {
            iconElement.innerHTML = '<div class="spinner"></div>';
        }
        
        // Reset message
        const messageElement = checkItem.querySelector('.check-message');
        const title = checkItem.querySelector('.check-title')?.textContent || '';
        if (messageElement) {
            messageElement.textContent = `Checking ${title.toLowerCase()}...`;
        }
        
        // Reset status
        const statusElement = checkItem.querySelector('.check-status');
        if (statusElement) {
            statusElement.textContent = 'Checking';
        }
        
        // Remove details
        const details = checkItem.querySelector('.check-details');
        if (details) {
            details.remove();
        }
    });
    
    // Disable continue button
    updateContinueButton(false, 'Running system check...');
    
    // Run check
    return runFullSystemCheck();
}

console.log('System check module loaded');
