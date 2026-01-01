/**
 * Template Selection Module
 * Handles template selection, customization, and application
 */

import { stateManager } from './state-manager.js';
import { goToStep, updateStepNumbering } from './navigation.js';

class TemplateSelection {
    constructor() {
        this.templates = [];
        this.selectedTemplate = null;
        this.currentCategory = 'all';
        this.systemResources = null;
        this.useCase = 'personal';
        
        this.initializeEventListeners();
    }

    /**
     * Initialize the template selection step
     */
    async initialize() {
        try {
            console.log('[TEMPLATE] Initializing template selection');
            
            // Load templates from API
            await this.loadTemplates();
            
            // Get system resources for recommendations
            await this.loadSystemResources();
            
            // Get template recommendations
            await this.loadRecommendations();
            
            // Render templates
            this.renderTemplates();
            
            // Set default method selection to template (recommended)
            this.selectTemplateMethod();
            
            console.log('[TEMPLATE] Template selection initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize template selection:', error);
            this.handleInitializationFailure(error);
        }
    }

    /**
     * Load templates from the API
     */
    async loadTemplates() {
        try {
            console.log('[TEMPLATE] Loading templates from API');
            const response = await fetch('/api/simple-templates/all');
            
            if (!response.ok) {
                // If templates API is not available, use fallback templates
                console.warn('Templates API not available, using fallback templates');
                this.handleTemplateLoadingFailure('Templates API not available', true);
                this.templates = this.getFallbackTemplates();
                return;
            }
            
            const data = await response.json();
            this.templates = data.templates || data || [];
            
            if (this.templates.length === 0) {
                console.warn('No templates returned from API, using fallback');
                this.handleTemplateLoadingFailure('No templates available from server', true);
                this.templates = this.getFallbackTemplates();
            } else {
                console.log(`[TEMPLATE] Successfully loaded ${this.templates.length} templates`);
            }
        } catch (error) {
            console.error('Failed to load templates from API:', error);
            this.handleTemplateLoadingFailure(error.message, true);
            this.templates = this.getFallbackTemplates();
        }
    }

    /**
     * Fallback templates when API is not available
     */
    getFallbackTemplates() {
        return [
            {
                id: 'beginner-setup',
                name: 'Beginner Setup',
                category: 'beginner',
                description: 'Simple setup for new users',
                icon: '🚀',
                profiles: ['kaspa-user-applications'],
                resources: { minMemory: 4, minCpu: 2, minDisk: 50 },
                estimatedSetupTime: '5 minutes',
                syncTime: 'Not required',
                features: ['Easy setup', 'User applications', 'Public indexers'],
                benefits: ['Quick start', 'No complex configuration'],
                longDescription: 'Perfect for users who want to get started quickly with Kaspa applications.',
                useCase: 'personal'
            },
            {
                id: 'full-node',
                name: 'Full Node',
                category: 'advanced',
                description: 'Complete Kaspa node with all services',
                icon: '⚡',
                profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
                resources: { minMemory: 16, minCpu: 4, minDisk: 500 },
                estimatedSetupTime: '15 minutes',
                syncTime: '2-4 hours',
                features: ['Full node', 'Local indexers', 'All applications'],
                benefits: ['Complete control', 'Best performance', 'Full privacy'],
                longDescription: 'Complete Kaspa setup with local node and indexers for maximum performance.',
                useCase: 'advanced'
            }
        ];
    }

    /**
     * Load system resources for recommendations
     */
    async loadSystemResources() {
        try {
            const response = await fetch('/api/system-check/resources');
            
            if (!response.ok) {
                console.warn('System check API not available, using defaults');
                this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
                return;
            }
            
            const data = await response.json();
            
            if (data.resources) {
                this.systemResources = {
                    memory: Math.floor(data.resources.memory.total / (1024 * 1024 * 1024)), // Convert to GB
                    cpu: data.resources.cpu.cores || data.resources.cpu.count || 4,
                    disk: Math.floor(data.resources.disk.available / (1024 * 1024 * 1024)) // Convert to GB
                };
            } else {
                this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
            }
        } catch (error) {
            console.warn('Could not load system resources, using defaults:', error);
            this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
        }
    }

