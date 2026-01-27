#!/usr/bin/env node

/**
 * Profile System Test
 * Tests the new 8-profile structure and migration helpers
 */

const ProfileManager = require('./src/utils/profile/ProfileManager');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(message) {
    console.log(`\n${colors.cyan}=== ${message} ===${colors.reset}`);
}

async function runTests() {
    logSection('Profile System Test');
    
    const profileManager = new ProfileManager();
    let testsPassed = 0;
    let testsFailed = 0;
    
    // Test 1: Verify all 8 new profiles exist
    logInfo('Test 1: Verify all 8 new profiles exist');
    try {
        const expectedProfiles = [
            'kaspa-node',
            'kasia-app',
            'k-social-app',
            'kaspa-explorer-bundle',
            'kasia-indexer',
            'k-indexer-bundle',
            'kaspa-archive-node',
            'kaspa-stratum'
        ];
        
        for (const profileId of expectedProfiles) {
            const profile = profileManager.getProfile(profileId);
            if (!profile) {
                throw new Error(`Profile '${profileId}' not found`);
            }
            if (profile.id !== profileId) {
                throw new Error(`Profile '${profileId}' has incorrect id: ${profile.id}`);
            }
        }
        
        logSuccess(`All ${expectedProfiles.length} new profiles exist`);
        testsPassed++;
    } catch (error) {
        logError(`Test 1 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 2: Verify profile structure
    logInfo('Test 2: Verify profile structure');
    try {
        const requiredFields = ['id', 'name', 'description', 'services', 'dependencies',
                                 'prerequisites', 'conflicts', 'resources', 'ports',
                                 'configuration', 'category'];
        const resourceFields = ['minMemory', 'minCpu', 'minDisk', 'recommendedMemory',
                                 'recommendedCpu', 'recommendedDisk'];
        
        const profiles = profileManager.getAllProfiles();
        for (const profile of profiles) {
            for (const field of requiredFields) {
                if (!(field in profile)) {
                    throw new Error(`Profile '${profile.id}' missing field: ${field}`);
                }
            }
            for (const field of resourceFields) {
                if (!(field in profile.resources)) {
                    throw new Error(`Profile '${profile.id}' missing resource field: ${field}`);
                }
            }
        }
        
        logSuccess('All profiles have required structure');
        testsPassed++;
    } catch (error) {
        logError(`Test 2 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 3: Verify services use object format
    logInfo('Test 3: Verify services use object format');
    try {
        const profiles = profileManager.getAllProfiles();
        for (const profile of profiles) {
            for (const service of profile.services) {
                if (typeof service !== 'object') {
                    throw new Error(`Profile '${profile.id}' has non-object service: ${service}`);
                }
                if (!service.name || typeof service.required !== 'boolean' || !service.startupOrder) {
                    throw new Error(`Profile '${profile.id}' has malformed service: ${JSON.stringify(service)}`);
                }
            }
        }
        
        logSuccess('All services use correct object format');
        testsPassed++;
    } catch (error) {
        logError(`Test 3 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 4: Verify port assignments
    logInfo('Test 4: Verify port assignments');
    try {
        const expectedPorts = {
            'kaspa-node': [16110, 16111, 17110],
            'kasia-app': [3001],
            'k-social-app': [3003],
            'kaspa-explorer-bundle': [3004, 3005, 5434],
            'kasia-indexer': [3002],
            'k-indexer-bundle': [3006, 5433],
            'kaspa-archive-node': [16110, 16111, 17110],
            'kaspa-stratum': [5555]
        };
        
        for (const [profileId, ports] of Object.entries(expectedPorts)) {
            const profile = profileManager.getProfile(profileId);
            const profilePorts = profile.ports.sort((a, b) => a - b);
            const expectedSorted = ports.sort((a, b) => a - b);
            
            if (JSON.stringify(profilePorts) !== JSON.stringify(expectedSorted)) {
                throw new Error(`Profile '${profileId}' has wrong ports: ${profilePorts} (expected ${expectedSorted})`);
            }
        }
        
        logSuccess('All port assignments are correct');
        testsPassed++;
    } catch (error) {
        logError(`Test 4 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 5: Verify conflicts
    logInfo('Test 5: Verify kaspa-node <-> kaspa-archive-node conflict');
    try {
        const kaspaNode = profileManager.getProfile('kaspa-node');
        const archiveNode = profileManager.getProfile('kaspa-archive-node');
        
        if (!kaspaNode.conflicts.includes('kaspa-archive-node')) {
            throw new Error('kaspa-node should conflict with kaspa-archive-node');
        }
        if (!archiveNode.conflicts.includes('kaspa-node')) {
            throw new Error('kaspa-archive-node should conflict with kaspa-node');
        }
        
        // Test conflict detection
        const conflicts = profileManager.checkProfileConflicts(['kaspa-node', 'kaspa-archive-node']);
        if (conflicts.length === 0) {
            throw new Error('Should detect conflict between kaspa-node and kaspa-archive-node');
        }
        
        logSuccess('Conflict rules are correct');
        testsPassed++;
    } catch (error) {
        logError(`Test 5 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 6: Verify stratum prerequisites
    logInfo('Test 6: Verify kaspa-stratum prerequisites');
    try {
        const stratum = profileManager.getProfile('kaspa-stratum');
        
        if (!stratum.prerequisites.includes('kaspa-node') ||
             !stratum.prerequisites.includes('kaspa-archive-node')) {
            throw new Error('kaspa-stratum should have kaspa-node and kaspa-archive-node as prerequisites');
        }
        
        if (stratum.prerequisitesMode !== 'any') {
            throw new Error('kaspa-stratum should have prerequisitesMode: "any"');
        }
        
        logSuccess('Stratum prerequisites are correct');
        testsPassed++;
    } catch (error) {
        logError(`Test 6 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 7: Verify bundle profiles
    logInfo('Test 7: Verify bundle profiles');
    try {
        const bundles = ['kaspa-explorer-bundle', 'k-indexer-bundle'];
        
        for (const bundleId of bundles) {
            const profile = profileManager.getProfile(bundleId);
            
            if (!profile.isBundle) {
                throw new Error(`Profile '${bundleId}' should have isBundle: true`);
            }
            
            if (!profile.configuration.bundledServices ||
                 profile.configuration.bundledServices.length < 2) {
                throw new Error(`Profile '${bundleId}' should have bundledServices array`);
            }
            
            if (profile.services.length < 2) {
                throw new Error(`Bundle '${bundleId}' should have multiple services`);
            }
        }
        
        logSuccess('Bundle profiles are correctly configured');
        testsPassed++;
    } catch (error) {
        logError(`Test 7 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 8: Verify k-social-app Docker service name
    logInfo('Test 8: Verify k-social-app Docker service name');
    try {
        const kSocial = profileManager.getProfile('k-social-app');
        
        if (kSocial.dockerServiceName !== 'k-social') {
            throw new Error(`k-social-app should have dockerServiceName: 'k-social'`);
        }
        
        const dockerName = profileManager.getDockerServiceName('k-social-app');
        if (dockerName !== 'k-social') {
            throw new Error(`getDockerServiceName('k-social-app') should return 'k-social'`);
        }
        
        logSuccess('k-social-app Docker service name is correct');
        testsPassed++;
    } catch (error) {
        logError(`Test 8 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 9: Legacy profile ID migration
    logInfo('Test 9: Legacy profile ID migration');
    try {
        // Test single migration
        const coreNew = profileManager.migrateProfileId('core');
        if (coreNew !== 'kaspa-node') {
            throw new Error(`'core' should migrate to 'kaspa-node', got '${coreNew}'`);
        }
        
        // Test array migration
        const appsNew = profileManager.migrateProfileId('kaspa-user-applications');
        if (!Array.isArray(appsNew) || !appsNew.includes('kasia-app') || !appsNew.includes('k-social-app')) {
            throw new Error(`'kaspa-user-applications' should migrate to array with kasia-app and k-social-app`);
        }
        
        // Test bulk migration
        const legacyIds = ['core', 'kaspa-user-applications', 'mining'];
        const migratedIds = profileManager.migrateProfileIds(legacyIds);
        
        if (!migratedIds.includes('kaspa-node') ||
             !migratedIds.includes('kasia-app') ||
             !migratedIds.includes('kaspa-stratum')) {
            throw new Error(`Bulk migration failed: ${migratedIds}`);
        }
        
        logSuccess('Legacy profile ID migration works correctly');
        testsPassed++;
    } catch (error) {
        logError(`Test 9 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 10: getProfile with legacy ID
    logInfo('Test 10: getProfile with legacy ID');
    try {
        const profile = profileManager.getProfile('core');
        
        if (!profile) {
            throw new Error('getProfile("core") should return kaspa-node profile');
        }
        
        if (profile.id !== 'kaspa-node') {
            throw new Error(`getProfile("core") should return kaspa-node, got ${profile.id}`);
        }
        
        logSuccess('getProfile handles legacy IDs correctly');
        testsPassed++;
    } catch (error) {
        logError(`Test 10 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 11: Public indexer availability flags
    logInfo('Test 11: Public indexer availability flags');
    try {
        const kasiaApp = profileManager.getProfile('kasia-app');
        const kSocialApp = profileManager.getProfile('k-social-app');
        const explorerBundle = profileManager.getProfile('kaspa-explorer-bundle');
        
        if (!kasiaApp.configuration.publicIndexerAvailable) {
            throw new Error('kasia-app should have publicIndexerAvailable: true');
        }
        
        if (!kSocialApp.configuration.publicIndexerAvailable) {
            throw new Error('k-social-app should have publicIndexerAvailable: true');
        }
        
        if (explorerBundle.configuration.publicIndexerAvailable !== false) {
            throw new Error('kaspa-explorer-bundle should have publicIndexerAvailable: false');
        }
        
        logSuccess('Public indexer availability flags are correct');
        testsPassed++;
    } catch (error) {
        logError(`Test 11 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 12: Resource calculation with new profiles
    logInfo('Test 12: Resource calculation with new profiles');
    try {
        const resources = profileManager.calculateResourceRequirements([
            'kaspa-node', 'kasia-app', 'k-social-app'
        ]);
        
        // kaspa-node: 4GB + kasia-app: 1GB + k-social-app: 1GB = 6GB
        if (resources.minMemory !== 6) {
            throw new Error(`Expected 6GB minMemory, got ${resources.minMemory}GB`);
        }
        
        // CPU should be max (2, 1, 1) = 2
        if (resources.minCpu !== 2) {
            throw new Error(`Expected 2 minCpu, got ${resources.minCpu}`);
        }
        
        // Disk: 100 + 5 + 5 = 110
        if (resources.minDisk !== 110) {
            throw new Error(`Expected 110GB minDisk, got ${resources.minDisk}GB`);
        }
        
        logSuccess('Resource calculation works correctly');
        testsPassed++;
    } catch (error) {
        logError(`Test 12 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 13: Resource calculation with legacy IDs
    logInfo('Test 13: Resource calculation with legacy profile IDs');
    try {
        const resources = profileManager.calculateResourceRequirements(['core']);
        
        // Should migrate 'core' to 'kaspa-node' and calculate correctly
        if (resources.minMemory !== 4) {
            throw new Error(`Expected 4GB minMemory for 'core', got ${resources.minMemory}GB`);
        }
        
        logSuccess('Resource calculation handles legacy IDs');
        testsPassed++;
    } catch (error) {
        logError(`Test 13 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Summary
    logSection('Test Summary');
    console.log(`Tests passed: ${colors.green}${testsPassed}${colors.reset}`);
    console.log(`Tests failed: ${colors.red}${testsFailed}${colors.reset}`);
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        logSuccess('All profile system tests passed! 🎉');
        process.exit(0);
    } else {
        logError(`${testsFailed} test(s) failed`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
