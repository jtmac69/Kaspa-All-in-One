/**
 * Build Configuration (Frontend)
 * Controls test vs production behavior in the browser
 */

// Build mode is fetched from backend or detected from URL
function detectBuildMode() {
    // Check URL parameter first (for testing/override)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('build-mode');
    if (urlMode) {
        console.log(`Build mode override from URL: ${urlMode}`);
        return urlMode;
    }
    
    // Check localStorage (persisted from backend)
    const storedMode = localStorage.getItem('buildMode');
    if (storedMode) {
        return storedMode;
    }
    
    // Default to production for safety (will be updated by fetchBuildInfo)
    return 'production';
}

// Fetch build info from backend
async function fetchBuildInfo() {
    try {
        const response = await fetch('/api/build-info');
        if (response.ok) {
            const buildInfo = await response.json();
            // Store in localStorage for quick access
            localStorage.setItem('buildMode', buildInfo.mode);
            localStorage.setItem('buildInfo', JSON.stringify(buildInfo));
            return buildInfo;
        }
    } catch (error) {
        console.error('Failed to fetch build info:', error);
    }
    return null;
}

const BUILD_MODE = detectBuildMode();
const IS_TEST_BUILD = BUILD_MODE === 'test' || BUILD_MODE === 'development';
const IS_PRODUCTION_BUILD = BUILD_MODE === 'production';

// Build configuration
export const buildConfig = {
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
        
        // Show debug information
        showDebugInfo: IS_TEST_BUILD,
        
        // Enable step skipping
        allowSkipSteps: IS_TEST_BUILD,
    },
    
    // Production-specific features
    production: {
        // Strict validation
        strictValidation: IS_PRODUCTION_BUILD,
        
        // Detailed error messages
        detailedErrors: !IS_PRODUCTION_BUILD,
    },
    
    // Feature flags (can be toggled independently)
    features: {
        // Wizard features
        autoEnableContinueButtons: IS_TEST_BUILD, // Testing shortcut - REMOVE IN PRODUCTION
        skipSystemChecks: false, // Never skip in any mode
        allowManualStepNavigation: IS_TEST_BUILD, // Allow clicking on progress steps
        
        // UI features
        showBuildModeBanner: true, // Always show build mode
        showStepDebugInfo: IS_TEST_BUILD,
        enableConsoleLogging: IS_TEST_BUILD,
        
        // Validation features
        skipFormValidation: false, // Never skip
        allowEmptyFields: false, // Never allow
    }
};

// Log build configuration
console.log('='.repeat(60));
console.log(`Frontend Build Mode: ${buildConfig.mode.toUpperCase()}`);
console.log(`Test Build: ${buildConfig.isTest}`);
console.log(`Production Build: ${buildConfig.isProduction}`);
if (buildConfig.test.enableShortcuts) {
    console.warn('⚠️  WARNING: Testing shortcuts are ENABLED');
}
console.log('='.repeat(60));

// Export helper functions
export function isTestBuild() {
    return buildConfig.isTest;
}

export function isProductionBuild() {
    return buildConfig.isProduction;
}

export function isFeatureEnabled(featureName) {
    return buildConfig.features[featureName] === true;
}

// Initialize build config from backend
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch latest build info from backend
    const buildInfo = await fetchBuildInfo();
    if (buildInfo) {
        console.log('Build info updated from backend:', buildInfo);
        // Reload if mode changed
        const currentMode = BUILD_MODE;
        if (buildInfo.mode !== currentMode) {
            console.log(`Build mode changed from ${currentMode} to ${buildInfo.mode}, reloading...`);
            window.location.reload();
            return;
        }
    }
    
    // Add build mode indicator
    if (buildConfig.features.showBuildModeBanner && !isProductionBuild()) {
        addBuildModeIndicator();
    }
});

function addBuildModeIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'build-mode-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: ${IS_TEST_BUILD ? '#ff9800' : '#f44336'};
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-family: monospace;
    `;
    indicator.textContent = `${BUILD_MODE.toUpperCase()} BUILD`;
    indicator.title = 'Build mode: ' + BUILD_MODE;
    document.body.appendChild(indicator);
}

console.log('Build config module loaded');
