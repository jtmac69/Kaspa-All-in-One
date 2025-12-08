/**
 * Dependency Validator
 * 
 * Validates profile selections for:
 * - Circular dependencies
 * - Prerequisites (e.g., Mining requires Core OR Archive)
 * - Startup order calculation
 * - Conflict detection
 * - Dependency graph building
 */

class DependencyValidator {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Validate a profile selection
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object} Validation result with errors, warnings, and metadata
   */
  validateSelection(profileIds) {
    const errors = [];
    const warnings = [];
    const metadata = {};

    // 0. Check for empty selection
    if (!profileIds || profileIds.length === 0) {
      errors.push({
        type: 'empty_selection',
        message: 'No profiles selected. Please select at least one profile.'
      });
      
      // Return early with minimal metadata
      return {
        valid: false,
        errors,
        warnings,
        metadata: {
          startupOrder: { services: [], grouped: {}, phases: {} },
          dependencyGraph: { nodes: [], edges: [] },
          resolvedProfiles: []
        }
      };
    }

    // 1. Check for circular dependencies
    const cycles = this.detectCircularDependencies(profileIds);
    if (cycles.length > 0) {
      errors.push({
        type: 'circular_dependency',
        message: 'Circular dependencies detected',
        cycles: cycles.map(cycle => cycle.map(id => this.getProfileName(id)).join(' → '))
      });
    }

    // 2. Validate prerequisites
    const prerequisiteErrors = this.validatePrerequisites(profileIds);
    errors.push(...prerequisiteErrors);

    // 3. Check for conflicts
    const conflicts = this.detectConflicts(profileIds);
    if (conflicts.length > 0) {
      errors.push(...conflicts);
    }

    // 4. Calculate startup order
    const startupOrder = this.calculateStartupOrder(profileIds);
    metadata.startupOrder = startupOrder;

    // 5. Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(profileIds);
    metadata.dependencyGraph = dependencyGraph;

    // 6. Resolve all dependencies
    const resolvedProfiles = this.resolveDependencies(profileIds);
    metadata.resolvedProfiles = resolvedProfiles;

    // 7. Check resource requirements
    const resourceWarnings = this.checkResourceRequirements(profileIds);
    warnings.push(...resourceWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Detect circular dependencies using DFS
   * @param {string[]} profileIds - Profile IDs to check
   * @returns {string[][]} Array of circular dependency chains
   */
  detectCircularDependencies(profileIds) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (profileId, path = []) => {
      // Check if we've found a cycle
      if (recursionStack.has(profileId)) {
        const cycleStart = path.indexOf(profileId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), profileId]);
        }
        return;
      }

      // Skip if already fully explored
      if (visited.has(profileId)) {
        return;
      }

      // Mark as being explored
      visited.add(profileId);
      recursionStack.add(profileId);
      path.push(profileId);

      // Get profile and explore dependencies
      const profile = this.profileManager.getProfile(profileId);
      if (profile && profile.dependencies) {
        for (const dep of profile.dependencies) {
          dfs(dep, [...path]);
        }
      }

      // Remove from recursion stack after exploring
      recursionStack.delete(profileId);
    };

    // Start DFS from each selected profile
    for (const profileId of profileIds) {
      if (!visited.has(profileId)) {
        dfs(profileId);
      }
    }

    return cycles;
  }

  /**
   * Validate prerequisites for all profiles
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Array of prerequisite errors
   */
  validatePrerequisites(profileIds) {
    const errors = [];
    const resolvedProfiles = this.resolveDependencies(profileIds);

    for (const profileId of profileIds) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) {
        errors.push({
          type: 'invalid_profile',
          profile: profileId,
          message: `Profile '${profileId}' does not exist`
        });
        continue;
      }

      // Check if profile has prerequisites
      if (profile.prerequisites && profile.prerequisites.length > 0) {
        const hasPrerequisite = profile.prerequisites.some(prereq =>
          resolvedProfiles.includes(prereq)
        );

        if (!hasPrerequisite) {
          const prerequisiteNames = profile.prerequisites
            .map(id => this.getProfileName(id))
            .join(' OR ');

          errors.push({
            type: 'missing_prerequisite',
            profile: profileId,
            profileName: profile.name,
            prerequisites: profile.prerequisites,
            message: `${profile.name} requires one of: ${prerequisiteNames}`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Detect conflicts between profiles
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Array of conflict errors
   */
  detectConflicts(profileIds) {
    const errors = [];
    const resolvedProfiles = this.resolveDependencies(profileIds);

    // Check for profile-level conflicts
    for (const profileId of resolvedProfiles) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile || !profile.conflicts) continue;

      for (const conflictId of profile.conflicts) {
        if (resolvedProfiles.includes(conflictId)) {
          errors.push({
            type: 'profile_conflict',
            profiles: [profileId, conflictId],
            message: `${profile.name} conflicts with ${this.getProfileName(conflictId)}`
          });
        }
      }
    }

    // Check for port conflicts
    const portConflicts = this.detectPortConflicts(profileIds);
    errors.push(...portConflicts);

    return errors;
  }

  /**
   * Detect port conflicts between profiles
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Array of port conflict errors
   */
  detectPortConflicts(profileIds) {
    const errors = [];
    const resolvedProfiles = this.resolveDependencies(profileIds);
    const portMap = new Map();

    for (const profileId of resolvedProfiles) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile || !profile.ports) continue;

      for (const port of profile.ports) {
        if (portMap.has(port)) {
          const existingProfile = portMap.get(port);
          errors.push({
            type: 'port_conflict',
            port,
            profiles: [existingProfile, profileId],
            message: `Port ${port} is used by both ${this.getProfileName(existingProfile)} and ${profile.name}`
          });
        } else {
          portMap.set(port, profileId);
        }
      }
    }

    return errors;
  }

  /**
   * Calculate startup order for all services
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Services sorted by startup order
   */
  calculateStartupOrder(profileIds) {
    const resolvedProfiles = this.resolveDependencies(profileIds);
    const services = [];

    // Collect all services from all profiles
    for (const profileId of resolvedProfiles) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) continue;

      for (const service of profile.services) {
        services.push({
          name: service.name,
          required: service.required,
          startupOrder: service.startupOrder,
          description: service.description,
          profile: profileId,
          profileName: profile.name
        });
      }
    }

    // Sort by startup order, then by name for consistency
    services.sort((a, b) => {
      if (a.startupOrder !== b.startupOrder) {
        return a.startupOrder - b.startupOrder;
      }
      return a.name.localeCompare(b.name);
    });

    // Group by startup order for better visualization
    const grouped = {};
    for (const service of services) {
      const order = service.startupOrder;
      if (!grouped[order]) {
        grouped[order] = [];
      }
      grouped[order].push(service);
    }

    return {
      services,
      grouped,
      phases: {
        1: 'Kaspa Node',
        2: 'Indexer Services',
        3: 'Applications'
      }
    };
  }

  /**
   * Build dependency graph for visualization
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object} Dependency graph structure
   */
  buildDependencyGraph(profileIds) {
    const graph = {
      nodes: [],
      edges: []
    };

    const resolvedProfiles = this.resolveDependencies(profileIds);
    const processedNodes = new Set();

    // Build nodes
    for (const profileId of resolvedProfiles) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) continue;

      graph.nodes.push({
        id: profileId,
        name: profile.name,
        category: profile.category,
        selected: profileIds.includes(profileId),
        services: profile.services.map(s => s.name)
      });

      processedNodes.add(profileId);
    }

    // Build edges (dependencies)
    for (const profileId of resolvedProfiles) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) continue;

      // Add dependency edges
      if (profile.dependencies) {
        for (const dep of profile.dependencies) {
          graph.edges.push({
            from: profileId,
            to: dep,
            type: 'dependency',
            label: 'depends on'
          });
        }
      }

      // Add prerequisite edges
      if (profile.prerequisites) {
        for (const prereq of profile.prerequisites) {
          if (resolvedProfiles.includes(prereq)) {
            graph.edges.push({
              from: profileId,
              to: prereq,
              type: 'prerequisite',
              label: 'requires one of'
            });
          }
        }
      }

      // Add conflict edges
      if (profile.conflicts) {
        for (const conflict of profile.conflicts) {
          if (resolvedProfiles.includes(conflict)) {
            graph.edges.push({
              from: profileId,
              to: conflict,
              type: 'conflict',
              label: 'conflicts with'
            });
          }
        }
      }
    }

    return graph;
  }

  /**
   * Resolve all dependencies recursively
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {string[]} All profiles including dependencies
   */
  resolveDependencies(profileIds) {
    const resolved = new Set(profileIds);
    const toProcess = [...profileIds];
    const processed = new Set();

    while (toProcess.length > 0) {
      const profileId = toProcess.shift();

      // Skip if already processed
      if (processed.has(profileId)) {
        continue;
      }
      processed.add(profileId);

      const profile = this.profileManager.getProfile(profileId);
      if (!profile) continue;

      // Add dependencies
      if (profile.dependencies) {
        for (const dep of profile.dependencies) {
          if (!resolved.has(dep)) {
            resolved.add(dep);
            toProcess.push(dep);
          }
        }
      }
    }

    return Array.from(resolved);
  }

  /**
   * Check resource requirements and generate warnings
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object[]} Array of resource warnings
   */
  checkResourceRequirements(profileIds) {
    const warnings = [];
    const requirements = this.profileManager.calculateResourceRequirements(profileIds);

    // Check memory requirements
    if (requirements.minMemory > 32) {
      warnings.push({
        type: 'high_memory',
        value: requirements.minMemory,
        message: `Selected profiles require ${requirements.minMemory}GB RAM (minimum). Recommended: ${requirements.recommendedMemory}GB`
      });
    } else if (requirements.minMemory > 16) {
      warnings.push({
        type: 'moderate_memory',
        value: requirements.minMemory,
        message: `Selected profiles require ${requirements.minMemory}GB RAM. Ensure your system has sufficient resources.`
      });
    }

    // Check disk requirements
    if (requirements.minDisk > 1000) {
      warnings.push({
        type: 'high_disk',
        value: requirements.minDisk,
        message: `Selected profiles require ${requirements.minDisk}GB disk space (minimum). Recommended: ${requirements.recommendedDisk}GB`
      });
    }

    // Check CPU requirements
    if (requirements.minCpu > 8) {
      warnings.push({
        type: 'high_cpu',
        value: requirements.minCpu,
        message: `Selected profiles require ${requirements.minCpu} CPU cores (minimum). Recommended: ${requirements.recommendedCpu} cores`
      });
    }

    return warnings;
  }

  /**
   * Get profile name by ID
   * @param {string} profileId - Profile ID
   * @returns {string} Profile name or ID if not found
   */
  getProfileName(profileId) {
    const profile = this.profileManager.getProfile(profileId);
    return profile ? profile.name : profileId;
  }

  /**
   * Get detailed validation report
   * @param {string[]} profileIds - Selected profile IDs
   * @returns {Object} Detailed validation report
   */
  getValidationReport(profileIds) {
    const validation = this.validateSelection(profileIds);
    const requirements = this.profileManager.calculateResourceRequirements(profileIds);

    return {
      ...validation,
      summary: {
        totalProfiles: profileIds.length,
        resolvedProfiles: validation.metadata.resolvedProfiles?.length || 0,
        totalServices: validation.metadata.startupOrder?.services?.length || 0,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      },
      requirements,
      recommendations: this.generateRecommendations(validation, requirements)
    };
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} validation - Validation result
   * @param {Object} requirements - Resource requirements
   * @returns {string[]} Array of recommendations
   */
  generateRecommendations(validation, requirements) {
    const recommendations = [];

    // Recommend adding missing prerequisites
    const prerequisiteErrors = validation.errors.filter(e => e.type === 'missing_prerequisite');
    if (prerequisiteErrors.length > 0) {
      for (const error of prerequisiteErrors) {
        recommendations.push(
          `Add one of these profiles: ${error.prerequisites.map(id => this.getProfileName(id)).join(' or ')}`
        );
      }
    }

    // Recommend resource upgrades
    if (requirements.minMemory > 16) {
      recommendations.push(
        `Consider upgrading to ${requirements.recommendedMemory}GB RAM for optimal performance`
      );
    }

    if (requirements.minDisk > 500) {
      recommendations.push(
        `Ensure you have at least ${requirements.recommendedDisk}GB of free disk space`
      );
    }

    // Recommend removing conflicts
    const conflicts = validation.errors.filter(e => e.type === 'profile_conflict');
    if (conflicts.length > 0) {
      recommendations.push(
        'Remove conflicting profiles or choose an alternative configuration'
      );
    }

    return recommendations;
  }
}

module.exports = DependencyValidator;
