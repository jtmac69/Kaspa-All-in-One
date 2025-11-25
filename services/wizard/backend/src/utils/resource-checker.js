const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const fs = require('fs').promises;

const execAsync = promisify(exec);

/**
 * Resource Checker - Detects system resources and provides recommendations
 * for Kaspa All-in-One deployment profiles
 */
class ResourceChecker {
  constructor() {
    this.componentRequirements = this.loadComponentRequirements();
    this.profileRequirements = this.loadProfileRequirements();
  }

  /**
   * Component requirements database
   * All memory values in GB, disk in GB
   */
  loadComponentRequirements() {
    return {
      'dashboard': {
        name: 'Dashboard',
        minRAM: 0.1,
        recommendedRAM: 0.256,
        optimalRAM: 0.5,
        minDisk: 0.1,
        minCPU: 1,
        description: 'Web-based monitoring and control interface'
      },
      'kaspa-node-sync': {
        name: 'Kaspa Node (Syncing)',
        minRAM: 4,
        recommendedRAM: 8,
        optimalRAM: 16,
        minDisk: 50,
        minCPU: 2,
        description: 'Core blockchain node during initial sync',
        notes: 'High memory usage during sync, lower after completion'
      },
      'kaspa-node-synced': {
        name: 'Kaspa Node (Synced)',
        minRAM: 2,
        recommendedRAM: 4,
        optimalRAM: 8,
        minDisk: 50,
        minCPU: 2,
        description: 'Core blockchain node after sync complete'
      },
      'kasia-indexer': {
        name: 'Kasia Indexer',
        minRAM: 1,
        recommendedRAM: 2,
        optimalRAM: 4,
        minDisk: 10,
        minCPU: 1,
        description: 'Kaspa messaging indexer'
      },
      'k-indexer': {
        name: 'K-Social Indexer',
        minRAM: 1,
        recommendedRAM: 2,
        optimalRAM: 4,
        minDisk: 20,
        minCPU: 1,
        description: 'Social media indexer'
      },
      'simply-kaspa-indexer': {
        name: 'Simply Kaspa Indexer',
        minRAM: 1,
        recommendedRAM: 2,
        optimalRAM: 4,
        minDisk: 30,
        minCPU: 1,
        description: 'General-purpose blockchain indexer'
      },
      'timescaledb': {
        name: 'TimescaleDB',
        minRAM: 2,
        recommendedRAM: 4,
        optimalRAM: 8,
        minDisk: 50,
        minCPU: 2,
        description: 'Time-series database for indexers'
      },
      'archive-db': {
        name: 'Archive Database',
        minRAM: 4,
        recommendedRAM: 8,
        optimalRAM: 16,
        minDisk: 200,
        minCPU: 4,
        description: 'Long-term data retention database'
      },
      'nginx': {
        name: 'Nginx',
        minRAM: 0.05,
        recommendedRAM: 0.128,
        optimalRAM: 0.256,
        minDisk: 0.01,
        minCPU: 1,
        description: 'Reverse proxy and SSL termination'
      },
      'kasia-app': {
        name: 'Kasia App',
        minRAM: 0.5,
        recommendedRAM: 1,
        optimalRAM: 2,
        minDisk: 1,
        minCPU: 1,
        description: 'Kaspa messaging application'
      },
      'k-social-app': {
        name: 'K-Social App',
        minRAM: 0.5,
        recommendedRAM: 1,
        optimalRAM: 2,
        minDisk: 1,
        minCPU: 1,
        description: 'Social media application'
      },
      'kaspa-stratum': {
        name: 'Kaspa Stratum Bridge',
        minRAM: 0.5,
        recommendedRAM: 1,
        optimalRAM: 2,
        minDisk: 1,
        minCPU: 1,
        description: 'Mining stratum bridge'
      }
    };
  }

