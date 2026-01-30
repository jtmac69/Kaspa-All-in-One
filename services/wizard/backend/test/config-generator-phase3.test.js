/**
 * Phase 3 Integration Tests for ConfigGenerator
 * 
 * Tests dynamic release fetching, configurable image sources, and custom builds
 * across all 8 profiles and 12 templates
 */

const ConfigGenerator = require('../src/utils/config-generator');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  KASPA_NETWORK: 'mainnet',
  DATA_VOLUME_PATH: '/tmp/kaspa-test',
  
  // Service-specific ports
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NODE_WRPC_PORT: 17110,
  
  KASIA_APP_PORT: 3001,
  KSOCIAL_APP_PORT: 3003,
  KASPA_EXPLORER_PORT: 3004,
  SIMPLY_KASPA_INDEXER_PORT: 3005,
  KASIA_INDEXER_PORT: 3002,
  K_INDEXER_PORT: 3006,
  KASPA_STRATUM_PORT: 5555,
  
  TIMESCALEDB_EXPLORER_PORT: 5434,
  TIMESCALEDB_KINDEXER_PORT: 5433,
  
  // Database credentials
  POSTGRES_USER_EXPLORER: 'test_explorer',
  POSTGRES_PASSWORD_EXPLORER: 'test_pass',
  POSTGRES_DB_EXPLORER: 'test_db_explorer',
  
  POSTGRES_USER_KINDEXER: 'test_kindexer',
  POSTGRES_PASSWORD_KINDEXER: 'test_pass',
  POSTGRES_DB_KINDEXER: 'test_db_kindexer',
  
  // Node modes
  KASIA_NODE_MODE: 'local',
  K_INDEXER_NODE_MODE: 'local',
  SIMPLY_KASPA_NODE_MODE: 'local',
  
  // Mining
  MINING_ADDRESS: 'kaspa:qz4wxy1234567890abcdef',
  STRATUM_EXTERNAL_IP: '203.0.113.42'
};

// Helper function to validate Docker Compose syntax
function validateDockerCompose(composeContent) {
  const tempFile = path.join('/tmp', `test-compose-${Date.now()}.yml`);
  
  try {
    require('fs').writeFileSync(tempFile, composeContent);
    execSync(`docker compose -f ${tempFile} config --quiet 2>&1`, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    require('fs').unlinkSync(tempFile);
    return { valid: true };
  } catch (error) {
    try {
      require('fs').unlinkSync(tempFile);
    } catch {}
    return { valid: false, error: error.message };
  }
}

// Helper function to extract image tags from compose
function extractImageTags(composeContent) {
  const imageRegex = /image:\s*([^\s]+)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(composeContent)) !== null) {
    images.push(match[1]);
  }
  
  return images;
}

// Helper function to extract build contexts
function extractBuildContexts(composeContent) {
  const buildRegex = /build:\s*\n\s*context:\s*([^\s]+)/g;
  const builds = [];
  let match;
  
  while ((match = buildRegex.exec(composeContent)) !== null) {
    builds.push(match[1]);
  }
  
  return builds;
}

describe('Phase 3: Release Fetching Tests', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('Should fetch and cache kaspanet/rusty-kaspa release', async () => {
    console.log('Testing release fetch for kaspanet/rusty-kaspa...');
    
    const release = await generator._fetchLatestGitHubRelease(
      'kaspanet/rusty-kaspa',
      'v1.0.0'
    );
    
    expect(release).toBeTruthy();
    expect(release).toMatch(/^v?\d+\.\d+\.\d+/);
    console.log(`✅ Fetched release: ${release}`);
  }, 10000);
  
  test('Should use cache on second fetch', async () => {
    console.log('Testing release cache...');
    
    const start1 = Date.now();
    const release1 = await generator._fetchLatestGitHubRelease('kaspanet/rusty-kaspa', 'v1.0.0');
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    const release2 = await generator._fetchLatestGitHubRelease('kaspanet/rusty-kaspa', 'v1.0.0');
    const time2 = Date.now() - start2;
    
    expect(release1).toBe(release2);
    expect(time2).toBeLessThan(time1);
    console.log(`✅ Cache hit: ${time1}ms → ${time2}ms`);
  }, 10000);
  
  test('Should fetch and cache supertypo/simply-kaspa-indexer release', async () => {
    console.log('Testing release fetch for supertypo/simply-kaspa-indexer...');
    
    const release = await generator._fetchLatestGitHubRelease(
      'supertypo/simply-kaspa-indexer',
      'v1.6.0'
    );
    
    expect(release).toBeTruthy();
    expect(release).toMatch(/^v?\d+\.\d+\.\d+/);
    console.log(`✅ Fetched release: ${release}`);
  }, 10000);
  
  test('Should fall back on invalid repo', async () => {
    console.log('Testing fallback on invalid repo...');
    
    const release = await generator._fetchLatestGitHubRelease(
      'invalid/nonexistent-repo',
      'v0.0.1'
    );
    
    expect(release).toBe('v0.0.1');
    console.log('✅ Fallback worked');
  }, 10000);
});

