/**
 * Custom Setup Module
 * Handles checkbox-based profile selection with conflict detection
 * and resource calculation for custom installations
 * 
 * @module custom-setup
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Profile categorization for checkbox grouping
 */
const PROFILE_CATEGORIES = {
  node: {
    name: 'Node Profiles',
    description: 'Select one node type or none (kaspa-node conflicts with kaspa-archive-node)',
    profiles: ['kaspa-node', 'kaspa-archive-node'],
    selectionMode: 'single',
    icon: '🖥️'
  },
  apps: {
    name: 'Application Profiles',
    description: 'Select any applications you want to run',
    profiles: ['kasia-app', 'k-social-app', 'kaspa-explorer-bundle'],
    selectionMode: 'multiple',
    icon: '📱'
  },
  indexers: {
    name: 'Indexer Profiles',
    description: 'Select based on your application needs',
    profiles: ['kasia-indexer', 'k-indexer-bundle'],
    selectionMode: 'multiple',
    icon: '📊'
  },
  mining: {
    name: 'Mining Profiles',
    description: 'For mining operations (requires a local node)',
    profiles: ['kaspa-stratum'],
    selectionMode: 'multiple',
    icon: '⛏️'
  }
};

/**
 * Profile conflict definitions
 */
const PROFILE_CONFLICTS = {
  'kaspa-node': ['kaspa-archive-node'],
  'kaspa-archive-node': ['kaspa-node']
};

/**
 * Profile dependency definitions
 */
const PROFILE_DEPENDENCIES = {
  'kaspa-stratum': {
    requires: ['kaspa-node', 'kaspa-archive-node'],
    requiresAny: true,
    message: 'Kaspa Stratum requires a local Kaspa node (standard or archive)'
  }
};

/**
 * Resource specifications for each profile
 */
const PROFILE_RESOURCES = {
  'kaspa-node': { memory: 4, cpu: 2, disk: 100 },
  'kasia-app': { memory: 1, cpu: 1, disk: 10 },
  'k-social-app': { memory: 1, cpu: 1, disk: 10 },
  'kaspa-explorer-bundle': { memory: 8, cpu: 4, disk: 500 },
  'kasia-indexer': { memory: 4, cpu: 2, disk: 200 },
  'k-indexer-bundle': { memory: 6, cpu: 4, disk: 300 },
  'kaspa-archive-node': { memory: 12, cpu: 4, disk: 1000 },
  'kaspa-stratum': { memory: 2, cpu: 2, disk: 50 }
};

/**
 * Custom Setup Module Class
 */
export class CustomSetupModule {
  constructor() {
    this.selectedProfiles = [];
    this.profileData = null;
    this.installedProfiles = [];
    this.isReconfigurationMode = false;
  }

  /**
   * Initialize the custom setup module
   */
  async initialize() {
    try {
      console.log('[CUSTOM-SETUP] Initializing custom setup module');
      
      // Check if in reconfiguration mode
      this.isReconfigurationMode = stateManager.get('wizardMode') === 'reconfigure';
      
      // Load profile data
      await this.loadProfileData();
      
      // If reconfiguration mode, load installed profiles
      if (this.isReconfigurationMode) {
        await this.loadInstalledProfiles();
      }
      
      // Load previously selected profiles from state
      const savedProfiles = stateManager.get('selectedProfiles') || [];
      this.selectedProfiles = [...savedProfiles];
      
      // Render the profile picker
      this.renderProfilePicker();
      
      // Initialize event listeners
      this.initializeEventListeners();
      
      console.log('[CUSTOM-SETUP] Initialization complete');
      
    } catch (error) {
      console.error('[CUSTOM-SETUP] Initialization failed:', error);
      showNotification('Failed to initialize custom setup', 'error');
    }
  }

  /**
   * Load profile data from API
   */
  async loadProfileData() {
    try {
      const response = await api.get('/profiles');
      
      if (response && response.success && response.profiles) {
        this.profileData = response.profiles;
        console.log('[CUSTOM-SETUP] Loaded profile data:', this.profileData.length, 'profiles');
      } else {
        throw new Error('Invalid profile data response');
      }
      
    } catch (error) {
      console.warn('[CUSTOM-SETUP] Failed to load profile data from API, using fallback');
      this.profileData = this.getFallbackProfileData();
    }
  }

