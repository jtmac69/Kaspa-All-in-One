/**
 * Field Visibility Resolver
 * 
 * Determines which configuration fields are visible/applicable
 * based on selected profiles and field properties.
 */

const { PROFILE_CONFIG_FIELDS } = require('../config/configuration-fields');

class FieldVisibilityResolver {
  constructor() {
    // Profile ID mapping (new → legacy for backward compatibility)
    this.profileIdMap = {
      'kaspa-node': 'core',
      'kaspa-archive-node': 'archive-node',
      'kaspa-stratum': 'mining',
      'kasia-app': 'kaspa-user-applications',
      'k-social-app': 'kaspa-user-applications',
      'kaspa-explorer-bundle': 'indexer-services',
      'kasia-indexer': 'indexer-services',
      'k-indexer-bundle': 'indexer-services'
    };
  }

  /**
   * Get visible fields for selected profiles
   * Excludes deprecated and removed fields
   * 
   * @param {string[]} selectedProfiles - Array of profile IDs
   * @param {Object} options - Filter options
   * @param {boolean} options.includeDeprecated - Include deprecated fields (default: false)
   * @param {boolean} options.includeFrontendOnly - Include frontend-only fields (default: true for UI, false for backend)
   * @returns {Object[]} Array of visible field definitions
   */
  getVisibleFields(selectedProfiles, options = {}) {
    const {
      includeDeprecated = false,
      includeFrontendOnly = true
    } = options;

    const visibleFields = [];
    const seenKeys = new Set();

    // Normalize profile IDs (handle both new and legacy)
    const normalizedProfiles = this._normalizeProfileIds(selectedProfiles);

    // Collect fields from common and profile-specific sections
    const fieldSources = [
      PROFILE_CONFIG_FIELDS.common || [],
      ...selectedProfiles.map(p => PROFILE_CONFIG_FIELDS[p] || [])
    ];

    for (const fields of fieldSources) {
      for (const field of fields) {
        // Skip if already seen
        if (seenKeys.has(field.key)) continue;

        // Skip deprecated/removed fields unless explicitly requested
        if (!includeDeprecated && (field.deprecated || field.removed)) {
          continue;
        }

        // Skip frontend-only fields for backend configuration
        if (!includeFrontendOnly && field.frontendOnly) {
          continue;
        }

        // Check if field is visible for any selected profile
        const fieldProfiles = [
          ...(field.visibleForProfiles || []),
          ...(field.legacyProfiles || [])
        ];

        const isVisible = fieldProfiles.length === 0 || 
          fieldProfiles.some(p => normalizedProfiles.includes(p));

        if (isVisible) {
          visibleFields.push(field);
          seenKeys.add(field.key);
        }
      }
    }

    return visibleFields;
  }

  /**
   * Get fields for backend configuration (excludes frontend-only and deprecated)
   * 
   * @param {string[]} selectedProfiles - Array of profile IDs
   * @returns {Object[]} Array of backend-relevant field definitions
   */
  getBackendFields(selectedProfiles) {
    return this.getVisibleFields(selectedProfiles, {
      includeDeprecated: false,
      includeFrontendOnly: false
    });
  }

  /**
   * Get fields for UI display (includes frontend-only, excludes deprecated)
   * 
   * @param {string[]} selectedProfiles - Array of profile IDs
   * @returns {Object[]} Array of UI-visible field definitions
   */
  getUIFields(selectedProfiles) {
    return this.getVisibleFields(selectedProfiles, {
      includeDeprecated: false,
      includeFrontendOnly: true
    });
  }

  /**
   * Check if a specific field should be included in backend config
   * 
   * @param {string} fieldKey - The field key
   * @param {string[]} selectedProfiles - Array of profile IDs
   * @returns {boolean}
   */
  isBackendField(fieldKey, selectedProfiles) {
    const backendFields = this.getBackendFields(selectedProfiles);
    return backendFields.some(f => f.key === fieldKey);
  }

  /**
   * Filter configuration object to include only backend-relevant fields
   * 
   * @param {Object} config - Full configuration object
   * @param {string[]} selectedProfiles - Array of profile IDs
   * @returns {Object} Filtered configuration
   */
  filterForBackend(config, selectedProfiles) {
    const backendFields = this.getBackendFields(selectedProfiles);
    const backendKeys = new Set(backendFields.map(f => f.key));

    const filtered = {};
    for (const [key, value] of Object.entries(config)) {
      if (backendKeys.has(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Normalize profile IDs (handle legacy mappings)
   * @private
   */
  _normalizeProfileIds(profiles) {
    const normalized = new Set();

    for (const profile of profiles) {
      normalized.add(profile);

      // Add legacy equivalent if exists
      const legacy = this.profileIdMap[profile];
      if (legacy) {
        normalized.add(legacy);
      }

      // Add new equivalent if this is a legacy ID
      for (const [newId, legacyId] of Object.entries(this.profileIdMap)) {
        if (legacyId === profile) {
          normalized.add(newId);
        }
      }
    }

    return Array.from(normalized);
  }

  /**
   * Get deprecated fields (for migration warnings)
   * @returns {Object[]} Array of deprecated field definitions
   */
  getDeprecatedFields() {
    const deprecated = [];
    const allFields = [
      ...(PROFILE_CONFIG_FIELDS.common || []),
      ...Object.values(PROFILE_CONFIG_FIELDS).flat()
    ];
    const seenKeys = new Set();

    for (const field of allFields) {
      if (!seenKeys.has(field.key) && field.deprecated) {
        deprecated.push(field);
        seenKeys.add(field.key);
      }
    }

    return deprecated;
  }
}

module.exports = FieldVisibilityResolver;
