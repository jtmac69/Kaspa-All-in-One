/**
 * Demo script to show IndexGenerator functionality
 */

const { IndexGenerator } = require('./IndexGenerator.js');
const { FileCategory } = require('./FileCategorizer.js');

// Create an instance of IndexGenerator
const generator = new IndexGenerator({ verbose: true });

// Create sample documentation files
const sampleFiles = [
  {
    filename: 'WIZARD_IMPLEMENTATION_COMPLETE.md',
    path: 'docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md',
    category: FileCategory.IMPLEMENTATION_WIZARD,
    description: 'Complete implementation details for the web installation wizard',
    lastModified: new Date('2025-11-15')
  },
  {
    filename: 'DASHBOARD_ENHANCEMENT_SUMMARY.md',
    path: 'docs/implementation-summaries/dashboard/DASHBOARD_ENHANCEMENT_SUMMARY.md',
    category: FileCategory.IMPLEMENTATION_DASHBOARD,
    description: 'Summary of dashboard enhancements and new features',
    lastModified: new Date('2025-11-16')
  },
  {
    filename: 'TESTING_COVERAGE_AUDIT.md',
    path: 'docs/implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md',
    category: FileCategory.IMPLEMENTATION_TESTING,
    description: 'Audit of testing coverage across the project',
    lastModified: new Date('2025-11-17')
  },
  {
    filename: 'ROLLBACK_FEATURE_CLARIFICATION.md',
    path: 'docs/implementation-summaries/rollback/ROLLBACK_FEATURE_CLARIFICATION.md',
    category: FileCategory.IMPLEMENTATION_ROLLBACK,
    description: 'Clarification of rollback feature requirements and implementation',
    lastModified: new Date('2025-11-18')
  },
  {
    filename: 'KASIA_INTEGRATION_SUMMARY.md',
    path: 'docs/implementation-summaries/integrations/KASIA_INTEGRATION_SUMMARY.md',
    category: FileCategory.IMPLEMENTATION_INTEGRATIONS,
    description: 'Summary of KASIA service integration',
    lastModified: new Date('2025-11-19')
  },
  {
    filename: 'SESSION_SUMMARY_2025-11-13.md',
    path: 'docs/work-logs/SESSION_SUMMARY_2025-11-13.md',
    category: FileCategory.WORK_LOG,
    description: 'Work session summary for November 13, 2025',
    lastModified: new Date('2025-11-13')
  },
  {
    filename: 'TESTING_QUICK_REFERENCE.md',
    path: 'docs/quick-references/TESTING_QUICK_REFERENCE.md',
    category: FileCategory.QUICK_REFERENCE,
    description: 'Quick reference guide for testing procedures',
    lastModified: new Date('2025-11-20')
  },
  {
    filename: 'TEST_RELEASE_TASKS.md',
    path: '.kiro/specs/kaspa-all-in-one-project/TEST_RELEASE_TASKS.md',
    category: FileCategory.SPEC_TASK,
    description: 'Release testing task list',
    lastModified: new Date('2025-11-21')
  }
];

console.log('=== IndexGenerator Demo ===\n');

// Test description extraction
console.log('1. Testing description extraction:');
const testContent = '# My Feature Documentation\n\nThis is a comprehensive guide to the feature.';
const description = generator.extractDescription(testContent);
console.log(`   Extracted: "${description}"\n`);

// Test grouping by category
console.log('2. Testing category grouping:');
const grouped = generator.groupByCategory(sampleFiles);
for (const [category, files] of grouped.entries()) {
  if (files.length > 0) {
    console.log(`   ${category}: ${files.length} files`);
  }
}
console.log();

// Generate the full index
console.log('3. Generating full documentation index:');
const indexContent = generator.generateIndex(sampleFiles);
console.log(`   Generated index with ${indexContent.length} characters`);
console.log(`   Contains ${sampleFiles.length} files across ${grouped.size} categories\n`);

// Show a preview of the index
console.log('4. Index preview (first 500 characters):');
console.log('---');
console.log(indexContent.substring(0, 500));
console.log('...\n---\n');

console.log('Demo complete! ✓');
