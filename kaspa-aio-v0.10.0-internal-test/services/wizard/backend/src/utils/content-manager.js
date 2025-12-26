const fs = require('fs');
const path = require('path');

/**
 * Content Manager - Provides plain language content for the wizard
 */
class ContentManager {
  constructor() {
    this.content = this.loadContent();
  }

  /**
   * Load plain language content from JSON file
   */
  loadContent() {
    try {
      const contentPath = path.join(__dirname, '../data/plain-language-content.json');
      const contentData = fs.readFileSync(contentPath, 'utf8');
      return JSON.parse(contentData);
    } catch (error) {
      console.error('Failed to load plain language content:', error);
      return {
        profiles: {},
        errorMessages: {},
        progressSteps: {},
        glossary: {},
        helpText: {}
      };
    }
  }

  /**
   * Get profile description in plain language
   * @param {string} profileId - Profile identifier
   * @param {string} compatibilityRating - optional: optimal, recommended, possible, not-recommended
   * @returns {object} Plain language profile description
   */
  getProfileDescription(profileId, compatibilityRating = null) {
    const profile = this.content.profiles[profileId];
    if (!profile) {
      return null;
    }

    const description = {
      ...profile
    };

    // Add compatibility message if rating provided
    if (compatibilityRating && profile.compatibility) {
      description.compatibilityMessage = profile.compatibility[compatibilityRating];
    }

    return description;
  }

  /**
   * Get all profile descriptions
   * @returns {object} All profiles with plain language descriptions
   */
  getAllProfileDescriptions() {
    return this.content.profiles;
  }

  /**
   * Get error message in plain language
   * @param {string} errorType - Type of error
   * @param {object} context - Context data for error (e.g., {required: 8, available: 4})
   * @returns {object} Plain language error message
   */
  getErrorMessage(errorType, context = {}) {
    const error = this.content.errorMessages[errorType];
    if (!error) {
      return {
        title: 'Error',
        whatThisMeans: 'Something went wrong.',
        whyThisHappened: 'We encountered an unexpected error.',
        howToFix: ['Try again', 'If the problem persists, contact support']
      };
    }

    // Replace placeholders in error message with context data
    const processedError = {
      ...error,
      whatThisMeans: this.replacePlaceholders(error.whatThisMeans, context),
      whyThisHappened: this.replacePlaceholders(error.whyThisHappened, context),
      howToFix: error.howToFix.map(step => this.replacePlaceholders(step, context))
    };

    return processedError;
  }

  /**
   * Get progress step description
   * @param {string} stepId - Step identifier
   * @returns {object} Plain language progress description
   */
  getProgressStep(stepId) {
    return this.content.progressSteps[stepId] || {
      title: 'Processing...',
      description: 'Please wait...',
      whyThisTakesTime: null,
      whatsNext: null
    };
  }

  /**
   * Get glossary term definition
   * @param {string} term - Term to look up
   * @returns {object} Plain language definition
   */
  getGlossaryTerm(term) {
    const termKey = term.toLowerCase().replace(/\s+/g, '');
    return this.content.glossary[termKey] || null;
  }

  /**
   * Get all glossary terms
   * @returns {object} All glossary terms
   */
  getAllGlossaryTerms() {
    return this.content.glossary;
  }

  /**
   * Get help text
   * @param {string} helpId - Help text identifier
   * @returns {object} Help text content
   */
  getHelpText(helpId) {
    return this.content.helpText[helpId] || null;
  }

  /**
   * Replace placeholders in text with context data
   * @param {string} text - Text with placeholders like {required}
   * @param {object} context - Context data
   * @returns {string} Text with placeholders replaced
   */
  replacePlaceholders(text, context) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let result = text;
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    return result;
  }

  /**
   * Get profile recommendation based on system resources
   * @param {object} resources - System resources from resource checker
   * @returns {object} Recommendation with plain language explanation
   */
  getProfileRecommendation(resources) {
    const availableRAM = parseFloat(resources.memory.availableGB);
    const availableDisk = parseFloat(resources.disk.freeGB);

    let recommendedProfile;
    let reason;
    let alternatives = [];

    if (availableRAM < 2) {
      recommendedProfile = 'core-remote';
      reason = 'Your system has limited memory. This option uses very little resources.';
      alternatives = [];
    } else if (availableRAM < 8) {
      recommendedProfile = 'core-remote';
      reason = 'Your system has moderate memory. This option is reliable and doesn\'t need much.';
      alternatives = ['core-local'];
    } else if (availableRAM < 16) {
      recommendedProfile = 'core-local';
      reason = 'Your system has good memory. You can run your own node!';
      alternatives = ['explorer', 'mining'];
    } else if (availableRAM < 24) {
      recommendedProfile = 'explorer';
      reason = 'Your system has great memory. You can run indexing services!';
      alternatives = ['production', 'core-local'];
    } else {
      recommendedProfile = 'production';
      reason = 'Your system has excellent memory. You can run the full stack!';
      alternatives = ['archive', 'explorer'];
    }

    // Check disk space
    if (availableDisk < 100) {
      recommendedProfile = 'core-remote';
      reason = 'Your disk space is limited. This option needs very little space.';
      alternatives = [];
    }

    return {
      recommended: recommendedProfile,
      reason,
      alternatives,
      profileDescription: this.getProfileDescription(recommendedProfile)
    };
  }

  /**
   * Format resource requirements in plain language
   * @param {object} requirements - Resource requirements
   * @returns {object} Plain language requirements
   */
  formatResourceRequirements(requirements) {
    const formatMemory = (gb) => {
      if (gb < 1) return `${Math.round(gb * 1024)} MB of memory`;
      if (gb < 8) return `${gb} GB of memory (like a basic laptop)`;
      if (gb < 16) return `${gb} GB of memory (like a modern laptop)`;
      if (gb < 32) return `${gb} GB of memory (like a gaming PC)`;
      return `${gb} GB of memory (like a server)`;
    };

    const formatDisk = (gb) => {
      if (gb < 10) return `${gb} GB of space (just a few photos)`;
      if (gb < 100) return `${gb} GB of space (about ${Math.round(gb / 4)} photos)`;
      if (gb < 500) return `${gb} GB of space (about ${Math.round(gb / 4 / 1000)} thousand photos)`;
      return `${gb} GB of space (${Math.round(gb / 1000)} TB - lots of room!)`;
    };

    const formatCPU = (cores) => {
      if (cores === 1) return '1 processor core (even old computers work)';
      if (cores === 2) return '2 processor cores (most computers have this)';
      if (cores === 4) return '4 processor cores (modern computer)';
      return `${cores} processor cores (powerful computer)`;
    };

    return {
      memory: formatMemory(requirements.memory),
      disk: formatDisk(requirements.disk),
      cpu: formatCPU(requirements.cpu),
      memoryRaw: requirements.memory,
      diskRaw: requirements.disk,
      cpuRaw: requirements.cpu
    };
  }

  /**
   * Get compatibility message for a profile based on system resources
   * @param {string} profileId - Profile identifier
   * @param {object} resources - System resources
   * @returns {object} Compatibility information with plain language message
   */
  getProfileCompatibility(profileId, resources) {
    const profile = this.content.profiles[profileId];
    if (!profile) {
      return null;
    }

    // This would integrate with the resource checker
    // For now, return a placeholder
    return {
      profileId,
      compatible: true,
      rating: 'recommended',
      message: profile.compatibility.recommended
    };
  }
}

module.exports = ContentManager;