    /**
     * Load template recommendations
     */
    async loadRecommendations() {
        if (!this.systemResources) return;
        
        try {
            const response = await fetch('/api/simple-templates/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    systemResources: this.systemResources,
                    useCase: this.useCase
                })
            });
            
            if (!response.ok) {
                console.warn('Recommendations API not available, using fallback logic');
                this.generateFallbackRecommendations();
                return;
            }
            
            const data = await response.json();
            
            if (data.recommendations) {
                this.recommendations = data.recommendations;
                this.markRecommendedTemplates();
            } else {
                this.generateFallbackRecommendations();
            }
        } catch (error) {
            console.warn('Could not load recommendations, using fallback logic:', error);
            this.generateFallbackRecommendations();
        }
    }

    /**
     * Generate fallback recommendations based on system resources
     */
    generateFallbackRecommendations() {
        if (!this.systemResources || !this.templates) return;
        
        this.recommendations = [];
        
        // Simple recommendation logic
        this.templates.forEach(template => {
            const meetsRequirements = 
                this.systemResources.memory >= template.resources.minMemory &&
                this.systemResources.cpu >= template.resources.minCpu &&
                this.systemResources.disk >= template.resources.minDisk;
            
            if (meetsRequirements) {
                this.recommendations.push({
                    template: template,
                    recommended: true,
                    score: this.calculateRecommendationScore(template),
                    reasons: this.getRecommendationReasons(template)
                });
            }
        });
        
        this.markRecommendedTemplates();
    }

    /**
     * Calculate recommendation score
     */
    calculateRecommendationScore(template) {
        if (!this.systemResources) return 50;
        
        const memoryRatio = this.systemResources.memory / template.resources.minMemory;
        const cpuRatio = this.systemResources.cpu / template.resources.minCpu;
        const diskRatio = this.systemResources.disk / template.resources.minDisk;
        
        return Math.min(100, Math.floor((memoryRatio + cpuRatio + diskRatio) / 3 * 50));
    }

    /**
     * Get recommendation reasons
     */
    getRecommendationReasons(template) {
        const reasons = [];
        
        if (template.category === 'beginner') {
            reasons.push('Easy to set up and configure');
        }
        
        if (template.profiles.includes('kaspa-user-applications')) {
            reasons.push('Includes user-friendly applications');
        }
        
        if (template.profiles.includes('core')) {
            reasons.push('Provides full node capabilities');
        }
        
        return reasons;
    }

    /**
     * Mark recommended templates
     */
    markRecommendedTemplates() {
        if (!this.recommendations) return;
        
        this.templates.forEach(template => {
            const recommendation = this.recommendations.find(r => r.template.id === template.id);
            if (recommendation && recommendation.recommended) {
                template.recommended = true;
                template.recommendationScore = recommendation.score;
                template.recommendationReasons = recommendation.reasons;
            }
        });
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Setup method card clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#template-method-card')) {
                this.selectTemplateMethod();
            } else if (e.target.closest('#custom-method-card')) {
                this.selectCustomMethod();
            }
        });

        // Category tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                this.handleCategoryChange(e.target.dataset.category);
            }
        });

        // Template card clicks
        document.addEventListener('click', (e) => {
            const templateCard = e.target.closest('.template-card');
            if (templateCard) {
                this.handleTemplateSelect(templateCard.dataset.templateId);
            }
        });

        // Template action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('template-btn-primary')) {
                e.stopPropagation();
                const templateCard = e.target.closest('.template-card');
                this.applyTemplate(templateCard.dataset.templateId);
            }
            
            if (e.target.classList.contains('template-btn-secondary')) {
                e.stopPropagation();
                const templateCard = e.target.closest('.template-card');
                this.showTemplateDetails(templateCard.dataset.templateId);
            }
        });

        // Custom template button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'build-custom-btn') {
                this.buildCustomTemplate();
            }
        });

        // Apply template button in modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'apply-template-btn') {
                this.applySelectedTemplate();
            }
        });
    }

    /**
     * Handle category change
     */
    handleCategoryChange(category) {
        this.currentCategory = category;
        
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Re-render templates
        this.renderTemplates();
    }

    /**
     * Handle template selection
     */
    handleTemplateSelect(templateId) {
        this.selectedTemplate = templateId;
        
        // Update visual selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.templateId === templateId);
        });
    }

    /**
     * Render templates based on current category
     */
    renderTemplates() {
        const grid = document.getElementById('template-grid');
        if (!grid) return;

        let filteredTemplates = this.templates;
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            filteredTemplates = this.templates.filter(template => 
                template.category === this.currentCategory
            );
        }

        // Sort recommended templates first
        filteredTemplates.sort((a, b) => {
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            if (a.recommended && b.recommended) {
                return (b.recommendationScore || 0) - (a.recommendationScore || 0);
            }
            return 0;
        });

        grid.innerHTML = filteredTemplates.map(template => this.renderTemplateCard(template)).join('');
    }

    /**
     * Render a single template card
     */
    renderTemplateCard(template) {
        const recommendedClass = template.recommended ? 'recommended' : '';
        const selectedClass = this.selectedTemplate === template.id ? 'selected' : '';
        
        return `
            <div class="template-card ${recommendedClass} ${selectedClass}" data-template-id="${template.id}">
                <div class="template-header">
                    <div class="template-icon">${template.icon}</div>
                    <div>
                        <h3 class="template-title">${template.name}</h3>
                        <div class="template-category">${template.category}</div>
                    </div>
                </div>
                
                <p class="template-description">${template.description}</p>
                
                <div class="template-meta">
                    <div class="template-meta-item">
                        <span class="template-meta-icon">⏱️</span>
                        <span>Setup: ${template.estimatedSetupTime}</span>
                    </div>
                    <div class="template-meta-item">
                        <span class="template-meta-icon">🔄</span>
                        <span>Sync: ${template.syncTime}</span>
                    </div>
                </div>
                
                <div class="template-resources">
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minMemory}GB</span>
                        <span class="template-resource-label">RAM</span>
                    </div>
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minCpu}</span>
                        <span class="template-resource-label">CPU</span>
                    </div>
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minDisk}GB</span>
                        <span class="template-resource-label">Disk</span>
                    </div>
                </div>
                
                <div class="template-profiles">
                    ${template.profiles.map(profile => 
                        `<span class="template-profile-tag">${this.getProfileDisplayName(profile)}</span>`
                    ).join('')}
                </div>
                
                <div class="template-actions">
                    <button class="template-btn template-btn-primary">Use Template</button>
                    <button class="template-btn template-btn-secondary">Details</button>
                </div>
            </div>
        `;
    }

    /**
     * Get display name for profile
     */
    getProfileDisplayName(profileId) {
        const profileNames = {
            'core': 'Core',
            'kaspa-user-applications': 'Apps',
            'indexer-services': 'Indexers',
            'archive-node': 'Archive',
            'mining': 'Mining'
        };
        return profileNames[profileId] || profileId;
    }

    /**
     * Show template details modal
     */
    async showTemplateDetails(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const modal = document.getElementById('template-details-modal');
        const title = document.getElementById('template-modal-title');
        const content = document.getElementById('template-details-content');

        title.textContent = template.name;
        content.innerHTML = this.renderTemplateDetails(template);

        // Store template ID for apply button
        document.getElementById('apply-template-btn').dataset.templateId = templateId;

        modal.style.display = 'flex';
    }

    /**
     * Render template details content
     */
    renderTemplateDetails(template) {
        return `
            <div class="template-details-header">
                <div class="template-details-icon">${template.icon}</div>
                <div class="template-details-info">
                    <h3>${template.name}</h3>
                    <div class="template-category">${template.category} • ${template.useCase}</div>
                </div>
            </div>
            
            <div class="template-long-description">
                ${template.longDescription}
            </div>
            
            <div class="template-details-section">
                <h4>📋 Features</h4>
                <ul class="template-features-list">
                    ${template.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            
            <div class="template-details-section">
                <h4>🎯 Benefits</h4>
                <ul class="template-benefits-list">
                    ${template.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
            </div>
            
            <div class="template-details-section">
                <h4>💻 Resource Requirements</h4>
                <div class="template-resource-grid">
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minMemory}GB</span>
                        <span class="resource-label">Min RAM</span>
                    </div>
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minCpu}</span>
                        <span class="resource-label">Min CPU</span>
                    </div>
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minDisk}GB</span>
                        <span class="resource-label">Min Disk</span>
                    </div>
                </div>
            </div>
            
            ${template.recommendationReasons ? `
                <div class="template-details-section">
                    <h4>💡 Why This Template?</h4>
                    <ul class="template-benefits-list">
                        ${template.recommendationReasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    /**
     * Apply template from modal
     */
    applySelectedTemplate() {
        const templateId = document.getElementById('apply-template-btn').dataset.templateId;
        this.applyTemplate(templateId);
        this.closeTemplateModal();
    }

    /**
     * Apply template configuration
     */
    async applyTemplate(templateId) {
        try {
            console.log(`[TEMPLATE] Applying template: ${templateId}`);
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Show loading state
            this.showLoading('Applying template...');

            // Step 1: Validate template before application
            console.log(`[TEMPLATE] Validating template: ${templateId}`);
            const validationResponse = await fetch(`/api/simple-templates/${templateId}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!validationResponse.ok) {
                throw new Error('Template validation service unavailable');
            }
            
            const validation = await validationResponse.json();

            if (!validation.valid) {
                this.handleTemplateValidationError(templateId, validation.errors);
                return;
            }

            console.log('[TEMPLATE] Template validation passed');

            // Step 2: Apply template configuration using simple-templates API
            console.log(`[TEMPLATE] Applying template configuration`);
            const applyResponse = await fetch(`/api/simple-templates/${templateId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseConfig: stateManager.get('configuration') || {}
                })
            });
            
            if (!applyResponse.ok) {
                const errorData = await applyResponse.json();
                throw new Error(errorData.message || 'Failed to apply template');
            }
            
            const applyResult = await applyResponse.json();

            if (!applyResult.success) {
                throw new Error(applyResult.message || 'Template application failed');
            }

            // Step 3: Validate that template profiles map to existing profile system
            console.log(`[TEMPLATE] Validating profile mapping for profiles:`, template.profiles);
            const validProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
            const invalidProfiles = template.profiles.filter(p => !validProfiles.includes(p));
            
            if (invalidProfiles.length > 0) {
                console.warn('[TEMPLATE] Invalid profiles detected:', invalidProfiles);
                // Continue but log warning - this shouldn't break the flow
            }

            // Step 4: Merge configurations properly
            console.log(`[TEMPLATE] Merging template configuration with existing configuration`);
            const existingConfig = stateManager.get('configuration') || {};
            const mergedConfig = {
                ...existingConfig,
                ...applyResult.config,
                // Ensure template-specific settings are preserved
                templateId: templateId,
                templateName: template.name,
                templateProfiles: template.profiles
            };

            // Step 5: Store template selection and configuration in state with proper navigation path
            console.log(`[TEMPLATE] Storing template selection: ${templateId}`);
            console.log(`[TEMPLATE] Selected profiles:`, template.profiles);
            console.log(`[TEMPLATE] Applied configuration:`, mergedConfig);
            
            // Set template data FIRST, then navigation path to avoid state consistency errors
            stateManager.set('selectedTemplate', templateId);
            stateManager.set('selectedProfiles', template.profiles);
            stateManager.set('configuration', mergedConfig);
            stateManager.set('templateApplied', true);
            stateManager.set('developerMode', template.developerMode || false);
            
            // Now set navigation path - state is consistent
            stateManager.setNavigationPath('template');

            // Update step visibility for template path
            updateStepNumbering();

            // Hide loading state
            this.hideLoading();

            // Show success message
            this.showSuccess(`Applied ${template.name} template successfully!`);

            // Step 6: Navigate directly to configuration step (skip profile selection)
            console.log(`[TEMPLATE] Template applied successfully, navigating to Configuration step`);
            setTimeout(() => {
                goToStep(6); // Configure is step 6 - skip profiles (step 5)
            }, 1500);

        } catch (error) {
            console.error('Failed to apply template:', error);
            this.hideLoading();
            this.handleTemplateApplicationFailure(templateId, error);
        }
    }

    /**
     * Build custom template (navigate to profile selection with proper state management)
     */
    buildCustomTemplate() {
        try {
            console.log('[TEMPLATE] Starting Build Custom workflow');
            
            // Step 1: Clear any existing template state to ensure clean custom path
            console.log('[TEMPLATE] Clearing template selection state');
            stateManager.set('selectedTemplate', null);
            stateManager.set('templateApplied', false);
            
            // Step 2: Clear any existing profile selections to start fresh
            console.log('[TEMPLATE] Clearing existing profile selections');
            stateManager.set('selectedProfiles', []);
            
            // Step 3: Clear template-specific configuration but preserve user settings
            console.log('[TEMPLATE] Clearing template-specific configuration');
            const existingConfig = stateManager.get('configuration') || {};
            const cleanConfig = { ...existingConfig };
            
            // Remove template-specific keys
            delete cleanConfig.templateId;
            delete cleanConfig.templateName;
            delete cleanConfig.templateProfiles;
            
            stateManager.set('configuration', cleanConfig);
            
            // Step 4: Set navigation path to 'custom' for manual selection
            console.log('[TEMPLATE] Setting navigation path to custom');
            stateManager.setNavigationPath('custom');
            
            // Update step visibility for custom path
            updateStepNumbering();
            
            // Step 5: Ensure proper state management for custom path
            stateManager.set('developerMode', false); // Reset developer mode unless explicitly set
            
            // Step 6: Show success message about starting custom setup
            this.showSuccess('Starting custom setup - you can select individual services next.');
            
            // Step 7: Navigate to Profiles step for manual profile selection
            console.log('[TEMPLATE] Navigating to Profiles step (step 5) for manual selection');
            setTimeout(() => {
                goToStep(5); // Profiles is step 5
            }, 1000);
            
        } catch (error) {
            console.error('Failed to start Build Custom workflow:', error);
            this.showError(`Failed to start custom setup: ${error.message}`);
        }
    }

    /**
     * Select template method (show template grid)
     */
    selectTemplateMethod() {
        console.log('[TEMPLATE] Template method selected');
        
        // Show template-related sections
        const templateCategories = document.getElementById('template-categories');
        const templateGrid = document.getElementById('template-grid');
        const customSection = document.getElementById('custom-template-section');
        
        if (templateCategories) templateCategories.style.display = 'block';
        if (templateGrid) templateGrid.style.display = 'grid';
        if (customSection) customSection.style.display = 'none';
        
        // Update method card selection
        this.updateMethodCardSelection('template');
        
        // Render templates if not already rendered
        if (this.templates.length > 0) {
            this.renderTemplates();
        }
    }

    /**
     * Select custom method (show custom setup option)
     */
    selectCustomMethod() {
        console.log('[TEMPLATE] Custom method selected');
        
        // Hide template-related sections and show custom section
        const templateCategories = document.getElementById('template-categories');
        const templateGrid = document.getElementById('template-grid');
        const customSection = document.getElementById('custom-template-section');
        
        if (templateCategories) templateCategories.style.display = 'none';
        if (templateGrid) templateGrid.style.display = 'none';
        if (customSection) customSection.style.display = 'block';
        
        // Update method card selection
        this.updateMethodCardSelection('custom');
    }

    /**
     * Update method card visual selection
     */
    updateMethodCardSelection(selectedMethod) {
        const templateCard = document.getElementById('template-method-card');
        const customCard = document.getElementById('custom-method-card');
        
        // Remove active class from both cards
        if (templateCard) templateCard.classList.remove('active');
        if (customCard) customCard.classList.remove('active');
        
        // Add active class to selected card
        if (selectedMethod === 'template' && templateCard) {
            templateCard.classList.add('active');
        } else if (selectedMethod === 'custom' && customCard) {
            customCard.classList.add('active');
        }
    }

    /**
     * Close template details modal
     */
    closeTemplateModal() {
        const modal = document.getElementById('template-details-modal');
        modal.style.display = 'none';
    }

    /**
     * Show loading message
     */
    showLoading(message) {
        // Create or update loading banner
        let loadingBanner = document.querySelector('.template-loading-banner');
        if (!loadingBanner) {
            loadingBanner = document.createElement('div');
            loadingBanner.className = 'template-loading-banner info-banner';
            loadingBanner.innerHTML = `
                <div class="loading-spinner">⏳</div>
                <div class="loading-content">
                    <div class="loading-title">Processing</div>
                    <div class="loading-message"></div>
                </div>
            `;
            loadingBanner.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #1e40af;
            `;
            document.getElementById('step-templates').insertBefore(
                loadingBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        loadingBanner.querySelector('.loading-message').textContent = message;
        loadingBanner.style.display = 'flex';
    }

    /**
     * Hide loading message
     */
    hideLoading() {
        const loadingBanner = document.querySelector('.template-loading-banner');
        if (loadingBanner) {
            loadingBanner.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message, options = {}) {
        const { showFallback = true, fallbackOptions = [] } = options;
        
        let errorBanner = document.querySelector('.template-error-banner');
        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.className = 'template-error-banner error-banner';
            errorBanner.innerHTML = `
                <div class="error-icon">❌</div>
                <div class="error-content">
                    <div class="error-title">Template Error</div>
                    <div class="error-message"></div>
                    <div class="error-actions" style="display: none;">
                        <button class="btn-secondary btn-small" onclick="window.templateSelection.buildCustomTemplate()">
                            Use Custom Setup Instead
                        </button>
                    </div>
                </div>
            `;
            errorBanner.style.cssText = `
                display: flex;
                align-items: flex-start;
                gap: 12px;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #991b1b;
            `;
            document.getElementById('step-templates').insertBefore(
                errorBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        errorBanner.querySelector('.error-message').textContent = message;
        
        // Show fallback options if available
        if (showFallback && (fallbackOptions.includes('build-custom') || fallbackOptions.length === 0)) {
            errorBanner.querySelector('.error-actions').style.display = 'block';
        }
        
        errorBanner.style.display = 'flex';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorBanner.style.display = 'none';
        }, 10000);
    }

    /**
     * Handle template loading failure with fallback options
     */
    handleTemplateLoadingFailure(errorMessage, useFallback = true) {
        console.warn('[TEMPLATE] Template loading failed:', errorMessage);
        
        if (useFallback) {
            this.showError(
                `Unable to load templates from server: ${errorMessage}. Using offline templates.`,
                { 
                    showFallback: true,
                    fallbackOptions: ['build-custom']
                }
            );
        } else {
            this.showError(
                `Unable to load templates: ${errorMessage}. You can still create a custom setup.`,
                { 
                    showFallback: true,
                    fallbackOptions: ['build-custom']
                }
            );
        }
        
        // Enable custom setup as primary option when templates fail
        this.enableCustomSetupFallback();
    }

    /**
     * Handle initialization failure
     */
    handleInitializationFailure(error) {
        console.error('[TEMPLATE] Template selection initialization failed:', error);
        
        let errorMessage = 'Failed to initialize template selection.';
        let recoveryOptions = ['build-custom'];
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error prevented loading templates. Check your connection.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Template loading timed out. The server may be busy.';
        } else {
            errorMessage = `Template system error: ${error.message}`;
        }
        
        this.showError(
            `${errorMessage} You can still proceed with custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: recoveryOptions
            }
        );
        
        // Ensure custom setup is available as fallback
        this.enableCustomSetupFallback();
        
        // Try to render fallback templates if possible
        try {
            if (this.templates && this.templates.length > 0) {
                this.renderTemplates();
            } else {
                this.templates = this.getFallbackTemplates();
                this.renderTemplates();
            }
        } catch (renderError) {
            console.error('[TEMPLATE] Failed to render fallback templates:', renderError);
            // Custom setup button should still be available
        }
    }

    /**
     * Enable custom setup as fallback when templates fail
     */
    enableCustomSetupFallback() {
        // Ensure the custom setup button is enabled and prominent
        const customBtn = document.getElementById('build-custom-btn');
        if (customBtn) {
            customBtn.disabled = false;
            customBtn.textContent = 'Continue with Custom Setup';
            customBtn.style.backgroundColor = '#059669'; // Make it more prominent
            customBtn.style.color = 'white';
        }
        
        // Add a fallback message to the custom template section
        const customSection = document.querySelector('.custom-template-section');
        if (customSection) {
            let fallbackMessage = customSection.querySelector('.fallback-message');
            if (!fallbackMessage) {
                fallbackMessage = document.createElement('div');
                fallbackMessage.className = 'fallback-message';
                fallbackMessage.style.cssText = `
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                    color: #166534;
                    font-size: 14px;
                `;
                fallbackMessage.innerHTML = `
                    <strong>✅ Custom Setup Available</strong><br>
                    Templates are having issues, but you can still proceed with manual service selection.
                `;
                customSection.insertBefore(fallbackMessage, customSection.firstChild);
            }
        }
    }

    /**
     * Handle template application failure with recovery options
     */
    handleTemplateApplicationFailure(templateId, error) {
        console.error('[TEMPLATE] Template application failed:', error);
        
        let errorMessage = `Failed to apply ${templateId} template`;
        let recoveryOptions = ['build-custom'];
        
        if (error.message.includes('validation')) {
            errorMessage = `Template validation failed: ${error.message}`;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error during template application. Please check your connection.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Template application timed out. Please try again.';
        } else if (error.message.includes('service unavailable')) {
            errorMessage = 'Template service is currently unavailable.';
        } else {
            errorMessage = `Template application error: ${error.message}`;
        }
        
        this.showError(
            `${errorMessage} You can try a different template or use custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: recoveryOptions
            }
        );
        
        // Clear failed template state
        stateManager.set('selectedTemplate', null);
        stateManager.set('templateApplied', false);
        
        // Enable custom setup as fallback
        this.enableCustomSetupFallback();
    }

    /**
     * Handle template validation errors
     */
    handleTemplateValidationError(templateId, validationErrors) {
        console.error('[TEMPLATE] Template validation errors:', validationErrors);
        
        const errorMessage = `Template "${templateId}" validation failed: ${validationErrors.join(', ')}`;
        
        this.showError(
            `${errorMessage} Please try a different template or use custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: ['build-custom']
            }
        );
        
        // Clear failed template state
        stateManager.set('selectedTemplate', null);
        stateManager.set('templateApplied', false);
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        // Create or update success banner
        let successBanner = document.querySelector('.template-success-banner');
        if (!successBanner) {
            successBanner = document.createElement('div');
            successBanner.className = 'template-success-banner success-banner';
            successBanner.innerHTML = `
                <div class="success-icon">✅</div>
                <div class="success-content">
                    <div class="success-title">Success</div>
                    <div class="success-message"></div>
                </div>
            `;
            successBanner.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(126, 211, 33, 0.1);
                border: 1px solid rgba(126, 211, 33, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #2d5016;
            `;
            document.getElementById('step-templates').insertBefore(
                successBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        successBanner.querySelector('.success-message').textContent = message;
        successBanner.style.display = 'flex';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successBanner.style.display = 'none';
        }, 3000);
    }
}

// Global functions for modal
function closeTemplateModal() {
    if (window.templateSelection) {
        window.templateSelection.closeTemplateModal();
    }
}

// Attach to window for global access
window.closeTemplateModal = closeTemplateModal;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.templateSelection = new TemplateSelection();
});

// Export for module use
export default TemplateSelection;