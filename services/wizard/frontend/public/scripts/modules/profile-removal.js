/**
 * Profile Removal Module
 * Handles profile removal workflow with confirmation, impact explanation, and data options
 * Requirements: 17.9, 17.10, 17.11, 17.12, 18.3, 18.4
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

let currentRemovalProfile = null;
let removalConfirmationData = null;

/**
 * Open profile removal confirmation dialog
 * @param {string} profileId - Profile ID to remove
 * @param {string[]} currentProfiles - Currently installed profiles
 */
export async function openProfileRemovalDialog(profileId, currentProfiles = []) {
    try {
        // Get removal confirmation details from API
        const response = await api.post('/profiles/remove/confirm', {
            profileId,
            currentProfiles
        });
        
        if (!response.canRemove) {
            showRemovalBlockedDialog(response);
            return;
        }
        
        currentRemovalProfile = profileId;
        removalConfirmationData = response;
        
        // Show removal confirmation dialog
        showRemovalConfirmationDialog(response);
        
    } catch (error) {
        console.error('Failed to get removal confirmation:', error);
        showNotification(`Failed to prepare removal: ${error.message}`, 'error');
    }
}

/**
 * Show removal blocked dialog when profile cannot be removed
 */
function showRemovalBlockedDialog(data) {
    const dialog = document.getElementById('removal-blocked-dialog');
    if (!dialog) {
        createRemovalBlockedDialog();
        return showRemovalBlockedDialog(data);
    }
    
    // Update dialog content
    const profileName = document.getElementById('blocked-profile-name');
    const reasonsList = document.getElementById('blocked-reasons-list');
    const recommendationsList = document.getElementById('blocked-recommendations-list');
    
    if (profileName) {
        profileName.textContent = data.profileName;
    }
    
    if (reasonsList && data.validation && data.validation.errors) {
        reasonsList.innerHTML = data.validation.errors
            .map(error => `<li class="blocked-reason-item">${error.message}</li>`)
            .join('');
    }
    
    if (recommendationsList && data.recommendations) {
        recommendationsList.innerHTML = data.recommendations
            .map(rec => `
                <li class="blocked-recommendation-item">
                    <div class="recommendation-priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
                    <div class="recommendation-content">
                        <div class="recommendation-title">${rec.title}</div>
                        <div class="recommendation-message">${rec.message}</div>
                        <div class="recommendation-action">${rec.action}</div>
                    </div>
                </li>
            `)
            .join('');
    }
    
    // Show dialog
    dialog.style.display = 'flex';
}

/**
 * Show removal confirmation dialog with impact explanation and data options
 */
function showRemovalConfirmationDialog(data) {
    const dialog = document.getElementById('removal-confirmation-dialog');
    if (!dialog) {
        createRemovalConfirmationDialog();
        return showRemovalConfirmationDialog(data);
    }
    
    // Update dialog content
    updateRemovalConfirmationContent(data);
    
    // Show dialog
    dialog.style.display = 'flex';
}

/**
 * Update removal confirmation dialog content
 */