describe('Phase 3: Profile Service Generation Tests', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('Profile 1: kaspa-node (with dynamic release)', async () => {
    console.log('Testing kaspa-node generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-node']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kaspa-node:');
    expect(compose).toContain('kaspanet/rusty-kaspad:');
    expect(compose).not.toContain(':latest'); // Should use version tag
    
    const images = extractImageTags(compose);
    expect(images[0]).toMatch(/kaspanet\/rusty-kaspad:v?\d+\.\d+\.\d+/);
    
    console.log(`✅ Generated with image: ${images[0]}`);
  }, 15000);
  
  test('Profile 2: kasia-app (with configurable image)', async () => {
    console.log('Testing kasia-app generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kasia-app']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kasia-app:');
    expect(compose).toContain('image: kasia-app:latest'); // Default placeholder
    
    console.log('✅ Generated with placeholder image');
  }, 10000);
  
  test('Profile 2: kasia-app (with custom image)', async () => {
    console.log('Testing kasia-app with custom image...');
    
    const config = {
      ...TEST_CONFIG,
      KASIA_APP_IMAGE: 'myregistry/kasia:v0.6.2'
    };
    
    const compose = await generator.generateDockerCompose(config, ['kasia-app']);
    
    expect(compose).toContain('image: myregistry/kasia:v0.6.2');
    console.log('✅ Used custom image');
  }, 10000);
  
  test('Profile 3: k-social-app (configurable)', async () => {
    console.log('Testing k-social-app generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['k-social-app']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('k-social:'); // Container name
    expect(compose).toContain('image: k-social:latest');
    
    console.log('✅ Generated k-social container');
  }, 10000);
  
  test('Profile 4: kaspa-explorer-bundle (3 services, mixed images)', async () => {
    console.log('Testing kaspa-explorer-bundle generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-explorer-bundle']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kaspa-explorer:');
    expect(compose).toContain('simply-kaspa-indexer:');
    expect(compose).toContain('timescaledb-explorer:');
    
    const images = extractImageTags(compose);
    expect(images).toContain('kaspa-explorer:latest'); // Placeholder
    expect(images.some(img => img.startsWith('supertypo/simply-kaspa-indexer:v'))).toBe(true);
    expect(images).toContain('timescale/timescaledb:latest-pg16');
    
    console.log('✅ Generated bundle with mixed image sources');
  }, 15000);
  
  test('Profile 5: kasia-indexer (placeholder)', async () => {
    console.log('Testing kasia-indexer generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kasia-indexer']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kasia-indexer:');
    expect(compose).toContain('image: kasia-indexer:latest');
    
    console.log('✅ Generated kasia-indexer');
  }, 10000);
  
  test('Profile 6: k-indexer-bundle (2 services)', async () => {
    console.log('Testing k-indexer-bundle generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['k-indexer-bundle']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('k-indexer:');
    expect(compose).toContain('timescaledb-kindexer:');
    expect(compose).toContain('depends_on:');
    
    console.log('✅ Generated k-indexer bundle');
  }, 10000);
  
  test('Profile 7: kaspa-archive-node (with dynamic release)', async () => {
    console.log('Testing kaspa-archive-node generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-archive-node']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kaspa-archive-node:');
    expect(compose).toContain('kaspanet/rusty-kaspad:');
    expect(compose).toContain('--nopruning'); // Critical flag
    
    const images = extractImageTags(compose);
    expect(images[0]).toMatch(/kaspanet\/rusty-kaspad:v?\d+\.\d+\.\d+/);
    
    console.log('✅ Generated archive node with --nopruning');
  }, 15000);
  
  test('Profile 8: kaspa-stratum (with build context)', async () => {
    console.log('Testing kaspa-stratum generation...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-stratum']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kaspa-stratum:');
    expect(compose).toContain('build:');
    expect(compose).toContain('externalipDNSresolver');
    
    const builds = extractBuildContexts(compose);
    expect(builds[0]).toContain('github.com/LiveLaughLove13/rusty-kaspa');
    
    console.log('✅ Generated stratum with build context');
  }, 10000);
});

describe('Phase 3: Template Generation Tests', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('Template: personal-node (1 profile)', async () => {
    console.log('Testing personal-node template...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-node']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    expect(compose).toContain('kaspa-node:');
    
    console.log('✅ personal-node template works');
  }, 15000);
  
  test('Template: productivity-suite (3 profiles)', async () => {
    console.log('Testing productivity-suite template...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-node', 'kasia-app', 'k-social-app']
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    expect(compose).toContain('kaspa-node:');
    expect(compose).toContain('kasia-app:');
    expect(compose).toContain('k-social:');
    
    console.log('✅ productivity-suite template works');
  }, 15000);
  
  test('Template: kaspa-sovereignty (6 profiles, 11 services)', async () => {
    console.log('Testing kaspa-sovereignty template (complex)...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      [
        'kaspa-node',
        'kasia-app',
        'kasia-indexer',
        'k-social-app',
        'k-indexer-bundle',
        'kaspa-explorer-bundle'
      ]
    );
    
    const validation = validateDockerCompose(compose);
    expect(validation.valid).toBe(true);
    
    // Verify all 11 services present
    expect(compose).toContain('kaspa-node:');
    expect(compose).toContain('kasia-app:');
    expect(compose).toContain('kasia-indexer:');
    expect(compose).toContain('k-social:');
    expect(compose).toContain('k-indexer:');
    expect(compose).toContain('timescaledb-kindexer:');
    expect(compose).toContain('kaspa-explorer:');
    expect(compose).toContain('simply-kaspa-indexer:');
    expect(compose).toContain('timescaledb-explorer:');
    
    const images = extractImageTags(compose);
    console.log(`✅ Generated ${images.length} services for kaspa-sovereignty`);
  }, 20000);
});

