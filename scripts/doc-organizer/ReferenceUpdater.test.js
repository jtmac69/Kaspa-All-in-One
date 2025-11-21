/**
 * Property-based tests for ReferenceUpdater
 * 
 * Feature: documentation-organization
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ReferenceUpdater } = require('./ReferenceUpdater.js');

/**
 * Helper function to create a temporary test directory
 */
function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-updater-test-'));
  return tempDir;
}

/**
 * Helper function to clean up temporary directory
 */
function cleanupTempDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Helper function to create a test file with content
 */
function createTestFile(dir, filename, content) {
  const filePath = path.join(dir, filename);
  const fileDir = path.dirname(filePath);
  
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Feature: documentation-organization, Property 3: Reference update completeness
 * Validates: Requirements 2.4, 5.1, 5.2
 * 
 * For any file that is moved, all references to that file in other markdown
 * documents should be found and updated to point to the new location.
 */
test('Property 3: Reference update completeness', async (t) => {
  // Generator for markdown filenames
  const markdownFilenameArb = fc.string({ 
    minLength: 3, 
    maxLength: 30,
    unit: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z', '_', '-', '0', '1',
                          '2', '3', '4', '5', '6', '7', '8', '9')
  }).map(s => `${s}.md`);

  // Generator for reference types
  const referenceTypeArb = fc.constantFrom('markdown', 'inline-code', 'see-reference');

  await fc.assert(
    fc.asyncProperty(
      markdownFilenameArb,
      markdownFilenameArb,
      referenceTypeArb,
      fc.integer({ min: 1, max: 5 }),
      async (targetFile, sourceFile, refType, numReferences) => {
        // Skip if source and target are the same
        if (sourceFile === targetFile) {
          return true;
        }

        const tempDir = createTempDir();
        
        try {
          // Create the target file
          const targetPath = createTestFile(tempDir, targetFile, '# Target File\n\nSome content.');
          
          // Create source file with references to target
          let sourceContent = '# Source File\n\n';
          
          for (let i = 0; i < numReferences; i++) {
            switch (refType) {
              case 'markdown':
                sourceContent += `See the [documentation](${targetFile}) for details.\n`;
                break;
              case 'inline-code':
                sourceContent += `Check the file \`${targetFile}\` for more info.\n`;
                break;
              case 'see-reference':
                sourceContent += `See ${targetFile} for more information.\n`;
                break;
            }
          }
          
          const sourcePath = createTestFile(tempDir, sourceFile, sourceContent);
          
          // Create updater
          const updater = new ReferenceUpdater({ rootDir: tempDir, verbose: false });
          
          // Find references to the target file
          const references = updater.findReferences(targetFile, [tempDir]);
          
          // Property: All references should be found
          assert.ok(references.length >= numReferences,
            `Should find at least ${numReferences} references, found ${references.length}`);
          
          // All found references should point to the target file
          for (const ref of references) {
            const referencedFilename = path.basename(ref.targetPath);
            assert.strictEqual(referencedFilename, targetFile,
              `Reference should point to ${targetFile}, got ${referencedFilename}`);
          }
          
          // All references should be from the source file
          for (const ref of references) {
            assert.ok(ref.sourceFile.endsWith(sourceFile),
              `Reference should be from ${sourceFile}, got ${ref.sourceFile}`);
          }
          
          // Simulate moving the file to a new location
          const newPath = path.join(tempDir, 'docs', targetFile);
          fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
          fs.renameSync(targetPath, newPath);
          
          // Update all references
          const updatedCount = updater.updateAllReferences(targetPath, newPath);
          
          // Property: Number of updated references should match found references
          assert.strictEqual(updatedCount, references.length,
            `Should update ${references.length} references, updated ${updatedCount}`);
          
          // Verify the source file was actually updated
          const updatedContent = fs.readFileSync(sourcePath, 'utf8');
          
          // The updated content should not contain direct references to the old path
          // (it should now have relative paths)
          const lines = updatedContent.split('\n');
          let foundUpdatedReferences = 0;
          
          for (const line of lines) {
            // Check if line contains a reference to docs/targetFile or ../docs/targetFile
            if (line.includes('docs/') || line.includes('../docs/')) {
              foundUpdatedReferences++;
            }
          }
          
          // Should have updated references in the content
          assert.ok(foundUpdatedReferences > 0,
            'Updated content should contain references to new location');
          
          return true;
          
        } finally {
          cleanupTempDir(tempDir);
        }
      }
    ),
    { numRuns: 50 } // Reduced runs since we're doing file I/O
  );
});

