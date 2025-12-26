/**
 * Test script for configuration API endpoint
 * This tests the actual HTTP endpoint
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

async function testConfigEndpoint() {
    console.log('Testing Configuration API Endpoint...\n');
    console.log('Make sure the wizard backend is running on port 3000\n');
    
    try {
        // Test 1: Generate default config
        console.log('Test 1: POST /api/config/default');
        const defaultResponse = await makeRequest('POST', '/config/default', {
            profiles: ['core', 'explorer']
        });
        console.log('Status:', defaultResponse.status);
        console.log('Response:', JSON.stringify(defaultResponse.data, null, 2));
        
        if (defaultResponse.status === 200 && defaultResponse.data.config) {
            console.log('✓ Test 1 passed\n');
        } else {
            console.log('✗ Test 1 failed\n');
            return;
        }
        
        // Test 2: Validate config
        console.log('Test 2: POST /api/config/validate');
        const validateResponse = await makeRequest('POST', '/config/validate', defaultResponse.data.config);
        console.log('Status:', validateResponse.status);
        console.log('Valid:', validateResponse.data.valid);
        
        if (validateResponse.status === 200 && validateResponse.data.valid) {
            console.log('✓ Test 2 passed\n');
        } else {
            console.log('✗ Test 2 failed\n');
            console.log('Errors:', validateResponse.data.errors);
            return;
        }
        
        // Test 3: Generate .env content
        console.log('Test 3: POST /api/config/generate');
        const generateResponse = await makeRequest('POST', '/config/generate', {
            config: defaultResponse.data.config,
            profiles: ['core', 'explorer']
        });
        console.log('Status:', generateResponse.status);
        console.log('Success:', generateResponse.data.success);
        
        if (generateResponse.status === 200 && generateResponse.data.success) {
            console.log('Generated content preview:');
            console.log(generateResponse.data.content.split('\n').slice(0, 10).join('\n'));
            console.log('...');
            console.log('✓ Test 3 passed\n');
        } else {
            console.log('✗ Test 3 failed\n');
            return;
        }
        
        console.log('All endpoint tests passed! ✓');
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Could not connect to server. Make sure the wizard backend is running:');
            console.error('  cd services/wizard/backend && npm start');
        } else {
            console.error('Test failed:', error);
        }
        process.exit(1);
    }
}

testConfigEndpoint();

