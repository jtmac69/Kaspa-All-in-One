/**
 * Property-based tests for IndexGenerator
 * 
 * Feature: documentation-organization
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { IndexGenerator } = require('./IndexGenerator.js');
const { FileCategory } = require('./FileCategorizer.js');

/**
 * Feature: documentation-organization, Property 7: Index completeness
 * Validates: Requirements 4.2, 4.3, 4.4
 * 
 * For any documentation file that is moved during reorganization, it should appear
 * in the generated documentation index with a category, description, and valid relative path.
 */
test('Property 7: Index completeness', async (t) => {
  const generator = new IndexGenerator({ verbose: false });

  // Generator for documentation files
  const documentationFileArb = fc.record({
    filename: fc.oneof(
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.md`),
      fc.string({ minLength: 1, maxLength: 30 }).map(s => `WIZARD_${s}.md`),
      fc.string({ minLength: 1, maxLength: 30 }).map(s => `DASHBOARD_${s}.md`),
      fc.string({ minLength: 1, maxLength: 30 }).map(s => `TESTING_${s}.md`)
    ),
    path: fc.oneof(
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `docs/${s}.md`),
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `docs/implementation-summaries/wizard/${s}.md`),
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `docs/work-logs/${s}.md`)
    ),
    category: fc.constantFrom(
      FileCategory.IMPLEMENTATION_WIZARD,
      FileCategory.IMPLEMENTATION_DASHBOARD,
      FileCategory.IMPLEMENTATION_TESTING,
      FileCategory.IMPLEMENTATION_ROLLBACK,
      FileCategory.IMPLEMENTATION_INTEGRATIONS,
      FileCategory.IMPLEMENTATION_INFRASTRUCTURE,
      FileCategory.IMPLEMENTATION_TASKS,
      FileCategory.WORK_LOG,
      FileCategory.QUICK_REFERENCE,
      FileCategory.SPEC_TASK
    ),
    description: fc.string({ minLength: 10, maxLength: 150 }),
    lastModified: fc.date()
  });

  // Generator for arrays of documentation files
  const filesArrayArb = fc.array(documentationFileArb, { minLength: 1, maxLength: 20 });

  await fc.assert(
    fc.asyncProperty(filesArrayArb, async (files) => {
      // Generate the index
      const indexContent = generator.generateIndex(files);

      // Verify index is not empty
      assert.ok(indexContent.length > 0, 'Index content should not be empty');

      // Verify index contains header
      assert.ok(indexContent.includes('# Documentation Index'), 
        'Index should contain main header');

      // For each file, verify it appears in the index
      for (const file of files) {
        // Check that filename appears in the index
        assert.ok(indexContent.includes(file.filename),
          `Index should contain filename: ${file.filename}`);

        // Check that path appears in the index
        assert.ok(indexContent.includes(file.path),
          `Index should contain path: ${file.path}`);

        // Check that description appears in the index
        assert.ok(indexContent.includes(file.description),
          `Index should contain description for ${file.filename}`);

        // Verify the file has a category (not undefined or null)
        assert.ok(file.category !== undefined && file.category !== null,
          `File ${file.filename} should have a category`);
      }

      // Verify index contains table of contents
      assert.ok(indexContent.includes('## Table of Contents') || 
                indexContent.includes('Table of Contents'),
        'Index should contain table of contents');

      // Verify index contains category sections
      const categories = new Set(files.map(f => f.category));
      for (const category of categories) {
        // The category should appear in the index (as part of section headers)
        // We check that the index has structure for this category
        const categoryInfo = generator.categoryInfo[category];
        if (categoryInfo) {
          assert.ok(indexContent.includes(categoryInfo.name),
            `Index should contain category section: ${categoryInfo.name}`);
        }
      }
    }),
    { numRuns: 100 }
  );
});

/**
 * Additional test: Verify index structure
 */
test('Verify index structure and format', (t) => {
  const generator = new IndexGenerator({ verbose: false });

  const testFiles = [
    {
      filename: 'WIZARD_IMPLEMENTATION.md',
      path: 'docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'Implementation details for the wizard feature',
      lastModified: new Date('2025-01-01')
    },
    {
      filename: 'DASHBOARD_SUMMARY.md',
      path: 'docs/implementation-summaries/dashboard/DASHBOARD_SUMMARY.md',
      category: FileCategory.IMPLEMENTATION_DASHBOARD,
      description: 'Summary of dashboard enhancements',
      lastModified: new Date('2025-01-02')
    },
    {
      filename: 'SESSION_SUMMARY_2025-01-01.md',
      path: 'docs/work-logs/SESSION_SUMMARY_2025-01-01.md',
      category: FileCategory.WORK_LOG,
      description: 'Work session summary for January 1st',
      lastModified: new Date('2025-01-01')
    }
  ];

  const indexContent = generator.generateIndex(testFiles);

  // Verify main header
  assert.ok(indexContent.startsWith('# Documentation Index'),
    'Index should start with main header');

  // Verify all files are present
  assert.ok(indexContent.includes('WIZARD_IMPLEMENTATION.md'));
  assert.ok(indexContent.includes('DASHBOARD_SUMMARY.md'));
  assert.ok(indexContent.includes('SESSION_SUMMARY_2025-01-01.md'));

  // Verify all paths are present
  assert.ok(indexContent.includes('docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION.md'));
  assert.ok(indexContent.includes('docs/implementation-summaries/dashboard/DASHBOARD_SUMMARY.md'));
  assert.ok(indexContent.includes('docs/work-logs/SESSION_SUMMARY_2025-01-01.md'));

  // Verify all descriptions are present
  assert.ok(indexContent.includes('Implementation details for the wizard feature'));
  assert.ok(indexContent.includes('Summary of dashboard enhancements'));
  assert.ok(indexContent.includes('Work session summary for January 1st'));

  // Verify category sections
  assert.ok(indexContent.includes('Wizard Implementation'));
  assert.ok(indexContent.includes('Dashboard Implementation'));
  assert.ok(indexContent.includes('Work Session Logs'));

  // Verify markdown links are present
  assert.ok(indexContent.includes('[View File]'));

  // Verify table of contents
  assert.ok(indexContent.includes('Table of Contents'));
});

/**
 * Test: Verify empty file list handling
 */
test('Handle empty file list gracefully', (t) => {
  const generator = new IndexGenerator({ verbose: false });

  const indexContent = generator.generateIndex([]);

  // Should still generate valid index structure
  assert.ok(indexContent.includes('# Documentation Index'));
  assert.ok(indexContent.includes('Table of Contents'));
  
  // Should not crash or produce invalid markdown
  assert.ok(indexContent.length > 100, 'Should generate meaningful content even with no files');
});

/**
 * Test: Verify description extraction
 */
test('Extract descriptions from various content formats', (t) => {
  const generator = new IndexGenerator({ verbose: false });

  // Test with heading
  const content1 = '# My Feature\n\nThis is a description.';
  const desc1 = generator.extractDescription(content1);
  assert.strictEqual(desc1, 'My Feature');

  // Test with paragraph
  const content2 = 'This is the first paragraph with some content.';
  const desc2 = generator.extractDescription(content2);
  assert.strictEqual(desc2, 'This is the first paragraph with some content.');

  // Test with empty content
  const content3 = '';
  const desc3 = generator.extractDescription(content3);
  assert.strictEqual(desc3, 'No description available');

  // Test with only whitespace
  const content4 = '   \n\n   ';
  const desc4 = generator.extractDescription(content4);
  assert.strictEqual(desc4, 'No description available');

  // Test with very long content (should truncate)
  const longContent = 'A'.repeat(200);
  const desc5 = generator.extractDescription(longContent);
  assert.ok(desc5.length <= 150, 'Long descriptions should be truncated');
  assert.ok(desc5.endsWith('...'), 'Truncated descriptions should end with ...');

  // Test with code blocks (should skip)
  const content6 = '```javascript\ncode here\n```\n\nThis is the actual description.';
  const desc6 = generator.extractDescription(content6);
  assert.strictEqual(desc6, 'This is the actual description.');
});

/**
 * Test: Verify grouping by category
 */
test('Group files by category correctly', (t) => {
  const generator = new IndexGenerator({ verbose: false });

  const testFiles = [
    {
      filename: 'WIZARD_1.md',
      path: 'docs/wizard/WIZARD_1.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'Wizard file 1',
      lastModified: new Date()
    },
    {
      filename: 'WIZARD_2.md',
      path: 'docs/wizard/WIZARD_2.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'Wizard file 2',
      lastModified: new Date()
    },
    {
      filename: 'DASHBOARD_1.md',
      path: 'docs/dashboard/DASHBOARD_1.md',
      category: FileCategory.IMPLEMENTATION_DASHBOARD,
      description: 'Dashboard file 1',
      lastModified: new Date()
    }
  ];

  const grouped = generator.groupByCategory(testFiles);

  // Verify wizard category has 2 files
  const wizardFiles = grouped.get(FileCategory.IMPLEMENTATION_WIZARD);
  assert.strictEqual(wizardFiles.length, 2);
  assert.ok(wizardFiles.some(f => f.filename === 'WIZARD_1.md'));
  assert.ok(wizardFiles.some(f => f.filename === 'WIZARD_2.md'));

  // Verify dashboard category has 1 file
  const dashboardFiles = grouped.get(FileCategory.IMPLEMENTATION_DASHBOARD);
  assert.strictEqual(dashboardFiles.length, 1);
  assert.strictEqual(dashboardFiles[0].filename, 'DASHBOARD_1.md');

  // Verify other categories are empty
  const testingFiles = grouped.get(FileCategory.IMPLEMENTATION_TESTING);
  assert.strictEqual(testingFiles.length, 0);
});

/**
 * Test: Verify files are sorted within categories
 */
test('Files are sorted alphabetically within categories', (t) => {
  const generator = new IndexGenerator({ verbose: false });

  const testFiles = [
    {
      filename: 'WIZARD_Z.md',
      path: 'docs/wizard/WIZARD_Z.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'Last file',
      lastModified: new Date()
    },
    {
      filename: 'WIZARD_A.md',
      path: 'docs/wizard/WIZARD_A.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'First file',
      lastModified: new Date()
    },
    {
      filename: 'WIZARD_M.md',
      path: 'docs/wizard/WIZARD_M.md',
      category: FileCategory.IMPLEMENTATION_WIZARD,
      description: 'Middle file',
      lastModified: new Date()
    }
  ];

  const grouped = generator.groupByCategory(testFiles);
  const wizardFiles = grouped.get(FileCategory.IMPLEMENTATION_WIZARD);

  // Verify files are sorted
  assert.strictEqual(wizardFiles[0].filename, 'WIZARD_A.md');
  assert.strictEqual(wizardFiles[1].filename, 'WIZARD_M.md');
  assert.strictEqual(wizardFiles[2].filename, 'WIZARD_Z.md');
});
