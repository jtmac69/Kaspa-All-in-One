/**
 * Rollback Module
 * Handles configuration versioning, rollback, and recovery
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Save current configuration as a version
 */
export async function saveConfigurationVersion(description = 'Manual save') {
    try {
        const config = stateManager.get('configuration');
        const profiles = stateManager.get('selectedProfiles');
        
        console.log('saveConfigurationVersion called:', { description, config, profiles });
        
        // Don't save if there's no meaningful data
        if ((!config || Object.keys(config).length === 0) && (!profiles || profiles.length === 0)) {
            console.log('Skipping version save - no configuration data');
            return null;
        }
        
        console.log('Calling API to save version...');
        const result = await api.post('/rollback/save-version', {
            config,
            profiles,
            metadata: {
                action: 'step-navigation',
                description,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('API response:', result);
        
        if (result.success) {
            console.log(`Configuration version saved: ${result.versionId} - ${description}`);
            showNotification(`Saved: ${description}`, 'success', 2000);
            await loadVersionHistory();
            return result.versionId;
        } else {
            console.error('API returned success: false', result);
            return null;
        }
    } catch (error) {
        console.error('Failed to save version:', error);
        return null;
    }
}

// Flag to prevent auto-save during undo operations
let isUndoing = false;

/**
 * Undo last configuration change
 */
export async function undoLastChange() {
    if (!confirm('Undo last configuration change?')) {
        return false;
    }
    
    try {
        const result = await api.post('/rollback/undo', {
            restartServices: false
        });
        
        if (result.success) {
            showNotification('Configuration restored successfully', 'success');
            
            // Update local state
            if (result.profiles) {
                stateManager.set('selectedProfiles', result.profiles);
            }
            if (result.config) {
                stateManager.set('configuration', result.config);
            }
            
            // Update UI to reflect restored profiles
            updateProfileUI(result.profiles || []);
            
            await loadVersionHistory();
            return true;
        } else {
            // Handle case where there's nothing to undo
            showNotification(result.message || result.error || 'Nothing to undo', 'info');
            return false;
        }
    } catch (error) {
        console.error('Failed to undo:', error);
        showNotification(`Failed to undo: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Update profile UI to reflect current selection
 */
function updateProfileUI(profiles) {
    // Remove 'selected' class from all profile cards
    document.querySelectorAll('.profile-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add 'selected' class to profiles in the list
    profiles.forEach(profileId => {
        const card = document.querySelector(`.profile-card[data-profile="${profileId}"]`);
        if (card) {
            card.classList.add('selected');
        }
    });
}

/**
 * Load version history
 */
export async function loadVersionHistory(limit = 10) {
    try {
        const result = await api.get(`/rollback/history?limit=${limit}`);
        
        if (result.success) {
            stateManager.set('versionHistory', result.entries);
            return result.entries;
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        return [];
    }
}

/**
 * Restore specific version
 */
export async function restoreVersion(versionId, restartServices = false) {
    if (!confirm('Restore this configuration version?')) {
        return false;
    }
    
    try {
        const result = await api.post('/rollback/restore', {
            versionId,
            restartServices
        });
        
        if (result.success) {
            showNotification(`Version ${versionId} restored successfully`, 'success');
            
            // Update local state
            if (result.profiles) {
                stateManager.set('selectedProfiles', result.profiles);
            }
            
            await loadVersionHistory();
            return true;
        }
    } catch (error) {
        console.error('Failed to restore version:', error);
        showNotification(`Failed to restore: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Compare two versions
 */
export async function compareVersions(version1, version2) {
    try {
        const result = await api.get(`/rollback/compare?version1=${version1}&version2=${version2}`);
        
        if (result.success) {
            return result.differences;
        }
    } catch (error) {
        console.error('Failed to compare versions:', error);
        return null;
    }
}

/**
 * Create installation checkpoint
 */
export async function createCheckpoint(stage, data = {}) {
    try {
        const checkpointData = {
            stage,
            data: {
                ...data,
                currentStep: stateManager.get('currentStep'),
                configuration: stateManager.get('configuration'),
                selectedProfiles: stateManager.get('selectedProfiles'),
                timestamp: new Date().toISOString()
            }
        };
        
        const result = await api.post('/rollback/checkpoint', checkpointData);
        
        if (result.success) {
            console.log(`Checkpoint created: ${result.checkpointId} at stage ${stage}`);
            
            // Store checkpoint ID in state
            const checkpoints = stateManager.get('checkpoints') || [];
            checkpoints.push({
                id: result.checkpointId,
                stage,
                timestamp: result.timestamp
            });
            stateManager.set('checkpoints', checkpoints);
            
            // Also store in localStorage for recovery
            localStorage.setItem('lastCheckpoint', result.checkpointId);
            
            return result.checkpointId;
        }
    } catch (error) {
        console.error('Failed to create checkpoint:', error);
        return null;
    }
}

/**
 * Load checkpoints
 */
export async function loadCheckpoints() {
    try {
        const result = await api.get('/rollback/checkpoints');
        
        if (result.success) {
            stateManager.set('checkpoints', result.checkpoints);
            return result.checkpoints;
        }
    } catch (error) {
        console.error('Failed to load checkpoints:', error);
        return [];
    }
}

/**
 * Restore from checkpoint
 */
export async function restoreCheckpoint(checkpointId) {
    try {
        const result = await api.post('/rollback/restore-checkpoint', {
            checkpointId
        });
        
        if (result.success) {
            showNotification(`Checkpoint restored: ${result.stage}`, 'success');
            
            // Restore wizard state from checkpoint data
            if (result.data) {
                if (result.data.configuration) {
                    stateManager.set('configuration', result.data.configuration);
                }
                if (result.data.selectedProfiles) {
                    stateManager.set('selectedProfiles', result.data.selectedProfiles);
                }
                if (result.data.currentStep) {
                    stateManager.set('currentStep', result.data.currentStep);
                }
            }
            
            return result.data;
        }
    } catch (error) {
        console.error('Failed to restore checkpoint:', error);
        showNotification(`Failed to restore checkpoint: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Check for resumable checkpoint
 */
export async function checkForResumableCheckpoint() {
    const lastCheckpointId = localStorage.getItem('lastCheckpoint');
    
    if (!lastCheckpointId) {
        return null;
    }
    
    try {
        const checkpoints = await loadCheckpoints();
        const checkpoint = checkpoints.find(cp => cp.checkpointId === lastCheckpointId);
        
        if (checkpoint) {
            return checkpoint;
        }
    } catch (error) {
        console.error('Failed to check for resumable checkpoint:', error);
    }
    
    return null;
}

/**
 * Start over - reset everything
 */
export async function startOver(options = {}) {
    const {
        deleteData = true,
        deleteConfig = true,
        deleteBackups = false
    } = options;
    
    const confirmed = confirm(
        'This will remove all containers, volumes, and configurations. ' +
        'Are you sure you want to start over?'
    );
    
    if (!confirmed) {
        return false;
    }
    
    try {
        const result = await api.post('/rollback/start-over', {
            deleteData,
            deleteConfig,
            deleteBackups
        });
        
        if (result.success) {
            showNotification('System reset successfully', 'success');
            
            // Clear ALL localStorage including wizard state
            localStorage.clear();
            
            // Set wizard version to prevent re-clearing on reload
            const WIZARD_VERSION = '3';
            localStorage.setItem('wizardVersion', WIZARD_VERSION);
            
            // Reload page to start fresh
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            return true;
        } else {
            // Show which actions failed
            const failed = result.actions.filter(a => !a.success);
            if (failed.length > 0) {
                const errors = failed.map(a => `${a.action}: ${a.error}`).join('\n');
                showNotification(`Some actions failed:\n${errors}`, 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Failed to start over:', error);
        showNotification(`Failed to reset system: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Get storage usage
 */
export async function getStorageUsage() {
    try {
        const result = await api.get('/rollback/storage');
        
        if (result.success) {
            return {
                totalSize: result.totalSize,
                totalSizeMB: result.totalSizeMB,
                fileCount: result.fileCount,
                backupDir: result.backupDir
            };
        }
    } catch (error) {
        console.error('Failed to get storage usage:', error);
        return null;
    }
}

/**
 * Show version history modal
 */
export function showVersionHistoryModal() {
    const modal = document.getElementById('version-history-modal');
    if (modal) {
        modal.style.display = 'block';
        loadVersionHistory().then(displayVersionHistory);
    }
}

/**
 * Display version history in modal
 */
function displayVersionHistory(entries) {
    const list = document.getElementById('version-history-list');
    if (!list) return;
    
    if (entries.length === 0) {
        list.innerHTML = '<p class="no-versions">No version history available</p>';
        return;
    }
    
    list.innerHTML = entries.map(entry => `
        <div class="history-item">
            <div class="history-header">
                <span class="version-id">${entry.versionId}</span>
                <span class="version-age">${entry.age}</span>
            </div>
            <div class="history-details">
                <span>Profiles: ${entry.profiles.join(', ')}</span>
                <span>Action: ${entry.metadata.action}</span>
            </div>
            <button class="btn-primary" onclick="window.rollback.restoreVersion('${entry.versionId}')">
                Restore
            </button>
        </div>
    `).join('');
}

/**
 * Initialize rollback UI
 */
export function initRollbackUI() {
    // Load initial version history
    loadVersionHistory();
    
    // Load checkpoints
    loadCheckpoints();
    
    // Check for resumable checkpoint on page load
    checkForResumableCheckpoint().then(checkpoint => {
        if (checkpoint) {
            const shouldResume = confirm(
                `Found previous installation at stage "${checkpoint.stage}". ` +
                'Would you like to resume from where you left off?'
            );
            
            if (shouldResume) {
                restoreCheckpoint(checkpoint.checkpointId);
            } else {
                localStorage.removeItem('lastCheckpoint');
            }
        }
    });
}

// Export for global access (for onclick handlers)
if (typeof window !== 'undefined') {
    window.rollback = {
        saveConfigurationVersion,
        undoLastChange,
        loadVersionHistory,
        restoreVersion,
        compareVersions,
        createCheckpoint,
        loadCheckpoints,
        restoreCheckpoint,
        checkForResumableCheckpoint,
        startOver,
        getStorageUsage,
        showVersionHistoryModal
    };
}
