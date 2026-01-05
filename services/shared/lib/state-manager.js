const fs = require('fs/promises');
const { watch } = require('fs');
const path = require('path');

/**
 * SharedStateManager - Manages installation state shared between Wizard and Dashboard
 * 
 * Handles reading, writing, and watching the installation state file that contains
 * the current deployment configuration shared between the Wizard and Dashboard.
 */
class SharedStateManager {
  /**
   * Create a new SharedStateManager
   * @param {string} statePath - Path to the installation state file
   */
  constructor(statePath = '.kaspa-aio/installation-state.json') {
    this.statePath = statePath;
    this.watchers = [];
    this.fileWatcher = null;
  }

  /**
   * Read current installation state
   * @returns {Promise<InstallationState|null>} Current state or null if not exists
   */
  async readState() {
    try {
      const data = await fs.readFile(this.statePath, 'utf8');
      const state = JSON.parse(data);
      
      // Validate that the state has required fields
      if (!this._isValidState(state)) {
        console.warn('Installation state file is missing required fields');
        return null;
      }
      
      return state;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - this is normal for fresh installations
        return null;
      }
      
      if (error instanceof SyntaxError) {
        // Corrupted JSON file
        console.error('Installation state file is corrupted (invalid JSON):', error.message);
        return null;
      }
      
      // Other file system errors
      console.error('Error reading installation state:', error.message);
      return null;
    }
  }

  /**
   * Write installation state
   * @param {InstallationState} state - State to write
   * @throws {Error} If state is invalid or write fails
   */
  async writeState(state) {
    if (!state || typeof state !== 'object') {
      throw new Error('State must be a valid object');
    }

    // Ensure the directory exists
    const dir = path.dirname(this.statePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create state directory: ${error.message}`);
    }

    // Update lastModified timestamp
    const stateToWrite = {
      ...state,
      lastModified: new Date().toISOString()
    };

    try {
      const data = JSON.stringify(stateToWrite, null, 2);
      await fs.writeFile(this.statePath, data, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write installation state: ${error.message}`);
    }
  }

  /**
   * Watch for state file changes
   * @param {Function} callback - Called when state changes with (newState, error)
   * @returns {Function} Unsubscribe function
   */
  watchState(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Add callback to watchers list
    this.watchers.push(callback);

    // Start file watcher if not already started
    if (!this.fileWatcher) {
      this._startFileWatcher();
    }

    // Return unsubscribe function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }

      // Stop file watcher if no more watchers
      if (this.watchers.length === 0 && this.fileWatcher) {
        this.fileWatcher.close();
        this.fileWatcher = null;
      }
    };
  }

  /**
   * Check if installation exists
   * @returns {Promise<boolean>} True if state file exists and is valid
   */
  async hasInstallation() {
    const state = await this.readState();
    return state !== null;
  }

  /**
   * Update specific fields in state
   * @param {Partial<InstallationState>} updates - Fields to update
   * @throws {Error} If current state doesn't exist or update fails
   */
  async updateState(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be a valid object');
    }

    const currentState = await this.readState();
    if (!currentState) {
      throw new Error('Cannot update state: no existing installation state found');
    }

    const updatedState = {
      ...currentState,
      ...updates,
      lastModified: new Date().toISOString()
    };

    await this.writeState(updatedState);
  }

  /**
   * Start watching the state file for changes
   * @private
   */
  _startFileWatcher() {
    try {
      // Watch the directory containing the state file
      const dir = path.dirname(this.statePath);
      const filename = path.basename(this.statePath);

      this.fileWatcher = watch(dir, { persistent: false }, (eventType, changedFilename) => {
        // Only respond to changes to our specific file
        if (changedFilename === filename && (eventType === 'change' || eventType === 'rename')) {
          this._handleFileChange();
        }
      });

      this.fileWatcher.on('error', (error) => {
        console.error('File watcher error:', error);
        // Notify all watchers of the error
        this.watchers.forEach(callback => {
          try {
            callback(null, error);
          } catch (callbackError) {
            console.error('Error in state change callback:', callbackError);
          }
        });
      });

    } catch (error) {
      console.error('Failed to start file watcher:', error);
    }
  }

  /**
   * Handle file change events
   * @private
   */
  async _handleFileChange() {
    try {
      const newState = await this.readState();
      
      // Notify all watchers
      this.watchers.forEach(callback => {
        try {
          callback(newState, null);
        } catch (error) {
          console.error('Error in state change callback:', error);
        }
      });
    } catch (error) {
      console.error('Error reading changed state file:', error);
      
      // Notify watchers of the error
      this.watchers.forEach(callback => {
        try {
          callback(null, error);
        } catch (callbackError) {
          console.error('Error in state change callback:', callbackError);
        }
      });
    }
  }

  /**
   * Validate that state has required fields
   * @param {any} state - State to validate
   * @returns {boolean} True if state is valid
   * @private
   */
  _isValidState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    // Check for required top-level fields
    const requiredFields = ['version', 'installedAt', 'lastModified', 'phase', 'profiles', 'configuration', 'services', 'summary'];
    
    for (const field of requiredFields) {
      if (!(field in state)) {
        return false;
      }
    }

    // Check profiles structure
    if (!state.profiles || typeof state.profiles !== 'object' || 
        !Array.isArray(state.profiles.selected) || 
        typeof state.profiles.count !== 'number') {
      return false;
    }

    // Check configuration structure
    if (!state.configuration || typeof state.configuration !== 'object') {
      return false;
    }

    // Check services is array
    if (!Array.isArray(state.services)) {
      return false;
    }

    // Check summary structure
    if (!state.summary || typeof state.summary !== 'object' ||
        typeof state.summary.total !== 'number' ||
        typeof state.summary.running !== 'number' ||
        typeof state.summary.stopped !== 'number' ||
        typeof state.summary.missing !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    this.watchers = [];
  }
}

module.exports = { SharedStateManager };