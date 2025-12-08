/**
 * Field Visibility Resolver
 * 
 * Filters and organizes configuration fields based on selected profiles,
 * grouping them by category and section for UI display.
 */

const { PROFILE_CONFIG_FIELDS, FIELD_CATEGORIES, FIELD_GROUPS } = require('../config/configuration-fields');

class FieldVisibilityResolver {
  /**
   * Get all relevant configuration fields for selected profiles
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Organized fields by category and group
   */
  getVisibleFields(selectedProfiles) {
    if (!Array.isArray(selectedProfiles) || selectedProfiles.length === 0) {
      return this._getEmptyStructure();
    }

    // Collect all fields that should be visible
    const visibleFields = this._collectVisibleFields(selectedProfiles);

    // Organize fields by category and group
    const organized = this._organizeFields(visibleFields);

    return organized;
  }

  /**
   * Collect all fields that should be visible for selected profiles
   * @private
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of visible fields
   */
  _collectVisibleFields(selectedProfiles) {
    const fields = [];
    const seenKeys = new Set(); // Prevent duplicates

    // Add profile-specific fields
    for (const profileId of selectedProfiles) {
      const profileFields = PROFILE_CONFIG_FIELDS[profileId];
      if (profileFields) {
        for (const field of profileFields) {
          // Check if field should be visible for this profile
          if (this._isFieldVisible(field, selectedProfiles) && !seenKeys.has(field.key)) {
            fields.push({ ...field });
            seenKeys.add(field.key);
          }
        }
      }
    }

    // Add common fields
    const commonFields = PROFILE_CONFIG_FIELDS.common || [];
    for (const field of commonFields) {
      if (this._isFieldVisible(field, selectedProfiles) && !seenKeys.has(field.key)) {
        fields.push({ ...field });
        seenKeys.add(field.key);
      }
    }

    return fields;
  }

  /**
   * Check if a field should be visible for the selected profiles
   * @private
   * @param {Object} field - Field configuration
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {boolean} True if field should be visible
   */
  _isFieldVisible(field, selectedProfiles) {
    // If field has no visibility restrictions, it's always visible
    if (!field.visibleForProfiles || field.visibleForProfiles.length === 0) {
      return true;
    }

    // Check if any selected profile matches the field's visibility list
    return field.visibleForProfiles.some(profileId => 
      selectedProfiles.includes(profileId)
    );
  }

  /**
   * Organize fields by category and group
   * @private
   * @param {Object[]} fields - Array of fields to organize
   * @returns {Object} Organized structure
   */
  _organizeFields(fields) {
    const organized = {
      categories: {},
      metadata: {
        totalFields: fields.length,
        categories: Object.keys(FIELD_CATEGORIES),
        groups: Object.keys(FIELD_GROUPS)
      }
    };

    // Initialize categories
    for (const [categoryId, categoryInfo] of Object.entries(FIELD_CATEGORIES)) {
      organized.categories[categoryId] = {
        ...categoryInfo,
        groups: {},
        fieldCount: 0
      };
    }

    // Group fields by category and group
    for (const field of fields) {
      const categoryId = field.category || 'basic';
      const groupId = field.group || 'advanced';

      // Ensure category exists
      if (!organized.categories[categoryId]) {
        organized.categories[categoryId] = {
          id: categoryId,
          label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
          groups: {},
          fieldCount: 0
        };
      }

      // Ensure group exists within category
      if (!organized.categories[categoryId].groups[groupId]) {
        const groupInfo = FIELD_GROUPS[groupId] || {
          id: groupId,
          label: groupId.charAt(0).toUpperCase() + groupId.slice(1),
          order: 999
        };

        organized.categories[categoryId].groups[groupId] = {
          ...groupInfo,
          fields: []
        };
      }

      // Add field to group
      organized.categories[categoryId].groups[groupId].fields.push(field);
      organized.categories[categoryId].fieldCount++;
    }

    // Sort groups within each category by order
    for (const category of Object.values(organized.categories)) {
      const sortedGroups = {};
      const groupEntries = Object.entries(category.groups).sort(
        ([, a], [, b]) => (a.order || 999) - (b.order || 999)
      );
      
      for (const [groupId, groupData] of groupEntries) {
        sortedGroups[groupId] = groupData;
      }
      
      category.groups = sortedGroups;
    }

    return organized;
  }

