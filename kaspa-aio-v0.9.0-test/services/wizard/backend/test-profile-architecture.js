#!/usr/bin/env node

/**
 * Test Profile Architecture Update
 * Tests the new profile architecture with renamed profiles, startup order, prerequisites, etc.
 */

const ProfileManager = require('./src/utils/profile-manager');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function logSuccess(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSection(message) {
    console.log(`\n${colors.cyan}${message}${colors.reset}`);
    console.log('='.repeat(70));
}

/**
 * Test the updated profile architecture
 */
async function testProfileArchitecture() {
    logSection('Profile Architecture Update Test');
    
    const profileManager = new ProfileManager();
    let testsPassed = 0;
    let testsFailed = 0;
    
    // Test 1: Verify profile renames
    logInfo('Test 1: Verify profile renames');
    try {
        const profiles = profileManager.getAllProfiles();
        const profileIds = profiles.map(p => p.id);
        
        // Check that old names are gone
        if (profileIds.includes('prod')) {
            throw new Error('Old "prod" profile still exists');
        }
        if (profileIds.includes('explorer')) {
            throw new Error('Old "explorer" profile still exists');
        }
        if (profileIds.includes('development')) {
            throw new Error('Old "development" profile still exists');
        }
        
        // Check that new names exist
        if (!profileIds.includes('kaspa-user-applications')) {
            throw new Error('New "kaspa-user-applications" profile not found');
        }
        if (!profileIds.includes('indexer-services')) {
            throw new Error('New "indexer-services" profile not found');
        }
        
        const kaspaUserApps = profileManager.getProfile('kaspa-user-applications');
        if (kaspaUserApps.name !== 'Kaspa User Applications') {
            throw new Error(`Expected name "Kaspa User Applications", got "${kaspaUserApps.name}"`);
        }
        
        const indexerServices = profileManager.getProfile('indexer-services');
        if (indexerServices.name !== 'Indexer Services') {
            throw new Error(`Expected name "Indexer Services", got "${indexerServices.name}"`);
        }
        
        logSuccess('Profile renames verified');
        testsPassed++;
    } catch (error) {
        logError(`Profile renames failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 2: Verify startup order field
    logInfo('Test 2: Verify startup order field');
    try {
        const core = profileManager.getProfile('core');
        const indexer = profileManager.getProfile('indexer-services');
        const kaspaApps = profileManager.getProfile('kaspa-user-applications');
        
        // Check that services have startupOrder
        if (!core.services[0].startupOrder) {
            throw new Error('Core services missing startupOrder');
        }
        if (!indexer.services[0].startupOrder) {
            throw new Error('Indexer services missing startupOrder');
        }
        if (!kaspaApps.services[0].startupOrder) {
            throw new Error('Kaspa User Applications services missing startupOrder');
        }
        
        // Verify startup order values
        const coreNode = core.services.find(s => s.name === 'kaspa-node');
        if (coreNode.startupOrder !== 1) {
            throw new Error(`Expected kaspa-node startupOrder=1, got ${coreNode.startupOrder}`);
        }
        
        const timescaledb = indexer.services.find(s => s.name === 'timescaledb');
        if (timescaledb.startupOrder !== 2) {
            throw new Error(`Expected timescaledb startupOrder=2, got ${timescaledb.startupOrder}`);
        }
        
        const kasiaApp = kaspaApps.services.find(s => s.name === 'kasia-app');
        if (kasiaApp.startupOrder !== 3) {
            throw new Error(`Expected kasia-app startupOrder=3, got ${kasiaApp.startupOrder}`);
        }
        
        logSuccess('Startup order field verified');
        testsPassed++;
    } catch (error) {
        logError(`Startup order failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 3: Verify prerequisites field
    logInfo('Test 3: Verify prerequisites field');
    try {
        const mining = profileManager.getProfile('mining');
        
        if (!mining.prerequisites || !Array.isArray(mining.prerequisites)) {
            throw new Error('Mining profile missing prerequisites array');
        }
        
        if (!mining.prerequisites.includes('core') || !mining.prerequisites.includes('archive-node')) {
            throw new Error('Mining prerequisites should include core and archive-node');
        }
        
        logSuccess('Prerequisites field verified');
        testsPassed++;
    } catch (error) {
        logError(`Prerequisites failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 4: Verify nodeUsage and indexerChoice options
    logInfo('Test 4: Verify nodeUsage and indexerChoice options');
    try {
        const core = profileManager.getProfile('core');
        const indexer = profileManager.getProfile('indexer-services');
        const kaspaApps = profileManager.getProfile('kaspa-user-applications');
        
        if (!core.configuration.nodeUsage) {
            throw new Error('Core profile missing nodeUsage configuration');
        }
        if (core.configuration.nodeUsage !== 'local') {
            throw new Error(`Expected core nodeUsage='local', got '${core.configuration.nodeUsage}'`);
        }
        
        if (!indexer.configuration.nodeUsage) {
            throw new Error('Indexer Services missing nodeUsage configuration');
        }
        
        if (!kaspaApps.configuration.indexerChoice) {
            throw new Error('Kaspa User Applications missing indexerChoice configuration');
        }
        if (kaspaApps.configuration.indexerChoice !== 'public') {
            throw new Error(`Expected indexerChoice='public', got '${kaspaApps.configuration.indexerChoice}'`);
        }
        
        logSuccess('nodeUsage and indexerChoice options verified');
        testsPassed++;
    } catch (error) {
        logError(`nodeUsage/indexerChoice failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 5: Verify fallbackToPublic configuration
    logInfo('Test 5: Verify fallbackToPublic configuration');
    try {
        const core = profileManager.getProfile('core');
        const indexer = profileManager.getProfile('indexer-services');
        
        if (core.configuration.fallbackToPublic !== true) {
            throw new Error('Core profile should have fallbackToPublic=true');
        }
        
        if (indexer.configuration.fallbackToPublic !== true) {
            throw new Error('Indexer Services should have fallbackToPublic=true');
        }
        
        logSuccess('fallbackToPublic configuration verified');
        testsPassed++;
    } catch (error) {
        logError(`fallbackToPublic failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 6: Verify Development profile removed
    logInfo('Test 6: Verify Development profile removed');
    try {
        const profiles = profileManager.getAllProfiles();
        const devProfile = profiles.find(p => p.id === 'development');
        
        if (devProfile) {
            throw new Error('Development profile should be removed');
        }
        
        // Check that developer mode features exist
        const devFeatures = profileManager.getDeveloperModeFeatures();
        if (!devFeatures) {
            throw new Error('Developer mode features not found');
        }
        if (!devFeatures.debugLogging) {
            throw new Error('Developer mode missing debugLogging feature');
        }
        if (!devFeatures.inspectionTools || !Array.isArray(devFeatures.inspectionTools)) {
            throw new Error('Developer mode missing inspectionTools');
        }
        
        logSuccess('Development profile removed, Developer Mode features added');
        testsPassed++;
    } catch (error) {
        logError(`Development profile removal failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 7: Test getStartupOrder method
    logInfo('Test 7: Test getStartupOrder method');
    try {
        const startupOrder = profileManager.getStartupOrder(['core', 'indexer-services', 'kaspa-user-applications']);
        
        if (!Array.isArray(startupOrder)) {
            throw new Error('getStartupOrder should return an array');
        }
        
        // Verify services are sorted by startup order
        let prevOrder = 0;
        for (const service of startupOrder) {
            if (service.startupOrder < prevOrder) {
                throw new Error('Services not sorted by startup order');
            }
            prevOrder = service.startupOrder;
        }
        
        // Verify order 1 services come first
        const firstService = startupOrder[0];
        if (firstService.startupOrder !== 1) {
            throw new Error('First service should have startupOrder=1');
        }
        
        logSuccess('getStartupOrder method works correctly');
        testsPassed++;
    } catch (error) {
        logError(`getStartupOrder failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 8: Test applyDeveloperMode method
    logInfo('Test 8: Test applyDeveloperMode method');
    try {
        const baseConfig = {
            KASPA_NODE_P2P_PORT: 16110,
            LOG_LEVEL: 'info'
        };
        
        const devConfig = profileManager.applyDeveloperMode(baseConfig, true);
        
        if (devConfig.LOG_LEVEL !== 'debug') {
            throw new Error('Developer mode should set LOG_LEVEL to debug');
        }
        if (devConfig.ENABLE_PORTAINER !== 'true') {
            throw new Error('Developer mode should enable Portainer');
        }
        if (devConfig.ENABLE_PGADMIN !== 'true') {
            throw new Error('Developer mode should enable pgAdmin');
        }
        
        // Test with developer mode disabled
        const normalConfig = profileManager.applyDeveloperMode(baseConfig, false);
        if (normalConfig.LOG_LEVEL !== 'info') {
            throw new Error('Normal mode should preserve original LOG_LEVEL');
        }
        
        logSuccess('applyDeveloperMode method works correctly');
        testsPassed++;
    } catch (error) {
        logError(`applyDeveloperMode failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 9: Test prerequisite validation
    logInfo('Test 9: Test prerequisite validation');
    try {
        // Mining without core or archive-node should fail
        const validation = profileManager.validateProfileSelection(['mining']);
        
        if (validation.valid) {
            throw new Error('Mining without core/archive-node should be invalid');
        }
        
        const prereqError = validation.errors.find(e => e.type === 'missing_prerequisite');
        if (!prereqError) {
            throw new Error('Should have missing_prerequisite error');
        }
        
        // Mining with core should pass
        const validValidation = profileManager.validateProfileSelection(['core', 'mining']);
        if (!validValidation.valid) {
            throw new Error('Mining with core should be valid');
        }
        
        logSuccess('Prerequisite validation works correctly');
        testsPassed++;
    } catch (error) {
        logError(`Prerequisite validation failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 10: Test conflict detection
    logInfo('Test 10: Test conflict detection');
    try {
        // Core and archive-node should conflict
        const validation = profileManager.validateProfileSelection(['core', 'archive-node']);
        
        if (validation.valid) {
            throw new Error('Core and archive-node should conflict');
        }
        
        const conflictError = validation.errors.find(e => e.type === 'profile_conflict');
        if (!conflictError) {
            throw new Error('Should have profile_conflict error');
        }
        
        logSuccess('Conflict detection works correctly');
        testsPassed++;
    } catch (error) {
        logError(`Conflict detection failed: ${error.message}`);
        testsFailed++;
    }
    
    // Summary
    logSection('Test Summary');
    console.log(`Tests passed: ${colors.green}${testsPassed}${colors.reset}`);
    console.log(`Tests failed: ${colors.red}${testsFailed}${colors.reset}`);
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        logSuccess('All tests passed!');
        return true;
    } else {
        logError(`${testsFailed} test(s) failed`);
        return false;
    }
}

// Run tests
testProfileArchitecture()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        logError(`Test execution failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
