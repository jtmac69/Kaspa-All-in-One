#!/usr/bin/env node

/**
 * Property-Based Test: CORS Resource Loading
 * 
 * **Feature: kaspa-explorer-cors-fix, Property 2: CORS Resource Loading**
 * **Validates: Requirements 1.2, 1.5, 3.1, 3.2, 3.4**
 * 
 * Property: For any external resource (CDN scripts, fonts, stylesheets), 
 * the Kaspa Explorer should load them without CORS errors when properly configured
 */

const fs = require('fs').promises;
const path = require('path');

// Simple property-based testing implementation since fast-check is not available
class SimplePropertyTesting {
  constructor() {
    this.iterations = 100;
  }

  // Generate random external resource URLs that might be used by Kaspa Explorer
  generateExternalResourceUrls() {
    const cdnDomains = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.kaspa.org',
      'indexer.kasia.fyi'
    ];
    
    const resourceTypes = [
      { type: 'script', extensions: ['js'], paths: ['npm/', 'ajax/libs/', 'dist/'] },
      { type: 'stylesheet', extensions: ['css'], paths: ['npm/', 'ajax/libs/', 'css/'] },
      { type: 'font', extensions: ['woff', 'woff2', 'ttf'], paths: ['css/', 'fonts/'] },
      { type: 'api', extensions: [''], paths: ['api/', 'v1/', 'graphql/'] }
    ];
    
    const urls = [];
    
    for (let i = 0; i < 10; i++) {
      const domain = cdnDomains[Math.floor(Math.random() * cdnDomains.length)];
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      const extension = resourceType.extensions[Math.floor(Math.random() * resourceType.extensions.length)];
      const resourcePath = resourceType.paths[Math.floor(Math.random() * resourceType.paths.length)];
      
      const filename = extension ? `resource${i}.${extension}` : `endpoint${i}`;
      const url = `https://${domain}/${resourcePath}${filename}`;
      
      urls.push({
        url,
        type: resourceType.type,
        domain,
        extension
      });
    }
    
