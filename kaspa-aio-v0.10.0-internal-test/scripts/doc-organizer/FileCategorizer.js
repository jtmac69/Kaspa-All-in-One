/**
 * FileCategorizer - Categorizes documentation files based on naming patterns
 * 
 * This class analyzes documentation files and determines their appropriate
 * category and destination path based on filename patterns.
 */

/**
 * Enum for file categories
 */
const FileCategory = {
  ESSENTIAL_ROOT: 'ESSENTIAL_ROOT',
  SPEC_TASK: 'SPEC_TASK',
  IMPLEMENTATION_WIZARD: 'IMPLEMENTATION_WIZARD',
  IMPLEMENTATION_DASHBOARD: 'IMPLEMENTATION_DASHBOARD',
  IMPLEMENTATION_TESTING: 'IMPLEMENTATION_TESTING',
  IMPLEMENTATION_ROLLBACK: 'IMPLEMENTATION_ROLLBACK',
  IMPLEMENTATION_INTEGRATIONS: 'IMPLEMENTATION_INTEGRATIONS',
  IMPLEMENTATION_INFRASTRUCTURE: 'IMPLEMENTATION_INFRASTRUCTURE',
  IMPLEMENTATION_TASKS: 'IMPLEMENTATION_TASKS',
  WORK_LOG: 'WORK_LOG',
  QUICK_REFERENCE: 'QUICK_REFERENCE',
  UNKNOWN: 'UNKNOWN'
};

/**
 * FileCategorizer class
 */
class FileCategorizer {
  constructor() {
    // Essential files that must remain at root
    this.essentialFiles = [
      'README.md',
      'CONTRIBUTING.md',
      'LICENSE',
      'QUICK_START.md'
    ];

    // Categorization patterns (order matters - more specific patterns first)
    this.patterns = [
      // Spec task files
      { regex: /^TEST_.*_TASKS\.md$/i, category: FileCategory.SPEC_TASK },
      
      // Quick references (must come before other patterns)
      { regex: /.*_QUICK_(REFERENCE|START)\.md$/i, category: FileCategory.QUICK_REFERENCE },
      
      // Work logs and session summaries
      { regex: /^(SESSION_SUMMARY|WORK_SUMMARY).*\.md$/i, category: FileCategory.WORK_LOG },
      
      // Wizard implementation
      { regex: /^WIZARD_.*\.md$/i, category: FileCategory.IMPLEMENTATION_WIZARD },
      
      // Dashboard implementation
      { regex: /^DASHBOARD_.*\.md$/i, category: FileCategory.IMPLEMENTATION_DASHBOARD },
      
      // Testing implementation
      { regex: /(^TESTING_|_TESTING_).*\.md$/i, category: FileCategory.IMPLEMENTATION_TESTING },
      { regex: /^.*_TESTING_IMPLEMENTATION\.md$/i, category: FileCategory.IMPLEMENTATION_TESTING },
      
      // Rollback implementation
      { regex: /^ROLLBACK_.*\.md$/i, category: FileCategory.IMPLEMENTATION_ROLLBACK },
      
      // Infrastructure (must come before integration patterns to avoid conflicts)
      { regex: /^(TIMESCALEDB|REMOTE_NODE)_.*\.md$/i, category: FileCategory.IMPLEMENTATION_INFRASTRUCTURE },
      
      // Integration summaries
      { regex: /^(K_SOCIAL|KASIA|SIMPLY_KASPA|KASPA_STRATUM)_.*\.md$/i, category: FileCategory.IMPLEMENTATION_INTEGRATIONS },
      { regex: /.*_INTEGRATION_.*\.md$/i, category: FileCategory.IMPLEMENTATION_INTEGRATIONS },
      
      // Task completion summaries
      { regex: /^TASK_\d+(\.\d+)*_.*\.md$/i, category: FileCategory.IMPLEMENTATION_TASKS }
    ];

    // Destination path mapping
    this.destinationPaths = {
      [FileCategory.ESSENTIAL_ROOT]: '',
      [FileCategory.SPEC_TASK]: '.kiro/specs/kaspa-all-in-one-project/',
      [FileCategory.IMPLEMENTATION_WIZARD]: 'docs/implementation-summaries/wizard/',
      [FileCategory.IMPLEMENTATION_DASHBOARD]: 'docs/implementation-summaries/dashboard/',
      [FileCategory.IMPLEMENTATION_TESTING]: 'docs/implementation-summaries/testing/',
      [FileCategory.IMPLEMENTATION_ROLLBACK]: 'docs/implementation-summaries/rollback/',
      [FileCategory.IMPLEMENTATION_INTEGRATIONS]: 'docs/implementation-summaries/integrations/',
      [FileCategory.IMPLEMENTATION_INFRASTRUCTURE]: 'docs/implementation-summaries/infrastructure/',
      [FileCategory.IMPLEMENTATION_TASKS]: 'docs/implementation-summaries/tasks/',
      [FileCategory.WORK_LOG]: 'docs/work-logs/',
      [FileCategory.QUICK_REFERENCE]: 'docs/quick-references/',
      [FileCategory.UNKNOWN]: 'docs/uncategorized/'
    };
  }

  /**
   * Categorizes a file based on its filename
   * 
   * @param {string} filename - The name of the file to categorize
   * @param {string} content - The content of the file (optional, for future use)
   * @returns {string} The FileCategory enum value
   */
  categorizeFile(filename, content = '') {
    // Check if it's an essential root file
    if (this.essentialFiles.includes(filename)) {
      return FileCategory.ESSENTIAL_ROOT;
    }

    // Check against patterns in order
    for (const pattern of this.patterns) {
      if (pattern.regex.test(filename)) {
        return pattern.category;
      }
    }

    // Unknown category
    return FileCategory.UNKNOWN;
  }

  /**
   * Gets the destination path for a file based on its category
   * 
   * @param {string} filename - The name of the file
   * @param {string} category - The FileCategory enum value
   * @returns {string} The destination path (relative to repository root)
   */
  getDestinationPath(filename, category) {
    const basePath = this.destinationPaths[category];
    
    if (basePath === undefined) {
      throw new Error(`Unknown category: ${category}`);
    }

    // For essential root files, return empty string (stay at root)
    if (category === FileCategory.ESSENTIAL_ROOT) {
      return '';
    }

    // Return the full destination path
    return basePath + filename;
  }

  /**
   * Categorizes a file and returns both category and destination path
   * 
   * @param {string} filename - The name of the file
   * @param {string} content - The content of the file (optional)
   * @returns {Object} Object with category and destinationPath properties
   */
  categorizeAndGetPath(filename, content = '') {
    const category = this.categorizeFile(filename, content);
    const destinationPath = this.getDestinationPath(filename, category);
    
    return {
      filename,
      category,
      destinationPath: destinationPath || filename // If empty, file stays at root
    };
  }
}

// Export for use in other modules
module.exports = {
  FileCategorizer,
  FileCategory
};
