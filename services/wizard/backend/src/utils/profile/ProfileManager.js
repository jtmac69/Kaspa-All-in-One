const fs = require('fs').promises;
const path = require('path');

/**
 * Core ProfileManager class with essential profile and template data
 * Focused on basic profile operations and data access
 */
class ProfileManager {
  constructor() {
    this.profiles = {
      core: {
        id: 'core',
        name: 'Core Profile',
        description: 'Kaspa node (public/private) with optional wallet',
        services: [
          { name: 'kaspa-node', required: true, startupOrder: 1, description: 'Kaspa blockchain node' },
          { name: 'wallet', required: false, startupOrder: 1, description: 'Kaspa wallet' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: [],
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 100,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        ports: [16110, 16111, 3001, 80, 443],
        required: true,
        configuration: {
          required: ['KASPA_NODE_P2P_PORT', 'KASPA_NODE_RPC_PORT'],
          optional: ['PUBLIC_NODE', 'WALLET_ENABLED'],
          nodeUsage: 'local',
          fallbackToPublic: true
        },
        category: 'essential'
      },
      'kaspa-user-applications': {
        id: 'kaspa-user-applications',
        name: 'Kaspa User Applications',
        description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
        services: [
          { name: 'kasia-app', required: true, startupOrder: 3, description: 'Kasia messaging application' },
          { name: 'k-social-app', required: true, startupOrder: 3, description: 'K-Social platform' },
          { name: 'kaspa-explorer', required: true, startupOrder: 3, description: 'Kaspa blockchain explorer' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: [],
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 50,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 200
        },
        ports: [3002, 3003, 3008],
        configuration: {
          required: [],
          optional: ['KASIA_APP_PORT', 'KSOCIAL_APP_PORT', 'EXPLORER_PORT'],
          indexerChoice: 'public',
          publicEndpoints: {
            kasiaIndexer: 'https://api.kasia.io',
            kIndexer: 'https://api.k-social.io',
            simplyKaspaIndexer: 'https://api.simplykaspa.io'
          }
        },
        category: 'optional'
      },
      'indexer-services': {
        id: 'indexer-services',
        name: 'Indexer Services',
        description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa)',
        services: [
          { name: 'timescaledb', required: true, startupOrder: 2, description: 'Shared TimescaleDB database' },
          { name: 'kasia-indexer', required: false, startupOrder: 2, description: 'Kasia blockchain indexer' },
          { name: 'k-indexer', required: false, startupOrder: 2, description: 'K-Social blockchain indexer' },
          { name: 'simply-kaspa-indexer', required: false, startupOrder: 2, description: 'Simply Kaspa indexer' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: [],
        resources: {
          minMemory: 8,
          minCpu: 4,
          minDisk: 500,
          recommendedMemory: 16,
          recommendedCpu: 8,
          recommendedDisk: 2000
        },
        ports: [5432, 3004, 3005, 3006],
        configuration: {
          required: ['POSTGRES_USER', 'POSTGRES_PASSWORD'],
          optional: ['TIMESCALEDB_PORT'],
          sharedDatabase: true,
          databases: ['kasia_db', 'k_db', 'simply_kaspa_db'],
          nodeUsage: 'fallback',
          fallbackToPublic: true
        },
        category: 'optional'
      },
      'archive-node': {
        id: 'archive-node',
        name: 'Archive Node Profile',
        description: 'Non-pruning Kaspa node for complete blockchain history',
        services: [
          { name: 'kaspa-archive-node', required: true, startupOrder: 1, description: 'Archive Kaspa node' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: ['core'],
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 1000,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 5000
        },
        ports: [16110, 16111],
        configuration: {
          required: ['KASPA_NODE_P2P_PORT', 'KASPA_NODE_RPC_PORT'],
          optional: ['PUBLIC_NODE'],
          nodeUsage: 'local',
          fallbackToPublic: false
        },
        category: 'advanced'
      },
      mining: {
        id: 'mining',
        name: 'Mining Profile',
        description: 'Local mining stratum pointed to local Kaspa node',
        services: [
          { name: 'kaspa-stratum', required: true, startupOrder: 3, description: 'Mining stratum server' }
        ],
        dependencies: [],
        prerequisites: ['core', 'archive-node'],
        conflicts: [],
        resources: {
          minMemory: 2,
          minCpu: 2,
          minDisk: 10,
          recommendedMemory: 4,
          recommendedCpu: 4,
          recommendedDisk: 50
        },
        ports: [5555],
        configuration: {
          required: ['STRATUM_PORT', 'MINING_ADDRESS'],
          optional: ['POOL_MODE']
        },
        category: 'advanced'
      }
    };

    this.templates = {
      'home-node': {
        id: 'home-node',
        name: 'Home Node',
        description: 'Basic Kaspa node for personal use - perfect for learning and development',
        longDescription: 'A simple setup with just the Kaspa node running locally. Ideal for developers, enthusiasts, or anyone wanting to support the network without public exposure.',
        profiles: ['core'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '10-15 minutes',
        syncTime: '2-4 hours',
        icon: '🏠',
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'mainnet'
        },
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 100,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        features: [
          'Local Kaspa node',
          'Web dashboard',
          'Basic monitoring',
          'Wallet support'
        ],
        benefits: [
          'Support the Kaspa network',
          'Learn about blockchain technology',
          'Private node access',
          'No external dependencies'
        ],
        customizable: true,
        tags: ['beginner', 'personal', 'node', 'wallet']
      },
      'public-node': {
        id: 'public-node',
        name: 'Public Node',
        description: 'Public-facing Kaspa node with indexer services for community use',
        longDescription: 'A robust setup that provides public access to your Kaspa node and indexer services. Perfect for contributing to the ecosystem by providing reliable infrastructure.',
        profiles: ['core', 'indexer-services'],
        category: 'intermediate',
        useCase: 'community',
        estimatedSetupTime: '20-30 minutes',
        syncTime: '4-8 hours',
        icon: '🌐',
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'mainnet',
          POSTGRES_USER: 'kaspa_user',
          TIMESCALEDB_PORT: 5432
        },
        resources: {
          minMemory: 12,
          minCpu: 6,
          minDisk: 600,
          recommendedMemory: 24,
          recommendedCpu: 12,
          recommendedDisk: 2000
        },
        features: [
          'Public Kaspa node',
          'Local indexer services',
          'TimescaleDB database',
          'SSL/TLS encryption',
          'Advanced monitoring'
        ],
        benefits: [
          'Contribute to network infrastructure',
          'Provide reliable public endpoints',
          'Support dApp developers',
          'Enhanced data availability'
        ],
        customizable: true,
        tags: ['intermediate', 'public', 'indexers', 'community']
      },
      'developer-setup': {
        id: 'developer-setup',
        name: 'Developer Setup',
        description: 'Complete development environment with all tools and debugging features',
        longDescription: 'A comprehensive setup designed for Kaspa developers. Includes all services, development tools, debugging features, and inspection utilities.',
        profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
        category: 'advanced',
        useCase: 'development',
        estimatedSetupTime: '30-45 minutes',
        syncTime: '4-8 hours',
        icon: '👨‍💻',
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'testnet',
          POSTGRES_USER: 'dev_user',
          TIMESCALEDB_PORT: 5432,
          LOG_LEVEL: 'debug',
          ENABLE_PORTAINER: 'true',
          ENABLE_PGADMIN: 'true',
          ENABLE_LOG_ACCESS: 'true'
        },
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 650,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 2500
        },
        features: [
          'All Kaspa services',
          'Development tools',
          'Debug logging',
          'Portainer (Docker UI)',
          'pgAdmin (Database UI)',
          'Testnet configuration',
          'Log file access'
        ],
        benefits: [
          'Complete development environment',
          'Easy debugging and inspection',
          'Test applications safely',
          'Rapid prototyping'
        ],
        developerMode: true,
        customizable: true,
        tags: ['advanced', 'development', 'debugging', 'testnet']
      },
      'full-stack': {
        id: 'full-stack',
        name: 'Full Stack',
        description: 'Complete production deployment with all services and applications',
        longDescription: 'The ultimate Kaspa deployment including node, indexers, and all user applications. Perfect for organizations wanting to provide comprehensive Kaspa services.',
        profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
        category: 'advanced',
        useCase: 'production',
        estimatedSetupTime: '45-60 minutes',
        syncTime: '4-8 hours',
        icon: '🚀',
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'mainnet',
          POSTGRES_USER: 'kaspa_user',
          TIMESCALEDB_PORT: 5432,
          KASIA_APP_PORT: 3002,
          KSOCIAL_APP_PORT: 3003,
          EXPLORER_PORT: 3008
        },
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 650,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 2500
        },
        features: [
          'Public Kaspa node',
          'All user applications',
          'Local indexer services',
          'SSL/TLS encryption',
          'Production monitoring',
          'Load balancing ready'
        ],
        benefits: [
          'Complete Kaspa ecosystem',
          'Maximum functionality',
          'Production-ready setup',
          'Comprehensive user experience'
        ],
        customizable: true,
        tags: ['advanced', 'production', 'complete', 'applications']
      }
    };

    // Developer Mode features
    this.developerModeFeatures = {
      debugLogging: true,
      exposedPorts: [9000, 5050],
      inspectionTools: ['portainer', 'pgadmin'],
      logAccess: true,
      developmentUtilities: []
    };
  }

