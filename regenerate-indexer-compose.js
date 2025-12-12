#!/usr/bin/env node

const path = require('path');
const ConfigGenerator = require('./services/wizard/backend/src/utils/config-generator');

async function regenerateIndexerCompose() {
  console.log('🔧 Regenerating docker-compose.yml for indexer services...');
  
  try {
    const configGenerator = new ConfigGenerator();
    
    // Create default configuration for indexer-services profile
    const profiles = ['indexer-services'];
    const config = configGenerator.generateDefaultConfig(profiles);
    
    console.log('📋 Using configuration:');
    console.log('  - Profiles:', profiles);
    console.log('  - Database User:', config.POSTGRES_USER);
    console.log('  - Database Port:', config.POSTGRES_PORT);
    console.log('  - Database Name:', config.POSTGRES_DB);
    
    // Generate new docker-compose.yml
    console.log('🔄 Generating docker-compose.yml with indexer services...');
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Save the updated docker-compose.yml
    const composePath = path.resolve(__dirname, 'docker-compose.yml');
    const fs = require('fs').promises;
    await fs.writeFile(composePath, dockerComposeContent, 'utf8');
    
    console.log('✅ Successfully generated docker-compose.yml');
    console.log('📁 File saved to:', composePath);
    
    // Generate and save .env file
    console.log('🔄 Generating .env file...');
    const envContent = await configGenerator.generateEnvFile(config, profiles);
    const envPath = path.resolve(__dirname, '.env');
    await fs.writeFile(envPath, envContent, 'utf8');
    
    console.log('✅ Successfully generated .env file');
    console.log('📁 File saved to:', envPath);
    
    // Show the k-indexer service configuration
    const lines = dockerComposeContent.split('\n');
    const kIndexerStart = lines.findIndex(line => line.includes('# K-Indexer (K-Social Indexer)'));
    const kIndexerEnd = lines.findIndex((line, index) => index > kIndexerStart && line.includes('# Simply Kaspa Indexer'));
    
    if (kIndexerStart !== -1 && kIndexerEnd !== -1) {
      console.log('\n📝 K-indexer service configuration:');
      console.log(lines.slice(kIndexerStart, kIndexerEnd).join('\n'));
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Stop current services: docker compose down');
    console.log('2. Start services with new config: docker compose --profile indexer-services up -d');
    console.log('3. Check k-indexer logs: docker logs k-indexer --tail 20');
    
  } catch (error) {
    console.error('❌ Error regenerating compose:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  regenerateIndexerCompose();
}

module.exports = regenerateIndexerCompose;