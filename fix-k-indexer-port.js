#!/usr/bin/env node

const path = require('path');
const ConfigGenerator = require('./services/wizard/backend/src/utils/config-generator');

async function fixKIndexerPort() {
  console.log('🔧 Fixing k-indexer port configuration...');
  
  try {
    const configGenerator = new ConfigGenerator();
    
    // Load existing configuration
    const configResult = await configGenerator.loadEnvFile('.env');
    if (!configResult.success) {
      console.error('❌ Failed to load .env file:', configResult.error);
      return;
    }
    
    const config = configResult.config;
    const profiles = config.COMPOSE_PROFILES ? config.COMPOSE_PROFILES.split(',') : ['indexer-services'];
    
    console.log('📋 Current configuration:');
    console.log('  - Profiles:', profiles);
    console.log('  - Database Port:', config.POSTGRES_PORT || '5432');
    
    // Generate new docker-compose.yml
    console.log('🔄 Generating new docker-compose.yml...');
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Save the updated docker-compose.yml
    const composePath = path.resolve(__dirname, 'docker-compose.yml');
    const fs = require('fs').promises;
    await fs.writeFile(composePath, dockerComposeContent, 'utf8');
    
    console.log('✅ Successfully updated docker-compose.yml');
    console.log('📁 File saved to:', composePath);
    
    // Show the k-indexer service configuration
    const lines = dockerComposeContent.split('\n');
    const kIndexerStart = lines.findIndex(line => line.includes('# K-Indexer (K-Social Indexer)'));
    const kIndexerEnd = lines.findIndex((line, index) => index > kIndexerStart && line.includes('# Simply Kaspa Indexer'));
    
    if (kIndexerStart !== -1 && kIndexerEnd !== -1) {
      console.log('\n📝 Updated k-indexer service configuration:');
      console.log(lines.slice(kIndexerStart, kIndexerEnd).join('\n'));
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Stop current services: docker compose down');
    console.log('2. Start services with new config: docker compose --profile indexer-services up -d');
    console.log('3. Check k-indexer logs: docker logs k-indexer --tail 20');
    
  } catch (error) {
    console.error('❌ Error fixing k-indexer port:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  fixKIndexerPort();
}

module.exports = fixKIndexerPort;