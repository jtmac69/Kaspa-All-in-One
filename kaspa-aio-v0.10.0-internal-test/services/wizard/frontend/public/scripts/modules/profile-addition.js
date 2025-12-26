/**
 * Profile Addition Module
 * Handles adding new profiles to existing installations
 * Requirements: 17.6, 17.7, 17.8, 18.1, 18.2
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Show profile addition interface
 * @param {string[]} currentProfiles - Currently installed profiles
 * @param {Object[]} availableProfiles - Profiles available to add
 */
export async function showProfileAddition(currentProfiles, availableProfiles) {
    try {
        const container = document.getElementById('profile-addition-container');
        if (!container) {
            console.error('Profile addition container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'addition-header';
        header.innerHTML = `
            <h2>Add New Profile</h2>
            <p>Select a profile to add to your existing installation. Integration options will be shown based on your current setup.</p>
        `;
        container.appendChild(header);

        // Create profile selection grid
        const profileGrid = document.createElement('div');
        profileGrid.className = 'profile-grid addition-grid';
        
        for (const profile of availableProfiles) {
            const profileCard = createAdditionProfileCard(profile, currentProfiles);
            profileGrid.appendChild(profileCard);
        }
        
        container.appendChild(profileGrid);

        // Create integration options container (initially hidden)
        const integrationContainer = document.createElement('div');
        integrationContainer.id = 'integration-options-container';
        integrationContainer.className = 'integration-options hidden';
        container.appendChild(integrationContainer);

        // Create action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'addition-actions';
        actionsContainer.innerHTML = `
            <button id="cancel-addition" class="btn btn-secondary">Cancel</button>
            <button id="add-profile-btn" class="btn btn-primary" disabled>Add Profile</button>
        `;
        container.appendChild(actionsContainer);

        // Set up event listeners
        setupAdditionEventListeners(currentProfiles);

    } catch (error) {
        console.error('Error showing profile addition interface:', error);
        showNotification('Failed to load profile addition interface', 'error');
    }
}

/**
 * Create profile card for addition interface
 */
function createAdditionProfileCard(profile, currentProfiles) {
    const card = document.createElement('div');
    card.className = 'profile-card addition-card';
    card.dataset.profileId = profile.id;
    
    // Check if profile can be added (basic check)
    const canAdd = !currentProfiles.includes(profile.id);
    if (!canAdd) {
        card.classList.add('disabled');
    }

    card.innerHTML = `
        <div class="profile-icon">${profile.icon || '⚙️'}</div>
        <div class="profile-info">
            <h3>${profile.name}</h3>
            <p class="profile-description">${profile.description}</p>
            <div class="profile-services">
                <strong>Services:</strong> ${profile.services.map(s => s.name).join(', ')}
            </div>
            <div class="profile-resources">
                <span class="resource-item">
                    <i class="icon-memory"></i> ${profile.resources.minMemory}GB RAM
                </span>
                <span class="resource-item">
                    <i class="icon-cpu"></i> ${profile.resources.minCpu} CPU
                </span>
                <span class="resource-item">
                    <i class="icon-disk"></i> ${profile.resources.minDisk}GB Disk
                </span>
            </div>
            ${!canAdd ? '<div class="profile-status installed">Already Installed</div>' : ''}
        </div>
        <div class="profile-actions">
            ${canAdd ? '<button class="btn btn-outline select-profile-btn">Select</button>' : ''}
        </div>
    `;

    return card;
}

/**
 * Set up event listeners for profile addition
 */
function setupAdditionEventListeners(currentProfiles) {
    // Profile selection
    document.querySelectorAll('.select-profile-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.profile-card');
            const profileId = card.dataset.profileId;
            
            // Clear previous selections
            document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('selected'));
            
            // Select this profile
            card.classList.add('selected');
            
            // Load integration options
            await loadIntegrationOptions(profileId, currentProfiles);
            
            // Enable add button
            document.getElementById('add-profile-btn').disabled = false;
        });
    });

    // Cancel button
    document.getElementById('cancel-addition').addEventListener('click', () => {
        // Hide addition interface and return to main reconfiguration view
        const container = document.getElementById('profile-addition-container');
        if (container) {
            container.classList.add('hidden');
        }
        
        // Show main reconfiguration interface
        const mainContainer = document.getElementById('reconfiguration-main');
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
        }
    });

    // Add profile button
    document.getElementById('add-profile-btn').addEventListener('click', async () => {
        const selectedCard = document.querySelector('.profile-card.selected');
        if (!selectedCard) {
            showNotification('Please select a profile to add', 'warning');
            return;
        }

        const profileId = selectedCard.dataset.profileId;
        await addSelectedProfile(profileId, currentProfiles);
    });
}

