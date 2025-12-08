/**
 * Wizard Integration Helper for Dashboard
 * 
 * This module provides helper functions for the dashboard to interact
 * with the wizard, including auto-starting the wizard if needed.
 */

const WIZARD_URL = 'http://localhost:3000';

/**
 * Ensure wizard is running, start it if needed
 * @returns {Promise<boolean>} True if wizard is running, false otherwise
 */
async function ensureWizardRunning() {
  try {
    // Try to ping wizard
    const response = await fetch(`${WIZARD_URL}/api/wizard/health`, {
      method: 'GET',
      timeout: 2000
    });
    
    if (response.ok) {
      console.log('Wizard is already running');
      return true;
    }
  } catch (error) {
    console.log('Wizard is not running, attempting to start...');
  }
  
  // Wizard is not running, try to start it
  try {
    // Call backend to start wizard
    const response = await fetch('/api/wizard/start', {
      method: 'POST'
    });
    
    if (response.ok) {
      // Wait for wizard to be ready
      return await waitForWizard(10000); // Wait up to 10 seconds
    }
  } catch (error) {
    console.error('Failed to start wizard:', error);
  }
  
  return false;
}

/**
 * Wait for wizard to become available
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if wizard becomes available
 */
async function waitForWizard(timeout = 10000) {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${WIZARD_URL}/api/wizard/health`, {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('Wizard is now ready');
        return true;
      }
    } catch (error) {
      // Wizard not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.error('Wizard did not become available within timeout');
  return false;
}

/**
 * Launch wizard in reconfiguration mode
 * @returns {Promise<void>}
 */
async function launchReconfiguration() {
  // Ensure wizard is running
  const isRunning = await ensureWizardRunning();
  
  if (!isRunning) {
    alert('Failed to start wizard. Please start it manually:\ncd services/wizard/backend && node src/server.js');
    return;
  }
  
  try {
    // Generate reconfigure link
    const response = await fetch(`${WIZARD_URL}/api/wizard/reconfigure-link`);
    const data = await response.json();
    
    if (data.success) {
      // Open wizard in new tab
      window.open(data.url, '_blank');
    } else {
      alert(`Failed to generate reconfigure link: ${data.error}`);
    }
  } catch (error) {
    console.error('Error launching reconfiguration:', error);
    alert('Failed to launch wizard. Please check if wizard is running.');
  }
}

/**
 * Launch wizard in update mode
 * @param {Array} updates - Array of available updates
 * @returns {Promise<void>}
 */
async function launchUpdates(updates) {
  // Ensure wizard is running
  const isRunning = await ensureWizardRunning();
  
  if (!isRunning) {
    alert('Failed to start wizard. Please start it manually:\ncd services/wizard/backend && node src/server.js');
    return;
  }
  
  try {
    // Generate update link
    const response = await fetch(
      `${WIZARD_URL}/api/wizard/update-link?updates=${encodeURIComponent(JSON.stringify(updates))}`
    );
    const data = await response.json();
    
    if (data.success) {
      // Open wizard in new tab
      window.open(data.url, '_blank');
    } else {
      alert(`Failed to generate update link: ${data.error}`);
    }
  } catch (error) {
    console.error('Error launching updates:', error);
    alert('Failed to launch wizard. Please check if wizard is running.');
  }
}

/**
 * Check wizard status
 * @returns {Promise<Object|null>} Wizard status or null if not available
 */
async function checkWizardStatus() {
  try {
    const response = await fetch(`${WIZARD_URL}/api/wizard/health`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Wizard is not available');
  }
  return null;
}

/**
 * Sync service status with wizard
 * @param {Array} services - Current service status from dashboard
 * @returns {Promise<Object|null>} Wizard response or null if failed
 */
async function syncStatus(services) {
  try {
    const response = await fetch(`${WIZARD_URL}/api/wizard/sync-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'dashboard',
        services
      })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Failed to sync status with wizard:', error);
  }
  return null;
}

// Export functions for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ensureWizardRunning,
    waitForWizard,
    launchReconfiguration,
    launchUpdates,
    checkWizardStatus,
    syncStatus
  };
}
