/**
 * Reconfiguration Navigation Module
 * Handles navigation, breadcrumbs, progress indicators, and UX for reconfiguration mode
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';
import { api } from './api-client.js';

/**
 * Module-level initialization flag
 */
let isInitialized = false;

/**
 * Reconfiguration navigation state
 */
let reconfigurationState = {
    currentFlow: null,
    breadcrumbs: [],
    operationHistory: [],
    progressSteps: [],
    currentStep: 0
};

/**
 * Initialize reconfiguration navigation
 */
export function initReconfigurationNavigation() {
    console.log('[RECONFIG-NAV] Initializing reconfiguration navigation');
    
    // GUARD: Prevent multiple initializations
    if (isInitialized) {
        console.log('[RECONFIG-NAV] Already initialized, skipping');
        console.log('[RECONFIG-NAV] To force re-initialization, call resetReconfigurationNavigation() first');
        return;
    }
    
    console.log('[RECONFIG-NAV] First initialization, proceeding...');
    
    // Create navigation elements (these now have their own cleanup)
    createReconfigurationNavigation();
    createBreadcrumbNavigation();
    createProgressIndicator();
    createOperationHistory();
    
    // Set up event listeners
    setupNavigationEventListeners();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Mark as initialized
    isInitialized = true;
    console.log('[RECONFIG-NAV] Initialization complete, flag set to true');
}

/**
 * Create main reconfiguration navigation
 */
function createReconfigurationNavigation() {
    // CLEANUP: Remove existing navigation to prevent duplicates
    const existingNav = document.getElementById('reconfiguration-nav');
    if (existingNav) {
        console.log('[RECONFIG-NAV] Removing existing navigation element');
        existingNav.remove();
    }
    
    // Now create fresh navigation
    const navContainer = document.createElement('div');
    navContainer.id = 'reconfiguration-nav';
    navContainer.className = 'reconfiguration-navigation';
    navContainer.innerHTML = `
        <div class="reconfig-nav-header">
            <div class="reconfig-nav-title">
                <div class="reconfig-nav-icon">⚙️</div>
                <div class="reconfig-nav-text">
                    <h3>Reconfiguration Mode</h3>
                    <p class="reconfig-nav-subtitle">Modify your Kaspa installation</p>
                </div>
            </div>
            <div class="reconfig-nav-actions">
                <button class="btn-icon-only" onclick="showReconfigurationHelp()" title="Help & Guidance">
                    <span>❓</span>
                </button>
                <button class="btn-icon-only" onclick="showOperationHistory()" title="Operation History">
                    <span>📋</span>
                </button>
                <button class="btn-secondary btn-small" onclick="exitReconfigurationMode()">
                    <span class="btn-icon">←</span>
                    Exit Reconfiguration
                </button>
            </div>
        </div>
        
        <div class="reconfig-nav-content" id="reconfig-nav-content">
            <!-- Dynamic content based on current flow -->
        </div>
    `;
    
    // Insert at the top of wizard content
    const wizardContent = document.querySelector('.wizard-content');
    if (wizardContent) {
        wizardContent.insertBefore(navContainer, wizardContent.firstChild);
        console.log('[RECONFIG-NAV] Navigation created and inserted');
    } else {
        console.error('[RECONFIG-NAV] Cannot find .wizard-content element');
    }
}

/**
 * Create breadcrumb navigation
 */
function createBreadcrumbNavigation() {
    // CLEANUP: Remove existing breadcrumbs
    const existingBreadcrumbs = document.getElementById('reconfiguration-breadcrumbs');
    if (existingBreadcrumbs) {
        console.log('[RECONFIG-NAV] Removing existing breadcrumb navigation');
        existingBreadcrumbs.remove();
    }
    
    // Create fresh breadcrumb container
    const breadcrumbContainer = document.createElement('div');
    breadcrumbContainer.id = 'reconfiguration-breadcrumbs';
    breadcrumbContainer.className = 'reconfiguration-breadcrumbs';
    breadcrumbContainer.innerHTML = `
        <nav class="breadcrumb-nav" aria-label="Reconfiguration navigation">
            <ol class="breadcrumb-list" id="breadcrumb-list">
                <!-- Breadcrumbs will be populated dynamically -->
            </ol>
        </nav>
    `;
    
    // Insert after reconfiguration nav
    const reconfigNav = document.getElementById('reconfiguration-nav');
    if (reconfigNav) {
        reconfigNav.appendChild(breadcrumbContainer);
        console.log('[RECONFIG-NAV] Breadcrumb navigation created');
    } else {
        console.warn('[RECONFIG-NAV] Cannot find reconfiguration-nav for breadcrumbs');
    }
}

