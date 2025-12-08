#!/usr/bin/env node

/**
 * Documentation Reorganization Orchestrator
 * 
 * This script orchestrates the complete reorganization of documentation files:
 * 1. Creates backup of all files
 * 2. Scans root directory for markdown files
 * 3. Categorizes each file
 * 4. Moves files to appropriate locations
 * 5. Updates all references
 * 6. Generates documentation index
 * 7. Creates transaction log
 */

const fs = require('fs');
const path = require('path');
const { FileCategorizer, FileCategory } = require('./FileCategorizer.js');
const { FileMover } = require('./FileMover.js');
const { ReferenceUpdater } = require('./ReferenceUpdater.js');
const { IndexGenerator } = require('./IndexGenerator.js');
const { RollbackManager } = require('./rollback.js');

/**
 * Transaction log entry
 * @typedef {Object} TransactionEntry
 * @property {string} timestamp - ISO timestamp of the operation
 * @property {string} operation - Type of operation (move, update, create)
 * @property {string} file - File affected
 * @property {string} details - Additional details
 * @property {boolean} success - Whether operation succeeded
 * @property {string} [error] - Error message if failed
 */

/**
 * Reorganization result
 * @typedef {Object} ReorganizationResult
 * @property {boolean} success - Overall success status
 * @property {number} filesScanned - Number of files scanned
 * @property {number} filesMoved - Number of files successfully moved
 * @property {number} referencesUpdated - Number of references updated
 * @property {boolean} indexGenerated - Whether index was generated
 * @property {TransactionEntry[]} transactions - Log of all operations
 * @property {string[]} errors - List of errors encountered
 * @property {string[]} warnings - List of warnings
 */

