/**
 * Template Selection Module
 * Handles template selection, customization, and application
 */

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
            // Load templates from API
            await this.loadTemplates();
            
            // Get system resources for recommendations
            await this.loadSystemResources();
            
            // Get template recommendations
            await this.loadRecommendations();
            
            // Render templates
            this.renderTemplates();
            
        } catch (error) {
            console.error('Failed to initialize template selection:', error);
            this.showError('Failed to load templates. Please try again.');
        }
    }

    /**
     * Load templates from the API
     */
    async loadTemplates() {
        const response = await fetch('/api/profiles/templates/all');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load templates');
        }
        
        this.templates = data.templates;
    }

    /**
     * Load system resources for recommendations
     */
    async loadSystemResources() {
        try {
            const response = await fetch('/api/wizard/system-check');
            const data = await response.json();
            
            if (response.ok && data.resources) {
                this.systemResources = {
                    memory: Math.floor(data.resources.memory.total / (1024 * 1024 * 1024)), // Convert to GB
                    cpu: data.resources.cpu.cores,
                    disk: Math.floor(data.resources.disk.available / (1024 * 1024 * 1024)) // Convert to GB
                };
            }
        } catch (error) {
            console.warn('Could not load system resources:', error);
        }
    }

    /**
     * Load template recommendations
     */
    async loadRecommendations() {
        if (!this.systemResources) return;
        
        try {
            const response = await fetch('/api/profiles/templates/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    systemResources: this.systemResources,
                    useCase: this.useCase
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.recommendations = data.recommendations;
                this.markRecommendedTemplates();
            }
        } catch (error) {
            console.warn('Could not load recommendations:', error);
        }
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
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Validate template
            const validationResponse = await fetch(`/api/profiles/templates/${templateId}/validate`, {
                method: 'POST'
            });
            const validation = await validationResponse.json();

            if (!validation.valid) {
                this.showError(`Template validation failed: ${validation.errors.join(', ')}`);
                return;
            }

            // Apply template configuration
            const applyResponse = await fetch(`/api/profiles/templates/${templateId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseConfig: stateManager.get('configuration') || {}
                })
            });
            const applyResult = await applyResponse.json();

            if (!applyResponse.ok) {
                throw new Error(applyResult.message || 'Failed to apply template');
            }

            // Store template selection and configuration in state
            stateManager.set('selectedTemplate', templateId);
            stateManager.set('selectedProfiles', template.profiles);
            stateManager.set('configuration', applyResult.config);
            stateManager.set('developerMode', template.developerMode || false);

            // Show success message
            this.showSuccess(`Applied ${template.name} template successfully!`);

            // Navigate to next step (skip profile selection since template already selected profiles)
            setTimeout(() => {
                navigation.goToStep('configure');
            }, 1500);

        } catch (error) {
            console.error('Failed to apply template:', error);
            this.showError(`Failed to apply template: ${error.message}`);
        }
    }

    /**
     * Build custom template (skip to profile selection)
     */
    buildCustomTemplate() {
        // Clear any template selection
        stateManager.set('selectedTemplate', null);
        stateManager.set('selectedProfiles', []);
        
        // Navigate to profile selection
        navigation.goToStep('profiles');
    }

    /**
     * Close template details modal
     */
    closeTemplateModal() {
        const modal = document.getElementById('template-details-modal');
        modal.style.display = 'none';
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create or update error banner
        let errorBanner = document.querySelector('.template-error-banner');
        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.className = 'template-error-banner warning-banner';
            errorBanner.innerHTML = `
                <div class="warning-icon">❌</div>
                <div class="warning-content">
                    <div class="warning-title">Error</div>
                    <div class="warning-message"></div>
                </div>
            `;
            document.getElementById('step-templates').insertBefore(
                errorBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        errorBanner.querySelector('.warning-message').textContent = message;
        errorBanner.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorBanner.style.display = 'none';
        }, 5000);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.templateSelection = new TemplateSelection();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateSelection;
}