/**
 * Create progress indicator for multi-step operations
 */
function createProgressIndicator() {
    // CLEANUP: Remove existing progress indicator
    const existingProgress = document.getElementById('reconfiguration-progress');
    if (existingProgress) {
        console.log('[RECONFIG-NAV] Removing existing progress indicator');
        existingProgress.remove();
    }
    
    // Create fresh progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.id = 'reconfiguration-progress';
    progressContainer.className = 'reconfiguration-progress';
    progressContainer.style.display = 'none';
    progressContainer.innerHTML = `
        <div class="progress-header">
            <h4 class="progress-title" id="progress-title">Operation in Progress</h4>
            <div class="progress-status" id="progress-status">
                <span class="status-indicator" id="progress-indicator"></span>
                <span class="status-text" id="progress-text">Preparing...</span>
            </div>
        </div>
        
        <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-percentage" id="progress-percentage">0%</div>
        </div>
        
        <div class="progress-steps" id="progress-steps">
            <!-- Steps will be populated dynamically -->
        </div>
        
        <div class="progress-actions">
            <button class="btn-secondary btn-small" onclick="pauseOperation()" id="pause-btn" style="display: none;">
                <span class="btn-icon">⏸️</span>
                Pause
            </button>
            <button class="btn-danger btn-small" onclick="cancelOperation()" id="cancel-btn">
                <span class="btn-icon">✖️</span>
                Cancel
            </button>
        </div>
    `;
    
    // Insert after breadcrumbs
    const breadcrumbs = document.getElementById('reconfiguration-breadcrumbs');
    if (breadcrumbs) {
        breadcrumbs.appendChild(progressContainer);
        console.log('[RECONFIG-NAV] Progress indicator created');
    } else {
        console.warn('[RECONFIG-NAV] Cannot find reconfiguration-breadcrumbs for progress');
    }
}

/**
 * Create operation history panel
 */
function createOperationHistory() {
    // CLEANUP: Remove existing history panel
    const existingHistory = document.getElementById('operation-history-panel');
    if (existingHistory) {
        console.log('[RECONFIG-NAV] Removing existing operation history panel');
        existingHistory.remove();
    }
    
    // Create fresh history panel
    const historyPanel = document.createElement('div');
    historyPanel.id = 'operation-history-panel';
    historyPanel.className = 'operation-history-panel';
    historyPanel.style.display = 'none';
    historyPanel.innerHTML = `
        <div class="history-header">
            <h4>Operation History</h4>
            <button class="btn-icon-only" onclick="closeOperationHistory()">
                <span>✖️</span>
            </button>
        </div>
        
        <div class="history-content" id="history-content">
            <div class="history-empty" id="history-empty">
                <p>No operations performed yet</p>
            </div>
            <div class="history-list" id="history-list">
                <!-- History items will be populated dynamically -->
            </div>
        </div>
        
        <div class="history-actions">
            <button class="btn-secondary btn-small" onclick="exportOperationHistory()">
                <span class="btn-icon">📄</span>
                Export History
            </button>
            <button class="btn-danger btn-small" onclick="clearOperationHistory()">
                <span class="btn-icon">🗑️</span>
                Clear History
            </button>
        </div>
    `;
    
    // Append to body for overlay
    document.body.appendChild(historyPanel);
    console.log('[RECONFIG-NAV] Operation history panel created');
}

/**
 * Update breadcrumb navigation
 */
export function updateBreadcrumbs(breadcrumbs) {
    reconfigurationState.breadcrumbs = breadcrumbs;
    
    const breadcrumbList = document.getElementById('breadcrumb-list');
    if (!breadcrumbList) return;
    
    breadcrumbList.innerHTML = '';
    
    breadcrumbs.forEach((crumb, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'breadcrumb-item';
        
        if (index === breadcrumbs.length - 1) {
            // Current page - not clickable
            listItem.classList.add('current');
            listItem.innerHTML = `
                <span class="breadcrumb-text">${crumb.title}</span>
            `;
        } else {
            // Previous pages - clickable
            listItem.innerHTML = `
                <button class="breadcrumb-link" onclick="navigateToBreadcrumb('${crumb.id}')" title="${crumb.description || ''}">
                    ${crumb.title}
                </button>
                <span class="breadcrumb-separator">→</span>
            `;
        }
        
        breadcrumbList.appendChild(listItem);
    });
}

/**
 * Start a multi-step operation with progress tracking
 */
