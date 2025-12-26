/**
 * Safety Manager
 * Provides safety confirmations, warnings, and risk assessment for wizard operations
 */

class SafetyManager {
  constructor() {
    this.warningThresholds = this.loadWarningThresholds();
    this.riskLevels = ['low', 'medium', 'high', 'critical'];
    this.confirmationHistory = new Map();
  }

  /**
   * Load warning thresholds for different scenarios
   */
  loadWarningThresholds() {
    return {
      // Resource thresholds
      ram: {
        critical: 0.95,  // 95% of available RAM
        high: 0.85,      // 85% of available RAM
        medium: 0.70,    // 70% of available RAM
        low: 0.50        // 50% of available RAM
      },
      disk: {
        critical: 0.95,  // 95% of available disk
        high: 0.85,      // 85% of available disk
        medium: 0.70,    // 70% of available disk
        low: 0.50        // 50% of available disk
      },
      cpu: {
        critical: 0.95,  // 95% of CPU cores
        high: 0.85,      // 85% of CPU cores
        medium: 0.70,    // 70% of CPU cores
        low: 0.50        // 50% of CPU cores
      },
      // Time thresholds (in hours)
      syncTime: {
        critical: 24,    // More than 24 hours
        high: 12,        // 12-24 hours
        medium: 6,       // 6-12 hours
        low: 2           // 2-6 hours
      }
    };
  }

  /**
   * Assess risk level for a profile selection
   */
  assessProfileRisk(profile, systemResources) {
    const risks = [];
    
    // Check RAM requirements
    const ramRisk = this.assessResourceRisk(
      'ram',
      profile.requirements.ram.min,
      systemResources.ram.available
    );
    if (ramRisk.level !== 'low') {
      risks.push(ramRisk);
    }

    // Check disk requirements
    const diskRisk = this.assessResourceRisk(
      'disk',
      profile.requirements.disk.min,
      systemResources.disk.available
    );
    if (diskRisk.level !== 'low') {
      risks.push(diskRisk);
    }

    // Check CPU requirements
    const cpuRisk = this.assessResourceRisk(
      'cpu',
      profile.requirements.cpu.min,
      systemResources.cpu.cores
    );
    if (cpuRisk.level !== 'low') {
      risks.push(cpuRisk);
    }

    // Check sync time
    if (profile.syncTime && profile.syncTime.estimated) {
      const syncRisk = this.assessSyncTimeRisk(profile.syncTime.estimated);
      if (syncRisk.level !== 'low') {
        risks.push(syncRisk);
      }
    }

    // Determine overall risk level
    const overallRisk = this.determineOverallRisk(risks);

    return {
      level: overallRisk,
      risks: risks,
      requiresConfirmation: overallRisk !== 'low',
      canProceed: overallRisk !== 'critical'
    };
  }

  /**
   * Assess risk for a specific resource
   */
  assessResourceRisk(resourceType, required, available) {
    const usage = required / available;
    const thresholds = this.warningThresholds[resourceType];

    let level = 'low';
    let message = '';
    let consequences = [];
    let recommendations = [];

    if (usage >= thresholds.critical) {
      level = 'critical';
      message = `${resourceType.toUpperCase()} requirement (${this.formatResource(resourceType, required)}) exceeds available resources (${this.formatResource(resourceType, available)})`;
      consequences = this.getResourceConsequences(resourceType, 'critical');
      recommendations = this.getResourceRecommendations(resourceType, 'critical');
    } else if (usage >= thresholds.high) {
      level = 'high';
      message = `${resourceType.toUpperCase()} requirement (${this.formatResource(resourceType, required)}) is very close to available resources (${this.formatResource(resourceType, available)})`;
      consequences = this.getResourceConsequences(resourceType, 'high');
      recommendations = this.getResourceRecommendations(resourceType, 'high');
    } else if (usage >= thresholds.medium) {
      level = 'medium';
      message = `${resourceType.toUpperCase()} requirement (${this.formatResource(resourceType, required)}) will use most of your available resources (${this.formatResource(resourceType, available)})`;
      consequences = this.getResourceConsequences(resourceType, 'medium');
      recommendations = this.getResourceRecommendations(resourceType, 'medium');
    }

    return {
      type: resourceType,
      level: level,
      message: message,
      required: required,
      available: available,
      usage: usage,
      consequences: consequences,
      recommendations: recommendations
    };
  }