class DocumentationReorganizer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.createBackups = options.createBackups !== false;
    
    // Initialize components
    this.categorizer = new FileCategorizer();
    this.mover = new FileMover({
      dryRun: this.dryRun,
      createBackups: this.createBackups,
      verbose: this.verbose
    });
    this.referenceUpdater = new ReferenceUpdater({
      rootDir: this.rootDir,
      dryRun: this.dryRun,
      verbose: this.verbose
    });
    this.indexGenerator = new IndexGenerator({
      verbose: this.verbose
    });
    this.rollbackManager = new RollbackManager({
      rootDir: this.rootDir,
      verbose: this.verbose
    });
    
    // Transaction log
    this.transactions = [];
    this.errors = [];
    this.warnings = [];
    this.backupPath = null;
  }

  /**
   * Logs a transaction
   * 
   * @param {string} operation - Type of operation
   * @param {string} file - File affected
   * @param {string} details - Additional details
   * @param {boolean} success - Whether operation succeeded
   * @param {string} [error] - Error message if failed
   */
  logTransaction(operation, file, details, success, error = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      operation,
      file,
      details,
      success
    };
    
    if (error) {
      entry.error = error;
    }
    
    this.transactions.push(entry);
    
    if (this.verbose) {
      const status = success ? '✓' : '✗';
      console.log(`${status} ${operation}: ${file} - ${details}`);
      if (error) {
        console.log(`  Error: ${error}`);
      }
    }
  }

  /**
   * Creates a backup of all markdown files before reorganization
   * 
   * @returns {boolean} True if backup was successful
   */
  createFullBackup() {
    if (this.dryRun) {
      this.logTransaction('backup', 'all files', 'Dry run - no backup created', true);
      return true;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.rootDir, '.backup', `reorganize-${timestamp}`);
      
      // Create backup directory
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Store backup path for potential rollback
      this.backupPath = backupDir;
      
      // Find all markdown files in root
      const markdownFiles = this._findRootMarkdownFiles();
      
      let backedUp = 0;
      for (const file of markdownFiles) {
        try {
          const sourcePath = path.join(this.rootDir, file);
          const destPath = path.join(backupDir, file);
          fs.copyFileSync(sourcePath, destPath);
          backedUp++;
        } catch (error) {
          this.warnings.push(`Could not backup ${file}: ${error.message}`);
        }
      }
      
      this.logTransaction('backup', backupDir, `Backed up ${backedUp} files`, true);
      console.log(`Backup created at: ${backupDir}`);
      return true;
      
    } catch (error) {
      this.errors.push(`Backup failed: ${error.message}`);
      this.logTransaction('backup', 'all files', 'Backup failed', false, error.message);
      return false;
    }
  }

  /**
   * Finds all markdown files in the root directory
   * 
   * @private
   * @returns {string[]} Array of markdown filenames
   */
  _findRootMarkdownFiles() {
    try {
      const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name);
    } catch (error) {
      this.errors.push(`Could not read root directory: ${error.message}`);
      return [];
    }
  }

  /**
   * Scans and categorizes all markdown files in root
   * 
   * @returns {Array<{filename: string, category: string, destinationPath: string}>}
   */
  scanAndCategorize() {
    const markdownFiles = this._findRootMarkdownFiles();
    const categorized = [];
    
    for (const filename of markdownFiles) {
      try {
        // Read file content for categorization
        const filePath = path.join(this.rootDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Categorize the file
        const result = this.categorizer.categorizeAndGetPath(filename, content);
        categorized.push(result);
        
        this.logTransaction('scan', filename, `Category: ${result.category}`, true);
        
      } catch (error) {
        this.warnings.push(`Could not categorize ${filename}: ${error.message}`);
        this.logTransaction('scan', filename, 'Categorization failed', false, error.message);
      }
    }
    
    return categorized;
  }

  /**
   * Moves files to their new locations
   * 
   * @param {Array} categorizedFiles - Array of categorized files
   * @returns {Array<{oldPath: string, newPath: string, success: boolean}>}
   */
  moveFiles(categorizedFiles) {
    const moveResults = [];
    
    for (const file of categorizedFiles) {
      // Skip essential root files (they stay at root)
      if (file.category === FileCategory.ESSENTIAL_ROOT) {
        this.logTransaction('move', file.filename, 'Stays at root (essential file)', true);
        continue;
      }
      
      // Skip if destination is same as source
      if (file.destinationPath === file.filename) {
        this.logTransaction('move', file.filename, 'Already in correct location', true);
        continue;
      }
      
      // Move the file
      const sourcePath = path.join(this.rootDir, file.filename);
      const destPath = path.join(this.rootDir, file.destinationPath);
      
      const result = this.mover.moveFile(sourcePath, destPath);
      moveResults.push({
        oldPath: file.filename,
        newPath: file.destinationPath,
        success: result.success
      });
      
      if (result.success) {
        this.logTransaction('move', file.filename, `Moved to ${file.destinationPath}`, true);
      } else {
        this.errors.push(`Failed to move ${file.filename}: ${result.error}`);
        this.logTransaction('move', file.filename, `Failed to move`, false, result.error);
      }
    }
    
    return moveResults;
  }

  /**
   * Updates all references to moved files
   * 
   * @param {Array} moveResults - Results from moveFiles
   * @returns {number} Number of references updated
   */
  updateReferences(moveResults) {
    let totalUpdated = 0;
    
    for (const move of moveResults) {
      if (!move.success) {
        continue; // Skip failed moves
      }
      
      try {
        const oldPath = path.join(this.rootDir, move.oldPath);
        const newPath = path.join(this.rootDir, move.newPath);
        
        const updated = this.referenceUpdater.updateAllReferences(oldPath, newPath);
        totalUpdated += updated;
        
        this.logTransaction(
          'update-refs',
          move.oldPath,
          `Updated ${updated} references`,
          true
        );
        
      } catch (error) {
        this.warnings.push(`Could not update references for ${move.oldPath}: ${error.message}`);
        this.logTransaction(
          'update-refs',
          move.oldPath,
          'Reference update failed',
          false,
          error.message
        );
      }
    }
    
    return totalUpdated;
  }

  /**
   * Generates the documentation index
   * 
   * @param {Array} categorizedFiles - Array of categorized files
   * @returns {boolean} True if index was generated successfully
   */
  generateIndex(categorizedFiles) {
    try {
      const documentationFiles = [];
      
      // Create DocumentationFile objects for all files
      for (const file of categorizedFiles) {
        const filePath = file.destinationPath || file.filename;
        const docFile = this.indexGenerator.createDocumentationFile(
          filePath,
          file.category,
          this.rootDir
        );
        documentationFiles.push(docFile);
      }
      
      // Generate and write the index
      const indexPath = path.join(this.rootDir, 'docs', 'DOCUMENTATION_INDEX.md');
      
      if (this.dryRun) {
        this.logTransaction('generate-index', indexPath, 'Dry run - index not created', true);
        return true;
      }
      
      const success = this.indexGenerator.writeIndex(documentationFiles, indexPath);
      
      if (success) {
        this.logTransaction('generate-index', indexPath, 'Index generated successfully', true);
      } else {
        this.errors.push('Failed to generate documentation index');
        this.logTransaction('generate-index', indexPath, 'Index generation failed', false);
      }
      
      return success;
      
    } catch (error) {
      this.errors.push(`Index generation error: ${error.message}`);
      this.logTransaction('generate-index', 'DOCUMENTATION_INDEX.md', 'Failed', false, error.message);
      return false;
    }
  }

  /**
   * Writes the transaction log to a file
   * 
   * @returns {boolean} True if log was written successfully
   */
  writeTransactionLog() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(this.rootDir, '.backup', `reorganize-log-${timestamp}.json`);
      
      const logData = {
        timestamp: new Date().toISOString(),
        dryRun: this.dryRun,
        transactions: this.transactions,
        errors: this.errors,
        warnings: this.warnings,
        summary: {
          totalTransactions: this.transactions.length,
          successfulTransactions: this.transactions.filter(t => t.success).length,
          failedTransactions: this.transactions.filter(t => !t.success).length,
          totalErrors: this.errors.length,
          totalWarnings: this.warnings.length
        }
      };
      
      if (this.dryRun) {
        console.log('\n=== DRY RUN TRANSACTION LOG ===');
        console.log(JSON.stringify(logData, null, 2));
        return true;
      }
      
      // Create backup directory if it doesn't exist
      const backupDir = path.dirname(logPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
      
      if (this.verbose) {
        console.log(`\nTransaction log written to: ${logPath}`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to write transaction log: ${error.message}`);
      return false;
    }
  }

  /**
   * Runs the complete reorganization process
   * 
   * @returns {ReorganizationResult}
   */
  async run() {
    console.log('=== Documentation Reorganization ===\n');
    
    if (this.dryRun) {
      console.log('*** DRY RUN MODE - No files will be modified ***\n');
    }
    
    const result = {
      success: false,
      filesScanned: 0,
      filesMoved: 0,
      referencesUpdated: 0,
      indexGenerated: false,
      transactions: [],
      errors: [],
      warnings: []
    };
    
    try {
      // Step 1: Create backup
      console.log('Step 1: Creating backup...');
      if (!this.createFullBackup()) {
        throw new Error('Backup failed - aborting reorganization');
      }
      
      // Step 2: Scan and categorize
      console.log('\nStep 2: Scanning and categorizing files...');
      const categorizedFiles = this.scanAndCategorize();
      result.filesScanned = categorizedFiles.length;
      console.log(`Found ${categorizedFiles.length} markdown files`);
      
      // Step 3: Move files
      console.log('\nStep 3: Moving files...');
      const moveResults = this.moveFiles(categorizedFiles);
      result.filesMoved = moveResults.filter(r => r.success).length;
      console.log(`Moved ${result.filesMoved} files`);
      
      // Step 4: Update references
      console.log('\nStep 4: Updating references...');
      result.referencesUpdated = this.updateReferences(moveResults);
      console.log(`Updated ${result.referencesUpdated} references`);
      
      // Step 5: Generate index
      console.log('\nStep 5: Generating documentation index...');
      result.indexGenerated = this.generateIndex(categorizedFiles);
      
      // Step 6: Write transaction log
      console.log('\nStep 6: Writing transaction log...');
      this.writeTransactionLog();
      
      // Compile results
      result.success = this.errors.length === 0;
      result.transactions = this.transactions;
      result.errors = this.errors;
      result.warnings = this.warnings;
      
      // Print summary
      console.log('\n=== Reorganization Summary ===');
      console.log(`Files scanned: ${result.filesScanned}`);
      console.log(`Files moved: ${result.filesMoved}`);
      console.log(`References updated: ${result.referencesUpdated}`);
      console.log(`Index generated: ${result.indexGenerated ? 'Yes' : 'No'}`);
      console.log(`Errors: ${result.errors.length}`);
      console.log(`Warnings: ${result.warnings.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n=== Errors ===');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('\n=== Warnings ===');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      if (result.success) {
        console.log('\n✓ Reorganization completed successfully!');
      } else {
        console.log('\n✗ Reorganization completed with errors');
        
        // Generate error report
        const reportPath = this.rollbackManager.writeErrorReport(result);
        
        if (this.backupPath) {
          console.log('\nTo rollback these changes, run:');
          console.log(`  node scripts/doc-organizer/rollback.js --backup ${this.backupPath}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`\n✗ Fatal error: ${error.message}`);
      result.success = false;
      result.errors.push(error.message);
      result.transactions = this.transactions;
      result.errors = this.errors;
      result.warnings = this.warnings;
      
      // Generate error report for fatal errors
      this.rollbackManager.writeErrorReport(result);
      
      if (this.backupPath) {
        console.log('\nA fatal error occurred. To rollback, run:');
        console.log(`  node scripts/doc-organizer/rollback.js --backup ${this.backupPath}`);
      }
      
      return result;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    createBackups: !args.includes('--no-backup')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Reorganization Tool

Usage: node reorganize.js [options]

Options:
  --dry-run       Run without making any changes
  --verbose, -v   Show detailed output
  --no-backup     Skip creating backups
  --help, -h      Show this help message

Examples:
  node reorganize.js --dry-run          # Preview changes
  node reorganize.js --verbose          # Run with detailed output
  node reorganize.js                    # Run reorganization
    `);
    process.exit(0);
  }
  
  const reorganizer = new DocumentationReorganizer(options);
  
  reorganizer.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

// Export for testing
module.exports = {
  DocumentationReorganizer
};