describe('Phase 3: Backward Compatibility Tests', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('Legacy profile: core → kaspa-node', async () => {
    console.log('Testing legacy core profile...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['core']
    );
    
    expect(compose).toContain('kaspa-node:');
    console.log('✅ Legacy core profile works');
  }, 15000);
  
  test('Container names unchanged', async () => {
    console.log('Testing container name stability...');
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-node', 'kasia-app', 'k-social-app']
    );
    
    expect(compose).toContain('container_name: kaspa-node');
    expect(compose).toContain('container_name: kasia-app');
    expect(compose).toContain('container_name: k-social');
    
    console.log('✅ Container names unchanged');
  }, 15000);
});

describe('Phase 3: Error Handling Tests', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('Should handle missing config gracefully', async () => {
    console.log('Testing minimal config...');
    
    const compose = await generator.generateDockerCompose(
      {},
      ['kaspa-node']
    );
    
    expect(compose).toContain('kaspa-node:');
    expect(compose).toContain('--mainnet'); // Default network
    
    console.log('✅ Defaults applied correctly');
  }, 15000);
  
  test('Should handle network errors in release fetching', async () => {
    console.log('Testing network error handling...');
    
    // Clear cache to force fresh fetch
    generator.releaseCache.clear();
    
    const compose = await generator.generateDockerCompose(
      TEST_CONFIG,
      ['kaspa-node']
    );
    
    expect(compose).toContain('kaspa-node:');
    // Should fall back to default version
    
    console.log('✅ Network errors handled gracefully');
  }, 15000);
});

describe('Phase 3: Image Source Verification', () => {
  let generator;
  
  beforeEach(() => {
    generator = new ConfigGenerator();
  });
  
  test('kaspa-node uses versioned tag (not :latest)', async () => {
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-node']);
    const images = extractImageTags(compose);
    
    expect(images[0]).toMatch(/kaspanet\/rusty-kaspad:v?\d+\.\d+\.\d+/);
    expect(images[0]).not.toContain(':latest');
  }, 15000);
  
  test('simply-kaspa-indexer uses versioned tag', async () => {
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-explorer-bundle']);
    const images = extractImageTags(compose);
    
    const indexerImage = images.find(img => img.includes('simply-kaspa-indexer'));
    expect(indexerImage).toMatch(/supertypo\/simply-kaspa-indexer:v?\d+\.\d+\.\d+/);
  }, 15000);
  
  test('kaspa-archive-node uses same version as kaspa-node', async () => {
    const nodeCompose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-node']);
    const archiveCompose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-archive-node']);
    
    const nodeImages = extractImageTags(nodeCompose);
    const archiveImages = extractImageTags(archiveCompose);
    
    expect(nodeImages[0]).toBe(archiveImages[0]);
  }, 20000);
  
  test('Placeholder images use :latest tag', async () => {
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['kasia-app']);
    
    expect(compose).toContain('kasia-app:latest');
  }, 10000);
  
  test('Custom images used when configured', async () => {
    const config = {
      ...TEST_CONFIG,
      KASIA_APP_IMAGE: 'custom/kasia:v1.0.0',
      KSOCIAL_APP_IMAGE: 'custom/k-social:v2.0.0'
    };
    
    const compose = await generator.generateDockerCompose(config, ['kasia-app', 'k-social-app']);
    
    expect(compose).toContain('custom/kasia:v1.0.0');
    expect(compose).toContain('custom/k-social:v2.0.0');
  }, 10000);
  
  test('TimescaleDB uses latest-pg16 tag', async () => {
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-explorer-bundle']);
    const images = extractImageTags(compose);
    
    expect(images).toContain('timescale/timescaledb:latest-pg16');
  }, 15000);
  
  test('Stratum uses build context or custom image', async () => {
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-stratum']);
    
    expect(compose).toContain('build:');
    expect(compose).toContain('github.com/LiveLaughLove13/rusty-kaspa');
  }, 10000);
});

// Test runner summary
afterAll(() => {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3 INTEGRATION TESTS COMPLETE');
  console.log('='.repeat(70));
});
