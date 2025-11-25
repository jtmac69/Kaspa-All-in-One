/**
 * Resume Installation Module
 * Handles detection and display of resumable wizard state
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { goToStep } from './navigation.js';
import { showNotification } from './utils.js';

/**
 * Check if wizard can be resumed and show dialog if applicable
 * @returns {Promise<boolean>} True if resuming, false if starting fresh
 */
export async function checkAndShowResumeDialog() {
  try {
    // Check if wizard can be resumed
    const response = await api.get('/wizard/can-resume');
    
    if (!response.canResume) {
      console.log('Cannot resume:', response.reason);
      return false;
    }
    
    // Show resume dialog
    const shouldResume = await showResumeDialog(response);
    
    if (shouldResume) {
      // Load saved state and resume
      await resumeInstallation(response.state);
      return true;
    } else {
      // User chose to start over
      await startOver();
      return false;
    }
  } catch (error) {
    console.error('Error checking resume state:', error);
    // If there's an error, just start fresh
    return false;
  }
}

/**
 * Show resume installation dialog
 * @param {Object} resumeInfo - Resume information from API
 * @returns {Promise<boolean>} True if user wants to resume, false to start over
 */
function showResumeDialog(resumeInfo) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    // Calculate time since last activity
    const timeSinceActivity = formatTimeSince(resumeInfo.hoursSinceActivity);
    
    // Get step name
    const stepName = getStepName(resumeInfo.currentStep);
    
    // Get background tasks summary
    const backgroundTasksSummary = getBackgroundTasksSummary(resumeInfo.backgroundTasks);
    
    // Create modal content
    overlay.innerHTML = `
      <div class="modal-content resume-dialog">
        <div class="resume-header">
          <div class="resume-icon">🔄</div>
          <h2 class="resume-title">Resume Installation?</h2>
        </div>
        
        <div class="resume-body">
          <p class="resume-message">
            An installation is in progress. Would you like to continue where you left off?
          </p>
          
          <div class="resume-details">
            <div class="resume-detail-item">
              <div class="detail-icon">📍</div>
              <div class="detail-content">
                <div class="detail-label">Last Step</div>
                <div class="detail-value">${stepName}</div>
              </div>
            </div>
            
            <div class="resume-detail-item">
              <div class="detail-icon">⏱️</div>
              <div class="detail-content">
                <div class="detail-label">Last Activity</div>
                <div class="detail-value">${timeSinceActivity}</div>
              </div>
            </div>
            
            <div class="resume-detail-item">
              <div class="detail-icon">📊</div>
              <div class="detail-content">
                <div class="detail-label">Installation Phase</div>
                <div class="detail-value">${formatPhase(resumeInfo.phase)}</div>
              </div>
            </div>
            
            ${backgroundTasksSummary ? `
              <div class="resume-detail-item">
                <div class="detail-icon">⚙️</div>
                <div class="detail-content">
                  <div class="detail-label">Background Tasks</div>
                  <div class="detail-value">${backgroundTasksSummary}</div>
                </div>
              </div>
            ` : ''}
          </div>
          
          ${resumeInfo.backgroundTasks && resumeInfo.backgroundTasks.length > 0 ? `
            <div class="resume-info-box">
              <div class="info-icon">ℹ️</div>
              <div class="info-text">
                Some tasks are running in the background. Resuming will check their status and continue from where you left off.
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="resume-actions">
          <button class="btn-secondary" id="resume-start-over">
            <span class="btn-icon">🔄</span>
            Start Over
          </button>
          <button class="btn-primary" id="resume-continue">
            Continue Installation
            <span class="btn-icon">→</span>
          </button>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Add event listeners
    const continueBtn = overlay.querySelector('#resume-continue');
    const startOverBtn = overlay.querySelector('#resume-start-over');
    
    continueBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });
    
    startOverBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });
    
    // Focus on continue button
    continueBtn.focus();
  });
}

/**
 * Resume installation from saved state
 * @param {Object} state - Saved wizard state
 */
async function resumeInstallation(state) {
  try {
    console.log('Resuming installation from state:', state);
    
    // Load state into state manager
    stateManager.set('currentStep', state.currentStep);
    stateManager.set('selectedProfiles', state.profiles?.selected || []);
    stateManager.set('configuration', state.profiles?.configuration || {});
    stateManager.set('installationPhase', state.phase);
    stateManager.set('services', state.services || []);
    stateManager.set('syncOperations', state.syncOperations || []);
    stateManager.set('backgroundTasks', state.backgroundTasks || []);
    
    // Show notification
    showNotification('Resuming installation...', 'info');
    
    // Verify running containers
    await verifyRunningContainers(state.services);
    
    // Check background tasks status
    if (state.backgroundTasks && state.backgroundTasks.length > 0) {
      await checkBackgroundTasksStatus(state.backgroundTasks);
    }
    
    // Navigate to the saved step
    goToStep(state.currentStep);
    
    showNotification('Installation resumed successfully', 'success');
  } catch (error) {
    console.error('Error resuming installation:', error);
    showNotification('Failed to resume installation. Starting fresh.', 'error');
    await startOver();
  }
}

/**
 * Start over - clear state and begin fresh installation
 */