function updateRemovalConfirmationContent(data) {
    // Profile name
    const profileName = document.getElementById('removal-profile-name');
    if (profileName) {
        profileName.textContent = data.profileName;
    }
    
    // Impact summary
    const impactSummary = document.getElementById('removal-impact-summary');
    if (impactSummary) {
        const servicesCount = data.impact.servicesToRemove.length;
        const dependentCount = data.impact.dependentServices.length;
        const dataTypesCount = data.impact.dataTypes.length;
        
        impactSummary.innerHTML = `
            <div class="impact-item">
                <div class="impact-icon">🛑</div>
                <div class="impact-text">${servicesCount} service${servicesCount !== 1 ? 's' : ''} will be stopped and removed</div>
            </div>
            ${dependentCount > 0 ? `
                <div class="impact-item warning">
                    <div class="impact-icon">⚠️</div>
                    <div class="impact-text">${dependentCount} other profile${dependentCount !== 1 ? 's' : ''} may be affected</div>
                </div>
            ` : ''}
            <div class="impact-item">
                <div class="impact-icon">💾</div>
                <div class="impact-text">${dataTypesCount} data type${dataTypesCount !== 1 ? 's' : ''} can be preserved or removed</div>
            </div>
            <div class="impact-item">
                <div class="impact-icon">⏱️</div>
                <div class="impact-text">Estimated downtime: ${data.impact.estimatedDowntime}</div>
            </div>
        `;
    }
    
    // Services to remove
    const servicesList = document.getElementById('removal-services-list');
    if (servicesList && data.impact.servicesToRemove) {
        servicesList.innerHTML = data.impact.servicesToRemove
            .map(service => `<li class="service-item">${service}</li>`)
            .join('');
    }
    
    // Dependent services
    const dependentServicesList = document.getElementById('removal-dependent-services');
    const dependentServicesContainer = document.getElementById('removal-dependent-services-container');
    
    if (data.impact.dependentServices && data.impact.dependentServices.length > 0) {
        if (dependentServicesContainer) {
            dependentServicesContainer.style.display = 'block';
        }
        
        if (dependentServicesList) {
            dependentServicesList.innerHTML = data.impact.dependentServices
                .map(dep => `
                    <li class="dependent-service-item">
                        <div class="dependent-profile">${dep.profileName}</div>
                        <div class="dependent-services">
                            Affected services: ${dep.affectedServices.join(', ')}
                        </div>
                    </li>
                `)
                .join('');
        }
    } else {
        if (dependentServicesContainer) {
            dependentServicesContainer.style.display = 'none';
        }
    }
    
    // Data options
    const dataOptionsContainer = document.getElementById('removal-data-options');
    if (dataOptionsContainer && data.dataOptions) {
        dataOptionsContainer.innerHTML = data.dataOptions
            .map(option => `
                <div class="data-option">
                    <label class="data-option-label">
                        <input type="checkbox" 
                               class="data-option-checkbox" 
                               data-option-id="${option.id}"
                               data-option-type="${option.type}"
                               ${option.recommended ? 'checked' : ''}>
                        <div class="data-option-content">
                            <div class="data-option-title">${option.label}</div>
                            <div class="data-option-description">${option.description}</div>
                            <div class="data-option-details">
                                <span class="data-option-size">${option.estimatedSize}</span>
                                <span class="data-option-location">${option.location}</span>
                            </div>
                            <div class="data-option-impact">${option.impact}</div>
                        </div>
                    </label>
                </div>
            `)
            .join('');
    }
    
    // Recommendations
    const recommendationsList = document.getElementById('removal-recommendations-list');
    if (recommendationsList && data.recommendations) {
        recommendationsList.innerHTML = data.recommendations
            .map(rec => `
                <li class="removal-recommendation-item">
                    <div class="recommendation-priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
                    <div class="recommendation-content">
                        <div class="recommendation-title">${rec.title}</div>
                        <div class="recommendation-message">${rec.message}</div>
                        <div class="recommendation-action">${rec.action}</div>
                    </div>
                </li>
            `)
            .join('');
    }
}

/**
 * Confirm and execute profile removal
 */
export async function confirmProfileRemoval() {
    if (!currentRemovalProfile || !removalConfirmationData) {
        showNotification('No profile selected for removal', 'error');
        return;
    }
    
    try {
        // Gather data removal options
        const dataOptions = gatherDataRemovalOptions();
        const removeData = dataOptions.some(option => option.remove);
        
        // Get current profiles from state
        const currentProfiles = stateManager.get('selectedProfiles') || [];
        
        // Show progress
        showRemovalProgress();
        
        // Execute removal
        const response = await api.post('/profiles/remove', {
            profileId: currentRemovalProfile,
            removeData,
            dataOptions,
            currentProfiles
        });
        
        if (response.success) {
            // Update state - remove profile from selected profiles
            const updatedProfiles = currentProfiles.filter(p => p !== currentRemovalProfile);
            stateManager.set('selectedProfiles', updatedProfiles);
            
            // Show success
            showRemovalSuccess(response);
            
            // Close dialog
            closeProfileRemovalDialog();
            
            // Refresh profile state if we're in reconfiguration mode
            if (window.refreshProfileStates) {
                await window.refreshProfileStates();
            }
            
        } else {
            throw new Error(response.message || 'Profile removal failed');
        }
        
    } catch (error) {
        console.error('Profile removal failed:', error);
        showNotification(`Profile removal failed: ${error.message}`, 'error');
        hideRemovalProgress();
    }
}

/**
 * Gather data removal options from form
 */
function gatherDataRemovalOptions() {
    const checkboxes = document.querySelectorAll('.data-option-checkbox');
    const options = [];
    
    checkboxes.forEach(checkbox => {
        options.push({
            id: checkbox.dataset.optionId,
            type: checkbox.dataset.optionType,
            remove: checkbox.checked
        });
    });
    
    return options;
}

/**
 * Show removal progress
 */
function showRemovalProgress() {
    const progressContainer = document.getElementById('removal-progress-container');
    const confirmButton = document.getElementById('confirm-removal-button');
    const cancelButton = document.getElementById('cancel-removal-button');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = 'Removing...';
    }
    
    if (cancelButton) {
        cancelButton.disabled = true;
    }
}

/**
 * Hide removal progress
 */