  /**
   * Assess risk for sync time
   */
  assessSyncTimeRisk(estimatedHours) {
    const thresholds = this.warningThresholds.syncTime;
    let level = 'low';
    let message = '';
    let consequences = [];

    if (estimatedHours >= thresholds.critical) {
      level = 'high';  // Not critical, but high warning
      message = `Initial blockchain sync will take approximately ${estimatedHours} hours (more than a day)`;
      consequences = [
        'Your computer must stay on for more than 24 hours',
        'Services won\'t be fully functional until sync completes',
        'High network bandwidth usage during sync',
        'Consider using a remote node instead'
      ];
    } else if (estimatedHours >= thresholds.high) {
      level = 'medium';
      message = `Initial blockchain sync will take approximately ${estimatedHours} hours`;
      consequences = [
        'Your computer should stay on for 12-24 hours',
        'Services won\'t be fully functional until sync completes',
        'Moderate network bandwidth usage during sync'
      ];
    } else if (estimatedHours >= thresholds.medium) {
      level = 'low';
      message = `Initial blockchain sync will take approximately ${estimatedHours} hours`;
      consequences = [
        'Your computer should stay on for 6-12 hours',
        'Services will be ready after sync completes'
      ];
    }

    return {
      type: 'syncTime',
      level: level,
      message: message,
      estimatedHours: estimatedHours,
      consequences: consequences,
      recommendations: level === 'high' ? [
        'Consider using a remote node to avoid long sync times',
        'Ensure stable internet connection',
        'Plan installation when you can leave computer on'
      ] : []
    };
  }

  /**
   * Get consequences for resource issues
   */
  getResourceConsequences(resourceType, level) {
    const consequences = {
      ram: {
        critical: [
          'Installation will likely fail due to insufficient memory',
          'System may become unresponsive or crash',
          'Other applications will be severely impacted',
          'Docker containers may be killed by system'
        ],
        high: [
          'System performance will be severely degraded',
          'Other applications may become slow or unresponsive',
          'Risk of out-of-memory errors during operation',
          'Frequent swapping to disk will slow everything down'
        ],
        medium: [
          'System may become slow when services are running',
          'Other applications may have reduced performance',
          'Consider closing other programs during installation'
        ]
      },
      disk: {
        critical: [
          'Installation will fail due to insufficient disk space',
          'Cannot download required blockchain data',
          'System may become unstable with full disk',
          'Risk of data corruption'
        ],
        high: [
          'Very little space left for blockchain growth',
          'System may run out of space during operation',
          'Need to monitor disk usage closely',
          'May need to clean up space soon'
        ],
        medium: [
          'Disk space will be mostly used',
          'Limited room for blockchain growth',
          'Should monitor disk usage regularly'
        ]
      },
      cpu: {
        critical: [
          'System will be extremely slow',
          'Services may timeout or fail to start',
          'Other applications will be unusable',
          'Installation may take much longer than expected'
        ],
        high: [
          'System will be very slow during sync',
          'Other applications will have poor performance',
          'Sync will take longer than estimated',
          'High CPU usage will generate heat'
        ],
        medium: [
          'System may be slower than usual',
          'Other applications may have reduced performance',
          'Sync will use most CPU capacity'
        ]
      }
    };

    return consequences[resourceType]?.[level] || [];
  }

