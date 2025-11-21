/**
 * Property-based tests for file placement
 * 
 * Feature: documentation-organization
 * Tests Properties 4, 5, and 6 related to file placement
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { FileCategorizer, FileCategory } = require('./FileCategorizer.js');

/**
 * Feature: documentation-organization, Property 4: Implementation summary categorization
 * Validates: Requirements 3.1, 3.2
 * 
 * For any implementation summary file, it should be categorized into exactly one of
 * the defined feature areas (wizard, dashboard, testing, rollback, integrations,
 * infrastructure, tasks), and the destination path should match the pattern
 * `docs/implementation-summaries/{category}/`.
 */
test('Property 4: Implementation summary categorization', async (t) => {
  const categorizer = new FileCategorizer();

  // Define implementation summary categories and their expected paths
  const implementationCategories = {
    IMPLEMENTATION_WIZARD: 'docs/implementation-summaries/wizard/',
    IMPLEMENTATION_DASHBOARD: 'docs/implementation-summaries/dashboard/',
    IMPLEMENTATION_TESTING: 'docs/implementation-summaries/testing/',
    IMPLEMENTATION_ROLLBACK: 'docs/implementation-summaries/rollback/',
    IMPLEMENTATION_INTEGRATIONS: 'docs/implementation-summaries/integrations/',
    IMPLEMENTATION_INFRASTRUCTURE: 'docs/implementation-summaries/infrastructure/',
    IMPLEMENTATION_TASKS: 'docs/implementation-summaries/tasks/'
  };

  // Generator for implementation summary filenames
  const implementationSummaryArb = fc.oneof(
    // Wizard implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `WIZARD_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_WIZARD,
      expectedPathPrefix: 'docs/implementation-summaries/wizard/'
    })),
    
    // Dashboard implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `DASHBOARD_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_DASHBOARD,
      expectedPathPrefix: 'docs/implementation-summaries/dashboard/'
    })),
    
    // Testing implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `TESTING_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_TESTING,
      expectedPathPrefix: 'docs/implementation-summaries/testing/'
    })),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `${s}_TESTING_IMPLEMENTATION.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_TESTING,
      expectedPathPrefix: 'docs/implementation-summaries/testing/'
    })),
    
    // Rollback implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `ROLLBACK_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_ROLLBACK,
      expectedPathPrefix: 'docs/implementation-summaries/rollback/'
    })),
    
    // Integration implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `K_SOCIAL_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_INTEGRATIONS,
      expectedPathPrefix: 'docs/implementation-summaries/integrations/'
    })),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `KASIA_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_INTEGRATIONS,
      expectedPathPrefix: 'docs/implementation-summaries/integrations/'
    })),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `${s}_INTEGRATION_SUMMARY.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_INTEGRATIONS,
      expectedPathPrefix: 'docs/implementation-summaries/integrations/'
    })),
    
    // Infrastructure implementation summaries
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `TIMESCALEDB_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_INFRASTRUCTURE,
      expectedPathPrefix: 'docs/implementation-summaries/infrastructure/'
    })),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => ({
      filename: `REMOTE_NODE_${s}.md`,
      expectedCategory: FileCategory.IMPLEMENTATION_INFRASTRUCTURE,
      expectedPathPrefix: 'docs/implementation-summaries/infrastructure/'
    })),
    
    // Task implementation summaries
    fc.tuple(fc.nat(20), fc.nat(20), fc.string({ minLength: 1, maxLength: 30 }))
      .map(([major, minor, desc]) => ({
        filename: `TASK_${major}.${minor}_${desc}.md`,
        expectedCategory: FileCategory.IMPLEMENTATION_TASKS,
        expectedPathPrefix: 'docs/implementation-summaries/tasks/'
      }))
  );

  await fc.assert(
    fc.asyncProperty(implementationSummaryArb, async ({ filename, expectedCategory, expectedPathPrefix }) => {
      // Categorize the file
      const category = categorizer.categorizeFile(filename);
      
      // Should be categorized into the expected implementation category
      assert.strictEqual(category, expectedCategory,
        `File ${filename} should be categorized as ${expectedCategory}, got ${category}`);

      // Get the destination path
      const destinationPath = categorizer.getDestinationPath(filename, category);

      // Destination path should start with the expected prefix
      assert.ok(destinationPath.startsWith(expectedPathPrefix),
        `File ${filename} destination path should start with ${expectedPathPrefix}, got ${destinationPath}`);

      // Destination path should end with the filename
      assert.ok(destinationPath.endsWith(filename),
        `Destination path ${destinationPath} should end with filename ${filename}`);

      // Verify it's exactly one of the implementation categories
      const isImplementationCategory = Object.keys(implementationCategories).includes(category);
      assert.ok(isImplementationCategory,
        `Category ${category} should be one of the implementation categories`);

      // Verify the path matches the pattern docs/implementation-summaries/{category}/
      const pathPattern = /^docs\/implementation-summaries\/[a-z]+\//;
      assert.ok(pathPattern.test(destinationPath),
        `Destination path ${destinationPath} should match pattern docs/implementation-summaries/{category}/`);
    }),
    { numRuns: 100 }
  );
});

/**
 * Feature: documentation-organization, Property 5: Work log file placement
 * Validates: Requirements 3.3
 * 
 * For any file matching work session or summary patterns (SESSION_SUMMARY_*,
 * WORK_SUMMARY_*), it should be moved to `docs/work-logs/` directory.
 */
test('Property 5: Work log file placement', async (t) => {
  const categorizer = new FileCategorizer();

  // Generator for work log filenames
  const workLogFilenameArb = fc.oneof(
    // SESSION_SUMMARY_* pattern
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `SESSION_SUMMARY_${s}.md`),
    
    // WORK_SUMMARY_* pattern
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `WORK_SUMMARY_${s}.md`),
    
    // Date-based patterns (common in work logs)
    fc.date().map(d => {
      const dateStr = d.toISOString().split('T')[0];
      return `SESSION_SUMMARY_${dateStr}.md`;
    }),
    fc.date().map(d => {
      const dateStr = d.toISOString().split('T')[0];
      return `WORK_SUMMARY_${dateStr}.md`;
    })
  );

  await fc.assert(
    fc.asyncProperty(workLogFilenameArb, async (filename) => {
      // Categorize the file
      const category = categorizer.categorizeFile(filename);
      
      // Should be categorized as WORK_LOG
      assert.strictEqual(category, FileCategory.WORK_LOG,
        `File ${filename} should be categorized as WORK_LOG, got ${category}`);

      // Get the destination path
      const destinationPath = categorizer.getDestinationPath(filename, category);

      // Destination path should start with docs/work-logs/
      assert.ok(destinationPath.startsWith('docs/work-logs/'),
        `File ${filename} destination path should start with docs/work-logs/, got ${destinationPath}`);

      // Destination path should end with the filename
      assert.ok(destinationPath.endsWith(filename),
        `Destination path ${destinationPath} should end with filename ${filename}`);

      // Verify exact path format
      assert.strictEqual(destinationPath, `docs/work-logs/${filename}`,
        `Destination path should be exactly docs/work-logs/${filename}, got ${destinationPath}`);
    }),
    { numRuns: 100 }
  );
});

/**
 * Feature: documentation-organization, Property 6: Quick reference file placement
 * Validates: Requirements 3.4
 * 
 * For any file matching quick reference patterns (*_QUICK_REFERENCE.md,
 * *_QUICK_START.md), it should be moved to `docs/quick-references/` directory.
 */
test('Property 6: Quick reference file placement', async (t) => {
  const categorizer = new FileCategorizer();

  // Generator for quick reference filenames
  const quickReferenceFilenameArb = fc.oneof(
    // *_QUICK_REFERENCE.md pattern
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_QUICK_REFERENCE.md`),
    
    // *_QUICK_START.md pattern
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}_QUICK_START.md`),
    
    // Common prefixes
    fc.constantFrom('TESTING', 'ROLLBACK', 'INSTALLATION', 'SAFETY', 'ERROR_REMEDIATION')
      .chain(prefix => fc.oneof(
        fc.constant(`${prefix}_QUICK_REFERENCE.md`),
        fc.constant(`${prefix}_QUICK_START.md`)
      ))
  );

  await fc.assert(
    fc.asyncProperty(quickReferenceFilenameArb, async (filename) => {
      // Categorize the file
      const category = categorizer.categorizeFile(filename);
      
      // Should be categorized as QUICK_REFERENCE
      assert.strictEqual(category, FileCategory.QUICK_REFERENCE,
        `File ${filename} should be categorized as QUICK_REFERENCE, got ${category}`);

      // Get the destination path
      const destinationPath = categorizer.getDestinationPath(filename, category);

      // Destination path should start with docs/quick-references/
      assert.ok(destinationPath.startsWith('docs/quick-references/'),
        `File ${filename} destination path should start with docs/quick-references/, got ${destinationPath}`);

      // Destination path should end with the filename
      assert.ok(destinationPath.endsWith(filename),
        `Destination path ${destinationPath} should end with filename ${filename}`);

      // Verify exact path format
      assert.strictEqual(destinationPath, `docs/quick-references/${filename}`,
        `Destination path should be exactly docs/quick-references/${filename}, got ${destinationPath}`);
    }),
    { numRuns: 100 }
  );
});

/**
 * Additional test: Verify quick reference takes precedence over other patterns
 * 
 * This is important because files like ROLLBACK_QUICK_START.md match both
 * ROLLBACK_* and *_QUICK_START patterns, but should be categorized as QUICK_REFERENCE.
 */
test('Quick reference pattern takes precedence', (t) => {
  const categorizer = new FileCategorizer();

  // Files that match multiple patterns but should be QUICK_REFERENCE
  const testCases = [
    'ROLLBACK_QUICK_START.md',
    'ROLLBACK_QUICK_REFERENCE.md',
    'TESTING_QUICK_REFERENCE.md',
    'TESTING_QUICK_START.md',
    'WIZARD_QUICK_REFERENCE.md',
    'DASHBOARD_QUICK_START.md'
  ];

  for (const filename of testCases) {
    const category = categorizer.categorizeFile(filename);
    assert.strictEqual(category, FileCategory.QUICK_REFERENCE,
      `File ${filename} should be categorized as QUICK_REFERENCE (precedence), got ${category}`);

    const destinationPath = categorizer.getDestinationPath(filename, category);
    assert.strictEqual(destinationPath, `docs/quick-references/${filename}`,
      `File ${filename} should go to docs/quick-references/, got ${destinationPath}`);
  }
});

/**
 * Additional test: Verify specific real-world examples
 */
test('Verify real-world file placement examples', (t) => {
  const categorizer = new FileCategorizer();

  // Implementation summaries
  const wizardFile = categorizer.categorizeAndGetPath('WIZARD_IMPLEMENTATION_COMPLETE.md');
  assert.strictEqual(wizardFile.category, FileCategory.IMPLEMENTATION_WIZARD);
  assert.strictEqual(wizardFile.destinationPath, 'docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md');

  const dashboardFile = categorizer.categorizeAndGetPath('DASHBOARD_ENHANCEMENT_SUMMARY.md');
  assert.strictEqual(dashboardFile.category, FileCategory.IMPLEMENTATION_DASHBOARD);
  assert.strictEqual(dashboardFile.destinationPath, 'docs/implementation-summaries/dashboard/DASHBOARD_ENHANCEMENT_SUMMARY.md');

  const testingFile = categorizer.categorizeAndGetPath('TESTING_COVERAGE_AUDIT.md');
  assert.strictEqual(testingFile.category, FileCategory.IMPLEMENTATION_TESTING);
  assert.strictEqual(testingFile.destinationPath, 'docs/implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md');

  const rollbackFile = categorizer.categorizeAndGetPath('ROLLBACK_CLEANUP_SUMMARY.md');
  assert.strictEqual(rollbackFile.category, FileCategory.IMPLEMENTATION_ROLLBACK);
  assert.strictEqual(rollbackFile.destinationPath, 'docs/implementation-summaries/rollback/ROLLBACK_CLEANUP_SUMMARY.md');

  const integrationFile = categorizer.categorizeAndGetPath('KASIA_INTEGRATION_SUMMARY.md');
  assert.strictEqual(integrationFile.category, FileCategory.IMPLEMENTATION_INTEGRATIONS);
  assert.strictEqual(integrationFile.destinationPath, 'docs/implementation-summaries/integrations/KASIA_INTEGRATION_SUMMARY.md');

  const infrastructureFile = categorizer.categorizeAndGetPath('TIMESCALEDB_INTEGRATION_UPDATE.md');
  assert.strictEqual(infrastructureFile.category, FileCategory.IMPLEMENTATION_INFRASTRUCTURE);
  assert.strictEqual(infrastructureFile.destinationPath, 'docs/implementation-summaries/infrastructure/TIMESCALEDB_INTEGRATION_UPDATE.md');

  const taskFile = categorizer.categorizeAndGetPath('TASK_2.3_COMPLETION_SUMMARY.md');
  assert.strictEqual(taskFile.category, FileCategory.IMPLEMENTATION_TASKS);
  assert.strictEqual(taskFile.destinationPath, 'docs/implementation-summaries/tasks/TASK_2.3_COMPLETION_SUMMARY.md');

  // Work logs
  const sessionFile = categorizer.categorizeAndGetPath('SESSION_SUMMARY_2025-11-13.md');
  assert.strictEqual(sessionFile.category, FileCategory.WORK_LOG);
  assert.strictEqual(sessionFile.destinationPath, 'docs/work-logs/SESSION_SUMMARY_2025-11-13.md');

  const workFile = categorizer.categorizeAndGetPath('WORK_SUMMARY_2024-11-13.md');
  assert.strictEqual(workFile.category, FileCategory.WORK_LOG);
  assert.strictEqual(workFile.destinationPath, 'docs/work-logs/WORK_SUMMARY_2024-11-13.md');

  // Quick references
  const quickRefFile = categorizer.categorizeAndGetPath('TESTING_QUICK_REFERENCE.md');
  assert.strictEqual(quickRefFile.category, FileCategory.QUICK_REFERENCE);
  assert.strictEqual(quickRefFile.destinationPath, 'docs/quick-references/TESTING_QUICK_REFERENCE.md');

  const quickStartFile = categorizer.categorizeAndGetPath('ROLLBACK_QUICK_START.md');
  assert.strictEqual(quickStartFile.category, FileCategory.QUICK_REFERENCE);
  assert.strictEqual(quickStartFile.destinationPath, 'docs/quick-references/ROLLBACK_QUICK_START.md');
});
