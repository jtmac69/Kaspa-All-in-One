/**
 * Configure Module
 * Handles configuration form loading and management
 * Updated for new profile architecture with dependency validation
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';
import { 
    openProfileAdditionDialog, 
    closeProfileAdditionDialog, 
    confirmProfileAddition 
} from './profile-addition.js';
import { 
    openProfileRemovalDialog, 
    closeProfileRemovalDialog 
} from './profile-removal.js';

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
    
    // K-Social Database password
    const kSocialDbPasswordInput = document.getElementById('k-social-db-password');
    if (kSocialDbPasswordInput && config.K_SOCIAL_DB_PASSWORD) {
        kSocialDbPasswordInput.value = config.K_SOCIAL_DB_PASSWORD;
        kSocialDbPasswordInput.placeholder = 'Auto-generated password';
    }
    
    // Simply Kaspa Database password
    const simplyKaspaDbPasswordInput = document.getElementById('simply-kaspa-db-password');
    if (simplyKaspaDbPasswordInput && config.SIMPLY_KASPA_DB_PASSWORD) {
        simplyKaspaDbPasswordInput.value = config.SIMPLY_KASPA_DB_PASSWORD;
        simplyKaspaDbPasswordInput.placeholder = 'Auto-generated password';
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
    // Network Configuration section - show for core, archive-node, mining
    // Hide for kaspa-user-applications and indexer-services (they don't need external IP or public node toggle)
    // indexer-services connect TO nodes, they don't serve as public nodes
    const networkSection = document.querySelector('.config-section:has(#external-ip)');
    if (networkSection) {
        const needsNetwork = profiles.includes('core') || profiles.includes('archive-node') || 
                            profiles.includes('mining');
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
    const dbSection = document.querySelector('.config-section:has(#k-social-db-password)');
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
    'k-social-db-password': {
        minLength: 12,
        message: 'Password must be at least 12 characters long',
        required: false  // Conditionally required based on selected profiles
    },
    'simply-kaspa-db-password': {
        minLength: 12,
        message: 'Password must be at least 12 characters long',
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
    
    // Check if database passwords are required based on selected profiles
    // Only indexer-services profile needs database configuration
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    const needsDatabase = selectedProfiles.includes('indexer-services');
    
    if (needsDatabase) {
        const kSocialDbPasswordField = document.getElementById('k-social-db-password');
        if (kSocialDbPasswordField && (!kSocialDbPasswordField.value || kSocialDbPasswordField.value.trim() === '')) {
            isValid = false;
            showFieldError('k-social-db-password', 'K-Social Database Password is required');
            errors.push({ field: 'k-social-db-password', message: 'K-Social Database Password is required' });
        }
        
        const simplyKaspaDbPasswordField = document.getElementById('simply-kaspa-db-password');
        if (simplyKaspaDbPasswordField && (!simplyKaspaDbPasswordField.value || simplyKaspaDbPasswordField.value.trim() === '')) {
            isValid = false;
            showFieldError('simply-kaspa-db-password', 'Simply Kaspa Database Password is required');
            errors.push({ field: 'simply-kaspa-db-password', message: 'Simply Kaspa Database Password is required' });
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
    
    // K-Social Database password
    const kSocialDbPasswordInput = document.getElementById('k-social-db-password');
    if (kSocialDbPasswordInput && kSocialDbPasswordInput.value) {
        config.K_SOCIAL_DB_PASSWORD = kSocialDbPasswordInput.value;
    }
    
    // Simply Kaspa Database password
    const simplyKaspaDbPasswordInput = document.getElementById('simply-kaspa-db-password');
    if (simplyKaspaDbPasswordInput && simplyKaspaDbPasswordInput.value) {
        config.SIMPLY_KASPA_DB_PASSWORD = simplyKaspaDbPasswordInput.value;
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
    
    // Indexer Connection Mode (Advanced Configuration)
    const indexerConnectionModeSelect = document.getElementById('indexer-connection-mode');
    if (indexerConnectionModeSelect) {
        config.INDEXER_CONNECTION_MODE = indexerConnectionModeSelect.value;
    }
    
    // Individual indexer connections (for mixed mode)
    const kasiaConnectionSelect = document.getElementById('kasia-indexer-connection');
    if (kasiaConnectionSelect && kasiaConnectionSelect.value) {
        config.KASIA_INDEXER_CONNECTION = kasiaConnectionSelect.value;
    }
    
    const ksocialConnectionSelect = document.getElementById('ksocial-indexer-connection');
    if (ksocialConnectionSelect && ksocialConnectionSelect.value) {
        config.KSOCIAL_INDEXER_CONNECTION = ksocialConnectionSelect.value;
    }
    
    const kaspaNodeConnectionSelect = document.getElementById('kaspa-node-connection');
    if (kaspaNodeConnectionSelect && kaspaNodeConnectionSelect.value) {
        config.KASPA_NODE_CONNECTION = kaspaNodeConnectionSelect.value;
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
    
    // Wallet Management (Advanced Configuration)
    const walletEnabledToggle = document.getElementById('wallet-enabled');
    if (walletEnabledToggle) {
        config.WALLET_ENABLED = walletEnabledToggle.checked;
    }
    
    const walletModeSelect = document.getElementById('wallet-mode');
    if (walletModeSelect && walletModeSelect.value) {
        config.WALLET_MODE = walletModeSelect.value;
    }
    
    const walletPasswordInput = document.getElementById('wallet-password');
    if (walletPasswordInput && walletPasswordInput.value) {
        config.WALLET_PASSWORD = walletPasswordInput.value;
    }
    
    const walletSeedPhraseInput = document.getElementById('wallet-seed-phrase');
    if (walletSeedPhraseInput && walletSeedPhraseInput.value) {
        config.WALLET_SEED_PHRASE = walletSeedPhraseInput.value;
    }
    
    const miningAddressInput = document.getElementById('mining-address');
    if (miningAddressInput && miningAddressInput.value) {
        config.MINING_ADDRESS = miningAddressInput.value;
    }
    
    // Configuration Template
    const configTemplateSelect = document.getElementById('configuration-template');
    if (configTemplateSelect && configTemplateSelect.value && configTemplateSelect.value !== 'custom') {
        config.CONFIGURATION_TEMPLATE = configTemplateSelect.value;
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
        
        // Add removal buttons for installed profiles in reconfiguration mode
        updateProfileCardActions(card, profileId);
    });
}

/**
 * Update profile card actions (add/remove buttons) based on installation state
 */
function updateProfileCardActions(card, profileId) {
    // Check if we're in reconfiguration mode
    const isReconfigurationMode = stateManager.get('wizardMode') === 'reconfigure';
    
    if (!isReconfigurationMode) {
        // Remove any existing action buttons in normal mode
        const existingActions = card.querySelector('.profile-actions');
        if (existingActions) {
            existingActions.remove();
        }
        return;
    }
    
    // Get profile installation state
    const profileStates = stateManager.get('profileStates') || {};
    const profileState = profileStates[profileId];
    const isInstalled = profileState && profileState.installationState === 'installed';
    
    // Remove existing actions
    const existingActions = card.querySelector('.profile-actions');
    if (existingActions) {
        existingActions.remove();
    }
    
    // Create actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'profile-actions';
    
    if (isInstalled) {
        // Add modify and remove buttons for installed profiles
        actionsContainer.innerHTML = `
            <button class="btn-secondary btn-small profile-action-btn" 
                    onclick="modifyProfileConfiguration('${profileId}')"
                    title="Modify configuration">
                <span class="btn-icon">⚙️</span>
                Modify
            </button>
            <button class="btn-danger btn-small profile-action-btn" 
                    onclick="initiateProfileRemoval('${profileId}')"
                    title="Remove profile">
                <span class="btn-icon">🗑️</span>
                Remove
            </button>
        `;
    } else {
        // Add install button for available profiles
        actionsContainer.innerHTML = `
            <button class="btn-primary btn-small profile-action-btn" 
                    onclick="initiateProfileAddition('${profileId}')"
                    title="Add profile">
                <span class="btn-icon">➕</span>
                Add
            </button>
        `;
    }
    
    // Insert actions before the last element (usually profile-resources or similar)
    const lastElement = card.lastElementChild;
    card.insertBefore(actionsContainer, lastElement);
}

/**
 * Initiate profile removal workflow
 */
window.initiateProfileRemoval = async function(profileId) {
    try {
        // Get current profiles from state
        const currentProfiles = stateManager.get('selectedProfiles') || [];
        
        // Open removal dialog
        await openProfileRemovalDialog(profileId, currentProfiles);
        
    } catch (error) {
        console.error('Failed to initiate profile removal:', error);
        showNotification(`Failed to start removal process: ${error.message}`, 'error');
    }
};