  /**
   * Get recommendations for resource issues
   */
  getResourceRecommendations(resourceType, level) {
    const recommendations = {
      ram: {
        critical: [
          'Choose a lighter profile (Core instead of Production)',
          'Use a remote Kaspa node instead of running locally',
          'Close all other applications before installing',
          'Consider upgrading your system RAM'
        ],
        high: [
          'Choose a lighter profile if possible',
          'Close unnecessary applications during installation',
          'Monitor system memory usage',
          'Consider using remote node for some services'
        ],
        medium: [
          'Close unnecessary applications during installation',
          'Monitor system performance',
          'Be prepared for slower performance'
        ]
      },
      disk: {
        critical: [
          'Free up disk space before installing',
          'Use external storage for blockchain data',
          'Choose a profile without full blockchain (use remote node)',
          'Delete unnecessary files and applications'
        ],
        high: [
          'Free up additional disk space if possible',
          'Plan to monitor disk usage regularly',
          'Consider external storage for future growth',
          'Set up disk space alerts'
        ],
        medium: [
          'Monitor disk space regularly',
          'Plan for future disk space needs',
          'Consider cleanup of old data periodically'
        ]
      },
      cpu: {
        critical: [
          'Choose a lighter profile',
          'Use a more powerful computer',
          'Use remote node instead of local',
          'Expect very slow performance'
        ],
        high: [
          'Close all unnecessary applications',
          'Expect slower performance during sync',
          'Plan installation during off-hours',
          'Consider using remote node'
        ],
        medium: [
          'Close unnecessary applications',
          'Expect some performance impact',
          'Be patient during initial sync'
        ]
      }
    };

    return recommendations[resourceType]?.[level] || [];
  }

  /**
   * Determine overall risk level from multiple risks
   */
  determineOverallRisk(risks) {
    if (risks.length === 0) return 'low';
    
    // If any risk is critical, overall is critical
    if (risks.some(r => r.level === 'critical')) return 'critical';
    
    // If multiple high risks, escalate to critical
    const highRisks = risks.filter(r => r.level === 'high');
    if (highRisks.length >= 2) return 'critical';
    
    // If any risk is high, overall is high
    if (highRisks.length > 0) return 'high';
    
    // If multiple medium risks, escalate to high
    const mediumRisks = risks.filter(r => r.level === 'medium');
    if (mediumRisks.length >= 3) return 'high';
    if (mediumRisks.length >= 2) return 'medium';
    
    // Otherwise, return highest individual risk
    const levels = risks.map(r => r.level);
    if (levels.includes('medium')) return 'medium';
    
    return 'low';
  }

  /**
   * Format resource value for display
   */
  formatResource(resourceType, value) {
    switch (resourceType) {
      case 'ram':
        return `${(value / 1024).toFixed(1)} GB`;
      case 'disk':
        return `${(value / 1024).toFixed(1)} GB`;
      case 'cpu':
        return `${value} cores`;
      default:
        return value.toString();
    }
  }

  /**
   * Generate confirmation dialog for risky action
   */
  generateConfirmation(action, riskAssessment) {
    const confirmations = {
      'profile-selection': this.generateProfileConfirmation(riskAssessment),
      'override-recommendation': this.generateOverrideConfirmation(riskAssessment),
      'data-deletion': this.generateDataDeletionConfirmation(),
      'configuration-change': this.generateConfigChangeConfirmation(riskAssessment),
      'start-over': this.generateStartOverConfirmation()
    };

    return confirmations[action] || this.generateGenericConfirmation(action, riskAssessment);
  }