async function startOver() {
  try {
    console.log('Starting fresh installation');
    
    // Clear backend state
    await api.post('/wizard/clear-state');
    
    // Clear frontend state
    stateManager.clear();
    
    // Reset to step 1
    goToStep(1);
    
    showNotification('Starting fresh installation', 'info');
  } catch (error) {
    console.error('Error starting over:', error);
    showNotification('Error clearing state', 'error');
  }
}

/**
 * Verify running containers
 * @param {Array} services - Array of service objects from state
 */
async function verifyRunningContainers(services) {
  if (!services || services.length === 0) {
    return;
  }
  
  try {
    console.log('Verifying running containers...');
    
    // Check each service with a container ID
    for (const service of services) {
      if (service.containerId) {
        // This would call an API to check if container is still running
        // For now, just log
        console.log(`Checking container ${service.containerId} for service ${service.name}`);
      }
    }
  } catch (error) {
    console.error('Error verifying containers:', error);
  }
}

/**
 * Check background tasks status
 * @param {Array} backgroundTasks - Array of background task IDs
 */
async function checkBackgroundTasksStatus(backgroundTasks) {
  if (!backgroundTasks || backgroundTasks.length === 0) {
    return;
  }
  
  try {
    console.log('Checking background tasks status...');
    
    // This would call an API to check status of each background task
    // For now, just log
    for (const taskId of backgroundTasks) {
      console.log(`Checking status of background task: ${taskId}`);
    }
    
    // Show notification about background tasks
    showNotification(
      `${backgroundTasks.length} background task${backgroundTasks.length > 1 ? 's' : ''} detected`,
      'info'
    );
  } catch (error) {
    console.error('Error checking background tasks:', error);
  }
}

/**
 * Format time since last activity
 * @param {number} hours - Hours since last activity
 * @returns {string} Formatted time string
 */
function formatTimeSince(hours) {
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  if (hours < 24) {
    const roundedHours = Math.floor(hours);
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''} ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Get step name from step number
 * @param {number} stepNumber - Step number
 * @returns {string} Step name
 */
function getStepName(stepNumber) {
  const stepNames = {
    1: 'Welcome',
    2: 'Pre-Installation Checklist',
    3: 'System Check',
    4: 'Profile Selection',
    5: 'Configuration',
    6: 'Review',
    7: 'Installation',
    8: 'Complete'
  };
  
  return stepNames[stepNumber] || `Step ${stepNumber}`;
}

/**
 * Format installation phase
 * @param {string} phase - Phase identifier
 * @returns {string} Formatted phase name
 */
function formatPhase(phase) {
  const phaseNames = {
    'preparing': 'Preparing',
    'building': 'Building Services',
    'starting': 'Starting Services',
    'syncing': 'Synchronizing',
    'validating': 'Validating',
    'complete': 'Complete'
  };
  
  return phaseNames[phase] || phase;
}

/**
 * Get background tasks summary
 * @param {Array} backgroundTasks - Array of background task IDs
 * @returns {string|null} Summary string or null if no tasks
 */
function getBackgroundTasksSummary(backgroundTasks) {
  if (!backgroundTasks || backgroundTasks.length === 0) {
    return null;
  }
  
  const count = backgroundTasks.length;
  return `${count} task${count > 1 ? 's' : ''} running`;
}

/**
 * Display background task status in UI
 * @param {Array} backgroundTasks - Array of background task objects
 */
export function displayBackgroundTaskStatus(backgroundTasks) {
  if (!backgroundTasks || backgroundTasks.length === 0) {
    return;
  }
  
  // Find or create background tasks container
  let container = document.getElementById('background-tasks-status');
  
  if (!container) {
    // Create container if it doesn't exist
    container = document.createElement('div');
    container.id = 'background-tasks-status';
    container.className = 'background-tasks-status';
    
    // Insert at top of wizard content
    const wizardContent = document.querySelector('.wizard-content');
    if (wizardContent) {
      wizardContent.insertBefore(container, wizardContent.firstChild);
    }
  }
  
  // Build HTML for background tasks
  const tasksHTML = backgroundTasks.map(task => `
    <div class="background-task-item" data-task-id="${task.id}">
      <div class="task-icon">
        ${task.status === 'complete' ? '✅' : task.status === 'error' ? '❌' : '⚙️'}
      </div>
      <div class="task-info">
        <div class="task-name">${task.service || task.id}</div>
        <div class="task-progress">
          ${task.progress ? `${Math.round(task.progress)}%` : task.status}
        </div>
      </div>
      ${task.progress ? `
        <div class="task-progress-bar">
          <div class="task-progress-fill" style="width: ${task.progress}%"></div>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = `
    <div class="background-tasks-header">
      <div class="header-icon">⚙️</div>
      <div class="header-title">Background Tasks</div>
      <button class="header-toggle" onclick="toggleBackgroundTasks()">
        <span class="toggle-icon">▼</span>
      </button>
    </div>
    <div class="background-tasks-list">
      ${tasksHTML}
    </div>
  `;
  
  container.style.display = 'block';
}

/**
 * Toggle background tasks visibility
 */
window.toggleBackgroundTasks = function() {
  const container = document.getElementById('background-tasks-status');
  if (container) {
    const list = container.querySelector('.background-tasks-list');
    const toggle = container.querySelector('.toggle-icon');
    
    if (list.style.display === 'none') {
      list.style.display = 'block';
      toggle.textContent = '▼';
    } else {
      list.style.display = 'none';
      toggle.textContent = '▶';
    }
  }
};

export { startOver };
