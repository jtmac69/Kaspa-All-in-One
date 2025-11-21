#!/usr/bin/env node

/**
 * Rollback utility for documentation reorganization
 * 
 * This script provides rollback capability to restore files from backup
 * if the reorganization encounters errors or needs to be undone.
 */

const fs = require('fs');
const path = require('path');

/**
 * Rollback result
 * @typedef {Object} RollbackResult
 * @property {boolean} success - Whether rollback was successful
 * @property {number} filesRestored - Number of files restored
 * @property {string[]} errors - List of errors encountered
 */

class RollbackManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.verbose = options.verbose || false;
    this.backupDir = options.backupDir || path.join(this.rootDir, '.backup');
  }

  /**
   * Lists available backups
   * 
   * @returns {Array<{name: string, path: string, timestamp: Date}>}
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
      const backups = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('reorganize-')) {
          const backupPath = path.join(this.backupDir, entry.name);
          const stats = fs.statSync(backupPath);
          
          backups.push({
            name: entry.name,
            path: backupPath,
            timestamp: stats.mtime
          });
        }
      }

      // Sort by timestamp, newest first
      backups.sort((a, b) => b.timestamp - a.timestamp);

      return backups;
    } catch (error) {
      console.error(`Error listing backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Restores files from a backup
   * 
   * @param {string} backupPath - Path to the backup directory
   * @returns {RollbackResult}
   */
  rollback(backupPath) {
    const result = {
      success: false,
      filesRestored: 0,
      errors: []
    };

    try {
      if (!fs.existsSync(backupPath)) {
        result.errors.push(`Backup directory not found: ${backupPath}`);
        return result;
      }

      // Get list of files in backup
      const backupFiles = fs.readdirSync(backupPath);

      console.log(`Restoring ${backupFiles.length} files from backup...`);

      for (const filename of backupFiles) {
        try {
          const sourcePath = path.join(backupPath, filename);
          const destPath = path.join(this.rootDir, filename);

          // Check if it's a file
          const stats = fs.statSync(sourcePath);
          if (!stats.isFile()) {
            continue;
          }

          // Copy file back to root
          fs.copyFileSync(sourcePath, destPath);
          result.filesRestored++;

          if (this.verbose) {
            console.log(`Restored: ${filename}`);
          }
        } catch (error) {
          result.errors.push(`Failed to restore ${filename}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;

      console.log(`\nRestored ${result.filesRestored} files`);
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
      }

      return result;
    } catch (error) {
      result.errors.push(`Rollback failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Generates a detailed error report
   * 
   * @param {Object} reorganizationResult - Result from reorganization
   * @returns {string} Formatted error report
   */
  generateErrorReport(reorganizationResult) {
    let report = '# Documentation Reorganization Error Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n\n';
    report += `- Files scanned: ${reorganizationResult.filesScanned}\n`;
    report += `- Files moved: ${reorganizationResult.filesMoved}\n`;
    report += `- References updated: ${reorganizationResult.referencesUpdated}\n`;
    report += `- Errors: ${reorganizationResult.errors.length}\n`;
    report += `- Warnings: ${reorganizationResult.warnings.length}\n\n`;

    if (reorganizationResult.errors.length > 0) {
      report += '## Errors\n\n';
      reorganizationResult.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (reorganizationResult.warnings.length > 0) {
      report += '## Warnings\n\n';
      reorganizationResult.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    report += '## Recommendations\n\n';

    // Analyze errors and provide recommendations
    const hasPermissionErrors = reorganizationResult.errors.some(e => 
      e.includes('permission') || e.includes('EACCES')
    );
    const hasFileNotFoundErrors = reorganizationResult.errors.some(e => 
      e.includes('not found') || e.includes('ENOENT')
    );
    const hasReferenceErrors = reorganizationResult.errors.some(e => 
      e.includes('reference') || e.includes('link')
    );

    if (hasPermissionErrors) {
      report += '### Permission Issues\n\n';
      report += 'Some files could not be moved due to permission errors. ';
      report += 'Try running the script with appropriate permissions or check file ownership.\n\n';
    }

    if (hasFileNotFoundErrors) {
      report += '### Missing Files\n\n';
      report += 'Some files were not found during the reorganization. ';
      report += 'This may indicate files were deleted or moved manually during the process.\n\n';
    }

    if (hasReferenceErrors) {
      report += '### Reference Update Issues\n\n';
      report += 'Some references could not be updated. ';
      report += 'You may need to manually update these links in the affected files.\n\n';
    }

    report += '### Recovery Options\n\n';
    report += '1. **Rollback**: Use the rollback utility to restore files from backup\n';
    report += '   ```bash\n';
    report += '   node scripts/doc-organizer/rollback.js --latest\n';
    report += '   ```\n\n';
    report += '2. **Manual Fix**: Review the transaction log and manually fix specific issues\n\n';
    report += '3. **Retry**: Fix the underlying issues and run the reorganization again\n\n';

    return report;
  }

  /**
   * Writes error report to a file
   * 
   * @param {Object} reorganizationResult - Result from reorganization
   * @returns {string} Path to the error report file
   */
  writeErrorReport(reorganizationResult) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(this.backupDir, `error-report-${timestamp}.md`);

      const report = this.generateErrorReport(reorganizationResult);

      // Create backup directory if it doesn't exist
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, report, 'utf8');

      console.log(`\nError report written to: ${reportPath}`);

      return reportPath;
    } catch (error) {
      console.error(`Failed to write error report: ${error.message}`);
      return null;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const manager = new RollbackManager(options);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Reorganization Rollback Tool

Usage: node rollback.js [options]

Options:
  --list          List available backups
  --latest        Rollback to the latest backup
  --backup <path> Rollback to a specific backup
  --verbose, -v   Show detailed output
  --help, -h      Show this help message

Examples:
  node rollback.js --list                    # List backups
  node rollback.js --latest                  # Rollback to latest
  node rollback.js --backup .backup/reorganize-2024-11-21  # Specific backup
    `);
    process.exit(0);
  }

  if (args.includes('--list')) {
    const backups = manager.listBackups();
    
    if (backups.length === 0) {
      console.log('No backups found');
      process.exit(0);
    }

    console.log('Available backups:\n');
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   Path: ${backup.path}`);
      console.log(`   Date: ${backup.timestamp.toISOString()}\n`);
    });
    
    process.exit(0);
  }

  if (args.includes('--latest')) {
    const backups = manager.listBackups();
    
    if (backups.length === 0) {
      console.error('No backups found');
      process.exit(1);
    }

    const latest = backups[0];
    console.log(`Rolling back to: ${latest.name}`);
    console.log(`Created: ${latest.timestamp.toISOString()}\n`);

    const result = manager.rollback(latest.path);
    
    if (result.success) {
      console.log('\n✓ Rollback completed successfully');
      process.exit(0);
    } else {
      console.log('\n✗ Rollback completed with errors');
      result.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    }
  }

  const backupIndex = args.indexOf('--backup');
  if (backupIndex !== -1 && args[backupIndex + 1]) {
    const backupPath = args[backupIndex + 1];
    console.log(`Rolling back to: ${backupPath}\n`);

    const result = manager.rollback(backupPath);
    
    if (result.success) {
      console.log('\n✓ Rollback completed successfully');
      process.exit(0);
    } else {
      console.log('\n✗ Rollback completed with errors');
      result.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    }
  }

  console.log('No action specified. Use --help for usage information.');
  process.exit(1);
}

// Export for use in other modules
module.exports = {
  RollbackManager
};
