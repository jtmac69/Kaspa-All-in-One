/**
 * Settings Modification Module
 * Handles reconfiguration of existing service parameters
 * 
 * This module allows users to modify configuration for installed services
 * without reinstalling or removing them.
 */

import { stateManager } from './state-manager.js';
import { api } from './api-client.js';
import { showNotification } from './utils.js';
import { goToStep } from './navigation.js';

/**
 * Settings Modification Class
 */
class SettingsModificationModule {
  constructor() {
    this.installedProfiles = [];
    this.currentProfile = null;
    this.currentConfig = {};
    this.modifiedFields = new Set();
  }
  
  /**
   * Initialize settings modification flow
   */
  async initialize() {
    console.log('[SETTINGS-MOD] Initializing settings modification');
    
    try {
      // Load installed profiles
      await this.loadInstalledProfiles();
      
      if (this.installedProfiles.length === 0) {
        showNotification('No installed services found to modify', 'warning');
        console.warn('[SETTINGS-MOD] No installed profiles available');
        
        // Show empty state
        this.showEmptyState();
        return;
      }
      
      // Show profile selection
      this.showProfileSelection();
      
    } catch (error) {
      console.error('[SETTINGS-MOD] Initialization failed:', error);
      showNotification('Failed to load installed profiles', 'error');
    }
  }
  
