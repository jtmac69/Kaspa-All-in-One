/**
 * Safety Confirmation System
 * Handles safety warnings, confirmations, and risk assessment in the wizard
 */

class SafetySystem {
  constructor() {
    this.currentConfirmation = null;
    this.confirmationCallback = null;
    this.failureCount = 0;
    this.safeModeOffered = false;
  }

  /**
   * Assess risk for profile selection
   */
  async assessProfileRisk(profile, systemResources) {
    try {
      const response = await fetch('/api/safety/assess-profile-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: profile,
          systemResources: systemResources
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assess profile risk');
      }

      const data = await response.json();
      return data.riskAssessment;
    } catch (error) {
      console.error('Error assessing profile risk:', error);
      return null;
    }
  }

  /**
   * Check if action requires confirmation
   */
  async requiresConfirmation(action, context = {}) {
    try {
      const response = await fetch('/api/safety/check-confirmation-required', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          context: context
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.required;
    } catch (error) {
      console.error('Error checking confirmation requirement:', error);
      return false;
    }
  }

  /**
   * Show confirmation dialog
   */
  async showConfirmation(action, riskAssessment = null) {
    try {
      const response = await fetch('/api/safety/generate-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          riskAssessment: riskAssessment
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate confirmation');
      }

      const data = await response.json();
      const confirmation = data.confirmation;

      if (!confirmation) {
        return true;  // No confirmation needed
      }

      return new Promise((resolve) => {
        this.currentConfirmation = confirmation;
        this.confirmationCallback = resolve;
        this.renderConfirmationDialog(confirmation);
      });
    } catch (error) {
      console.error('Error showing confirmation:', error);
      return true;  // Allow to proceed on error
    }
  }

  /**
   * Render confirmation dialog
   */
  renderConfirmationDialog(confirmation) {
    const modal = document.getElementById('safety-confirmation-modal');
    if (!modal) {
      console.error('Safety confirmation modal not found');
      if (this.confirmationCallback) {
        this.confirmationCallback(true);
      }
      return;
    }

    const modalBody = modal.querySelector('.modal-body');
    
    // Build dialog HTML
    let html = `
      <div class="safety-confirmation ${confirmation.type}">
        <div class="confirmation-header">
          <h3>${confirmation.title}</h3>
        </div>
        
        <div class="confirmation-message">
          <p>${confirmation.message}</p>
        </div>
    `;

    // Add details if present
    if (confirmation.details && confirmation.details.length > 0) {
      html += `
        <div class="confirmation-details">
          <h4>Details:</h4>
          <ul>
            ${confirmation.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Add consequences if present
    if (confirmation.consequences && confirmation.consequences.length > 0) {
      html += `
        <div class="confirmation-consequences">
          <h4>What This Means:</h4>
          <ul>
            ${confirmation.consequences.map(consequence => `<li>${consequence}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Add recommendations if present
    if (confirmation.recommendations && confirmation.recommendations.length > 0) {
      html += `
        <div class="confirmation-recommendations">
          <h4>Recommendations:</h4>
          <ul>
            ${confirmation.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Add checkbox if required
    const proceedAction = confirmation.actions.find(a => a.action === 'proceed');
    if (proceedAction && proceedAction.requiresCheckbox) {
      html += `
        <div class="confirmation-checkbox">
          <label>
            <input type="checkbox" id="safety-acknowledgment-checkbox">
            <span>${proceedAction.checkboxText}</span>
          </label>
        </div>
      `;
    }

    // Add action buttons
    html += `
        <div class="confirmation-actions">
          ${confirmation.actions.map(action => `
            <button 
              class="btn-${action.style} ${action.requiresCheckbox ? 'requires-checkbox' : ''}" 
              data-action="${action.action}"
              ${action.requiresCheckbox ? 'disabled' : ''}
            >
              ${action.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    modalBody.innerHTML = html;

    // Add event listeners
    const buttons = modalBody.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        this.handleConfirmationAction(action);
      });
    });

    // Add checkbox listener if present
    const checkbox = document.getElementById('safety-acknowledgment-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const proceedButton = modalBody.querySelector('button.requires-checkbox');
        if (proceedButton) {
          proceedButton.disabled = !checkbox.checked;
        }
      });
    }

    // Show modal
    modal.style.display = 'flex';
  }

