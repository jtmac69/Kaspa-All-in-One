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
          { name: 'wallet', required: false, startupOrder: 1, description: 'Kaspa wallet' },
          { name: 'dashboard', required: true, startupOrder: 3, description: 'Management dashboard' },
          { name: 'nginx', required: true, startupOrder: 3, description: 'Reverse proxy' }
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
        description: 'Basic Kaspa node for personal use',
        profiles: ['core'],
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true'
        }
      },
      'public-node': {
        id: 'public-node',
        name: 'Public Node',
        description: 'Public-facing Kaspa node with indexer services',
        profiles: ['core', 'indexer-services'],
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true'
        }
      },
      'full-stack': {
        id: 'full-stack',
        name: 'Full Stack',
        description: 'Complete deployment with all services',
        profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true'
        }
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
}

module.exports = ProfileManager;
