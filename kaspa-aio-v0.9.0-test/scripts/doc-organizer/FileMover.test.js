/**
 * Unit tests for FileMover class
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { FileMover } = require('./FileMover');

// Test directory setup
const TEST_DIR = path.join(__dirname, '.test-file-mover');
const BACKUP_DIR = path.join(TEST_DIR, '.backup');

/**
 * Helper function to create test directory structure
 */
function setupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

/**
 * Helper function to clean up test directory
 */
function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

/**
 * Helper function to create a test file
 */
function createTestFile(filename, content = 'test content') {
  const filePath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('FileMover', () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('createDirectory', () => {
    test('should create a single directory', () => {
      const mover = new FileMover({ createBackups: false });
      const dirPath = path.join(TEST_DIR, 'new-dir');
      
      mover.createDirectory(dirPath);
      
      assert.strictEqual(fs.existsSync(dirPath), true);
      assert.strictEqual(fs.statSync(dirPath).isDirectory(), true);
    });

    test('should create nested directories', () => {
      const mover = new FileMover({ createBackups: false });
      const dirPath = path.join(TEST_DIR, 'level1', 'level2', 'level3');
      
      mover.createDirectory(dirPath);
      
      assert.strictEqual(fs.existsSync(dirPath), true);
      assert.strictEqual(fs.statSync(dirPath).isDirectory(), true);
    });

    test('should not throw error if directory already exists', () => {
      const mover = new FileMover({ createBackups: false });
      const dirPath = path.join(TEST_DIR, 'existing-dir');
      
      fs.mkdirSync(dirPath);
      
      assert.doesNotThrow(() => {
        mover.createDirectory(dirPath);
      });
    });

    test('should not create directory in dry run mode', () => {
      const mover = new FileMover({ dryRun: true, createBackups: false });
      const dirPath = path.join(TEST_DIR, 'dry-run-dir');
      
      mover.createDirectory(dirPath);
      
      assert.strictEqual(fs.existsSync(dirPath), false);
    });
  });

  describe('moveFile', () => {
    test('should successfully move a file', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('source.txt', 'test content');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.oldPath, sourcePath);
      assert.strictEqual(result.newPath, destPath);
      assert.strictEqual(fs.existsSync(destPath), true);
      assert.strictEqual(fs.existsSync(sourcePath), false);
      assert.strictEqual(fs.readFileSync(destPath, 'utf8'), 'test content');
    });

    test('should create destination directory if it does not exist', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('source.txt');
      const destPath = path.join(TEST_DIR, 'subdir', 'nested', 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(destPath), true);
      assert.strictEqual(fs.existsSync(path.dirname(destPath)), true);
    });

    test('should fail if source file does not exist', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = path.join(TEST_DIR, 'nonexistent.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('does not exist'));
    });

    test('should fail if destination already exists', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('source.txt');
      const destPath = createTestFile('dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('already exists'));
    });

    test('should handle source and destination being the same', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('same.txt');
      
      const result = mover.moveFile(sourcePath, sourcePath);
      
      assert.strictEqual(result.success, true);
      assert.ok(result.error.includes('same'));
      assert.strictEqual(fs.existsSync(sourcePath), true);
    });

    test('should fail if source is a directory', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = path.join(TEST_DIR, 'source-dir');
      fs.mkdirSync(sourcePath);
      const destPath = path.join(TEST_DIR, 'dest-dir');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('not a file'));
    });

    test('should create backup when createBackups is true', () => {
      const mover = new FileMover({ 
        createBackups: true, 
        backupDir: BACKUP_DIR 
      });
      const sourcePath = createTestFile('source.txt', 'backup test');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(BACKUP_DIR), true);
      
      // Check that a backup file was created
      const backupFiles = fs.readdirSync(BACKUP_DIR);
      assert.strictEqual(backupFiles.length, 1);
      assert.ok(backupFiles[0].startsWith('source.txt'));
      assert.ok(backupFiles[0].endsWith('.bak'));
      
      // Verify backup content
      const backupPath = path.join(BACKUP_DIR, backupFiles[0]);
      assert.strictEqual(fs.readFileSync(backupPath, 'utf8'), 'backup test');
    });

    test('should not create backup when createBackups is false', () => {
      const mover = new FileMover({ 
        createBackups: false, 
        backupDir: BACKUP_DIR 
      });
      const sourcePath = createTestFile('source.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(BACKUP_DIR), false);
    });

    test('should not move file in dry run mode', () => {
      const mover = new FileMover({ dryRun: true, createBackups: false });
      const sourcePath = createTestFile('source.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const result = mover.moveFile(sourcePath, destPath);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(sourcePath), true);
      assert.strictEqual(fs.existsSync(destPath), false);
    });
  });

  describe('verifyMove', () => {
    test('should return true when file exists at destination and not at source', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('source.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      mover.moveFile(sourcePath, destPath);
      const verified = mover.verifyMove(sourcePath, destPath);
      
      assert.strictEqual(verified, true);
    });

    test('should return false when file still exists at source', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = createTestFile('source.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const verified = mover.verifyMove(sourcePath, destPath);
      
      assert.strictEqual(verified, false);
    });

    test('should return false when file does not exist at destination', () => {
      const mover = new FileMover({ createBackups: false });
      const sourcePath = path.join(TEST_DIR, 'nonexistent-source.txt');
      const destPath = path.join(TEST_DIR, 'nonexistent-dest.txt');
      
      const verified = mover.verifyMove(sourcePath, destPath);
      
      assert.strictEqual(verified, false);
    });

    test('should return true in dry run mode', () => {
      const mover = new FileMover({ dryRun: true, createBackups: false });
      const sourcePath = path.join(TEST_DIR, 'source.txt');
      const destPath = path.join(TEST_DIR, 'dest.txt');
      
      const verified = mover.verifyMove(sourcePath, destPath);
      
      assert.strictEqual(verified, true);
    });
  });

  describe('moveFiles', () => {
    test('should move multiple files in batch', () => {
      const mover = new FileMover({ createBackups: false });
      const file1 = createTestFile('file1.txt', 'content 1');
      const file2 = createTestFile('file2.txt', 'content 2');
      const file3 = createTestFile('file3.txt', 'content 3');
      
      const mappings = [
        { source: file1, destination: path.join(TEST_DIR, 'dest1.txt') },
        { source: file2, destination: path.join(TEST_DIR, 'dest2.txt') },
        { source: file3, destination: path.join(TEST_DIR, 'dest3.txt') }
      ];
      
      const results = mover.moveFiles(mappings);
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].success, true);
      assert.strictEqual(results[1].success, true);
      assert.strictEqual(results[2].success, true);
      
      assert.strictEqual(fs.existsSync(mappings[0].destination), true);
      assert.strictEqual(fs.existsSync(mappings[1].destination), true);
      assert.strictEqual(fs.existsSync(mappings[2].destination), true);
    });

    test('should continue moving files even if one fails', () => {
      const mover = new FileMover({ createBackups: false });
      const file1 = createTestFile('file1.txt');
      const file3 = createTestFile('file3.txt');
      
      const mappings = [
        { source: file1, destination: path.join(TEST_DIR, 'dest1.txt') },
        { source: path.join(TEST_DIR, 'nonexistent.txt'), destination: path.join(TEST_DIR, 'dest2.txt') },
        { source: file3, destination: path.join(TEST_DIR, 'dest3.txt') }
      ];
      
      const results = mover.moveFiles(mappings);
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].success, true);
      assert.strictEqual(results[1].success, false);
      assert.strictEqual(results[2].success, true);
    });
  });
});
