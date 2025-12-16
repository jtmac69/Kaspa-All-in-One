/**
 * Review Module
 * Displays configuration summary before installation
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Profile definitions with resource requirements
 * These match the profile IDs in the HTML (data-profile attributes)
 */
const PROFILE_DEFINITIONS = {
    'core': {
        name: 'Core Profile',
        description: 'Kaspa node (public/private) with optional wallet',
        services: ['kaspa-node', 'wallet'],
        resources: {
            cpu: '2 cores',
            ram: '4 GB',
            disk: '100 GB'
        }
    },
    'kaspa-user-applications': {
        name: 'Kaspa User Applications',
        description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
        services: [
            { name: 'Kasia app', port: 3001 },
            { name: 'K-Social app', port: 3003 },
            { name: 'Kaspa Explorer', port: 3004 }
        ],
        resources: {
            cpu: '2 cores',
            ram: '4 GB',
            disk: '50 GB'
        }
    },
    'indexer-services': {
        name: 'Indexer Services',
        description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa) with dedicated databases',
        services: ['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
        resources: {
            cpu: '4 cores',
            ram: '8 GB',
            disk: '500 GB'
        }
    },
    'archive-node': {
        name: 'Archive Node Profile',
        description: 'Non-pruning Kaspa node for complete blockchain history',
        services: ['kaspa-archive-node'],
        resources: {
            cpu: '8 cores',
            ram: '16 GB',
            disk: '1000 GB'
        }
    },
    'mining': {
        name: 'Mining Profile',
        description: 'Local mining stratum pointed to local Kaspa node',
        services: ['kaspa-stratum'],
        resources: {
            cpu: '2 cores',
            ram: '2 GB',
            disk: '10 GB'
        }
    }
};

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
        const profile = PROFILE_DEFINITIONS[profileId];
        if (!profile) {
            console.warn(`Profile not found: ${profileId}`);
            return;
        }
        
        // Create profile card
        const profileCard = document.createElement('div');
        profileCard.className = 'review-profile-card';
        
        // Profile header
        const profileHeader = document.createElement('div');
        profileHeader.className = 'review-profile-header';
        
        const profileName = document.createElement('strong');
        profileName.textContent = profile.name;
        profileHeader.appendChild(profileName);
        
        profileCard.appendChild(profileHeader);
        
        // Profile description
        const profileDesc = document.createElement('div');
        profileDesc.className = 'review-profile-description';
        profileDesc.textContent = profile.description;
        profileCard.appendChild(profileDesc);
        
        // Profile services
        const profileServices = document.createElement('div');
        profileServices.className = 'review-profile-services';
        
        // Handle both old format (string array) and new format (object array with ports)
        let servicesText = 'Services: ';
        if (profile.services && profile.services.length > 0) {
            if (typeof profile.services[0] === 'string') {
                // Old format: array of strings
                servicesText += profile.services.join(', ');
            } else {
                // New format: array of objects with name and port
                servicesText += profile.services
                    .map(service => `${service.name} (port ${service.port})`)
                    .join(', ');
            }
        }
        profileServices.textContent = servicesText;
        profileCard.appendChild(profileServices);
        
        // Profile resources
        const profileResources = document.createElement('div');
        profileResources.className = 'review-profile-resources';
        profileResources.innerHTML = `
            <span class="resource-item">CPU: ${profile.resources.cpu}</span>
            <span class="resource-item">RAM: ${profile.resources.ram}</span>
            <span class="resource-item">Disk: ${profile.resources.disk}</span>
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
    
    // Calculate total unique services
    const allServices = new Set();
    selectedProfiles.forEach(profileId => {
        const profile = PROFILE_DEFINITIONS[profileId];
        if (profile && profile.services) {
            profile.services.forEach(service => {
                // Handle both string and object formats
                const serviceName = typeof service === 'string' ? service : service.name;
                allServices.add(serviceName);
            });
        }
    });
    
    const serviceCount = allServices.size;
    serviceCountElement.textContent = `${serviceCount} service${serviceCount !== 1 ? 's' : ''}`;
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
        const profile = PROFILE_DEFINITIONS[profileId];
        if (profile && profile.resources) {
            // Parse CPU (e.g., "4 cores" -> 4)
            const cpuMatch = profile.resources.cpu.match(/(\d+)/);
            if (cpuMatch) {
                totalCPU = Math.max(totalCPU, parseInt(cpuMatch[1]));
            }
            
            // Parse RAM (e.g., "16 GB" -> 16)
            const ramMatch = profile.resources.ram.match(/(\d+)/);
            if (ramMatch) {
                totalRAM = Math.max(totalRAM, parseInt(ramMatch[1]));
            }
            
            // Parse Disk (e.g., "150 GB" -> 150)
            const diskMatch = profile.resources.disk.match(/(\d+)/);
            if (diskMatch) {
                totalDisk = Math.max(totalDisk, parseInt(diskMatch[1]));
            }
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
    
    // Determine which configuration fields to show based on selected profiles
    // indexer-services don't need network config - they connect TO nodes, not serve as public nodes
    const hasNetworkConfig = selectedProfiles.some(profileId => 
        ['core', 'archive-node', 'mining'].includes(profileId)
    );
    
    const hasIndexerEndpoints = selectedProfiles.includes('kaspa-user-applications');
    
    // Get the network configuration section
    const networkSection = document.querySelector('.review-section:has(#review-external-ip)');
    
    if (hasNetworkConfig) {
        // Show network configuration for profiles that need it
        if (networkSection) {
            networkSection.style.display = 'block';
        }
        displayNetworkConfiguration(configuration);
    } else if (hasIndexerEndpoints) {
        // Show indexer endpoints for kaspa-user-applications profile
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
                        <span class="review-value">${configuration.REMOTE_KSOCIAL_INDEXER_URL || 'https://indexer.kaspatalk.net/'}</span>
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

