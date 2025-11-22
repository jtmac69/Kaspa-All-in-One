/**
 * Configure Module
 * Handles configuration form loading and management
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

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
    
    // Show/hide sections based on profiles
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    updateFormVisibility(selectedProfiles);
}

/**
 * Update form visibility based on selected profiles
 */
function updateFormVisibility(profiles) {
    // Database section - show if explorer or prod profiles are selected
    const dbSection = document.querySelector('.config-section:has(#db-password)');
    if (dbSection) {
        const needsDatabase = profiles.includes('explorer') || profiles.includes('prod');
        dbSection.style.display = needsDatabase ? 'block' : 'none';
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
        required: true
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
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    const needsDatabase = selectedProfiles.includes('explorer') || selectedProfiles.includes('prod');
    
    if (needsDatabase) {
        const dbPasswordField = document.getElementById('db-password');
        if (dbPasswordField && (!dbPasswordField.value || dbPasswordField.value.trim() === '')) {
            isValid = false;
            showFieldError('db-password', 'Database password is required for selected profiles');
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
        // First, validate client-side
        const clientValidation = validateAllFields();
        if (!clientValidation.valid) {
            showNotification('Please fix the validation errors before continuing', 'error');
            return false;
        }
        
        // Then validate server-side
        const config = gatherConfigurationFromForm();
        const response = await api.post('/config/validate', config);
        
        if (!response.valid) {
            // Show server-side validation errors
            response.errors.forEach(error => {
                const fieldId = error.field.replace(/\./g, '-').toLowerCase();
                showFieldError(fieldId, error.message);
            });
            
            const errorMessages = response.errors.map(e => `${e.field}: ${e.message}`).join('\n');
            showNotification(`Configuration validation failed:\n${errorMessages}`, 'error', 5000);
            return false;
        }
        
        // Update state with validated config
        stateManager.set('configuration', response.config);
        return true;
        
    } catch (error) {
        console.error('Configuration validation failed:', error);
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

