const fs = require('fs').promises;
const path = require('path');

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
          // Note: nginx and dashboard are part of kaspa-user-applications profile
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
          nodeUsage: 'local', // 'local', 'public', 'for-other-services'
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
          indexerChoice: 'public', // 'public' or 'local'
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
          nodeUsage: 'fallback', // Can use local node or fallback to public
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

    // Developer Mode is now a cross-cutting feature, not a separate profile
    this.developerModeFeatures = {
      debugLogging: true,
      exposedPorts: [9000, 5050], // Portainer, pgAdmin
      inspectionTools: ['portainer', 'pgadmin'],
      logAccess: true,
      developmentUtilities: []
    };
  }

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

  calculateResourceRequirements(profileIds) {
    const allProfiles = this.resolveProfileDependencies(profileIds);
    
    const requirements = {
      minMemory: 0,
      minCpu: 0,
      minDisk: 0,
      recommendedMemory: 0,
      recommendedCpu: 0,
      recommendedDisk: 0,
      ports: new Set()
    };
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      requirements.minMemory += profile.resources.minMemory;
      requirements.minCpu = Math.max(requirements.minCpu, profile.resources.minCpu);
      requirements.minDisk += profile.resources.minDisk;
      requirements.recommendedMemory += profile.resources.recommendedMemory;
      requirements.recommendedCpu = Math.max(requirements.recommendedCpu, profile.resources.recommendedCpu);
      requirements.recommendedDisk += profile.resources.recommendedDisk;
      
      profile.ports.forEach(port => requirements.ports.add(port));
    }
    
    requirements.ports = Array.from(requirements.ports);
    
    return requirements;
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
    
    // Check for conflicts
    const conflicts = this.detectConflicts(profileIds);
    if (conflicts.length > 0) {
      errors.push(...conflicts.map(c => ({
        type: 'conflict',
        message: c.message
      })));
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

  /**
   * Get startup order for services across all selected profiles
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Services sorted by startup order
   */
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
    
    // Sort by startup order, then by profile
    return services.sort((a, b) => {
      if (a.startupOrder !== b.startupOrder) {
        return a.startupOrder - b.startupOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Apply developer mode features to configuration
   * @param {Object} config - Base configuration
   * @param {boolean} enabled - Whether developer mode is enabled
   * @returns {Object} Configuration with developer mode applied
   */
  applyDeveloperMode(config, enabled = false) {
    if (!enabled) {
      return config;
    }

    const devConfig = { ...config };
    
    // Add debug logging
    if (this.developerModeFeatures.debugLogging) {
      devConfig.LOG_LEVEL = 'debug';
    }
    
    // Add development tools
    if (this.developerModeFeatures.inspectionTools) {
      devConfig.ENABLE_PORTAINER = 'true';
      devConfig.ENABLE_PGADMIN = 'true';
    }
    
    // Enable log access
    if (this.developerModeFeatures.logAccess) {
      devConfig.ENABLE_LOG_ACCESS = 'true';
    }
    
    return devConfig;
  }

  /**
   * Get developer mode features
   * @returns {Object} Developer mode features configuration
   */
  getDeveloperModeFeatures() {
    return { ...this.developerModeFeatures };
  }

  /**
   * Detect circular dependencies in profile selection
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {string[][]} Array of circular dependency chains
   */
  detectCircularDependencies(profileIds) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (profileId, path = []) => {
      if (recursionStack.has(profileId)) {
        // Found a cycle
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

  /**
   * Calculate combined resource requirements with deduplication
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object} Deduplicated resource requirements
   */
  calculateResourceRequirements(profileIds) {
    const allProfiles = this.resolveProfileDependencies(profileIds);
    
    const requirements = {
      minMemory: 0,
      minCpu: 0,
      minDisk: 0,
      recommendedMemory: 0,
      recommendedCpu: 0,
      recommendedDisk: 0,
      ports: new Set(),
      sharedResources: []
    };
    
    // Track shared resources to avoid double-counting
    const sharedServices = new Set();
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      // Check for shared TimescaleDB
      const hasTimescaleDB = profile.services.some(s => 
        typeof s === 'object' ? s.name === 'timescaledb' : s === 'timescaledb'
      );
      
      if (hasTimescaleDB) {
        if (!sharedServices.has('timescaledb')) {
          sharedServices.add('timescaledb');
          requirements.sharedResources.push({
            service: 'timescaledb',
            sharedBy: [profileId]
          });
        } else {
          // Already counted, just add to shared list
          const shared = requirements.sharedResources.find(r => r.service === 'timescaledb');
          if (shared) {
            shared.sharedBy.push(profileId);
          }
        }
      }
      
      requirements.minMemory += profile.resources.minMemory;
      requirements.minCpu = Math.max(requirements.minCpu, profile.resources.minCpu);
      requirements.minDisk += profile.resources.minDisk;
      requirements.recommendedMemory += profile.resources.recommendedMemory;
      requirements.recommendedCpu = Math.max(requirements.recommendedCpu, profile.resources.recommendedCpu);
      requirements.recommendedDisk += profile.resources.recommendedDisk;
      
      profile.ports.forEach(port => requirements.ports.add(port));
    }
    
    requirements.ports = Array.from(requirements.ports);
    
    return requirements;
  }

  /**
   * Apply template configuration to base configuration
   * @param {string} templateId - Template ID to apply
   * @param {Object} baseConfig - Base configuration to merge with
   * @returns {Object} Merged configuration
   */
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

  /**
   * Validate template configuration
   * @param {string} templateId - Template ID to validate
   * @returns {Object} Validation result
   */
  validateTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`]
      };
    }

    // Validate that all profiles in template exist
    const errors = [];
    const warnings = [];

    for (const profileId of template.profiles) {
      if (!this.profiles[profileId]) {
        errors.push(`Template references unknown profile: ${profileId}`);
      }
    }

    // Validate profile selection using existing validation
    if (errors.length === 0) {
      const profileValidation = this.validateProfileSelection(template.profiles);
      if (!profileValidation.valid) {
        errors.push(...profileValidation.errors.map(e => e.message));
      }
      warnings.push(...profileValidation.warnings.map(w => w.message));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      template
    };
  }

  /**
   * Get templates by category
   * @param {string} category - Category to filter by ('beginner', 'intermediate', 'advanced')
   * @returns {Object[]} Templates in the specified category
   */
  getTemplatesByCategory(category) {
    return Object.values(this.templates).filter(template => 
      template.category === category
    );
  }

  /**
   * Get templates by use case
   * @param {string} useCase - Use case to filter by ('personal', 'community', 'development', 'production')
   * @returns {Object[]} Templates for the specified use case
   */
  getTemplatesByUseCase(useCase) {
    return Object.values(this.templates).filter(template => 
      template.useCase === useCase
    );
  }

  /**
   * Search templates by tags
   * @param {string[]} tags - Tags to search for
   * @returns {Object[]} Templates matching any of the specified tags
   */
  searchTemplatesByTags(tags) {
    return Object.values(this.templates).filter(template => 
      template.tags && template.tags.some(tag => tags.includes(tag))
    );
  }

  /**
   * Create custom template from current configuration
   * @param {Object} templateData - Template data
   * @param {string} templateData.id - Unique template ID
   * @param {string} templateData.name - Template display name
   * @param {string} templateData.description - Template description
   * @param {string[]} templateData.profiles - Selected profiles
   * @param {Object} templateData.config - Configuration settings
   * @param {Object} templateData.metadata - Additional metadata
   * @returns {Object} Created template
   */
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

    // Calculate resources
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
      resources: {
        minMemory: resources.minMemory,
        minCpu: resources.minCpu,
        minDisk: resources.minDisk,
        recommendedMemory: resources.recommendedMemory,
        recommendedCpu: resources.recommendedCpu,
        recommendedDisk: resources.recommendedDisk
      },
      features: metadata.features || [],
      benefits: metadata.benefits || [],
      customizable: true,
      custom: true,
      createdAt: new Date().toISOString(),
      tags: metadata.tags || ['custom']
    };

    return template;
  }

  /**
   * Save custom template (in a real implementation, this would persist to storage)
   * @param {Object} template - Template to save
   * @returns {boolean} Success status
   */
  saveCustomTemplate(template) {
    if (!template.id) {
      throw new Error('Template must have an ID');
    }

    // In a real implementation, this would save to a file or database
    // For now, we'll just add it to the in-memory templates
    this.templates[template.id] = template;
    return true;
  }

  /**
   * Delete custom template
   * @param {string} templateId - Template ID to delete
   * @returns {boolean} Success status
   */
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

  /**
   * Get template recommendations based on system resources and use case
   * @param {Object} systemResources - Available system resources
   * @param {string} useCase - Intended use case
   * @returns {Object[]} Recommended templates sorted by suitability
   */
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
}

module.exports = ProfileManager;