  /**
   * Load installed profiles for reconfiguration mode
   */
  async loadInstalledProfiles() {
    try {
      const profileStates = stateManager.get('profileStates');
      
      if (profileStates) {
        this.installedProfiles = profileStates
          .filter(p => p.installationState === 'installed')
          .map(p => p.id);
        
        console.log('[CUSTOM-SETUP] Loaded installed profiles:', this.installedProfiles);
      }
      
    } catch (error) {
      console.error('[CUSTOM-SETUP] Failed to load installed profiles:', error);
      this.installedProfiles = [];
    }
  }

  /**
   * Render the profile picker UI
   */
  renderProfilePicker() {
    console.log('[CUSTOM-SETUP] Rendering profile picker');
    
    // Find or create container
    let container = document.getElementById('custom-setup-container');
    
    if (!container) {
      // Create container if it doesn't exist
      const step5 = document.getElementById('step-5');
      if (!step5) {
        console.error('[CUSTOM-SETUP] Cannot find step-5 element');
        return;
      }
      
      container = document.createElement('div');
      container.id = 'custom-setup-container';
      container.className = 'custom-setup-container';
      container.style.display = 'none';  // Hidden by default
      
      const stepContent = step5.querySelector('.step-content');
      if (stepContent) {
        stepContent.appendChild(container);
      } else {
        step5.appendChild(container);
      }
    }
    
    // Build HTML for profile picker
    const html = this.buildProfilePickerHTML();
    container.innerHTML = html;
    
    // Update resource display
    this.updateResourceDisplay();
    
    // Update conflict/dependency warnings
    this.updateValidationDisplay();
  }

  /**
   * Build HTML for profile picker
   */
  buildProfilePickerHTML() {
    let html = `
      <div class="custom-setup-header">
        <h3>Custom Setup - Select Profiles</h3>
        <p class="custom-setup-description">
          Choose individual profiles to create your custom Kaspa installation.
          ${this.isReconfigurationMode ? 'Already installed profiles are pre-selected.' : ''}
        </p>
      </div>
    `;
    
    // Render each category
    for (const [categoryId, category] of Object.entries(PROFILE_CATEGORIES)) {
      html += this.buildCategorySection(categoryId, category);
    }
    
    // Resource summary
    html += `
      <div class="resource-summary-card">
        <h4><span class="summary-icon">📊</span> Resource Requirements</h4>
        <div class="resource-summary-grid">
          <div class="resource-summary-item">
            <span class="resource-icon">💾</span>
            <span class="resource-label">Total RAM:</span>
            <span id="total-ram-custom" class="resource-value">0 GB</span>
          </div>
          <div class="resource-summary-item">
            <span class="resource-icon">⚙️</span>
            <span class="resource-label">Total CPU:</span>
            <span id="total-cpu-custom" class="resource-value">0 cores</span>
          </div>
          <div class="resource-summary-item">
            <span class="resource-icon">💿</span>
            <span class="resource-label">Total Disk:</span>
            <span id="total-disk-custom" class="resource-value">0 GB</span>
          </div>
        </div>
      </div>
    `;
    
    // Validation warnings
    html += `
      <div id="validation-warnings" class="validation-warnings" style="display: none;">
        <!-- Conflict and dependency warnings will be inserted here -->
      </div>
    `;
    
    return html;
  }

