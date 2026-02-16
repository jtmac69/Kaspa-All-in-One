/**
 * Review Module
 * Displays configuration summary before installation
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Profile resource requirements
 * Maps profile IDs to their resource needs
 * Supports both new and legacy profile IDs
 */
const PROFILE_RESOURCES = {
    // New profile IDs
    'kaspa-node': { cpu: 2, ram: 4, disk: 100 },
    'kasia-app': { cpu: 1, ram: 1, disk: 10 },
    'k-social-app': { cpu: 1, ram: 1, disk: 10 },
    'kaspa-explorer-bundle': { cpu: 4, ram: 8, disk: 500 },
    'kasia-indexer': { cpu: 2, ram: 4, disk: 200 },
    'k-indexer-bundle': { cpu: 4, ram: 6, disk: 300 },
    'kaspa-archive-node': { cpu: 8, ram: 12, disk: 1000 },
    'kaspa-stratum': { cpu: 2, ram: 2, disk: 50 },
    
    // Legacy profile IDs (for backward compatibility)
    'core': { cpu: 2, ram: 4, disk: 100 },
    'kaspa-user-applications': { cpu: 2, ram: 4, disk: 50 },
    'indexer-services': { cpu: 4, ram: 8, disk: 500 },
    'archive-node': { cpu: 8, ram: 16, disk: 1000 },
    'mining': { cpu: 2, ram: 2, disk: 10 }
};

/**
 * Get profile display name using helper from wizard-refactored.js
 * Falls back to profile ID if helper not available
 */
