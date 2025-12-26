/**
 * Profile Templates Module
 * Handles template operations, recommendations, and custom template management
 */
class ProfileTemplates {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category) {
    return this.profileManager.getAllTemplates().filter(template => 
      template.category === category
    );
  }

  /**
   * Get templates by use case
   */
  getTemplatesByUseCase(useCase) {
    return this.profileManager.getAllTemplates().filter(template => 
      template.useCase === useCase
    );
  }

  /**
   * Search templates by tags
   */
  searchTemplatesByTags(tags) {
    return this.profileManager.getAllTemplates().filter(template => 
      template.tags && template.tags.some(tag => tags.includes(tag))
    );
  }

  /**
   * Apply template configuration to base configuration
   */
  applyTemplate(templateId, baseConfig = {}) {
    const template = this.profileManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Merge template config with base config (template takes precedence)
    const mergedConfig = { ...baseConfig, ...template.config };

    // Apply developer mode if template specifies it
    if (template.developerMode) {
      return this.profileManager.applyDeveloperMode(mergedConfig, true);
    }

    return mergedConfig;
  }

  /**
   * Validate template configuration
   */
  validateTemplate(templateId) {
    const template = this.profileManager.getTemplate(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Validate that all profiles in template exist
    for (const profileId of template.profiles) {
      if (!this.profileManager.getProfile(profileId)) {
        errors.push(`Template references unknown profile: ${profileId}`);
      }
    }

    // Validate profile selection using existing validation
    if (errors.length === 0) {
      const ProfileValidation = require('./ProfileValidation');
      const validation = new ProfileValidation(this.profileManager);
      const profileValidation = validation.validateProfileSelection(template.profiles);
      
      if (!profileValidation.valid) {
        errors.push(...profileValidation.errors.map(e => e.message));
      }
      warnings.push(...profileValidation.warnings.map(w => w.message));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      template
    };
  }

  /**
   * Get template recommendations based on system resources and use case
   */
  getTemplateRecommendations(systemResources, useCase) {
    const templates = this.profileManager.getAllTemplates();
    const recommendations = [];

    for (const template of templates) {
      let score = 0;
      let suitability = 'suitable';
      const reasons = [];

      // Check resource compatibility
      if (systemResources.memory >= template.resources.recommendedMemory) {
        score += 3;
        reasons.push('Meets recommended memory requirements');
      } else if (systemResources.memory >= template.resources.minMemory) {
        score += 1;
        reasons.push('Meets minimum memory requirements');
      } else {
        suitability = 'insufficient';
        reasons.push(`Requires ${template.resources.minMemory}GB RAM (you have ${systemResources.memory}GB)`);
      }

      if (systemResources.cpu >= template.resources.recommendedCpu) {
        score += 2;
      } else if (systemResources.cpu >= template.resources.minCpu) {
        score += 1;
      }

      if (systemResources.disk >= template.resources.recommendedDisk) {
        score += 2;
      } else if (systemResources.disk >= template.resources.minDisk) {
        score += 1;
      }

      // Use case matching
      if (template.useCase === useCase) {
        score += 5;
        reasons.push('Perfect match for your use case');
      }

      // Category bonus for beginners
      if (useCase === 'personal' && template.category === 'beginner') {
        score += 2;
        reasons.push('Beginner-friendly');
      }

      recommendations.push({
        template,
        score,
        suitability,
        reasons,
        recommended: score >= 5 && suitability === 'suitable'
      });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Create custom template from current configuration
   */
  createCustomTemplate(templateData) {
    const { id, name, description, profiles, config, metadata = {} } = templateData;

    // Validate required fields
    if (!id || !name || !description || !profiles || !config) {
      throw new Error('Missing required template fields: id, name, description, profiles, config');
    }

    // Validate profiles exist
    for (const profileId of profiles) {
      if (!this.profileManager.getProfile(profileId)) {
        throw new Error(`Unknown profile: ${profileId}`);
      }
    }

    // Calculate resources
    const ProfileValidation = require('./ProfileValidation');
    const validation = new ProfileValidation(this.profileManager);
    const resources = validation.calculateResourceRequirements(profiles);

    const template = {
      id,
      name,
      description,
      longDescription: metadata.longDescription || description,
      profiles,
      category: metadata.category || 'custom',
      useCase: metadata.useCase || 'custom',
      estimatedSetupTime: metadata.estimatedSetupTime || 'Variable',
      syncTime: metadata.syncTime || 'Variable',
      icon: metadata.icon || '⚙️',
      config,
      resources: {
        minMemory: resources.minMemory,
        minCpu: resources.minCpu,
        minDisk: resources.minDisk,
        recommendedMemory: resources.recommendedMemory,
        recommendedCpu: resources.recommendedCpu,
        recommendedDisk: resources.recommendedDisk
      },
      features: metadata.features || [],
      benefits: metadata.benefits || [],
      customizable: true,
      custom: true,
      createdAt: new Date().toISOString(),
      tags: metadata.tags || ['custom']
    };

    return template;
  }

  /**
   * Save custom template (in a real implementation, this would persist to storage)
   */
  saveCustomTemplate(template) {
    if (!template.id) {
      throw new Error('Template must have an ID');
    }

    // In a real implementation, this would save to a file or database
    // For now, we'll just add it to the in-memory templates
    this.profileManager.templates[template.id] = template;
    return true;
  }

  /**
   * Delete custom template
   */
  deleteCustomTemplate(templateId) {
    const template = this.profileManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    if (!template.custom) {
      throw new Error('Cannot delete built-in templates');
    }

    delete this.profileManager.templates[templateId];
    return true;
  }
}

module.exports = ProfileTemplates;