  /**
   * Generate profile selection confirmation
   */
  generateProfileConfirmation(riskAssessment) {
    const { level, risks } = riskAssessment;

    if (level === 'critical') {
      return {
        type: 'critical',
        title: '⚠️ Critical Warning: Installation May Fail',
        message: 'Your system does not meet the minimum requirements for this profile.',
        details: risks.map(r => r.message),
        consequences: risks.flatMap(r => r.consequences),
        recommendations: risks.flatMap(r => r.recommendations),
        actions: [
          {
            label: 'Choose Different Profile',
            action: 'cancel',
            style: 'primary'
          },
          {
            label: 'View Recommendations',
            action: 'recommendations',
            style: 'secondary'
          }
        ],
        canProceed: false,
        requiresAcknowledgment: true
      };
    } else if (level === 'high') {
      return {
        type: 'warning',
        title: '⚠️ Warning: Significant Performance Issues Expected',
        message: 'This profile will push your system to its limits.',
        details: risks.map(r => r.message),
        consequences: risks.flatMap(r => r.consequences),
        recommendations: risks.flatMap(r => r.recommendations),
        actions: [
          {
            label: 'Choose Different Profile',
            action: 'cancel',
            style: 'primary'
          },
          {
            label: 'I Understand, Continue Anyway',
            action: 'proceed',
            style: 'danger',
            requiresCheckbox: true,
            checkboxText: 'I understand the risks and want to proceed'
          }
        ],
        canProceed: true,
        requiresAcknowledgment: true
      };
    } else if (level === 'medium') {
      return {
        type: 'caution',
        title: '⚠️ Caution: Performance May Be Affected',
        message: 'This profile will use most of your system resources.',
        details: risks.map(r => r.message),
        consequences: risks.flatMap(r => r.consequences),
        recommendations: risks.flatMap(r => r.recommendations),
        actions: [
          {
            label: 'Choose Different Profile',
            action: 'cancel',
            style: 'secondary'
          },
          {
            label: 'Continue',
            action: 'proceed',
            style: 'primary'
          }
        ],
        canProceed: true,
        requiresAcknowledgment: false
      };
    }

    return null;  // No confirmation needed for low risk
  }

  /**
   * Generate override recommendation confirmation
   */
  generateOverrideConfirmation(riskAssessment) {
    return {
      type: 'warning',
      title: '⚠️ Override Recommendation',
      message: 'You are choosing a configuration that differs from our recommendation.',
      details: [
        'Our recommendation is based on your system resources and typical usage patterns.',
        'Overriding may result in performance issues or installation failures.'
      ],
      consequences: riskAssessment.risks.flatMap(r => r.consequences),
      actions: [
        {
          label: 'Use Recommended Configuration',
          action: 'cancel',
          style: 'primary'
        },
        {
          label: 'Continue with My Choice',
          action: 'proceed',
          style: 'secondary'
        }
      ],
      canProceed: true,
      requiresAcknowledgment: false
    };
  }

  /**
   * Generate data deletion confirmation
   */
  generateDataDeletionConfirmation() {
    return {
      type: 'danger',
      title: '🗑️ Delete All Data?',
      message: 'This will permanently delete all Kaspa data and configurations.',
      details: [
        'All blockchain data will be deleted',
        'All application data will be deleted',
        'All configurations will be reset',
        'This action cannot be undone'
      ],
      consequences: [
        'You will need to re-download the entire blockchain',
        'All application settings will be lost',
        'Any custom configurations will be removed'
      ],
      actions: [
        {
          label: 'Cancel',
          action: 'cancel',
          style: 'primary'
        },
        {
          label: 'Delete Everything',
          action: 'proceed',
          style: 'danger',
          requiresCheckbox: true,
          checkboxText: 'I understand this will delete all data permanently'
        }
      ],
      canProceed: true,
      requiresAcknowledgment: true
    };
  }

  /**
   * Generate configuration change confirmation
   */
  generateConfigChangeConfirmation(riskAssessment) {
    return {
      type: 'caution',
      title: '⚙️ Change Configuration?',
      message: 'Changing configuration will restart all services.',
      details: [
        'All running services will be stopped',
        'Configuration will be updated',
        'Services will be restarted with new configuration'
      ],
      consequences: [
        'Brief service interruption (1-2 minutes)',
        'Active connections will be dropped',
        'Sync progress will be preserved'
      ],
      actions: [
        {
          label: 'Cancel',
          action: 'cancel',
          style: 'secondary'
        },
        {
          label: 'Apply Changes',
          action: 'proceed',
          style: 'primary'
        }
      ],
      canProceed: true,
      requiresAcknowledgment: false
    };
  }

