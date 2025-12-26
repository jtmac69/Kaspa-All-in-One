/**
 * FileMover - Handles moving files to their new locations
 * 
 * This class provides functionality to move files, create directories,
 * verify moves, and create backups before moving files.
 */

const fs = require('fs');
const path = require('path');

/**
 * Result of a file move operation
 * @typedef {Object} MoveResult
 * @property {boolean} success - Whether the move was successful
 * @property {string} oldPath - The original file path
 * @property {string} newPath - The new file path
 * @property {string} [error] - Error message if move failed
 */

/**
 * FileMover class
 */
class FileMover {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.createBackups = options.createBackups !== false; // Default true
    this.backupDir = options.backupDir || '.backup';
    this.verbose = options.verbose || false;
  }

  /**
   * Creates a directory and all parent directories if they don't exist
   * 
   * @param {string} dirPath - The directory path to create
   * @throws {Error} If directory creation fails
   */
  createDirectory(dirPath) {
    if (this.dryRun) {
      if (this.verbose) {
        console.log(`[DRY RUN] Would create directory: ${dirPath}`);
      }
      return;
    }

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        if (this.verbose) {
          console.log(`Created directory: ${dirPath}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Creates a backup of a file before moving it
   * 
   * @param {string} sourcePath - The path of the file to backup
   * @returns {string} The path to the backup file
   * @throws {Error} If backup creation fails
   */
  createBackup(sourcePath) {
    if (!this.createBackups || this.dryRun) {
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.basename(sourcePath);
      const backupPath = path.join(this.backupDir, `${filename}.${timestamp}.bak`);
      
      // Create backup directory if it doesn't exist
      this.createDirectory(this.backupDir);
      
      // Copy file to backup location
      fs.copyFileSync(sourcePath, backupPath);
      
      if (this.verbose) {
        console.log(`Created backup: ${backupPath}`);
      }
      
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup of ${sourcePath}: ${error.message}`);
    }
  }

  /**
   * Moves a file from source to destination
   * 
   * @param {string} sourcePath - The current path of the file
   * @param {string} destinationPath - The new path for the file
   * @returns {MoveResult} Result object with success status and paths
   */
  moveFile(sourcePath, destinationPath) {
    const result = {
      success: false,
      oldPath: sourcePath,
      newPath: destinationPath
    };

    try {
      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        result.error = `Source file does not exist: ${sourcePath}`;
        return result;
      }

      // Check if source is a file (not a directory)
      const stats = fs.statSync(sourcePath);
      if (!stats.isFile()) {
        result.error = `Source is not a file: ${sourcePath}`;
        return result;
      }

      // If destination is the same as source, no move needed
      if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
        result.success = true;
        result.error = 'Source and destination are the same';
        return result;
      }

      // Check if destination already exists
      if (fs.existsSync(destinationPath)) {
        result.error = `Destination file already exists: ${destinationPath}`;
        return result;
      }

      if (this.dryRun) {
        if (this.verbose) {
          console.log(`[DRY RUN] Would move: ${sourcePath} -> ${destinationPath}`);
        }
        result.success = true;
        return result;
      }

      // Create backup before moving
      if (this.createBackups) {
        this.createBackup(sourcePath);
      }

      // Create destination directory if it doesn't exist
      const destDir = path.dirname(destinationPath);
      this.createDirectory(destDir);

      // Move the file
      fs.renameSync(sourcePath, destinationPath);

      if (this.verbose) {
        console.log(`Moved: ${sourcePath} -> ${destinationPath}`);
      }

      result.success = true;
      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Verifies that a file was successfully moved
   * 
   * @param {string} sourcePath - The original path of the file
   * @param {string} destinationPath - The new path of the file
   * @returns {boolean} True if file exists at destination and not at source
   */
  verifyMove(sourcePath, destinationPath) {
    try {
      // In dry run mode, we can't verify actual moves
      if (this.dryRun) {
        return true;
      }

      // Check that destination exists
      const destExists = fs.existsSync(destinationPath);
      
      // Check that source no longer exists
      const sourceExists = fs.existsSync(sourcePath);
      
      // Move is verified if destination exists and source doesn't
      return destExists && !sourceExists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Moves multiple files in batch
   * 
   * @param {Array<{source: string, destination: string}>} fileMappings - Array of file mappings
   * @returns {Array<MoveResult>} Array of move results
   */
  moveFiles(fileMappings) {
    const results = [];
    
    for (const mapping of fileMappings) {
      const result = this.moveFile(mapping.source, mapping.destination);
      results.push(result);
    }
    
    return results;
  }
}

// Export for use in other modules
module.exports = {
  FileMover
};
