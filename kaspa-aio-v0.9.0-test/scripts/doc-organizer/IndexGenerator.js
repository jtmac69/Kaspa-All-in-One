/**
 * IndexGenerator - Generates a master documentation index
 * 
 * This class creates a comprehensive index of all documentation files,
 * organized by category with descriptions and links.
 */

const fs = require('fs');
const path = require('path');
const { FileCategory } = require('./FileCategorizer.js');

/**
 * Documentation file metadata
 * @typedef {Object} DocumentationFile
 * @property {string} filename - The name of the file
 * @property {string} path - The relative path to the file
 * @property {string} category - The FileCategory enum value
 * @property {string} description - Brief description of the file's purpose
 * @property {Date} lastModified - Last modification date
 */

/**
 * IndexGenerator class
 */
class IndexGenerator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.includeTimestamps = options.includeTimestamps !== false; // Default true
    
    // Category display names and descriptions
    this.categoryInfo = {
      [FileCategory.ESSENTIAL_ROOT]: {
        name: 'Essential Documentation',
        description: 'Core project documentation files'
      },
      [FileCategory.SPEC_TASK]: {
        name: 'Spec Task Files',
        description: 'Task tracking documents for feature specifications'
      },
      [FileCategory.IMPLEMENTATION_WIZARD]: {
        name: 'Wizard Implementation',
        description: 'Documentation for the web installation wizard'
      },
      [FileCategory.IMPLEMENTATION_DASHBOARD]: {
        name: 'Dashboard Implementation',
        description: 'Documentation for the dashboard features'
      },
      [FileCategory.IMPLEMENTATION_TESTING]: {
        name: 'Testing Implementation',
        description: 'Documentation for testing frameworks and strategies'
      },
      [FileCategory.IMPLEMENTATION_ROLLBACK]: {
        name: 'Rollback Implementation',
        description: 'Documentation for rollback and recovery features'
      },
      [FileCategory.IMPLEMENTATION_INTEGRATIONS]: {
        name: 'Service Integrations',
        description: 'Documentation for external service integrations'
      },
      [FileCategory.IMPLEMENTATION_INFRASTRUCTURE]: {
        name: 'Infrastructure',
        description: 'Documentation for infrastructure changes and setup'
      },
      [FileCategory.IMPLEMENTATION_TASKS]: {
        name: 'Task Completion Summaries',
        description: 'Individual task implementation summaries'
      },
      [FileCategory.WORK_LOG]: {
        name: 'Work Session Logs',
        description: 'Historical work session summaries'
      },
      [FileCategory.QUICK_REFERENCE]: {
        name: 'Quick Reference Guides',
        description: 'Fast-access guides and quick start documentation'
      },
      [FileCategory.UNKNOWN]: {
        name: 'Uncategorized',
        description: 'Files that do not match any category pattern'
      }
    };
  }

  /**
   * Extracts a description from file content
   * Looks for the first heading, paragraph, or summary
   * 
   * @param {string} content - The file content
   * @returns {string} Brief description of the file
   */
  extractDescription(content) {
    if (!content || content.trim().length === 0) {
      return 'No description available';
    }

    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for the first heading (# Title)
    for (const line of lines) {
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        const title = line.substring(2).trim();
        if (title.length > 0 && title.length < 200) {
          return title;
        }
      }
    }

    // Look for the first paragraph (non-heading, non-code)
    for (const line of lines) {
      if (!line.startsWith('#') && 
          !line.startsWith('```') && 
          !line.startsWith('-') && 
          !line.startsWith('*') &&
          !line.startsWith('>') &&
          line.length > 20) {
        // Truncate if too long
        if (line.length > 150) {
          return line.substring(0, 147) + '...';
        }
        return line;
      }
    }

    // Fallback: use first non-empty line
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.length > 150) {
        return firstLine.substring(0, 147) + '...';
      }
      return firstLine;
    }

    return 'No description available';
  }

  /**
   * Groups documentation files by category
   * 
   * @param {DocumentationFile[]} files - Array of documentation files
   * @returns {Map<string, DocumentationFile[]>} Map of category to files
   */
  groupByCategory(files) {
    const grouped = new Map();

    // Initialize all categories
    for (const category of Object.keys(this.categoryInfo)) {
      grouped.set(category, []);
    }

    // Group files by category
    for (const file of files) {
      const category = file.category || FileCategory.UNKNOWN;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category).push(file);
    }

    // Sort files within each category by filename
    for (const [category, categoryFiles] of grouped.entries()) {
      categoryFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    return grouped;
  }

  /**
   * Generates the master documentation index
   * 
   * @param {DocumentationFile[]} files - Array of documentation files
   * @returns {string} Markdown content for the index
   */
  generateIndex(files) {
    const grouped = this.groupByCategory(files);
    const timestamp = new Date().toISOString().split('T')[0];
    
    let markdown = '# Documentation Index\n\n';
    markdown += `*Last updated: ${timestamp}*\n\n`;
    markdown += 'This index provides a comprehensive overview of all documentation files in the repository, organized by category.\n\n';
    markdown += '## Table of Contents\n\n';

    // Generate table of contents
    for (const [category, categoryFiles] of grouped.entries()) {
      if (categoryFiles.length > 0) {
        const info = this.categoryInfo[category];
        const anchor = info.name.toLowerCase().replace(/\s+/g, '-');
        markdown += `- [${info.name}](#${anchor}) (${categoryFiles.length} files)\n`;
      }
    }

    markdown += '\n---\n\n';

    // Generate sections for each category
    for (const [category, categoryFiles] of grouped.entries()) {
      if (categoryFiles.length === 0) {
        continue; // Skip empty categories
      }

      const info = this.categoryInfo[category];
      markdown += `## ${info.name}\n\n`;
      markdown += `*${info.description}*\n\n`;

      if (categoryFiles.length === 0) {
        markdown += '*No files in this category*\n\n';
        continue;
      }

      // List files in this category
      for (const file of categoryFiles) {
        markdown += `### ${file.filename}\n\n`;
        markdown += `**Path:** \`${file.path}\`\n\n`;
        markdown += `**Description:** ${file.description}\n\n`;
        
        if (this.includeTimestamps && file.lastModified) {
          const dateStr = file.lastModified.toISOString().split('T')[0];
          markdown += `**Last Modified:** ${dateStr}\n\n`;
        }

        markdown += `[View File](${file.path})\n\n`;
        markdown += '---\n\n';
      }
    }

    // Add footer
    markdown += '## About This Index\n\n';
    markdown += 'This index is automatically generated to help navigate the documentation. ';
    markdown += 'Files are organized by category based on their naming patterns and content.\n\n';
    markdown += '### Categories\n\n';
    
    for (const [category, info] of Object.entries(this.categoryInfo)) {
      markdown += `- **${info.name}**: ${info.description}\n`;
    }

    return markdown;
  }

  /**
   * Reads file metadata from the filesystem
   * 
   * @param {string} filePath - Path to the file
   * @returns {Object} Object with content and lastModified
   */
  readFileMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      return {
        content,
        lastModified: stats.mtime
      };
    } catch (error) {
      if (this.verbose) {
        console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
      }
      return {
        content: '',
        lastModified: new Date()
      };
    }
  }

  /**
   * Creates a DocumentationFile object from a file path and category
   * 
   * @param {string} filePath - Relative path to the file
   * @param {string} category - FileCategory enum value
   * @param {string} rootDir - Root directory for resolving absolute paths
   * @returns {DocumentationFile} Documentation file metadata
   */
  createDocumentationFile(filePath, category, rootDir = '.') {
    const filename = path.basename(filePath);
    const absolutePath = path.join(rootDir, filePath);
    const metadata = this.readFileMetadata(absolutePath);
    
    return {
      filename,
      path: filePath,
      category,
      description: this.extractDescription(metadata.content),
      lastModified: metadata.lastModified
    };
  }

  /**
   * Generates and writes the index to a file
   * 
   * @param {DocumentationFile[]} files - Array of documentation files
   * @param {string} outputPath - Path where the index should be written
   * @returns {boolean} True if successful
   */
  writeIndex(files, outputPath) {
    try {
      const indexContent = this.generateIndex(files);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, indexContent, 'utf8');
      
      if (this.verbose) {
        console.log(`Index written to: ${outputPath}`);
      }
      
      return true;
    } catch (error) {
      if (this.verbose) {
        console.error(`Error writing index: ${error.message}`);
      }
      return false;
    }
  }
}

// Export for use in other modules
module.exports = {
  IndexGenerator
};
