/**
 * Script to move TEST_RELEASE_TASKS.md to its spec directory
 */

const path = require('path');
const { FileMover } = require('./FileMover');

// Get repository root (two levels up from this script)
const repoRoot = path.join(__dirname, '..', '..');

// Define source and destination paths
const sourcePath = path.join(repoRoot, 'TEST_RELEASE_TASKS.md');
const destinationPath = path.join(repoRoot, '.kiro', 'specs', 'kaspa-all-in-one-project', 'TEST_RELEASE_TASKS.md');

// Create FileMover instance with backups enabled
const mover = new FileMover({
  createBackups: true,
  backupDir: path.join(repoRoot, '.backup'),
  verbose: true
});

console.log('Moving TEST_RELEASE_TASKS.md to spec directory...');
console.log(`Source: ${sourcePath}`);
console.log(`Destination: ${destinationPath}`);
console.log('');

// Move the file
const result = mover.moveFile(sourcePath, destinationPath);

if (result.success) {
  console.log('✓ File moved successfully');
  
  // Verify the move
  const verified = mover.verifyMove(sourcePath, destinationPath);
  if (verified) {
    console.log('✓ Move verified successfully');
  } else {
    console.error('✗ Move verification failed');
    process.exit(1);
  }
} else {
  console.error('✗ Failed to move file:', result.error);
  process.exit(1);
}
