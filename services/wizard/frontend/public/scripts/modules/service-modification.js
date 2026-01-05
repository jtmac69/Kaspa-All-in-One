/**
 * Service Modification Module
 * Handles individual service modification and removal within profiles
 * Requirements: 5.5, 5.6, 5.7
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

let currentModificationProfile = null;
let currentModificationData = null;

/**
 * Show service modification options for a profile
 * @param {string} profileId - Profile ID to modify services for
 */
export async function showServiceModificationDialog(profileId) {
    try {
        // Get current profile and service data
        const response = await api.get(`/profiles/${profileId}/services`);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load profile services');
        }
        
        currentModificationProfile = profileId;
        currentModificationData = response;
        
        // Create or show the service modification dialog
        createServiceModificationDialog();
        populateServiceModificationDialog(response);
        
        // Show dialog
        const dialog = document.getElementById('service-modification-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Failed to show service modification dialog:', error);
        showNotification(`Failed to load services: ${error.message}`, 'error');
    }
}

/**
 * Create service modification dialog HTML
 */
function createServiceModificationDialog() {
    const existingDialog = document.getElementById('service-modification-dialog');
    if (existingDialog) {
        return;
    }
    
    const dialogHTML = `
        <div id="service-modification-dialog" class="modal-overlay" style="display: none;">
            <div class="modal-dialog service-modification-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Modify Services</h3>
                    <button class="modal-close" onclick="closeServiceModificationDialog()">×</button>
                </div>
                
                <div class="modal-body">
                    <!-- Profile Overview -->
                    <div class="profile-overview" id="service-profile-overview">
                        <!-- Profile info will be populated here -->
                    </div>
                    
                    <!-- Service List -->
                    <div class="services-section">
                        <h4>Services in this Profile</h4>
                        <p class="services-description">
                            Modify individual service settings or remove services you no longer need.
                            Data preservation options are available for each service.
                        </p>
                        <div id="services-list" class="services-list">
                            <!-- Services will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Modification Summary -->
                    <div id="modification-summary" class="modification-summary" style="display: none;">
                        <h4>Modification Summary</h4>
                        <div id="modification-details" class="modification-details">
                            <!-- Summary will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Data Preservation Options -->
                    <div id="data-preservation-section" class="data-preservation-section" style="display: none;">
                        <h4>Data Preservation</h4>
                        <p class="preservation-description">
                            Choose how to handle data for services being removed or modified.
                        </p>
                        <div id="data-preservation-options" class="data-preservation-options">
                            <!-- Data options will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Warnings -->
                    <div id="service-modification-warnings" class="modification-warnings" style="display: none;">
                        <!-- Warnings will be populated here -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeServiceModificationDialog()">
                        Cancel
                    </button>
                    <button class="btn-secondary" onclick="resetServiceModifications()" id="reset-modifications-btn" style="display: none;">
                        Reset Changes
                    </button>
                    <button class="btn-primary" onclick="applyServiceModifications()" id="apply-modifications-btn" disabled>
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
}

/**
 * Populate service modification dialog with data
 */
function populateServiceModificationDialog(data) {
    // Profile overview
    const profileOverview = document.getElementById('service-profile-overview');
    if (profileOverview) {
        profileOverview.innerHTML = `
            <div class="profile-header">
                <div class="profile-icon">${data.profile.icon || '⚙️'}</div>
                <div class="profile-info">
                    <h4 class="profile-name">${data.profile.displayName}</h4>
                    <p class="profile-description">${data.profile.description}</p>
                </div>
                <div class="profile-status">
                    <div class="status-indicator ${data.profile.status}"></div>
                    <span class="status-text">${data.profile.status}</span>
                    <div class="service-count">${data.services.length} service${data.services.length !== 1 ? 's' : ''}</div>
                </div>
            </div>
        `;
    }
    
    // Services list
    const servicesList = document.getElementById('services-list');
    if (servicesList && data.services) {
        servicesList.innerHTML = data.services.map(service => createServiceCard(service)).join('');
        
        // Add event listeners to service cards
        setupServiceCardEventListeners();
    }
}

/**
 * Create HTML for a service card
 */
function createServiceCard(service) {
    const statusClass = service.running ? 'running' : 'stopped';
    const statusText = service.running ? 'Running' : 'Stopped';
    
    return `
        <div class="service-card" data-service-id="${service.id}">
            <div class="service-header">
                <div class="service-info">
                    <h5 class="service-name">${service.displayName || service.name}</h5>
                    <p class="service-description">${service.description || 'No description available'}</p>
                </div>
                <div class="service-status">
                    <div class="status-indicator ${statusClass}"></div>
                    <span class="status-text">${statusText}</span>
                </div>
            </div>
            
            <div class="service-details">
                <div class="service-detail-item">
                    <span class="detail-label">Container:</span>
                    <span class="detail-value">${service.containerName || 'Not deployed'}</span>
                </div>
                ${service.ports && service.ports.length > 0 ? `
                    <div class="service-detail-item">
                        <span class="detail-label">Ports:</span>
                        <span class="detail-value">${service.ports.join(', ')}</span>
                    </div>
                ` : ''}
                ${service.dataSize ? `
                    <div class="service-detail-item">
                        <span class="detail-label">Data Size:</span>
                        <span class="detail-value">${service.dataSize}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="service-actions">
                <button class="btn-action btn-modify" onclick="modifyServiceConfiguration('${service.id}')" 
                        title="Modify service configuration">
                    <span class="btn-icon">⚙️</span>
                    <span class="btn-text">Configure</span>
                </button>
                <button class="btn-action btn-remove" onclick="toggleServiceRemoval('${service.id}')" 
                        title="Remove this service">
                    <span class="btn-icon">🗑️</span>
                    <span class="btn-text">Remove</span>
                </button>
            </div>
            
            <!-- Service Configuration Panel (hidden by default) -->
            <div class="service-config-panel" id="config-panel-${service.id}" style="display: none;">
                <h6>Service Configuration</h6>
                <div class="config-form" id="config-form-${service.id}">
                    <!-- Configuration options will be populated here -->
                </div>
                <div class="config-actions">
                    <button class="btn-secondary btn-small" onclick="cancelServiceConfiguration('${service.id}')">
                        Cancel
                    </button>
                    <button class="btn-primary btn-small" onclick="saveServiceConfiguration('${service.id}')">
                        Save Changes
                    </button>
                </div>
            </div>
            
            <!-- Service Removal Panel (hidden by default) -->
            <div class="service-removal-panel" id="removal-panel-${service.id}" style="display: none;">
                <div class="removal-warning">
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-text">
                        <strong>Remove ${service.displayName || service.name}?</strong>
                        <p>This service will be stopped and removed from the profile.</p>
                    </div>
                </div>
                
                <div class="data-handling-options">
                    <h6>Data Handling</h6>
                    <div class="data-option">
                        <label class="radio-label">
                            <input type="radio" name="data-handling-${service.id}" value="preserve" checked>
                            <span class="radio-custom"></span>
                            <span class="radio-text">Preserve service data</span>
                        </label>
                        <p class="option-description">Keep all data volumes for potential future use</p>
                    </div>
                    <div class="data-option">
                        <label class="radio-label">
                            <input type="radio" name="data-handling-${service.id}" value="remove">
                            <span class="radio-custom"></span>
                            <span class="radio-text">Remove all data permanently</span>
                        </label>
                        <p class="option-description warning-text">⚠️ All service data and volumes will be deleted permanently</p>
                    </div>
                </div>
                
                <div class="removal-actions">
                    <button class="btn-secondary btn-small" onclick="cancelServiceRemoval('${service.id}')">
                        Cancel
                    </button>
                    <button class="btn-danger btn-small" onclick="confirmServiceRemoval('${service.id}')">
                        Remove Service
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Setup event listeners for service cards
 */
function setupServiceCardEventListeners() {
    // Add any additional event listeners here if needed
    // Most interactions are handled by onclick handlers in the HTML
}

/**
 * Modify service configuration
 */
window.modifyServiceConfiguration = async function(serviceId) {
    try {
        const configPanel = document.getElementById(`config-panel-${serviceId}`);
        const configForm = document.getElementById(`config-form-${serviceId}`);
        
        if (!configPanel || !configForm) {
            console.error('Configuration panel not found for service:', serviceId);
            return;
        }
        
        // Hide removal panel if open
        const removalPanel = document.getElementById(`removal-panel-${serviceId}`);
        if (removalPanel) {
            removalPanel.style.display = 'none';
        }
        
        // Load service configuration
        const response = await api.get(`/services/${serviceId}/config`);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load service configuration');
        }
        
        // Populate configuration form
        populateServiceConfigurationForm(configForm, response.config, response.schema);
        
        // Show configuration panel
        configPanel.style.display = 'block';
        
        // Update modification summary
        updateModificationSummary();
        
    } catch (error) {
        console.error('Failed to load service configuration:', error);
        showNotification(`Failed to load configuration: ${error.message}`, 'error');
    }
};

/**
 * Toggle service removal
 */
window.toggleServiceRemoval = function(serviceId) {
    const removalPanel = document.getElementById(`removal-panel-${serviceId}`);
    const configPanel = document.getElementById(`config-panel-${serviceId}`);
    
    if (!removalPanel) {
        console.error('Removal panel not found for service:', serviceId);
        return;
    }
    
    // Hide configuration panel if open
    if (configPanel) {
        configPanel.style.display = 'none';
    }
    
    // Toggle removal panel
    if (removalPanel.style.display === 'none' || !removalPanel.style.display) {
        removalPanel.style.display = 'block';
        
        // Mark service card as pending removal
        const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (serviceCard) {
            serviceCard.classList.add('pending-removal');
        }
    } else {
        removalPanel.style.display = 'none';
        
        // Remove pending removal mark
        const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (serviceCard) {
            serviceCard.classList.remove('pending-removal');
        }
    }
    
    // Update modification summary
    updateModificationSummary();
};

/**
 * Cancel service configuration
 */
window.cancelServiceConfiguration = function(serviceId) {
    const configPanel = document.getElementById(`config-panel-${serviceId}`);
    if (configPanel) {
        configPanel.style.display = 'none';
    }
    
    // Remove any pending configuration changes
    const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (serviceCard) {
        serviceCard.classList.remove('pending-modification');
    }
    
    updateModificationSummary();
};

/**
 * Save service configuration
 */
window.saveServiceConfiguration = async function(serviceId) {
    try {
        const configForm = document.getElementById(`config-form-${serviceId}`);
        if (!configForm) {
            throw new Error('Configuration form not found');
        }
        
        // Gather configuration from form
        const config = gatherServiceConfiguration(configForm);
        
        // Validate configuration
        const validation = await api.post(`/services/${serviceId}/config/validate`, { config });
        
        if (!validation.valid) {
            showServiceConfigurationErrors(configForm, validation.errors);
            return;
        }
        
        // Mark service as modified
        const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (serviceCard) {
            serviceCard.classList.add('pending-modification');
            serviceCard.dataset.pendingConfig = JSON.stringify(config);
        }
        
        // Hide configuration panel
        const configPanel = document.getElementById(`config-panel-${serviceId}`);
        if (configPanel) {
            configPanel.style.display = 'none';
        }
        
        showNotification('Configuration changes saved. Click "Apply Changes" to apply them.', 'success');
        
        updateModificationSummary();
        
    } catch (error) {
        console.error('Failed to save service configuration:', error);
        showNotification(`Failed to save configuration: ${error.message}`, 'error');
    }
};

/**
 * Cancel service removal
 */
window.cancelServiceRemoval = function(serviceId) {
    const removalPanel = document.getElementById(`removal-panel-${serviceId}`);
    if (removalPanel) {
        removalPanel.style.display = 'none';
    }
    
    // Remove pending removal mark
    const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (serviceCard) {
        serviceCard.classList.remove('pending-removal');
    }
    
    updateModificationSummary();
};

/**
 * Confirm service removal
 */
window.confirmServiceRemoval = function(serviceId) {
    const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (!serviceCard) {
        console.error('Service card not found:', serviceId);
        return;
    }
    
    // Get data handling option
    const dataHandlingRadio = document.querySelector(`input[name="data-handling-${serviceId}"]:checked`);
    const removeData = dataHandlingRadio ? dataHandlingRadio.value === 'remove' : false;
    
    // Store removal data
    serviceCard.dataset.pendingRemoval = 'true';
    serviceCard.dataset.removeData = removeData.toString();
    
    // Hide removal panel
    const removalPanel = document.getElementById(`removal-panel-${serviceId}`);
    if (removalPanel) {
        removalPanel.style.display = 'none';
    }
    
    // Mark as confirmed for removal
    serviceCard.classList.add('confirmed-removal');
    
    showNotification('Service marked for removal. Click "Apply Changes" to remove it.', 'warning');
    
    updateModificationSummary();
};

/**
 * Update modification summary
 */
function updateModificationSummary() {
    const summarySection = document.getElementById('modification-summary');
    const summaryDetails = document.getElementById('modification-details');
    const applyButton = document.getElementById('apply-modifications-btn');
    const resetButton = document.getElementById('reset-modifications-btn');
    
    if (!summarySection || !summaryDetails || !applyButton) {
        return;
    }
    
    // Count modifications
    const modifiedServices = document.querySelectorAll('.service-card.pending-modification');
    const removedServices = document.querySelectorAll('.service-card.confirmed-removal');
    
    const hasModifications = modifiedServices.length > 0 || removedServices.length > 0;
    
    if (hasModifications) {
        // Show summary
        summarySection.style.display = 'block';
        resetButton.style.display = 'inline-block';
        applyButton.disabled = false;
        
        let summaryHTML = '<div class="modification-items">';
        
        if (modifiedServices.length > 0) {
            summaryHTML += `
                <div class="modification-item">
                    <div class="modification-icon">⚙️</div>
                    <div class="modification-text">
                        <strong>${modifiedServices.length} service${modifiedServices.length !== 1 ? 's' : ''} will be reconfigured</strong>
                        <p>Configuration changes will be applied and services restarted</p>
                    </div>
                </div>
            `;
        }
        
        if (removedServices.length > 0) {
            const removeDataCount = Array.from(removedServices).filter(card => 
                card.dataset.removeData === 'true'
            ).length;
            
            summaryHTML += `
                <div class="modification-item warning">
                    <div class="modification-icon">🗑️</div>
                    <div class="modification-text">
                        <strong>${removedServices.length} service${removedServices.length !== 1 ? 's' : ''} will be removed</strong>
                        <p>${removeDataCount > 0 ? `⚠️ ${removeDataCount} service${removeDataCount !== 1 ? 's' : ''} will have data permanently deleted` : 'All service data will be preserved'}</p>
                    </div>
                </div>
            `;
        }
        
        summaryHTML += '</div>';
        summaryDetails.innerHTML = summaryHTML;
        
        // Show data preservation section if there are removals
        showDataPreservationSection(removedServices.length > 0);
        
    } else {
        // Hide summary
        summarySection.style.display = 'none';
        resetButton.style.display = 'none';
        applyButton.disabled = true;
        
        showDataPreservationSection(false);
    }
}

/**
 * Show/hide data preservation section
 */
function showDataPreservationSection(show) {
    const section = document.getElementById('data-preservation-section');
    if (section) {
        section.style.display = show ? 'block' : 'none';
    }
}

/**
 * Reset all service modifications
 */
window.resetServiceModifications = function() {
    // Remove all modification classes and data
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.classList.remove('pending-modification', 'pending-removal', 'confirmed-removal');
        delete card.dataset.pendingConfig;
        delete card.dataset.pendingRemoval;
        delete card.dataset.removeData;
    });
    
    // Hide all panels
    const configPanels = document.querySelectorAll('.service-config-panel');
    configPanels.forEach(panel => {
        panel.style.display = 'none';
    });
    
    const removalPanels = document.querySelectorAll('.service-removal-panel');
    removalPanels.forEach(panel => {
        panel.style.display = 'none';
    });
    
    updateModificationSummary();
    
    showNotification('All modifications have been reset', 'info');
};

/**
 * Apply all service modifications
 */
window.applyServiceModifications = async function() {
    try {
        // Gather all modifications
        const modifications = gatherServiceModifications();
        
        if (modifications.length === 0) {
            showNotification('No modifications to apply', 'info');
            return;
        }
        
        // Show progress
        showModificationProgress();
        
        // Apply modifications
        const response = await api.post(`/profiles/${currentModificationProfile}/services/modify`, {
            modifications
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to apply modifications');
        }
        
        // Show success
        showNotification('Service modifications applied successfully', 'success');
        
        // Close dialog
        closeServiceModificationDialog();
        
        // Refresh profile states if available
        if (window.refreshProfileStates) {
            await window.refreshProfileStates();
        }
        
    } catch (error) {
        console.error('Failed to apply service modifications:', error);
        showNotification(`Failed to apply modifications: ${error.message}`, 'error');
        hideModificationProgress();
    }
};

/**
 * Gather all service modifications
 */
function gatherServiceModifications() {
    const modifications = [];
    
    // Get modified services
    const modifiedServices = document.querySelectorAll('.service-card.pending-modification');
    modifiedServices.forEach(card => {
        const serviceId = card.dataset.serviceId;
        const config = JSON.parse(card.dataset.pendingConfig || '{}');
        
        modifications.push({
            type: 'modify',
            serviceId,
            config
        });
    });
    
    // Get removed services
    const removedServices = document.querySelectorAll('.service-card.confirmed-removal');
    removedServices.forEach(card => {
        const serviceId = card.dataset.serviceId;
        const removeData = card.dataset.removeData === 'true';
        
        modifications.push({
            type: 'remove',
            serviceId,
            removeData
        });
    });
    
    return modifications;
}

/**
 * Show modification progress
 */
function showModificationProgress() {
    const applyButton = document.getElementById('apply-modifications-btn');
    const resetButton = document.getElementById('reset-modifications-btn');
    
    if (applyButton) {
        applyButton.disabled = true;
        applyButton.textContent = 'Applying Changes...';
    }
    
    if (resetButton) {
        resetButton.disabled = true;
    }
}

/**
 * Hide modification progress
 */
function hideModificationProgress() {
    const applyButton = document.getElementById('apply-modifications-btn');
    const resetButton = document.getElementById('reset-modifications-btn');
    
    if (applyButton) {
        applyButton.disabled = false;
        applyButton.textContent = 'Apply Changes';
    }
    
    if (resetButton) {
        resetButton.disabled = false;
    }
}

/**
 * Close service modification dialog
 */
window.closeServiceModificationDialog = function() {
    const dialog = document.getElementById('service-modification-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
    
    // Reset state
    currentModificationProfile = null;
    currentModificationData = null;
};

/**
 * Populate service configuration form
 */
function populateServiceConfigurationForm(form, config, schema) {
    if (!form || !schema) {
        return;
    }
    
    let formHTML = '';
    
    // Generate form fields based on schema
    schema.fields.forEach(field => {
        const value = config[field.key] || field.default || '';
        
        formHTML += `
            <div class="form-group">
                <label for="config-${field.key}" class="form-label">
                    ${field.label}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                ${generateFormField(field, value)}
                ${field.description ? `<p class="form-help">${field.description}</p>` : ''}
            </div>
        `;
    });
    
    form.innerHTML = formHTML;
}

/**
 * Generate form field HTML based on field type
 */
function generateFormField(field, value) {
    switch (field.type) {
        case 'text':
        case 'email':
        case 'url':
            return `<input type="${field.type}" id="config-${field.key}" name="${field.key}" 
                           value="${value}" class="form-input" 
                           ${field.required ? 'required' : ''} 
                           ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>`;
        
        case 'number':
            return `<input type="number" id="config-${field.key}" name="${field.key}" 
                           value="${value}" class="form-input" 
                           ${field.required ? 'required' : ''}
                           ${field.min !== undefined ? `min="${field.min}"` : ''}
                           ${field.max !== undefined ? `max="${field.max}"` : ''}>`;
        
        case 'select':
            const options = field.options.map(option => 
                `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`
            ).join('');
            return `<select id="config-${field.key}" name="${field.key}" class="form-select" ${field.required ? 'required' : ''}>${options}</select>`;
        
        case 'checkbox':
            return `<label class="checkbox-label">
                        <input type="checkbox" id="config-${field.key}" name="${field.key}" 
                               ${value ? 'checked' : ''} class="form-checkbox">
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">${field.checkboxLabel || 'Enable'}</span>
                    </label>`;
        
        case 'textarea':
            return `<textarea id="config-${field.key}" name="${field.key}" class="form-textarea" 
                              ${field.required ? 'required' : ''}
                              ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                              rows="${field.rows || 3}">${value}</textarea>`;
        
        default:
            return `<input type="text" id="config-${field.key}" name="${field.key}" 
                           value="${value}" class="form-input" ${field.required ? 'required' : ''}>`;
    }
}

/**
 * Gather service configuration from form
 */
function gatherServiceConfiguration(form) {
    const config = {};
    const formData = new FormData(form);
    
    for (const [key, value] of formData.entries()) {
        config[key] = value;
    }
    
    // Handle checkboxes (they don't appear in FormData if unchecked)
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!config.hasOwnProperty(checkbox.name)) {
            config[checkbox.name] = false;
        } else {
            config[checkbox.name] = true;
        }
    });
    
    return config;
}

/**
 * Show service configuration errors
 */
function showServiceConfigurationErrors(form, errors) {
    // Clear existing errors
    const existingErrors = form.querySelectorAll('.field-error-message');
    existingErrors.forEach(error => error.remove());
    
    const errorFields = form.querySelectorAll('.field-error');
    errorFields.forEach(field => field.classList.remove('field-error'));
    
    // Show new errors
    errors.forEach(error => {
        const field = form.querySelector(`[name="${error.field}"]`);
        if (field) {
            field.classList.add('field-error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error-message';
            errorDiv.textContent = error.message;
            field.parentElement.appendChild(errorDiv);
        }
    });
}

// Export functions for use in other modules
export {
    showServiceModificationDialog,
    closeServiceModificationDialog
};