    return urls;
  }

  // Generate random nginx configuration variations
  generateNginxConfig() {
    const corsOrigins = ['*', 'https://kaspa.org', 'https://*.kaspa.org', 'null'];
    const corsMethods = [
      'GET, POST, OPTIONS',
      'GET, POST, PUT, DELETE, OPTIONS',
      'GET, OPTIONS',
      '*'
    ];
    const corsHeaders = [
      'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
      'Content-Type,Authorization,X-Requested-With',
      '*'
    ];
    
    return {
      corsOrigin: corsOrigins[Math.floor(Math.random() * corsOrigins.length)],
      corsMethods: corsMethods[Math.floor(Math.random() * corsMethods.length)],
      corsHeaders: corsHeaders[Math.floor(Math.random() * corsHeaders.length)],
      corsCredentials: Math.random() > 0.5,
      gzipEnabled: Math.random() > 0.3,
      cacheEnabled: Math.random() > 0.2
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

// Property 2: CORS Resource Loading
async function testCorsResourceLoading() {
  return await propertyTester.runProperty(async () => {
    const externalResources = propertyTester.generateExternalResourceUrls();
    const nginxConfig = propertyTester.generateNginxConfig();
    
    try {
      // Generate nginx configuration content
      const nginxConfigContent = generateNginxConfigContent(nginxConfig);
      
      // Validate that the configuration allows CORS for external resources
      const corsValidation = validateCorsConfiguration(nginxConfigContent, externalResources);
      
      if (!corsValidation.valid) {
        return {
          success: false,
          error: corsValidation.error,
          input: { nginxConfig, externalResources: externalResources.slice(0, 3) }
        };
      }
      
      // Validate that security headers are present
      const securityValidation = validateSecurityHeaders(nginxConfigContent);
      
      if (!securityValidation.valid) {
        return {
          success: false,
          error: securityValidation.error,
          input: { nginxConfig }
        };
      }
      
      // Validate that resource caching is properly configured
      const cachingValidation = validateResourceCaching(nginxConfigContent);
      
      if (!cachingValidation.valid) {
        return {
          success: false,
          error: cachingValidation.error,
          input: { nginxConfig }
        };
      }
      
      return {
        success: true,
        input: { nginxConfig, resourceCount: externalResources.length }
      };
    } catch (error) {
      return {
        success: false,
        error: `Configuration generation failed: ${error.message}`,
        input: { nginxConfig, externalResources: externalResources.slice(0, 3) }
      };
    }
  }, 'CORS Resource Loading - External resources load without CORS errors');
}

// Helper function to generate nginx configuration content
function generateNginxConfigContent(config) {
  const lines = [
    'server {',
    '    listen 80;',
    '    server_name localhost;',
    '    root /usr/share/nginx/html;',
    '    index index.html;',
    ''
  ];
  
  if (config.gzipEnabled) {
    lines.push(
      '    # Enable gzip compression',
      '    gzip on;',
      '    gzip_vary on;',
      '    gzip_min_length 1024;',
      '    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;',
      ''
    );
  }
  
  lines.push(
    '    # SPA routing - serve index.html for all routes',
    '    location / {',
    '        try_files $uri $uri/ /index.html;',
    '    }',
    ''
  );
  
  if (config.cacheEnabled) {
    lines.push(
      '    # Cache static assets',
      '    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {',
      '        expires 1y;',
      '        add_header Cache-Control "public, immutable";',
      '    }',
      ''
    );
  }
  
  // CORS headers - this is the critical part for the property
  lines.push(
    '    # CORS headers for external resources',
    `    add_header Access-Control-Allow-Origin "${config.corsOrigin}" always;`,
    `    add_header Access-Control-Allow-Methods "${config.corsMethods}" always;`,
    `    add_header Access-Control-Allow-Headers "${config.corsHeaders}" always;`,
    '    add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;'
  );
  
  if (config.corsCredentials) {
    lines.push('    add_header Access-Control-Allow-Credentials "true" always;');
  }
  
  lines.push('');
  
  // Security headers
  lines.push(
    '    # Security headers',
    '    add_header X-Frame-Options "SAMEORIGIN" always;',
    '    add_header X-Content-Type-Options "nosniff" always;',
    '    add_header X-XSS-Protection "1; mode=block" always;',
    '}',
    ''
  );
  
  return lines.join('\n');
}

// Validate CORS configuration allows external resources
function validateCorsConfiguration(nginxConfig, externalResources) {
  // Check that CORS headers are present
  if (!nginxConfig.includes('Access-Control-Allow-Origin')) {
    return {
      valid: false,
      error: 'Missing Access-Control-Allow-Origin header'
    };
  }
  
  if (!nginxConfig.includes('Access-Control-Allow-Methods')) {
    return {
      valid: false,
      error: 'Missing Access-Control-Allow-Methods header'
    };
  }
  
  if (!nginxConfig.includes('Access-Control-Allow-Headers')) {
    return {
      valid: false,
      error: 'Missing Access-Control-Allow-Headers header'
    };
  }
  
  // Check that the origin policy is not too restrictive
  const originMatch = nginxConfig.match(/Access-Control-Allow-Origin\s+"([^"]+)"/);
  if (originMatch) {
    const origin = originMatch[1];
    
    // For external CDN resources, we need either "*" or a wildcard policy
    if (origin !== '*' && !origin.includes('*') && origin !== 'null') {
      // Check if any of the external resources would be blocked
      const blockedResources = externalResources.filter(resource => {
        const resourceDomain = new URL(resource.url).hostname;
        return !origin.includes(resourceDomain);
      });
      
      if (blockedResources.length > 0) {
        return {
          valid: false,
          error: `CORS origin policy "${origin}" would block external resources from: ${blockedResources.map(r => r.domain).join(', ')}`
        };
      }
    }
  }
  
  // Check that methods include GET (required for loading resources)
  const methodsMatch = nginxConfig.match(/Access-Control-Allow-Methods\s+"([^"]+)"/);
  if (methodsMatch) {
    const methods = methodsMatch[1];
    if (!methods.includes('GET') && methods !== '*') {
      return {
        valid: false,
        error: `CORS methods "${methods}" does not include GET, required for loading external resources`
      };
    }
  }
  
  return { valid: true };
}

