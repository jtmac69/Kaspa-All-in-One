/**
 * Wizard State Manager
 * Manages wizard state persistence for resumable installations
 * Tracks: currentStep, profiles, services, syncOperations, userDecisions
 */

const fs = require('fs').promises;
const path = require('path');
const { createResolver } = require('../../../../shared/lib/path-resolver');

class StateManager {
  constructor() {
    // Use centralized path resolver for consistent path resolution
    const resolver = createResolver(__dirname);
    const paths = resolver.getPaths();
    
    this.projectRoot = paths.root;
    this.stateDir = paths.kaspaAioDir;
    this.stateFile = paths.wizardState;
    this.maxStateHistory = 10; // Keep last 10 state snapshots
    
    console.log(`StateManager initialized with project root: ${this.projectRoot}`);
    console.log(`State file: ${this.stateFile}`);
  }

  /**
   * Initialize state directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create initial wizard state
   */
  createInitialState() {
    return {
      // Installation metadata
      installationId: `install-${Date.now()}`,
      version: '1.0.0',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      
      // Current progress
      currentStep: 0,
      completedSteps: [],
      phase: 'preparing', // preparing, building, starting, syncing, validating, complete
      
      // Configuration
      profiles: {
        selected: [],
        configuration: {
          // Kaspa Node configuration (for core and archive-node profiles)
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NETWORK: 'mainnet',
          
          // Data directories (optional, profile-specific)
          KASPA_DATA_DIR: '/data/kaspa',
          KASPA_ARCHIVE_DATA_DIR: '/data/kaspa-archive',
          TIMESCALEDB_DATA_DIR: '/data/timescaledb',
          
          // Network configuration
          PUBLIC_NODE: false,
          EXTERNAL_IP: '',
          
          // Database configuration (for indexer-services profile)
          POSTGRES_USER: 'kaspa',
          POSTGRES_PASSWORD: '',
          POSTGRES_DB: 'kaspa_explorer',
          POSTGRES_PORT: 5432
        }
      },
      
      // Service states
      services: [],
      
      // Synchronization tracking
      syncOperations: [],
      
      // User choices
      userDecisions: [],
      
      // Resumability
      resumable: true,
      resumePoint: 'welcome', // Step to resume from
      backgroundTasks: [] // Tasks running in background
    };
  }