function hideRemovalProgress() {
    const progressContainer = document.getElementById('removal-progress-container');
    const confirmButton = document.getElementById('confirm-removal-button');
    const cancelButton = document.getElementById('cancel-removal-button');
    
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
    
    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Remove Profile';
    }
    
    if (cancelButton) {
        cancelButton.disabled = false;
    }
}

/**
 * Show removal success notification
 */
function showRemovalSuccess(response) {
    const message = `Profile removed successfully!\n\n` +
                   `Removed services: ${response.removedServices.join(', ')}\n` +
                   `Preserved data: ${response.preservedData.length} item(s)\n` +
                   `Backup ID: ${response.backupId || 'None'}`;
    
    showNotification(message, 'success', 8000);
}

/**
 * Close profile removal dialog
 */
export function closeProfileRemovalDialog() {
    const confirmationDialog = document.getElementById('removal-confirmation-dialog');
    const blockedDialog = document.getElementById('removal-blocked-dialog');
    
    if (confirmationDialog) {
        confirmationDialog.style.display = 'none';
    }
    
    if (blockedDialog) {
        blockedDialog.style.display = 'none';
    }
    
    // Reset state
    currentRemovalProfile = null;
    removalConfirmationData = null;
    
    hideRemovalProgress();
}

/**
 * Create removal blocked dialog HTML
 */
function createRemovalBlockedDialog() {
    const dialogHTML = `
        <div id="removal-blocked-dialog" class="modal-overlay" style="display: none;">
            <div class="modal-dialog removal-blocked-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Cannot Remove Profile</h3>
                    <button class="modal-close" onclick="closeProfileRemovalDialog()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="blocked-message">
                        <div class="blocked-icon">🚫</div>
                        <div class="blocked-text">
                            <strong id="blocked-profile-name">Profile</strong> cannot be removed at this time.
                        </div>
                    </div>
                    
                    <div class="blocked-reasons">
                        <h4>Reasons:</h4>
                        <ul id="blocked-reasons-list" class="blocked-reasons-list">
                            <!-- Reasons will be populated dynamically -->
                        </ul>
                    </div>
                    
                    <div class="blocked-recommendations">
                        <h4>What you can do:</h4>
                        <ul id="blocked-recommendations-list" class="blocked-recommendations-list">
                            <!-- Recommendations will be populated dynamically -->
                        </ul>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeProfileRemovalDialog()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
}

/**
 * Create removal confirmation dialog HTML
 */
function createRemovalConfirmationDialog() {
    const dialogHTML = `
        <div id="removal-confirmation-dialog" class="modal-overlay" style="display: none;">
            <div class="modal-dialog removal-confirmation-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Remove Profile</h3>
                    <button class="modal-close" onclick="closeProfileRemovalDialog()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="removal-warning">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-text">
                            You are about to remove <strong id="removal-profile-name">Profile</strong> from your installation.
                        </div>
                    </div>
                    
                    <div class="removal-impact">
                        <h4>Impact Summary</h4>
                        <div id="removal-impact-summary" class="impact-summary">
                            <!-- Impact summary will be populated dynamically -->
                        </div>
                    </div>
                    
                    <div class="removal-services">
                        <h4>Services to Remove</h4>
                        <ul id="removal-services-list" class="services-list">
                            <!-- Services list will be populated dynamically -->
                        </ul>
                    </div>
                    
                    <div id="removal-dependent-services-container" class="removal-dependent-services" style="display: none;">
                        <h4>Affected Profiles</h4>
                        <p class="dependent-services-warning">
                            The following profiles use services from this profile and may be affected:
                        </p>
                        <ul id="removal-dependent-services" class="dependent-services-list">
                            <!-- Dependent services will be populated dynamically -->
                        </ul>
                    </div>
                    
                    <div class="removal-data-options">
                        <h4>Data Options</h4>
                        <p class="data-options-description">
                            Choose which data to remove. Unchecked items will be preserved for potential future use.
                        </p>
                        <div id="removal-data-options" class="data-options-container">
                            <!-- Data options will be populated dynamically -->
                        </div>
                    </div>
                    
                    <div class="removal-recommendations">
                        <h4>Recommendations</h4>
                        <ul id="removal-recommendations-list" class="recommendations-list">
                            <!-- Recommendations will be populated dynamically -->
                        </ul>
                    </div>
                    
                    <div id="removal-progress-container" class="removal-progress" style="display: none;">
                        <div class="progress-spinner"></div>
                        <div class="progress-text">Removing profile and stopping services...</div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancel-removal-button" onclick="closeProfileRemovalDialog()">
                        Cancel
                    </button>
                    <button class="btn-danger" id="confirm-removal-button" onclick="confirmProfileRemoval()">
                        Remove Profile
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
}

// Make functions available globally for onclick handlers
window.closeProfileRemovalDialog = closeProfileRemovalDialog;
window.confirmProfileRemoval = confirmProfileRemoval;