// Validate security headers are present
function validateSecurityHeaders(nginxConfig) {
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection'
  ];
  
  for (const header of requiredHeaders) {
    if (!nginxConfig.includes(header)) {
      return {
        valid: false,
        error: `Missing security header: ${header}`
      };
    }
  }
  
  return { valid: true };
}

// Validate resource caching configuration
function validateResourceCaching(nginxConfig) {
  // Check if static asset caching is configured
  if (nginxConfig.includes('location ~*') && nginxConfig.includes('expires')) {
    // Caching is configured, validate it's reasonable
    if (nginxConfig.includes('expires 1y') || nginxConfig.includes('Cache-Control')) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: 'Static asset caching is configured but cache duration is not optimal'
      };
    }
  }
  
  // Caching is optional, so if it's not configured, that's still valid
  return { valid: true };
}

// Test the actual kaspa-explorer nginx configuration
async function testCurrentNginxConfig() {
  console.log('\n' + '='.repeat(80));
  console.log('Testing Current Kaspa Explorer nginx.conf');
  console.log('='.repeat(80));
  
  try {
    const nginxConfigPath = path.join(__dirname, '../../kaspa-explorer/nginx.conf');
    const nginxConfig = await fs.readFile(nginxConfigPath, 'utf8');
    
    console.log('✓ Successfully loaded nginx.conf');
    
    // Test with sample external resources
    const sampleResources = [
      { url: 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js', type: 'script', domain: 'cdn.jsdelivr.net' },
      { url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap', type: 'stylesheet', domain: 'fonts.googleapis.com' },
      { url: 'https://indexer.kasia.fyi/api/info', type: 'api', domain: 'indexer.kasia.fyi' }
    ];
    
    const corsValidation = validateCorsConfiguration(nginxConfig, sampleResources);
    if (corsValidation.valid) {
      console.log('✓ CORS configuration allows external resources');
    } else {
      console.log(`✗ CORS configuration issue: ${corsValidation.error}`);
      return false;
    }
    
    const securityValidation = validateSecurityHeaders(nginxConfig);
    if (securityValidation.valid) {
      console.log('✓ Security headers are properly configured');
    } else {
      console.log(`✗ Security headers issue: ${securityValidation.error}`);
      return false;
    }
    
    const cachingValidation = validateResourceCaching(nginxConfig);
    if (cachingValidation.valid) {
      console.log('✓ Resource caching is properly configured');
    } else {
      console.log(`✗ Resource caching issue: ${cachingValidation.error}`);
      return false;
    }
    
    console.log('\n✅ Current nginx.conf passes all CORS resource loading tests');
    return true;
    
  } catch (error) {
    console.log(`✗ Failed to test current nginx.conf: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Property-Based Test: CORS Resource Loading');
  console.log('Feature: kaspa-explorer-cors-fix');
  console.log('Property 2: CORS Resource Loading');
  console.log('Validates: Requirements 1.2, 1.5, 3.1, 3.2, 3.4');
  console.log('='.repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run property-based tests
  console.log('\nRunning property-based tests...');
  const result1 = await testCorsResourceLoading();
  totalPassed += result1.passed;
  totalFailed += result1.failed;
  
  // Test current configuration
  const currentConfigValid = await testCurrentNginxConfig();
  
  console.log('\n' + '='.repeat(80));
  console.log('Final Test Summary');
  console.log('='.repeat(80));
  console.log(`Total property tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Current nginx.conf: ${currentConfigValid ? 'VALID' : 'INVALID'}`);
  
  if (totalFailed === 0 && currentConfigValid) {
    console.log('\n✅ All property tests passed!');
    console.log('The CORS resource loading configuration is working correctly.');
    return true;
  } else {
    console.log('\n❌ Some tests failed');
    if (totalFailed > 0) {
      console.log('There are issues with CORS resource loading configuration.');
    }
    if (!currentConfigValid) {
      console.log('The current nginx.conf has CORS configuration issues.');
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
  testCorsResourceLoading,
  testCurrentNginxConfig
};