  /**
   * Save wizard state
   */
  async saveState(state) {
    try {
      await this.initialize();
      
      // Update last activity timestamp
      state.lastActivity = new Date().toISOString();
      
      // Save current state
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
      
      // Create backup snapshot
      await this.createStateSnapshot(state);
      
      return {
        success: true,
        timestamp: state.lastActivity,
        stateFile: this.stateFile
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load wizard state
   */
  async loadState() {
    try {
      const content = await fs.readFile(this.stateFile, 'utf8');
      const state = JSON.parse(content);
      
      return {
        success: true,
        state
      };
    } catch (error) {
      // No saved state or error reading
      return {
        success: false,
        error: error.message,
        state: null
      };
    }
  }

  /**
   * Check if wizard can be resumed
   */
  async canResume() {
    try {
      const result = await this.loadState();
      
      if (!result.success || !result.state) {
        return {
          canResume: false,
          reason: 'No saved state found'
        };
      }
      
      const state = result.state;
      
      // Check if installation is complete (highest priority check)
      if (state.phase === 'complete') {
        return {
          canResume: false,
          reason: 'Installation already complete'
        };
      }
      
      // Check if state is resumable
      if (!state.resumable) {
        return {
          canResume: false,
          reason: 'Installation marked as non-resumable'
        };
      }
      
      // Check if state is recent (within 24 hours)
      const lastActivity = new Date(state.lastActivity);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceActivity > 24) {
        return {
          canResume: false,
          reason: 'State is too old (>24 hours)',
          hoursSinceActivity: Math.floor(hoursSinceActivity)
        };
      }
      
      return {
        canResume: true,
        state,
        hoursSinceActivity: Math.floor(hoursSinceActivity),
        lastActivity: state.lastActivity,
        currentStep: state.currentStep,
        phase: state.phase,
        backgroundTasks: state.backgroundTasks || []
      };
    } catch (error) {
      return {
        canResume: false,
        reason: 'Error checking state',
        error: error.message
      };
    }
  }

  /**
   * Update wizard step
   */
  async updateStep(stepNumber, stepName) {
    try {
      const result = await this.loadState();
      
      if (!result.success) {
        // Create initial state if none exists
        const state = this.createInitialState();
        state.currentStep = stepNumber;
        state.resumePoint = stepName;
        
        if (!state.completedSteps.includes(stepName)) {
          state.completedSteps.push(stepName);
        }
        
        return await this.saveState(state);
      }
      
      const state = result.state;
      state.currentStep = stepNumber;
      state.resumePoint = stepName;
      
      if (!state.completedSteps.includes(stepName)) {
        state.completedSteps.push(stepName);
      }
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update profiles selection
   */
  async updateProfiles(selectedProfiles, configuration = {}) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      state.profiles = {
        selected: selectedProfiles,
        configuration
      };
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update service status
   */
  async updateServiceStatus(serviceName, status, details = {}) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      // Find existing service or create new entry
      let service = state.services.find(s => s.name === serviceName);
      
      if (!service) {
        service = {
          name: serviceName,
          status: 'pending',
          logs: []
        };
        state.services.push(service);
      }
      
      // Update service
      service.status = status;
      service.lastUpdated = new Date().toISOString();
      
      // Merge additional details
      Object.assign(service, details);
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add sync operation
   */
  async addSyncOperation(operation) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      const syncOp = {
        id: `sync-${Date.now()}`,
        service: operation.service,
        type: operation.type, // blockchain, database, indexer
        status: operation.status || 'pending',
        progress: operation.progress || 0,
        startedAt: new Date().toISOString(),
        estimatedCompletion: operation.estimatedCompletion,
        canContinueInBackground: operation.canContinueInBackground !== false,
        ...operation
      };
      
      state.syncOperations.push(syncOp);
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update sync operation
   */
  async updateSyncOperation(syncId, updates) {
    try {
      const result = await this.loadState();
      
      if (!result.success) {
        return {
          success: false,
          error: 'No state found'
        };
      }
      
      const state = result.state;
      const syncOp = state.syncOperations.find(op => op.id === syncId);
      
      if (!syncOp) {
        return {
          success: false,
          error: 'Sync operation not found'
        };
      }
      
      // Update sync operation
      Object.assign(syncOp, updates);
      syncOp.lastUpdated = new Date().toISOString();
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record user decision
   */
  async recordDecision(decision, context) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      state.userDecisions.push({
        timestamp: new Date().toISOString(),
        decision,
        context
      });
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add background task
   */
  async addBackgroundTask(taskId, taskInfo) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      if (!state.backgroundTasks.includes(taskId)) {
        state.backgroundTasks.push(taskId);
      }
      
      // Store task info in sync operations if it's a sync task
      if (taskInfo && taskInfo.type) {
        await this.addSyncOperation({
          id: taskId,
          ...taskInfo
        });
      }
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove background task
   */
  async removeBackgroundTask(taskId) {
    try {
      const result = await this.loadState();
      
      if (!result.success) {
        return {
          success: false,
          error: 'No state found'
        };
      }
      
      const state = result.state;
      state.backgroundTasks = state.backgroundTasks.filter(id => id !== taskId);
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update installation phase
   */
  async updatePhase(phase) {
    try {
      const result = await this.loadState();
      const state = result.success ? result.state : this.createInitialState();
      
      state.phase = phase;
      
      // Mark as non-resumable if complete
      if (phase === 'complete') {
        state.resumable = false;
      }
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark installation as complete
   */
  async markComplete() {
    try {
      const result = await this.loadState();
      
      if (!result.success) {
        return {
          success: false,
          error: 'No state found'
        };
      }
      
      const state = result.state;
      state.phase = 'complete';
      state.resumable = false;
      state.completedAt = new Date().toISOString();
      
      return await this.saveState(state);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear wizard state (start over)
   */
  async clearState() {
    try {
      await fs.unlink(this.stateFile);
      
      // Also clear state snapshots
      await this.clearStateSnapshots();
      
      return {
        success: true,
        message: 'Wizard state cleared'
      };
    } catch (error) {
      // File might not exist
      return {
        success: true,
        message: 'No state to clear'
      };
    }
  }

  /**
   * Create state snapshot for history
   */
  async createStateSnapshot(state) {
    try {
      const snapshotDir = path.join(this.stateDir, 'state-snapshots');
      await fs.mkdir(snapshotDir, { recursive: true });
      
      const timestamp = Date.now();
      const snapshotFile = path.join(snapshotDir, `state-${timestamp}.json`);
      
      await fs.writeFile(snapshotFile, JSON.stringify(state, null, 2));
      
      // Clean up old snapshots
      await this.cleanupOldSnapshots(snapshotDir);
      
      return { success: true };
    } catch (error) {
      // Non-critical error, just log it
      console.error('Error creating state snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old state snapshots
   */
  async cleanupOldSnapshots(snapshotDir) {
    try {
      const files = await fs.readdir(snapshotDir);
      const snapshots = files
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(snapshotDir, f),
          timestamp: parseInt(f.replace('state-', '').replace('.json', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the most recent snapshots
      if (snapshots.length > this.maxStateHistory) {
        const toDelete = snapshots.slice(this.maxStateHistory);
        
        for (const snapshot of toDelete) {
          try {
            await fs.unlink(snapshot.path);
          } catch (error) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      // Non-critical error
      console.error('Error cleaning up snapshots:', error);
    }
  }

  /**
   * Clear all state snapshots
   */
  async clearStateSnapshots() {
    try {
      const snapshotDir = path.join(this.stateDir, 'state-snapshots');
      await fs.rm(snapshotDir, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get state history (snapshots)
   */
  async getStateHistory() {
    try {
      const snapshotDir = path.join(this.stateDir, 'state-snapshots');
      
      try {
        await fs.access(snapshotDir);
      } catch {
        return {
          success: true,
          snapshots: []
        };
      }
      
      const files = await fs.readdir(snapshotDir);
      const snapshots = files
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(snapshotDir, f),
          timestamp: parseInt(f.replace('state-', '').replace('.json', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Enrich with metadata
      const enriched = await Promise.all(snapshots.map(async (snapshot) => {
        try {
          const content = await fs.readFile(snapshot.path, 'utf8');
          const state = JSON.parse(content);
          
          return {
            timestamp: snapshot.timestamp,
            date: new Date(snapshot.timestamp).toISOString(),
            phase: state.phase,
            currentStep: state.currentStep,
            profiles: state.profiles?.selected || []
          };
        } catch (error) {
          return {
            timestamp: snapshot.timestamp,
            date: new Date(snapshot.timestamp).toISOString(),
            error: 'Failed to read snapshot'
          };
        }
      }));
      
      return {
        success: true,
        snapshots: enriched
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        snapshots: []
      };
    }
  }

  /**
   * Get state summary for display
   */
  async getStateSummary() {
    try {
      const result = await this.loadState();
      
      if (!result.success) {
        return {
          success: false,
          error: 'No state found'
        };
      }
      
      const state = result.state;
      
      return {
        success: true,
        summary: {
          installationId: state.installationId,
          startedAt: state.startedAt,
          lastActivity: state.lastActivity,
          currentStep: state.currentStep,
          phase: state.phase,
          profiles: state.profiles?.selected || [],
          servicesCount: state.services?.length || 0,
          syncOperationsCount: state.syncOperations?.length || 0,
          backgroundTasksCount: state.backgroundTasks?.length || 0,
          resumable: state.resumable,
          completedSteps: state.completedSteps || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = StateManager;
