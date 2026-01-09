/**
 * Checklist Module
 * Handles Step 2: Pre-Installation Checklist
 * Connects frontend to backend system-check API
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Run system check and update checklist
 */
export async function runSystemCheck() {
    console.log('=== CHECKLIST: Starting system check ===');
    
    try {
        // Define ports with descriptions
        const portDescriptions = {
            5433: 'K-Social Database',
            5434: 'Simply Kaspa Database',
            16110: 'Kaspa Node (P2P)',
            16111: 'Kaspa Node (RPC)'
        };
        
        // Get required ports (excluding 3000 since wizard uses it, and 8080 since Dashboard uses it)
        // Updated for Database-Per-Service Architecture: 5433 (k-social-db), 5434 (simply-kaspa-db)
        const requiredPorts = [16110, 16111, 5433, 5434];
        const endpoint = `/system-check?ports=${requiredPorts.join(',')}`;
        
        console.log('CHECKLIST: Calling API endpoint:', endpoint);
        console.log('CHECKLIST: Full URL:', `${window.location.origin}/api${endpoint}`);
        
        // Call backend API
        const results = await api.get(endpoint);
        
        console.log('CHECKLIST: API response received:', results);
        console.log('CHECKLIST: Docker installed?', results.docker?.installed);
        console.log('CHECKLIST: Compose installed?', results.dockerCompose?.installed);
        console.log('CHECKLIST: Resources OK?', {
            cpu: results.resources?.cpu?.meetsMinimum,
            memory: results.resources?.memory?.meetsMinimum,
            disk: results.resources?.disk?.meetsMinimum
        });
        console.log('CHECKLIST: Ports available?', Object.entries(results.ports || {}).map(
            ([port, status]) => `${port}: ${status.available}`
        ));
        
        // Add descriptions to port results
        if (results.ports) {
            Object.keys(results.ports).forEach(port => {
                results.ports[port].description = portDescriptions[port] || 'Unknown service';
            });
        }
        
        console.log('CHECKLIST: System check results with descriptions:', results);
        
        // Store results in state
        stateManager.set('systemCheckResults', results);
        console.log('CHECKLIST: Results stored in state manager');
        
        // Update checklist items
        console.log('CHECKLIST: Updating UI...');
        updateChecklistItem('requirements', results.resources);
        updateChecklistItem('docker', results.docker);
        updateChecklistItem('compose', results.dockerCompose);
        updateChecklistItem('ports', results.ports);
        
        // Update summary
        updateChecklistSummary(results);
        
        // Calculate time estimates
        calculateTimeEstimates(results);
        
        console.log('=== CHECKLIST: System check complete ===');
        return results;
        
    } catch (error) {
        console.error('=== CHECKLIST: System check FAILED ===');
        console.error('CHECKLIST: Error message:', error.message);
        console.error('CHECKLIST: Error stack:', error.stack);
        console.error('CHECKLIST: Full error:', error);
        
        showNotification(
            `System check failed: ${error.message}. Check browser console for details.`,
            'error',
            5000
        );
        
        // Show error state
        showChecklistError(error);
        
        throw error;
    }
}

/**
 * Update a checklist item with results
 */
function updateChecklistItem(itemId, data) {
    const item = document.querySelector(`.checklist-item[data-item="${itemId}"]`);
    if (!item) return;
    
    const statusIcon = item.querySelector('.status-icon');
    const statusText = item.querySelector('.status-text');
    
    let status, icon, text;
    
    switch (itemId) {
        case 'requirements':
            const reqStatus = getResourcesStatus(data);
            status = reqStatus.status;
            icon = reqStatus.icon;
            text = reqStatus.text;
            updateRequirementsDetails(data);
            break;
            
        case 'docker':
            status = data.installed ? 'success' : 'error';
            icon = data.installed ? '✅' : '❌';
            text = data.installed ? 'Installed' : 'Not Installed';
            updateDockerDetails(data);
            break;
            
        case 'compose':
            status = data.installed ? 'success' : 'error';
            icon = data.installed ? '✅' : '❌';
            text = data.installed ? 'Installed' : 'Not Installed';
            updateComposeDetails(data);
            break;
            
        case 'ports':
            const portStatus = getPortsStatus(data);
            status = portStatus.status;
            icon = portStatus.icon;
            text = portStatus.text;
            updatePortsDetails(data);
            break;
    }
    
    // Update UI
    if (statusIcon) statusIcon.textContent = icon;
    if (statusText) statusText.textContent = text;
    
    // Update item class
    item.classList.remove('checking', 'success', 'warning', 'error');
    item.classList.add(status);
    
    // Store in state
    stateManager.update('checklist', {
        [itemId]: { status, data }
    });
}

/**
 * Get resources status
 */