  /**
   * Load installed profiles from state
   * Uses reconfigurationData as single source of truth (loaded by landing page)
   */
  async loadInstalledProfiles() {
    console.log('[SETTINGS-MOD] Loading installed profiles from state');
    
    const reconfigData = stateManager.get('reconfigurationData');
    
    if (!reconfigData) {
      console.error('[SETTINGS-MOD] reconfigurationData not found in state - landing page may not have loaded');
      this.installedProfiles = [];
      return;
    }
    
    if (!reconfigData.profileStates || reconfigData.profileStates.length === 0) {
      console.warn('[SETTINGS-MOD] No profileStates in reconfigurationData');
      this.installedProfiles = [];
      return;
    }
    
    this.installedProfiles = reconfigData.profileStates
      .filter(p => p.installationState === 'installed')
      .map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon || '📦',
        description: p.description || 'Service configuration',
        serviceCount: p.services?.length || 0
      }));
    
    console.log('[SETTINGS-MOD] Loaded', this.installedProfiles.length, 'installed profiles');
  }
  
  /**
   * Show empty state when no profiles are installed
   */
  showEmptyState() {
    const container = document.getElementById('settings-mod-container');
    if (!container) {
      console.error('[SETTINGS-MOD] Container not found');
      return;
    }
    
    const html = `
      <div class="settings-mod-empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No Services Installed</h3>
        <p>You don't have any services installed yet. Install some services first before modifying their settings.</p>
        <div class="empty-state-actions">
          <button class="btn-primary" onclick="startAddRemoveServices()">
            Install Services
          </button>
          <button class="btn-secondary" onclick="settingsModification.goBack()">
            Go Back
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  /**
   * Go back to reconfiguration landing page
   */
  goBack() {
    console.log('[SETTINGS-MOD] Going back to reconfiguration landing');
    
    // Hide settings modification step
    const settingsStep = document.getElementById('step-settings-modification');
    if (settingsStep) {
      settingsStep.classList.remove('active');
      settingsStep.style.display = 'none';
    }
    
    // Show reconfiguration landing step
    const landingStep = document.getElementById('step-reconfigure-landing');
    if (landingStep) {
      landingStep.classList.add('active');
      landingStep.style.display = 'flex';
    }
    
    // Clear container
    const container = document.getElementById('settings-mod-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Reset state
    this.currentProfile = null;
    this.currentConfig = {};
    this.modifiedFields.clear();
  }
  
  /**
   * Show profile selection UI
   */
  showProfileSelection() {
    console.log('[SETTINGS-MOD] Showing profile selection');
    
    // Hide the reconfiguration landing step
    const landingStep = document.getElementById('step-reconfigure-landing');
    if (landingStep) {
      landingStep.classList.remove('active');
      landingStep.style.display = 'none';
    }
    
    // Show the settings modification step
    const settingsStep = document.getElementById('step-settings-modification');
    if (settingsStep) {
      settingsStep.classList.add('active');
      settingsStep.style.display = 'flex';
    }
    
    const container = document.getElementById('settings-mod-container');
    if (!container) {
      console.error('[SETTINGS-MOD] Container not found');
      return;
    }
    
    const html = `
      <div class="settings-mod-selection">
        <div class="settings-mod-header-text">
          <h3>Select Service to Configure</h3>
          <p class="settings-mod-description">
            Choose which installed service you want to reconfigure
          </p>
        </div>
        
        <div class="settings-mod-profile-grid">
          ${this.installedProfiles.map(profile => `
            <div class="settings-mod-profile-card" 
                 onclick="settingsModification.selectProfile('${profile.id}')">
              <div class="profile-card-header">
                <div class="profile-icon">${profile.icon}</div>
                <span class="installed-badge">✓ Installed</span>
              </div>
              <h4>${profile.name}</h4>
              <p class="profile-description">${profile.description}</p>
              <p class="profile-service-count">
                ${profile.serviceCount} service${profile.serviceCount !== 1 ? 's' : ''}
              </p>
              <button class="btn-secondary btn-small">Configure</button>
            </div>
          `).join('')}
        </div>
        
        <div class="settings-mod-actions">
          <button class="btn-secondary" onclick="settingsModification.goBack()">Cancel</button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    console.log('[SETTINGS-MOD] Profile selection displayed');
  }
  
  /**
   * Select a profile to modify
   */
  async selectProfile(profileId) {
    console.log('[SETTINGS-MOD] Selected profile:', profileId);
    
    this.currentProfile = profileId;
    this.modifiedFields.clear();
    
    // Show loading state
    const container = document.getElementById('settings-mod-container');
    if (container) {
      container.innerHTML = `
        <div class="settings-mod-loading">
          <div class="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      `;
    }
    
    try {
      // Load current configuration from API
      console.log('[SETTINGS-MOD] Fetching configuration for:', profileId);
      const response = await api.get(`/wizard/config/current/${profileId}`);
      
      if (response && response.success) {
        this.currentConfig = response.currentConfig || {};
        this.availableFields = response.availableFields || [];
        console.log('[SETTINGS-MOD] Configuration loaded:', 
          Object.keys(this.currentConfig).length, 'config values,',
          this.availableFields.length, 'available fields');
        this.showConfigurationForm();
      } else {
        throw new Error(response?.message || response?.error || 'Failed to load configuration');
      }
      
    } catch (error) {
      console.error('[SETTINGS-MOD] Failed to load config:', error);
      showNotification('Failed to load current configuration', 'error');
      
      // Show error state
      this.showConfigurationError(error);
    }
  }
  
  /**
   * Show configuration error
   */
  showConfigurationError(error) {
    const profile = this.installedProfiles.find(p => p.id === this.currentProfile);
    const container = document.getElementById('settings-mod-container');
    
    if (!container) return;
    
    const html = `
      <div class="settings-mod-error">
        <div class="error-icon">⚠️</div>
        <h3>Failed to Load Configuration</h3>
        <p>${error.message || 'Unknown error occurred'}</p>
        <div class="error-actions">
          <button class="btn-secondary" onclick="settingsModification.selectProfile('${this.currentProfile}')">
            Retry
          </button>
          <button class="btn-secondary" onclick="settingsModification.showProfileSelection()">
            Back to Selection
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  /**
   * Show configuration form for selected profile
   */
  showConfigurationForm() {
    console.log('[SETTINGS-MOD] Showing configuration form for:', this.currentProfile);
    
    const profile = this.installedProfiles.find(p => p.id === this.currentProfile);
    if (!profile) {
      console.error('[SETTINGS-MOD] Profile not found:', this.currentProfile);
      return;
    }
    
    const container = document.getElementById('settings-mod-container');
    if (!container) {
      console.error('[SETTINGS-MOD] Container not found');
      return;
    }
    
    const html = `
      <div class="settings-mod-form">
        <div class="settings-mod-form-header">
          <button class="btn-icon-only" 
                  onclick="settingsModification.showProfileSelection()"
                  title="Back to selection">
            ←
          </button>
          <div class="settings-mod-title">
            <span class="profile-icon">${profile.icon}</span>
            <div class="title-text">
              <h3>Configure ${profile.name}</h3>
              <p class="subtitle">${profile.description}</p>
            </div>
          </div>
        </div>
        
        <div class="settings-mod-fields">
          ${this.renderConfigurationFields()}
        </div>
        
        <div class="settings-mod-form-footer">
          <div class="footer-info">
            <span class="modified-indicator ${this.modifiedFields.size > 0 ? 'visible' : ''}">
              ${this.modifiedFields.size} field${this.modifiedFields.size !== 1 ? 's' : ''} modified
            </span>
          </div>
          <div class="footer-actions">
            <button class="btn-secondary" 
                    onclick="settingsModification.showProfileSelection()">
              Cancel
            </button>
            <button class="btn-primary" 
                    onclick="settingsModification.saveConfiguration()"
                    id="save-config-btn">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Initialize event listeners for form fields
    this.initializeFormListeners();
    
    console.log('[SETTINGS-MOD] Configuration form displayed');
  }
  
  /**
   * Render configuration fields based on profile type
   * Uses fields from API response (availableFields) as primary source
   */
  renderConfigurationFields() {
    // Use API-provided fields first, fall back to local definitions
    const fields = this.availableFields && this.availableFields.length > 0 
      ? this.availableFields 
      : this.getFieldsForProfile(this.currentProfile);
    
    if (fields.length === 0) {
      return `
        <div class="no-fields-message">
          <div class="message-icon">ℹ️</div>
          <p>This service has no user-configurable settings.</p>
        </div>
      `;
    }
    
    return fields.map(field => {
      const value = this.currentConfig[field.key] !== undefined 
        ? this.currentConfig[field.key] 
        : (field.default !== undefined ? field.default : '');
      
      // Generate description from label if not provided
      const description = field.description || `Configure ${field.label}`;
      
      return `
        <div class="config-field" data-field-key="${field.key}">
          <label for="field-${field.key}" class="config-field-label">
            ${field.label}
            ${field.required ? '<span class="required">*</span>' : ''}
          </label>
          <p class="config-field-description">${description}</p>
          ${this.renderFieldInput(field, value)}
          ${field.helpText ? `<p class="config-field-help">${field.helpText}</p>` : ''}
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render input based on field type
   * Handles both backend format (type: 'boolean', options: ['a', 'b']) 
   * and frontend format (type: 'checkbox', options: [{value, label}])
   */
  renderFieldInput(field, value) {
    // Normalize field type - backend uses 'boolean', frontend uses 'checkbox'
    const fieldType = field.type === 'boolean' ? 'checkbox' : field.type;
    
    switch (fieldType) {
      case 'text':
      case 'password':
        return `
          <input 
            type="${field.type === 'password' ? 'password' : 'text'}" 
            id="field-${field.key}"
            class="config-field-input"
            value="${this.escapeHtml(String(value || ''))}"
            placeholder="${field.placeholder || ''}"
            data-field="${field.key}"
            ${field.required ? 'required' : ''}
            ${field.pattern ? `pattern="${field.pattern}"` : ''}
          />
        `;
        
      case 'number':
        return `
          <input 
            type="number" 
            id="field-${field.key}"
            class="config-field-input"
            value="${value !== undefined && value !== '' ? value : (field.default || '')}"
            placeholder="${field.placeholder || ''}"
            data-field="${field.key}"
            ${field.required ? 'required' : ''}
            ${field.min !== undefined ? `min="${field.min}"` : ''}
            ${field.max !== undefined ? `max="${field.max}"` : ''}
          />
        `;
        
      case 'checkbox':
        // Handle boolean values from backend (true/false, 'true'/'false')
        const isChecked = value === true || value === 'true' || value === 1;
        return `
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              id="field-${field.key}"
              class="config-field-checkbox"
              ${isChecked ? 'checked' : ''}
              data-field="${field.key}"
            />
            <span>${field.checkboxLabel || field.label || 'Enable'}</span>
          </label>
        `;
        
      case 'select':
        // Handle both array of strings (backend) and array of objects (frontend)
        const options = field.options || [];
        const optionsHtml = options.map(opt => {
          // Backend sends array of strings, frontend sends array of {value, label}
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const isSelected = String(value) === String(optValue);
          return `<option value="${optValue}" ${isSelected ? 'selected' : ''}>${optLabel}</option>`;
        }).join('');
        
        return `
          <select 
            id="field-${field.key}"
            class="config-field-select"
            data-field="${field.key}"
            ${field.required ? 'required' : ''}
          >
            ${optionsHtml}
          </select>
        `;
        
      case 'textarea':
        return `
          <textarea 
            id="field-${field.key}"
            class="config-field-textarea"
            data-field="${field.key}"
            placeholder="${field.placeholder || ''}"
            rows="${field.rows || 3}"
            ${field.required ? 'required' : ''}
          >${this.escapeHtml(String(value || ''))}</textarea>
        `;
        
      default:
        console.warn('[SETTINGS-MOD] Unknown field type:', field.type, '- rendering as text input');
        return `
          <input 
            type="text" 
            id="field-${field.key}"
            class="config-field-input"
            value="${this.escapeHtml(String(value || ''))}"
            placeholder="${field.placeholder || ''}"
            data-field="${field.key}"
          />
        `;
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Get configurable fields for a profile
   * This defines which settings users can modify for each service
   */
  getFieldsForProfile(profileId) {
    // Field definitions per profile
    const fieldDefinitions = {
      'kaspa-node': [
        {
          key: 'KASPA_NODE_RPC_PORT',
          label: 'RPC Port',
          description: 'Port for RPC connections',
          type: 'number',
          placeholder: '16110',
          default: 16110,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 16110'
        },
        {
          key: 'KASPA_NODE_P2P_PORT',
          label: 'P2P Port',
          description: 'Port for peer-to-peer connections',
          type: 'number',
          placeholder: '16111',
          default: 16111,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 16111'
        },
        {
          key: 'KASPA_NODE_WRPC_PORT',
          label: 'wRPC Port',
          description: 'Port for WebSocket RPC connections',
          type: 'number',
          placeholder: '17110',
          default: 17110,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 17110'
        },
        {
          key: 'PUBLIC_NODE',
          label: 'Public Node',
          description: 'Allow external connections to your node',
          type: 'checkbox',
          checkboxLabel: 'Public Node',
          default: false,
          helpText: 'Enable this if you want to share your node with the network'
        },
        {
          key: 'WALLET_ENABLED',
          label: 'Enable Wallet',
          description: 'Enable wallet functionality',
          type: 'checkbox',
          checkboxLabel: 'Enable Wallet',
          default: false,
          helpText: 'Enable wallet support on this node'
        },
        {
          key: 'UTXO_INDEX',
          label: 'UTXO Index',
          description: 'Enable UTXO indexing',
          type: 'checkbox',
          checkboxLabel: 'UTXO Index',
          default: true,
          helpText: 'Required for wallet and indexer functionality'
        }
      ],
      
      'kaspa-archive-node': [
        {
          key: 'KASPA_NODE_RPC_PORT',
          label: 'RPC Port',
          description: 'Port for RPC connections',
          type: 'number',
          placeholder: '16110',
          default: 16110,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 16110'
        },
        {
          key: 'KASPA_NODE_P2P_PORT',
          label: 'P2P Port',
          description: 'Port for peer-to-peer connections',
          type: 'number',
          placeholder: '16111',
          default: 16111,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 16111'
        },
        {
          key: 'KASPA_NODE_WRPC_PORT',
          label: 'wRPC Port',
          description: 'Port for WebSocket RPC connections',
          type: 'number',
          placeholder: '17110',
          default: 17110,
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 17110'
        },
        {
          key: 'PUBLIC_NODE',
          label: 'Public Node',
          description: 'Allow external connections to your archive node',
          type: 'checkbox',
          checkboxLabel: 'Public Node',
          default: false,
          helpText: 'Enable this if you want to share your archive node with the network'
        }
      ],
      
      'k-social-app': [
        {
          key: 'PUBLIC_INDEXER_URL',
          label: 'Public Indexer URL',
          description: 'URL of the public Kaspa indexer to use',
          type: 'select',
          options: [
            { value: 'https://api.kaspa.org', label: 'Official Kaspa API' },
            { value: 'https://indexer.kaspa.org', label: 'Official Indexer' },
            { value: 'custom', label: 'Custom URL' }
          ],
          default: 'https://api.kaspa.org',
          required: true
        },
        {
          key: 'CUSTOM_INDEXER_URL',
          label: 'Custom Indexer URL',
          description: 'Enter custom indexer URL if selected above',
          type: 'text',
          placeholder: 'https://your-indexer.example.com',
          default: '',
          helpText: 'Only used if "Custom URL" is selected above'
        }
      ],
      
      'kaspa-stratum': [
        {
          key: 'MINING_ADDRESS',
          label: 'Mining Payout Address',
          description: 'Kaspa address to receive mining rewards',
          type: 'text',
          placeholder: 'kaspa:qz...',
          required: true,
          pattern: '^kaspa:[a-z0-9]+$',
          helpText: 'Must start with "kaspa:" followed by your address'
        },
        {
          key: 'STRATUM_PORT',
          label: 'Stratum Port',
          description: 'Port for mining client connections',
          type: 'number',
          placeholder: '5555',
          default: '5555',
          required: true,
          min: 1024,
          max: 65535,
          helpText: 'Default: 5555'
        },
        {
          key: 'MIN_SHARE_DIFFICULTY',
          label: 'Minimum Share Difficulty',
          description: 'Minimum difficulty for accepted shares',
          type: 'number',
          placeholder: '1',
          default: '1',
          min: 1,
          helpText: 'Lower values accept more shares but increase network load'
        }
      ],
      
      'kaspa-explorer-bundle': [
        {
          key: 'EXPLORER_PORT',
          label: 'Explorer Web Port',
          description: 'Port for the explorer web interface',
          type: 'number',
          default: '8080',
          min: 1024,
          max: 65535
        }
      ],
      
      'kasia-indexer': [
        {
          key: 'INDEXER_PORT',
          label: 'Indexer API Port',
          description: 'Port for the indexer API',
          type: 'number',
          default: '8000',
          min: 1024,
          max: 65535
        }
      ]
    };
    
    // Legacy profile ID mapping to new profile IDs
    const legacyProfileMapping = {
      'core': 'kaspa-node',
      'archive-node': 'kaspa-archive-node',
      'mining': 'kaspa-stratum',
      'kaspa-user-applications': 'k-social-app',  // Map to first app
      'indexer-services': 'kasia-indexer'  // Map to first indexer
    };
    
    // Resolve legacy profile ID to new profile ID
    const resolvedProfileId = legacyProfileMapping[profileId] || profileId;
    
    const fields = fieldDefinitions[resolvedProfileId] || [];
    
    console.log('[SETTINGS-MOD] Loaded', fields.length, 'fields for profile:', profileId, 
      profileId !== resolvedProfileId ? `(resolved to ${resolvedProfileId})` : '');
    
    return fields;
  }
  
  /**
   * Initialize form field event listeners
   */
  initializeFormListeners() {
    console.log('[SETTINGS-MOD] Initializing form listeners');
    
    // Track field changes
    document.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('change', (e) => {
        const fieldKey = e.target.dataset.field;
        this.modifiedFields.add(fieldKey);
        
        // Update modified indicator
        this.updateModifiedIndicator();
        
        console.log('[SETTINGS-MOD] Field modified:', fieldKey);
      });
      
      // Also track input events for text fields (real-time tracking)
      if (input.type === 'text' || input.tagName === 'TEXTAREA') {
        input.addEventListener('input', (e) => {
          const fieldKey = e.target.dataset.field;
          const originalValue = this.currentConfig[fieldKey] || '';
          const currentValue = e.target.value;
          
          if (currentValue !== originalValue) {
            this.modifiedFields.add(fieldKey);
          } else {
            this.modifiedFields.delete(fieldKey);
          }
          
          this.updateModifiedIndicator();
        });
      }
    });
    
    console.log('[SETTINGS-MOD] Form listeners initialized');
  }
  
  /**
   * Update modified indicator UI
   */
  updateModifiedIndicator() {
    const indicator = document.querySelector('.modified-indicator');
    if (indicator) {
      if (this.modifiedFields.size > 0) {
        indicator.classList.add('visible');
        indicator.textContent = `${this.modifiedFields.size} field${this.modifiedFields.size !== 1 ? 's' : ''} modified`;
      } else {
        indicator.classList.remove('visible');
      }
    }
  }
  
  /**
   * Save configuration changes
   */
  async saveConfiguration() {
    console.log('[SETTINGS-MOD] Saving configuration');
    
    if (this.modifiedFields.size === 0) {
      showNotification('No changes to save', 'info');
      return;
    }
    
    // Collect values from form
    const newConfig = {};
    document.querySelectorAll('[data-field]').forEach(input => {
      const key = input.dataset.field;
      
      if (input.type === 'checkbox') {
        newConfig[key] = input.checked;
      } else if (input.type === 'number') {
        newConfig[key] = parseInt(input.value, 10);
      } else {
        newConfig[key] = input.value;
      }
    });
    
    console.log('[SETTINGS-MOD] New config:', newConfig);
    console.log('[SETTINGS-MOD] Modified fields:', Array.from(this.modifiedFields));
    
    // Validate required fields
    const fields = this.getFieldsForProfile(this.currentProfile);
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !newConfig[f.key]);
    
    if (missingFields.length > 0) {
      showNotification(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`, 'error');
      return;
    }
    
    // Disable save button
    const saveBtn = document.getElementById('save-config-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    
    try {
      // Save via API
      const response = await api.post('/config/update', {
        profileId: this.currentProfile,
        config: newConfig,
        modifiedFields: Array.from(this.modifiedFields)
      });
      
      if (response && response.success) {
        console.log('[SETTINGS-MOD] Configuration saved successfully');
        showNotification('Configuration updated successfully', 'success');
        
        // Update state
        stateManager.set('pendingConfigurationUpdate', {
          profileId: this.currentProfile,
          config: newConfig,
          timestamp: new Date().toISOString()
        });
        
        // Clear modified fields
        this.modifiedFields.clear();
        
        // Return to reconfiguration landing after delay
        setTimeout(() => {
          window.history.back();
          // Or: goToStep('reconfigure-landing');
        }, 1500);
        
      } else {
        throw new Error(response?.message || 'Failed to save configuration');
      }
      
    } catch (error) {
      console.error('[SETTINGS-MOD] Save failed:', error);
      showNotification(`Failed to save: ${error.message}`, 'error');
      
      // Re-enable save button
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }
}

// Export singleton instance
export const settingsModification = new SettingsModificationModule();

// Global function for HTML onclick handlers
window.settingsModification = settingsModification;
