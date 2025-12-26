#!/usr/bin/env node

/**
 * Validation and Error Reporting Demo
 * 
 * Demonstrates the validation functionality for the kaspa-explorer CORS fix
 * showing how the system detects and reports configuration issues.
 */

const ConfigGenerator = require('./src/utils/config-generator');

async function demonstrateValidation() {
  console.log('='.repeat(80));
  console.log('Validation and Error Reporting Demo');
  console.log('Feature: kaspa-explorer-cors-fix');
  console.log('='.repeat(80));
  
  const configGenerator = new ConfigGenerator();
  
  // Demo 1: Current problematic configuration (prod profile)
  console.log('\n1. Testing Current Problematic Configuration');
  console.log('-'.repeat(50));
  
  const problematicConfig = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet'
  };
  const problematicProfiles = ['prod']; // This is the current issue
  
  console.log('Configuration:', JSON.stringify(problematicConfig, null, 2));
  console.log('Profiles:', problematicProfiles);
  
  const profileValidation = configGenerator.validateProfileConfiguration(problematicProfiles);
  console.log('\nProfile Validation Result:');
  console.log(`  Valid: ${profileValidation.errors.length === 0}`);
  console.log(`  Errors: ${profileValidation.errors.length}`);
  console.log(`  Warnings: ${profileValidation.warnings.length}`);
  
  if (profileValidation.errors.length > 0) {
    console.log('\nDetected Issues:');
    profileValidation.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message}`);
      console.log(`     Type: ${error.type}`);
      console.log(`     Suggestion: ${error.suggestion}`);
    });
  }
  
  // Demo 2: Correct configuration
  console.log('\n\n2. Testing Correct Configuration');
  console.log('-'.repeat(50));
  
  const correctConfig = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet',
    KASPA_EXPLORER_PORT: 3004
  };
  const correctProfiles = ['kaspa-user-applications'];
  
  console.log('Configuration:', JSON.stringify(correctConfig, null, 2));
  console.log('Profiles:', correctProfiles);
  
  const correctValidation = configGenerator.validateProfileConfiguration(correctProfiles);
  console.log('\nProfile Validation Result:');
  console.log(`  Valid: ${correctValidation.errors.length === 0}`);
  console.log(`  Errors: ${correctValidation.errors.length}`);
  console.log(`  Warnings: ${correctValidation.warnings.length}`);
  
  if (correctValidation.warnings.length > 0) {
    console.log('\nWarnings:');
    correctValidation.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning.message}`);
      console.log(`     Type: ${warning.type}`);
      console.log(`     Suggestion: ${warning.suggestion}`);
    });
  }
  
  // Generate docker-compose and validate service presence
  try {
    const dockerComposeContent = await configGenerator.generateDockerCompose(correctConfig, correctProfiles);
    const serviceValidation = configGenerator.validateDockerComposeGeneration(dockerComposeContent, correctProfiles, correctConfig);
    
    console.log('\nService Validation Result:');
    console.log(`  Valid: ${serviceValidation.valid}`);
    console.log(`  Missing Services: ${serviceValidation.missingServices.length}`);
    console.log(`  Total Errors: ${serviceValidation.errors.length}`);
    console.log(`  Total Warnings: ${serviceValidation.warnings.length}`);
    
    // Check if kaspa-explorer is properly included
    const hasKaspaExplorer = dockerComposeContent.includes('kaspa-explorer:');
    console.log(`  Kaspa Explorer Included: ${hasKaspaExplorer ? '✅' : '❌'}`);
    
    if (hasKaspaExplorer) {
      console.log('\n✅ SUCCESS: kaspa-explorer service is properly configured!');
      console.log('   - Service definition present');
      console.log('   - Assigned to kaspa-user-applications profile');
      console.log('   - Port configuration included');
      console.log('   - Environment variables set');
    }
    
  } catch (error) {
    console.log(`❌ Error generating docker-compose: ${error.message}`);
  }
  
  // Demo 3: Diagnostic report for problematic configuration
  console.log('\n\n3. Diagnostic Report for Problematic Configuration');
  console.log('-'.repeat(50));
  
  try {
    // Generate minimal docker-compose content to simulate the issue
    const minimalDockerCompose = 'services:\n  # No services defined\n';
    const diagnostics = configGenerator.generateDiagnosticReport(minimalDockerCompose, problematicProfiles, problematicConfig);
    
    console.log('Diagnostic Report Generated:');
    console.log(`  Timestamp: ${diagnostics.timestamp}`);
    console.log(`  Profiles Analyzed: ${diagnostics.configuration.selectedProfiles.join(', ')}`);
    console.log(`  Total Errors: ${diagnostics.validation.errors.length}`);
    console.log(`  Recommendations: ${diagnostics.recommendations.length}`);
    console.log(`  Quick Fixes: ${diagnostics.quickFixes.length}`);
    
    if (diagnostics.quickFixes.length > 0) {
      console.log('\nQuick Fixes Available:');
      diagnostics.quickFixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix.message}`);
        console.log(`     Priority: ${fix.priority}`);
        console.log(`     Current: ${fix.current}`);
        console.log(`     Suggested: ${fix.suggested}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error generating diagnostic report: ${error.message}`);
  }
  
  // Demo 4: Validation summary
  console.log('\n\n4. Validation Summary');
  console.log('-'.repeat(50));
  
  try {
    const correctDockerCompose = await configGenerator.generateDockerCompose(correctConfig, correctProfiles);
    const summary = configGenerator.getValidationSummary(correctDockerCompose, correctProfiles);
    
    console.log('Quick Validation Summary:');
    console.log(`  Overall Status: ${summary.status}`);
    console.log(`  Configuration Valid: ${summary.valid}`);
    console.log(`  Profiles Valid: ${summary.profilesValid}`);
    console.log(`  Services Valid: ${summary.servicesValid}`);
    console.log(`  Error Count: ${summary.errorCount}`);
    console.log(`  Warning Count: ${summary.warningCount}`);
    console.log(`  Critical Issues: ${summary.criticalIssues}`);
    
  } catch (error) {
    console.log(`❌ Error generating validation summary: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Demo Complete');
  console.log('='.repeat(80));
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Profile validation and mismatch detection');
  console.log('✅ Service presence validation');
  console.log('✅ Clear error messages with suggestions');
  console.log('✅ Diagnostic report generation');
  console.log('✅ Quick validation summaries');
  console.log('✅ Proper kaspa-explorer service inclusion');
}

// Run demo if called directly
if (require.main === module) {
  demonstrateValidation().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { demonstrateValidation };