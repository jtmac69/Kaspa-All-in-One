const fs = require('fs').promises;
const path = require('path');

class ProfileManager {
  constructor() {
    this.profiles = {
      core: {
        id: 'core',
        name: 'Core',
        description: 'Essential services: Kaspa node, dashboard, and reverse proxy',
        services: ['kaspa-node', 'dashboard', 'nginx'],
        dependencies: [],
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 100,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        ports: [16110, 16111, 3001, 80, 443],
        required: true
      },
      prod: {
        id: 'prod',
        name: 'Production',
        description: 'User-facing applications: Kasia messaging and K-Social platform',
        services: ['kasia', 'kasia-indexer', 'k-social', 'k-indexer'],
        dependencies: ['core', 'explorer'],
        resources: {
          minMemory: 8,
          minCpu: 4,
          minDisk: 200,
          recommendedMemory: 16,
          recommendedCpu: 8,
          recommendedDisk: 1000
        },
        ports: [3002, 3003, 3004, 3005]
      },
      explorer: {
        id: 'explorer',
        name: 'Explorer',
        description: 'Blockchain indexing with TimescaleDB for data analysis',
        services: ['timescaledb', 'simply-kaspa-indexer'],
        dependencies: ['core'],
        resources: {
          minMemory: 8,
          minCpu: 4,
          minDisk: 500,
          recommendedMemory: 16,
          recommendedCpu: 8,
          recommendedDisk: 2000
        },
        ports: [5432, 3006]
      },
      archive: {
        id: 'archive',
        name: 'Archive',
        description: 'Long-term data retention with separate archive database',
        services: ['archive-db', 'archive-indexer'],
        dependencies: ['core', 'explorer'],
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 2000,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 5000
        },
        ports: [5433, 3007]
      },
      development: {
        id: 'development',
        name: 'Development',
        description: 'Development tools: Portainer and pgAdmin',
        services: ['portainer', 'pgadmin'],
        dependencies: ['core'],
        resources: {
          minMemory: 2,
          minCpu: 1,
          minDisk: 10,
          recommendedMemory: 4,
          recommendedCpu: 2,
          recommendedDisk: 50
        },
        ports: [9000, 5050]
      },
      mining: {
        id: 'mining',
        name: 'Mining',
        description: 'Mining stratum bridge for solo or pool mining',
        services: ['kaspa-stratum'],
        dependencies: ['core'],
        resources: {
          minMemory: 2,
          minCpu: 2,
          minDisk: 10,
          recommendedMemory: 4,
          recommendedCpu: 4,
          recommendedDisk: 50
        },
        ports: [5555]
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
        description: 'Public-facing Kaspa node with explorer',
        profiles: ['core', 'explorer'],
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true'
        }
      },
      'developer': {
        id: 'developer',
        name: 'Developer Setup',
        description: 'Full development environment with all tools',
        profiles: ['core', 'explorer', 'development'],
        config: {
          PUBLIC_NODE: 'false',
          ENABLE_MONITORING: 'true',
          LOG_LEVEL: 'debug'
        }
      },
      'full-stack': {
        id: 'full-stack',
        name: 'Full Stack',
        description: 'Complete deployment with all services',
        profiles: ['core', 'prod', 'explorer', 'development'],
        config: {
          PUBLIC_NODE: 'true',
          ENABLE_MONITORING: 'true',
          ENABLE_SSL: 'true'
        }
      }
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
    
    // Check if core profile is included
    const allProfiles = this.resolveProfileDependencies(profileIds);
    if (!allProfiles.includes('core')) {
      errors.push({
        type: 'missing_required',
        message: 'Core profile is required for all deployments'
      });
    }
    
    // Check for conflicts
    const conflicts = this.detectConflicts(profileIds);
    if (conflicts.length > 0) {
      errors.push(...conflicts.map(c => ({
        type: 'conflict',
        message: c.message
      })));
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
}

module.exports = ProfileManager;