/**
 * Load integration options for selected profile
 */
async function loadIntegrationOptions(profileId, currentProfiles) {
    try {
        showNotification('Loading integration options...', 'info');

        // First validate the addition
        const validation = await api.post('/profiles/validate-addition', {
            profileId,
            currentProfiles
        });

        const container = document.getElementById('integration-options-container');
        container.innerHTML = '';

        if (!validation.canAdd) {
            // Show validation errors
            container.innerHTML = `
                <div class="validation-errors">
                    <h3>Cannot Add Profile</h3>
                    <div class="error-list">
                        ${validation.errors.map(error => `
                            <div class="error-item">
                                <i class="icon-error"></i>
                                <span>${error.message}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${validation.recommendations ? `
                        <div class="recommendations">
                            <h4>Recommendations:</h4>
                            ${validation.recommendations.map(rec => `
                                <div class="recommendation-item priority-${rec.priority}">
                                    <strong>${rec.title}</strong>
                                    <p>${rec.message}</p>
                                    <ul>
                                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            container.classList.remove('hidden');
            document.getElementById('add-profile-btn').disabled = true;
            return;
        }

        // Get integration options
        const options = await api.post('/profiles/integration-options', {
            profileId,
            currentProfiles
        });

        if (!options.success) {
            throw new Error(options.error || 'Failed to get integration options');
        }

        // Show integration options
        container.innerHTML = createIntegrationOptionsHTML(options.options);
        container.classList.remove('hidden');

        // Set up integration option event listeners
        setupIntegrationEventListeners();

        showNotification('Integration options loaded', 'success');

    } catch (error) {
        console.error('Error loading integration options:', error);
        showNotification(`Failed to load integration options: ${error.message}`, 'error');
        
        const container = document.getElementById('integration-options-container');
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load integration options. You can still add the profile with default settings.</p>
            </div>
        `;
        container.classList.remove('hidden');
    }
}

/**
 * Create HTML for integration options
 */
function createIntegrationOptionsHTML(options) {
    if (!options.integrationTypes || options.integrationTypes.length === 0) {
        return `
            <div class="integration-info">
                <h3>Ready to Add ${options.profileName}</h3>
                <p>This profile will be added with default configuration. No integration options are available.</p>
                <div class="resource-impact">
                    <h4>Resource Impact:</h4>
                    <div class="resource-changes">
                        <span class="resource-change">
                            <i class="icon-memory"></i> +${options.resourceImpact.additional.memory}GB RAM
                        </span>
                        <span class="resource-change">
                            <i class="icon-cpu"></i> +${options.resourceImpact.additional.cpu} CPU
                        </span>
                        <span class="resource-change">
                            <i class="icon-disk"></i> +${options.resourceImpact.additional.disk}GB Disk
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    let html = `
        <div class="integration-options">
            <h3>Integration Options for ${options.profileName}</h3>
            <p>Configure how this profile will integrate with your existing services.</p>
    `;

    // Add recommendations if available
    if (options.recommendations && options.recommendations.length > 0) {
        html += `
            <div class="integration-recommendations">
                <h4>Recommendations:</h4>
                ${options.recommendations.map(rec => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <i class="icon-info"></i>
                        <div>
                            <strong>${rec.title}</strong>
                            <p>${rec.message}</p>
                            <small>${rec.action}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Add integration type options
    for (const integrationType of options.integrationTypes) {
        html += `
            <div class="integration-type" data-type="${integrationType.type}">
                <h4>${integrationType.title}</h4>
                <p>${integrationType.description}</p>
                <div class="integration-options-list">
                    ${integrationType.options.map((option, index) => `
                        <div class="integration-option ${option.recommended ? 'recommended' : ''}" 
                             data-option-id="${option.id}">
                            <label class="option-label">
                                <input type="radio" 
                                       name="${integrationType.type}" 
                                       value="${option.id}"
                                       ${option.recommended || index === 0 ? 'checked' : ''}>
                                <div class="option-content">
                                    <div class="option-header">
                                        <span class="option-title">${option.label}</span>
                                        ${option.recommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                                    </div>
                                    <p class="option-description">${option.description}</p>
                                    <p class="option-impact"><strong>Impact:</strong> ${option.impact}</p>
                                </div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Add resource impact
    html += `
        <div class="resource-impact">
            <h4>Resource Impact:</h4>
            <div class="resource-changes">
                <div class="resource-before-after">
                    <div class="resource-column">
                        <h5>Current</h5>
                        <span class="resource-item">
                            <i class="icon-memory"></i> ${options.resourceImpact.current.minMemory}GB RAM
                        </span>
                        <span class="resource-item">
                            <i class="icon-cpu"></i> ${options.resourceImpact.current.minCpu} CPU
                        </span>
                        <span class="resource-item">
                            <i class="icon-disk"></i> ${options.resourceImpact.current.minDisk}GB Disk
                        </span>
                    </div>
                    <div class="resource-arrow">→</div>
                    <div class="resource-column">
                        <h5>After Addition</h5>
                        <span class="resource-item">
                            <i class="icon-memory"></i> ${options.resourceImpact.new.minMemory}GB RAM
                        </span>
                        <span class="resource-item">
                            <i class="icon-cpu"></i> ${options.resourceImpact.new.minCpu} CPU
                        </span>
                        <span class="resource-item">
                            <i class="icon-disk"></i> ${options.resourceImpact.new.minDisk}GB Disk
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add startup order information
    if (options.startupOrder && options.startupOrder.newServices.length > 0) {
        html += `
            <div class="startup-order">
                <h4>Service Startup Order:</h4>
                <div class="startup-sequence">
                    ${options.startupOrder.fullOrder.map((service, index) => `
                        <div class="startup-service ${options.startupOrder.newServices.includes(service.name) ? 'new-service' : ''}">
                            <span class="startup-order-number">${index + 1}</span>
                            <span class="service-name">${service.name}</span>
                            <span class="service-profile">(${service.profileName})</span>
                            ${options.startupOrder.newServices.includes(service.name) ? '<span class="new-badge">New</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

/**
 * Set up event listeners for integration options
 */
function setupIntegrationEventListeners() {
    // Radio button changes
    document.querySelectorAll('.integration-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Update visual selection
            const optionDiv = e.target.closest('.integration-option');
            const typeDiv = optionDiv.closest('.integration-type');
            
            // Clear previous selections in this type
            typeDiv.querySelectorAll('.integration-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Mark current selection
            optionDiv.classList.add('selected');
        });
    });
}

/**
 * Add selected profile with integration options
 */
async function addSelectedProfile(profileId, currentProfiles) {
    try {
        const addButton = document.getElementById('add-profile-btn');
        addButton.disabled = true;
        addButton.textContent = 'Adding Profile...';

        showNotification('Adding profile...', 'info');

        // Collect integration options
        const integrationOptions = {};
        document.querySelectorAll('.integration-type').forEach(typeDiv => {
            const type = typeDiv.dataset.type;
            const selectedRadio = typeDiv.querySelector('input[type="radio"]:checked');
            
            if (selectedRadio) {
                const optionId = selectedRadio.value;
                const optionDiv = selectedRadio.closest('.integration-option');
                
                // Find the option configuration (this would need to be stored or retrieved)
                integrationOptions[type] = {
                    id: optionId,
                    // Note: In a real implementation, we'd need to store the full option config
                    // For now, we'll let the backend handle the defaults based on the option ID
                };
            }
        });

        // Add the profile
        const result = await api.post('/profiles/add', {
            profileId,
            currentProfiles,
            integrationOptions
        });

        if (!result.success) {
            throw new Error(result.message || 'Failed to add profile');
        }

        showNotification(`Profile added successfully! ${result.addedServices.length} services were added.`, 'success');

        // Show success details
        showAdditionSuccess(result);

        // Update state
        stateManager.set('lastAddedProfile', {
            profileId,
            timestamp: new Date().toISOString(),
            services: result.addedServices,
            integrationChanges: result.integrationChanges
        });

    } catch (error) {
        console.error('Error adding profile:', error);
        showNotification(`Failed to add profile: ${error.message}`, 'error');
        
        // Re-enable button
        const addButton = document.getElementById('add-profile-btn');
        addButton.disabled = false;
        addButton.textContent = 'Add Profile';
    }
}

/**
 * Show addition success information
 */
function showAdditionSuccess(result) {
    const container = document.getElementById('integration-options-container');
    
    container.innerHTML = `
        <div class="addition-success">
            <div class="success-header">
                <i class="icon-success"></i>
                <h3>Profile Added Successfully!</h3>
            </div>
            
            <div class="success-details">
                <div class="added-services">
                    <h4>Added Services:</h4>
                    <ul>
                        ${result.addedServices.map(service => `<li>${service}</li>`).join('')}
                    </ul>
                </div>
                
                ${result.integrationChanges && result.integrationChanges.length > 0 ? `
                    <div class="integration-changes">
                        <h4>Integration Changes:</h4>
                        <ul>
                            ${result.integrationChanges.map(change => `
                                <li>
                                    <strong>${change.key}:</strong> 
                                    ${change.type === 'added' ? 'Added' : 'Changed from'} 
                                    ${change.oldValue || 'default'} 
                                    ${change.type !== 'added' ? `to ${change.newValue}` : change.newValue}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${result.requiresRestart ? `
                    <div class="restart-notice">
                        <i class="icon-warning"></i>
                        <p><strong>Service Restart Required:</strong> Some existing services may need to restart to apply integration changes.</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="success-actions">
                <button id="view-services" class="btn btn-outline">View Services</button>
                <button id="add-another" class="btn btn-outline">Add Another Profile</button>
                <button id="finish-addition" class="btn btn-primary">Finish</button>
            </div>
        </div>
    `;

    // Set up success action listeners
    document.getElementById('view-services').addEventListener('click', () => {
        // Navigate to services view (implementation depends on main app structure)
        showNotification('Navigating to services view...', 'info');
    });

    document.getElementById('add-another').addEventListener('click', () => {
        // Reload the addition interface
        location.reload(); // Simple approach - in production, would refresh the data
    });

    document.getElementById('finish-addition').addEventListener('click', () => {
        // Return to main reconfiguration view
        const additionContainer = document.getElementById('profile-addition-container');
        if (additionContainer) {
            additionContainer.classList.add('hidden');
        }
        
        const mainContainer = document.getElementById('reconfiguration-main');
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
        }
        
        // Refresh the main view to show updated profile states
        if (window.loadReconfigurationInterface) {
            window.loadReconfigurationInterface();
        }
    });
}

/**
 * Validate profile addition before showing options
 */
export async function validateProfileAddition(profileId, currentProfiles) {
    try {
        const validation = await api.post('/profiles/validate-addition', {
            profileId,
            currentProfiles
        });

        return validation;
    } catch (error) {
        console.error('Error validating profile addition:', error);
        return {
            valid: false,
            canAdd: false,
            error: error.message
        };
    }
}

/**
 * Get available profiles for addition
 */
export async function getAvailableProfiles(currentProfiles) {
    try {
        const allProfiles = await api.get('/profiles');
        
        // Filter out already installed profiles
        const availableProfiles = allProfiles.profiles.filter(profile => 
            !currentProfiles.includes(profile.id)
        );

        return availableProfiles;
    } catch (error) {
        console.error('Error getting available profiles:', error);
        return [];
    }
}