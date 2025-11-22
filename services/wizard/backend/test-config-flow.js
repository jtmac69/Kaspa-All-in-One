/**
 * Test the complete configuration flow
 * Simulates what the frontend will do
 */

const http = require('http');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testConfigurationFlow() {
    console.log('='.repeat(60));
    console.log('Testing Complete Configuration Flow');
    console.log('='.repeat(60));
    console.log();
    
    try {
        // Simulate user selecting profiles
        console.log('Step 1: User selects profiles');
        const selectedProfiles = ['core', 'explorer'];
        console.log('Selected profiles:', selectedProfiles.join(', '));
        console.log('✓ Profiles selected\n');
        
        // Step 2: User navigates to Configure step
        console.log('Step 2: User navigates to Configure step');
        console.log('Frontend calls: loadConfigurationForm()');
        console.log('This function will:');
        console.log('  1. Get selected profiles from state');
        console.log('  2. Call POST /api/config/default');
        console.log('  3. Populate form fields');
        console.log();
        
        // Make API call
        console.log('Making API call: POST /api/config/default');
        const defaultResponse = await makeRequest('POST', '/config/default', {
            profiles: selectedProfiles
        });
        
        if (defaultResponse.status !== 200 || !defaultResponse.data.config) {
            console.error('✗ Failed to get default configuration');
            console.error('Status:', defaultResponse.status);
            console.error('Response:', defaultResponse.data);
            return false;
        }
        
        console.log('✓ Received default configuration');
        console.log();
        console.log('Configuration received:');
        console.log(JSON.stringify(defaultResponse.data.config, null, 2));
        console.log();
        
        // Step 3: Verify configuration is valid
        console.log('Step 3: Validate configuration');
        const validateResponse = await makeRequest('POST', '/config/validate', 
            defaultResponse.data.config
        );
        
        if (validateResponse.status !== 200 || !validateResponse.data.valid) {
            console.error('✗ Configuration validation failed');
            console.error('Errors:', validateResponse.data.errors);
            return false;
        }
        
        console.log('✓ Configuration is valid');
        console.log();
        
        // Step 4: Simulate user modifying some fields
        console.log('Step 4: User modifies configuration');
        const modifiedConfig = {
            ...defaultResponse.data.config,
            EXTERNAL_IP: '192.168.1.100',
            PUBLIC_NODE: true
        };
        console.log('Modified fields:');
        console.log('  - EXTERNAL_IP: 192.168.1.100');
        console.log('  - PUBLIC_NODE: true');
        console.log();
        
        // Step 5: Validate modified configuration
        console.log('Step 5: Validate modified configuration');
        const validateModifiedResponse = await makeRequest('POST', '/config/validate', 
            modifiedConfig
        );
        
        if (validateModifiedResponse.status !== 200 || !validateModifiedResponse.data.valid) {
            console.error('✗ Modified configuration validation failed');
            console.error('Errors:', validateModifiedResponse.data.errors);
            return false;
        }
        
        console.log('✓ Modified configuration is valid');
        console.log();
        
        // Step 6: Generate .env file content
        console.log('Step 6: Generate .env file content');
        const generateResponse = await makeRequest('POST', '/config/generate', {
            config: modifiedConfig,
            profiles: selectedProfiles
        });
        
        if (generateResponse.status !== 200 || !generateResponse.data.success) {
            console.error('✗ Failed to generate .env content');
            console.error('Response:', generateResponse.data);
            return false;
        }
        
        console.log('✓ Generated .env content');
        console.log();
        console.log('Preview of generated .env:');
        console.log('-'.repeat(60));
        const lines = generateResponse.data.content.split('\n');
        console.log(lines.slice(0, 20).join('\n'));
        if (lines.length > 20) {
            console.log('... (' + (lines.length - 20) + ' more lines)');
        }
        console.log('-'.repeat(60));
        console.log();
        
        // Summary
        console.log('='.repeat(60));
        console.log('✓ All tests passed!');
        console.log('='.repeat(60));
        console.log();
        console.log('Summary:');
        console.log('  ✓ Default configuration loaded');
        console.log('  ✓ Configuration validated');
        console.log('  ✓ User modifications accepted');
        console.log('  ✓ Modified configuration validated');
        console.log('  ✓ .env file content generated');
        console.log();
        console.log('The configuration loading feature is working correctly!');
        
        return true;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Could not connect to server.');
            console.error('Make sure the wizard backend is running:');
            console.error('  cd services/wizard/backend && npm start');
        } else {
            console.error('Test failed:', error);
        }
        return false;
    }
}

testConfigurationFlow().then(success => {
    process.exit(success ? 0 : 1);
});

