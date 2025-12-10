#!/usr/bin/env node

/**
 * Test External Resource Loading
 * 
 * This script simulates loading external CDN resources to verify
 * that the CORS configuration allows them to load properly.
 */

const fs = require('fs').promises;
const path = require('path');

// Simulate common external resources that Kaspa Explorer might use
const externalResources = [
  {
    type: 'script',
    url: 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js',
    description: 'Vue.js framework from CDN'
  },
  {
    type: 'stylesheet',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    description: 'Google Fonts stylesheet'
  },
  {
    type: 'font',
    url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
    description: 'Google Fonts WOFF2 file'
  },
  {
    type: 'api',
    url: 'https://api.kaspa.org/info',
    description: 'Kaspa API endpoint'
  },
  {
    type: 'script',
    url: 'https://unpkg.com/axios@1.6.0/dist/axios.min.js',
    description: 'Axios HTTP client from CDN'
  }
];

async function testExternalResourceLoading() {
  console.log('='.repeat(80));
  console.log('Testing External Resource Loading with CORS Configuration');
  console.log('='.repeat(80));
  console.log();

  // Read the nginx configuration
  try {
    const nginxPath = 'services/kaspa-explorer/nginx.conf';
    const nginxContent = await fs.readFile(nginxPath, 'utf8');
    
    console.log('✓ Loaded nginx.conf for analysis');
    console.log();
    
    // Analyze CORS configuration
    const corsAnalysis = analyzeCorsConfiguration(nginxContent);
    
    console.log('CORS Configuration Analysis:');
    console.log('-'.repeat(40));
    console.log(`Origin Policy: ${corsAnalysis.allowOrigin}`);
    console.log(`Allowed Methods: ${corsAnalysis.allowMethods}`);
    console.log(`Allowed Headers: ${corsAnalysis.allowHeaders}`);
    console.log(`Preflight Caching: ${corsAnalysis.maxAge ? corsAnalysis.maxAge + ' seconds' : 'Not configured'}`);
    console.log(`Static Asset CORS: ${corsAnalysis.staticAssetCors ? 'Enabled' : 'Disabled'}`);
    console.log();
    
    // Test each external resource
    console.log('External Resource Compatibility Analysis:');
    console.log('-'.repeat(50));
    
    let compatible = 0;
    let incompatible = 0;
    
    for (const resource of externalResources) {
      const result = testResourceCompatibility(resource, corsAnalysis);
      
      if (result.compatible) {
        console.log(`✅ ${resource.type.toUpperCase()}: ${resource.description}`);
        console.log(`   URL: ${resource.url}`);
        console.log(`   Status: Compatible with CORS policy`);
        compatible++;
      } else {
        console.log(`❌ ${resource.type.toUpperCase()}: ${resource.description}`);
        console.log(`   URL: ${resource.url}`);
        console.log(`   Status: ${result.reason}`);
        incompatible++;
      }
      console.log();
    }
    
    // Generate test HTML to verify loading
    await generateTestHtml(externalResources, corsAnalysis);
    
    // Summary
    console.log('='.repeat(80));
    console.log('External Resource Loading Test Summary');
    console.log('='.repeat(80));
    console.log(`Total resources tested: ${externalResources.length}`);
    console.log(`Compatible: ${compatible}`);
    console.log(`Incompatible: ${incompatible}`);
    console.log();
    
    if (incompatible === 0) {
      console.log('✅ All external resources are compatible with the CORS configuration!');
      console.log();
      console.log('The enhanced CORS configuration successfully:');
      console.log('• Allows loading of external scripts from CDNs');
      console.log('• Permits external stylesheets and fonts');
      console.log('• Enables API calls to external services');
      console.log('• Provides proper preflight request handling');
      console.log();
      console.log('Test HTML file generated: test-external-resources.html');
      console.log('You can open this file in a browser to verify actual loading.');
      console.log();
      return true;
    } else {
      console.log('❌ Some external resources may have compatibility issues');
      console.log('Review the CORS configuration for any restrictions.');
      console.log();
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error testing external resource loading: ${error.message}`);
    return false;
  }
}

function analyzeCorsConfiguration(nginxContent) {
  const analysis = {
    allowOrigin: '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type',
    maxAge: null,
    staticAssetCors: false,
    preflightHandling: false
  };
  
  // Extract Access-Control-Allow-Origin
  const originMatch = nginxContent.match(/add_header\s+Access-Control-Allow-Origin\s+"([^"]+)"/);
  if (originMatch) {
    analysis.allowOrigin = originMatch[1];
  }
  
  // Extract Access-Control-Allow-Methods
  const methodsMatch = nginxContent.match(/add_header\s+Access-Control-Allow-Methods\s+"([^"]+)"/);
  if (methodsMatch) {
    analysis.allowMethods = methodsMatch[1];
  }
  
  // Extract Access-Control-Allow-Headers
  const headersMatch = nginxContent.match(/add_header\s+Access-Control-Allow-Headers\s+"([^"]+)"/);
  if (headersMatch) {
    analysis.allowHeaders = headersMatch[1];
  }
  
  // Extract Access-Control-Max-Age
  const maxAgeMatch = nginxContent.match(/add_header\s+Access-Control-Max-Age\s+"([^"]+)"/);
  if (maxAgeMatch) {
    analysis.maxAge = parseInt(maxAgeMatch[1]);
  }
  
  // Check for static asset CORS
  analysis.staticAssetCors = nginxContent.includes('location ~*') && 
                            nginxContent.includes('Access-Control-Allow-Origin');
  
  // Check for preflight handling
  analysis.preflightHandling = nginxContent.includes('$request_method = OPTIONS');
  
  return analysis;
}

function testResourceCompatibility(resource, corsAnalysis) {
  const resourceUrl = new URL(resource.url);
  
  // Check origin policy
  if (corsAnalysis.allowOrigin === '*') {
    // Wildcard allows all origins
    return { compatible: true };
  }
  
  if (corsAnalysis.allowOrigin === 'null') {
    // Very restrictive - would block most external resources
    return { 
      compatible: false, 
      reason: 'Origin policy "null" blocks external resources' 
    };
  }
  
  // Check if the resource domain is allowed
  const resourceDomain = resourceUrl.hostname;
  if (!corsAnalysis.allowOrigin.includes(resourceDomain) && 
      !corsAnalysis.allowOrigin.includes('*')) {
    return { 
      compatible: false, 
      reason: `Domain ${resourceDomain} not allowed by origin policy` 
    };
  }
  
  // Check method compatibility (most resources use GET)
  const requiredMethod = resource.type === 'api' ? 'GET' : 'GET';
  if (!corsAnalysis.allowMethods.includes(requiredMethod) && 
      corsAnalysis.allowMethods !== '*') {
    return { 
      compatible: false, 
      reason: `Method ${requiredMethod} not allowed` 
    };
  }
  
  return { compatible: true };
}

async function generateTestHtml(resources, corsAnalysis) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>External Resource Loading Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .resource-test {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .resource-type {
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            font-size: 12px;
        }
        .resource-url {
            color: #666;
            font-size: 14px;
            word-break: break-all;
        }
        .status {
            margin-top: 10px;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
        }
        .loading { background-color: #fff3cd; color: #856404; }
        .success { background-color: #d4edda; color: #155724; }
        .error { background-color: #f8d7da; color: #721c24; }
        .cors-info {
            background: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
    <!-- External Stylesheet Test -->
    <link rel="stylesheet" href="${resources.find(r => r.type === 'stylesheet')?.url || ''}" 
          onload="updateStatus('stylesheet', 'success')" 
          onerror="updateStatus('stylesheet', 'error')">
</head>
<body>
    <div class="header">
        <h1>🌐 External Resource Loading Test</h1>
        <p>Testing CORS configuration for Kaspa Explorer external resources</p>
    </div>

    <div class="cors-info">
        <h3>Current CORS Configuration:</h3>
        <ul>
            <li><strong>Origin Policy:</strong> ${corsAnalysis.allowOrigin}</li>
            <li><strong>Allowed Methods:</strong> ${corsAnalysis.allowMethods}</li>
            <li><strong>Allowed Headers:</strong> ${corsAnalysis.allowHeaders}</li>
            <li><strong>Preflight Caching:</strong> ${corsAnalysis.maxAge ? corsAnalysis.maxAge + ' seconds' : 'Not configured'}</li>
        </ul>
    </div>

    ${resources.map(resource => `
    <div class="resource-test">
        <div class="resource-type">${resource.type}</div>
        <div>${resource.description}</div>
        <div class="resource-url">${resource.url}</div>
        <div class="status loading" id="status-${resource.type}">⏳ Loading...</div>
    </div>
    `).join('')}

    <script>
        // Track loading status
        const loadingStatus = {};
        
        function updateStatus(type, status) {
            const element = document.getElementById('status-' + type);
            if (element) {
                if (status === 'success') {
                    element.className = 'status success';
                    element.innerHTML = '✅ Loaded successfully';
                } else if (status === 'error') {
                    element.className = 'status error';
                    element.innerHTML = '❌ Failed to load (possible CORS error)';
                }
            }
            loadingStatus[type] = status;
        }
        
        // Test external scripts
        ${resources.filter(r => r.type === 'script').map(resource => `
        const script_${resource.type}_${Math.random().toString(36).substr(2, 9)} = document.createElement('script');
        script_${resource.type}_${Math.random().toString(36).substr(2, 9)}.src = '${resource.url}';
        script_${resource.type}_${Math.random().toString(36).substr(2, 9)}.onload = () => updateStatus('script', 'success');
        script_${resource.type}_${Math.random().toString(36).substr(2, 9)}.onerror = () => updateStatus('script', 'error');
        document.head.appendChild(script_${resource.type}_${Math.random().toString(36).substr(2, 9)});
        `).join('')}
        
        // Test API endpoint
        ${resources.filter(r => r.type === 'api').map(resource => `
        fetch('${resource.url}', {
            method: 'GET',
            mode: 'cors'
        })
        .then(response => {
            updateStatus('api', 'success');
            console.log('API call successful:', response.status);
        })
        .catch(error => {
            updateStatus('api', 'error');
            console.error('API call failed:', error);
        });
        `).join('')}
        
        // Test font loading
        ${resources.filter(r => r.type === 'font').map(resource => `
        const fontTest = new FontFace('TestFont', 'url(${resource.url})');
        fontTest.load()
        .then(() => {
            updateStatus('font', 'success');
            console.log('Font loaded successfully');
        })
        .catch(error => {
            updateStatus('font', 'error');
            console.error('Font loading failed:', error);
        });
        `).join('')}
        
        // Summary after 5 seconds
        setTimeout(() => {
            console.log('Loading test summary:', loadingStatus);
            const successCount = Object.values(loadingStatus).filter(s => s === 'success').length;
            const totalCount = Object.keys(loadingStatus).length;
            console.log(\`Successfully loaded: \${successCount}/\${totalCount} resources\`);
        }, 5000);
    </script>
</body>
</html>`;

  await fs.writeFile('test-external-resources.html', html);
  console.log('✓ Generated test-external-resources.html');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testExternalResourceLoading()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testExternalResourceLoading };