  /**
   * Profile requirements database
   */
  loadProfileRequirements() {
    return {
      'core': {
        name: 'Core',
        description: 'Essential services (Dashboard, Nginx)',
        components: ['dashboard', 'nginx'],
        minRAM: 0.512,
        recommendedRAM: 1,
        minDisk: 1,
        minCPU: 1,
        suitableFor: 'All systems'
      },
      'core-remote': {
        name: 'Core + Remote Node',
        description: 'Dashboard with remote Kaspa node connection',
        components: ['dashboard', 'nginx'],
        minRAM: 1,
        recommendedRAM: 2,
        minDisk: 2,
        minCPU: 1,
        suitableFor: 'Systems with <8GB RAM',
        notes: 'Recommended for limited resources'
      },
      'core-local': {
        name: 'Core + Local Node',
        description: 'Dashboard with local Kaspa node',
        components: ['dashboard', 'nginx', 'kaspa-node-sync'],
        minRAM: 8,
        recommendedRAM: 12,
        minDisk: 60,
        minCPU: 2,
        suitableFor: 'Systems with 8GB+ RAM'
      },
      'explorer': {
        name: 'Explorer',
        description: 'Indexing services with TimescaleDB',
        components: ['dashboard', 'nginx', 'kaspa-node-sync', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'],
        minRAM: 12,
        recommendedRAM: 16,
        minDisk: 150,
        minCPU: 4,
        suitableFor: 'Systems with 16GB+ RAM'
      },
      'production': {
        name: 'Production',
        description: 'User-facing applications',
        components: ['dashboard', 'nginx', 'kaspa-node-sync', 'kasia-indexer', 'kasia-app', 'k-indexer', 'k-social-app'],
        minRAM: 16,
        recommendedRAM: 20,
        minDisk: 200,
        minCPU: 4,
        suitableFor: 'Systems with 16GB+ RAM'
      },
      'archive': {
        name: 'Archive',
        description: 'Long-term data retention',
        components: ['dashboard', 'nginx', 'kaspa-node-sync', 'simply-kaspa-indexer', 'archive-db'],
        minRAM: 24,
        recommendedRAM: 32,
        minDisk: 500,
        minCPU: 4,
        suitableFor: 'Systems with 32GB+ RAM'
      },
      'mining': {
        name: 'Mining',
        description: 'Mining-specific services',
        components: ['dashboard', 'nginx', 'kaspa-node-sync', 'kaspa-stratum'],
        minRAM: 10,
        recommendedRAM: 12,
        minDisk: 60,
        minCPU: 2,
        suitableFor: 'Systems with 12GB+ RAM'
      }
    };
  }

  /**
   * Detect system resources (OS-specific)
   */
  async detectResources() {
    const platform = os.platform();
    const resources = {
      platform,
      timestamp: new Date().toISOString()
    };

    // Detect RAM
    resources.memory = await this.detectMemory(platform);
    
    // Detect CPU
    resources.cpu = this.detectCPU();
    
    // Detect disk space
    resources.disk = await this.detectDisk(platform);
    
    // Detect Docker limits
    resources.docker = await this.detectDockerLimits();

    return resources;
  }

  /**
   * Detect memory (OS-specific)
   */
  async detectMemory(platform) {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    const memory = {
      total: totalMemory,
      free: freeMemory,
      totalGB: (totalMemory / (1024 ** 3)).toFixed(2),
      freeGB: (freeMemory / (1024 ** 3)).toFixed(2),
      usedGB: ((totalMemory - freeMemory) / (1024 ** 3)).toFixed(2)
    };

    // Try to get more accurate available memory on Linux
    if (platform === 'linux') {
      try {
        const { stdout } = await execAsync('cat /proc/meminfo | grep MemAvailable');
        const match = stdout.match(/MemAvailable:\s+(\d+)\s+kB/);
        if (match) {
          const availableKB = parseInt(match[1]);
          memory.available = availableKB * 1024;
          memory.availableGB = (availableKB / (1024 ** 2)).toFixed(2);
        }
      } catch (error) {
        // Fall back to free memory
        memory.available = freeMemory;
        memory.availableGB = memory.freeGB;
      }
    } else {
      memory.available = freeMemory;
      memory.availableGB = memory.freeGB;
    }

    return memory;
  }

  /**
   * Detect CPU information
   */
  detectCPU() {
    const cpus = os.cpus();
    return {
      count: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed
    };
  }

  /**
   * Detect disk space (OS-specific)
   */
  async detectDisk(platform) {
    try {
      let command;
      if (platform === 'win32') {
        command = 'wmic logicaldisk get size,freespace,caption';
      } else {
        command = 'df -k . | tail -1';
      }

      const { stdout } = await execAsync(command);
      
      if (platform === 'win32') {
        // Parse Windows output
        const lines = stdout.trim().split('\n').slice(1);
        const parts = lines[0].trim().split(/\s+/);
        return {
          total: parseInt(parts[2]),
          free: parseInt(parts[1]),
          totalGB: (parseInt(parts[2]) / (1024 ** 3)).toFixed(2),
          freeGB: (parseInt(parts[1]) / (1024 ** 3)).toFixed(2),
          type: 'unknown'
        };
      } else {
        // Parse Unix output
        const parts = stdout.trim().split(/\s+/);
        const totalKB = parseInt(parts[1]);
        const freeKB = parseInt(parts[3]);
        
        // Try to detect disk type (SSD vs HDD)
        let diskType = 'unknown';
        try {
          if (platform === 'linux') {
            const { stdout: rotational } = await execAsync('cat /sys/block/sda/queue/rotational 2>/dev/null || echo "unknown"');
            diskType = rotational.trim() === '0' ? 'SSD' : rotational.trim() === '1' ? 'HDD' : 'unknown';
          } else if (platform === 'darwin') {
            const { stdout: diskutil } = await execAsync('diskutil info / | grep "Solid State"');
            diskType = diskutil.includes('Yes') ? 'SSD' : 'HDD';
          }
        } catch (error) {
          // Ignore errors, keep unknown
        }

        return {
          total: totalKB * 1024,
          free: freeKB * 1024,
          totalGB: (totalKB / (1024 ** 2)).toFixed(2),
          freeGB: (freeKB / (1024 ** 2)).toFixed(2),
          type: diskType
        };
      }
    } catch (error) {
      return {
        error: error.message,
        totalGB: 'unknown',
        freeGB: 'unknown',
        type: 'unknown'
      };
    }
  }

  /**
   * Detect Docker memory limits
   */
  async detectDockerLimits() {
    try {
      const { stdout } = await execAsync('docker info --format "{{.MemTotal}}"');
      const memTotal = parseInt(stdout.trim());
      
      return {
        memoryLimit: memTotal,
        memoryLimitGB: (memTotal / (1024 ** 3)).toFixed(2),
        hasLimit: memTotal > 0
      };
    } catch (error) {
      return {
        error: 'Unable to detect Docker limits',
        memoryLimit: null,
        memoryLimitGB: 'unknown',
        hasLimit: false
      };
    }
  }

  /**
   * Check component compatibility with system resources
   */
  checkComponentCompatibility(resources, componentKey) {
    const component = this.componentRequirements[componentKey];
    if (!component) {
      return { compatible: false, reason: 'Unknown component' };
    }

    const availableRAM = parseFloat(resources.memory.availableGB);
    const availableDisk = parseFloat(resources.disk.freeGB);
    const availableCPU = resources.cpu.count;

    // Check Docker limits if available
    const effectiveRAM = resources.docker.hasLimit 
      ? Math.min(availableRAM, parseFloat(resources.docker.memoryLimitGB))
      : availableRAM;

    const checks = {
      ram: {
        available: effectiveRAM,
        min: component.minRAM,
        recommended: component.recommendedRAM,
        optimal: component.optimalRAM,
        meetsMin: effectiveRAM >= component.minRAM,
        meetsRecommended: effectiveRAM >= component.recommendedRAM,
        meetsOptimal: effectiveRAM >= component.optimalRAM
      },
      disk: {
        available: availableDisk,
        min: component.minDisk,
        meetsMin: availableDisk >= component.minDisk
      },
      cpu: {
        available: availableCPU,
        min: component.minCPU,
        meetsMin: availableCPU >= component.minCPU
      }
    };

    // Determine compatibility rating
    let rating, recommendation;
    if (!checks.ram.meetsMin || !checks.disk.meetsMin || !checks.cpu.meetsMin) {
      rating = 'not-recommended';
      recommendation = 'System does not meet minimum requirements';
    } else if (checks.ram.meetsOptimal) {
      rating = 'optimal';
      recommendation = 'System exceeds recommended requirements';
    } else if (checks.ram.meetsRecommended) {
      rating = 'recommended';
      recommendation = 'System meets recommended requirements';
    } else {
      rating = 'possible';
      recommendation = 'System meets minimum requirements but may experience performance issues';
    }

    return {
      component: component.name,
      rating,
      recommendation,
      checks,
      notes: component.notes
    };
  }

  /**
   * Check profile compatibility
   */
  checkProfileCompatibility(resources, profileKey) {
    const profile = this.profileRequirements[profileKey];
    if (!profile) {
      return { compatible: false, reason: 'Unknown profile' };
    }

    const availableRAM = parseFloat(resources.memory.availableGB);
    const availableDisk = parseFloat(resources.disk.freeGB);
    const availableCPU = resources.cpu.count;

    // Check Docker limits
    const effectiveRAM = resources.docker.hasLimit 
      ? Math.min(availableRAM, parseFloat(resources.docker.memoryLimitGB))
      : availableRAM;

    const checks = {
      ram: {
        available: effectiveRAM,
        min: profile.minRAM,
        recommended: profile.recommendedRAM,
        meetsMin: effectiveRAM >= profile.minRAM,
        meetsRecommended: effectiveRAM >= profile.recommendedRAM
      },
      disk: {
        available: availableDisk,
        min: profile.minDisk,
        meetsMin: availableDisk >= profile.minDisk
      },
      cpu: {
        available: availableCPU,
        min: profile.minCPU,
        meetsMin: availableCPU >= profile.minCPU
      }
    };

    // Determine compatibility rating
    let rating, recommendation;
    if (!checks.ram.meetsMin || !checks.disk.meetsMin || !checks.cpu.meetsMin) {
      rating = 'not-recommended';
      recommendation = `System does not meet minimum requirements. ${profile.suitableFor}`;
    } else if (checks.ram.meetsRecommended) {
      rating = 'recommended';
      recommendation = `System meets recommended requirements. ${profile.suitableFor}`;
    } else {
      rating = 'possible';
      recommendation = `System meets minimum requirements but recommended configuration needs more resources. ${profile.suitableFor}`;
    }

    return {
      profile: profile.name,
      description: profile.description,
      rating,
      recommendation,
      checks,
      components: profile.components.map(c => this.componentRequirements[c]?.name || c),
      notes: profile.notes
    };
  }

  /**
   * Generate recommendations based on system resources
   */
  generateRecommendations(resources) {
    const availableRAM = parseFloat(resources.memory.availableGB);
    const availableDisk = parseFloat(resources.disk.freeGB);
    
    const recommendations = {
      primary: null,
      alternatives: [],
      warnings: [],
      suggestions: []
    };

    // Determine primary recommendation
    if (availableRAM < 2) {
      recommendations.primary = {
        profile: 'core',
        reason: 'Very limited RAM - Dashboard only with remote node recommended',
        useRemoteNode: true
      };
      recommendations.warnings.push('System has very limited RAM. Local Kaspa node will not work.');
    } else if (availableRAM < 8) {
      recommendations.primary = {
        profile: 'core-remote',
        reason: 'Limited RAM - Dashboard with remote node recommended',
        useRemoteNode: true
      };
      recommendations.warnings.push('System has limited RAM. Local Kaspa node requires 8GB+ RAM.');
      recommendations.suggestions.push('Consider upgrading RAM to 8GB+ to run local node');
    } else if (availableRAM < 16) {
      recommendations.primary = {
        profile: 'core-local',
        reason: 'Moderate RAM - Dashboard with local node possible',
        useRemoteNode: false
      };
      recommendations.alternatives.push({
        profile: 'mining',
        reason: 'Mining profile also possible with your resources'
      });
    } else if (availableRAM < 24) {
      recommendations.primary = {
        profile: 'explorer',
        reason: 'Good RAM - Explorer profile recommended',
        useRemoteNode: false
      };
      recommendations.alternatives.push({
        profile: 'production',
        reason: 'Production profile also possible'
      });
    } else {
      recommendations.primary = {
        profile: 'archive',
        reason: 'Excellent RAM - Full archive profile possible',
        useRemoteNode: false
      };
      recommendations.alternatives.push({
        profile: 'production',
        reason: 'Production profile for user-facing applications'
      });
    }

    // Check disk space
    if (availableDisk < 100) {
      recommendations.warnings.push(`Limited disk space (${availableDisk}GB). Kaspa node requires 50GB+ and will grow over time.`);
      recommendations.suggestions.push('Consider adding more disk space or using remote node');
    }

    // Check disk type
    if (resources.disk.type === 'HDD') {
      recommendations.suggestions.push('SSD recommended for better performance, especially for indexers');
    }

    // Check Docker limits
    if (resources.docker.hasLimit) {
      const dockerLimit = parseFloat(resources.docker.memoryLimitGB);
      if (dockerLimit < availableRAM) {
        recommendations.warnings.push(`Docker memory limit (${dockerLimit}GB) is lower than system RAM. Increase Docker memory limit in Docker Desktop settings.`);
      }
    }

    return recommendations;
  }

  /**
   * Generate auto-configuration based on resources
   */
  async generateAutoConfiguration(resources) {
    const recommendations = this.generateRecommendations(resources);
    const primaryProfile = recommendations.primary.profile;
    
    const config = {
      profile: primaryProfile,
      useRemoteNode: recommendations.primary.useRemoteNode,
      envVars: {},
      warnings: recommendations.warnings,
      suggestions: recommendations.suggestions
    };

    // Generate environment variables
    if (config.useRemoteNode) {
      config.envVars.KASPA_NODE_MODE = 'remote';
      config.envVars.REMOTE_KASPA_NODE_URL = 'https://api.kaspa.org';
      config.envVars.KASPA_RPC_SERVER = 'https://api.kaspa.org';
    } else {
      config.envVars.KASPA_NODE_MODE = 'local';
      config.envVars.KASPA_RPC_SERVER = 'kaspa-node:16110';
    }

    // Set resource limits based on available resources
    const availableRAM = parseFloat(resources.memory.availableGB);
    if (availableRAM < 8) {
      config.envVars.KASPA_NODE_MEMORY_LIMIT = '4g';
    } else if (availableRAM < 16) {
      config.envVars.KASPA_NODE_MEMORY_LIMIT = '8g';
    } else {
      config.envVars.KASPA_NODE_MEMORY_LIMIT = '12g';
    }

    return config;
  }

  /**
   * Get all component requirements
   */
  getComponentRequirements() {
    return this.componentRequirements;
  }

  /**
   * Get all profile requirements
   */
  getProfileRequirements() {
    return this.profileRequirements;
  }

  /**
   * Calculate combined resources across selected profiles with deduplication
   * Handles shared resources like TimescaleDB used by multiple indexers
   * @param {string[]} profileIds - Array of selected profile IDs
   * @param {Object} systemResources - Detected system resources (optional)
   * @returns {Object} Combined resource requirements with deduplication
   */
  async calculateCombinedResources(profileIds, systemResources = null) {
    if (!profileIds || profileIds.length === 0) {
      return {
        success: false,
        error: 'No profiles selected',
        requirements: null
      };
    }

    // Detect system resources if not provided
    if (!systemResources) {
      systemResources = await this.detectResources();
    }

    // Track which services are included and which profiles use them
    const serviceUsage = new Map();
    const sharedServices = new Set(['timescaledb', 'nginx', 'dashboard']);
    
    // Initialize combined requirements
    const combined = {
      minRAM: 0,
      recommendedRAM: 0,
      optimalRAM: 0,
      minDisk: 0,
      minCPU: 0,
      services: [],
      sharedResources: [],
      profileBreakdown: []
    };

    // Process each profile
    for (const profileId of profileIds) {
      const profile = this.profileRequirements[profileId];
      if (!profile) {
        continue;
      }

      const profileResources = {
        profileId,
        profileName: profile.name,
        minRAM: 0,
        recommendedRAM: 0,
        minDisk: 0,
        minCPU: profile.minCPU,
        components: []
      };

      // Process each component in the profile
      for (const componentKey of profile.components) {
        const component = this.componentRequirements[componentKey];
        if (!component) {
          continue;
        }

        // Check if this service is already counted
        if (serviceUsage.has(componentKey)) {
          // Service is shared - add to shared list
          const usage = serviceUsage.get(componentKey);
          usage.usedBy.push(profileId);
          
          if (!combined.sharedResources.find(s => s.service === componentKey)) {
            combined.sharedResources.push({
              service: componentKey,
              name: component.name,
              usedBy: usage.usedBy,
              resources: {
                minRAM: component.minRAM,
                recommendedRAM: component.recommendedRAM,
                optimalRAM: component.optimalRAM,
                minDisk: component.minDisk,
                minCPU: component.minCPU
              },
              note: `Shared by ${usage.usedBy.length} profiles`
            });
          }
          
          profileResources.components.push({
            name: component.name,
            shared: true,
            note: 'Resources already counted in another profile'
          });
        } else {
          // First time seeing this service - count its resources
          serviceUsage.set(componentKey, {
            component: component.name,
            usedBy: [profileId]
          });

          combined.minRAM += component.minRAM;
          combined.recommendedRAM += component.recommendedRAM;
          combined.optimalRAM += component.optimalRAM;
          combined.minDisk += component.minDisk;
          combined.minCPU = Math.max(combined.minCPU, component.minCPU);

          profileResources.minRAM += component.minRAM;
          profileResources.recommendedRAM += component.recommendedRAM;
          profileResources.minDisk += component.minDisk;

          profileResources.components.push({
            name: component.name,
            shared: sharedServices.has(componentKey),
            resources: {
              minRAM: component.minRAM,
              recommendedRAM: component.recommendedRAM,
              minDisk: component.minDisk
            }
          });

          combined.services.push({
            service: componentKey,
            name: component.name,
            profile: profileId
          });
        }
      }

      combined.profileBreakdown.push(profileResources);
    }

    // Compare against available system resources
    const availableRAM = parseFloat(systemResources.memory.availableGB);
    const availableDisk = parseFloat(systemResources.disk.freeGB);
    const availableCPU = systemResources.cpu.count;

    // Check Docker limits
    const effectiveRAM = systemResources.docker.hasLimit 
      ? Math.min(availableRAM, parseFloat(systemResources.docker.memoryLimitGB))
      : availableRAM;

    const comparison = {
      ram: {
        required: combined.minRAM,
        recommended: combined.recommendedRAM,
        optimal: combined.optimalRAM,
        available: effectiveRAM,
        meetsMin: effectiveRAM >= combined.minRAM,
        meetsRecommended: effectiveRAM >= combined.recommendedRAM,
        meetsOptimal: effectiveRAM >= combined.optimalRAM,
        shortfall: effectiveRAM < combined.minRAM ? combined.minRAM - effectiveRAM : 0
      },
      disk: {
        required: combined.minDisk,
        available: availableDisk,
        meetsMin: availableDisk >= combined.minDisk,
        shortfall: availableDisk < combined.minDisk ? combined.minDisk - availableDisk : 0
      },
      cpu: {
        required: combined.minCPU,
        available: availableCPU,
        meetsMin: availableCPU >= combined.minCPU,
        shortfall: availableCPU < combined.minCPU ? combined.minCPU - availableCPU : 0
      }
    };

    // Generate warnings
    const warnings = [];
    if (!comparison.ram.meetsMin) {
      warnings.push({
        type: 'insufficient_ram',
        severity: 'critical',
        message: `Insufficient RAM: ${effectiveRAM.toFixed(1)}GB available, ${combined.minRAM.toFixed(1)}GB required`,
        shortfall: comparison.ram.shortfall.toFixed(1) + 'GB',
        recommendation: 'Reduce selected profiles or upgrade system RAM'
      });
    } else if (!comparison.ram.meetsRecommended) {
      warnings.push({
        type: 'below_recommended_ram',
        severity: 'warning',
        message: `RAM below recommended: ${effectiveRAM.toFixed(1)}GB available, ${combined.recommendedRAM.toFixed(1)}GB recommended`,
        recommendation: 'System will work but may experience performance issues under load'
      });
    }

    if (!comparison.disk.meetsMin) {
      warnings.push({
        type: 'insufficient_disk',
        severity: 'critical',
        message: `Insufficient disk space: ${availableDisk.toFixed(1)}GB available, ${combined.minDisk.toFixed(1)}GB required`,
        shortfall: comparison.disk.shortfall.toFixed(1) + 'GB',
        recommendation: 'Free up disk space or reduce selected profiles'
      });
    }

    if (!comparison.cpu.meetsMin) {
      warnings.push({
        type: 'insufficient_cpu',
        severity: 'warning',
        message: `CPU cores below minimum: ${availableCPU} available, ${combined.minCPU} required`,
        recommendation: 'System may experience slow performance'
      });
    }

    // Check Docker limits specifically
    if (systemResources.docker.hasLimit) {
      const dockerLimit = parseFloat(systemResources.docker.memoryLimitGB);
      if (dockerLimit < combined.minRAM) {
        warnings.push({
          type: 'docker_memory_limit',
          severity: 'critical',
          message: `Docker memory limit (${dockerLimit.toFixed(1)}GB) is below required RAM (${combined.minRAM.toFixed(1)}GB)`,
          recommendation: 'Increase Docker memory limit in Docker Desktop settings'
        });
      }
    }

    // Generate optimization recommendations
    const optimizations = this.generateOptimizationRecommendations(
      combined,
      comparison,
      profileIds,
      systemResources
    );

    return {
      success: true,
      profiles: profileIds,
      requirements: {
        minRAM: combined.minRAM,
        recommendedRAM: combined.recommendedRAM,
        optimalRAM: combined.optimalRAM,
        minDisk: combined.minDisk,
        minCPU: combined.minCPU
      },
      services: combined.services,
      sharedResources: combined.sharedResources,
      profileBreakdown: combined.profileBreakdown,
      systemResources: {
        ram: effectiveRAM,
        disk: availableDisk,
        cpu: availableCPU,
        dockerLimit: systemResources.docker.hasLimit ? parseFloat(systemResources.docker.memoryLimitGB) : null
      },
      comparison,
      warnings,
      optimizations,
      sufficient: comparison.ram.meetsMin && comparison.disk.meetsMin && comparison.cpu.meetsMin
    };
  }

  /**
   * Generate resource optimization recommendations
   * @param {Object} combined - Combined resource requirements
   * @param {Object} comparison - Resource comparison results
   * @param {string[]} profileIds - Selected profile IDs
   * @param {Object} systemResources - System resources
   * @returns {Array} Array of optimization recommendations
   */
  generateOptimizationRecommendations(combined, comparison, profileIds, systemResources) {
    const recommendations = [];

    // If resources are insufficient, suggest profile reductions
    if (!comparison.ram.meetsMin || !comparison.disk.meetsMin) {
      // Suggest using remote node instead of local
      if (profileIds.includes('core-local') || profileIds.includes('explorer')) {
        recommendations.push({
          type: 'use_remote_node',
          priority: 'high',
          title: 'Use Remote Kaspa Node',
          description: 'Switch to remote node connection to save 8-12GB RAM',
          savings: {
            ram: '8-12GB',
            disk: '50GB+'
          },
          action: 'Replace local node profiles with core-remote profile'
        });
      }

      // Suggest using public indexers
      if (profileIds.includes('explorer') || profileIds.includes('production')) {
        recommendations.push({
          type: 'use_public_indexers',
          priority: 'high',
          title: 'Use Public Indexers',
          description: 'Connect to public indexer services instead of running local indexers',
          savings: {
            ram: '8-12GB',
            disk: '100GB+'
          },
          action: 'Configure applications to use public indexer endpoints'
        });
      }

      // Suggest removing optional profiles
      const optionalProfiles = ['mining', 'archive'];
      const selectedOptional = profileIds.filter(p => optionalProfiles.includes(p));
      if (selectedOptional.length > 0) {
        recommendations.push({
          type: 'remove_optional',
          priority: 'medium',
          title: 'Remove Optional Profiles',
          description: `Consider removing optional profiles: ${selectedOptional.join(', ')}`,
          action: 'Deselect optional profiles to reduce resource requirements'
        });
      }
    }

    // If RAM is below recommended but above minimum
    if (comparison.ram.meetsMin && !comparison.ram.meetsRecommended) {
      recommendations.push({
        type: 'upgrade_ram',
        priority: 'medium',
        title: 'Upgrade System RAM',
        description: `System will work but ${(comparison.ram.recommended - comparison.ram.available).toFixed(1)}GB more RAM recommended for optimal performance`,
        action: 'Consider upgrading system RAM when possible'
      });
    }

    // Disk type optimization
    if (systemResources.disk.type === 'HDD') {
      recommendations.push({
        type: 'upgrade_to_ssd',
        priority: 'medium',
        title: 'Upgrade to SSD',
        description: 'HDD detected. SSD strongly recommended for indexer services and node sync',
        benefit: '10-50x faster sync times and query performance',
        action: 'Consider migrating to SSD storage'
      });
    }

    // Docker limit optimization
    if (systemResources.docker.hasLimit) {
      const dockerLimit = parseFloat(systemResources.docker.memoryLimitGB);
      const systemRAM = parseFloat(systemResources.memory.totalGB);
      if (dockerLimit < systemRAM * 0.8) {
        recommendations.push({
          type: 'increase_docker_limit',
          priority: 'high',
          title: 'Increase Docker Memory Limit',
          description: `Docker is limited to ${dockerLimit.toFixed(1)}GB but system has ${systemRAM.toFixed(1)}GB total`,
          action: 'Increase Docker memory limit in Docker Desktop settings to at least 80% of system RAM'
        });
      }
    }

    // Shared resource optimization
    if (combined.sharedResources.length > 0) {
      recommendations.push({
        type: 'shared_resources',
        priority: 'info',
        title: 'Shared Resources Detected',
        description: `${combined.sharedResources.length} services are shared across profiles, saving resources`,
        benefit: 'Resource deduplication already applied',
        details: combined.sharedResources.map(s => `${s.name} shared by ${s.usedBy.length} profiles`)
      });
    }

    return recommendations;
  }
}

module.exports = ResourceChecker;
