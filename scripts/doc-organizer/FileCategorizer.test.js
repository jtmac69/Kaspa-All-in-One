/**
 * Property-based tests for FileCategorizer
 * 
 * Feature: documentation-organization
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { FileCategorizer, FileCategory } = require('./FileCategorizer.js');

/**
 * Feature: documentation-organization, Property 1: File categorization consistency
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5
 * 
 * For any documentation file with a recognizable pattern (WIZARD_*, DASHBOARD_*, etc.),
 * the categorization logic should consistently assign it to the same category
 * regardless of when or how many times it is categorized.
 */
test('Property 1: File categorization consistency', async (t) => {
  const categorizer = new FileCategorizer();

  // Generator for filenames with recognizable patterns
  const recognizableFilenameArb = fc.oneof(
    // Wizard files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `WIZARD_${s}.md`),
    
    // Dashboard files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `DASHBOARD_${s}.md`),
    
    // Testing files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `TESTING_${s}.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_TESTING_IMPLEMENTATION.md`),
    
    // Rollback files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `ROLLBACK_${s}.md`),
    
    // Integration files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `K_SOCIAL_${s}.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `KASIA_${s}.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_INTEGRATION_SUMMARY.md`),
    
    // Infrastructure files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `TIMESCALEDB_${s}.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `REMOTE_NODE_${s}.md`),
    
    // Task files
    fc.tuple(fc.nat(20), fc.nat(20), fc.string({ minLength: 1, maxLength: 30 }))
      .map(([major, minor, desc]) => `TASK_${major}.${minor}_${desc}.md`),
    
    // Work logs
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `SESSION_SUMMARY_${s}.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `WORK_SUMMARY_${s}.md`),
    
    // Quick references
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_QUICK_REFERENCE.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_QUICK_START.md`),
    
    // Spec task files
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `TEST_${s}_TASKS.md`)
  );

  await fc.assert(
    fc.asyncProperty(recognizableFilenameArb, async (filename) => {
      // Categorize the file multiple times
      const category1 = categorizer.categorizeFile(filename);
      const category2 = categorizer.categorizeFile(filename);
      const category3 = categorizer.categorizeFile(filename);

      // All categorizations should be identical
      assert.strictEqual(category1, category2, 
        `Categorization inconsistent for ${filename}: ${category1} vs ${category2}`);
      assert.strictEqual(category2, category3,
        `Categorization inconsistent for ${filename}: ${category2} vs ${category3}`);

      // Category should not be UNKNOWN for recognizable patterns
      assert.notStrictEqual(category1, FileCategory.UNKNOWN,
        `Recognizable file ${filename} was categorized as UNKNOWN`);

      // Category should not be ESSENTIAL_ROOT unless it's actually essential
      const essentialFiles = ['README.md', 'CONTRIBUTING.md', 'LICENSE', 'QUICK_START.md'];
      if (!essentialFiles.includes(filename)) {
        assert.notStrictEqual(category1, FileCategory.ESSENTIAL_ROOT,
          `Non-essential file ${filename} was categorized as ESSENTIAL_ROOT`);
      }
    }),
    { numRuns: 100 }
  );
});

/**
 * Additional test: Verify specific pattern matching
 */
test('Verify specific categorization patterns', (t) => {
  const categorizer = new FileCategorizer();

  // Test essential files
  assert.strictEqual(categorizer.categorizeFile('README.md'), FileCategory.ESSENTIAL_ROOT);
  assert.strictEqual(categorizer.categorizeFile('CONTRIBUTING.md'), FileCategory.ESSENTIAL_ROOT);
  assert.strictEqual(categorizer.categorizeFile('LICENSE'), FileCategory.ESSENTIAL_ROOT);
  assert.strictEqual(categorizer.categorizeFile('QUICK_START.md'), FileCategory.ESSENTIAL_ROOT);

  // Test wizard files
  assert.strictEqual(categorizer.categorizeFile('WIZARD_IMPLEMENTATION_COMPLETE.md'), 
    FileCategory.IMPLEMENTATION_WIZARD);

  // Test dashboard files
  assert.strictEqual(categorizer.categorizeFile('DASHBOARD_ENHANCEMENT_SUMMARY.md'), 
    FileCategory.IMPLEMENTATION_DASHBOARD);

  // Test testing files
  assert.strictEqual(categorizer.categorizeFile('TESTING_COVERAGE_AUDIT.md'), 
    FileCategory.IMPLEMENTATION_TESTING);
  assert.strictEqual(categorizer.categorizeFile('INFRASTRUCTURE_TESTING_IMPLEMENTATION.md'), 
    FileCategory.IMPLEMENTATION_TESTING);

  // Test rollback files
  assert.strictEqual(categorizer.categorizeFile('ROLLBACK_FEATURE_CLARIFICATION.md'), 
    FileCategory.IMPLEMENTATION_ROLLBACK);

  // Test integration files
  assert.strictEqual(categorizer.categorizeFile('K_SOCIAL_INTEGRATION_SUMMARY.md'), 
    FileCategory.IMPLEMENTATION_INTEGRATIONS);
  assert.strictEqual(categorizer.categorizeFile('KASIA_INTEGRATION_SUMMARY.md'), 
    FileCategory.IMPLEMENTATION_INTEGRATIONS);

  // Test infrastructure files
  assert.strictEqual(categorizer.categorizeFile('TIMESCALEDB_INTEGRATION_UPDATE.md'), 
    FileCategory.IMPLEMENTATION_INFRASTRUCTURE);
  assert.strictEqual(categorizer.categorizeFile('REMOTE_NODE_SETUP_COMPLETE.md'), 
    FileCategory.IMPLEMENTATION_INFRASTRUCTURE);

  // Test task files
  assert.strictEqual(categorizer.categorizeFile('TASK_2.3_COMPLETION_SUMMARY.md'), 
    FileCategory.IMPLEMENTATION_TASKS);

  // Test work logs
  assert.strictEqual(categorizer.categorizeFile('SESSION_SUMMARY_2025-11-13.md'), 
    FileCategory.WORK_LOG);
  assert.strictEqual(categorizer.categorizeFile('WORK_SUMMARY_2024-11-13.md'), 
    FileCategory.WORK_LOG);

  // Test quick references (should take precedence over other patterns)
  assert.strictEqual(categorizer.categorizeFile('ROLLBACK_QUICK_START.md'), 
    FileCategory.QUICK_REFERENCE);
  assert.strictEqual(categorizer.categorizeFile('TESTING_QUICK_REFERENCE.md'), 
    FileCategory.QUICK_REFERENCE);

  // Test spec task files
  assert.strictEqual(categorizer.categorizeFile('TEST_RELEASE_TASKS.md'), 
    FileCategory.SPEC_TASK);
});