  // Basic profile access methods
  getProfile(profileId) {
    return this.profiles[profileId] || null;
  }

  getAllProfiles() {
    return Object.values(this.profiles);
  }

  getTemplate(templateId) {
    return this.templates[templateId] || null;
  }

  getAllTemplates() {
    return Object.values(this.templates);
  }

  // Basic dependency resolution
  resolveProfileDependencies(selectedProfiles) {
    const resolved = new Set(selectedProfiles);
    const toProcess = [...selectedProfiles];
    
    while (toProcess.length > 0) {
      const profileId = toProcess.shift();
      const profile = this.profiles[profileId];
      
      if (!profile) continue;
      
      for (const dep of profile.dependencies) {
        if (!resolved.has(dep)) {
          resolved.add(dep);
          toProcess.push(dep);
        }
      }
    }
    
    return Array.from(resolved);
  }

  // Basic startup order calculation
  getStartupOrder(profileIds) {
    const allProfiles = this.resolveProfileDependencies(profileIds);
    const services = [];
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const service of profile.services) {
        services.push({
          ...service,
          profile: profileId,
          profileName: profile.name
        });
      }
    }
    
    return services.sort((a, b) => {
      if (a.startupOrder !== b.startupOrder) {
        return a.startupOrder - b.startupOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Developer mode features
  getDeveloperModeFeatures() {
    return { ...this.developerModeFeatures };
  }

  applyDeveloperMode(config, enabled = false) {
    if (!enabled) {
      return config;
    }

    const devConfig = { ...config };
    
    if (this.developerModeFeatures.debugLogging) {
      devConfig.LOG_LEVEL = 'debug';
    }
    
    if (this.developerModeFeatures.inspectionTools) {
      devConfig.ENABLE_PORTAINER = 'true';
      devConfig.ENABLE_PGADMIN = 'true';
    }
    
    if (this.developerModeFeatures.logAccess) {
      devConfig.ENABLE_LOG_ACCESS = 'true';
    }
    
    return devConfig;
  }
}

module.exports = ProfileManager;