function getProfileName(profileId) {
    if (typeof window.getProfileDisplayName === 'function') {
        return window.getProfileDisplayName(profileId);
    }
    // Fallback if helper not loaded
    return profileId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Get profile icon using helper from wizard-refactored.js
 * Falls back to generic icon if helper not available
 */
function getProfileIcon(profileId) {
    if (typeof window.getProfileStatusIcon === 'function') {
        return window.getProfileStatusIcon({ id: profileId });
    }
    // Fallback if helper not loaded
    return '⚙️';
}

/**
 * Get profile category using helper from wizard-refactored.js
 * Falls back to 'other' if helper not available
 */
function getProfileCategoryName(profileId) {
    if (typeof window.getProfileCategory === 'function') {
        return window.getProfileCategory(profileId);
    }
    // Fallback if helper not loaded
    return 'other';
}

/**
 * Display configuration summary
 */
export function displayConfigurationSummary() {
    console.log('Displaying configuration summary');
    console.log('State manager:', stateManager);
    
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    const configuration = stateManager.get('configuration') || {};
    
    console.log('Selected profiles from state:', selectedProfiles);
    console.log('Configuration from state:', configuration);
    
    if (selectedProfiles.length === 0) {
        console.warn('No profiles selected');
        showNotification('No profiles selected. Please go back and select at least one profile.', 'warning');
        
        // Still try to display empty state
        const profilesElement = document.getElementById('review-profiles');
        const serviceCountElement = document.getElementById('review-service-count');
        if (profilesElement) profilesElement.textContent = 'None selected';
        if (serviceCountElement) serviceCountElement.textContent = '0 services';
        
        return;
    }
    
    // Display selected profiles
    displaySelectedProfiles(selectedProfiles);
    
    // Display resource requirements
    displayResourceRequirements(selectedProfiles);
    
    // Display configuration (profile-specific)
    displayConfiguration(selectedProfiles, configuration);
    
    // Display wallet configuration
    displayWalletConfiguration(configuration);
    
    // Add edit buttons
    addEditButtons();
    
    console.log('Configuration summary displayed');
}

/**
 * Display selected profiles
 */
function displaySelectedProfiles(selectedProfiles) {
    const profilesElement = document.getElementById('review-profiles');
    const serviceCountElement = document.getElementById('review-service-count');
    
    if (!profilesElement || !serviceCountElement) {
        console.error('Profile display elements not found');
        return;
    }
    
    // Clear existing content
    profilesElement.innerHTML = '';
    
    // Create detailed profile display
    if (selectedProfiles.length === 0) {
        profilesElement.textContent = 'None selected';
        serviceCountElement.textContent = '0 services';
        return;
    }
    
    // Display each profile with details
    selectedProfiles.forEach((profileId, index) => {
        // Use helper functions to get profile information
        const profileName = getProfileName(profileId);
        const profileIcon = getProfileIcon(profileId);
        const profileCategory = getProfileCategoryName(profileId);
        const resources = PROFILE_RESOURCES[profileId];
        
        if (!resources) {
            console.warn(`Resources not found for profile: ${profileId}`);
            return;
        }
        
        // Create profile card
        const profileCard = document.createElement('div');
        profileCard.className = 'review-profile-card';
        profileCard.setAttribute('data-profile-id', profileId);
        profileCard.setAttribute('data-category', profileCategory);
        
        // Profile header with icon and name
        const profileHeader = document.createElement('div');
        profileHeader.className = 'review-profile-header';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'profile-icon';
        iconSpan.textContent = profileIcon;
        profileHeader.appendChild(iconSpan);
        
        const profileNameElement = document.createElement('strong');
        profileNameElement.textContent = profileName;
        profileHeader.appendChild(profileNameElement);
        
        profileCard.appendChild(profileHeader);
        
        // Profile resources
        const profileResources = document.createElement('div');
        profileResources.className = 'review-profile-resources';
        profileResources.innerHTML = `
            <span class="resource-item">💾 ${resources.ram} GB RAM</span>
            <span class="resource-item">💿 ${resources.disk} GB Disk</span>
            <span class="resource-item">⚙️ ${resources.cpu} CPU cores</span>
        `;
        profileCard.appendChild(profileResources);
        
        profilesElement.appendChild(profileCard);
        
        // Add separator between profiles (except for last one)
        if (index < selectedProfiles.length - 1) {
            const separator = document.createElement('div');
            separator.className = 'review-profile-separator';
            profilesElement.appendChild(separator);
        }
    });
    
    // Calculate service count (simplified - just use profile count as proxy)
    const serviceCount = selectedProfiles.length;
    serviceCountElement.textContent = `${serviceCount} profile${serviceCount !== 1 ? 's' : ''}`;
}

/**
 * Display resource requirements
 */
function displayResourceRequirements(selectedProfiles) {
    const cpuElement = document.getElementById('review-cpu');
    const ramElement = document.getElementById('review-ram');
    const diskElement = document.getElementById('review-disk');
    
    if (!cpuElement || !ramElement || !diskElement) {
        console.error('Resource display elements not found');
        return;
    }
    
    // Calculate combined resource requirements
    let totalCPU = 0;
    let totalRAM = 0;
    let totalDisk = 0;
    
    selectedProfiles.forEach(profileId => {
        const resources = PROFILE_RESOURCES[profileId];
        if (resources) {
            // Use max for CPU and RAM (concurrent usage)
            totalCPU = Math.max(totalCPU, resources.cpu);
            totalRAM = Math.max(totalRAM, resources.ram);
            // Use max for disk (largest single profile requirement)
            totalDisk = Math.max(totalDisk, resources.disk);
        }
    });
    
    // Display requirements
    cpuElement.textContent = `${totalCPU} core${totalCPU !== 1 ? 's' : ''}`;
    ramElement.textContent = `${totalRAM} GB`;
    diskElement.textContent = `${totalDisk} GB`;
}

/**
 * Display configuration based on selected profiles
 */
function displayConfiguration(selectedProfiles, configuration) {
    console.log('Displaying configuration for profiles:', selectedProfiles, configuration);
    
    // Determine which configuration fields to show based on profile categories
    const profileCategories = selectedProfiles.map(id => getProfileCategoryName(id));
    
    // Network config needed for node and mining profiles
    const hasNetworkConfig = profileCategories.some(cat => 
        ['node', 'mining'].includes(cat)
    );
    
    // Indexer endpoints needed for app profiles
    const hasIndexerEndpoints = profileCategories.includes('app');
    
    // Get the network configuration section
    const networkSection = document.querySelector('.review-section:has(#review-external-ip)');
    
    if (hasNetworkConfig) {
        // Show network configuration for profiles that need it
        if (networkSection) {
            networkSection.style.display = 'block';
        }
        displayNetworkConfiguration(configuration);
    } else if (hasIndexerEndpoints) {
        // Show indexer endpoints for app profiles
        if (networkSection) {
            // Replace network configuration with indexer endpoints
            const titleElement = networkSection.querySelector('.review-section-title');
            const contentElement = networkSection.querySelector('.review-content');
            
            if (titleElement) {
                titleElement.textContent = 'Indexer Endpoints';
            }
            
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="review-item">
                        <span class="review-label">Kasia Indexer URL:</span>
                        <span class="review-value">${configuration.REMOTE_KASIA_INDEXER_URL || 'https://api.kasia.io/'}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">K-Social Indexer URL:</span>
                        <span class="review-value">${configuration.REMOTE_KSOCIAL_INDEXER_URL || 'https://indexer0.kaspatalk.net/'}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Kaspa Node WebSocket URL:</span>
                        <span class="review-value">${configuration.REMOTE_KASPA_NODE_WBORSH_URL || 'wss://api.kasia.io/ws'}</span>
                    </div>
                `;
            }
            
            networkSection.style.display = 'block';
        }
    } else {
        // Hide network configuration section if not needed
        if (networkSection) {
            networkSection.style.display = 'none';
        }
    }
}

/**
 * Display network configuration (for profiles that need it)
 */
function displayNetworkConfiguration(configuration) {
    const externalIpElement = document.getElementById('review-external-ip');
    const publicNodeElement = document.getElementById('review-public-node');
    
    if (!externalIpElement || !publicNodeElement) {
        console.error('Network configuration display elements not found');
        return;
    }
    
    console.log('Displaying network configuration:', configuration);
    
    // Display external IP
    const externalIp = configuration.externalIp || configuration.EXTERNAL_IP;
    if (externalIp && externalIp.trim() !== '') {
        externalIpElement.textContent = externalIp;
    } else {
        externalIpElement.textContent = 'Auto-detect';
    }
    
    // Display public node status
    const publicNode = configuration.publicNode || configuration.PUBLIC_NODE;
    if (publicNode === true || publicNode === 'true' || publicNode === 'yes') {
        publicNodeElement.textContent = 'Enabled';
    } else {
        publicNodeElement.textContent = 'Disabled';
    }
}

/**
 * Display wallet configuration in review
 * @param {Object} configuration - Configuration object
 */
function displayWalletConfiguration(configuration) {
    const walletEnabled = configuration.WALLET_CONNECTIVITY_ENABLED === true || configuration.WALLET_CONNECTIVITY_ENABLED === 'true';
    const miningAddress = configuration.MINING_ADDRESS;
    
    // Find or create wallet review section
    let walletSection = document.getElementById('review-wallet-section');
    if (!walletSection) {
        // Create wallet section
        walletSection = document.createElement('div');
        walletSection.id = 'review-wallet-section';
        walletSection.className = 'review-section';
        
        // Insert after network configuration section
        const networkSection = document.querySelector('.review-section:has(#review-network)') ||
                              document.querySelector('.review-section');
        if (networkSection && networkSection.parentNode) {
            networkSection.parentNode.insertBefore(walletSection, networkSection.nextSibling);
        } else {
            const reviewContent = document.querySelector('.review-content') ||
                                document.getElementById('review-step');
            if (reviewContent) {
                reviewContent.appendChild(walletSection);
            }
        }
    }
    
    // Build wallet section content
    if (walletEnabled) {
        const maskedAddress = miningAddress 
            ? `${miningAddress.substring(0, 15)}...${miningAddress.substring(miningAddress.length - 8)}` 
            : 'Not set';
        
        walletSection.innerHTML = `
            <h4 class="review-section-title">
                <span class="section-icon">🔐</span>
                Wallet Configuration
            </h4>
            <div class="review-section-content">
                <div class="review-item">
                    <span class="review-label">Wallet Connectivity</span>
                    <span class="review-value status-enabled">
                        <span class="status-indicator">✓</span> Enabled
                    </span>
                </div>
                <div class="review-item">
                    <span class="review-label">Mining Address</span>
                    <span class="review-value" style="font-family: var(--font-code); font-size: 0.875rem;">
                        ${maskedAddress}
                    </span>
                </div>
                <div class="review-item">
                    <span class="review-label">wRPC Ports</span>
                    <span class="review-value">
                        Borsh: ${configuration.KASPA_NODE_WRPC_BORSH_PORT || 17110}, 
                        JSON: ${configuration.KASPA_NODE_WRPC_JSON_PORT || 18110}
                    </span>
                </div>
            </div>
            <div class="review-note" style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(112, 199, 186, 0.1); border-radius: 6px; font-size: 0.875rem;">
                <strong>Security Note:</strong> Your seed phrase was generated locally and was never transmitted. Make sure you have saved your backup securely.
            </div>
        `;
    } else {
        walletSection.innerHTML = `
            <h4 class="review-section-title">
                <span class="section-icon">🔐</span>
                Wallet Configuration
            </h4>
            <div class="review-section-content">
                <div class="review-item">
                    <span class="review-label">Wallet Connectivity</span>
                    <span class="review-value status-disabled">
                        <span class="status-indicator">○</span> Disabled
                    </span>
                </div>
            </div>
        `;
    }
}

/**
 * Validate configuration before proceeding
 */
export function validateBeforeInstallation() {
    const selectedProfiles = stateManager.get('selectedProfiles') || [];
    
    if (selectedProfiles.length === 0) {
        showNotification('Please select at least one profile before proceeding', 'error');
        return false;
    }
    
    return true;
}

/**
 * Add edit buttons to review sections
 */
function addEditButtons() {
    // Get all review sections
    const reviewSections = document.querySelectorAll('.review-section');
    
    if (reviewSections.length === 0) {
        console.warn('No review sections found');
        return;
    }
    
    // Add edit button to each section (except warning section)
    reviewSections.forEach((section, index) => {
        // Skip warning section
        if (section.classList.contains('warning')) {
            return;
        }
        
        // Check if edit button already exists
        if (section.querySelector('.review-edit-btn')) {
            return;
        }
        
        // Get section title to determine which step to navigate to
        const titleElement = section.querySelector('.review-section-title');
        if (!titleElement) {
            return;
        }
        
        const title = titleElement.textContent.trim();
        
        // Determine target step based on section title
        let targetStep = null;
        let buttonText = 'Edit';
        
        if (title.includes('Profile')) {
            targetStep = 'profiles';
            buttonText = 'Edit Profiles';
        } else if (title.includes('Network Configuration') || title.includes('Indexer Endpoints')) {
            targetStep = 'configure';
            buttonText = 'Edit Configuration';
        }
        // Resource Requirements section doesn't get an edit button
        // as it's calculated from selected profiles
        
        // Only add button if we have a target step
        if (targetStep) {
            // Create edit button
            const editButton = document.createElement('button');
            editButton.className = 'review-edit-btn';
            editButton.textContent = buttonText;
            editButton.setAttribute('data-target-step', targetStep);
            editButton.onclick = () => navigateToStep(targetStep);
            
            // Insert button after title
            titleElement.parentNode.insertBefore(editButton, titleElement.nextSibling);
        }
    });
}

/**
 * Navigate to a specific step
 */
function navigateToStep(stepId) {
    console.log(`Navigating to step: ${stepId}`);
    
    // Import navigation module dynamically to avoid circular dependencies
    import('./navigation.js').then(module => {
        if (module.goToStep && module.getStepNumber) {
            const stepNumber = module.getStepNumber(stepId);
            if (stepNumber > 0) {
                module.goToStep(stepNumber);
            } else {
                console.error('Invalid step ID:', stepId);
                showNotification('Unable to navigate to step', 'error');
            }
        } else {
            console.error('Required functions not found in navigation module');
            showNotification('Unable to navigate to step', 'error');
        }
    }).catch(error => {
        console.error('Error loading navigation module:', error);
        showNotification('Unable to navigate to step', 'error');
    });
}