/**
 * Test destination path generation
 */
test('Verify destination path generation', (t) => {
  const categorizer = new FileCategorizer();

  // Test essential files stay at root
  assert.strictEqual(categorizer.getDestinationPath('README.md', FileCategory.ESSENTIAL_ROOT), '');

  // Test wizard files
  assert.strictEqual(
    categorizer.getDestinationPath('WIZARD_TEST.md', FileCategory.IMPLEMENTATION_WIZARD),
    'docs/implementation-summaries/wizard/WIZARD_TEST.md'
  );

  // Test spec task files
  assert.strictEqual(
    categorizer.getDestinationPath('TEST_RELEASE_TASKS.md', FileCategory.SPEC_TASK),
    '.kiro/specs/kaspa-all-in-one-project/TEST_RELEASE_TASKS.md'
  );

  // Test work logs
  assert.strictEqual(
    categorizer.getDestinationPath('SESSION_SUMMARY_2025-11-13.md', FileCategory.WORK_LOG),
    'docs/work-logs/SESSION_SUMMARY_2025-11-13.md'
  );

  // Test quick references
  assert.strictEqual(
    categorizer.getDestinationPath('TESTING_QUICK_REFERENCE.md', FileCategory.QUICK_REFERENCE),
    'docs/quick-references/TESTING_QUICK_REFERENCE.md'
  );
});

/**
 * Feature: documentation-organization, Property 2: Task file to spec mapping
 * Validates: Requirements 2.1
 * 
 * For any task tracking document, the system should correctly identify which spec
 * directory it belongs to based on its name or content, and the destination path
 * should be within that spec's directory.
 */
test('Property 2: Task file to spec mapping', async (t) => {
  const categorizer = new FileCategorizer();

  // Generator for task file names
  const taskFilenameArb = fc.oneof(
    // TEST_*_TASKS.md pattern
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `TEST_${s}_TASKS.md`),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `TEST_${s.toUpperCase()}_TASKS.md`)
  );

  await fc.assert(
    fc.asyncProperty(taskFilenameArb, async (filename) => {
      // Categorize the task file
      const category = categorizer.categorizeFile(filename);
      
      // Task files should be categorized as SPEC_TASK
      assert.strictEqual(category, FileCategory.SPEC_TASK,
        `Task file ${filename} should be categorized as SPEC_TASK, got ${category}`);

      // Get the destination path
      const destinationPath = categorizer.getDestinationPath(filename, category);

      // Destination path should be within a spec directory
      assert.ok(destinationPath.startsWith('.kiro/specs/'),
        `Task file ${filename} destination path should start with .kiro/specs/, got ${destinationPath}`);

      // Destination path should end with the filename
      assert.ok(destinationPath.endsWith(filename),
        `Destination path ${destinationPath} should end with filename ${filename}`);

      // For TEST_RELEASE_TASKS.md specifically, it should go to kaspa-all-in-one-project
      if (filename === 'TEST_RELEASE_TASKS.md') {
        assert.strictEqual(destinationPath, '.kiro/specs/kaspa-all-in-one-project/TEST_RELEASE_TASKS.md',
          `TEST_RELEASE_TASKS.md should map to kaspa-all-in-one-project spec directory`);
      }
    }),
    { numRuns: 100 }
  );
});

/**
 * Additional test: Verify specific task file mappings
 */
test('Verify specific task file mappings', (t) => {
  const categorizer = new FileCategorizer();

  // Test TEST_RELEASE_TASKS.md specifically
  const result = categorizer.categorizeAndGetPath('TEST_RELEASE_TASKS.md');
  
  assert.strictEqual(result.category, FileCategory.SPEC_TASK);
  assert.strictEqual(result.destinationPath, '.kiro/specs/kaspa-all-in-one-project/TEST_RELEASE_TASKS.md');

  // Test other task file patterns
  const result2 = categorizer.categorizeAndGetPath('TEST_FEATURE_TASKS.md');
  assert.strictEqual(result2.category, FileCategory.SPEC_TASK);
  assert.ok(result2.destinationPath.startsWith('.kiro/specs/'));

  // Test case insensitivity
  const result3 = categorizer.categorizeAndGetPath('test_something_tasks.md');
  assert.strictEqual(result3.category, FileCategory.SPEC_TASK);
});
