/**
 * Profile Validation Module
 * Handles profile selection validation, conflict detection, and resource requirements
 */
class ProfileValidation {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Calculate resource requirements for selected profiles
   */
  calculateResourceRequirements(profileIds) {
    const allProfiles = this.profileManager.resolveProfileDependencies(profileIds);
    
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
    
    const sharedServices = new Set();
    
    for (const profileId of allProfiles) {
      const profile = this.profileManager.getProfile(profileId);
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
   * Detect port conflicts between profiles
   */
  detectConflicts(profileIds) {
    const conflicts = [];
    const allProfiles = this.profileManager.resolveProfileDependencies(profileIds);
    const portMap = new Map();
    
    for (const profileId of allProfiles) {
      const profile = this.profileManager.getProfile(profileId);
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

  /**
   * Detect circular dependencies in profile selection
   */
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
      
      const profile = this.profileManager.getProfile(profileId);
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
   * Comprehensive profile selection validation
   */
  validateProfileSelection(profileIds) {
    const errors = [];
    const warnings = [];
    
    // Check if core profile or archive-node is included (one is required)
    const allProfiles = this.profileManager.resolveProfileDependencies(profileIds);
    const hasNodeProfile = allProfiles.includes('core') || allProfiles.includes('archive-node');
    if (!hasNodeProfile) {
      errors.push({
        type: 'missing_required',
        message: 'Either Core Profile or Archive Node Profile is required for all deployments'
      });
    }
    
    // Check prerequisites for each profile
    for (const profileId of profileIds) {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) continue;
      
      if (profile.prerequisites && profile.prerequisites.length > 0) {
        const hasPrerequisite = profile.prerequisites.some(prereq => 
          allProfiles.includes(prereq)
        );
        
        if (!hasPrerequisite) {
          errors.push({
            type: 'missing_prerequisite',
            profile: profileId,
            message: `${profile.name} requires one of: ${profile.prerequisites.map(p => this.profileManager.getProfile(p)?.name || p).join(', ')}`
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
      const profile = this.profileManager.getProfile(profileId);
      if (!profile || !profile.conflicts) continue;
      
      for (const conflictId of profile.conflicts) {
        if (allProfiles.includes(conflictId)) {
          errors.push({
            type: 'profile_conflict',
            message: `${profile.name} conflicts with ${this.profileManager.getProfile(conflictId)?.name || conflictId}`
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
}

module.exports = ProfileValidation;