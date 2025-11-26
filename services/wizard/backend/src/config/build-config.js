/**
 * Build Configuration
 * Controls test vs production behavior
 */

// Determine build mode from environment variable
// Default to 'production' for safety
const BUILD_MODE = process.env.BUILD_MODE || process.env.NODE_ENV || 'production';

const IS_TEST_BUILD = BUILD_MODE === 'test' || BUILD_MODE === 'development';
const IS_PRODUCTION_BUILD = BUILD_MODE === 'production';

// Build configuration
const buildConfig = {
    // Build mode
    mode: BUILD_MODE,
    isTest: IS_TEST_BUILD,
    isProduction: IS_PRODUCTION_BUILD,
    
    // Test-specific features
    test: {
        // Enable testing shortcuts (auto-enable buttons, skip validations, etc.)
        enableShortcuts: IS_TEST_BUILD,
        
        // Enable verbose logging
        verboseLogging: IS_TEST_BUILD,
        
        // Enable test endpoints
        enableTestEndpoints: IS_TEST_BUILD,
        
        // Skip time-consuming operations
        skipSlowOperations: false, // Can be enabled per-test
        
        // Mock external services
        mockExternalServices: false, // Can be enabled per-test
    },
    
    // Production-specific features
    production: {
        // Strict validation
        strictValidation: IS_PRODUCTION_BUILD,
        
        // Error reporting
        detailedErrors: !IS_PRODUCTION_BUILD,
        
        // Performance monitoring
        enableMonitoring: IS_PRODUCTION_BUILD,
    },
    
    // Feature flags (can be toggled independently)
    features: {
        // Wizard features
        autoEnableContinueButtons: IS_TEST_BUILD, // Testing shortcut
        skipSystemChecks: false, // Never skip in any mode
        allowSkipSteps: IS_TEST_BUILD, // Allow skipping steps in test mode
        
        // Installation features
        dryRunMode: false, // Can be enabled for testing
        verboseInstallLogs: IS_TEST_BUILD,
        
        // UI features
        showDebugInfo: IS_TEST_BUILD,
        showBuildMode: true, // Always show build mode
        enableDevTools: IS_TEST_BUILD,
    }
};

// Log build configuration on startup
console.log('='.repeat(60));
console.log(`Build Mode: ${buildConfig.mode.toUpperCase()}`);
console.log(`Test Build: ${buildConfig.isTest}`);
console.log(`Production Build: ${buildConfig.isProduction}`);
if (buildConfig.test.enableShortcuts) {
    console.log('⚠️  WARNING: Testing shortcuts are ENABLED');
}
console.log('='.repeat(60));

module.exports = buildConfig;