function getResourcesStatus(resources) {
    const allMet = resources.memory.meetsMinimum && 
                   resources.cpu.meetsMinimum && 
                   (resources.disk.meetsMinimum !== false);
    
    if (allMet) {
        return { status: 'success', icon: '✅', text: 'All Requirements Met' };
    } else {
        return { status: 'warning', icon: '⚠️', text: 'Some Warnings' };
    }
}

/**
 * Get ports status
 */
function getPortsStatus(ports) {
    const allAvailable = Object.values(ports).every(p => p.available);
    const unavailablePorts = Object.entries(ports).filter(([_, p]) => !p.available);
    
    if (allAvailable) {
        return { status: 'success', icon: '✅', text: 'All Ports Available' };
    } else if (unavailablePorts.length > 0) {
        const count = unavailablePorts.length;
        return { 
            status: 'warning', 
            icon: '⚠️', 
            text: `${count} Port${count > 1 ? 's' : ''} In Use (see details)` 
        };
    } else {
        return { status: 'checking', icon: '⏳', text: 'Checking...' };
    }
}

/**
 * Update requirements details
 */
function updateRequirementsDetails(resources) {
    // CPU
    const cpuValue = document.getElementById('cpu-value');
    const cpuStatus = document.getElementById('cpu-status');
    if (cpuValue && cpuStatus) {
        cpuValue.textContent = `${resources.cpu.count} cores`;
        cpuStatus.textContent = resources.cpu.meetsMinimum ? '✅' : '⚠️';
    }
    
    // RAM
    const ramValue = document.getElementById('ram-value');
    const ramStatus = document.getElementById('ram-status');
    if (ramValue && ramStatus) {
        ramValue.textContent = `${resources.memory.totalGB} GB (${resources.memory.freeGB} GB free)`;
        ramStatus.textContent = resources.memory.meetsMinimum ? '✅' : '⚠️';
    }
    
    // Disk
    const diskValue = document.getElementById('disk-value');
    const diskStatus = document.getElementById('disk-status');
    if (diskValue && diskStatus && resources.disk) {
        diskValue.textContent = `${resources.disk.availableGB} GB available`;
        diskStatus.textContent = resources.disk.meetsMinimum ? '✅' : '⚠️';
    }
}

/**
 * Update Docker details
 */
function updateDockerDetails(docker) {
    const detailsContainer = document.getElementById('docker-status-detail');
    const actionsContainer = document.getElementById('docker-actions');
    
    if (!detailsContainer) return;
    
    if (docker.installed) {
        detailsContainer.innerHTML = `
            <div class="status-success">
                <strong>✅ Docker is installed</strong>
                <p>Version: ${docker.version}</p>
                <p>${docker.message}</p>
            </div>
        `;
        if (actionsContainer) actionsContainer.style.display = 'none';
    } else {
        detailsContainer.innerHTML = `
            <div class="status-error">
                <strong>❌ Docker is not installed</strong>
                <p>${docker.message}</p>
                ${docker.remediation ? `<p class="remediation">${docker.remediation}</p>` : ''}
            </div>
        `;
        if (actionsContainer) actionsContainer.style.display = 'block';
    }
}

/**
 * Update Docker Compose details
 */
function updateComposeDetails(compose) {
    const detailsContainer = document.getElementById('compose-status-detail');
    const actionsContainer = document.getElementById('compose-actions');
    
    if (!detailsContainer) return;
    
    if (compose.installed) {
        detailsContainer.innerHTML = `
            <div class="status-success">
                <strong>✅ Docker Compose is installed</strong>
                <p>Version: ${compose.version}</p>
                <p>${compose.message}</p>
            </div>
        `;
        if (actionsContainer) actionsContainer.style.display = 'none';
    } else {
        detailsContainer.innerHTML = `
            <div class="status-error">
                <strong>❌ Docker Compose is not installed</strong>
                <p>${compose.message}</p>
                ${compose.remediation ? `<p class="remediation">${compose.remediation}</p>` : ''}
            </div>
        `;
        if (actionsContainer) actionsContainer.style.display = 'block';
    }
}

/**
 * Update ports details
 */
function updatePortsDetails(ports) {
    const detailsContainer = document.getElementById('ports-status-detail');
    if (!detailsContainer) return;
    
    const portEntries = Object.entries(ports);
    if (portEntries.length === 0) {
        detailsContainer.innerHTML = '<p>No ports to check</p>';
        return;
    }
    
    const portsList = portEntries.map(([port, status]) => {
        const icon = status.available ? '✅' : '⚠️';
        const className = status.available ? 'port-available' : 'port-unavailable';
        const description = status.description ? ` (${status.description})` : '';
        
        return `
            <div class="port-item ${className}">
                <span class="port-icon">${icon}</span>
                <span class="port-number">Port ${port}${description}</span>
                <span class="port-status">${status.message}</span>
            </div>
        `;
    }).join('');
    
    detailsContainer.innerHTML = `
        <div class="ports-list">
            ${portsList}
        </div>
    `;
}