export function startOperation(operationConfig) {
    reconfigurationState.currentFlow = operationConfig.id;
    reconfigurationState.progressSteps = operationConfig.steps;
    reconfigurationState.currentStep = 0;
    
    // Show progress indicator
    const progressContainer = document.getElementById('reconfiguration-progress');
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    // Update progress title
    const progressTitle = document.getElementById('progress-title');
    if (progressTitle) {
        progressTitle.textContent = operationConfig.title;
    }
    
    // Create progress steps
    updateProgressSteps();
    
    // Update progress
    updateOperationProgress(0, 'Starting operation...');
    
    // Add to operation history
    addToOperationHistory({
        id: generateOperationId(),
        type: operationConfig.type,
        title: operationConfig.title,
        status: 'started',
        timestamp: new Date(),
        steps: operationConfig.steps.length
    });
}

/**
 * Update operation progress
 */
export function updateOperationProgress(percentage, statusText, stepIndex = null) {
    // Update progress bar
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
    
    // Update status text
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = statusText;
    }
    
    // Update current step if provided
    if (stepIndex !== null) {
        reconfigurationState.currentStep = stepIndex;
        updateProgressSteps();
    }
    
    // Update status indicator
    const progressIndicator = document.getElementById('progress-indicator');
    if (progressIndicator) {
        if (percentage === 100) {
            progressIndicator.className = 'status-indicator success';
        } else if (percentage > 0) {
            progressIndicator.className = 'status-indicator in-progress';
        } else {
            progressIndicator.className = 'status-indicator pending';
        }
    }
}

/**
 * Complete operation
 */
