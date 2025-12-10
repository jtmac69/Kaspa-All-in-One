#!/usr/bin/env node

/**
 * Property-Based Test: API CORS Compliance
 * 
 * **Feature: kaspa-explorer-cors-fix, Property 4: API CORS Compliance**
 * **Validates: Requirements 3.3**
 * 
 * Property: For any API call made by the Kaspa Explorer, 
 * the CORS policy should permit the request without blocking
 */

const fs = require('fs').promises;
const path = require('path');

// Simple property-based testing implementation
class SimplePropertyTesting {
  constructor() {
    this.iterations = 100;
  }

  // Generate random API endpoints that Kaspa Explorer might call
  generateApiEndpoints() {
    const apiDomains = [
      'api.kaspa.org',
      'indexer.kasia.fyi',
      'kaspa-node:16111',
      'localhost:16111',
      'kaspa-stratum:5555',
      'k-indexer:8080',
      'kasia-indexer:8080'
    ];
    
    const apiPaths = [
      '/info',
      '/blocks',
      '/transactions',
      '/addresses',
      '/utxos',
      '/balance',
      '/mempool',
      '/network',
      '/stats',
      '/health'
    ];
    
    const httpMethods = ['GET', 'POST', 'OPTIONS'];
    const protocols = ['http', 'https'];
    
    const endpoints = [];
    
    for (let i = 0; i < 15; i++) {
      const domain = apiDomains[Math.floor(Math.random() * apiDomains.length)];
      const apiPath = apiPaths[Math.floor(Math.random() * apiPaths.length)];
      const method = httpMethods[Math.floor(Math.random() * httpMethods.length)];
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      
      // For internal services, use http; for external APIs, prefer https
      const finalProtocol = domain.includes(':') || domain === 'localhost:16111' ? 'http' : protocol;
      
      endpoints.push({
        url: `${finalProtocol}://${domain}${apiPath}`,
        method,
        domain,
        path: apiPath,
        isInternal: domain.includes(':') || domain.startsWith('localhost'),
        isExternal: !domain.includes(':') && !domain.startsWith('localhost')
      });
    }
    
    return endpoints;
  }

  // Generate random CORS configurations for nginx
  generateCorsConfiguration() {
    const origins = [
      '*',
      'http://localhost:3004',
      'https://kaspa.org',
      'https://*.kaspa.org',
      'http://localhost:*',
      'null'
    ];
    
    const methods = [
      'GET, POST, OPTIONS',
      'GET, POST, PUT, DELETE, OPTIONS',
      'GET, OPTIONS',
      '*',
      'GET, POST, PATCH, DELETE, OPTIONS'
    ];
    
    const headers = [
      'Content-Type,Authorization,X-Requested-With',
      'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
      'Content-Type,Accept,Authorization',
      '*',
      'Content-Type,X-API-Key,Authorization'
    ];
    
    return {
      allowOrigin: origins[Math.floor(Math.random() * origins.length)],
      allowMethods: methods[Math.floor(Math.random() * methods.length)],
      allowHeaders: headers[Math.floor(Math.random() * headers.length)],
      allowCredentials: Math.random() > 0.5,
      maxAge: Math.floor(Math.random() * 86400) + 3600 // 1-24 hours
    };
  }

  async runProperty(propertyFn, description) {
    console.log(`\nTesting Property: ${description}`);
    console.log('-'.repeat(80));
    
    let passed = 0;
    let failed = 0;
    const failures = [];
    
    for (let i = 0; i < this.iterations; i++) {
      try {
        const result = await propertyFn();
        if (result.success) {
          passed++;
        } else {
          failed++;
          failures.push({
            iteration: i + 1,
            error: result.error,
            input: result.input
          });
        }
      } catch (error) {
        failed++;
        failures.push({
          iteration: i + 1,
          error: error.message,
          input: 'Exception during test execution'
        });
      }
    }
    
    console.log(`Results: ${passed} passed, ${failed} failed out of ${this.iterations} iterations`);
    
    if (failed > 0) {
      console.log('\nFailure Examples:');
      failures.slice(0, 3).forEach(failure => {
        console.log(`  Iteration ${failure.iteration}: ${failure.error}`);
        if (failure.input && typeof failure.input === 'object') {
          console.log(`    Input: ${JSON.stringify(failure.input, null, 2)}`);
        }
      });
    }
    
    return { passed, failed, failures };
  }
}

