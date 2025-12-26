#!/usr/bin/env node

/**
 * Template API Test
 * Tests the template API endpoints
 */

const express = require('express');
const request = require('supertest');
const profilesRouter = require('./src/api/profiles');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/profiles', profilesRouter);

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

async function runAPITests() {
    logSection('Template API Test');
    
    let testsPassed = 0;
    let testsFailed = 0;
    
    // Test 1: GET /api/profiles/templates/all
    logInfo('Test 1: GET /api/profiles/templates/all');
    try {
        const response = await request(app)
            .get('/api/profiles/templates/all')
            .expect(200);
        
        if (!response.body.templates || !Array.isArray(response.body.templates)) {
            throw new Error('Response should contain templates array');
        }
        
        if (response.body.templates.length < 4) {
            throw new Error(`Expected at least 4 templates, got ${response.body.templates.length}`);
        }
        
        logSuccess(`GET /templates/all returned ${response.body.templates.length} templates`);
        testsPassed++;
    } catch (error) {
        logError(`Test 1 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 2: GET /api/profiles/templates/:id
    logInfo('Test 2: GET /api/profiles/templates/:id');
    try {
        const response = await request(app)
            .get('/api/profiles/templates/home-node')
            .expect(200);
        
        if (!response.body.id || response.body.id !== 'home-node') {
            throw new Error('Response should contain home-node template');
        }
        
        if (!response.body.name || !response.body.description) {
            throw new Error('Template should have name and description');
        }
        
        logSuccess('GET /templates/:id returned correct template');
        testsPassed++;
    } catch (error) {
        logError(`Test 2 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 3: GET /api/profiles/templates/category/:category
    logInfo('Test 3: GET /api/profiles/templates/category/:category');
    try {
        const response = await request(app)
            .get('/api/profiles/templates/category/beginner')
            .expect(200);
        
        if (!response.body.templates || !Array.isArray(response.body.templates)) {
            throw new Error('Response should contain templates array');
        }
        
        // All returned templates should be beginner category
        for (const template of response.body.templates) {
            if (template.category !== 'beginner') {
                throw new Error(`Template ${template.id} should be beginner category`);
            }
        }
        
        logSuccess(`GET /templates/category/beginner returned ${response.body.templates.length} templates`);
        testsPassed++;
    } catch (error) {
        logError(`Test 3 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 4: POST /api/profiles/templates/search
    logInfo('Test 4: POST /api/profiles/templates/search');
    try {
        const response = await request(app)
            .post('/api/profiles/templates/search')
            .send({ tags: ['beginner', 'personal'] })
            .expect(200);
        
        if (!response.body.templates || !Array.isArray(response.body.templates)) {
            throw new Error('Response should contain templates array');
        }
        
        logSuccess(`POST /templates/search returned ${response.body.templates.length} templates`);
        testsPassed++;
    } catch (error) {
        logError(`Test 4 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 5: POST /api/profiles/templates/recommendations
    logInfo('Test 5: POST /api/profiles/templates/recommendations');
    try {
        const response = await request(app)
            .post('/api/profiles/templates/recommendations')
            .send({
                systemResources: { memory: 16, cpu: 8, disk: 1000 },
                useCase: 'personal'
            })
            .expect(200);
        
        if (!response.body.recommendations || !Array.isArray(response.body.recommendations)) {
            throw new Error('Response should contain recommendations array');
        }
        
        // Check recommendation structure
        if (response.body.recommendations.length > 0) {
            const rec = response.body.recommendations[0];
            if (!rec.template || typeof rec.score !== 'number') {
                throw new Error('Recommendation should have template and score');
            }
        }
        
        logSuccess(`POST /templates/recommendations returned ${response.body.recommendations.length} recommendations`);
        testsPassed++;
    } catch (error) {
        logError(`Test 5 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 6: POST /api/profiles/templates/:id/apply
    logInfo('Test 6: POST /api/profiles/templates/:id/apply');
    try {
        const response = await request(app)
            .post('/api/profiles/templates/home-node/apply')
            .send({ baseConfig: { EXISTING_SETTING: 'value' } })
            .expect(200);
        
        if (!response.body.config || typeof response.body.config !== 'object') {
            throw new Error('Response should contain config object');
        }
        
        // Should preserve existing settings
        if (response.body.config.EXISTING_SETTING !== 'value') {
            throw new Error('Should preserve existing configuration');
        }
        
        // Should apply template settings
        if (response.body.config.PUBLIC_NODE !== 'false') {
            throw new Error('Should apply template configuration');
        }
        
        logSuccess('POST /templates/:id/apply returned correct configuration');
        testsPassed++;
    } catch (error) {
        logError(`Test 6 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 7: POST /api/profiles/templates/:id/validate
    logInfo('Test 7: POST /api/profiles/templates/:id/validate');
    try {
        const response = await request(app)
            .post('/api/profiles/templates/home-node/validate')
            .expect(200);
        
        if (typeof response.body.valid !== 'boolean') {
            throw new Error('Response should contain valid boolean');
        }
        
        if (response.body.valid !== true) {
            throw new Error(`Template validation should pass, got: ${response.body.errors?.join(', ')}`);
        }
        
        logSuccess('POST /templates/:id/validate returned correct validation');
        testsPassed++;
    } catch (error) {
        logError(`Test 7 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 8: POST /api/profiles/templates (create custom template)
    logInfo('Test 8: POST /api/profiles/templates (create custom)');
    try {
        const templateData = {
            id: 'test-api-custom',
            name: 'Test API Custom Template',
            description: 'A test custom template via API',
            profiles: ['core'],
            config: { TEST_SETTING: 'api_test' }
        };
        
        const response = await request(app)
            .post('/api/profiles/templates')
            .send(templateData)
            .expect(201);
        
        if (!response.body.success) {
            throw new Error('Response should indicate success');
        }
        
        if (!response.body.template || response.body.template.id !== 'test-api-custom') {
            throw new Error('Response should contain created template');
        }
        
        logSuccess('POST /templates created custom template successfully');
        testsPassed++;
    } catch (error) {
        logError(`Test 8 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 9: DELETE /api/profiles/templates/:id (delete custom template)
    logInfo('Test 9: DELETE /api/profiles/templates/:id');
    try {
        const response = await request(app)
            .delete('/api/profiles/templates/test-api-custom')
            .expect(200);
        
        if (!response.body.success) {
            throw new Error('Response should indicate success');
        }
        
        logSuccess('DELETE /templates/:id deleted custom template successfully');
        testsPassed++;
    } catch (error) {
        logError(`Test 9 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Test 10: Error handling - non-existent template
    logInfo('Test 10: Error handling - non-existent template');
    try {
        await request(app)
            .get('/api/profiles/templates/non-existent')
            .expect(404);
        
        logSuccess('GET /templates/non-existent returned 404 as expected');
        testsPassed++;
    } catch (error) {
        logError(`Test 10 failed: ${error.message}`);
        testsFailed++;
    }
    
    // Summary
    logSection('API Test Summary');
    console.log(`Tests passed: ${colors.green}${testsPassed}${colors.reset}`);
    console.log(`Tests failed: ${colors.red}${testsFailed}${colors.reset}`);
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        logSuccess('All template API tests passed! 🎉');
        process.exit(0);
    } else {
        logError(`${testsFailed} test(s) failed`);
        process.exit(1);
    }
}

// Check if supertest is available
try {
    require('supertest');
    runAPITests().catch(error => {
        logError(`API test runner failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
} catch (error) {
    console.log(`${colors.yellow}⚠ Supertest not available, skipping API tests${colors.reset}`);
    console.log('To run API tests, install supertest: npm install --save-dev supertest');
    process.exit(0);
}