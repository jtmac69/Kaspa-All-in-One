/**
 * Enhanced Troubleshooting Module
 * 
 * Provides guided troubleshooting, automatic retry mechanisms,
 * diagnostic export, and fallback options for installation errors.
 * 
 * Requirements: 6.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Enhanced troubleshooting system
 */
class EnhancedTroubleshooting {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.diagnosticExports = new Map();
  }

  /**
   * Handle installation error with enhanced troubleshooting
   * @param {Object} errorData - Error information
   */
  async handleInstallationError(errorData) {
    const { stage, message, error, service, profiles } = errorData;
    
    console.log('Enhanced troubleshooting for error:', errorData);
    
    // Get guided troubleshooting
    const troubleshootingGuide = await this.getTroubleshootingGuide({
      stage,
      error: error || message,
      service,
      profiles: profiles || stateManager.get('selectedProfiles') || []
    });
    
    // Display enhanced error UI
    this.displayEnhancedErrorUI(errorData, troubleshootingGuide);
    
    // Check if automatic retry is recommended
    if (troubleshootingGuide.retryRecommended && troubleshootingGuide.isTransient) {
      this.showAutoRetryOption(errorData, troubleshootingGuide);
    }
  }

  /**
   * Get guided troubleshooting steps from backend
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Troubleshooting guide
   */
  async getTroubleshootingGuide(context) {
    try {
      const response = await fetch('/api/troubleshooting/guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.guide;

    } catch (error) {
      console.error('Failed to get troubleshooting guide:', error);
      
      // Return fallback guide
      return {
        title: 'Installation Error',
        description: 'An error occurred during installation',
        steps: [
          {
            id: 'basic-check',
            title: 'Basic System Check',
            description: 'Verify system requirements and Docker status',
            actions: [
              'Check Docker is running: docker ps',
              'Verify system resources: free -h && df -h',
              'Check network connectivity: ping google.com'
            ],
            automated: false,
            estimatedTime: '2-3 minutes'
          }
        ],
        quickFixes: [],
        fallbackOptions: [],
        isTransient: false,
        retryRecommended: false,
        estimatedTime: '5-10 minutes'
      };
    }
  }

  /**
   * Display enhanced error UI with troubleshooting guide
   * @param {Object} errorData - Error information
   * @param {Object} guide - Troubleshooting guide
   */
  displayEnhancedErrorUI(errorData, guide) {
    // Create or update enhanced error panel
    let errorPanel = document.getElementById('enhanced-error-panel');
    
    if (!errorPanel) {
      errorPanel = document.createElement('div');
      errorPanel.id = 'enhanced-error-panel';
      errorPanel.className = 'enhanced-error-panel';
      
      const installProgress = document.querySelector('.install-progress');
      if (installProgress) {
        installProgress.appendChild(errorPanel);
      }
    }

    errorPanel.innerHTML = this.buildEnhancedErrorHTML(errorData, guide);
    errorPanel.style.display = 'block';
    
    // Attach event listeners
    this.attachErrorPanelListeners(errorPanel, errorData, guide);
    
    // Store guide for later use
    stateManager.set('troubleshootingGuide', guide);
  }

  /**
   * Build enhanced error HTML
   * @param {Object} errorData - Error information
   * @param {Object} guide - Troubleshooting guide
   * @returns {string} HTML content
   */
  buildEnhancedErrorHTML(errorData, guide) {
    const { stage, message, error, service } = errorData;
    
    return `
      <div class="enhanced-error-header">
        <div class="error-icon">
          ${guide.isTransient ? '⚠️' : '❌'}
        </div>
        <div class="error-title-section">
          <h3>${guide.title}</h3>
          <p class="error-description">${guide.description}</p>
          ${guide.isTransient ? `
            <div class="transient-notice">
              <span class="transient-icon">🔄</span>
              <span>This appears to be a temporary issue that may resolve with a retry</span>
            </div>
          ` : ''}
        </div>
        <div class="error-actions-header">
          <button class="btn-icon" onclick="window.enhancedTroubleshooting.toggleErrorDetails()" title="Toggle Details">
            <span id="error-details-toggle">📋</span>
          </button>
          <button class="btn-icon" onclick="window.enhancedTroubleshooting.exportDiagnostics()" title="Export Diagnostics">
            <span>📊</span>
          </button>
        </div>
      </div>

      <div class="error-details-section" id="error-details-section" style="display: none;">
        <div class="error-details-content">
          <div class="error-detail-item">
            <strong>Stage:</strong> ${stage}
          </div>
          <div class="error-detail-item">
            <strong>Message:</strong> ${message}
          </div>
          ${service ? `
            <div class="error-detail-item">
              <strong>Service:</strong> ${service}
            </div>
          ` : ''}
          ${error && error !== message ? `
            <div class="error-detail-item">
              <strong>Details:</strong> ${error}
            </div>
          ` : ''}
          <div class="error-detail-item">
            <strong>Estimated Resolution Time:</strong> ${guide.estimatedTime}
          </div>
        </div>
      </div>

      ${guide.quickFixes && guide.quickFixes.length > 0 ? `
        <div class="quick-fixes-section">
          <h4>🚀 Quick Fixes</h4>
          <p class="section-description">Try these automated solutions first:</p>
          <div class="quick-fixes-grid">
            ${guide.quickFixes.map(fix => `
              <div class="quick-fix-item ${fix.risk}">
                <div class="quick-fix-header">
                  <span class="quick-fix-title">${fix.title}</span>
                  <span class="quick-fix-time">${fix.estimatedTime}</span>
                </div>
                <div class="quick-fix-description">${fix.description}</div>
                <button class="btn-quick-fix ${fix.risk}" 
                        onclick="window.enhancedTroubleshooting.executeQuickFix('${fix.id}')"
                        data-fix-id="${fix.id}">
                  <span class="btn-icon">⚡</span>
                  Apply Fix
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="troubleshooting-steps-section">
        <h4>🔧 Troubleshooting Steps</h4>
        <p class="section-description">Follow these steps to diagnose and resolve the issue:</p>
        <div class="troubleshooting-steps">
          ${guide.steps.map((step, index) => `
            <div class="troubleshooting-step" data-step-id="${step.id}">
              <div class="step-header">
                <div class="step-number">${index + 1}</div>
                <div class="step-info">
                  <div class="step-title">${step.title}</div>
                  <div class="step-description">${step.description}</div>
                  <div class="step-meta">
                    <span class="step-time">⏱️ ${step.estimatedTime}</span>
                    ${step.automated ? '<span class="step-automated">🤖 Automated</span>' : '<span class="step-manual">👤 Manual</span>'}
                  </div>
                </div>
                <div class="step-actions">
                  ${step.automated ? `
                    <button class="btn-step-execute" onclick="window.enhancedTroubleshooting.executeStep('${step.id}')">
                      <span class="btn-icon">▶️</span>
                      Execute
                    </button>
                  ` : ''}
                  <button class="btn-step-toggle" onclick="window.enhancedTroubleshooting.toggleStep('${step.id}')">
                    <span class="btn-icon">📋</span>
                    Details
                  </button>
                </div>
              </div>
              <div class="step-content" id="step-content-${step.id}" style="display: none;">
                <div class="step-actions-list">
                  <h5>Actions to perform:</h5>
                  <ul>
                    ${step.actions.map(action => `<li>${action}</li>`).join('')}
                  </ul>
                </div>
                ${step.command ? `
                  <div class="step-command">
                    <h5>Command to run:</h5>
                    <code>${step.command}</code>
                    <button class="btn-copy-command" onclick="window.enhancedTroubleshooting.copyCommand('${step.command}')">
                      📋 Copy
                    </button>
                  </div>
                ` : ''}
                <div class="step-result" id="step-result-${step.id}" style="display: none;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${guide.fallbackOptions && guide.fallbackOptions.length > 0 ? `
        <div class="fallback-options-section">
          <h4>🔄 Fallback Options</h4>
          <p class="section-description">If troubleshooting doesn't resolve the issue, try these alternatives:</p>
          <div class="fallback-options">
            ${guide.fallbackOptions.map(option => `
              <div class="fallback-option ${option.recommended ? 'recommended' : ''}">
                <div class="fallback-header">
                  <div class="fallback-title">
                    ${option.title}
                    ${option.recommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                  </div>
                  <div class="fallback-time">${option.estimatedTime}</div>
                </div>
                <div class="fallback-description">${option.description}</div>
                <div class="fallback-impact">
                  <strong>Impact:</strong> ${option.impact}
                </div>
                <div class="fallback-steps">
                  <strong>Steps:</strong>
                  <ol>
                    ${option.steps.map(step => `<li>${step}</li>`).join('')}
                  </ol>
                </div>
                <button class="btn-fallback ${option.recommended ? 'recommended' : ''}" 
                        onclick="window.enhancedTroubleshooting.executeFallback('${option.id}')"
                        data-fallback-id="${option.id}">
                  <span class="btn-icon">🔄</span>
                  Apply Fallback
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="error-recovery-actions">
        <div class="primary-actions">
          ${guide.retryRecommended ? `
            <button class="btn-primary retry-btn" onclick="window.enhancedTroubleshooting.retryInstallation()">
              <span class="btn-icon">🔄</span>
              Retry Installation
            </button>
          ` : ''}
          <button class="btn-secondary" onclick="window.enhancedTroubleshooting.runSystemCheck()">
            <span class="btn-icon">🔍</span>
            System Check
          </button>
          <button class="btn-secondary" onclick="window.enhancedTroubleshooting.exportDiagnostics()">
            <span class="btn-icon">📊</span>
            Export Diagnostics
          </button>
        </div>
        <div class="secondary-actions">
          <button class="btn-secondary" onclick="window.enhancedTroubleshooting.goBackToConfiguration()">
            <span class="btn-icon">←</span>
            Back to Configuration
          </button>
          <button class="btn-danger" onclick="window.enhancedTroubleshooting.startOver()">
            <span class="btn-icon">🔄</span>
            Start Over
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to error panel
   */
  attachErrorPanelListeners(errorPanel, errorData, guide) {
    // Store references for global access
    window.enhancedTroubleshooting = this;
    
    // Add CSS for enhanced error panel
    this.addEnhancedErrorCSS();
  }

  /**
   * Show automatic retry option for transient errors
   */
  showAutoRetryOption(errorData, guide) {
    if (!guide.isTransient) return;
    
    const retryKey = `${errorData.stage}-${errorData.service || 'general'}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;
    
    if (attempts >= this.maxRetryAttempts) {
      console.log('Max retry attempts reached for', retryKey);
      return;
    }
    
    // Show auto-retry notification
    const autoRetryNotification = document.createElement('div');
    autoRetryNotification.className = 'auto-retry-notification';
    autoRetryNotification.innerHTML = `
      <div class="auto-retry-content">
        <div class="auto-retry-icon">🔄</div>
        <div class="auto-retry-text">
          <div class="auto-retry-title">Automatic Retry Available</div>
          <div class="auto-retry-description">
            This appears to be a temporary issue. Would you like to retry automatically?
          </div>
        </div>
        <div class="auto-retry-actions">
          <button class="btn-auto-retry" onclick="window.enhancedTroubleshooting.executeAutoRetry('${retryKey}')">
            <span class="btn-icon">🔄</span>
            Retry Now
          </button>
          <button class="btn-auto-retry-dismiss" onclick="this.parentElement.parentElement.parentElement.remove()">
            <span class="btn-icon">✕</span>
            Dismiss
          </button>
        </div>
      </div>
      <div class="auto-retry-countdown">
        <div class="countdown-text">Auto-retry in <span id="countdown-timer">10</span> seconds</div>
        <div class="countdown-bar">
          <div class="countdown-progress" id="countdown-progress"></div>
        </div>
      </div>
    `;
    
    // Insert notification
    const errorPanel = document.getElementById('enhanced-error-panel');
    if (errorPanel) {
      errorPanel.insertBefore(autoRetryNotification, errorPanel.firstChild);
    }
    
    // Start countdown
    this.startAutoRetryCountdown(retryKey, 10);
  }

  /**
   * Start auto-retry countdown
   */
  startAutoRetryCountdown(retryKey, seconds) {
    let remaining = seconds;
    const timer = document.getElementById('countdown-timer');
    const progress = document.getElementById('countdown-progress');
    
    const interval = setInterval(() => {
      remaining--;
      
      if (timer) timer.textContent = remaining;
      if (progress) {
        progress.style.width = `${((seconds - remaining) / seconds) * 100}%`;
      }
      
      if (remaining <= 0) {
        clearInterval(interval);
        this.executeAutoRetry(retryKey);
      }
    }, 1000);
    
    // Store interval for potential cancellation
    this.autoRetryInterval = interval;
  }

  /**
   * Execute automatic retry
   */
  async executeAutoRetry(retryKey) {
    // Clear countdown
    if (this.autoRetryInterval) {
      clearInterval(this.autoRetryInterval);
    }
    
    // Remove auto-retry notification
    const notification = document.querySelector('.auto-retry-notification');
    if (notification) {
      notification.remove();
    }
    
    // Increment retry count
    const attempts = this.retryAttempts.get(retryKey) || 0;
    this.retryAttempts.set(retryKey, attempts + 1);
    
    showNotification(`Retrying installation (attempt ${attempts + 1}/${this.maxRetryAttempts})...`, 'info');
    
    // Execute retry
    await this.retryInstallation();
  }

  /**
   * Execute quick fix
   */
  async executeQuickFix(fixId) {
    const button = document.querySelector(`[data-fix-id="${fixId}"]`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<div class="spinner-small"></div> Applying...';
    }
    
    try {
      const response = await fetch('/api/troubleshooting/quick-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fixId,
          context: {
            profiles: stateManager.get('selectedProfiles') || []
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(`Quick fix applied: ${data.result.message}`, 'success');
        
        // Update button to show success
        if (button) {
          button.innerHTML = '<span class="btn-icon">✅</span> Applied';
          button.classList.add('success');
        }
        
        // Suggest retry after successful quick fix
        setTimeout(() => {
          if (confirm('Quick fix applied successfully. Would you like to retry the installation?')) {
            this.retryInstallation();
          }
        }, 1000);
        
      } else {
        throw new Error(data.message || 'Quick fix failed');
      }
      
    } catch (error) {
      console.error('Quick fix error:', error);
      showNotification(`Quick fix failed: ${error.message}`, 'error');
      
      // Restore button
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">⚡</span> Apply Fix';
      }
    }
  }

  /**
   * Execute troubleshooting step
   */
  async executeStep(stepId) {
    const button = document.querySelector(`[onclick="window.enhancedTroubleshooting.executeStep('${stepId}')"]`);
    const resultDiv = document.getElementById(`step-result-${stepId}`);
    
    if (button) {
      button.disabled = true;
      button.innerHTML = '<div class="spinner-small"></div> Running...';
    }
    
    try {
      // Get step details from troubleshooting guide
      const guide = stateManager.get('troubleshootingGuide');
      const step = guide?.steps?.find(s => s.id === stepId);
      
      if (!step || !step.command) {
        throw new Error('Step not found or not automated');
      }
      
      // Execute step command via diagnostic API
      const response = await fetch('/api/troubleshooting/diagnostic-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: step.command,
          stepId: stepId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Show result
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="step-result-success">
            <div class="result-header">
              <span class="result-icon">✅</span>
              <span class="result-title">Step completed successfully</span>
            </div>
            <div class="result-details">
              <pre>${data.result || 'Command executed successfully'}</pre>
            </div>
          </div>
        `;
        resultDiv.style.display = 'block';
      }
      
      // Update button
      if (button) {
        button.innerHTML = '<span class="btn-icon">✅</span> Completed';
        button.classList.add('success');
      }
      
      showNotification(`Step "${step.title}" completed successfully`, 'success');
      
    } catch (error) {
      console.error('Step execution error:', error);
      
      // Show error result
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="step-result-error">
            <div class="result-header">
              <span class="result-icon">❌</span>
              <span class="result-title">Step failed</span>
            </div>
            <div class="result-details">
              <pre>${error.message}</pre>
            </div>
          </div>
        `;
        resultDiv.style.display = 'block';
      }
      
      // Restore button
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">▶️</span> Execute';
      }
      
      showNotification(`Step execution failed: ${error.message}`, 'error');
    }
  }

  /**
   * Execute fallback option
   */
  async executeFallback(fallbackId) {
    const button = document.querySelector(`[data-fallback-id="${fallbackId}"]`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<div class="spinner-small"></div> Applying...';
    }
    
    try {
      const profiles = stateManager.get('selectedProfiles') || [];
      
      const response = await fetch('/api/troubleshooting/fallback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fallbackId,
          profiles,
          context: {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(`Fallback applied: ${data.result.message}`, 'success');
        
        // Update button
        if (button) {
          button.innerHTML = '<span class="btn-icon">✅</span> Applied';
          button.classList.add('success');
        }
        
        // Suggest retry after fallback
        setTimeout(() => {
          if (confirm('Fallback configuration applied. Would you like to retry the installation?')) {
            this.retryInstallation();
          }
        }, 1000);
        
      } else {
        throw new Error(data.message || 'Fallback failed');
      }
      
    } catch (error) {
      console.error('Fallback execution error:', error);
      showNotification(`Fallback failed: ${error.message}`, 'error');
      
      // Restore button
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">🔄</span> Apply Fallback';
      }
    }
  }

  /**
   * Export diagnostic information
   */
  async exportDiagnostics() {
    const button = event?.target;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<div class="spinner-small"></div>';
    }
    
    try {
      // Collect context information
      const context = {
        timestamp: new Date().toISOString(),
        stage: stateManager.get('installationProgress')?.stage,
        profiles: stateManager.get('selectedProfiles'),
        configuration: stateManager.get('configuration'),
        errors: [stateManager.get('installationError')].filter(Boolean),
        troubleshootingGuide: stateManager.get('troubleshootingGuide'),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const response = await fetch('/api/troubleshooting/diagnostic-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(context)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Store export info
        this.diagnosticExports.set(data.exportId, data);
        
        // Show export success dialog
        this.showDiagnosticExportDialog(data);
        
        showNotification('Diagnostic export created successfully', 'success');
        
      } else {
        throw new Error(data.message || 'Export failed');
      }
      
    } catch (error) {
      console.error('Diagnostic export error:', error);
      showNotification(`Diagnostic export failed: ${error.message}`, 'error');
    } finally {
      // Restore button
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span>📊</span>';
      }
    }
  }

  /**
   * Show diagnostic export dialog
   */
  showDiagnosticExportDialog(exportData) {
    const dialog = document.createElement('div');
    dialog.className = 'diagnostic-export-dialog-overlay';
    dialog.innerHTML = `
      <div class="diagnostic-export-dialog">
        <div class="dialog-header">
          <h3>📊 Diagnostic Export Created</h3>
          <button class="dialog-close" onclick="this.closest('.diagnostic-export-dialog-overlay').remove()">✕</button>
        </div>
        <div class="dialog-content">
          <div class="export-info">
            <div class="export-detail">
              <strong>Export ID:</strong> ${exportData.exportId}
            </div>
            <div class="export-detail">
              <strong>Size:</strong> ${this.formatBytes(exportData.size)}
            </div>
            <div class="export-detail">
              <strong>Created:</strong> ${new Date().toLocaleString()}
            </div>
          </div>
          <div class="export-description">
            <p>The diagnostic export contains system information, logs, and configuration details to help troubleshoot the installation issue.</p>
            <p><strong>Privacy Notice:</strong> Sensitive information (passwords, keys) has been redacted.</p>
          </div>
          <div class="export-actions">
            <button class="btn-primary" onclick="window.enhancedTroubleshooting.downloadDiagnostic('${exportData.exportId}', 'diagnostic')">
              <span class="btn-icon">📥</span>
              Download Diagnostic Data
            </button>
            <button class="btn-secondary" onclick="window.enhancedTroubleshooting.downloadDiagnostic('${exportData.exportId}', 'summary')">
              <span class="btn-icon">📄</span>
              Download Summary
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Download diagnostic file
   */
  async downloadDiagnostic(exportId, type = 'diagnostic') {
    try {
      const response = await fetch(`/api/troubleshooting/diagnostic-export/${exportId}?type=${type}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaspa-diagnostics-${exportId}${type === 'summary' ? '-summary.txt' : '.json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification(`Diagnostic ${type} downloaded`, 'success');
      
    } catch (error) {
      console.error('Download error:', error);
      showNotification(`Download failed: ${error.message}`, 'error');
    }
  }

  /**
   * Run system check
   */
  async runSystemCheck() {
    const button = event?.target;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<div class="spinner-small"></div> Checking...';
    }
    
    try {
      const response = await fetch('/api/troubleshooting/system-check');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Show system check results
      this.showSystemCheckResults(data);
      
    } catch (error) {
      console.error('System check error:', error);
      showNotification(`System check failed: ${error.message}`, 'error');
    } finally {
      // Restore button
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">🔍</span> System Check';
      }
    }
  }

  /**
   * Show system check results
   */
  showSystemCheckResults(checkData) {
    const dialog = document.createElement('div');
    dialog.className = 'system-check-dialog-overlay';
    dialog.innerHTML = `
      <div class="system-check-dialog">
        <div class="dialog-header">
          <h3>🔍 System Check Results</h3>
          <div class="overall-status ${checkData.overallStatus}">
            ${this.getStatusIcon(checkData.overallStatus)} ${checkData.overallStatus.toUpperCase()}
          </div>
          <button class="dialog-close" onclick="this.closest('.system-check-dialog-overlay').remove()">✕</button>
        </div>
        <div class="dialog-content">
          <div class="system-checks">
            ${Object.entries(checkData.checks).map(([checkName, check]) => `
              <div class="system-check-item ${check.status}">
                <div class="check-header">
                  <span class="check-icon">${this.getStatusIcon(check.status)}</span>
                  <span class="check-name">${this.formatCheckName(checkName)}</span>
                  <span class="check-status">${check.status}</span>
                </div>
                <div class="check-message">${check.message}</div>
                ${check.details ? `
                  <div class="check-details">
                    <pre>${JSON.stringify(check.details, null, 2)}</pre>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Retry installation
   */
  async retryInstallation() {
    // Clear error state
    stateManager.delete('installationError');
    
    // Hide error panel
    const errorPanel = document.getElementById('enhanced-error-panel');
    if (errorPanel) {
      errorPanel.style.display = 'none';
    }
    
    showNotification('Retrying installation...', 'info');
    
    // Import and call the original retry function
    const { retryInstallation } = await import('./install.js');
    await retryInstallation();
  }

  /**
   * Go back to configuration
   */
  goBackToConfiguration() {
    if (window.previousStep) {
      window.previousStep();
    }
  }

  /**
   * Start over
   */
  startOver() {
    if (confirm('Are you sure you want to start over? This will clear all configuration.')) {
      stateManager.clear();
      if (window.goToStep) {
        window.goToStep(1);
      }
      showNotification('Starting over...', 'info');
    }
  }

  /**
   * Toggle error details
   */
  toggleErrorDetails() {
    const detailsSection = document.getElementById('error-details-section');
    const toggle = document.getElementById('error-details-toggle');
    
    if (detailsSection) {
      const isHidden = detailsSection.style.display === 'none';
      detailsSection.style.display = isHidden ? 'block' : 'none';
      if (toggle) {
        toggle.textContent = isHidden ? '📋' : '📋';
      }
    }
  }

  /**
   * Toggle troubleshooting step
   */
  toggleStep(stepId) {
    const content = document.getElementById(`step-content-${stepId}`);
    if (content) {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
    }
  }

  /**
   * Copy command to clipboard
   */
  async copyCommand(command) {
    try {
      await navigator.clipboard.writeText(command);
      showNotification('Command copied to clipboard', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showNotification('Failed to copy command', 'error');
    }
  }

  /**
   * Helper methods
   */
  getStatusIcon(status) {
    const icons = {
      'healthy': '✅',
      'warning': '⚠️',
      'error': '❌',
      'unknown': '❓'
    };
    return icons[status] || '❓';
  }

  formatCheckName(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Add enhanced error CSS
   */
  addEnhancedErrorCSS() {
    if (document.getElementById('enhanced-troubleshooting-css')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-troubleshooting-css';
    style.textContent = `
      .enhanced-error-panel {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        margin: 20px 0;
        overflow: hidden;
        border-left: 4px solid #e74c3c;
      }

      .enhanced-error-header {
        display: flex;
        align-items: flex-start;
        padding: 20px;
        background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
        border-bottom: 1px solid #fee2e2;
      }

      .error-icon {
        font-size: 32px;
        margin-right: 16px;
        flex-shrink: 0;
      }

      .error-title-section {
        flex: 1;
      }

      .error-title-section h3 {
        margin: 0 0 8px 0;
        color: #dc2626;
        font-size: 20px;
        font-weight: 600;
      }

      .error-description {
        margin: 0 0 12px 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }

      .transient-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 6px;
        font-size: 13px;
        color: #1d4ed8;
      }

      .error-actions-header {
        display: flex;
        gap: 8px;
      }

      .btn-icon {
        padding: 8px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
      }

      .btn-icon:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .error-details-section {
        padding: 16px 20px;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      .error-detail-item {
        margin-bottom: 8px;
        font-size: 14px;
        color: #374151;
      }

      .error-detail-item strong {
        color: #111827;
        margin-right: 8px;
      }

      .quick-fixes-section,
      .troubleshooting-steps-section,
      .fallback-options-section {
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .quick-fixes-section h4,
      .troubleshooting-steps-section h4,
      .fallback-options-section h4 {
        margin: 0 0 8px 0;
        color: #111827;
        font-size: 16px;
        font-weight: 600;
      }

      .section-description {
        margin: 0 0 16px 0;
        color: #6b7280;
        font-size: 14px;
      }

      .quick-fixes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 12px;
      }

      .quick-fix-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: white;
      }

      .quick-fix-item.low {
        border-left: 4px solid #10b981;
      }

      .quick-fix-item.medium {
        border-left: 4px solid #f59e0b;
      }

      .quick-fix-item.high {
        border-left: 4px solid #ef4444;
      }

      .quick-fix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .quick-fix-title {
        font-weight: 600;
        color: #111827;
      }

      .quick-fix-time {
        font-size: 12px;
        color: #6b7280;
      }

      .quick-fix-description {
        margin-bottom: 12px;
        font-size: 14px;
        color: #374151;
        line-height: 1.4;
      }

      .btn-quick-fix {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-quick-fix.low {
        background: #10b981;
        color: white;
      }

      .btn-quick-fix.medium {
        background: #f59e0b;
        color: white;
      }

      .btn-quick-fix.high {
        background: #ef4444;
        color: white;
      }

      .btn-quick-fix:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .btn-quick-fix.success {
        background: #059669 !important;
      }

      .troubleshooting-steps {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .troubleshooting-step {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        overflow: hidden;
      }

      .step-header {
        display: flex;
        align-items: center;
        padding: 16px;
        background: #f9fafb;
      }

      .step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #3b82f6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        margin-right: 16px;
        flex-shrink: 0;
      }

      .step-info {
        flex: 1;
      }

      .step-title {
        font-weight: 600;
        color: #111827;
        margin-bottom: 4px;
      }

      .step-description {
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .step-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
      }

      .step-time {
        color: #6b7280;
      }

      .step-automated {
        color: #059669;
        font-weight: 500;
      }

      .step-manual {
        color: #d97706;
        font-weight: 500;
      }

      .step-actions {
        display: flex;
        gap: 8px;
      }

      .btn-step-execute,
      .btn-step-toggle {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .btn-step-execute {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .btn-step-execute:hover {
        background: #2563eb;
      }

      .btn-step-execute.success {
        background: #059669;
        border-color: #059669;
      }

      .step-content {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }

      .step-actions-list h5,
      .step-command h5 {
        margin: 0 0 8px 0;
        color: #111827;
        font-size: 14px;
        font-weight: 600;
      }

      .step-actions-list ul {
        margin: 0;
        padding-left: 20px;
      }

      .step-actions-list li {
        margin-bottom: 4px;
        color: #374151;
        font-size: 14px;
      }

      .step-command {
        margin-top: 16px;
      }

      .step-command code {
        display: block;
        background: #1f2937;
        color: #f9fafb;
        padding: 12px;
        border-radius: 6px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px;
        margin: 8px 0;
        overflow-x: auto;
      }

      .btn-copy-command {
        padding: 4px 8px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .step-result {
        margin-top: 16px;
        padding: 12px;
        border-radius: 6px;
      }

      .step-result-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }

      .step-result-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
      }

      .result-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-weight: 600;
      }

      .result-details pre {
        background: rgba(0, 0, 0, 0.05);
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        margin: 0;
        overflow-x: auto;
      }

      .fallback-options {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .fallback-option {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: white;
      }

      .fallback-option.recommended {
        border-left: 4px solid #10b981;
        background: linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%);
      }

      .fallback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .fallback-title {
        font-weight: 600;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .recommended-badge {
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .fallback-time {
        font-size: 12px;
        color: #6b7280;
      }

      .fallback-description,
      .fallback-impact {
        margin-bottom: 12px;
        font-size: 14px;
        color: #374151;
        line-height: 1.4;
      }

      .fallback-steps {
        margin-bottom: 16px;
        font-size: 14px;
        color: #374151;
      }

      .fallback-steps ol {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      .fallback-steps li {
        margin-bottom: 4px;
      }

      .btn-fallback {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-fallback.recommended {
        background: #10b981;
        color: white;
        border-color: #10b981;
      }

      .btn-fallback:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .btn-fallback.success {
        background: #059669 !important;
        border-color: #059669 !important;
      }

      .error-recovery-actions {
        padding: 20px;
        background: #f9fafb;
      }

      .primary-actions,
      .secondary-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .secondary-actions {
        margin-bottom: 0;
      }

      .btn-primary,
      .btn-secondary,
      .btn-danger {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-secondary {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
      }

      .btn-danger {
        background: #ef4444;
        color: white;
      }

      .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
      }

      .btn-secondary:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .btn-danger:hover {
        background: #dc2626;
        transform: translateY(-1px);
      }

      .auto-retry-notification {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border: 1px solid #93c5fd;
        border-radius: 8px;
        margin: 16px 20px;
        overflow: hidden;
      }

      .auto-retry-content {
        display: flex;
        align-items: center;
        padding: 16px;
      }

      .auto-retry-icon {
        font-size: 24px;
        margin-right: 12px;
      }

      .auto-retry-text {
        flex: 1;
      }

      .auto-retry-title {
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 4px;
      }

      .auto-retry-description {
        color: #1e40af;
        font-size: 14px;
      }

      .auto-retry-actions {
        display: flex;
        gap: 8px;
      }

      .btn-auto-retry,
      .btn-auto-retry-dismiss {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
      }

      .btn-auto-retry {
        background: #3b82f6;
        color: white;
      }

      .btn-auto-retry-dismiss {
        background: white;
        color: #6b7280;
        border: 1px solid #d1d5db;
      }

      .auto-retry-countdown {
        padding: 12px 16px;
        background: rgba(59, 130, 246, 0.1);
        border-top: 1px solid #93c5fd;
      }

      .countdown-text {
        font-size: 12px;
        color: #1e40af;
        margin-bottom: 8px;
        text-align: center;
      }

      .countdown-bar {
        height: 4px;
        background: rgba(59, 130, 246, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .countdown-progress {
        height: 100%;
        background: #3b82f6;
        transition: width 1s linear;
        width: 0%;
      }

      .diagnostic-export-dialog-overlay,
      .system-check-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .diagnostic-export-dialog,
      .system-check-dialog {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .dialog-header h3 {
        margin: 0;
        color: #111827;
        font-size: 18px;
      }

      .overall-status {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .overall-status.healthy {
        background: #d1fae5;
        color: #065f46;
      }

      .overall-status.warning {
        background: #fef3c7;
        color: #92400e;
      }

      .overall-status.error {
        background: #fee2e2;
        color: #991b1b;
      }

      .dialog-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
        padding: 4px;
      }

      .dialog-content {
        padding: 20px;
      }

      .export-info,
      .system-checks {
        margin-bottom: 20px;
      }

      .export-detail {
        margin-bottom: 8px;
        font-size: 14px;
        color: #374151;
      }

      .export-detail strong {
        color: #111827;
        margin-right: 8px;
      }

      .export-description {
        margin-bottom: 20px;
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .export-actions {
        display: flex;
        gap: 12px;
      }

      .system-check-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        background: white;
      }

      .system-check-item.healthy {
        border-left: 4px solid #10b981;
      }

      .system-check-item.warning {
        border-left: 4px solid #f59e0b;
      }

      .system-check-item.error {
        border-left: 4px solid #ef4444;
      }

      .check-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .check-icon {
        font-size: 18px;
      }

      .check-name {
        flex: 1;
        font-weight: 600;
        color: #111827;
      }

      .check-status {
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .system-check-item.healthy .check-status {
        background: #d1fae5;
        color: #065f46;
      }

      .system-check-item.warning .check-status {
        background: #fef3c7;
        color: #92400e;
      }

      .system-check-item.error .check-status {
        background: #fee2e2;
        color: #991b1b;
      }

      .check-message {
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .check-details {
        background: #f9fafb;
        border-radius: 6px;
        padding: 12px;
        margin-top: 8px;
      }

      .check-details pre {
        margin: 0;
        font-size: 12px;
        color: #374151;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .spinner-small {
        width: 16px;
        height: 16px;
        border: 2px solid #f3f4f6;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .enhanced-error-header {
          flex-direction: column;
          align-items: stretch;
        }

        .error-actions-header {
          margin-top: 16px;
          justify-content: flex-end;
        }

        .quick-fixes-grid {
          grid-template-columns: 1fr;
        }

        .step-header {
          flex-direction: column;
          align-items: stretch;
        }

        .step-actions {
          margin-top: 12px;
          justify-content: flex-start;
        }

        .primary-actions,
        .secondary-actions {
          flex-direction: column;
        }

        .diagnostic-export-dialog,
        .system-check-dialog {
          width: 95%;
          margin: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Create and export enhanced troubleshooting instance
export const enhancedTroubleshooting = new EnhancedTroubleshooting();

// Make it globally available
window.enhancedTroubleshooting = enhancedTroubleshooting;