/**
 * Configure Module
 * Handles configuration form loading and management
 * Updated for new profile architecture with dependency validation
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

// Profile selection state
let selectedProfiles = [];
let profileData = null;

/**
 * Load configuration form from API
 * Generates default configuration based on selected profiles
 */
export async function loadConfigurationForm() {
    try {
        // Get selected profiles from state
        const selectedProfiles = stateManager.get('selectedProfiles') || [];
        
        if (selectedProfiles.length === 0) {
            showNotification('Please select at least one profile first', 'warning');
            return null;
        }
        
        // Request default configuration from API
        const response = await api.post('/config/default', {
            profiles: selectedProfiles
        });
        
        if (!response.config) {
            throw new Error('Invalid response from configuration API');
        }
        
        // Store configuration in state
        stateManager.set('configuration', response.config);
        
        // Populate form fields
        populateConfigurationForm(response.config);
        
        showNotification('Configuration loaded successfully', 'success');
        return response.config;
        
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showNotification(`Failed to load configuration: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Populate configuration form with values
 */
function populateConfigurationForm(config) {
    // External IP
    const externalIpInput = document.getElementById('external-ip');
    if (externalIpInput && config.EXTERNAL_IP) {
        externalIpInput.value = config.EXTERNAL_IP;
    }
    
    // Public node toggle
    const publicNodeToggle = document.getElementById('public-node');
    if (publicNodeToggle) {
        publicNodeToggle.checked = config.PUBLIC_NODE || false;
    }
    
    // Database password
    const dbPasswordInput = document.getElementById('db-password');
    if (dbPasswordInput && config.POSTGRES_PASSWORD) {
        dbPasswordInput.value = config.POSTGRES_PASSWORD;
        dbPasswordInput.placeholder = 'Auto-generated password';
    }
    
    // Kaspa Network
    const kaspaNetworkSelect = document.getElementById('kaspa-network');
    const currentNetworkDisplay = document.getElementById('current-network-display');
    if (kaspaNetworkSelect && config.KASPA_NETWORK) {
        kaspaNetworkSelect.value = config.KASPA_NETWORK;
        if (currentNetworkDisplay) {
            currentNetworkDisplay.textContent = config.KASPA_NETWORK;
        }
    }
    
    // Kaspa Node Ports
    const rpcPortDisplay = document.getElementById('rpc-port-display');
    if (rpcPortDisplay && config.KASPA_NODE_RPC_PORT) {
        rpcPortDisplay.textContent = config.KASPA_NODE_RPC_PORT;
    }
    
    const p2pPortDisplay = document.getElementById('p2p-port-display');
    if (p2pPortDisplay && config.KASPA_NODE_P2P_PORT) {
        p2pPortDisplay.textContent = config.KASPA_NODE_P2P_PORT;
    }
    
    // Indexer Endpoints
    const kasiaIndexerUrlInput = document.getElementById('kasia-indexer-url');
    if (kasiaIndexerUrlInput && config.REMOTE_KASIA_INDEXER_URL) {
        kasiaIndexerUrlInput.value = config.REMOTE_KASIA_INDEXER_URL;
    }
    
    const ksocialIndexerUrlInput = document.getElementById('ksocial-indexer-url');
    if (ksocialIndexerUrlInput && config.REMOTE_KSOCIAL_INDEXER_URL) {
        ksocialIndexerUrlInput.value = config.REMOTE_KSOCIAL_INDEXER_URL;
    }
    
    const kaspaNodeWsUrlInput = document.getElementById('kaspa-node-ws-url');
    if (kaspaNodeWsUrlInput && config.REMOTE_KASPA_NODE_WBORSH_URL) {
        kaspaNodeWsUrlInput.value = config.REMOTE_KASPA_NODE_WBORSH_URL;
    }
    
    // Data directories
    const kaspaDataDirInput = document.getElementById('kaspa-data-dir');
    if (kaspaDataDirInput && config.KASPA_DATA_DIR) {
        kaspaDataDirInput.value = config.KASPA_DATA_DIR;
    }
    
    const archiveDataDirInput = document.getElementById('kaspa-archive-data-dir');
    if (archiveDataDirInput && config.KASPA_ARCHIVE_DATA_DIR) {
        archiveDataDirInput.value = config.KASPA_ARCHIVE_DATA_DIR;
    }
    
    const timescaledbDataDirInput = document.getElementById('timescaledb-data-dir');
    if (timescaledbDataDirInput && config.TIMESCALEDB_DATA_DIR) {
        timescaledbDataDirInput.value = config.TIMESCALEDB_DATA_DIR;
    }
    
    // Show/hide sections based on profiles
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    updateFormVisibility(selectedProfiles);
}

/**
 * Update form visibility based on selected profiles
 */
function updateFormVisibility(profiles) {
    // Network Configuration section - show for core, archive-node, indexer-services, mining
    // Hide for kaspa-user-applications (they don't need external IP or public node toggle)
    const networkSection = document.querySelector('.config-section:has(#external-ip)');
    if (networkSection) {
        const needsNetwork = profiles.includes('core') || profiles.includes('archive-node') || 
                            profiles.includes('indexer-services') || profiles.includes('mining');
        networkSection.style.display = needsNetwork ? 'block' : 'none';
    }
    
    // Indexer Endpoints section - show ONLY if kaspa-user-applications profile is selected
    const indexerSection = document.getElementById('indexer-endpoints-section');
    if (indexerSection) {
        const needsIndexerEndpoints = profiles.includes('kaspa-user-applications');
        indexerSection.style.display = needsIndexerEndpoints ? 'block' : 'none';
    }
    
    // Database section - show ONLY if indexer-services profile is selected
    // Kaspa User Applications use public indexers by default and don't need database config
    const dbSection = document.querySelector('.config-section:has(#db-password)');
    if (dbSection) {
        const needsDatabase = profiles.includes('indexer-services');
        dbSection.style.display = needsDatabase ? 'block' : 'none';
    }
    
    // Kaspa Node Configuration section - show if core or archive-node profiles are selected
    const kaspaNodeSection = document.getElementById('kaspa-node-config-section');
    if (kaspaNodeSection) {
        const needsKaspaNode = profiles.includes('core') || profiles.includes('archive-node');
        kaspaNodeSection.style.display = needsKaspaNode ? 'block' : 'none';
    }
    
    // Advanced options data directory fields
    updateAdvancedOptionsVisibility(profiles);
}

/**
 * Update advanced options visibility based on selected profiles
 */
function updateAdvancedOptionsVisibility(profiles) {
    // Kaspa node data directory - show for core profile
    const kaspaDataDirGroup = document.getElementById('kaspa-data-dir-group');
    if (kaspaDataDirGroup) {
        kaspaDataDirGroup.style.display = profiles.includes('core') ? 'block' : 'none';
    }
    
    // Archive node data directory - show for archive-node profile
    const archiveDataDirGroup = document.getElementById('kaspa-archive-data-dir-group');
    if (archiveDataDirGroup) {
        archiveDataDirGroup.style.display = profiles.includes('archive-node') ? 'block' : 'none';
    }
    
    // TimescaleDB data directory - show for indexer-services profile
    const timescaledbDataDirGroup = document.getElementById('timescaledb-data-dir-group');
    if (timescaledbDataDirGroup) {
        timescaledbDataDirGroup.style.display = profiles.includes('indexer-services') ? 'block' : 'none';
    }
}

/**
 * Validation rules for form fields
 */
const validationRules = {
    'external-ip': {
        pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        message: 'Please enter a valid IPv4 address',
        required: false
    },
    'db-password': {
        minLength: 16,
        message: 'Password must be at least 16 characters long',
        required: false  // Conditionally required based on selected profiles
    },
    'custom-env': {
        validator: validateCustomEnvVars,
        message: 'Invalid environment variable format. Use KEY=value format',
        required: false
    }
};

/**
 * Validate a single form field
 */
function validateField(fieldId, value) {
    const rule = validationRules[fieldId];
    if (!rule) return { valid: true };
    
    // Check if field is required
    if (rule.required && (!value || value.trim() === '')) {
        return { valid: false, message: 'This field is required' };
    }
    
    // Skip validation if field is empty and not required
    if (!value || value.trim() === '') {
        return { valid: true };
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
        return { valid: false, message: rule.message };
    }
    
    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
        return { valid: false, message: rule.message };
    }
    
    // Custom validator
    if (rule.validator) {
        const result = rule.validator(value);
        if (!result.valid) {
            return { valid: false, message: rule.message };
        }
    }
    
    return { valid: true };
}

/**
 * Validate custom environment variables format
 */
function validateCustomEnvVars(value) {
    const lines = value.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            // Check if line has KEY=value format
            if (!trimmed.includes('=')) {
                return { valid: false };
            }
            const [key] = trimmed.split('=');
            // Check if key is valid (alphanumeric and underscore)
            if (!/^[A-Z_][A-Z0-9_]*$/.test(key.trim())) {
                return { valid: false };
            }
        }
    }
    return { valid: true };
}

/**
 * Show validation error on field
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Add error class to field
    field.classList.add('field-error');
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.field-error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
}

/**
 * Clear validation error from field
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove error class
    field.classList.remove('field-error');
    
    // Remove error message
    const errorMessage = field.parentElement.querySelector('.field-error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

/**
 * Setup real-time validation for form fields
 */
export function setupFormValidation() {
    // Add validation listeners to all validated fields
    Object.keys(validationRules).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Validate on blur (when user leaves the field)
        field.addEventListener('blur', () => {
            const value = field.value;
            const result = validateField(fieldId, value);
            
            if (!result.valid) {
                showFieldError(fieldId, result.message);
            } else {
                clearFieldError(fieldId);
            }
        });
        
        // Clear error on input (as user types)
        field.addEventListener('input', () => {
            clearFieldError(fieldId);
        });
    });
}

/**
 * Validate all form fields
 */
function validateAllFields() {
    let isValid = true;
    const errors = [];
    
    // Validate each field with rules
    Object.keys(validationRules).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const value = field.value;
        const result = validateField(fieldId, value);
        
        if (!result.valid) {
            isValid = false;
            showFieldError(fieldId, result.message);
            errors.push({ field: fieldId, message: result.message });
        } else {
            clearFieldError(fieldId);
        }
    });
    
    // Check if database password is required based on selected profiles
    // Only indexer-services profile needs database configuration
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    const needsDatabase = selectedProfiles.includes('indexer-services');
    
    if (needsDatabase) {
        const dbPasswordField = document.getElementById('db-password');
        if (dbPasswordField && (!dbPasswordField.value || dbPasswordField.value.trim() === '')) {
            isValid = false;
            showFieldError('db-password', 'Database password is required for indexer services');
            errors.push({ field: 'db-password', message: 'Database password is required' });
        }
    }
    
    return { valid: isValid, errors };
}

/**
 * Validate configuration form
 */
export async function validateConfiguration() {
    try {
        console.log('=== Starting configuration validation ===');
        
        // First, validate client-side
        const clientValidation = validateAllFields();
        console.log('Client-side validation result:', clientValidation);
        
        if (!clientValidation.valid) {
            console.error('Client-side validation failed:');
            clientValidation.errors.forEach(error => {
                console.error(`  - Field: ${error.field}, Message: ${error.message}`);
            });
            showNotification('Please fix the validation errors before continuing', 'error');
            return false;
        }
        
        // Then validate server-side
        const config = gatherConfigurationFromForm();
        const profiles = stateManager.get('selectedProfiles') || [];
        console.log('Configuration to validate:', config);
        console.log('Selected profiles:', profiles);
        
        const response = await api.post('/config/validate', { config, profiles });
        console.log('Server validation response:', response);
        
        if (!response.valid) {
            console.error('Server-side validation failed:', response.errors);
            
            // Show server-side validation errors
            if (response.errors && Array.isArray(response.errors)) {
                response.errors.forEach(error => {
                    const fieldId = error.field.replace(/\./g, '-').toLowerCase();
                    showFieldError(fieldId, error.message);
                });
                
                const errorMessages = response.errors.map(e => `${e.field}: ${e.message}`).join('\n');
                showNotification(`Configuration validation failed:\n${errorMessages}`, 'error', 5000);
            } else {
                showNotification('Configuration validation failed', 'error');
            }
            return false;
        }
        
        // Update state with validated config
        console.log('Validation successful, updating state with config:', config);
        stateManager.set('configuration', config);
        return true;
        
    } catch (error) {
        console.error('Configuration validation exception:', error);
        console.error('Error stack:', error.stack);
        showNotification(`Validation error: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Gather configuration from form fields
 */
function gatherConfigurationFromForm() {
    const config = {};
    
    // External IP
    const externalIpInput = document.getElementById('external-ip');
    if (externalIpInput && externalIpInput.value) {
        config.EXTERNAL_IP = externalIpInput.value;
    }
    
    // Public node
    const publicNodeToggle = document.getElementById('public-node');
    if (publicNodeToggle) {
        config.PUBLIC_NODE = publicNodeToggle.checked;
    }
    
    // Database password
    const dbPasswordInput = document.getElementById('db-password');
    if (dbPasswordInput && dbPasswordInput.value) {
        config.POSTGRES_PASSWORD = dbPasswordInput.value;
    }
    
    // Indexer Endpoints
    const kasiaIndexerUrlInput = document.getElementById('kasia-indexer-url');
    if (kasiaIndexerUrlInput && kasiaIndexerUrlInput.value) {
        config.REMOTE_KASIA_INDEXER_URL = kasiaIndexerUrlInput.value;
    }
    
    const ksocialIndexerUrlInput = document.getElementById('ksocial-indexer-url');
    if (ksocialIndexerUrlInput && ksocialIndexerUrlInput.value) {
        config.REMOTE_KSOCIAL_INDEXER_URL = ksocialIndexerUrlInput.value;
    }
    
    const kaspaNodeWsUrlInput = document.getElementById('kaspa-node-ws-url');
    if (kaspaNodeWsUrlInput && kaspaNodeWsUrlInput.value) {
        config.REMOTE_KASPA_NODE_WBORSH_URL = kaspaNodeWsUrlInput.value;
    }
    
    // Kaspa Network
    const kaspaNetworkSelect = document.getElementById('kaspa-network');
    if (kaspaNetworkSelect) {
        config.KASPA_NETWORK = kaspaNetworkSelect.value;
    }
    
    // Kaspa Node Ports (from display values, as they're updated by modal)
    const rpcPortDisplay = document.getElementById('rpc-port-display');
    if (rpcPortDisplay) {
        config.KASPA_NODE_RPC_PORT = parseInt(rpcPortDisplay.textContent);
    }
    
    const p2pPortDisplay = document.getElementById('p2p-port-display');
    if (p2pPortDisplay) {
        config.KASPA_NODE_P2P_PORT = parseInt(p2pPortDisplay.textContent);
    }
    
    // Data directories (from advanced options)
    const kaspaDataDirInput = document.getElementById('kaspa-data-dir');
    if (kaspaDataDirInput && kaspaDataDirInput.value) {
        config.KASPA_DATA_DIR = kaspaDataDirInput.value;
    }
    
    const archiveDataDirInput = document.getElementById('kaspa-archive-data-dir');
    if (archiveDataDirInput && archiveDataDirInput.value) {
        config.KASPA_ARCHIVE_DATA_DIR = archiveDataDirInput.value;
    }
    
    const timescaledbDataDirInput = document.getElementById('timescaledb-data-dir');
    if (timescaledbDataDirInput && timescaledbDataDirInput.value) {
        config.TIMESCALEDB_DATA_DIR = timescaledbDataDirInput.value;
    }
    
    // Developer Mode
    const developerModeToggle = document.getElementById('developer-mode-toggle');
    if (developerModeToggle) {
        config.DEVELOPER_MODE = developerModeToggle.checked;
    }
    
    // Custom environment variables
    const customEnvTextarea = document.getElementById('custom-env');
    if (customEnvTextarea && customEnvTextarea.value) {
        // Parse custom env vars
        const lines = customEnvTextarea.value.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    config[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
    
    return config;
}

/**
 * Save configuration
 */
export async function saveConfiguration() {
    try {
        const config = gatherConfigurationFromForm();
        const profiles = stateManager.get('selectedProfiles') || [];
        
        const response = await api.post('/config/save', {
            config,
            profiles
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to save configuration');
        }
        
        showNotification('Configuration saved successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Failed to save configuration:', error);
        showNotification(`Failed to save configuration: ${error.message}`, 'error');
        return false;
    }
}


/**
 * Setup Developer Mode toggle
 */
export function setupDeveloperModeToggle() {
    const toggle = document.getElementById('developer-mode-toggle');
    const details = document.getElementById('developer-mode-details');
    
    if (!toggle || !details) return;
    
    // Handle toggle change
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            details.style.display = 'block';
            stateManager.set('developerMode', true);
        } else {
            details.style.display = 'none';
            stateManager.set('developerMode', false);
        }
    });
    
    // Load saved state
    const savedState = stateManager.get('developerMode');
    if (savedState) {
        toggle.checked = true;
        details.style.display = 'block';
    }
}

/**
 * Setup network change detection
 */
export function setupNetworkChangeDetection() {
    const networkSelect = document.getElementById('kaspa-network');
    if (!networkSelect) return;
    
    // Store initial network value
    let previousNetwork = networkSelect.value;
    
    networkSelect.addEventListener('change', (e) => {
        const newNetwork = e.target.value;
        const currentNetwork = document.getElementById('current-network-display').textContent;
        
        // If network is different from current, show warning
        if (newNetwork !== currentNetwork) {
            // Show warning modal
            if (window.openNetworkChangeWarning) {
                window.openNetworkChangeWarning(newNetwork);
            }
        } else {
            // Network matches current, just update display
            document.getElementById('current-network-display').textContent = newNetwork;
        }
    });
}

/**
 * Setup advanced options toggle
 */
export function setupAdvancedOptionsToggle() {
    const advancedModeCheckbox = document.getElementById('advanced-mode');
    const advancedOptions = document.getElementById('advanced-options');
    
    if (!advancedModeCheckbox || !advancedOptions) return;
    
    advancedModeCheckbox.addEventListener('change', () => {
        if (advancedModeCheckbox.checked) {
            advancedOptions.style.display = 'block';
            // Update visibility of data directory fields based on selected profiles
            const selectedProfiles = stateManager.get('selectedProfiles') || [];
            updateAdvancedOptionsVisibility(selectedProfiles);
        } else {
            advancedOptions.style.display = 'none';
        }
    });
}


/**
 * Initialize profile selection
 */
export async function initializeProfileSelection() {
    try {
        // Load profile data from API
        const response = await api.get('/profiles');
        profileData = response.profiles || response;
        
        // Load saved selection from state
        selectedProfiles = stateManager.get('selectedProfiles') || [];
        
        // Setup profile card click handlers
        setupProfileCardHandlers();
        
        // Restore selected state
        updateProfileCardStates();
        
        // Update UI based on selection
        await updateProfileSelectionUI();
        
    } catch (error) {
        console.error('Failed to initialize profile selection:', error);
        showNotification('Failed to load profiles', 'error');
    }
}

/**
 * Setup click handlers for profile cards
 */
function setupProfileCardHandlers() {
    const profileCards = document.querySelectorAll('.profile-card');
    
    profileCards.forEach(card => {
        card.addEventListener('click', async () => {
            const profileId = card.dataset.profile;
            
            // Toggle selection
            if (selectedProfiles.includes(profileId)) {
                selectedProfiles = selectedProfiles.filter(id => id !== profileId);
            } else {
                selectedProfiles.push(profileId);
            }
            
            // Save to state
            stateManager.set('selectedProfiles', selectedProfiles);
            
            // Update UI
            updateProfileCardStates();
            await updateProfileSelectionUI();
        });
    });
}

/**
 * Update visual state of profile cards
 */
function updateProfileCardStates() {
    const profileCards = document.querySelectorAll('.profile-card');
    
    profileCards.forEach(card => {
        const profileId = card.dataset.profile;
        
        if (selectedProfiles.includes(profileId)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

/**
 * Update profile selection UI (warnings, resources, startup order)
 */
async function updateProfileSelectionUI() {
    if (selectedProfiles.length === 0) {
        // Hide all dynamic sections
        hideElement('dependency-warning');
        hideElement('resource-warning');
        hideElement('combined-resources');
        hideElement('startup-order');
        return;
    }
    
    try {
        // Validate selection with backend
        const validation = await api.post('/profiles/validate-selection', {
            profiles: selectedProfiles
        });
        
        // Show dependency warnings
        if (validation.errors && validation.errors.length > 0) {
            showDependencyWarning(validation.errors);
        } else {
            hideElement('dependency-warning');
        }
        
        // Show resource warnings
        if (validation.warnings && validation.warnings.length > 0) {
            showResourceWarning(validation.warnings);
        } else {
            hideElement('resource-warning');
        }
        
        // Show combined resources
        if (validation.resources) {
            showCombinedResources(validation.resources);
        }
        
        // Show startup order
        if (validation.startupOrder) {
            showStartupOrder(validation.startupOrder);
        }
        
    } catch (error) {
        console.error('Failed to validate profile selection:', error);
        showNotification('Failed to validate selection', 'error');
    }
}

/**
 * Show dependency warning
 */
function showDependencyWarning(errors) {
    const warningEl = document.getElementById('dependency-warning');
    const messageEl = document.getElementById('dependency-warning-message');
    
    if (!warningEl || !messageEl) return;
    
    const messages = errors.map(err => `• ${err.message || err}`).join('<br>');
    messageEl.innerHTML = messages;
    warningEl.style.display = 'flex';
}

/**
 * Show resource warning
 */
function showResourceWarning(warnings) {
    const warningEl = document.getElementById('resource-warning');
    const messageEl = document.getElementById('resource-warning-message');
    
    if (!warningEl || !messageEl) return;
    
    const messages = warnings.map(warn => `• ${warn.message || warn}`).join('<br>');
    messageEl.innerHTML = messages;
    warningEl.style.display = 'flex';
}

/**
 * Show combined resource requirements
 */
function showCombinedResources(resources) {
    const containerEl = document.getElementById('combined-resources');
    const cpuEl = document.getElementById('combined-cpu');
    const ramEl = document.getElementById('combined-ram');
    const diskEl = document.getElementById('combined-disk');
    
    if (!containerEl || !cpuEl || !ramEl || !diskEl) return;
    
    cpuEl.textContent = `${resources.minCpu} cores (${resources.recommendedCpu} recommended)`;
    ramEl.textContent = `${resources.minMemory} GB (${resources.recommendedMemory} GB recommended)`;
    diskEl.textContent = `${resources.minDisk} GB (${resources.recommendedDisk} GB recommended)`;
    
    containerEl.style.display = 'block';
}

/**
 * Show startup order visualization
 */
function showStartupOrder(startupOrder) {
    const containerEl = document.getElementById('startup-order');
    
    if (!containerEl) return;
    
    // Clear previous content
    const phases = [1, 2, 3];
    phases.forEach(phase => {
        const phaseEl = document.getElementById(`phase-${phase}`);
        const arrowEl = document.getElementById(`arrow-${phase}`);
        const servicesEl = document.getElementById(`phase-${phase}-services`);
        
        if (phaseEl) phaseEl.style.display = 'none';
        if (arrowEl) arrowEl.style.display = 'none';
        if (servicesEl) servicesEl.innerHTML = '';
    });
    
    // Populate phases
    let hasContent = false;
    
    Object.keys(startupOrder).forEach(phase => {
        const phaseNum = parseInt(phase);
        const services = startupOrder[phase];
        
        if (services && services.length > 0) {
            hasContent = true;
            
            const phaseEl = document.getElementById(`phase-${phaseNum}`);
            const servicesEl = document.getElementById(`phase-${phaseNum}-services`);
            
            if (phaseEl && servicesEl) {
                phaseEl.style.display = 'flex';
                servicesEl.innerHTML = services.map(s => `<span class="service-tag">${s}</span>`).join(' ');
                
                // Show arrow if not last phase
                if (phaseNum < 3) {
                    const nextPhase = startupOrder[phaseNum + 1];
                    if (nextPhase && nextPhase.length > 0) {
                        const arrowEl = document.getElementById(`arrow-${phaseNum}`);
                        if (arrowEl) arrowEl.style.display = 'block';
                    }
                }
            }
        }
    });
    
    containerEl.style.display = hasContent ? 'block' : 'none';
}

/**
 * Hide element
 */
function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/**
 * Get selected profiles
 */
export function getSelectedProfiles() {
    return selectedProfiles;
}