export function completeOperation(success, message) {
    const operationId = reconfigurationState.currentFlow;
    
    // Update progress to 100%
    updateOperationProgress(100, success ? 'Operation completed successfully' : 'Operation failed');
    
    // Update operation history
    updateOperationHistory(operationId, {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
        message: message
    });
    
    // Show completion notification
    showNotification(
        message || (success ? 'Operation completed successfully' : 'Operation failed'),
        success ? 'success' : 'error'
    );
    
    // Hide progress after delay
    setTimeout(() => {
        const progressContainer = document.getElementById('reconfiguration-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }, success ? 3000 : 5000);
    
    // Reset state
    reconfigurationState.currentFlow = null;
    reconfigurationState.progressSteps = [];
    reconfigurationState.currentStep = 0;
}

/**
 * Update progress steps display
 */
function updateProgressSteps() {
    const progressSteps = document.getElementById('progress-steps');
    if (!progressSteps || !reconfigurationState.progressSteps.length) return;
    
    progressSteps.innerHTML = '';
    
    reconfigurationState.progressSteps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'progress-step';
        
        if (index < reconfigurationState.currentStep) {
            stepElement.classList.add('completed');
        } else if (index === reconfigurationState.currentStep) {
            stepElement.classList.add('current');
        }
        
        stepElement.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-content">
                <div class="step-title">${step.title}</div>
                <div class="step-description">${step.description}</div>
            </div>
            <div class="step-status">
                ${index < reconfigurationState.currentStep ? '✓' : 
                  index === reconfigurationState.currentStep ? '⏳' : '⏸️'}
            </div>
        `;
        
        progressSteps.appendChild(stepElement);
    });
}

/**
 * Add operation to history
 */
function addToOperationHistory(operation) {
    reconfigurationState.operationHistory.unshift(operation);
    
    // Limit history to 50 items
    if (reconfigurationState.operationHistory.length > 50) {
        reconfigurationState.operationHistory = reconfigurationState.operationHistory.slice(0, 50);
    }
    
    // Save to localStorage
    localStorage.setItem('reconfigurationHistory', JSON.stringify(reconfigurationState.operationHistory));
    
    // Update history display if visible
    updateOperationHistoryDisplay();
}

/**
 * Update operation in history
 */
function updateOperationHistory(operationId, updates) {
    const operation = reconfigurationState.operationHistory.find(op => op.id === operationId);
    if (operation) {
        Object.assign(operation, updates);
        
        // Save to localStorage
        localStorage.setItem('reconfigurationHistory', JSON.stringify(reconfigurationState.operationHistory));
        
        // Update history display if visible
        updateOperationHistoryDisplay();
    }
}

/**
 * Update operation history display
 */
function updateOperationHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    
    if (!historyList || !historyEmpty) return;
    
    if (reconfigurationState.operationHistory.length === 0) {
        historyEmpty.style.display = 'block';
        historyList.style.display = 'none';
        return;
    }
    
    historyEmpty.style.display = 'none';
    historyList.style.display = 'block';
    historyList.innerHTML = '';
    
    reconfigurationState.operationHistory.forEach(operation => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${operation.status}`;
        
        const statusIcon = getOperationStatusIcon(operation.status);
        const duration = operation.completedAt ? 
            Math.round((operation.completedAt - operation.timestamp) / 1000) : null;
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-status">${statusIcon}</div>
                <div class="history-item-title">${operation.title}</div>
                <div class="history-item-time">${formatTimestamp(operation.timestamp)}</div>
            </div>
            <div class="history-item-details">
                <div class="history-item-type">${operation.type}</div>
                ${duration ? `<div class="history-item-duration">${duration}s</div>` : ''}
                ${operation.steps ? `<div class="history-item-steps">${operation.steps} steps</div>` : ''}
            </div>
            ${operation.message ? `<div class="history-item-message">${operation.message}</div>` : ''}
            <div class="history-item-actions">
                ${operation.status === 'completed' ? `
                    <button class="btn-secondary btn-small" onclick="rollbackOperation('${operation.id}')" title="Rollback this operation">
                        <span class="btn-icon">↶</span>
                        Rollback
                    </button>
                ` : ''}
                <button class="btn-secondary btn-small" onclick="viewOperationDetails('${operation.id}')" title="View details">
                    <span class="btn-icon">👁️</span>
                    Details
                </button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

/**
 * Get operation status icon
 */
function getOperationStatusIcon(status) {
    const icons = {
        'started': '⏳',
        'in-progress': '🔄',
        'completed': '✅',
        'failed': '❌',
        'cancelled': '⏹️',
        'rolled-back': '↶'
    };
    return icons[status] || '❓';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        return `${Math.floor(diff / 3600000)}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Generate unique operation ID
 */
function generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize tooltips for contextual guidance
 */
function initializeTooltips() {
    // Create tooltip container
    let tooltipContainer = document.getElementById('tooltip-container');
    if (!tooltipContainer) {
        tooltipContainer = document.createElement('div');
        tooltipContainer.id = 'tooltip-container';
        tooltipContainer.className = 'tooltip-container';
        document.body.appendChild(tooltipContainer);
    }
    
    // Set up tooltip event listeners
    document.addEventListener('mouseenter', handleTooltipShow, true);
    document.addEventListener('mouseleave', handleTooltipHide, true);
}

/**
 * Handle tooltip show
 */
function handleTooltipShow(event) {
    const element = event.target;
    
    // Check if element has getAttribute method (is an Element)
    if (!element || typeof element.getAttribute !== 'function') return;
    
    const tooltipText = element.getAttribute('data-tooltip') || element.title;
    
    if (!tooltipText) return;
    
    // Clear existing title to prevent browser tooltip
    if (element.title) {
        element.setAttribute('data-original-title', element.title);
        element.title = '';
    }
    
    showTooltip(element, tooltipText);
}

/**
 * Handle tooltip hide
 */
function handleTooltipHide(event) {
    const element = event.target;
    
    // Check if element has getAttribute method (is an Element)
    if (!element || typeof element.getAttribute !== 'function') return;
    
    // Restore original title
    const originalTitle = element.getAttribute('data-original-title');
    if (originalTitle) {
        element.title = originalTitle;
        element.removeAttribute('data-original-title');
    }
    
    hideTooltip();
}

/**
 * Show tooltip
 */
function showTooltip(element, text) {
    const tooltipContainer = document.getElementById('tooltip-container');
    if (!tooltipContainer) return;
    
    tooltipContainer.innerHTML = `
        <div class="tooltip-content">
            ${text}
        </div>
    `;
    
    tooltipContainer.style.display = 'block';
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltipContainer.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // Adjust if tooltip goes off screen
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
    }
    
    if (top < 8) {
        top = rect.bottom + 8;
        tooltipContainer.classList.add('tooltip-bottom');
    } else {
        tooltipContainer.classList.remove('tooltip-bottom');
    }
    
    tooltipContainer.style.left = `${left}px`;
    tooltipContainer.style.top = `${top}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltipContainer = document.getElementById('tooltip-container');
    if (tooltipContainer) {
        tooltipContainer.style.display = 'none';
    }
}

/**
 * Set up navigation event listeners
 */
function setupNavigationEventListeners() {
    // Load operation history from localStorage
    const savedHistory = localStorage.getItem('reconfigurationHistory');
    if (savedHistory) {
        try {
            reconfigurationState.operationHistory = JSON.parse(savedHistory);
        } catch (error) {
            console.error('Error loading operation history:', error);
        }
    }
}

/**
 * Reset initialization flag
 * Call this when exiting reconfiguration mode or when you need to force re-initialization
 */
export function resetReconfigurationNavigation() {
    console.log('[RECONFIG-NAV] Resetting initialization flag');
    
    // Reset flag
    isInitialized = false;
    
    // Optionally reset state
    reconfigurationState = {
        currentFlow: null,
        breadcrumbs: [],
        operationHistory: [],
        progressSteps: [],
        currentStep: 0
    };
    
    console.log('[RECONFIG-NAV] Initialization flag reset to false');
}

/**
 * Force re-initialization of reconfiguration navigation
 * Use this when you need to completely rebuild the navigation UI
 */
export function reinitializeReconfigurationNavigation() {
    console.log('[RECONFIG-NAV] Force re-initialization requested');
    
    // Reset first
    resetReconfigurationNavigation();
    
    // Then initialize
    initReconfigurationNavigation();
    
    console.log('[RECONFIG-NAV] Re-initialization complete');
}

/**
 * Get initialization status (useful for debugging)
 */
export function getInitializationStatus() {
    return {
        isInitialized,
        state: reconfigurationState
    };
}

/**
 * Show/hide reconfiguration navigation
 */
export function showReconfigurationNavigation() {
    const nav = document.getElementById('reconfiguration-nav');
    if (nav) {
        nav.style.display = 'block';
    }
    
    // Hide main wizard progress
    const wizardProgress = document.querySelector('.wizard-progress');
    if (wizardProgress) {
        wizardProgress.style.display = 'none';
    }
}

export function hideReconfigurationNavigation() {
    const nav = document.getElementById('reconfiguration-nav');
    if (nav) {
        nav.style.display = 'none';
    }
    
    // Show main wizard progress
    const wizardProgress = document.querySelector('.wizard-progress');
    if (wizardProgress) {
        wizardProgress.style.display = 'block';
    }
}

// Global functions for HTML onclick handlers
window.showReconfigurationHelp = function() {
    showNotification('Reconfiguration help and guidance coming soon!', 'info');
};

window.showOperationHistory = function() {
    const historyPanel = document.getElementById('operation-history-panel');
    if (historyPanel) {
        historyPanel.style.display = 'block';
        updateOperationHistoryDisplay();
    }
};

window.closeOperationHistory = function() {
    const historyPanel = document.getElementById('operation-history-panel');
    if (historyPanel) {
        historyPanel.style.display = 'none';
    }
};

window.exportOperationHistory = function() {
    const history = JSON.stringify(reconfigurationState.operationHistory, null, 2);
    const blob = new Blob([history], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspa-reconfiguration-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Operation history exported successfully', 'success');
};

window.clearOperationHistory = function() {
    if (confirm('Are you sure you want to clear the operation history? This cannot be undone.')) {
        reconfigurationState.operationHistory = [];
        localStorage.removeItem('reconfigurationHistory');
        updateOperationHistoryDisplay();
        showNotification('Operation history cleared', 'success');
    }
};

window.rollbackOperation = function(operationId) {
    if (confirm('Are you sure you want to rollback this operation? This will attempt to restore the previous configuration.')) {
        // TODO: Implement rollback functionality
        showNotification('Rollback functionality coming soon!', 'info');
    }
};

window.viewOperationDetails = function(operationId) {
    const operation = reconfigurationState.operationHistory.find(op => op.id === operationId);
    if (operation) {
        // TODO: Show detailed operation information in a modal
        showNotification(`Operation details: ${operation.title} (${operation.status})`, 'info');
    }
};

window.navigateToBreadcrumb = function(crumbId) {
    // TODO: Implement breadcrumb navigation
    showNotification(`Navigating to: ${crumbId}`, 'info');
};

window.exitReconfigurationMode = function() {
    if (confirm('Are you sure you want to exit reconfiguration mode? Any unsaved changes will be lost.')) {
        // Clear reconfiguration state
        stateManager.remove('reconfigurationData');
        stateManager.remove('reconfigurationAction');
        stateManager.remove('reconfigurationContext');
        
        // Hide reconfiguration navigation
        hideReconfigurationNavigation();
        
        // Redirect to dashboard or initial mode
        window.location.href = '/dashboard';
    }
};

window.pauseOperation = function() {
    // TODO: Implement operation pause functionality
    showNotification('Operation pause functionality coming soon!', 'info');
};

window.cancelOperation = function() {
    if (confirm('Are you sure you want to cancel the current operation?')) {
        // TODO: Implement operation cancellation
        completeOperation(false, 'Operation cancelled by user');
    }
};

// Expose module functions globally for debugging and external access
window.reconfigurationNavigation = {
    reset: resetReconfigurationNavigation,
    reinitialize: reinitializeReconfigurationNavigation,
    getStatus: getInitializationStatus
};