  /**
   * Generate start over confirmation
   */
  generateStartOverConfirmation() {
    return {
      type: 'warning',
      title: '🔄 Start Over?',
      message: 'This will reset the wizard and clear your current progress.',
      details: [
        'All wizard progress will be lost',
        'Configuration selections will be cleared',
        'You will return to the welcome screen'
      ],
      consequences: [
        'You will need to go through all steps again',
        'Any custom settings will be lost',
        'Running services will not be affected'
      ],
      actions: [
        {
          label: 'Cancel',
          action: 'cancel',
          style: 'primary'
        },
        {
          label: 'Start Over',
          action: 'proceed',
          style: 'secondary'
        }
      ],
      canProceed: true,
      requiresAcknowledgment: false
    };
  }

  /**
   * Generate generic confirmation
   */
  generateGenericConfirmation(action, riskAssessment) {
    return {
      type: 'caution',
      title: '⚠️ Confirm Action',
      message: `Are you sure you want to ${action}?`,
      details: [],
      consequences: riskAssessment?.risks?.flatMap(r => r.consequences) || [],
      actions: [
        {
          label: 'Cancel',
          action: 'cancel',
          style: 'secondary'
        },
        {
          label: 'Continue',
          action: 'proceed',
          style: 'primary'
        }
      ],
      canProceed: true,
      requiresAcknowledgment: false
    };
  }

  /**
   * Check if action requires confirmation
   */
  requiresConfirmation(action, context) {
    const confirmationRules = {
      'profile-selection': (ctx) => {
        if (!ctx.riskAssessment) return false;
        return ctx.riskAssessment.level !== 'low';
      },
      'override-recommendation': () => true,
      'data-deletion': () => true,
      'configuration-change': () => true,
      'start-over': () => true,
      'install-start': (ctx) => {
        // Require confirmation if any high-risk selections
        return ctx.hasHighRiskSelections || false;
      }
    };

    const rule = confirmationRules[action];
    return rule ? rule(context) : false;
  }

  /**
   * Record confirmation acknowledgment
   */
  recordConfirmation(action, userId, acknowledged) {
    const key = `${userId}-${action}`;
    this.confirmationHistory.set(key, {
      action: action,
      userId: userId,
      acknowledged: acknowledged,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if user has acknowledged confirmation
   */
  hasAcknowledged(action, userId) {
    const key = `${userId}-${action}`;
    const record = this.confirmationHistory.get(key);
    return record?.acknowledged || false;
  }

  /**
   * Generate safe mode recommendation
   */
  generateSafeModeRecommendation(failureCount, systemResources) {
    if (failureCount < 2) return null;

    return {
      type: 'info',
      title: '🛡️ Safe Mode Available',
      message: 'We noticed you\'ve had trouble installing. Would you like to try Safe Mode?',
      details: [
        'Safe Mode uses minimal resources',
        'Connects to remote Kaspa node (no local sync)',
        'Installs only essential services',
        'Much faster and more reliable'
      ],
      benefits: [
        'Installation completes in 5-10 minutes',
        'Uses less than 2GB RAM',
        'Requires only 5GB disk space',
        'Works on most systems'
      ],
      actions: [
        {
          label: 'Try Safe Mode',
          action: 'safe-mode',
          style: 'primary'
        },
        {
          label: 'Try Again with Current Settings',
          action: 'retry',
          style: 'secondary'
        },
        {
          label: 'Get Help',
          action: 'help',
          style: 'secondary'
        }
      ]
    };
  }

  /**
   * Generate configuration backup info
   */
  generateBackupInfo(hasBackup) {
    if (!hasBackup) {
      return {
        type: 'info',
        message: 'A backup of your current configuration will be created automatically.',
        details: [
          'Backup includes all settings and configurations',
          'You can restore from backup if needed',
          'Backups are stored locally'
        ]
      };
    }

    return {
      type: 'success',
      message: 'Configuration backup available',
      details: [
        'Previous configuration is backed up',
        'You can restore it anytime',
        'Backup location: .kaspa-backup/'
        ]
    };
  }
}

module.exports = SafetyManager;
