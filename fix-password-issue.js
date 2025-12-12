#!/usr/bin/env node

const path = require('path');
const ConfigGenerator = require('./services/wizard/backend/src/utils/config-generator');

async function fixPasswordIssue() {
  console.log('🔧 Fixing potential password issue in k-indexer...');
  
  try {
    const configGenerator = new ConfigGenerator();
    
    // Create configuration with a simple password (no special characters)
    const profiles = ['indexer-services'];
    const config = configGenerator.generateDefaultConfig(profiles);
    
    // Override with a simple password
    config.POSTGRES_PASSWORD = 'simplepassword123';
    
    console.log('📋 Using configuration:');
    console.log('  - Profiles:', profiles);
    console.log('  - Database User:', config.POSTGRES_USER);
    console.log('  - Database Password:', config.POSTGRES_PASSWORD);
    console.log('  - Database Port:', config.POSTGRES_PORT);
    console.log('  - Database Name:', config.POSTGRES_DB);
    
    // Generate new docker-compose.yml
    console.log('🔄 Generating docker-compose.yml with simple password...');
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Save the updated docker-compose.yml
    const composePath = path.resolve(__dirname, 'docker-compose.yml');
    const fs = require('fs').promises;
    await fs.writeFile(composePath, dockerComposeContent, 'utf8');
    
    console.log('✅ Successfully generated docker-compose.yml');
    
    // Generate and save .env file
    console.log('🔄 Generating .env file with simple password...');
    const envContent = await configGenerator.generateEnvFile(config, profiles);
    const envPath = path.resolve(__dirname, '.env');
    await fs.writeFile(envPath, envContent, 'utf8');
    
    console.log('✅ Successfully generated .env file');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Stop current services: docker compose down');
    console.log('2. Start services with new config: docker compose --profile indexer-services up -d');
    console.log('3. Check k-indexer logs: docker logs k-indexer --tail 20');
    
  } catch (error) {
    console.error('❌ Error fixing password issue:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  fixPasswordIssue();
}

module.exports = fixPasswordIssue;