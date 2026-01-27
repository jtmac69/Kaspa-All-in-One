#!/usr/bin/env node

/**
 * Template System Test
 * Tests the enhanced template and preset functionality
 */

const ProfileManager = require('./src/utils/profile-manager');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
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
    logSection('Template System Test');
    
    const profileManager = new ProfileManager();
    let testsPassed = 0;
    let testsFailed = 0;
    
    // Test 1: Get all templates
    logInfo('Test 1: Get all templates');
    try {
        const templates = profileManager.getAllTemplates();
        
        if (!Array.isArray(templates)) {
            throw new Error('getAllTemplates should return an array');
        }
        
        if (templates.length !== 12) {
            throw new Error(`Expected 12 templates, got ${templates.length}`);
        }
        
        // Check for required new templates
        const templateIds = templates.map(t => t.id);
        const requiredTemplates = ['kaspa-node', 'quick-start', 'kasia-lite', 'k-social-lite', 
                                   'kasia-suite', 'k-social-suite', 'solo-miner', 'block-explorer',
                                   'kaspa-sovereignty', 'archival-node', 'archival-miner', 'custom-setup'];
        
        for (const required of requiredTemplates) {
            if (!templateIds.includes(required)) {
                throw new Error(`Missing required template: ${required}`);
            }
        }
        
        logSuccess(`Found ${templates.length} templates with all required templates present`);
        testsPassed++;
    } catch (error) {
        logError(`Test 1 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 2: Get templates by category
    logInfo('Test 2: Get templates by category');
    try {
        const beginnerTemplates = profileManager.getTemplatesByCategory('beginner');
        const intermediateTemplates = profileManager.getTemplatesByCategory('intermediate');
        const advancedTemplates = profileManager.getTemplatesByCategory('advanced');
        
        if (!Array.isArray(beginnerTemplates) || !Array.isArray(advancedTemplates)) {
            throw new Error('getTemplatesByCategory should return arrays');
        }
        
        // Should have 4 templates in each category
        if (beginnerTemplates.length !== 4) {
            throw new Error(`Expected 4 beginner templates, got ${beginnerTemplates.length}`);
        }
        
        if (intermediateTemplates.length !== 4) {
            throw new Error(`Expected 4 intermediate templates, got ${intermediateTemplates.length}`);
        }
        
        if (advancedTemplates.length !== 4) {
            throw new Error(`Expected 4 advanced templates, got ${advancedTemplates.length}`);
        }
        
        // kaspa-node should be beginner
        const kaspaNode = beginnerTemplates.find(t => t.id === 'kaspa-node');
        if (!kaspaNode) {
            throw new Error('kaspa-node template should be in beginner category');
        }
        
        // kaspa-sovereignty should be advanced
        const sovereignty = advancedTemplates.find(t => t.id === 'kaspa-sovereignty');
        if (!sovereignty) {
            throw new Error('kaspa-sovereignty template should be in advanced category');
        }
        
        logSuccess(`Category filtering works: ${beginnerTemplates.length} beginner, ${intermediateTemplates.length} intermediate, ${advancedTemplates.length} advanced`);
        testsPassed++;
    } catch (error) {
        logError(`Test 2 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 3: Get templates by use case
    logInfo('Test 3: Get templates by use case');
    try {
        const personalTemplates = profileManager.getTemplatesByUseCase('personal');
        const productionTemplates = profileManager.getTemplatesByUseCase('production');
        const miningTemplates = profileManager.getTemplatesByUseCase('mining');
        
        if (!Array.isArray(personalTemplates) || !Array.isArray(productionTemplates)) {
            throw new Error('getTemplatesByUseCase should return arrays');
        }
        
        // kaspa-node should be personal
        const kaspaNode = personalTemplates.find(t => t.id === 'kaspa-node');
        if (!kaspaNode) {
            throw new Error('kaspa-node template should be for personal use case');
        }
        
        // archival-node should be production
        const archivalNode = productionTemplates.find(t => t.id === 'archival-node');
        if (!archivalNode) {
            throw new Error('archival-node template should be for production use case');
        }
        
        // solo-miner should be mining
        const soloMiner = miningTemplates.find(t => t.id === 'solo-miner');
        if (!soloMiner) {
            throw new Error('solo-miner template should be for mining use case');
        }
        
        logSuccess(`Use case filtering works: ${personalTemplates.length} personal, ${productionTemplates.length} production, ${miningTemplates.length} mining`);
        testsPassed++;
    } catch (error) {
        logError(`Test 3 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 4: Search templates by tags
    logInfo('Test 4: Search templates by tags');
    try {
        const beginnerTemplates = profileManager.searchTemplatesByTags(['beginner']);
        const developmentTemplates = profileManager.searchTemplatesByTags(['development']);
        
        if (!Array.isArray(beginnerTemplates) || !Array.isArray(developmentTemplates)) {
            throw new Error('searchTemplatesByTags should return arrays');
        }
        
        // Should find templates with matching tags
        if (beginnerTemplates.length === 0) {
            throw new Error('Should find templates with beginner tag');
        }
        
        if (developmentTemplates.length === 0) {
            throw new Error('Should find templates with development tag');
        }
        
        logSuccess(`Tag search works: ${beginnerTemplates.length} beginner, ${developmentTemplates.length} development`);
        testsPassed++;
    } catch (error) {
        logError(`Test 4 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 5: Apply template configuration
    logInfo('Test 5: Apply template configuration');
    try {
        const baseConfig = {
            EXISTING_SETTING: 'value'
        };
        
        const config = profileManager.applyTemplate('kaspa-node', baseConfig);
        
        if (typeof config !== 'object') {
            throw new Error('applyTemplate should return an object');
        }
        
        // Should preserve existing settings
        if (config.EXISTING_SETTING !== 'value') {
            throw new Error('Should preserve existing configuration');
        }
        
        // Should apply template settings
        if (config.PUBLIC_NODE !== false) {
            throw new Error('Should apply template configuration (PUBLIC_NODE should be false for kaspa-node)');
        }
        
        if (config.KASPA_NODE_RPC_PORT !== 16110) {
            throw new Error('Should apply template port configuration');
        }
        
        logSuccess('Template configuration applied correctly');
        testsPassed++;
    } catch (error) {
        logError(`Test 5 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 6: Validate template
    logInfo('Test 6: Validate template');
    try {
        const validation = profileManager.validateTemplate('kaspa-node');
        
        if (typeof validation !== 'object') {
            throw new Error('validateTemplate should return an object');
        }
        
        if (validation.valid !== true) {
            throw new Error(`Template validation should pass, got: ${validation.errors?.join(', ')}`);
        }
        
        // Test invalid template
        const invalidValidation = profileManager.validateTemplate('non-existent');
        if (invalidValidation.valid !== false) {
            throw new Error('Invalid template should fail validation');
        }
        
        // Test legacy template validation (should work with deprecation warning)
        const legacyValidation = profileManager.validateTemplate('home-node');
        if (legacyValidation.valid !== true) {
            throw new Error('Legacy template validation should pass');
        }
        if (!legacyValidation.warnings || legacyValidation.warnings.length === 0) {
            throw new Error('Legacy template validation should include deprecation warning');
        }
        
        logSuccess('Template validation works correctly');
        testsPassed++;
    } catch (error) {
        logError(`Test 6 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 7: Create custom template
    logInfo('Test 7: Create custom template');
    try {
        const templateData = {
            id: 'test-custom',
            name: 'Test Custom Template',
            description: 'A test custom template',
            profiles: ['kaspa-node'],
            config: {
                TEST_SETTING: 'test_value'
            },
            metadata: {
                category: 'custom',
                useCase: 'testing',
                tags: ['test', 'custom']
            }
        };
        
        const customTemplate = profileManager.createCustomTemplate(templateData);
        
        if (typeof customTemplate !== 'object') {
            throw new Error('createCustomTemplate should return an object');
        }
        
        if (customTemplate.id !== 'test-custom') {
            throw new Error('Custom template should have correct ID');
        }
        
        if (!customTemplate.custom) {
            throw new Error('Custom template should be marked as custom');
        }
        
        if (!customTemplate.createdAt) {
            throw new Error('Custom template should have createdAt timestamp');
        }
        
        // Test saving custom template
        const saved = profileManager.saveCustomTemplate(customTemplate);
        if (!saved) {
            throw new Error('Should be able to save custom template');
        }
        
        // Verify it's accessible
        const retrieved = profileManager.getTemplate('test-custom');
        if (!retrieved) {
            throw new Error('Should be able to retrieve saved custom template');
        }
        
        logSuccess('Custom template creation and saving works');
        testsPassed++;
    } catch (error) {
        logError(`Test 7 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 8: Template recommendations
    logInfo('Test 8: Template recommendations');
    try {
        const systemResources = {
            memory: 16, // 16GB RAM
            cpu: 8,     // 8 CPU cores
            disk: 1000  // 1TB disk
        };
        
        const recommendations = profileManager.getTemplateRecommendations(systemResources, 'personal');
        
        if (!Array.isArray(recommendations)) {
            throw new Error('getTemplateRecommendations should return an array');
        }
        
        if (recommendations.length === 0) {
            throw new Error('Should return recommendations for good system resources');
        }
        
        // Check recommendation structure
        const firstRec = recommendations[0];
        if (!firstRec.template || typeof firstRec.score !== 'number' || !firstRec.suitability) {
            throw new Error('Recommendation should have template, score, and suitability');
        }
        
        // Should be sorted by score (highest first)
        for (let i = 1; i < recommendations.length; i++) {
            if (recommendations[i].score > recommendations[i-1].score) {
                throw new Error('Recommendations should be sorted by score (highest first)');
            }
        }
        
        logSuccess(`Template recommendations work: ${recommendations.length} recommendations, top score: ${firstRec.score}`);
        testsPassed++;
    } catch (error) {
        logError(`Test 8 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 9: Legacy template backward compatibility
    logInfo('Test 9: Legacy template backward compatibility');
    try {
        // Test that legacy template IDs still work via aliases
        const legacyTemplate = profileManager.getTemplate('home-node');
        if (!legacyTemplate) {
            throw new Error('Legacy home-node template should be accessible');
        }
        
        if (legacyTemplate._aliasOf !== 'kaspa-node') {
            throw new Error('Legacy home-node should alias to kaspa-node');
        }
        
        // Test migrateTemplateId
        const migratedId = profileManager.migrateTemplateId('full-node');
        if (migratedId !== 'kaspa-sovereignty') {
            throw new Error('full-node should migrate to kaspa-sovereignty');
        }
        
        // Test isLegacyTemplateId
        if (!profileManager.isLegacyTemplateId('home-node')) {
            throw new Error('home-node should be identified as legacy');
        }
        
        if (profileManager.isLegacyTemplateId('kaspa-node')) {
            throw new Error('kaspa-node should NOT be identified as legacy');
        }
        
        // Test that legacy templates are excluded from getAllTemplates
        const allTemplates = profileManager.getAllTemplates();
        const hasLegacy = allTemplates.some(t => t._isLegacyAlias);
        if (hasLegacy) {
            throw new Error('Legacy aliases should be excluded from getAllTemplates');
        }
        
        logSuccess('Legacy template backward compatibility works');
        testsPassed++;
    } catch (error) {
        logError(`Test 9 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Summary
    logSection('Test Summary');
    console.log(`Tests passed: ${colors.green}${testsPassed}${colors.reset}`);
    console.log(`Tests failed: ${colors.red}${testsFailed}${colors.reset}`);
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        logSuccess('All template system tests passed! 🎉');
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