/**
 * Update checklist summary
 */
function updateChecklistSummary(results) {
    const completedCount = document.getElementById('checklist-completed');
    const totalCount = document.getElementById('checklist-total');
    
    if (!completedCount || !totalCount) return;
    
    // Count completed items (docker, compose, resources)
    let completed = 0;
    const total = 4; // docker, compose, resources, ports
    
    if (results.docker.installed) completed++;
    if (results.dockerCompose.installed) completed++;
    if (results.resources.memory.meetsMinimum && results.resources.cpu.meetsMinimum) completed++;
    
    const allPortsAvailable = Object.values(results.ports).every(p => p.available);
    if (allPortsAvailable) completed++;
    
    completedCount.textContent = completed;
    totalCount.textContent = total;
    
    // Update continue button state
    const continueButton = document.getElementById('checklist-continue');
    if (continueButton) {
        const canProceed = results.summary?.canProceed !== false;
        continueButton.disabled = !canProceed;
        
        if (!canProceed) {
            continueButton.title = 'Please install Docker and Docker Compose to continue';
        }
    }
}

/**
 * Calculate time estimates
 */
function calculateTimeEstimates(results) {
    const estimatesContainer = document.getElementById('time-estimates');
    if (!estimatesContainer) return;
    
    // Show estimates section
    estimatesContainer.style.display = 'block';
    
    // Get recommended profile
    const profile = results.recommendations?.primary?.profile || 'core';
    const useRemoteNode = results.recommendations?.primary?.useRemoteNode || false;
    
    // Estimate setup time (minutes)
    const setupTimes = {
        core: useRemoteNode ? 5 : 10,
        prod: 15,
        explorer: 20,
        archive: 25,
        mining: 15,
        dev: 10
    };
    
    // Estimate download size (GB)
    const downloadSizes = {
        core: useRemoteNode ? 0.5 : 2,
        prod: 4,
        explorer: 5,
        archive: 6,
        mining: 3,
        dev: 3
    };
    
    // Estimate sync time (hours)
    const syncTimes = {
        core: useRemoteNode ? 0 : 24,
        prod: 24,
        explorer: 48,
        archive: 72,
        mining: 24,
        dev: 0
    };
    
    const setupTime = document.getElementById('setup-time');
    const downloadSize = document.getElementById('download-size');
    const syncTime = document.getElementById('sync-time');
    
    if (setupTime) setupTime.textContent = `~${setupTimes[profile] || 10} minutes`;
    if (downloadSize) downloadSize.textContent = `~${downloadSizes[profile] || 2} GB`;
    if (syncTime) {
        const hours = syncTimes[profile] || 0;
        syncTime.textContent = hours === 0 ? 'Not required' : `~${hours} hours`;
    }
}

/**
 * Show checklist error
 */
function showChecklistError(error) {
    const items = ['requirements', 'docker', 'compose', 'ports'];
    
    items.forEach(itemId => {
        const item = document.querySelector(`.checklist-item[data-item="${itemId}"]`);
        if (!item) return;
        
        const statusIcon = item.querySelector('.status-icon');
        const statusText = item.querySelector('.status-text');
        
        if (statusIcon) statusIcon.textContent = '❌';
        if (statusText) statusText.textContent = 'Check Failed';
        
        item.classList.remove('checking', 'success', 'warning');
        item.classList.add('error');
    });
}

/**
 * Initialize quiz (placeholder for future implementation)
 */
export function initializeQuiz() {
    console.log('Quiz initialization - coming soon');
    showNotification('Profile selection quiz coming soon', 'info');
}

/**
 * Process quiz answers (placeholder for future implementation)
 */
export function processQuizAnswers(answers) {
    console.log('Processing quiz answers:', answers);
    // Future implementation
    return 'core'; // Default recommendation
}

/**
 * Show Docker installation guide
 */
export function showDockerGuide() {
    showNotification('Opening Docker installation guide...', 'info', 3000);
    
    // Open Docker installation page in new tab
    window.open('https://docs.docker.com/get-docker/', '_blank');
    
    // Show helpful message
    setTimeout(() => {
        showNotification('After installing Docker, return here and refresh the page', 'info', 5000);
    }, 3000);
}

/**
 * Show Docker Compose installation guide
 */
export function showComposeGuide() {
    showNotification('Opening Docker Compose installation guide...', 'info', 3000);
    
    // Open Docker Compose installation page in new tab
    window.open('https://docs.docker.com/compose/install/', '_blank');
    
    // Show helpful message
    setTimeout(() => {
        showNotification('After installing Docker Compose, return here and refresh the page', 'info', 5000);
    }, 3000);
}

console.log('Checklist module loaded');
