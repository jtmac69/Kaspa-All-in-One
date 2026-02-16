#!/usr/bin/env node

/**
 * Test Kaspa Stratum Service Generation
 * 
 * Verifies that the _generateKaspaStratumService method:
 * - Uses MINING_ADDRESS from wallet configuration
 * - Logs warning if mining address not provided
 * - Only adds mining address to environment when present
 * - Includes depends_on for kaspa-node
 * - Has healthcheck configured
 */

const ConfigGenerator = require('./src/utils/config-generator');

console.log('='.repeat(60));
console.log('Kaspa Stratum Service Generation Tests');
console.log('='.repeat(60));

const generator = new ConfigGenerator();

// Test 1: Stratum with mining address
console.log('\n1. Testing stratum service with mining address...');
const withAddressConfig = {
  KASPA_STRATUM_PORT: 5555,
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v'
};

const withAddressService = generator._generateKaspaStratumService(withAddressConfig);
console.log('Generated service:');
console.log(withAddressService);

const hasMiningAddress = withAddressService.includes('MINING_ADDRESS=kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v');
const hasPort = withAddressService.includes('"5555:5555"');
const hasDependsOn = withAddressService.includes('depends_on:');
const dependsOnNode = withAddressService.includes('- kaspa-node');
const hasHealthcheck = withAddressService.includes('healthcheck:');

console.log('\n   Has MINING_ADDRESS:', hasMiningAddress, '(should be true)');
console.log('   Has port 5555:', hasPort, '(should be true)');
console.log('   Has depends_on:', hasDependsOn, '(should be true)');
console.log('   Depends on kaspa-node:', dependsOnNode, '(should be true)');
console.log('   Has healthcheck:', hasHealthcheck, '(should be true)');

if (hasMiningAddress && hasPort && hasDependsOn && dependsOnNode && hasHealthcheck) {
  console.log('   ✓ PASS: Stratum with mining address correct');
} else {
  console.log('   ✗ FAIL: Stratum with mining address incorrect');
}

// Test 2: Stratum without mining address (should warn)
console.log('\n2. Testing stratum service without mining address (should warn)...');
const noAddressConfig = {
  KASPA_STRATUM_PORT: 5555
};

console.log('   Expected: Warning message about missing MINING_ADDRESS');
const noAddressService = generator._generateKaspaStratumService(noAddressConfig);

const noAddressHasMiningEnv = noAddressService.includes('MINING_ADDRESS=');
console.log('   Has MINING_ADDRESS in environment:', noAddressHasMiningEnv, '(should be false)');

if (!noAddressHasMiningEnv) {
  console.log('   ✓ PASS: Mining address not added when empty');
} else {
  console.log('   ✗ FAIL: Empty mining address should not be in environment');
}

// Test 3: Custom stratum image
console.log('\n3. Testing stratum with custom image...');
const customImageConfig = {
  KASPA_STRATUM_PORT: 5555,
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v',
  KASPA_STRATUM_IMAGE: 'custom/stratum:v1.0.0'
};

const customImageService = generator._generateKaspaStratumService(customImageConfig);
console.log('Generated service (excerpt):');
const imageLines = customImageService.split('\n').slice(0, 5);
console.log(imageLines.join('\n'));

const hasCustomImage = customImageService.includes('image: custom/stratum:v1.0.0');
const noBuildSection = !customImageService.includes('build:');

console.log('\n   Has custom image:', hasCustomImage, '(should be true)');
console.log('   No build section:', noBuildSection, '(should be true)');

if (hasCustomImage && noBuildSection) {
  console.log('   ✓ PASS: Custom image configuration correct');
} else {
  console.log('   ✗ FAIL: Custom image configuration incorrect');
}

// Test 4: Build from GitHub (default)
console.log('\n4. Testing stratum build from GitHub...');
const buildConfig = {
  KASPA_STRATUM_PORT: 5555,
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v'
};

const buildService = generator._generateKaspaStratumService(buildConfig);

const hasBuildSection = buildService.includes('build:');
const hasGitHubContext = buildService.includes('https://github.com/LiveLaughLove13/rusty-kaspa.git#externalipDNSresolver');
const hasDockerfile = buildService.includes('dockerfile: mining/kaspa-miner/Dockerfile');

console.log('   Has build section:', hasBuildSection, '(should be true)');
console.log('   Has GitHub context:', hasGitHubContext, '(should be true)');
console.log('   Has Dockerfile path:', hasDockerfile, '(should be true)');

if (hasBuildSection && hasGitHubContext && hasDockerfile) {
  console.log('   ✓ PASS: GitHub build configuration correct');
} else {
  console.log('   ✗ FAIL: GitHub build configuration incorrect');
}

// Test 5: External IP configuration
console.log('\n5. Testing stratum with external IP...');
const externalIpConfig = {
  KASPA_STRATUM_PORT: 5555,
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v',
  STRATUM_EXTERNAL_IP: '203.0.113.1'
};

const externalIpService = generator._generateKaspaStratumService(externalIpConfig);

const hasExternalIp = externalIpService.includes('EXTERNAL_IP=203.0.113.1');

console.log('   Has EXTERNAL_IP:', hasExternalIp, '(should be true)');

if (hasExternalIp) {
  console.log('   ✓ PASS: External IP configuration correct');
} else {
  console.log('   ✗ FAIL: External IP configuration incorrect');
}

// Test 6: Environment section structure
console.log('\n6. Testing environment section structure...');
const envMatch = withAddressService.match(/environment:\n([\s\S]*?)\n    volumes:/);
if (envMatch) {
  const envSection = envMatch[1];
  console.log('   Environment section:');
  console.log(envSection);

  const hasKaspaRpcUrl = envSection.includes('KASPA_RPC_URL=');
  const hasStratumPort = envSection.includes('STRATUM_PORT=');
  const envHasMiningAddress = envSection.includes('MINING_ADDRESS=');

  console.log('\n   Has KASPA_RPC_URL:', hasKaspaRpcUrl, '(should be true)');
  console.log('   Has STRATUM_PORT:', hasStratumPort, '(should be true)');
  console.log('   Has MINING_ADDRESS:', envHasMiningAddress, '(should be true)');

  if (hasKaspaRpcUrl && hasStratumPort && envHasMiningAddress) {
    console.log('   ✓ PASS: Environment section structure correct');
  } else {
    console.log('   ✗ FAIL: Environment section structure incorrect');
  }
} else {
  console.log('   ✗ FAIL: Could not parse environment section');
}

// Test 7: Fallback port handling
console.log('\n7. Testing fallback port handling...');
const fallbackPortConfig = {
  STRATUM_PORT: 6666,  // Old config key
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v'
};

const fallbackService = generator._generateKaspaStratumService(fallbackPortConfig);

const hasFallbackPort = fallbackService.includes('"6666:5555"');

console.log('   Uses STRATUM_PORT as fallback:', hasFallbackPort, '(should be true)');

if (hasFallbackPort) {
  console.log('   ✓ PASS: Fallback port handling correct');
} else {
  console.log('   ✗ FAIL: Fallback port handling incorrect');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log('All tests completed. Review output above for any failures.');
console.log('');
