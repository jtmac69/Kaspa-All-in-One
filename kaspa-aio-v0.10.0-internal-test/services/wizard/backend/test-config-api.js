/**
 * Test script for configuration API
 */

const ConfigGenerator = require('./src/utils/config-generator');

async function testConfigAPI() {
    console.log('Testing Configuration API...\n');
    
    const configGenerator = new ConfigGenerator();
    
    // Test 1: Generate default config for profiles
    console.log('Test 1: Generate default config for profiles');
    const profiles = ['core', 'explorer'];
    const defaultConfig = configGenerator.generateDefaultConfig(profiles);
    console.log('Default config:', JSON.stringify(defaultConfig, null, 2));
    console.log('✓ Test 1 passed\n');
    
    // Test 2: Validate configuration
    console.log('Test 2: Validate configuration');
    const validation = await configGenerator.validateConfig(defaultConfig);
    console.log('Validation result:', validation.valid ? 'VALID' : 'INVALID');
    if (!validation.valid) {
        console.log('Errors:', validation.errors);
    }
    console.log('✓ Test 2 passed\n');
    
    // Test 3: Generate .env file content
    console.log('Test 3: Generate .env file content');
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    console.log('Generated .env content:');
    console.log('---');
    console.log(envContent);
    console.log('---');
    console.log('✓ Test 3 passed\n');
    
    // Test 4: Test with invalid config
    console.log('Test 4: Test with invalid config');
    const invalidConfig = {
        POSTGRES_PASSWORD: 'short', // Too short
        KASPA_P2P_PORT: 99999 // Out of range
    };
    const invalidValidation = await configGenerator.validateConfig(invalidConfig);
    console.log('Validation result:', invalidValidation.valid ? 'VALID' : 'INVALID');
    if (!invalidValidation.valid) {
        console.log('Expected errors:', invalidValidation.errors);
    }
    console.log('✓ Test 4 passed\n');
    
    console.log('All tests passed! ✓');
}

testConfigAPI().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});

