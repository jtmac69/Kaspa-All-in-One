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
      'beginner-setup': {
        id: 'beginner-setup',
        name: 'Beginner Setup',
        description: 'Simple setup for new users',
        longDescription: 'Perfect for users who want to get started quickly with Kaspa applications without running their own node.',
        profiles: ['kaspa-user-applications'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '5 minutes',
        syncTime: 'Not required',
        icon: '🚀',
        config: {
          INDEXER_CHOICE: 'public',
          KASIA_APP_PORT: 3002,
          KSOCIAL_APP_PORT: 3003,
          EXPLORER_PORT: 3008
        },
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 50,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 200
        },
        features: [
          'Easy setup',
          'User applications',
          'Public indexers',
          'No node required'
        ],
        benefits: [
          'Quick start',
          'No complex configuration',
          'Low resource usage',
          'Immediate access'
        ],
        customizable: true,
        tags: ['beginner', 'personal', 'applications', 'public']
      },
      'full-node': {
        id: 'full-node',
        name: 'Full Node',
        description: 'Complete Kaspa node with all services',
        longDescription: 'Complete Kaspa setup with local node and indexers for maximum performance and privacy.',
        profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
        category: 'advanced',
        useCase: 'advanced',
        estimatedSetupTime: '15 minutes',
        syncTime: '2-4 hours',
        icon: '⚡',
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true',
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
          minCpu: 4,
          minDisk: 500,
          recommendedMemory: 32,
          recommendedCpu: 8,
          recommendedDisk: 2000
        },
        features: [
          'Full node',
          'Local indexers',
          'All applications',
          'Complete privacy'
        ],
        benefits: [
          'Complete control',
          'Best performance',
          'Full privacy',
          'Network support'
        ],
        customizable: true,
        tags: ['advanced', 'node', 'indexers', 'applications']
      },
      'home-node': {
        id: 'home-node',
        name: 'Home Node',
        description: 'Basic Kaspa node for personal use - perfect for learning and development',
        longDescription: 'A simple setup with just the Kaspa node running locally. Ideal for developers, enthusiasts, or anyone wanting to support the network without public exposure.',
        profiles: ['core'],
        category: 'intermediate',
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
        tags: ['intermediate', 'personal', 'node', 'wallet']
      },
      'public-node': {
        id: 'public-node',
        name: 'Public Node',
        description: 'Public-facing Kaspa node with indexer services for community use',
        longDescription: 'A robust setup that provides public access to your Kaspa node and indexer services. Perfect for contributing to the ecosystem by providing reliable infrastructure.',
        profiles: ['core', 'indexer-services'],
        category: 'advanced',
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
        tags: ['advanced', 'public', 'indexers', 'community']
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
      'mining-setup': {
        id: 'mining-setup',
        name: 'Mining Setup',
        description: 'Kaspa node with mining stratum for solo mining',
        longDescription: 'Complete mining setup with local Kaspa node and stratum server. Perfect for solo miners who want full control over their mining operation.',
        profiles: ['core', 'mining'],
        category: 'advanced',
        useCase: 'mining',
        estimatedSetupTime: '20-30 minutes',
        syncTime: '2-4 hours',
        icon: '⛏️',
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'mainnet',
          STRATUM_PORT: 5555,
          MINING_ADDRESS: '',
          POOL_MODE: 'false'
        },
        resources: {
          minMemory: 6,
          minCpu: 4,
          minDisk: 110,
          recommendedMemory: 12,
          recommendedCpu: 8,
          recommendedDisk: 550
        },
        features: [
          'Local Kaspa node',
          'Mining stratum server',
          'Solo mining support',
          'Mining monitoring'
        ],
        benefits: [
          'Full mining control',
          'No pool fees',
          'Direct block rewards',
          'Mining privacy'
        ],
        customizable: true,
        tags: ['advanced', 'mining', 'stratum', 'solo']
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

  // Profile validation methods
  validateProfileSelection(profileIds) {
    const errors = [];
    const warnings = [];
    
    // Check if core profile or archive-node is included (one is required)
    const allProfiles = this.resolveProfileDependencies(profileIds);
    const hasNodeProfile = allProfiles.includes('core') || allProfiles.includes('archive-node');
    if (!hasNodeProfile) {
      errors.push({
        type: 'missing_required',
        message: 'Either Core Profile or Archive Node Profile is required for all deployments'
      });
    }
    
    // Check prerequisites for each profile
    for (const profileId of profileIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      if (profile.prerequisites && profile.prerequisites.length > 0) {
        const hasPrerequisite = profile.prerequisites.some(prereq => 
          allProfiles.includes(prereq)
        );
        
        if (!hasPrerequisite) {
          errors.push({
            type: 'missing_prerequisite',
            profile: profileId,
            message: `${profile.name} requires one of: ${profile.prerequisites.map(p => this.profiles[p]?.name || p).join(', ')}`
          });
        }
      }
    }
    
    // Check for profile conflicts (e.g., core and archive-node)
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile || !profile.conflicts) continue;
      
      for (const conflictId of profile.conflicts) {
        if (allProfiles.includes(conflictId)) {
          errors.push({
            type: 'profile_conflict',
            message: `${profile.name} conflicts with ${this.profiles[conflictId]?.name || conflictId}`
          });
        }
      }
    }
    
    // Check resource requirements
    const requirements = this.calculateResourceRequirements(profileIds);
    if (requirements.minMemory > 32) {
      warnings.push({
        type: 'high_resources',
        message: `Selected profiles require ${requirements.minMemory}GB RAM - ensure your system has sufficient resources`
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolvedProfiles: allProfiles,
      requirements
    };
  }

  detectCircularDependencies(profileIds) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (profileId, path = []) => {
      if (recursionStack.has(profileId)) {
        const cycleStart = path.indexOf(profileId);
        cycles.push(path.slice(cycleStart).concat(profileId));
        return;
      }
      
      if (visited.has(profileId)) {
        return;
      }
      
      visited.add(profileId);
      recursionStack.add(profileId);
      path.push(profileId);
      
      const profile = this.profiles[profileId];
      if (profile && profile.dependencies) {
        for (const dep of profile.dependencies) {
          dfs(dep, [...path]);
        }
      }
      
      recursionStack.delete(profileId);
    };
    
    for (const profileId of profileIds) {
      dfs(profileId);
    }
    
    return cycles;
  }

  detectConflicts(profileIds) {
    const conflicts = [];
    const allProfiles = this.resolveProfileDependencies(profileIds);
    const portMap = new Map();
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const port of profile.ports) {
        if (portMap.has(port)) {
          conflicts.push({
            type: 'port',
            port,
            profiles: [portMap.get(port), profileId],
            message: `Port ${port} is used by both ${portMap.get(port)} and ${profileId}`
          });
        } else {
          portMap.set(port, profileId);
        }
      }
    }
    
    return conflicts;
  }

  // Template-related methods (direct implementation to avoid circular references)
  getTemplatesByCategory(category) {
    return Object.values(this.templates).filter(template => 
      template.category === category
    );
  }

  getTemplatesByUseCase(useCase) {
    return Object.values(this.templates).filter(template => 
      template.useCase === useCase
    );
  }

  searchTemplatesByTags(tags) {
    return Object.values(this.templates).filter(template => 
      template.tags && template.tags.some(tag => tags.includes(tag))
    );
  }

  applyTemplate(templateId, baseConfig = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Merge template config with base config (template takes precedence)
    const mergedConfig = { ...baseConfig, ...template.config };

    // Apply developer mode if template specifies it
    if (template.developerMode) {
      return this.applyDeveloperMode(mergedConfig, true);
    }

    return mergedConfig;
  }

  validateTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Validate that all profiles in template exist
    for (const profileId of template.profiles) {
      if (!this.profiles[profileId]) {
        errors.push(`Template references unknown profile: ${profileId}`);
      }
    }

    // Basic profile conflict checking
    if (errors.length === 0) {
      const conflicts = this.checkProfileConflicts(template.profiles);
      if (conflicts.length > 0) {
        errors.push(...conflicts.map(c => `Profile conflict: ${c.profile1} conflicts with ${c.profile2}`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      template
    };
  }

  getTemplateRecommendations(systemResources, useCase) {
    const templates = Object.values(this.templates);
    const recommendations = [];

    for (const template of templates) {
      let score = 0;
      let suitability = 'suitable';
      const reasons = [];

      // Check resource compatibility
      if (systemResources.memory >= template.resources.recommendedMemory) {
        score += 3;
        reasons.push('Meets recommended memory requirements');
      } else if (systemResources.memory >= template.resources.minMemory) {
        score += 1;
        reasons.push('Meets minimum memory requirements');
      } else {
        suitability = 'insufficient';
        reasons.push(`Requires ${template.resources.minMemory}GB RAM (you have ${systemResources.memory}GB)`);
      }

      if (systemResources.cpu >= template.resources.recommendedCpu) {
        score += 2;
      } else if (systemResources.cpu >= template.resources.minCpu) {
        score += 1;
      }

      if (systemResources.disk >= template.resources.recommendedDisk) {
        score += 2;
      } else if (systemResources.disk >= template.resources.minDisk) {
        score += 1;
      }

      // Use case matching
      if (template.useCase === useCase) {
        score += 5;
        reasons.push('Perfect match for your use case');
      }

      // Category bonus for beginners
      if (useCase === 'personal' && template.category === 'beginner') {
        score += 2;
        reasons.push('Beginner-friendly');
      }

      recommendations.push({
        template,
        score,
        suitability,
        reasons,
        recommended: score >= 5 && suitability === 'suitable'
      });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  createCustomTemplate(templateData) {
    const { id, name, description, profiles, config, metadata = {} } = templateData;

    // Validate required fields
    if (!id || !name || !description || !profiles || !config) {
      throw new Error('Missing required template fields: id, name, description, profiles, config');
    }

    // Validate profiles exist
    for (const profileId of profiles) {
      if (!this.profiles[profileId]) {
        throw new Error(`Unknown profile: ${profileId}`);
      }
    }

    // Calculate resources based on selected profiles
    const resources = this.calculateResourceRequirements(profiles);

    const template = {
      id,
      name,
      description,
      longDescription: metadata.longDescription || description,
      profiles,
      category: metadata.category || 'custom',
      useCase: metadata.useCase || 'custom',
      estimatedSetupTime: metadata.estimatedSetupTime || 'Variable',
      syncTime: metadata.syncTime || 'Variable',
      icon: metadata.icon || '⚙️',
      config,
      resources,
      features: metadata.features || [],
      benefits: metadata.benefits || [],
      customizable: true,
      custom: true,
      createdAt: new Date().toISOString(),
      tags: metadata.tags || ['custom']
    };

    return template;
  }

  saveCustomTemplate(template) {
    if (!template.id) {
      throw new Error('Template must have an ID');
    }

    this.templates[template.id] = template;
    return true;
  }

  deleteCustomTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    if (!template.custom) {
      throw new Error('Cannot delete built-in templates');
    }

    delete this.templates[templateId];
    return true;
  }

  // Helper methods
  checkProfileConflicts(profileIds) {
    const conflicts = [];
    
    for (const profileId of profileIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const conflictId of profile.conflicts || []) {
        if (profileIds.includes(conflictId)) {
          conflicts.push({ profile1: profileId, profile2: conflictId });
        }
      }
    }
    
    return conflicts;
  }

  calculateResourceRequirements(profileIds) {
    let minMemory = 0;
    let minCpu = 0;
    let minDisk = 0;
    let recommendedMemory = 0;
    let recommendedCpu = 0;
    let recommendedDisk = 0;

    for (const profileId of profileIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;

      minMemory += profile.resources.minMemory;
      minCpu = Math.max(minCpu, profile.resources.minCpu);
      minDisk += profile.resources.minDisk;
      recommendedMemory += profile.resources.recommendedMemory;
      recommendedCpu = Math.max(recommendedCpu, profile.resources.recommendedCpu);
      recommendedDisk += profile.resources.recommendedDisk;
    }

    return {
      minMemory,
      minCpu,
      minDisk,
      recommendedMemory,
      recommendedCpu,
      recommendedDisk
    };
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