  /**
   * Build HTML for a profile category section
   */
  buildCategorySection(categoryId, category) {
    let html = `
      <div class="profile-category-section" data-category="${categoryId}">
        <div class="category-header">
          <span class="category-icon">${category.icon}</span>
          <div class="category-info">
            <h4 class="category-name">${category.name}</h4>
            <p class="category-description">${category.description}</p>
          </div>
        </div>
        <div class="profile-checkbox-grid">
    `;
    
    // Render checkboxes for each profile in category
    for (const profileId of category.profiles) {
      const profile = this.getProfileInfo(profileId);
      const isSelected = this.selectedProfiles.includes(profileId);
      const isInstalled = this.installedProfiles.includes(profileId);
      const isDisabled = this.isProfileDisabled(profileId);
      
      html += `
        <div class="profile-checkbox-card ${isInstalled ? 'installed' : ''} ${isDisabled ? 'disabled' : ''}"
             data-profile="${profileId}">
          <label class="profile-checkbox-label">
            <input 
              type="checkbox"
              class="profile-checkbox-input"
              data-profile="${profileId}"
              ${isSelected ? 'checked' : ''}
              ${isDisabled ? 'disabled' : ''}
            />
            <div class="profile-checkbox-content">
              <div class="profile-checkbox-header">
                <span class="profile-icon">${profile.icon}</span>
                <span class="profile-name">${profile.name}</span>
                ${isInstalled ? '<span class="installed-badge">✓ Installed</span>' : ''}
              </div>
              <p class="profile-description">${profile.description}</p>
              <div class="profile-resources-mini">
                <span>💾 ${profile.resources.memory}GB</span>
                <span>💿 ${profile.resources.disk}GB</span>
              </div>
            </div>
          </label>
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Listen for checkbox changes using event delegation
    document.addEventListener('change', (event) => {
      if (event.target.classList.contains('profile-checkbox-input')) {
        const profileId = event.target.dataset.profile;
        this.handleProfileSelection(profileId, event.target.checked);
      }
    });
  }

  /**
   * Handle profile selection/deselection
   */
  handleProfileSelection(profileId, isSelected) {
    console.log(`[CUSTOM-SETUP] Profile ${profileId} ${isSelected ? 'selected' : 'deselected'}`);
    
    if (isSelected) {
      // Check for conflicts before adding
      const conflicts = this.detectConflicts([...this.selectedProfiles, profileId]);
      
      if (conflicts.length > 0) {
        // Show conflict warning but still allow selection
        // The user might deselect the conflicting profile next
        console.warn('[CUSTOM-SETUP] Conflicts detected:', conflicts);
      }
      
      // Add to selected profiles
      if (!this.selectedProfiles.includes(profileId)) {
        this.selectedProfiles.push(profileId);
      }
      
      // Handle category-specific logic (e.g., single selection for nodes)
      this.handleCategoryLogic(profileId, 'select');
      
    } else {
      // Remove from selected profiles
      this.selectedProfiles = this.selectedProfiles.filter(id => id !== profileId);
      
      // Show warning if removing installed profile in reconfiguration mode
      if (this.isReconfigurationMode && this.installedProfiles.includes(profileId)) {
        this.showRemovalWarning(profileId);
      }
    }
    
    // Save to state
    stateManager.set('selectedProfiles', this.selectedProfiles);
    
    // Update UI
    this.updateResourceDisplay();
    this.updateValidationDisplay();
  }

  /**
   * Handle category-specific selection logic
   */
  handleCategoryLogic(profileId, action) {
    // Find which category this profile belongs to
    for (const [categoryId, category] of Object.entries(PROFILE_CATEGORIES)) {
      if (category.profiles.includes(profileId)) {
        
        // If category is single-selection (like nodes)
        if (category.selectionMode === 'single' && action === 'select') {
          // Deselect other profiles in this category
          for (const otherProfileId of category.profiles) {
            if (otherProfileId !== profileId && this.selectedProfiles.includes(otherProfileId)) {
              // Remove from selected
              this.selectedProfiles = this.selectedProfiles.filter(id => id !== otherProfileId);
              
              // Uncheck checkbox
              const checkbox = document.querySelector(`.profile-checkbox-input[data-profile="${otherProfileId}"]`);
              if (checkbox) checkbox.checked = false;
              
              console.log(`[CUSTOM-SETUP] Auto-deselected ${otherProfileId} (single-selection category)`);
            }
          }
        }
        
        break;
      }
    }
  }

  /**
   * Detect conflicts in selected profiles
   */
  detectConflicts(profileList) {
    const conflicts = [];
    const seen = new Set();
    
    for (const profileId of profileList) {
      const conflictsWith = PROFILE_CONFLICTS[profileId];
      
      if (conflictsWith) {
        for (const conflictId of conflictsWith) {
          if (profileList.includes(conflictId)) {
            // Create unique key to avoid duplicate conflict entries
            const key = [profileId, conflictId].sort().join('-');
            if (!seen.has(key)) {
              seen.add(key);
              conflicts.push({
                profile1: profileId,
                profile2: conflictId,
                message: `${this.getProfileInfo(profileId).name} conflicts with ${this.getProfileInfo(conflictId).name}`
              });
            }
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Validate dependencies in selected profiles
   */
  validateDependencies(profileList) {
    const warnings = [];
    
    for (const profileId of profileList) {
      const dependency = PROFILE_DEPENDENCIES[profileId];
      
      if (dependency) {
        const hasRequired = dependency.requiresAny
          ? dependency.requires.some(reqId => profileList.includes(reqId))
          : dependency.requires.every(reqId => profileList.includes(reqId));
        
        if (!hasRequired) {
          warnings.push({
            profile: profileId,
            message: dependency.message || `${this.getProfileInfo(profileId).name} has unmet dependencies`
          });
        }
      }
    }
    
    return warnings;
  }

  /**
   * Calculate total resources for selected profiles
   */
  calculateResources(profileList) {
    const totals = { memory: 0, cpu: 0, disk: 0 };
    
    for (const profileId of profileList) {
      const resources = PROFILE_RESOURCES[profileId];
      if (resources) {
        totals.memory += resources.memory;
        totals.cpu = Math.max(totals.cpu, resources.cpu);  // CPU is MAX not SUM
        totals.disk += resources.disk;
      }
    }
    
    return totals;
  }

  /**
   * Update resource display
   */
  updateResourceDisplay() {
    const resources = this.calculateResources(this.selectedProfiles);
    
    const ramEl = document.getElementById('total-ram-custom');
    const cpuEl = document.getElementById('total-cpu-custom');
    const diskEl = document.getElementById('total-disk-custom');
    
    if (ramEl) ramEl.textContent = `${resources.memory} GB`;
    if (cpuEl) cpuEl.textContent = `${resources.cpu} cores`;
    if (diskEl) diskEl.textContent = `${resources.disk} GB`;
  }

  /**
   * Update validation warnings display
   */
  updateValidationDisplay() {
    const conflicts = this.detectConflicts(this.selectedProfiles);
    const dependencyWarnings = this.validateDependencies(this.selectedProfiles);
    
    const warningsContainer = document.getElementById('validation-warnings');
    if (!warningsContainer) return;
    
    // Show/hide container
    if (conflicts.length === 0 && dependencyWarnings.length === 0) {
      warningsContainer.style.display = 'none';
      return;
    }
    
    warningsContainer.style.display = 'block';
    
    let html = '';
    
    // Render conflicts
    if (conflicts.length > 0) {
      html += `<div class="warning-section conflict-warnings">`;
      html += `<h4><span class="warning-icon">⚠️</span> Profile Conflicts</h4>`;
      for (const conflict of conflicts) {
        html += `<div class="warning-item conflict">${conflict.message}</div>`;
      }
      html += `</div>`;
    }
    
    // Render dependency warnings
    if (dependencyWarnings.length > 0) {
      html += `<div class="warning-section dependency-warnings">`;
      html += `<h4><span class="warning-icon">ℹ️</span> Dependencies</h4>`;
      for (const warning of dependencyWarnings) {
        html += `<div class="warning-item dependency">${warning.message}</div>`;
      }
      html += `</div>`;
    }
    
    warningsContainer.innerHTML = html;
  }

  /**
   * Show removal warning for installed profiles
   */
  showRemovalWarning(profileId) {
    const profileName = this.getProfileInfo(profileId).name;
    showNotification(
      `Warning: ${profileName} is currently installed. Deselecting it will schedule it for removal.`,
      'warning'
    );
  }

  /**
   * Check if profile should be disabled
   */
  isProfileDisabled(profileId) {
    // In reconfiguration mode, don't disable anything
    // User should be able to change their selection
    return false;
  }

  /**
   * Get profile information
   */
  getProfileInfo(profileId) {
    // Try to get from loaded profile data
    if (this.profileData) {
      const profile = this.profileData.find(p => p.id === profileId);
      if (profile) {
        return {
          id: profile.id,
          name: profile.name || this.getProfileDisplayName(profileId),
          description: profile.description || '',
          icon: this.getProfileIcon(profileId),
          resources: PROFILE_RESOURCES[profileId] || { memory: 0, cpu: 0, disk: 0 }
        };
      }
    }
    
    // Fallback to internal helper
    return {
      id: profileId,
      name: this.getProfileDisplayName(profileId),
      description: this.getProfileDescription(profileId),
      icon: this.getProfileIcon(profileId),
      resources: PROFILE_RESOURCES[profileId] || { memory: 0, cpu: 0, disk: 0 }
    };
  }

  /**
   * Get display name for a profile
   */
  getProfileDisplayName(profileId) {
    const names = {
      'kaspa-node': 'Kaspa Node',
      'kaspa-archive-node': 'Archive Node',
      'kasia-app': 'Kasia',
      'k-social-app': 'K-Social',
      'kaspa-explorer-bundle': 'Kaspa Explorer',
      'kasia-indexer': 'Kasia Indexer',
      'k-indexer-bundle': 'K-Indexer',
      'kaspa-stratum': 'Kaspa Stratum'
    };
    return names[profileId] || profileId;
  }

  /**
   * Get description for a profile
   */
  getProfileDescription(profileId) {
    const descriptions = {
      'kaspa-node': 'Standard pruning Kaspa node',
      'kaspa-archive-node': 'Full history archive node',
      'kasia-app': 'Kasia messaging application',
      'k-social-app': 'K-Social application',
      'kaspa-explorer-bundle': 'Block explorer bundle',
      'kasia-indexer': 'Kasia indexer service',
      'k-indexer-bundle': 'K-Indexer bundle',
      'kaspa-stratum': 'Mining stratum server'
    };
    return descriptions[profileId] || '';
  }

  /**
   * Get icon for a profile
   */
  getProfileIcon(profileId) {
    const icons = {
      'kaspa-node': '🖥️',
      'kaspa-archive-node': '🗄️',
      'kasia-app': '💬',
      'k-social-app': '👥',
      'kaspa-explorer-bundle': '🔍',
      'kasia-indexer': '📊',
      'k-indexer-bundle': '📈',
      'kaspa-stratum': '⛏️'
    };
    return icons[profileId] || '📦';
  }

  /**
   * Fallback profile data if API unavailable
   */
  getFallbackProfileData() {
    return [
      { id: 'kaspa-node', name: 'Kaspa Node', description: 'Standard pruning Kaspa node' },
      { id: 'kasia-app', name: 'Kasia', description: 'Kasia messaging application' },
      { id: 'k-social-app', name: 'K-Social', description: 'K-Social application' },
      { id: 'kaspa-explorer-bundle', name: 'Kaspa Explorer', description: 'Block explorer bundle' },
      { id: 'kasia-indexer', name: 'Kasia Indexer', description: 'Kasia indexer service' },
      { id: 'k-indexer-bundle', name: 'K-Indexer', description: 'K-Indexer bundle' },
      { id: 'kaspa-archive-node', name: 'Archive Node', description: 'Full history archive node' },
      { id: 'kaspa-stratum', name: 'Kaspa Stratum', description: 'Mining stratum server' }
    ];
  }

  /**
   * Show custom setup picker (called from template-selection.js)
   */
  show() {
    const container = document.getElementById('custom-setup-container');
    const defaultGrid = document.getElementById('default-profile-grid');
    
    if (container) container.style.display = 'block';
    if (defaultGrid) defaultGrid.style.display = 'none';
    
    console.log('[CUSTOM-SETUP] Custom setup picker shown');
  }

  /**
   * Hide custom setup picker
   */
  hide() {
    const container = document.getElementById('custom-setup-container');
    const defaultGrid = document.getElementById('default-profile-grid');
    
    if (container) container.style.display = 'none';
    if (defaultGrid) defaultGrid.style.display = 'grid';
    
    console.log('[CUSTOM-SETUP] Custom setup picker hidden');
  }

  /**
   * Get selected profiles
   */
  getSelectedProfiles() {
    return [...this.selectedProfiles];
  }

  /**
   * Validate selection before proceeding
   */
  validateSelection() {
    if (this.selectedProfiles.length === 0) {
      showNotification('Please select at least one profile', 'warning');
      return false;
    }
    
    const conflicts = this.detectConflicts(this.selectedProfiles);
    if (conflicts.length > 0) {
      showNotification('Please resolve profile conflicts before continuing', 'error');
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const customSetup = new CustomSetupModule();