  /**
   * Handle confirmation action
   */
  handleConfirmationAction(action) {
    const modal = document.getElementById('safety-confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }

    if (this.confirmationCallback) {
      const proceed = action === 'proceed' || action === 'safe-mode';
      
      // Record confirmation if acknowledged
      if (proceed && this.currentConfirmation) {
        this.recordConfirmation(this.currentConfirmation.type, true);
      }

      // Handle special actions
      if (action === 'recommendations') {
        this.showRecommendations();
        return;
      } else if (action === 'safe-mode') {
        this.enableSafeMode();
      } else if (action === 'help') {
        this.showHelp();
        return;
      }

      this.confirmationCallback(proceed);
      this.confirmationCallback = null;
    }

    this.currentConfirmation = null;
  }

  /**
   * Record confirmation acknowledgment
   */
  async recordConfirmation(action, acknowledged) {
    try {
      await fetch('/api/safety/record-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          userId: this.getUserId(),
          acknowledged: acknowledged
        })
      });
    } catch (error) {
      console.error('Error recording confirmation:', error);
    }
  }

  /**
   * Get user ID (generate if not exists)
   */
  getUserId() {
    let userId = localStorage.getItem('kaspa-wizard-user-id');
    if (!userId) {
      userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('kaspa-wizard-user-id', userId);
    }
    return userId;
  }

  /**
   * Show recommendations
   */
  showRecommendations() {
    if (!this.currentConfirmation) return;

    const recommendations = this.currentConfirmation.recommendations || [];
    if (recommendations.length === 0) return;

    showNotification('Check the recommendations section for guidance', 'info');
    
    // Re-show the confirmation with recommendations highlighted
    setTimeout(() => {
      this.renderConfirmationDialog(this.currentConfirmation);
      
      // Scroll to recommendations
      const recsSection = document.querySelector('.confirmation-recommendations');
      if (recsSection) {
        recsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        recsSection.classList.add('highlighted');
      }
    }, 300);
  }

  /**
   * Enable safe mode
   */
  enableSafeMode() {
    // Set safe mode configuration
    wizardState.safeMode = true;
    wizardState.selectedProfile = 'core';
    wizardState.useRemoteNode = true;
    
    // Save state
    saveWizardState();
    
    showNotification('Safe Mode enabled - using minimal configuration', 'success');
    
    // Proceed with safe mode
    if (this.confirmationCallback) {
      this.confirmationCallback(true);
      this.confirmationCallback = null;
    }
  }

  /**
   * Show help
   */
  showHelp() {
    // Open help modal or redirect to help page
    showNotification('Opening help resources...', 'info');
    
    // For now, just show a simple help dialog
    alert('Help Resources:\n\n' +
          '1. Check the documentation at https://kaspa.org/docs\n' +
          '2. Join our Discord community for support\n' +
          '3. Search for similar issues on GitHub\n' +
          '4. Contact support if you continue to have problems');
  }

  /**
   * Track installation failure
   */
  trackFailure() {
    this.failureCount++;
    localStorage.setItem('kaspa-wizard-failure-count', this.failureCount.toString());
    
    // Offer safe mode after 2 failures
    if (this.failureCount >= 2 && !this.safeModeOffered) {
      this.offerSafeMode();
    }
  }

  /**
   * Offer safe mode after failures
   */
  async offerSafeMode() {
    this.safeModeOffered = true;
    
    try {
      const response = await fetch(`/api/safety/safe-mode-recommendation?failureCount=${this.failureCount}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const recommendation = data.recommendation;
      
      if (recommendation) {
        this.currentConfirmation = recommendation;
        this.renderConfirmationDialog(recommendation);
      }
    } catch (error) {
      console.error('Error offering safe mode:', error);
    }
  }

  /**
   * Reset failure count
   */
  resetFailures() {
    this.failureCount = 0;
    this.safeModeOffered = false;
    localStorage.removeItem('kaspa-wizard-failure-count');
  }

  /**
   * Show resource warning
   */
  showResourceWarning(riskAssessment) {
    if (!riskAssessment || riskAssessment.level === 'low') {
      return;
    }

    const warningContainer = document.getElementById('resource-warning');
    if (!warningContainer) return;

    const { level, risks } = riskAssessment;
    
    let html = `
      <div class="resource-warning ${level}">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <h4>Resource Warning</h4>
          <p>This profile may have issues on your system:</p>
          <ul>
            ${risks.map(risk => `<li>${risk.message}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    warningContainer.innerHTML = html;
    warningContainer.style.display = 'block';
  }

  /**
   * Hide resource warning
   */
  hideResourceWarning() {
    const warningContainer = document.getElementById('resource-warning');
    if (warningContainer) {
      warningContainer.style.display = 'none';
    }
  }

  /**
   * Create configuration backup
   */
  async createBackup() {
    try {
      // Save current configuration to backup
      const backup = {
        timestamp: new Date().toISOString(),
        state: { ...wizardState },
        config: { ...wizardState.configuration }
      };

      localStorage.setItem('kaspa-wizard-backup', JSON.stringify(backup));
      
      showNotification('Configuration backed up', 'success');
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup() {
    try {
      const backupStr = localStorage.getItem('kaspa-wizard-backup');
      if (!backupStr) {
        showNotification('No backup found', 'warning');
        return false;
      }

      const backup = JSON.parse(backupStr);
      
      // Confirm restoration
      const confirmed = confirm('Restore configuration from backup?\n\n' +
                               `Backup from: ${new Date(backup.timestamp).toLocaleString()}`);
      
      if (!confirmed) return false;

      // Restore state
      Object.assign(wizardState, backup.state);
      saveWizardState();
      
      showNotification('Configuration restored from backup', 'success');
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      showNotification('Failed to restore backup', 'error');
      return false;
    }
  }
}

// Global safety system instance
const safety = new SafetySystem();

// Helper functions
async function checkProfileSafety(profile, systemResources) {
  const riskAssessment = await safety.assessProfileRisk(profile, systemResources);
  
  if (riskAssessment && riskAssessment.requiresConfirmation) {
    safety.showResourceWarning(riskAssessment);
    const confirmed = await safety.showConfirmation('profile-selection', riskAssessment);
    return confirmed;
  }
  
  safety.hideResourceWarning();
  return true;
}

async function confirmAction(action, context = {}) {
  const required = await safety.requiresConfirmation(action, context);
  
  if (required) {
    return await safety.showConfirmation(action, context.riskAssessment);
  }
  
  return true;
}

function trackInstallationFailure() {
  safety.trackFailure();
}

function resetInstallationFailures() {
  safety.resetFailures();
}