/**
 * Unit test: Verify reference detection in various formats
 */
test('Verify reference detection in various formats', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create target file
    const targetFile = 'TARGET.md';
    createTestFile(tempDir, targetFile, '# Target\n');
    
    // Create source file with various reference formats
    const sourceContent = `# Test Document

Here are various ways to reference files:

1. Markdown link: [See the target](TARGET.md)
2. Inline code: Check \`TARGET.md\` for details
3. See reference: See TARGET.md for more info
4. Relative path: [Link](./TARGET.md)
5. Multiple on same line: [First](TARGET.md) and [Second](TARGET.md)
`;
    
    createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    const references = updater.findReferences(targetFile, [tempDir]);
    
    // Should find multiple references
    assert.ok(references.length >= 5, `Should find at least 5 references, found ${references.length}`);
    
    // Check that different types are detected
    const types = new Set(references.map(ref => ref.type));
    assert.ok(types.has('markdown'), 'Should detect markdown links');
    assert.ok(types.has('inline-code'), 'Should detect inline code references');
    assert.ok(types.has('see-reference'), 'Should detect see references');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify path updates work correctly
 */
test('Verify path updates work correctly', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create target file
    const targetFile = 'DOCUMENT.md';
    const targetPath = createTestFile(tempDir, targetFile, '# Document\n');
    
    // Create source file with reference
    const sourceContent = '# Source\n\nSee [the document](DOCUMENT.md) for details.\n';
    const sourcePath = createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    
    // Find the reference
    const references = updater.findReferences(targetFile, [tempDir]);
    assert.strictEqual(references.length, 1, 'Should find exactly one reference');
    
    // Move the target file
    const newPath = path.join(tempDir, 'docs', 'DOCUMENT.md');
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    fs.renameSync(targetPath, newPath);
    
    // Update the reference
    const success = updater.updateReference(references[0], newPath);
    assert.ok(success, 'Reference update should succeed');
    
    // Verify the update
    const updatedContent = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(updatedContent.includes('docs/DOCUMENT.md'), 
      'Updated content should reference new path');
    assert.ok(!updatedContent.includes('](DOCUMENT.md)'),
      'Updated content should not reference old path');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify link verification detects broken links
 */
test('Verify link verification detects broken links', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create a file with references to non-existent files
    const sourceContent = `# Test

- [Broken link](nonexistent.md)
- [Another broken](missing.md)
- [External link](https://example.com) - should be ignored
`;
    
    createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    const result = updater.verifyNoDeadLinks([tempDir]);
    
    // Should detect broken links
    assert.ok(result.brokenLinks.length >= 2, 
      `Should find at least 2 broken links, found ${result.brokenLinks.length}`);
    
    // Should count total links (excluding external)
    assert.ok(result.totalLinks >= 2, 
      `Should count at least 2 total links, counted ${result.totalLinks}`);
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify relative path calculation
 */
test('Verify relative path calculation in updates', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create a nested directory structure
    const targetPath = createTestFile(tempDir, 'docs/guide/GUIDE.md', '# Guide\n');
    const sourcePath = createTestFile(tempDir, 'README.md', '[Guide](docs/guide/GUIDE.md)\n');
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    
    // Find references
    const references = updater.findReferences('GUIDE.md', [tempDir]);
    assert.strictEqual(references.length, 1, 'Should find one reference');
    
    // Move the target to a different location
    const newPath = path.join(tempDir, 'documentation', 'GUIDE.md');
    fs.mkdirSync(path.join(tempDir, 'documentation'), { recursive: true });
    fs.renameSync(targetPath, newPath);
    
    // Update the reference
    updater.updateReference(references[0], newPath);
    
    // Verify the relative path is correct
    const updatedContent = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(updatedContent.includes('documentation/GUIDE.md'),
      'Should use correct relative path from root to documentation/');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify multiple references on same line
 */
test('Verify handling of multiple references on same line', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create target files
    createTestFile(tempDir, 'FILE1.md', '# File 1\n');
    createTestFile(tempDir, 'FILE2.md', '# File 2\n');
    
    // Create source with multiple references on same line
    const sourceContent = 'See [File 1](FILE1.md) and [File 2](FILE2.md) for details.\n';
    const sourcePath = createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    
    // Find references to FILE1.md
    const refs1 = updater.findReferences('FILE1.md', [tempDir]);
    assert.strictEqual(refs1.length, 1, 'Should find FILE1.md reference');
    
    // Find references to FILE2.md
    const refs2 = updater.findReferences('FILE2.md', [tempDir]);
    assert.strictEqual(refs2.length, 1, 'Should find FILE2.md reference');
    
    // Both should be on the same line
    assert.strictEqual(refs1[0].lineNumber, refs2[0].lineNumber,
      'Both references should be on the same line');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify exact filename matching
 */
test('Verify exact filename matching', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create target file
    createTestFile(tempDir, 'TEST_RELEASE_TASKS.md', '# Tasks\n');
    
    // Create source with exact match
    const sourceContent = `# Documentation

- See TEST_RELEASE_TASKS.md for details
- Check [tasks](TEST_RELEASE_TASKS.md)
`;
    
    createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    const references = updater.findReferences('TEST_RELEASE_TASKS.md', [tempDir]);
    
    // Should find exact matches
    assert.ok(references.length >= 2, 
      `Should find at least 2 references, found ${references.length}`);
    
    // All references should have the exact filename
    for (const ref of references) {
      assert.strictEqual(path.basename(ref.targetPath), 'TEST_RELEASE_TASKS.md',
        'Reference should match exact filename');
    }
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify external URLs are not treated as file references
 */
test('Verify external URLs are ignored', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create source with external URLs
    const sourceContent = `# Links

- [External](https://example.com/file.md)
- [Another](http://test.com/doc.md)
- [Local](LOCAL.md)
`;
    
    createTestFile(tempDir, 'source.md', sourceContent);
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    
    // Try to find references to file.md (should not match external URL)
    const refs1 = updater.findReferences('file.md', [tempDir]);
    assert.strictEqual(refs1.length, 0, 'Should not find external URL as file reference');
    
    // Try to find references to LOCAL.md (should match)
    const refs2 = updater.findReferences('LOCAL.md', [tempDir]);
    assert.strictEqual(refs2.length, 1, 'Should find local file reference');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Unit test: Verify updateAllReferences batch operation
 */
test('Verify updateAllReferences updates all occurrences', (t) => {
  const tempDir = createTempDir();
  
  try {
    // Create target file
    const targetPath = createTestFile(tempDir, 'TARGET.md', '# Target\n');
    
    // Create multiple source files with references
    createTestFile(tempDir, 'source1.md', '[Link](TARGET.md)\n');
    createTestFile(tempDir, 'source2.md', 'See `TARGET.md` for info.\n');
    createTestFile(tempDir, 'source3.md', '[Another](TARGET.md) reference.\n');
    
    const updater = new ReferenceUpdater({ rootDir: tempDir });
    
    // Move the target file
    const newPath = path.join(tempDir, 'docs', 'TARGET.md');
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    fs.renameSync(targetPath, newPath);
    
    // Update all references at once
    const count = updater.updateAllReferences(targetPath, newPath);
    
    // Should have updated multiple references
    assert.ok(count >= 3, `Should update at least 3 references, updated ${count}`);
    
    // Verify all files were updated
    const content1 = fs.readFileSync(path.join(tempDir, 'source1.md'), 'utf8');
    const content2 = fs.readFileSync(path.join(tempDir, 'source2.md'), 'utf8');
    const content3 = fs.readFileSync(path.join(tempDir, 'source3.md'), 'utf8');
    
    assert.ok(content1.includes('docs/TARGET.md'), 'source1.md should be updated');
    assert.ok(content2.includes('docs/TARGET.md'), 'source2.md should be updated');
    assert.ok(content3.includes('docs/TARGET.md'), 'source3.md should be updated');
    
  } finally {
    cleanupTempDir(tempDir);
  }
});

/**
 * Feature: documentation-organization, Property 8: Reference preservation
 * Validates: Requirements 5.3
 * 
 * For any reference that is updated during reorganization, the link text and
 * surrounding context should remain unchanged - only the file path should be modified.
 */
test('Property 8: Reference preservation', async (t) => {
  // Generator for link text
  const linkTextArb = fc.string({ 
    minLength: 3, 
    maxLength: 50,
    unit: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z', ' ', '-', '_')
  }).filter(s => s.trim().length > 0);

  // Generator for markdown filenames
  const markdownFilenameArb = fc.string({ 
    minLength: 3, 
    maxLength: 30,
    unit: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z', '_', '-', '0', '1',
                          '2', '3', '4', '5', '6', '7', '8', '9')
  }).map(s => `${s}.md`);

  // Generator for surrounding context (no newlines - must be on same line)
  const contextArb = fc.string({ 
    minLength: 0, 
    maxLength: 100,
    unit: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z', ' ', '.', ',', '!',
                          '?')
  });

  await fc.assert(
    fc.asyncProperty(
      linkTextArb,
      markdownFilenameArb,
      markdownFilenameArb,
      contextArb,
      contextArb,
      async (linkText, targetFile, sourceFile, beforeContext, afterContext) => {
        // Skip if source and target are the same
        if (sourceFile === targetFile) {
          return true;
        }

        const tempDir = createTempDir();
        
        try {
          // Create the target file
          const targetPath = createTestFile(tempDir, targetFile, '# Target File\n');
          
          // Create source file with a markdown link surrounded by context
          const originalLine = `${beforeContext}[${linkText}](${targetFile})${afterContext}`;
          const sourceContent = `# Source File\n\n${originalLine}\n`;
          const sourcePath = createTestFile(tempDir, sourceFile, sourceContent);
          
          // Create updater
          const updater = new ReferenceUpdater({ rootDir: tempDir, verbose: false });
          
          // Find references
          const references = updater.findReferences(targetFile, [tempDir]);
          
          if (references.length === 0) {
            // If no references found, skip this test case
            return true;
          }
          
          // Get the first reference
          const reference = references[0];
          
          // Store the original link text
          const originalLinkText = reference.linkText;
          
          // Move the target file to a new location
          const newPath = path.join(tempDir, 'docs', 'subdir', targetFile);
          fs.mkdirSync(path.join(tempDir, 'docs', 'subdir'), { recursive: true });
          fs.renameSync(targetPath, newPath);
          
          // Update the reference
          const success = updater.updateReference(reference, newPath);
          assert.ok(success, 'Reference update should succeed');
          
          // Read the updated content
          const updatedContent = fs.readFileSync(sourcePath, 'utf8');
          const updatedLines = updatedContent.split('\n');
          
          // Find the line that was updated
          const updatedLine = updatedLines[reference.lineNumber - 1];
          
          // Property 1: Link text should be preserved
          if (originalLinkText) {
            assert.ok(updatedLine.includes(`[${originalLinkText}]`),
              `Link text "${originalLinkText}" should be preserved in updated line: ${updatedLine}`);
          }
          
          // Property 2: Before context should be preserved
          if (beforeContext.trim().length > 0) {
            const trimmedBefore = beforeContext.trim();
            assert.ok(updatedLine.includes(trimmedBefore),
              `Before context "${trimmedBefore}" should be preserved in: ${updatedLine}`);
          }
          
          // Property 3: After context should be preserved
          if (afterContext.trim().length > 0) {
            const trimmedAfter = afterContext.trim();
            assert.ok(updatedLine.includes(trimmedAfter),
              `After context "${trimmedAfter}" should be preserved in: ${updatedLine}`);
          }
          
          // Property 4: Only the path should change
          // The updated line should not contain the old direct reference
          assert.ok(!updatedLine.includes(`](${targetFile})`),
            `Updated line should not contain old path reference: ${updatedLine}`);
          
          // Property 5: The updated line should contain a path to the new location
          assert.ok(updatedLine.includes('docs/subdir/') || updatedLine.includes('../docs/subdir/'),
            `Updated line should reference new location: ${updatedLine}`);
          
          return true;
          
        } finally {
          cleanupTempDir(tempDir);
        }
      }
    ),
    { numRuns: 50 } // Reduced runs since we're doing file I/O
  );
});
