/**
 * ReferenceUpdater - Detects and updates references to moved files
 * 
 * This class scans markdown files for references to other files and updates
 * those references when files are moved to new locations.
 */

const fs = require('fs');
const path = require('path');

/**
 * Reference found in a markdown file
 * @typedef {Object} Reference
 * @property {string} sourceFile - The file containing the reference
 * @property {number} lineNumber - The line number where the reference was found
 * @property {string} linkText - The display text of the link
 * @property {string} targetPath - The path being referenced
 * @property {string} fullMatch - The complete matched text
 * @property {string} type - The type of reference (markdown, inline, etc.)
 */

/**
 * Result of link verification
 * @typedef {Object} LinkVerificationResult
 * @property {number} totalLinks - Total number of links checked
 * @property {Reference[]} brokenLinks - Array of broken link references
 * @property {number} fixedLinks - Number of links that were fixed
 */

/**
 * ReferenceUpdater class
 */
class ReferenceUpdater {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    // Patterns for detecting different types of references
    this.referencePatterns = [
      // Markdown links: [text](path/to/file.md)
      {
        name: 'markdown',
        regex: /\[([^\]]+)\]\(([^)]+\.md)\)/g,
        linkTextGroup: 1,
        pathGroup: 2
      },
      // Inline code references: `path/to/file.md`
      {
        name: 'inline-code',
        regex: /`([^`]+\.md)`/g,
        linkTextGroup: null,
        pathGroup: 1
      },
      // Documentation references: "See FILE.md" or "See file.md"
      {
        name: 'see-reference',
        regex: /(?:See|see)\s+`?([A-Za-z0-9_-]+\.md)`?/g,
        linkTextGroup: null,
        pathGroup: 1
      }
    ];
  }

  /**
   * Finds all references to a target file in markdown files
   * 
   * @param {string} targetFile - The filename to search for (e.g., "TEST_RELEASE_TASKS.md")
   * @param {string[]} searchDirs - Directories to search in (defaults to root and docs)
   * @returns {Reference[]} Array of references found
   */
  findReferences(targetFile, searchDirs = null) {
    const references = [];
    
    // Default search directories
    if (!searchDirs) {
      searchDirs = [
        this.rootDir,
        path.join(this.rootDir, 'docs'),
        path.join(this.rootDir, '.kiro')
      ];
    }

    // Get all markdown files in search directories
    const markdownFiles = this._findMarkdownFiles(searchDirs);

    // Search each file for references
    for (const filePath of markdownFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileReferences = this._findReferencesInContent(
          content,
          filePath,
          targetFile
        );
        references.push(...fileReferences);
      } catch (error) {
        if (this.verbose) {
          console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
        }
      }
    }

    return references;
  }

  /**
   * Finds references in file content
   * 
   * @private
   * @param {string} content - The file content to search
   * @param {string} sourceFile - The file being searched
   * @param {string} targetFile - The filename to search for
   * @returns {Reference[]} Array of references found
   */
  _findReferencesInContent(content, sourceFile, targetFile) {
    const references = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // Try each reference pattern
      for (const pattern of this.referencePatterns) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const referencedPath = match[pattern.pathGroup];
          
          // Skip external URLs
          if (referencedPath.startsWith('http://') || 
              referencedPath.startsWith('https://') ||
              referencedPath.startsWith('#')) {
            continue;
          }
          
          // Check if this reference points to our target file
          if (this._pathMatchesTarget(referencedPath, targetFile)) {
            references.push({
              sourceFile,
              lineNumber: lineIndex + 1,
              linkText: pattern.linkTextGroup ? match[pattern.linkTextGroup] : null,
              targetPath: referencedPath,
              fullMatch: match[0],
              type: pattern.name
            });
          }
        }
      }
    }

    return references;
  }

  /**
   * Checks if a referenced path matches the target file
   * 
   * @private
   * @param {string} referencedPath - The path from the reference
   * @param {string} targetFile - The target filename
   * @returns {boolean} True if the path references the target file
   */
  _pathMatchesTarget(referencedPath, targetFile) {
    // Extract just the filename from the referenced path
    const referencedFilename = path.basename(referencedPath);
    const targetFilename = path.basename(targetFile);
    
    return referencedFilename === targetFilename;
  }

  /**
   * Updates a reference to point to a new path
   * 
   * @param {Reference} reference - The reference to update
   * @param {string} newPath - The new path for the reference
   * @returns {boolean} True if update was successful
   */
  updateReference(reference, newPath) {
    try {
      // Read the source file
      const content = fs.readFileSync(reference.sourceFile, 'utf8');
      const lines = content.split('\n');
      
      // Get the line containing the reference
      const lineIndex = reference.lineNumber - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) {
        throw new Error(`Invalid line number: ${reference.lineNumber}`);
      }

      let line = lines[lineIndex];
      
      // Calculate relative path from source file to new location
      const sourceDir = path.dirname(reference.sourceFile);
      const relativePath = path.relative(sourceDir, newPath);
      
      // Replace the old path with the new relative path
      // Preserve the link text and format
      let updatedLine;
      
      switch (reference.type) {
        case 'markdown':
          // [text](oldPath) -> [text](newPath)
          updatedLine = line.replace(
            reference.fullMatch,
            `[${reference.linkText}](${relativePath})`
          );
          break;
          
        case 'inline-code':
          // `oldPath` -> `newPath`
          updatedLine = line.replace(
            reference.fullMatch,
            `\`${relativePath}\``
          );
          break;
          
        case 'see-reference':
          // See `FILE.md` -> See `relativePath`
          updatedLine = line.replace(
            reference.fullMatch,
            reference.fullMatch.replace(reference.targetPath, relativePath)
          );
          break;
          
        default:
          throw new Error(`Unknown reference type: ${reference.type}`);
      }

      if (this.dryRun) {
        if (this.verbose) {
          console.log(`[DRY RUN] Would update ${reference.sourceFile}:${reference.lineNumber}`);
          console.log(`  Old: ${line}`);
          console.log(`  New: ${updatedLine}`);
        }
        return true;
      }

      // Update the line
      lines[lineIndex] = updatedLine;
      
      // Write back to file
      const updatedContent = lines.join('\n');
      fs.writeFileSync(reference.sourceFile, updatedContent, 'utf8');
      
      if (this.verbose) {
        console.log(`Updated reference in ${reference.sourceFile}:${reference.lineNumber}`);
      }
      
      return true;

    } catch (error) {
      if (this.verbose) {
        console.error(`Failed to update reference: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Updates all references to a file that has been moved
   * 
   * @param {string} oldPath - The original path of the file
   * @param {string} newPath - The new path of the file
   * @returns {number} Number of references updated
   */
  updateAllReferences(oldPath, newPath) {
    const filename = path.basename(oldPath);
    const references = this.findReferences(filename);
    
    let updatedCount = 0;
    for (const reference of references) {
      if (this.updateReference(reference, newPath)) {
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  /**
   * Verifies that no broken links remain after reorganization
   * 
   * @param {string[]} searchDirs - Directories to search (optional)
   * @returns {LinkVerificationResult} Verification result
   */
  verifyNoDeadLinks(searchDirs = null) {
    const result = {
      totalLinks: 0,
      brokenLinks: [],
      fixedLinks: 0
    };

    // Default search directories
    if (!searchDirs) {
      searchDirs = [
        this.rootDir,
        path.join(this.rootDir, 'docs'),
        path.join(this.rootDir, '.kiro')
      ];
    }

    // Get all markdown files
    const markdownFiles = this._findMarkdownFiles(searchDirs);

    // Check each file for broken links
    for (const filePath of markdownFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          
          // Check each reference pattern
          for (const pattern of this.referencePatterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;

            while ((match = regex.exec(line)) !== null) {
              result.totalLinks++;
              
              const referencedPath = match[pattern.pathGroup];
              
              // Skip external URLs
              if (referencedPath.startsWith('http://') || 
                  referencedPath.startsWith('https://') ||
                  referencedPath.startsWith('#')) {
                continue;
              }

              // Resolve the referenced path relative to the source file
              const sourceDir = path.dirname(filePath);
              const absolutePath = path.resolve(sourceDir, referencedPath);

              // Check if the referenced file exists
              if (!fs.existsSync(absolutePath)) {
                result.brokenLinks.push({
                  sourceFile: filePath,
                  lineNumber: lineIndex + 1,
                  linkText: pattern.linkTextGroup ? match[pattern.linkTextGroup] : null,
                  targetPath: referencedPath,
                  fullMatch: match[0],
                  type: pattern.name
                });
              }
            }
          }
        }
      } catch (error) {
        if (this.verbose) {
          console.warn(`Warning: Could not verify links in ${filePath}: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Finds all markdown files in given directories
   * 
   * @private
   * @param {string[]} directories - Directories to search
   * @returns {string[]} Array of markdown file paths
   */
  _findMarkdownFiles(directories) {
    const markdownFiles = [];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        continue;
      }

      this._findMarkdownFilesRecursive(dir, markdownFiles);
    }

    return markdownFiles;
  }

  /**
   * Recursively finds markdown files in a directory
   * 
   * @private
   * @param {string} dir - Directory to search
   * @param {string[]} results - Array to accumulate results
   */
  _findMarkdownFilesRecursive(dir, results) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and hidden directories (except .kiro)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || 
              (entry.name.startsWith('.') && entry.name !== '.kiro')) {
            continue;
          }
          this._findMarkdownFilesRecursive(fullPath, results);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
      }
    }
  }
}

// Export for use in other modules
module.exports = {
  ReferenceUpdater
};