/**
 * Initiate profile addition workflow
 */
window.initiateProfileAddition = async function(profileId) {
    try {
        // Get current profiles from state
        const currentProfiles = stateManager.get('selectedProfiles') || [];
        
        // Open addition dialog
        await openProfileAdditionDialog(profileId, currentProfiles);
        
    } catch (error) {
        console.error('Failed to initiate profile addition:', error);
        showNotification(`Failed to start addition process: ${error.message}`, 'error');
    }
};

/**
 * Modify profile configuration
 */
window.modifyProfileConfiguration = async function(profileId) {
    try {
        // Load current configuration for the profile
        const response = await api.get(`/wizard/config/current/${profileId}`);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load profile configuration');
        }
        
        // Store profile modification context
        stateManager.set('modifyingProfile', profileId);
        stateManager.set('currentProfileConfig', response.currentConfig);
        stateManager.set('profileFields', response.availableFields);
        stateManager.set('profileServiceStatus', response.serviceStatus);
        
        // Show configuration modification dialog
        await showConfigurationModificationDialog(profileId, response);
        
    } catch (error) {
        console.error('Failed to modify profile configuration:', error);
        showNotification(`Failed to load configuration: ${error.message}`, 'error');
    }
};

/**
 * Show configuration modification dialog
 */
async function showConfigurationModificationDialog(profileId, configData) {
    // Create or show the configuration modification modal
    let modal = document.getElementById('config-modification-modal');
    
    if (!modal) {
        modal = createConfigurationModificationModal();
        document.body.appendChild(modal);
    }
    
    // Populate the modal with current configuration
    await populateConfigurationModificationModal(modal, profileId, configData);
    
    // Show the modal
    modal.style.display = 'flex';
}

/**
 * Create configuration modification modal
 */