  /**
   * Get fields filtered by category
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @param {string} category - Category to filter by (basic, advanced)
   * @returns {Object[]} Array of fields in the category
   */
  getFieldsByCategory(selectedProfiles, category) {
    const allFields = this._collectVisibleFields(selectedProfiles);
    return allFields.filter(field => field.category === category);
  }

  /**
   * Get fields filtered by group
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @param {string} group - Group to filter by (kaspa-node, database, network, etc.)
   * @returns {Object[]} Array of fields in the group
   */
  getFieldsByGroup(selectedProfiles, group) {
    const allFields = this._collectVisibleFields(selectedProfiles);
    return allFields.filter(field => field.group === group);
  }

  /**
   * Get a specific field by key
   * @param {string} key - Field key (environment variable name)
   * @returns {Object|null} Field configuration or null if not found
   */
  getFieldByKey(key) {
    // Search in all profile fields
    for (const profileFields of Object.values(PROFILE_CONFIG_FIELDS)) {
      if (Array.isArray(profileFields)) {
        const field = profileFields.find(f => f.key === key);
        if (field) {
          return { ...field };
        }
      }
    }
    return null;
  }

  /**
   * Get all fields for a specific profile
   * @param {string} profileId - Profile ID
   * @returns {Object[]} Array of fields for the profile
   */
  getFieldsForProfile(profileId) {
    const profileFields = PROFILE_CONFIG_FIELDS[profileId];
    if (!profileFields) {
      return [];
    }
    return profileFields.map(field => ({ ...field }));
  }

  /**
   * Check if a profile has any configuration fields
   * @param {string} profileId - Profile ID
   * @returns {boolean} True if profile has fields
   */
  hasFields(profileId) {
    const profileFields = PROFILE_CONFIG_FIELDS[profileId];
    return Array.isArray(profileFields) && profileFields.length > 0;
  }

  /**
   * Get empty structure for when no profiles are selected
   * @private
   * @returns {Object} Empty organized structure
   */
  _getEmptyStructure() {
    return {
      categories: {},
      metadata: {
        totalFields: 0,
        categories: [],
        groups: []
      }
    };
  }

  /**
   * Get field categories metadata
   * @returns {Object} Field categories information
   */
  getCategories() {
    return { ...FIELD_CATEGORIES };
  }

  /**
   * Get field groups metadata
   * @returns {Object} Field groups information
   */
  getGroups() {
    return { ...FIELD_GROUPS };
  }

  /**
   * Get summary of visible fields for selected profiles
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Summary information
   */
  getSummary(selectedProfiles) {
    const visibleFields = this._collectVisibleFields(selectedProfiles);
    const organized = this._organizeFields(visibleFields);

    const summary = {
      totalFields: visibleFields.length,
      requiredFields: visibleFields.filter(f => f.required).length,
      optionalFields: visibleFields.filter(f => !f.required).length,
      categories: {},
      groups: {}
    };

    // Count fields by category
    for (const [categoryId, category] of Object.entries(organized.categories)) {
      summary.categories[categoryId] = category.fieldCount;
    }

    // Count fields by group
    for (const category of Object.values(organized.categories)) {
      for (const [groupId, group] of Object.entries(category.groups)) {
        if (!summary.groups[groupId]) {
          summary.groups[groupId] = 0;
        }
        summary.groups[groupId] += group.fields.length;
      }
    }

    return summary;
  }
}

module.exports = FieldVisibilityResolver;
