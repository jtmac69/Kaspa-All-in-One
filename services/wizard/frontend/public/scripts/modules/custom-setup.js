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
      
      // Validate loaded data
      this.validateProfileData();
      
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
        console.log('[CUSTOM-SETUP] Loaded profile data from API:', 
          this.profileData.length, 'profiles');
        return;
      } else {
        throw new Error('Invalid profile data response');
      }
      
    } catch (error) {
      console.warn('[CUSTOM-SETUP] Failed to load profile data from API:', error.message);
      console.log('[CUSTOM-SETUP] Using fallback profile data');
      this.profileData = this.getFallbackProfileData();
      console.log('[CUSTOM-SETUP] Fallback data loaded:', 
        this.profileData.length, 'profiles');
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
   * Validate profile data completeness
   */
  validateProfileData() {
    const requiredFields = ['id', 'name', 'description', 'icon', 'category', 'resources'];
    const issues = [];
    
    this.profileData.forEach((profile, index) => {
      requiredFields.forEach(field => {
        if (!profile[field]) {
          issues.push(`Profile ${index} (${profile.id || 'unknown'}) missing field: ${field}`);
        }
      });
      
      // Validate resources object
      if (profile.resources) {
        const resourceFields = ['memory', 'disk', 'cpu'];
        resourceFields.forEach(resField => {
          if (typeof profile.resources[resField] !== 'number') {
            issues.push(`Profile ${profile.id} missing resource: ${resField}`);
          }
        });
      }
    });
    
    if (issues.length > 0) {
      console.warn('[CUSTOM-SETUP] Profile data validation issues:', issues);
      return false;
    }
    
    console.log('[CUSTOM-SETUP] Profile data validation passed');
    return true;
  }

  /**
   * Render the profile picker UI with robust element selection
   */
  renderProfilePicker() {
    console.log('[CUSTOM-SETUP] Rendering profile picker');
    
    // Try to find existing container
    let container = document.getElementById('custom-setup-container');
    
    if (!container) {
      // STRATEGY 1: Try to find step element with multiple approaches
      let stepElement = null;
      
      // Approach A: Direct ID lookup
      stepElement = document.getElementById('step-5');
      if (stepElement) {
        console.log('[CUSTOM-SETUP] Found step using ID: #step-5');
      }
      
      // Approach B: Data attribute
      if (!stepElement) {
        stepElement = document.querySelector('.wizard-step[data-step="5"]');
        if (stepElement) {
          console.log('[CUSTOM-SETUP] Found step using data attribute: [data-step="5"]');
        }
      }
      
      // Approach C: Class-based selection
      if (!stepElement) {
        stepElement = document.querySelector('.wizard-step.profiles-step');
        if (stepElement) {
          console.log('[CUSTOM-SETUP] Found step using class: .profiles-step');
        }
      }
      
      // ALL APPROACHES FAILED
      if (!stepElement) {
        console.error('[CUSTOM-SETUP] Cannot find profiles step element');
        console.error('[CUSTOM-SETUP] Tried: #step-5, [data-step="5"], .profiles-step');
        console.error('[CUSTOM-SETUP] Available wizard steps:', 
          document.querySelectorAll('.wizard-step').length);
        
        // Show user-friendly error
        this.showInitializationError();
        return;
      }
      
      console.log('[CUSTOM-SETUP] Found step element:', 
        stepElement.id || stepElement.className);
      
      // STRATEGY 2: Create and inject container
      container = document.createElement('div');
      container.id = 'custom-setup-container';
      container.className = 'custom-setup-container';
      container.style.display = 'none'; // Hidden by default
      
      // Find insertion point
      const stepContent = stepElement.querySelector('.step-content');
      const insertionPoint = stepContent || stepElement;
      
      if (!insertionPoint) {
        console.error('[CUSTOM-SETUP] Cannot find insertion point in step element');
        this.showInitializationError();
        return;
      }
      
      insertionPoint.appendChild(container);
      console.log('[CUSTOM-SETUP] Created and appended container to:', 
        insertionPoint.className);
    }
    
    // Build HTML for profile picker
    const html = this.buildProfilePickerHTML();
    container.innerHTML = html;
    
    // Update resource display
    this.updateResourceDisplay();
    
    // Update conflict/dependency warnings
    this.updateValidationDisplay();
    
    console.log('[CUSTOM-SETUP] Profile picker rendered successfully');
    console.log('[CUSTOM-SETUP] Profile count:', this.profileData.length);
  }

  /**
   * Show user-friendly initialization error
   */
  showInitializationError() {
    console.error('[CUSTOM-SETUP] Showing initialization error to user');
    
    const errorHTML = `
      <div class="custom-setup-error">
        <div class="error-icon">⚠️</div>
        <h3>Custom Setup Unavailable</h3>
        <p>Unable to initialize custom profile selection.</p>
        <p class="error-detail">The profiles step element could not be found in the DOM. This may be a configuration issue.</p>
        <div class="error-actions">
          <button class="btn-secondary" onclick="window.location.reload()">
            Reload Page
          </button>
          <button class="btn-tertiary" onclick="goToStep(4)">
            Back to Templates
          </button>
        </div>
      </div>
    `;
    
    // Try to display error somewhere visible
    const wizardContent = document.querySelector('.wizard-content') ||
                          document.querySelector('.wizard-container') ||
                          document.body;
    
    if (wizardContent) {
      const errorContainer = document.createElement('div');
      errorContainer.id = 'custom-setup-error-container';
      errorContainer.innerHTML = errorHTML;
      
      // Remove any existing error
      const existingError = document.getElementById('custom-setup-error-container');
      if (existingError) {
        existingError.remove();
      }
      
      wizardContent.prepend(errorContainer);
      console.log('[CUSTOM-SETUP] Error displayed to user');
    } else {
      console.error('[CUSTOM-SETUP] Cannot find element to display error');
    }
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
   * Get fallback profile data when API fails
   * This should match the backend ProfileManager definitions
   */
  getFallbackProfileData() {
    console.log('[CUSTOM-SETUP] Using fallback profile data');
    
    return [
      {
        id: 'kaspa-node',
        name: 'Kaspa Node',
        description: 'Core Kaspa blockchain node for network participation',
        icon: '🔷',
        category: 'Node',
        resources: {
          memory: 2,
          disk: 30,
          cpu: 2
        },
        dependencies: [],
        conflicts: ['kaspa-archive-node'],
        services: ['kaspad']
      },
      {
        id: 'kasia-app',
        name: 'Kasia App',
        description: 'User-friendly Kaspa wallet interface (desktop application)',
        icon: '💼',
        category: 'Applications',
        resources: {
          memory: 1,
          disk: 2,
          cpu: 1
        },
        dependencies: ['kaspa-node'],
        conflicts: [],
        services: ['kasia']
      },
      {
        id: 'k-social-app',
        name: 'K-Social App',
        description: 'Social features for Kaspa community engagement',
        icon: '👥',
        category: 'Applications',
        resources: {
          memory: 1,
          disk: 5,
          cpu: 1
        },
        dependencies: ['kaspa-node', 'k-indexer-bundle'],
        conflicts: [],
        services: ['k-social']
      },
      {
        id: 'kaspa-explorer-bundle',
        name: 'Kaspa Explorer',
        description: 'Blockchain explorer web interface with timescaledb backend',
        icon: '🔍',
        category: 'Infrastructure',
        resources: {
          memory: 2,
          disk: 20,
          cpu: 1
        },
        dependencies: ['kaspa-node'],
        conflicts: [],
        services: ['kaspa-explorer', 'timescaledb']
      },
      {
        id: 'kasia-indexer',
        name: 'Kasia Indexer',
        description: 'Transaction indexing service for Kasia wallet',
        icon: '📊',
        category: 'Infrastructure',
        resources: {
          memory: 2,
          disk: 50,
          cpu: 2
        },
        dependencies: ['kaspa-node'],
        conflicts: ['k-indexer-bundle'],
        services: ['kasia-indexer']
      },
      {
        id: 'k-indexer-bundle',
        name: 'K-Indexer Bundle',
        description: 'Advanced indexer with timescaledb for complex queries',
        icon: '📈',
        category: 'Infrastructure',
        resources: {
          memory: 4,
          disk: 100,
          cpu: 2
        },
        dependencies: ['kaspa-node'],
        conflicts: ['kasia-indexer'],
        services: ['k-indexer', 'timescaledb']
      },
      {
        id: 'kaspa-archive-node',
        name: 'Kaspa Archive Node',
        description: 'Full history archive node with complete blockchain data',
        icon: '📚',
        category: 'Node',
        resources: {
          memory: 8,
          disk: 500,
          cpu: 4
        },
        dependencies: [],
        conflicts: ['kaspa-node'],
        services: ['kaspad']
      },
      {
        id: 'kaspa-stratum',
        name: 'Kaspa Stratum',
        description: 'Mining pool stratum server for solo/pool mining',
        icon: '⛏️',
        category: 'Mining',
        resources: {
          memory: 1,
          disk: 5,
          cpu: 1
        },
        dependencies: ['kaspa-node'],
        conflicts: [],
        services: ['kaspa-stratum']
      }
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