function createConfigurationModificationModal() {
    const modal = document.createElement('div');
    modal.id = 'config-modification-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content config-modification-modal">
            <div class="modal-header">
                <h3 class="modal-title" id="config-modification-title">Modify Configuration</h3>
                <button class="modal-close" onclick="closeConfigurationModificationModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Profile Info -->
                <div class="profile-info-section">
                    <div class="profile-info-header">
                        <div class="profile-icon" id="config-profile-icon">⚙️</div>
                        <div class="profile-details">
                            <h4 id="config-profile-name">Profile Name</h4>
                            <p id="config-profile-description">Profile description</p>
                        </div>
                        <div class="profile-status" id="config-profile-status">
                            <div class="status-indicator running"></div>
                            <span class="status-text">Running</span>
                        </div>
                    </div>
                    <div class="service-status-summary" id="config-service-status">
                        <!-- Service status will be populated here -->
                    </div>
                </div>
                
                <!-- Configuration Form -->
                <div class="config-modification-form" id="config-modification-form">
                    <!-- Configuration fields will be populated here -->
                </div>
                
                <!-- Configuration Preview -->
                <div class="config-preview-section" id="config-preview-section" style="display: none;">
                    <h4>Configuration Changes</h4>
                    <div class="config-diff" id="config-diff">
                        <!-- Diff will be shown here -->
                    </div>
                    <div class="impact-summary" id="impact-summary">
                        <!-- Impact summary will be shown here -->
                    </div>
                </div>
                
                <!-- Warnings -->
                <div class="config-warnings" id="config-warnings" style="display: none;">
                    <!-- Warnings will be shown here -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeConfigurationModificationModal()">
                    Cancel
                </button>
                <button class="btn-secondary" onclick="previewConfigurationChanges()" id="preview-changes-btn">
                    Preview Changes
                </button>
                <button class="btn-primary" onclick="applyConfigurationChanges()" id="apply-changes-btn" disabled>
                    Apply Changes
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * Populate configuration modification modal
 */
async function populateConfigurationModificationModal(modal, profileId, configData) {
    // Update profile info
    const profileName = modal.querySelector('#config-profile-name');
    const profileDescription = modal.querySelector('#config-profile-description');
    const profileStatus = modal.querySelector('#config-profile-status');
    const serviceStatus = modal.querySelector('#config-service-status');
    
    if (profileName) profileName.textContent = configData.profileName;
    if (profileDescription) profileDescription.textContent = getProfileDescription(profileId);
    
    // Update service status
    if (serviceStatus && configData.serviceStatus) {
        const { services, allRunning, runningCount, totalCount } = configData.serviceStatus;
        
        // Update status indicator
        const statusIndicator = profileStatus.querySelector('.status-indicator');
        const statusText = profileStatus.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${allRunning ? 'running' : 'partial'}`;
            statusText.textContent = allRunning ? 'All Running' : `${runningCount}/${totalCount} Running`;
        }
        
        // Show service details
        serviceStatus.innerHTML = services.map(service => `
            <div class="service-status-item">
                <div class="service-icon ${service.running ? 'running' : 'stopped'}"></div>
                <span class="service-name">${service.name}</span>
                <span class="service-status-text">${service.status}</span>
            </div>
        `).join('');
    }
    
    // Create configuration form
    const form = modal.querySelector('#config-modification-form');
    if (form && configData.availableFields) {
        form.innerHTML = createConfigurationForm(configData.availableFields, configData.currentConfig);
        
        // Setup form validation and change detection
        setupConfigurationFormHandlers(form, profileId);
    }
}

/**
 * Create configuration form HTML
 */
function createConfigurationForm(fields, currentConfig) {
    const groupedFields = groupFieldsByCategory(fields);
    let formHTML = '';
    
    Object.entries(groupedFields).forEach(([category, categoryFields]) => {
        formHTML += `
            <div class="config-form-section">
                <h5 class="config-section-title">${formatCategoryName(category)}</h5>
                <div class="config-form-fields">
        `;
        
        categoryFields.forEach(field => {
            const currentValue = currentConfig[field.key] || '';
            formHTML += createFieldHTML(field, currentValue);
        });
        
        formHTML += `
                </div>
            </div>
        `;
    });
    
    return formHTML;
}

/**
 * Create HTML for a single field
 */
function createFieldHTML(field, currentValue) {
    const fieldId = `config-${field.key.toLowerCase().replace(/_/g, '-')}`;
    
    let inputHTML = '';
    
    switch (field.type) {
        case 'number':
            inputHTML = `
                <input type="number" 
                       id="${fieldId}" 
                       class="form-input" 
                       value="${currentValue}" 
                       min="${field.min || ''}" 
                       max="${field.max || ''}"
                       data-field-key="${field.key}" />
            `;
            break;
            
        case 'select':
            const options = field.options.map(option => 
                `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`
            ).join('');
            inputHTML = `
                <select id="${fieldId}" class="form-select" data-field-key="${field.key}">
                    ${options}
                </select>
            `;
            break;
            
        case 'boolean':
            inputHTML = `
                <div class="form-toggle">
                    <input type="checkbox" 
                           id="${fieldId}" 
                           class="toggle-input" 
                           ${currentValue === 'true' || currentValue === true ? 'checked' : ''}
                           data-field-key="${field.key}" />
                    <label for="${fieldId}" class="toggle-label">
                        <span class="toggle-switch"></span>
                        <span class="toggle-text">Enable</span>
                    </label>
                </div>
            `;
            break;
            
        case 'password':
            inputHTML = `
                <div class="password-input-group">
                    <input type="password" 
                           id="${fieldId}" 
                           class="form-input" 
                           value="${currentValue}"
                           data-field-key="${field.key}" />
                    <button type="button" class="btn-icon-only" onclick="togglePasswordVisibility('${fieldId}')">
                        <span class="icon-eye">👁</span>
                    </button>
                </div>
            `;
            break;
            
        case 'url':
        case 'text':
        default:
            inputHTML = `
                <input type="text" 
                       id="${fieldId}" 
                       class="form-input" 
                       value="${currentValue}"
                       data-field-key="${field.key}" />
            `;
            break;
    }
    
    return `
        <div class="form-group">
            <label for="${fieldId}" class="form-label">
                ${field.label}
                <span class="form-tooltip" title="${getFieldTooltip(field)}">ⓘ</span>
            </label>
            ${inputHTML}
            <div class="field-error-message" id="${fieldId}-error" style="display: none;"></div>
        </div>
    `;
}

/**
 * Group fields by category
 */
function groupFieldsByCategory(fields) {
    const grouped = {};
    
    fields.forEach(field => {
        const category = getFieldCategory(field.key);
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(field);
    });
    
    return grouped;
}

/**
 * Get field category for grouping
 */
function getFieldCategory(fieldKey) {
    if (fieldKey.includes('PORT')) return 'network';
    if (fieldKey.includes('PASSWORD') || fieldKey.includes('USER')) return 'security';
    if (fieldKey.includes('DIR') || fieldKey.includes('DATA')) return 'storage';
    if (fieldKey.includes('URL') || fieldKey.includes('ENDPOINT')) return 'endpoints';
    if (fieldKey.includes('WALLET') || fieldKey.includes('MINING')) return 'wallet';
    return 'general';
}

/**
 * Format category name for display
 */
function formatCategoryName(category) {
    const names = {
        'network': 'Network Settings',
        'security': 'Security',
        'storage': 'Storage',
        'endpoints': 'Service Endpoints',
        'wallet': 'Wallet & Mining',
        'general': 'General Settings'
    };
    
    return names[category] || category;
}

/**
 * Get field tooltip
 */
function getFieldTooltip(field) {
    const tooltips = {
        'KASPA_NODE_RPC_PORT': 'Port for RPC connections to the Kaspa node',
        'KASPA_NODE_P2P_PORT': 'Port for peer-to-peer connections',
        'KASPA_NETWORK': 'Kaspa network (mainnet or testnet)',
        'KASPA_DATA_DIR': 'Directory for Kaspa node data storage',
        'PUBLIC_NODE': 'Allow external connections to your node',
        'EXTERNAL_IP': 'Your public IP address for P2P connections',
        'REMOTE_KASIA_INDEXER_URL': 'URL for Kasia indexer API',
        'REMOTE_KSOCIAL_INDEXER_URL': 'URL for K-Social indexer API',
        'KASPA_WALLET_ENABLED': 'Enable wallet functionality',
        'KASPA_MINING_ADDRESS': 'Address to receive mining rewards'
    };
    
    return tooltips[field.key] || `Configuration for ${field.label}`;
}

/**
 * Setup configuration form handlers
 */
function setupConfigurationFormHandlers(form, profileId) {
    // Add change listeners to all form fields
    const fields = form.querySelectorAll('[data-field-key]');
    
    fields.forEach(field => {
        field.addEventListener('change', () => {
            // Clear any existing error
            clearFieldError(field.id);
            
            // Enable preview button if there are changes
            checkForConfigurationChanges(profileId);
        });
        
        field.addEventListener('input', () => {
            // Clear error on input
            clearFieldError(field.id);
        });
    });
}

/**
 * Check for configuration changes
 */
function checkForConfigurationChanges(profileId) {
    const currentConfig = stateManager.get('currentProfileConfig') || {};
    const formConfig = gatherConfigurationFromModificationForm();
    
    // Calculate diff
    const diff = calculateConfigurationDiff(currentConfig, formConfig);
    
    // Enable/disable preview button
    const previewBtn = document.getElementById('preview-changes-btn');
    if (previewBtn) {
        previewBtn.disabled = !diff.hasChanges;
    }
    
    // Store current form state
    stateManager.set('modificationFormConfig', formConfig);
    stateManager.set('configurationDiff', diff);
}

/**
 * Gather configuration from modification form
 */
function gatherConfigurationFromModificationForm() {
    const config = {};
    const fields = document.querySelectorAll('#config-modification-form [data-field-key]');
    
    fields.forEach(field => {
        const key = field.dataset.fieldKey;
        let value;
        
        if (field.type === 'checkbox') {
            value = field.checked;
        } else if (field.type === 'number') {
            value = parseInt(field.value) || 0;
        } else {
            value = field.value;
        }
        
        config[key] = value;
    });
    
    return config;
}

/**
 * Preview configuration changes
 */
window.previewConfigurationChanges = async function() {
    try {
        const profileId = stateManager.get('modifyingProfile');
        const currentConfig = stateManager.get('currentProfileConfig') || {};
        const newConfig = gatherConfigurationFromModificationForm();
        
        // Validate changes with backend
        const response = await api.post('/wizard/config/validate-changes', {
            profileId,
            currentConfig,
            newConfig
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Validation failed');
        }
        
        // Show preview
        showConfigurationPreview(response);
        
        // Enable apply button if validation passed
        const applyBtn = document.getElementById('apply-changes-btn');
        if (applyBtn) {
            applyBtn.disabled = !response.valid;
        }
        
    } catch (error) {
        console.error('Failed to preview changes:', error);
        showNotification(`Failed to preview changes: ${error.message}`, 'error');
    }
};

/**
 * Show configuration preview
 */
function showConfigurationPreview(validationResponse) {
    const previewSection = document.getElementById('config-preview-section');
    const diffContainer = document.getElementById('config-diff');
    const impactContainer = document.getElementById('impact-summary');
    const warningsContainer = document.getElementById('config-warnings');
    
    if (!previewSection || !diffContainer || !impactContainer) return;
    
    // Show preview section
    previewSection.style.display = 'block';
    
    // Show configuration diff
    if (validationResponse.diff && validationResponse.diff.hasChanges) {
        diffContainer.innerHTML = createConfigurationDiffHTML(validationResponse.diff);
    } else {
        diffContainer.innerHTML = '<p class="no-changes">No configuration changes detected.</p>';
    }
    
    // Show impact summary
    if (validationResponse.impact) {
        impactContainer.innerHTML = createImpactSummaryHTML(validationResponse.impact);
    }
    
    // Show warnings
    if (validationResponse.warnings && validationResponse.warnings.length > 0) {
        warningsContainer.style.display = 'block';
        warningsContainer.innerHTML = createWarningsHTML(validationResponse.warnings);
    } else {
        warningsContainer.style.display = 'none';
    }
    
    // Store validation response for apply operation
    stateManager.set('configValidationResponse', validationResponse);
}

/**
 * Create configuration diff HTML
 */
function createConfigurationDiffHTML(diff) {
    if (!diff.hasChanges) {
        return '<p class="no-changes">No changes detected.</p>';
    }
    
    let html = '<div class="config-changes">';
    
    diff.changes.forEach(change => {
        const changeClass = `change-${change.type}`;
        const changeIcon = {
            'added': '➕',
            'removed': '➖',
            'modified': '🔄'
        }[change.type] || '🔄';
        
        html += `
            <div class="config-change ${changeClass}">
                <div class="change-header">
                    <span class="change-icon">${changeIcon}</span>
                    <span class="change-field">${change.key}</span>
                    <span class="change-type">${change.type}</span>
                </div>
                <div class="change-details">
        `;
        
        if (change.type === 'modified') {
            html += `
                <div class="change-value old-value">
                    <span class="value-label">Current:</span>
                    <span class="value-text">${change.currentValue || '(empty)'}</span>
                </div>
                <div class="change-value new-value">
                    <span class="value-label">New:</span>
                    <span class="value-text">${change.newValue || '(empty)'}</span>
                </div>
            `;
        } else if (change.type === 'added') {
            html += `
                <div class="change-value new-value">
                    <span class="value-label">Value:</span>
                    <span class="value-text">${change.newValue}</span>
                </div>
            `;
        } else if (change.type === 'removed') {
            html += `
                <div class="change-value old-value">
                    <span class="value-label">Removed:</span>
                    <span class="value-text">${change.currentValue}</span>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Create impact summary HTML
 */
function createImpactSummaryHTML(impact) {
    let html = '<div class="impact-summary">';
    
    // Restart requirements
    if (impact.requiresRestart) {
        const restartIcon = {
            'service': '🔄',
            'container': '📦',
            'full': '🔴'
        }[impact.restartType] || '🔄';
        
        html += `
            <div class="impact-item restart-required">
                <div class="impact-icon">${restartIcon}</div>
                <div class="impact-details">
                    <div class="impact-title">Restart Required</div>
                    <div class="impact-description">
                        ${impact.restartType === 'full' ? 'Full system restart required' :
                          impact.restartType === 'container' ? 'Container recreation required' :
                          'Service restart required'}
                    </div>
                    <div class="impact-downtime">
                        Estimated downtime: ${Math.ceil(impact.estimatedDowntime / 60)} minutes
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="impact-item no-restart">
                <div class="impact-icon">✅</div>
                <div class="impact-details">
                    <div class="impact-title">No Restart Required</div>
                    <div class="impact-description">Changes can be applied without service interruption</div>
                </div>
            </div>
        `;
    }
    
    // Affected services
    if (impact.affectedServices && impact.affectedServices.length > 0) {
        html += `
            <div class="impact-item affected-services">
                <div class="impact-icon">🔧</div>
                <div class="impact-details">
                    <div class="impact-title">Affected Services</div>
                    <div class="impact-services">
                        ${impact.affectedServices.map(service => 
                            `<span class="service-tag">${service}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

/**
 * Create warnings HTML
 */
function createWarningsHTML(warnings) {
    let html = '<div class="config-warnings-list">';
    
    warnings.forEach(warning => {
        const severityClass = `warning-${warning.severity || 'medium'}`;
        const warningIcon = {
            'high': '⚠️',
            'medium': '⚡',
            'low': 'ℹ️'
        }[warning.severity] || '⚠️';
        
        html += `
            <div class="config-warning ${severityClass}">
                <div class="warning-icon">${warningIcon}</div>
                <div class="warning-content">
                    <div class="warning-message">${warning.message}</div>
                    ${warning.requiresConfirmation ? 
                        '<div class="warning-confirmation">This change requires confirmation</div>' : 
                        ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Apply configuration changes
 */
window.applyConfigurationChanges = async function() {
    try {
        const profileId = stateManager.get('modifyingProfile');
        const newConfig = gatherConfigurationFromModificationForm();
        const validationResponse = stateManager.get('configValidationResponse');
        
        if (!validationResponse || !validationResponse.valid) {
            throw new Error('Please preview changes first to validate configuration');
        }
        
        // Check for high-severity warnings that require confirmation
        const highWarnings = validationResponse.warnings?.filter(w => 
            w.severity === 'high' && w.requiresConfirmation
        ) || [];
        
        if (highWarnings.length > 0) {
            const confirmed = await showConfirmationDialog(
                'Confirm Configuration Changes',
                `This change has important implications:\n\n${highWarnings.map(w => `• ${w.message}`).join('\n')}\n\nDo you want to proceed?`
            );
            
            if (!confirmed) {
                return;
            }
        }
        
        // Show progress
        showNotification('Applying configuration changes...', 'info');
        
        // Apply changes
        const response = await api.post('/wizard/config/apply-changes', {
            profileId,
            newConfig,
            createBackup: true,
            restartServices: validationResponse.impact?.requiresRestart || false
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to apply changes');
        }
        
        // Show success message
        let message = 'Configuration updated successfully';
        if (response.servicesRestarted && response.servicesRestarted.length > 0) {
            message += `. Restarted services: ${response.servicesRestarted.join(', ')}`;
        }
        
        showNotification(message, 'success');
        
        // Close modal
        closeConfigurationModificationModal();
        
        // Refresh profile states if we're in reconfiguration mode
        const mode = stateManager.get('mode');
        if (mode === 'reconfiguration') {
            // Refresh the profile display
            if (window.initializeReconfigurationMode) {
                await window.initializeReconfigurationMode(stateManager.get('profileSelectionContext'));
            }
        }
        
    } catch (error) {
        console.error('Failed to apply configuration changes:', error);
        showNotification(`Failed to apply changes: ${error.message}`, 'error');
    }
};

/**
 * Close configuration modification modal
 */
window.closeConfigurationModificationModal = function() {
    const modal = document.getElementById('config-modification-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Clear stored state
        stateManager.remove('modifyingProfile');
        stateManager.remove('currentProfileConfig');
        stateManager.remove('profileFields');
        stateManager.remove('profileServiceStatus');
        stateManager.remove('modificationFormConfig');
        stateManager.remove('configurationDiff');
        stateManager.remove('configValidationResponse');
    }
};

/**
 * Show confirmation dialog
 */
async function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        // Create confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = `
            <div class="modal-content confirmation-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                </div>
                <div class="modal-body">
                    <p class="confirmation-message">${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="resolveConfirmation(false)">Cancel</button>
                    <button class="btn-primary" onclick="resolveConfirmation(true)">Confirm</button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(dialog);
        
        // Setup resolution
        window.resolveConfirmation = function(result) {
            document.body.removeChild(dialog);
            delete window.resolveConfirmation;
            resolve(result);
        };
    });
}

/**
 * Get profile description
 */
function getProfileDescription(profileId) {
    const descriptions = {
        'core': 'Kaspa blockchain node with optional wallet functionality',
        'kaspa-user-applications': 'User-facing applications (Kasia, K-Social, Kaspa Explorer)',
        'indexer-services': 'Local indexing services for improved performance',
        'archive-node': 'Non-pruning node maintaining complete blockchain history',
        'mining': 'Mining infrastructure connected to local Kaspa node'
    };
    
    return descriptions[profileId] || 'Kaspa service profile';
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

/**
 * Enhanced Profile Selection for Reconfiguration Mode
 * Implements Requirements: 16.7, 16.8, 17.3, 17.4, 17.5
 */

/**
 * Initialize profile selection with reconfiguration mode support
 */
export async function initializeProfileSelectionWithReconfiguration() {
    try {
        // Check if we're in reconfiguration mode
        const mode = stateManager.get('mode') || 'initial';
        const reconfigurationContext = stateManager.get('profileSelectionContext');
        
        if (mode === 'reconfiguration') {
            await initializeReconfigurationMode(reconfigurationContext);
        } else {
            await initializeProfileSelection();
        }
        
    } catch (error) {
        console.error('Failed to initialize profile selection:', error);
        showNotification('Failed to load profile selection', 'error');
    }
}

/**
 * Initialize reconfiguration mode
 */
async function initializeReconfigurationMode(context) {
    try {
        // Update UI for reconfiguration mode
        updateUIForReconfigurationMode(context);
        
        // Load profile states from API
        const response = await api.get('/wizard/profiles/state');
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load profile states');
        }
        
        // Update profile display with installation states
        await updateProfileDisplayWithStates(response);
        
        // Setup reconfiguration-specific event handlers
        setupReconfigurationEventHandlers();
        
    } catch (error) {
        console.error('Failed to initialize reconfiguration mode:', error);
        showNotification('Failed to load installation state', 'error');
    }
}

/**
 * Update UI for reconfiguration mode
 */
function updateUIForReconfigurationMode(context) {
    // Update page title and description
    const title = document.getElementById('profile-selection-title');
    const description = document.getElementById('profile-selection-description');
    const reconfigContext = document.getElementById('reconfiguration-context');
    const addProfileBtn = document.getElementById('add-profile-btn');
    
    if (title && description && reconfigContext) {
        switch (context) {
            case 'add':
                title.textContent = 'Add New Profiles';
                description.textContent = 'Select additional profiles to expand your Kaspa installation.';
                updateReconfigurationContext('➕', 'Add New Profiles', 'Choose from available profiles to enhance your installation.');
                if (addProfileBtn) addProfileBtn.style.display = 'inline-block';
                break;
            case 'remove':
                title.textContent = 'Remove Profiles';
                description.textContent = 'Select profiles to remove from your installation.';
                updateReconfigurationContext('🗑️', 'Remove Profiles', 'Choose profiles to uninstall and clean up your system.');
                if (addProfileBtn) addProfileBtn.style.display = 'none';
                break;
            case 'modify':
                title.textContent = 'Modify Configuration';
                description.textContent = 'Update settings for your installed profiles.';
                updateReconfigurationContext('⚙️', 'Modify Configuration', 'Change settings and configuration for your existing profiles.');
                if (addProfileBtn) addProfileBtn.style.display = 'none';
                break;
            default:
                title.textContent = 'Manage Your Installation';
                description.textContent = 'Add, remove, or modify profiles in your Kaspa installation.';
                updateReconfigurationContext('⚙️', 'Manage Installation', 'You can add new profiles, modify existing ones, or remove profiles you no longer need.');
                if (addProfileBtn) addProfileBtn.style.display = 'inline-block';
        }
        
        reconfigContext.style.display = 'block';
    }
    
    // Show/hide appropriate sections
    const installedSection = document.getElementById('installed-profiles-section');
    const availableSection = document.getElementById('available-profiles-section');
    const defaultGrid = document.getElementById('default-profile-grid');
    
    if (installedSection && availableSection && defaultGrid) {
        installedSection.style.display = 'block';
        availableSection.style.display = 'block';
        defaultGrid.style.display = 'none';
        
        // Update section titles based on context
        const availableTitle = document.getElementById('available-section-title');
        const availableDescription = document.getElementById('available-section-description');
        
        if (availableTitle && availableDescription) {
            switch (context) {
                case 'add':
                    availableTitle.textContent = 'Available to Add';
                    availableDescription.textContent = 'These profiles can be added to your existing installation';
                    break;
                case 'remove':
                    availableTitle.textContent = 'Available for Removal';
                    availableDescription.textContent = 'These profiles are currently installed and can be removed';
                    break;
                default:
                    availableTitle.textContent = 'Available Profiles';
                    availableDescription.textContent = 'Choose from these profiles to customize your installation';
            }
        }
    }
}

/**
 * Update reconfiguration context card
 */
function updateReconfigurationContext(icon, title, description) {
    const contextIcon = document.getElementById('reconfiguration-context-icon');
    const contextTitle = document.getElementById('reconfiguration-context-title');
    const contextDescription = document.getElementById('reconfiguration-context-description');
    
    if (contextIcon) contextIcon.textContent = icon;
    if (contextTitle) contextTitle.textContent = title;
    if (contextDescription) contextDescription.textContent = description;
}

/**
 * Update profile display with installation states
 */
async function updateProfileDisplayWithStates(stateResponse) {
    const { profiles, installedProfiles, availableProfiles } = stateResponse;
    
    // Update status counts
    updateStatusCounts(installedProfiles.length, availableProfiles.length);
    
    // Populate installed profiles section
    await populateInstalledProfiles(installedProfiles);
    
    // Populate available profiles section
    await populateAvailableProfiles(availableProfiles);
    
    // Update profile cards with states
    updateProfileCardsWithStates(profiles);
}

/**
 * Update status counts in section headers
 */
function updateStatusCounts(installedCount, availableCount) {
    const installedCountEl = document.getElementById('installed-count');
    const availableCountEl = document.getElementById('available-count');
    
    if (installedCountEl) installedCountEl.textContent = installedCount;
    if (availableCountEl) availableCountEl.textContent = availableCount;
}

/**
 * Populate installed profiles section
 */
async function populateInstalledProfiles(installedProfiles) {
    const grid = document.getElementById('installed-profiles-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (const profile of installedProfiles) {
        const profileCard = createProfileCardForReconfiguration(profile, 'installed');
        grid.appendChild(profileCard);
    }
}

/**
 * Populate available profiles section
 */
async function populateAvailableProfiles(availableProfiles) {
    const grid = document.getElementById('available-profiles-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (const profile of availableProfiles) {
        const profileCard = createProfileCardForReconfiguration(profile, 'available');
        grid.appendChild(profileCard);
    }
}

/**
 * Create profile card for reconfiguration mode
 */
function createProfileCardForReconfiguration(profile, section) {
    // Find the template card in the default grid
    const templateCard = document.querySelector(`#default-profile-grid .profile-card[data-profile="${profile.id}"]`);
    if (!templateCard) {
        console.warn(`Template card not found for profile: ${profile.id}`);
        return document.createElement('div');
    }
    
    // Clone the template card
    const card = templateCard.cloneNode(true);
    
    // Update installation status
    updateCardInstallationStatus(card, profile);
    
    // Show/hide appropriate elements based on section
    updateCardForSection(card, profile, section);
    
    return card;
}

/**
 * Update card installation status display
 */
function updateCardInstallationStatus(card, profile) {
    const statusEl = card.querySelector('.profile-installation-status');
    const badge = card.querySelector('.installation-badge');
    const statusValue = card.querySelector('.detail-value');
    const servicesValue = card.querySelector('.installation-detail:last-child .detail-value');
    
    if (statusEl && badge) {
        statusEl.style.display = 'block';
        
        // Update badge
        badge.className = `installation-badge ${profile.installationState}`;
        const badgeText = badge.querySelector('.badge-text');
        if (badgeText) {
            switch (profile.installationState) {
                case 'installed':
                    badgeText.textContent = 'Installed';
                    break;
                case 'partial':
                    badgeText.textContent = 'Partial';
                    break;
                default:
                    badgeText.textContent = 'Available';
            }
        }
        
        // Update status value
        if (statusValue) {
            statusValue.textContent = profile.status || 'Unknown';
            statusValue.className = `detail-value status-${profile.status}`;
        }
        
        // Update services count
        if (servicesValue) {
            servicesValue.textContent = `${profile.runningServices}/${profile.totalServices}`;
        }
    }
    
    // Add installation state class to card
    card.classList.add(profile.installationState);
}

/**
 * Update card for specific section (installed/available)
 */
function updateCardForSection(card, profile, section) {
    const actionsEl = card.querySelector('.profile-actions');
    
    if (section === 'installed' && actionsEl) {
        actionsEl.style.display = 'block';
        
        // Update action buttons based on profile capabilities
        const modifyBtn = actionsEl.querySelector('.btn-modify');
        const removeBtn = actionsEl.querySelector('.btn-remove');
        
        if (modifyBtn && !profile.canModify) {
            modifyBtn.disabled = true;
            modifyBtn.style.opacity = '0.5';
        }
        
        if (removeBtn && !profile.canRemove) {
            removeBtn.disabled = true;
            removeBtn.style.opacity = '0.5';
        }
        
        // Show dependency warnings if any
        showProfileDependencyWarnings(card, profile);
    }
}

/**
 * Show profile dependency warnings
 */
function showProfileDependencyWarnings(card, profile) {
    const warningsEl = card.querySelector('.action-warnings');
    if (!warningsEl) return;
    
    // This would be populated based on dependency analysis
    // For now, we'll leave it empty and populate it when the user tries to remove
}

/**
 * Update profile cards with states (for default grid)
 */
function updateProfileCardsWithStates(profiles) {
    profiles.forEach(profile => {
        const card = document.querySelector(`.profile-card[data-profile="${profile.id}"]`);
        if (card) {
            updateCardInstallationStatus(card, profile);
        }
    });
}

/**
 * Setup reconfiguration-specific event handlers
 */
function setupReconfigurationEventHandlers() {
    // Profile card click handlers for reconfiguration mode
    const installedCards = document.querySelectorAll('#installed-profiles-grid .profile-card');
    const availableCards = document.querySelectorAll('#available-profiles-grid .profile-card');
    
    installedCards.forEach(card => {
        // Remove default click handler and add reconfiguration-specific behavior
        card.removeEventListener('click', window.selectProfile);
        card.addEventListener('click', (e) => {
            // Only handle clicks on the card itself, not on action buttons
            if (!e.target.closest('.profile-actions')) {
                handleInstalledProfileClick(card.dataset.profile);
            }
        });
    });
    
    availableCards.forEach(card => {
        card.addEventListener('click', () => {
            handleAvailableProfileClick(card.dataset.profile);
        });
    });
}

/**
 * Handle click on installed profile
 */
function handleInstalledProfileClick(profileId) {
    const context = stateManager.get('profileSelectionContext');
    
    switch (context) {
        case 'remove':
            removeProfile(profileId);
            break;
        case 'modify':
            modifyProfile(profileId);
            break;
        default:
            // Show profile details or options
            showProfileOptions(profileId);
    }
}

/**
 * Handle click on available profile
 */
function handleAvailableProfileClick(profileId) {
    const context = stateManager.get('profileSelectionContext');
    
    switch (context) {
        case 'add':
            addProfile(profileId);
            break;
        default:
            // Standard profile selection behavior
            window.selectProfile(profileId);
    }
}

/**
 * Show profile options dialog
 */
function showProfileOptions(profileId) {
    // This could show a context menu or dialog with options
    console.log(`Show options for profile: ${profileId}`);
}

/**
 * Add profile to installation
 */
function addProfile(profileId) {
    // Add to selected profiles
    if (!selectedProfiles.includes(profileId)) {
        selectedProfiles.push(profileId);
        stateManager.set('selectedProfiles', selectedProfiles);
        
        // Update UI
        updateProfileCardStates();
        showNotification(`Added ${profileId} profile`, 'success');
    }
}

/**
 * Modify profile configuration
 */
window.modifyProfile = function(profileId) {
    // Store the profile to modify and navigate to configuration
    stateManager.set('modifyingProfile', profileId);
    showNotification(`Modifying ${profileId} profile configuration`, 'info');
    
    // Navigate to configuration step
    if (window.nextStep) {
        window.nextStep();
    }
};

/**
 * Remove profile from installation
 */
window.removeProfile = function(profileId) {
    showProfileRemovalDialog(profileId);
};

/**
 * Show profile removal confirmation dialog
 */
async function showProfileRemovalDialog(profileId) {
    try {
        // Get profile details and dependency information
        const profileResponse = await api.get(`/wizard/profiles/state/${profileId}`);
        if (!profileResponse.success) {
            throw new Error('Failed to load profile details');
        }
        
        const profile = profileResponse.profile;
        
        // Check removal validation
        const validationResponse = await api.post('/wizard/profiles/validate-removal', {
            profileId: profileId
        });
        
        // Populate dialog
        populateRemovalDialog(profile, validationResponse);
        
        // Show dialog
        const dialog = document.getElementById('profile-removal-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
            
            // Store profile ID for confirmation
            dialog.dataset.profileId = profileId;
        }
        
    } catch (error) {
        console.error('Failed to show removal dialog:', error);
        showNotification('Failed to load profile removal details', 'error');
    }
}

/**
 * Populate removal dialog with profile details
 */
function populateRemovalDialog(profile, validation) {
    // Update warning message
    const warningMessage = document.getElementById('removal-warning-message');
    if (warningMessage) {
        if (validation.canRemove) {
            warningMessage.textContent = `This will stop and remove the ${profile.name} profile and its services.`;
        } else {
            warningMessage.textContent = `Cannot remove ${profile.name}: ${validation.warnings.join(', ')}`;
        }
    }
    
    // Update profile summary
    const profileSummary = document.getElementById('removal-profile-summary');
    if (profileSummary) {
        profileSummary.innerHTML = `
            <div class="profile-summary-item">
                <strong>${profile.name}</strong>
                <p>${profile.description}</p>
                <div class="summary-details">
                    <span>Status: ${profile.status}</span>
                    <span>Services: ${profile.runningServices}/${profile.totalServices}</span>
                </div>
            </div>
        `;
    }
    
    // Show impact warnings if any
    const impactSection = document.getElementById('removal-impact');
    const impactWarnings = document.getElementById('removal-impact-warnings');
    
    if (validation.dependencies && validation.dependencies.length > 0) {
        if (impactSection) impactSection.style.display = 'block';
        if (impactWarnings) {
            impactWarnings.innerHTML = validation.dependencies.map(dep => 
                `<div class="impact-warning">⚠️ ${dep}</div>`
            ).join('');
        }
    } else {
        if (impactSection) impactSection.style.display = 'none';
    }
    
    // Update confirm button state
    const confirmBtn = document.getElementById('confirm-removal-btn');
    if (confirmBtn) {
        confirmBtn.disabled = !validation.canRemove;
        if (!validation.canRemove) {
            confirmBtn.textContent = 'Cannot Remove';
        } else {
            confirmBtn.textContent = 'Remove Profile';
        }
    }
}

/**
 * Close profile removal dialog
 */
window.closeProfileRemovalDialog = function() {
    const dialog = document.getElementById('profile-removal-dialog');
    if (dialog) {
        dialog.style.display = 'none';
        delete dialog.dataset.profileId;
    }
};

/**
 * Confirm profile removal
 */
window.confirmProfileRemoval = async function() {
    const dialog = document.getElementById('profile-removal-dialog');
    const profileId = dialog?.dataset.profileId;
    
    if (!profileId) {
        console.error('No profile ID found for removal');
        return;
    }
    
    try {
        // Get data handling option
        const dataHandling = document.querySelector('input[name="data-handling"]:checked')?.value || 'keep';
        
        // Call removal API
        const response = await api.post('/wizard/profiles/remove', {
            profileId: profileId,
            removeData: dataHandling === 'remove'
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to remove profile');
        }
        
        // Close dialog
        window.closeProfileRemovalDialog();
        
        // Show success message
        showNotification(`Successfully removed ${profileId} profile`, 'success');
        
        // Refresh profile states
        await initializeReconfigurationMode(stateManager.get('profileSelectionContext'));
        
    } catch (error) {
        console.error('Failed to remove profile:', error);
        showNotification(`Failed to remove profile: ${error.message}`, 'error');
    }
};

/**
 * Global functions for profile addition
 */
window.openProfileAdditionDialog = openProfileAdditionDialog;
window.closeProfileAdditionDialog = closeProfileAdditionDialog;
window.confirmProfileAddition = confirmProfileAddition;

/**
 * Advanced Configuration Functions
 */

/**
 * Apply configuration template
 */
export async function applyConfigurationTemplate(templateId) {
    try {
        const currentConfig = gatherConfigurationFromForm();
        const profiles = stateManager.get('selectedProfiles') || [];
        
        const response = await api.post('/config-templates/apply', {
            templateId: templateId,
            currentConfig: currentConfig,
            overrides: {}
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to apply template');
        }
        
        // Show template preview dialog
        await showTemplatePreviewDialog(response);
        
    } catch (error) {
        console.error('Failed to apply template:', error);
        showNotification(`Failed to apply template: ${error.message}`, 'error');
    }
}

/**
 * Show template preview dialog
 */
async function showTemplatePreviewDialog(templateResponse) {
    const { template, configuration, profiles, changes, warnings } = templateResponse;
    
    // Create or get template preview modal
    let modal = document.getElementById('template-preview-modal');
    if (!modal) {
        modal = createTemplatePreviewModal();
        document.body.appendChild(modal);
    }
    
    // Populate modal content
    populateTemplatePreviewModal(modal, template, configuration, profiles, changes, warnings);
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Create template preview modal
 */
function createTemplatePreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'template-preview-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content template-preview-modal">
            <div class="modal-header">
                <h3 class="modal-title">Apply Configuration Template</h3>
                <button class="modal-close" onclick="closeTemplatePreviewModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="template-info" id="template-info">
                    <!-- Template info will be populated here -->
                </div>
                
                <div class="template-changes" id="template-changes">
                    <!-- Configuration changes will be shown here -->
                </div>
                
                <div class="template-warnings" id="template-warnings" style="display: none;">
                    <!-- Warnings will be shown here -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeTemplatePreviewModal()">
                    Cancel
                </button>
                <button class="btn-primary" onclick="confirmTemplateApplication()" id="apply-template-btn">
                    Apply Template
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * Populate template preview modal
 */
function populateTemplatePreviewModal(modal, template, configuration, profiles, changes, warnings) {
    // Template info
    const templateInfo = modal.querySelector('#template-info');
    if (templateInfo) {
        templateInfo.innerHTML = `
            <div class="template-header">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
            </div>
            <div class="template-details">
                <div class="template-profiles">
                    <strong>Profiles:</strong> ${profiles.join(', ')}
                </div>
                <div class="template-resources">
                    <strong>Resources:</strong> 
                    ${template.resources.minCpu} CPU, 
                    ${template.resources.minMemory}GB RAM, 
                    ${template.resources.minDisk}GB Disk
                </div>
            </div>
        `;
    }
    
    // Configuration changes
    const templateChanges = modal.querySelector('#template-changes');
    if (templateChanges && changes.length > 0) {
        templateChanges.innerHTML = `
            <h5>Configuration Changes</h5>
            <div class="changes-list">
                ${changes.map(change => `
                    <div class="change-item change-${change.type}">
                        <div class="change-field">${change.key}</div>
                        <div class="change-details">
                            ${change.type === 'modified' ? 
                                `${change.currentValue} → ${change.newValue}` :
                                change.type === 'added' ?
                                `New: ${change.newValue}` :
                                `Removed: ${change.currentValue}`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Warnings
    const templateWarnings = modal.querySelector('#template-warnings');
    if (templateWarnings && warnings.length > 0) {
        templateWarnings.style.display = 'block';
        templateWarnings.innerHTML = `
            <h5>Warnings</h5>
            <div class="warnings-list">
                ${warnings.map(warning => `
                    <div class="warning-item warning-${warning.severity}">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-message">${warning.message}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Store template data for confirmation
    modal.dataset.templateData = JSON.stringify({ template, configuration, profiles });
}

/**
 * Close template preview modal
 */
window.closeTemplatePreviewModal = function() {
    const modal = document.getElementById('template-preview-modal');
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.templateData;
    }
};

/**
 * Confirm template application
 */
window.confirmTemplateApplication = function() {
    const modal = document.getElementById('template-preview-modal');
    const templateData = JSON.parse(modal.dataset.templateData || '{}');
    
    if (templateData.configuration) {
        // Apply configuration to form
        populateConfigurationForm(templateData.configuration);
        
        // Update selected profiles if needed
        if (templateData.profiles) {
            stateManager.set('selectedProfiles', templateData.profiles);
            updateProfileCardStates();
        }
        
        showNotification(`Applied template: ${templateData.template.name}`, 'success');
    }
    
    closeTemplatePreviewModal();
};

/**
 * Configure indexer connections
 */
export async function configureIndexerConnections(connectionMode, preferences = {}) {
    try {
        const profiles = stateManager.get('selectedProfiles') || [];
        const currentConfig = gatherConfigurationFromForm();
        
        const response = await api.post('/advanced-config/indexer-connections', {
            connectionMode: connectionMode,
            profiles: profiles,
            currentConfig: currentConfig,
            indexerPreferences: preferences
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to configure indexer connections');
        }
        
        // Update form with new configuration
        populateConfigurationForm(response.configuration);
        
        // Show connection status
        showIndexerConnectionStatus(response.endpoints, response.validation);
        
        showNotification('Indexer connections configured successfully', 'success');
        
    } catch (error) {
        console.error('Failed to configure indexer connections:', error);
        showNotification(`Failed to configure indexer connections: ${error.message}`, 'error');
    }
}

/**
 * Show indexer connection status
 */
function showIndexerConnectionStatus(endpoints, validation) {
    // Create or update status display
    let statusEl = document.getElementById('indexer-connection-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'indexer-connection-status';
        statusEl.className = 'indexer-connection-status';
        
        const indexerSection = document.getElementById('indexer-endpoints-section');
        if (indexerSection) {
            indexerSection.appendChild(statusEl);
        }
    }
    
    statusEl.innerHTML = `
        <div class="connection-status-header">
            <h5>Connection Status</h5>
        </div>
        <div class="connection-endpoints">
            <div class="endpoint-item">
                <span class="endpoint-label">Kasia Indexer:</span>
                <span class="endpoint-url">${endpoints.kasiaIndexer}</span>
                <span class="endpoint-type ${getEndpointType(endpoints.kasiaIndexer)}">${getEndpointType(endpoints.kasiaIndexer)}</span>
            </div>
            <div class="endpoint-item">
                <span class="endpoint-label">K-Social Indexer:</span>
                <span class="endpoint-url">${endpoints.ksocialIndexer}</span>
                <span class="endpoint-type ${getEndpointType(endpoints.ksocialIndexer)}">${getEndpointType(endpoints.ksocialIndexer)}</span>
            </div>
            <div class="endpoint-item">
                <span class="endpoint-label">Kaspa Node:</span>
                <span class="endpoint-url">${endpoints.kaspaNode}</span>
                <span class="endpoint-type ${getEndpointType(endpoints.kaspaNode)}">${getEndpointType(endpoints.kaspaNode)}</span>
            </div>
        </div>
        ${validation.warnings.length > 0 ? `
            <div class="connection-warnings">
                ${validation.warnings.map(warning => `
                    <div class="connection-warning warning-${warning.severity}">
                        ⚠️ ${warning.message}
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

/**
 * Get endpoint type for display
 */
function getEndpointType(url) {
    if (!url) return 'unknown';
    return url.includes('localhost') || url.includes('127.0.0.1') ? 'local' : 'public';
}

/**
 * Switch indexer endpoints
 */
export async function switchIndexerEndpoints(targetMode, specificEndpoints = {}) {
    try {
        const profiles = stateManager.get('selectedProfiles') || [];
        const currentConfig = gatherConfigurationFromForm();
        
        const response = await api.post('/advanced-config/switch-endpoints', {
            currentConfig: currentConfig,
            targetMode: targetMode,
            profiles: profiles,
            specificEndpoints: specificEndpoints
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to switch endpoints');
        }
        
        // Show switching preview
        await showEndpointSwitchingPreview(response);
        
    } catch (error) {
        console.error('Failed to switch endpoints:', error);
        showNotification(`Failed to switch endpoints: ${error.message}`, 'error');
    }
}

/**
 * Show endpoint switching preview
 */
async function showEndpointSwitchingPreview(switchResponse) {
    const { currentEndpoints, newEndpoints, changes, impact } = switchResponse;
    
    // Create or get switching preview modal
    let modal = document.getElementById('endpoint-switching-modal');
    if (!modal) {
        modal = createEndpointSwitchingModal();
        document.body.appendChild(modal);
    }
    
    // Populate modal content
    populateEndpointSwitchingModal(modal, currentEndpoints, newEndpoints, changes, impact);
    
    // Show modal
    modal.style.display = 'flex';
    
    // Store switch data
    modal.dataset.switchData = JSON.stringify(switchResponse);
}

/**
 * Create endpoint switching modal
 */
function createEndpointSwitchingModal() {
    const modal = document.createElement('div');
    modal.id = 'endpoint-switching-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content endpoint-switching-modal">
            <div class="modal-header">
                <h3 class="modal-title">Switch Indexer Endpoints</h3>
                <button class="modal-close" onclick="closeEndpointSwitchingModal()" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="endpoint-comparison" id="endpoint-comparison">
                    <!-- Endpoint comparison will be shown here -->
                </div>
                
                <div class="switching-impact" id="switching-impact">
                    <!-- Impact information will be shown here -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeEndpointSwitchingModal()">
                    Cancel
                </button>
                <button class="btn-primary" onclick="confirmEndpointSwitching()" id="confirm-switch-btn">
                    Switch Endpoints
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * Populate endpoint switching modal
 */
function populateEndpointSwitchingModal(modal, currentEndpoints, newEndpoints, changes, impact) {
    // Endpoint comparison
    const comparison = modal.querySelector('#endpoint-comparison');
    if (comparison) {
        comparison.innerHTML = `
            <h5>Endpoint Changes</h5>
            <div class="endpoint-changes">
                ${changes.map(change => `
                    <div class="endpoint-change">
                        <div class="endpoint-name">${change.endpoint}</div>
                        <div class="endpoint-transition">
                            <span class="current-endpoint">${change.from}</span>
                            <span class="arrow">→</span>
                            <span class="new-endpoint">${change.to}</span>
                        </div>
                        <div class="endpoint-types">
                            <span class="type-badge ${getEndpointType(change.from)}">${getEndpointType(change.from)}</span>
                            →
                            <span class="type-badge ${getEndpointType(change.to)}">${getEndpointType(change.to)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Impact information
    const impactEl = modal.querySelector('#switching-impact');
    if (impactEl) {
        impactEl.innerHTML = `
            <h5>Impact</h5>
            <div class="impact-details">
                <div class="impact-item">
                    <strong>Restart Required:</strong> ${impact.requiresRestart ? 'Yes' : 'No'}
                </div>
                ${impact.affectedServices.length > 0 ? `
                    <div class="impact-item">
                        <strong>Affected Services:</strong> ${impact.affectedServices.join(', ')}
                    </div>
                ` : ''}
                <div class="impact-item">
                    <strong>Estimated Downtime:</strong> ${impact.estimatedDowntime} seconds
                </div>
            </div>
        `;
    }
}

/**
 * Close endpoint switching modal
 */
window.closeEndpointSwitchingModal = function() {
    const modal = document.getElementById('endpoint-switching-modal');
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.switchData;
    }
};

/**
 * Confirm endpoint switching
 */
window.confirmEndpointSwitching = function() {
    const modal = document.getElementById('endpoint-switching-modal');
    const switchData = JSON.parse(modal.dataset.switchData || '{}');
    
    if (switchData.configuration) {
        // Apply new configuration to form
        populateConfigurationForm(switchData.configuration);
        
        showNotification('Indexer endpoints switched successfully', 'success');
    }
    
    closeEndpointSwitchingModal();
};

/**
 * Configure wallet management
 */
export async function configureWalletManagement(walletConfig) {
    try {
        const profiles = stateManager.get('selectedProfiles') || [];
        const currentConfig = gatherConfigurationFromForm();
        
        const response = await api.post('/advanced-config/wallet-management', {
            profiles: profiles,
            walletConfig: walletConfig,
            currentConfig: currentConfig
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to configure wallet management');
        }
        
        // Update form with wallet configuration
        populateConfigurationForm(response.configuration);
        
        // Show security recommendations
        if (response.securityRecommendations.length > 0) {
            showWalletSecurityRecommendations(response.securityRecommendations);
        }
        
        showNotification('Wallet configuration updated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to configure wallet management:', error);
        showNotification(`Failed to configure wallet: ${error.message}`, 'error');
    }
}

/**
 * Show wallet security recommendations
 */
function showWalletSecurityRecommendations(recommendations) {
    // Create or update recommendations display
    let recommendationsEl = document.getElementById('wallet-security-recommendations');
    if (!recommendationsEl) {
        recommendationsEl = document.createElement('div');
        recommendationsEl.id = 'wallet-security-recommendations';
        recommendationsEl.className = 'wallet-security-recommendations';
        
        const walletSection = document.querySelector('.config-section:has(#wallet-enabled)');
        if (walletSection) {
            walletSection.appendChild(recommendationsEl);
        }
    }
    
    recommendationsEl.innerHTML = `
        <div class="recommendations-header">
            <h5>🔒 Security Recommendations</h5>
        </div>
        <div class="recommendations-list">
            ${recommendations.map(rec => `
                <div class="recommendation-item recommendation-${rec.severity}">
                    <div class="recommendation-icon">
                        ${rec.severity === 'high' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div class="recommendation-message">${rec.message}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Configure partial indexer setup
 */
export async function configurePartialIndexers(enabledIndexers, indexerConfig = {}) {
    try {
        const profiles = stateManager.get('selectedProfiles') || [];
        const currentConfig = gatherConfigurationFromForm();
        
        const response = await api.post('/advanced-config/partial-indexer', {
            profiles: profiles,
            enabledIndexers: enabledIndexers,
            indexerConfig: indexerConfig,
            currentConfig: currentConfig
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to configure partial indexers');
        }
        
        // Update form with partial indexer configuration
        populateConfigurationForm(response.configuration);
        
        // Show warnings if any
        if (response.warnings && response.warnings.length > 0) {
            showPartialIndexerWarnings(response.warnings);
        }
        
        // Show enabled/disabled services summary
        showIndexerServicesSummary(response.enabledServices, response.disabledServices);
        
        showNotification('Partial indexer configuration updated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to configure partial indexers:', error);
        showNotification(`Failed to configure partial indexers: ${error.message}`, 'error');
    }
}

/**
 * Show partial indexer warnings
 */
function showPartialIndexerWarnings(warnings) {
    let warningsEl = document.getElementById('partial-indexer-warnings');
    if (!warningsEl) {
        warningsEl = document.createElement('div');
        warningsEl.id = 'partial-indexer-warnings';
        warningsEl.className = 'partial-indexer-warnings';
        
        const indexerSection = document.querySelector('.config-section:has(#indexer-connection-mode)');
        if (indexerSection) {
            indexerSection.appendChild(warningsEl);
        }
    }
    
    warningsEl.innerHTML = `
        <div class="warnings-header">
            <h5>⚠️ Partial Indexer Warnings</h5>
        </div>
        <div class="warnings-list">
            ${warnings.map(warning => `
                <div class="warning-item warning-${warning.severity}">
                    <div class="warning-icon">
                        ${warning.severity === 'high' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div class="warning-message">${warning.message}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Show indexer services summary
 */
function showIndexerServicesSummary(enabledServices, disabledServices) {
    let summaryEl = document.getElementById('indexer-services-summary');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'indexer-services-summary';
        summaryEl.className = 'indexer-services-summary';
        
        const indexerSection = document.querySelector('.config-section:has(#indexer-connection-mode)');
        if (indexerSection) {
            indexerSection.appendChild(summaryEl);
        }
    }
    
    summaryEl.innerHTML = `
        <div class="services-summary">
            <div class="enabled-services">
                <h6>✅ Enabled Services</h6>
                <div class="services-list">
                    ${enabledServices.map(service => `<span class="service-tag enabled">${service}</span>`).join('')}
                </div>
            </div>
            <div class="disabled-services">
                <h6>❌ Disabled Services</h6>
                <div class="services-list">
                    ${disabledServices.map(service => `<span class="service-tag disabled">${service}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Configure custom environment variables
 */
export async function configureCustomEnvironmentVariables(customVars, operation = 'merge') {
    try {
        const profiles = stateManager.get('selectedProfiles') || [];
        const currentConfig = gatherConfigurationFromForm();
        
        const response = await api.post('/advanced-config/custom-env-vars', {
            customVars: customVars,
            profiles: profiles,
            currentConfig: currentConfig,
            operation: operation
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to configure custom environment variables');
        }
        
        // Update form with new configuration
        populateConfigurationForm(response.configuration);
        
        // Show warnings if any
        if (response.warnings && response.warnings.length > 0) {
            showCustomVarWarnings(response.warnings);
        }
        
        // Update custom variables display
        updateCustomVariablesDisplay(response.customVariables);
        
        showNotification('Custom environment variables updated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to configure custom environment variables:', error);
        showNotification(`Failed to configure custom variables: ${error.message}`, 'error');
    }
}

/**
 * Show custom variable warnings
 */
function showCustomVarWarnings(warnings) {
    let warningsEl = document.getElementById('custom-var-warnings');
    if (!warningsEl) {
        warningsEl = document.createElement('div');
        warningsEl.id = 'custom-var-warnings';
        warningsEl.className = 'custom-var-warnings';
        
        const customEnvSection = document.querySelector('.config-section:has(#custom-env)');
        if (customEnvSection) {
            customEnvSection.appendChild(warningsEl);
        }
    }
    
    warningsEl.innerHTML = `
        <div class="warnings-header">
            <h5>⚠️ Custom Variable Warnings</h5>
        </div>
        <div class="warnings-list">
            ${warnings.map(warning => `
                <div class="warning-item warning-${warning.severity}">
                    <div class="warning-icon">
                        ${warning.severity === 'high' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div class="warning-message">${warning.message}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Update custom variables display
 */
function updateCustomVariablesDisplay(customVariables) {
    const customEnvTextarea = document.getElementById('custom-env');
    if (customEnvTextarea && customVariables) {
        const varLines = Object.entries(customVariables).map(([key, value]) => `${key}=${value}`);
        customEnvTextarea.value = varLines.join('\n');
    }
}

/**
 * Setup advanced configuration event handlers
 */
export function setupAdvancedConfigurationHandlers() {
    // Indexer connection mode change handler
    const indexerModeSelect = document.getElementById('indexer-connection-mode');
    if (indexerModeSelect) {
        indexerModeSelect.addEventListener('change', async (e) => {
            const mode = e.target.value;
            await configureIndexerConnections(mode);
            
            // Show/hide individual connection selects for mixed mode
            const individualSelects = document.querySelectorAll('.individual-indexer-connection');
            individualSelects.forEach(select => {
                select.style.display = mode === 'mixed' ? 'block' : 'none';
            });
        });
    }
    
    // Configuration template change handler
    const templateSelect = document.getElementById('configuration-template');
    if (templateSelect) {
        templateSelect.addEventListener('change', async (e) => {
            const templateId = e.target.value;
            if (templateId && templateId !== 'custom') {
                await applyConfigurationTemplate(templateId);
            }
        });
    }
    
    // Wallet enabled toggle handler
    const walletEnabledToggle = document.getElementById('wallet-enabled');
    if (walletEnabledToggle) {
        walletEnabledToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            
            // Show/hide wallet configuration fields
            const walletFields = document.querySelectorAll('.wallet-config-field');
            walletFields.forEach(field => {
                field.style.display = enabled ? 'block' : 'none';
            });
        });
    }
    
    // Wallet mode change handler
    const walletModeSelect = document.getElementById('wallet-mode');
    if (walletModeSelect) {
        walletModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            
            // Show/hide seed phrase field for import mode
            const seedPhraseField = document.getElementById('wallet-seed-phrase-group');
            if (seedPhraseField) {
                seedPhraseField.style.display = mode === 'import' ? 'block' : 'none';
            }
        });
    }
}

/**
 * Toggle password visibility for password fields
 */
window.togglePasswordVisibility = function(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field?.parentElement?.querySelector('.btn-icon-only');
    
    if (field && button) {
        const isPassword = field.type === 'password';
        field.type = isPassword ? 'text' : 'password';
        
        const icon = button.querySelector('.icon-eye');
        if (icon) {
            icon.textContent = isPassword ? '🙈' : '👁';
        }
    }
};

/**
 * Get profile description for display
 */
function getProfileDescription(profileId) {
    const descriptions = {
        'core': 'Full Kaspa node with RPC and P2P capabilities',
        'archive-node': 'Archive node with full transaction history',
        'kaspa-user-applications': 'Web applications for Kaspa ecosystem',
        'indexer-services': 'Indexing services for blockchain data',
        'mining': 'Mining pool and stratum server'
    };
    
    return descriptions[profileId] || 'Kaspa service profile';
}

/**
 * Calculate configuration diff
 */
function calculateConfigurationDiff(currentConfig, newConfig) {
    const changes = [];
    let hasChanges = false;
    
    // Find added/modified fields
    Object.keys(newConfig).forEach(key => {
        if (!(key in currentConfig)) {
            changes.push({
                type: 'added',
                key: key,
                newValue: newConfig[key]
            });
            hasChanges = true;
        } else if (currentConfig[key] !== newConfig[key]) {
            changes.push({
                type: 'modified',
                key: key,
                currentValue: currentConfig[key],
                newValue: newConfig[key]
            });
            hasChanges = true;
        }
    });
    
    // Find removed fields
    Object.keys(currentConfig).forEach(key => {
        if (!(key in newConfig)) {
            changes.push({
                type: 'removed',
                key: key,
                currentValue: currentConfig[key]
            });
            hasChanges = true;
        }
    });
    
    return {
        hasChanges,
        changes
    };
}