/**
 * Test Enhanced Troubleshooting System
 * 
 * Simple test to verify the enhanced troubleshooting functionality
 */

const TroubleshootingSystem = require('./src/utils/troubleshooting-system');

async function testTroubleshootingSystem() {
  console.log('Testing Enhanced Troubleshooting System...\n');
  
  const troubleshootingSystem = new TroubleshootingSystem();
  
  // Test 1: Network timeout error
  console.log('Test 1: Network timeout error');
  try {
    const guide1 = await troubleshootingSystem.getGuidedTroubleshooting({
      stage: 'pull',
      error: 'network timeout while pulling image',
      service: 'kaspa-node',
      profiles: ['core']
    });
    
    console.log('✅ Guide generated successfully');
    console.log(`   Title: ${guide1.title}`);
    console.log(`   Steps: ${guide1.steps.length}`);
    console.log(`   Quick fixes: ${guide1.quickFixes.length}`);
    console.log(`   Transient: ${guide1.isTransient}`);
    console.log(`   Retry recommended: ${guide1.retryRecommended}`);
  } catch (error) {
    console.log('❌ Failed to generate guide:', error.message);
  }
  
  console.log();
  
  // Test 2: Permission denied error
  console.log('Test 2: Permission denied error');
  try {
    const guide2 = await troubleshootingSystem.getGuidedTroubleshooting({
      stage: 'build',
      error: 'permission denied accessing build context',
      service: 'wizard',
      profiles: ['core', 'kaspa-user-applications']
    });
    
    console.log('✅ Guide generated successfully');
    console.log(`   Title: ${guide2.title}`);
    console.log(`   Steps: ${guide2.steps.length}`);
    console.log(`   Quick fixes: ${guide2.quickFixes.length}`);
    console.log(`   Transient: ${guide2.isTransient}`);
    console.log(`   Retry recommended: ${guide2.retryRecommended}`);
  } catch (error) {
    console.log('❌ Failed to generate guide:', error.message);
  }
  
  console.log();
  
  // Test 3: Transient error detection
  console.log('Test 3: Transient error detection');
  const transientErrors = [
    'network timeout',
    'connection refused',
    'rate limit exceeded',
    'temporary failure',
    'try again later'
  ];
  
  transientErrors.forEach(error => {
    const isTransient = troubleshootingSystem.isTransientError(error);
    console.log(`   "${error}": ${isTransient ? '✅ Transient' : '❌ Not transient'}`);
  });
  
  console.log();
  
  // Test 4: Diagnostic export
  console.log('Test 4: Diagnostic export');
  try {
    const exportResult = await troubleshootingSystem.generateDiagnosticExport({
      stage: 'test',
      error: 'test error',
      profiles: ['core'],
      timestamp: new Date().toISOString()
    });
    
    if (exportResult.success) {
      console.log('✅ Diagnostic export created successfully');
      console.log(`   Export ID: ${exportResult.exportId}`);
      console.log(`   Files: ${Object.keys(exportResult.files).join(', ')}`);
      console.log(`   Size: ${exportResult.size} bytes`);
    } else {
      console.log('❌ Diagnostic export failed:', exportResult.error);
    }
  } catch (error) {
    console.log('❌ Diagnostic export error:', error.message);
  }
  
  console.log();
  
  // Test 5: Retry mechanism
  console.log('Test 5: Retry mechanism');
  let attemptCount = 0;
  
  const testOperation = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('network timeout - simulated transient error');
    }
    return { success: true, message: 'Operation completed successfully' };
  };
  
  try {
    const retryResult = await troubleshootingSystem.retryWithBackoff(testOperation, {
      maxAttempts: 3,
      baseDelay: 100 // Short delay for testing
    });
    
    if (retryResult.success) {
      console.log('✅ Retry mechanism worked successfully');
      console.log(`   Attempts: ${retryResult.attempts}`);
      console.log(`   Result: ${retryResult.result.message}`);
    } else {
      console.log('❌ Retry mechanism failed:', retryResult.error.message);
    }
  } catch (error) {
    console.log('❌ Retry mechanism error:', error.message);
  }
  
  console.log('\nTesting complete!');
}

// Run tests
if (require.main === module) {
  testTroubleshootingSystem().catch(console.error);
}

module.exports = { testTroubleshootingSystem };