const propertyTester = new SimplePropertyTesting();

// Property 4: API CORS Compliance
async function testApiCorsCompliance() {
  return await propertyTester.runProperty(async () => {
    const apiEndpoints = propertyTester.generateApiEndpoints();
    const corsConfig = propertyTester.generateCorsConfiguration();
    
    try {
      // Generate nginx configuration with CORS settings
      const nginxConfig = generateNginxConfigWithCors(corsConfig);
      
      // Validate that API calls would be allowed by CORS policy
      const corsValidation = validateApiCorsPolicy(nginxConfig, apiEndpoints, corsConfig);
      
      if (!corsValidation.valid) {
        return {
          success: false,
          error: corsValidation.error,
          input: { 
            corsConfig, 
            blockedEndpoints: corsValidation.blockedEndpoints?.slice(0, 3) 
          }
        };
      }
      
      // Validate preflight OPTIONS requests are handled
      const preflightValidation = validatePreflightHandling(nginxConfig, apiEndpoints);
      
      if (!preflightValidation.valid) {
        return {
          success: false,
          error: preflightValidation.error,
          input: { corsConfig, endpoints: apiEndpoints.slice(0, 3) }
        };
      }
      
      // Validate credentials handling is consistent
      const credentialsValidation = validateCredentialsHandling(nginxConfig, corsConfig);
      
      if (!credentialsValidation.valid) {
        return {
          success: false,
          error: credentialsValidation.error,
          input: { corsConfig }
        };
      }
      
      return {
        success: true,
        input: { 
          corsConfig, 
          endpointCount: apiEndpoints.length,
          allowedMethods: corsConfig.allowMethods
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `CORS configuration generation failed: ${error.message}`,
        input: { corsConfig, endpointCount: apiEndpoints.length }
      };
    }
  }, 'API CORS Compliance - API calls are permitted by CORS policy');
}

// Generate nginx configuration with CORS settings
function generateNginxConfigWithCors(corsConfig) {
  const lines = [
    'server {',
    '    listen 80;',
    '    server_name localhost;',
    '    root /usr/share/nginx/html;',
    '    index index.html;',
    '',
    '    # SPA routing',
    '    location / {',
    '        try_files $uri $uri/ /index.html;',
    '    }',
    '',
    '    # CORS headers for API calls',
    `    add_header Access-Control-Allow-Origin "${corsConfig.allowOrigin}" always;`,
    `    add_header Access-Control-Allow-Methods "${corsConfig.allowMethods}" always;`,
    `    add_header Access-Control-Allow-Headers "${corsConfig.allowHeaders}" always;`,
    '    add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;'
  ];
  
  if (corsConfig.allowCredentials) {
    lines.push('    add_header Access-Control-Allow-Credentials "true" always;');
  }
  
  if (corsConfig.maxAge) {
    lines.push(`    add_header Access-Control-Max-Age "${corsConfig.maxAge}" always;`);
  }
  
  lines.push(
    '',
    '    # Handle preflight OPTIONS requests',
    '    if ($request_method = OPTIONS) {',
    '        return 204;',
    '    }',
    '',
    '    # Proxy API calls to backend services',
    '    location /api/ {',
    '        proxy_pass http://backend-service/;',
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto $scheme;',
    '    }',
    '}',
    ''
  );
  
  return lines.join('\n');
}

// Validate that API calls would be allowed by CORS policy
function validateApiCorsPolicy(nginxConfig, apiEndpoints, corsConfig) {
  const blockedEndpoints = [];
  
  // Check origin policy
  const originHeader = corsConfig.allowOrigin;
  
  for (const endpoint of apiEndpoints) {
    // Check if the method is allowed
    const allowedMethods = corsConfig.allowMethods;
    if (allowedMethods !== '*' && !allowedMethods.includes(endpoint.method)) {
      blockedEndpoints.push({
        ...endpoint,
        reason: `Method ${endpoint.method} not allowed by CORS policy: ${allowedMethods}`
      });
      continue;
    }
    
    // Check origin restrictions for external APIs
    if (endpoint.isExternal && originHeader !== '*') {
      // For external APIs, we need to ensure the origin policy allows cross-origin requests
      if (originHeader === 'null' || (!originHeader.includes('*') && !originHeader.includes('localhost'))) {
        blockedEndpoints.push({
          ...endpoint,
          reason: `External API call would be blocked by restrictive origin policy: ${originHeader}`
        });
        continue;
      }
    }
    
    // Check credentials handling for secure endpoints
    if (endpoint.url.startsWith('https://') && corsConfig.allowCredentials && originHeader === '*') {
      blockedEndpoints.push({
        ...endpoint,
        reason: 'Cannot use credentials with wildcard origin for HTTPS endpoints'
      });
      continue;
    }
  }
  
  if (blockedEndpoints.length > 0) {
    return {
      valid: false,
      error: `CORS policy would block ${blockedEndpoints.length} API endpoints`,
      blockedEndpoints
    };
  }
  
  return { valid: true };
}

// Validate preflight OPTIONS requests are handled
function validatePreflightHandling(nginxConfig, apiEndpoints) {
  // Check if OPTIONS method is allowed
  if (!nginxConfig.includes('OPTIONS')) {
    return {
      valid: false,
      error: 'CORS configuration does not allow OPTIONS method required for preflight requests'
    };
  }
  
  // Check if there's explicit handling for OPTIONS requests
  if (!nginxConfig.includes('$request_method = OPTIONS') && !nginxConfig.includes('if ($request_method = "OPTIONS")')) {
    // This is a warning, not a failure - some configurations handle OPTIONS implicitly
    console.log('   Warning: No explicit OPTIONS request handling found');
  }
  
  // Check that required headers are exposed for preflight
  const requiredHeaders = ['Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'];
  for (const header of requiredHeaders) {
    if (!nginxConfig.includes(header)) {
      return {
        valid: false,
        error: `Missing required preflight header: ${header}`
      };
    }
  }
  
  return { valid: true };
}

// Validate credentials handling is consistent
function validateCredentialsHandling(nginxConfig, corsConfig) {
  const hasCredentials = nginxConfig.includes('Access-Control-Allow-Credentials');
  const allowsCredentials = corsConfig.allowCredentials;
  
  if (allowsCredentials && !hasCredentials) {
    return {
      valid: false,
      error: 'CORS configuration allows credentials but header is not set in nginx'
    };
  }
  
  if (hasCredentials && corsConfig.allowOrigin === '*') {
    return {
      valid: false,
      error: 'Cannot use Access-Control-Allow-Credentials with wildcard origin'
    };
  }
  
  return { valid: true };
}

// Test the actual kaspa-explorer nginx configuration for API CORS compliance
async function testCurrentNginxApiCors() {
  console.log('\n' + '='.repeat(80));
  console.log('Testing Current Kaspa Explorer nginx.conf for API CORS Compliance');
  console.log('='.repeat(80));
  
  try {
    const nginxConfigPath = path.join(__dirname, '../../kaspa-explorer/nginx.conf');
    const nginxConfig = await fs.readFile(nginxConfigPath, 'utf8');
    
    console.log('✓ Successfully loaded nginx.conf');
    
    // Test with sample API endpoints that Kaspa Explorer might call
    const sampleApiEndpoints = [
      { url: 'https://api.kaspa.org/info', method: 'GET', domain: 'api.kaspa.org', isExternal: true },
      { url: 'http://kaspa-node:16111/getinfo', method: 'POST', domain: 'kaspa-node:16111', isInternal: true },
      { url: 'https://indexer.kasia.fyi/api/blocks', method: 'GET', domain: 'indexer.kasia.fyi', isExternal: true },
      { url: 'http://k-indexer:8080/transactions', method: 'GET', domain: 'k-indexer:8080', isInternal: true }
    ];
    
    // Extract CORS configuration from current nginx.conf
    const currentCorsConfig = extractCorsConfigFromNginx(nginxConfig);
    
    console.log('Current CORS Configuration:');
    console.log(`  Origin: ${currentCorsConfig.allowOrigin}`);
    console.log(`  Methods: ${currentCorsConfig.allowMethods}`);
    console.log(`  Headers: ${currentCorsConfig.allowHeaders}`);
    console.log(`  Credentials: ${currentCorsConfig.allowCredentials}`);
    
    // Validate API CORS policy
    const corsValidation = validateApiCorsPolicy(nginxConfig, sampleApiEndpoints, currentCorsConfig);
    if (corsValidation.valid) {
      console.log('✓ API CORS policy allows required API calls');
    } else {
      console.log(`✗ API CORS policy issue: ${corsValidation.error}`);
      if (corsValidation.blockedEndpoints) {
        console.log('  Blocked endpoints:');
        corsValidation.blockedEndpoints.slice(0, 3).forEach(endpoint => {
          console.log(`    - ${endpoint.method} ${endpoint.url}: ${endpoint.reason}`);
        });
      }
      return false;
    }
    
    // Validate preflight handling
    const preflightValidation = validatePreflightHandling(nginxConfig, sampleApiEndpoints);
    if (preflightValidation.valid) {
      console.log('✓ Preflight OPTIONS requests are properly handled');
    } else {
      console.log(`✗ Preflight handling issue: ${preflightValidation.error}`);
      return false;
    }
    
    // Validate credentials handling
    const credentialsValidation = validateCredentialsHandling(nginxConfig, currentCorsConfig);
    if (credentialsValidation.valid) {
      console.log('✓ Credentials handling is consistent');
    } else {
      console.log(`✗ Credentials handling issue: ${credentialsValidation.error}`);
      return false;
    }
    
    console.log('\n✅ Current nginx.conf passes all API CORS compliance tests');
    return true;
    
  } catch (error) {
    console.log(`✗ Failed to test current nginx.conf: ${error.message}`);
    return false;
  }
}

// Extract CORS configuration from nginx.conf content
function extractCorsConfigFromNginx(nginxConfig) {
  const config = {
    allowOrigin: '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type',
    allowCredentials: false,
    maxAge: null
  };
  
  // Extract Access-Control-Allow-Origin
  const originMatch = nginxConfig.match(/add_header\s+Access-Control-Allow-Origin\s+"([^"]+)"/);
  if (originMatch) {
    config.allowOrigin = originMatch[1];
  }
  
  // Extract Access-Control-Allow-Methods
  const methodsMatch = nginxConfig.match(/add_header\s+Access-Control-Allow-Methods\s+"([^"]+)"/);
  if (methodsMatch) {
    config.allowMethods = methodsMatch[1];
  }
  
  // Extract Access-Control-Allow-Headers
  const headersMatch = nginxConfig.match(/add_header\s+Access-Control-Allow-Headers\s+"([^"]+)"/);
  if (headersMatch) {
    config.allowHeaders = headersMatch[1];
  }
  
  // Check for Access-Control-Allow-Credentials
  config.allowCredentials = nginxConfig.includes('Access-Control-Allow-Credentials');
  
  // Extract Access-Control-Max-Age
  const maxAgeMatch = nginxConfig.match(/add_header\s+Access-Control-Max-Age\s+"([^"]+)"/);
  if (maxAgeMatch) {
    config.maxAge = parseInt(maxAgeMatch[1]);
  }
  
  return config;
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Property-Based Test: API CORS Compliance');
  console.log('Feature: kaspa-explorer-cors-fix');
  console.log('Property 4: API CORS Compliance');
  console.log('Validates: Requirements 3.3');
  console.log('='.repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run property-based tests
  console.log('\nRunning property-based tests...');
  const result1 = await testApiCorsCompliance();
  totalPassed += result1.passed;
  totalFailed += result1.failed;
  
  // Test current configuration
  const currentConfigValid = await testCurrentNginxApiCors();
  
  console.log('\n' + '='.repeat(80));
  console.log('Final Test Summary');
  console.log('='.repeat(80));
  console.log(`Total property tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Current nginx.conf: ${currentConfigValid ? 'VALID' : 'INVALID'}`);
  
  if (totalFailed === 0 && currentConfigValid) {
    console.log('\n✅ All property tests passed!');
    console.log('The API CORS compliance configuration is working correctly.');
    return true;
  } else {
    console.log('\n❌ Some tests failed');
    if (totalFailed > 0) {
      console.log('There are issues with API CORS compliance configuration.');
    }
    if (!currentConfigValid) {
      console.log('The current nginx.conf has API CORS compliance issues.');
    }
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testApiCorsCompliance,
  testCurrentNginxApiCors
};