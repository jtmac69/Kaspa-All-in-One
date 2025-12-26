/**
 * Profile Management System - Main Entry Point
 * 
 * This module provides a unified interface to all profile management functionality
 * by combining the focused modules into a single ProfileManager class.
 */

const ProfileManager = require('./ProfileManager');
const ProfileValidation = require('./ProfileValidation');
const ProfileTemplates = require('./ProfileTemplates');
const ProfileAddition = require('./ProfileAddition');
const ProfileRemoval = require('./ProfileRemoval');

/**
 * Enhanced ProfileManager that combines all profile management functionality
 */
class EnhancedProfileManager extends ProfileManager {
  constructor() {
    super();
    
    // Initialize specialized modules
    this.validation = new ProfileValidation(this);
    this.templates = new ProfileTemplates(this);
    this.addition = new ProfileAddition(this);
    this.removal = new ProfileRemoval(this);
  }

  // Validation methods
  calculateResourceRequirements(profileIds) {
    return this.validation.calculateResourceRequirements(profileIds);
  }

  detectConflicts(profileIds) {
    return this.validation.detectConflicts(profileIds);
  }

  detectCircularDependencies(profileIds) {
    return this.validation.detectCircularDependencies(profileIds);
  }

  validateProfileSelection(profileIds) {
    return this.validation.validateProfileSelection(profileIds);
  }

  // Template methods
  getTemplatesByCategory(category) {
    return this.templates.getTemplatesByCategory(category);
  }

  getTemplatesByUseCase(useCase) {
    return this.templates.getTemplatesByUseCase(useCase);
  }

  searchTemplatesByTags(tags) {
    return this.templates.searchTemplatesByTags(tags);
  }

  applyTemplate(templateId, baseConfig = {}) {
    return this.templates.applyTemplate(templateId, baseConfig);
  }

  validateTemplate(templateId) {
    return this.templates.validateTemplate(templateId);
  }

  getTemplateRecommendations(systemResources, useCase) {
    return this.templates.getTemplateRecommendations(systemResources, useCase);
  }

  createCustomTemplate(templateData) {
    return this.templates.createCustomTemplate(templateData);
  }

  saveCustomTemplate(template) {
    return this.templates.saveCustomTemplate(template);
  }

  deleteCustomTemplate(templateId) {
    return this.templates.deleteCustomTemplate(templateId);
  }

  // Addition methods
  async addProfile(profileId, options = {}) {
    return this.addition.addProfile(profileId, options);
  }

  async getIntegrationOptions(profileId, currentProfiles) {
    return this.addition.getIntegrationOptions(profileId, currentProfiles);
  }

  // Removal methods
  async removeProfile(profileId, options = {}) {
    return this.removal.removeProfile(profileId, options);
  }

  getProfileDataTypes(profileId) {
    return this.removal.getProfileDataTypes(profileId);
  }

  getProfileSpecificConfigKeys(profileId) {
    return this.removal.getProfileSpecificConfigKeys(profileId);
  }

  getPreservedDataInfo(profileId, removeData, dataOptions) {
    return this.removal.getPreservedDataInfo(profileId, removeData, dataOptions);
  }
}

module.exports = EnhancedProfileManager;