#!/usr/bin/env node

/**
 * Fix Docker Compose Generation
 * 
 * This script fixes the missing kaspa-explorer service by:
 * 1. Loading the current .env configuration
 * 2. Using the correct kaspa-user-applications profile
 * 3. Regenerating docker-compose.yml with kaspa-explorer included
 */

const ConfigGenerator = require('./src/utils/config-generator');
const fs = require('fs').promises;
const path = require('path');

const configGenerator = new ConfigGenerator();

async function fixDockerComposeGeneration() {
  console.log('='.repeat(80));
  console.log('Fixing Docker Compose Generation - Adding kaspa-explorer');
  console.log('='.repeat(80));
  console.log();

  try {
    // Load current .env configuration
    console.log('1. Loading current .env configuration...');
    const envResult = await configGenerator.loadEnvFile('../../../services/.env');
    
    if (!envResult.success) {
      throw new Error(`Failed to load .env: ${envResult.error}`);
    }
    
    console.log('✅ Loaded .env configuration');
    console.log(`   - Profile: ${envResult.config.COMPOSE_PROFILES}`);
    console.log(`   - Kaspa RPC Port: ${envResult.config.KASPA_RPC_PORT}`);
    console.log(`   - Kaspa P2P Port: ${envResult.config.KASPA_P2P_PORT}`);
    console.log();

    // Determine the correct profiles based on configuration
    console.log('2. Determining correct profiles...');
    const profiles = envResult.config.COMPOSE_PROFILES 
      ? envResult.config.COMPOSE_PROFILES.split(',').map(p => p.trim())
      : ['kaspa-user-applications'];
    
    // Ensure we have a valid profile setup
    if (profiles.includes('prod')) {
      // Replace 'prod' with 'kaspa-user-applications'
      const index = profiles.indexOf('prod');
      profiles[index] = 'kaspa-user-applications';
      console.log('   - Replaced invalid "prod" profile with "kaspa-user-applications"');
    }
    
    // Ensure we have a node profile (core is needed for kaspa-user-applications)
    if (!profiles.includes('core') && !profiles.includes('archive-node')) {
      profiles.unshift('core');
      console.log('   - Added "core" profile (required for user applications)');
    }
    
    console.log(`✅ Final profiles: ${profiles.join(', ')}`);
    console.log();

    // Prepare configuration for docker-compose generation
    console.log('3. Preparing configuration...');
    const config = {
      KASPA_NODE_RPC_PORT: envResult.config.KASPA_RPC_PORT || 16111,
      KASPA_NODE_P2P_PORT: envResult.config.KASPA_P2P_PORT || 16110,
      KASPA_NETWORK: envResult.config.KASPA_NETWORK || 'mainnet',
      PUBLIC_NODE: envResult.config.PUBLIC_NODE || false,
      POSTGRES_USER: envResult.config.POSTGRES_USER,
      POSTGRES_PASSWORD: envResult.config.POSTGRES_PASSWORD,
      POSTGRES_DB: envResult.config.POSTGRES_DB,
      POSTGRES_PORT: envResult.config.POSTGRES_PORT
    };
    
    console.log('✅ Configuration prepared');
    console.log(`   - Network: ${config.KASPA_NETWORK}`);
    console.log(`   - RPC Port: ${config.KASPA_NODE_RPC_PORT}`);
    console.log(`   - P2P Port: ${config.KASPA_NODE_P2P_PORT}`);
    console.log();

    // Generate new docker-compose.yml
    console.log('4. Generating new docker-compose.yml...');
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Verify kaspa-explorer is included
    const hasKaspaExplorer = dockerComposeContent.includes('kaspa-explorer:');
    const hasKasiaApp = dockerComposeContent.includes('kasia-app:');
    const hasKSocial = dockerComposeContent.includes('k-social:');
    
    if (!hasKaspaExplorer) {
      throw new Error('Generated docker-compose.yml does not include kaspa-explorer service');
    }
    
    console.log('✅ Generated docker-compose.yml with services:');
    console.log(`   - kaspa-explorer: ${hasKaspaExplorer ? '✓' : '✗'}`);
    console.log(`   - kasia-app: ${hasKasiaApp ? '✓' : '✗'}`);
    console.log(`   - k-social: ${hasKSocial ? '✓' : '✗'}`);
    console.log();

    // Save the new docker-compose.yml
    console.log('5. Saving new docker-compose.yml...');
    const saveResult = await configGenerator.saveDockerCompose(dockerComposeContent, '../../../docker-compose.yml');
    
    if (!saveResult.success) {
      throw new Error(`Failed to save docker-compose.yml: ${saveResult.error}`);
    }
    
    console.log('✅ Saved new docker-compose.yml');
    console.log(`   - Path: ${saveResult.path}`);
    console.log(`   - Backup created for existing file`);
    console.log();

    // Update .env file with correct profiles
    console.log('6. Updating .env file with correct profiles...');
    const updatedEnvContent = await configGenerator.generateEnvFile(config, profiles);
    const envSaveResult = await configGenerator.saveEnvFile(updatedEnvContent, '../../../services/.env');
    
    if (!envSaveResult.success) {
      throw new Error(`Failed to save .env: ${envSaveResult.error}`);
    }
    
    console.log('✅ Updated .env file');
    console.log(`   - Profiles: ${profiles.join(', ')}`);
    console.log();

    // Verify the fix
    console.log('7. Verifying the fix...');
    const verificationContent = await fs.readFile('../../../docker-compose.yml', 'utf8');
    const verifyKaspaExplorer = verificationContent.includes('kaspa-explorer:');
    const verifyProfile = verificationContent.includes('- kaspa-user-applications');
    const verifyPort = verificationContent.includes('KASPA_EXPLORER_PORT:-3004');
    
    if (verifyKaspaExplorer && verifyProfile && verifyPort) {
      console.log('✅ Verification successful!');
      console.log('   - kaspa-explorer service: ✓');
      console.log('   - kaspa-user-applications profile: ✓');
      console.log('   - Port configuration: ✓');
    } else {
      console.log('❌ Verification failed!');
      console.log(`   - kaspa-explorer service: ${verifyKaspaExplorer ? '✓' : '✗'}`);
      console.log(`   - kaspa-user-applications profile: ${verifyProfile ? '✓' : '✗'}`);
      console.log(`   - Port configuration: ${verifyPort ? '✓' : '✗'}`);
      throw new Error('Generated docker-compose.yml verification failed');
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ SUCCESS: Docker Compose generation fixed!');
    console.log('='.repeat(80));
    console.log();
    console.log('Next steps:');
    console.log('1. Run: docker-compose up -d');
    console.log('2. Access Kaspa Explorer at: http://localhost:3004');
    console.log('3. Verify no CORS errors in browser console');
    console.log();
    
    return true;
    
  } catch (error) {
    console.log();
    console.log('='.repeat(80));
    console.log('❌ FAILED: Docker Compose generation fix failed');
    console.log('='.repeat(80));
    console.log(`Error: ${error.message}`);
    console.log();
    return false;
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixDockerComposeGeneration().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fix execution failed:', error);
    process.exit(1);
  });
}

module.exports = { fixDockerComposeGeneration };