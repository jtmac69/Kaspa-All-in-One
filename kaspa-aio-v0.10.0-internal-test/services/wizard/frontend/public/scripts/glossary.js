/**
 * Glossary System
 * Handles glossary terms, tooltips, and educational content
 */

class GlossarySystem {
    constructor() {
        this.terms = {};
        this.categories = {};
        this.concepts = {};
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.initialized = false;
    }

    /**
     * Initialize the glossary system
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Load all glossary data
            await Promise.all([
                this.loadTerms(),
                this.loadCategories(),
                this.loadConcepts()
            ]);

            this.initialized = true;
            console.log('Glossary system initialized');
        } catch (error) {
            console.error('Error initializing glossary:', error);
        }
    }

    /**
     * Load all terms
     */
    async loadTerms() {
        try {
            const response = await fetch('/api/glossary/terms');
            const data = await response.json();
            
            if (data.success) {
                this.terms = data.terms;
            }
        } catch (error) {
            console.error('Error loading terms:', error);
        }
    }

    /**
     * Load categories
     */
    async loadCategories() {
        try {
            const response = await fetch('/api/glossary/categories');
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.categories;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    /**
     * Load concepts
     */
    async loadConcepts() {
        try {
            const response = await fetch('/api/glossary/concepts');
            const data = await response.json();
            
            if (data.success) {
                this.concepts = data.concepts;
            }
        } catch (error) {
            console.error('Error loading concepts:', error);
        }
    }

    /**
     * Search terms
     */
    async searchTerms(query) {
        try {
            const response = await fetch(`/api/glossary/terms?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                return data.terms;
            }
            return {};
        } catch (error) {
            console.error('Error searching terms:', error);
            return {};
        }
    }

    /**
     * Get terms by category
     */
    async getTermsByCategory(categoryId) {
        try {
            const response = await fetch(`/api/glossary/terms?category=${categoryId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.terms;
            }
            return {};
        } catch (error) {
            console.error('Error getting terms by category:', error);
            return {};
        }
    }

    /**
     * Get full term data
     */
    async getTermData(termId) {
        try {
            const response = await fetch(`/api/glossary/terms/${termId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.term;
            }
            return null;
        } catch (error) {
            console.error('Error getting term data:', error);
            return null;
        }
    }

    /**
     * Get concept data
     */
    async getConceptData(conceptId) {
        try {
            const response = await fetch(`/api/glossary/concepts/${conceptId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.concept;
            }
            return null;
        } catch (error) {
            console.error('Error getting concept data:', error);
            return null;
        }
    }

    /**
     * Create tooltip for a term
     */
    createTooltip(termId, termData) {
        const tooltip = document.createElement('div');
        tooltip.className = 'glossary-tooltip';
        tooltip.innerHTML = `
            <div class="glossary-tooltip-term">${termData.term}</div>
            <div class="glossary-tooltip-definition">${termData.shortDefinition}</div>
            <a href="#" class="glossary-tooltip-link" onclick="glossarySystem.showTermModal('${termId}'); return false;">
                Learn more →
            </a>
        `;
        return tooltip;
    }

    /**
     * Add tooltips to text content
     */
    async addTooltipsToElement(element) {
        if (!this.initialized) {
            await this.initialize();
        }

        const text = element.textContent;
        
        // Find terms in text
        const response = await fetch('/api/glossary/find-in-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        if (!data.success || data.terms.length === 0) {
            return;
        }

        // Replace text with glossary terms
        let html = element.innerHTML;
        const processedTerms = new Set();

        // Sort by position (reverse) to avoid offset issues
        data.terms.sort((a, b) => b.position - a.position);

        for (const foundTerm of data.terms) {
            // Only process each term once
            if (processedTerms.has(foundTerm.term.toLowerCase())) {
                continue;
            }
            processedTerms.add(foundTerm.term.toLowerCase());

            // Create regex to match whole words only
            const regex = new RegExp(`\\b${foundTerm.term}\\b`, 'gi');
            
            html = html.replace(regex, (match) => {
                return `<span class="glossary-term" data-term-id="${foundTerm.id}">${match}</span>`;
            });
        }

        element.innerHTML = html;

        // Add event listeners to glossary terms
        element.querySelectorAll('.glossary-term').forEach(termElement => {
            const termId = termElement.dataset.termId;
            
            // Create and append tooltip
            const tooltipData = this.terms[termId];
            if (tooltipData) {
                const tooltip = this.createTooltip(termId, tooltipData);
                termElement.appendChild(tooltip);
            }

            // Add click handler
            termElement.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTermModal(termId);
            });
        });
    }

    /**
     * Show term modal
     */
    async showTermModal(termId) {
        const termData = await this.getTermData(termId);
        if (!termData) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'glossary-modal active';
        modal.innerHTML = `
            <div class="glossary-modal-content">
                <div class="glossary-modal-header">
                    <div>
                        <h2 class="glossary-modal-title">${termData.term}</h2>
                        <div class="glossary-modal-category">
                            <span class="category-icon">${termData.categoryData?.icon || '📖'}</span>
                            ${termData.categoryData?.name || termData.category}
                        </div>
                    </div>
                    <button class="glossary-modal-close" onclick="this.closest('.glossary-modal').remove()">×</button>
                </div>
                <div class="glossary-modal-body">
                    <div class="glossary-section">
                        <h3 class="glossary-section-title">Quick Definition</h3>
                        <p class="glossary-section-content">${termData.shortDefinition}</p>
                    </div>
                    
                    <div class="glossary-section">
                        <h3 class="glossary-section-title">In Plain Language</h3>
                        <p class="glossary-section-content">${termData.plainLanguage}</p>
                    </div>
                    
                    ${termData.analogy ? `
                        <div class="glossary-section">
                            <h3 class="glossary-section-title">Think of it like this...</h3>
                            <div class="glossary-analogy">${termData.analogy}</div>
                        </div>
                    ` : ''}
                    
                    ${termData.examples && termData.examples.length > 0 ? `
                        <div class="glossary-section">
                            <h3 class="glossary-section-title">Examples</h3>
                            <ul class="glossary-examples">
                                ${termData.examples.map(ex => `<li>${ex}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${termData.technicalDetails ? `
                        <div class="glossary-section">
                            <h3 class="glossary-section-title">Technical Details</h3>
                            <p class="glossary-section-content">${termData.technicalDetails}</p>
                        </div>
                    ` : ''}
                    
                    ${termData.relatedTermsData && termData.relatedTermsData.length > 0 ? `
                        <div class="glossary-section">
                            <h3 class="glossary-section-title">Related Terms</h3>
                            <div class="glossary-related-terms">
                                ${termData.relatedTermsData.map(rt => `
                                    <span class="related-term-tag" onclick="glossarySystem.showTermModal('${rt.id}')">
                                        ${rt.term}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${termData.learnMoreUrl ? `
                        <div class="glossary-section">
                            <a href="${termData.learnMoreUrl}" target="_blank" class="glossary-learn-more">
                                Learn More Externally →
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Show concept modal
     */
    async showConceptModal(conceptId) {
        const conceptData = await this.getConceptData(conceptId);
        if (!conceptData) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'concept-modal active';
        modal.innerHTML = `
            <div class="concept-modal-content">
                <div class="concept-modal-header">
                    <div>
                        <h2 class="concept-modal-title">${conceptData.title}</h2>
                        <p class="concept-modal-summary">${conceptData.summary}</p>
                    </div>
                    <button class="glossary-modal-close" onclick="this.closest('.concept-modal').remove()">×</button>
                </div>
                <div class="concept-modal-body">
                    ${conceptData.sections.map(section => `
                        <div class="concept-section">
                            <h3 class="concept-section-heading">${section.heading}</h3>
                            <p class="concept-section-content">${section.content}</p>
                        </div>
                    `).join('')}
                    
                    ${conceptData.relatedTermsData && conceptData.relatedTermsData.length > 0 ? `
                        <div class="concept-section">
                            <h3 class="concept-section-heading">Related Terms</h3>
                            <div class="glossary-related-terms">
                                ${conceptData.relatedTermsData.map(rt => `
                                    <span class="related-term-tag" onclick="glossarySystem.showTermModal('${rt.id}')">
                                        ${rt.term}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Render glossary page
     */
    async renderGlossaryPage(containerId) {
        if (!this.initialized) {
            await this.initialize();
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="glossary-page">
                <div class="glossary-header">
                    <h1 class="glossary-title">Glossary</h1>
                    <p class="glossary-subtitle">Learn about blockchain, Docker, and technical terms in plain language</p>
                </div>
                
                <div class="glossary-search-container">
                    <input 
                        type="text" 
                        class="glossary-search-input" 
                        placeholder="Search for a term..."
                        id="glossary-search"
                    />
                </div>
                
                <div class="glossary-categories" id="glossary-categories"></div>
                
                <div class="glossary-grid" id="glossary-grid"></div>
            </div>
        `;

        // Render categories
        this.renderCategories();

        // Render terms
        this.renderTerms(this.terms);

        // Add search handler
        document.getElementById('glossary-search').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
    }

    /**
     * Render categories
     */
    renderCategories() {
        const container = document.getElementById('glossary-categories');
        if (!container) return;

        const categoriesHTML = `
            <button class="category-filter ${this.currentCategory === 'all' ? 'active' : ''}" 
                    onclick="glossarySystem.filterByCategory('all')">
                All Terms
            </button>
            ${Object.entries(this.categories).map(([id, cat]) => `
                <button class="category-filter ${this.currentCategory === id ? 'active' : ''}" 
                        onclick="glossarySystem.filterByCategory('${id}')">
                    <span class="category-icon">${cat.icon}</span>
                    ${cat.name}
                </button>
            `).join('')}
        `;

        container.innerHTML = categoriesHTML;
    }

    /**
     * Render terms
     */
    renderTerms(terms) {
        const container = document.getElementById('glossary-grid');
        if (!container) return;

        const termsArray = Object.entries(terms);

        if (termsArray.length === 0) {
            container.innerHTML = `
                <div class="glossary-empty">
                    <div class="glossary-empty-icon">🔍</div>
                    <h3 class="glossary-empty-title">No terms found</h3>
                    <p class="glossary-empty-message">Try a different search or category</p>
                </div>
            `;
            return;
        }

        const termsHTML = termsArray.map(([id, term]) => `
            <div class="glossary-card" onclick="glossarySystem.showTermModal('${id}')">
                <div class="glossary-card-header">
                    <h3 class="glossary-card-term">${term.term}</h3>
                    <span class="glossary-card-category">${this.categories[term.category]?.name || term.category}</span>
                </div>
                <p class="glossary-card-definition">${term.shortDefinition}</p>
            </div>
        `).join('');

        container.innerHTML = termsHTML;
    }

    /**
     * Handle search
     */
    async handleSearch(query) {
        this.searchQuery = query;

        if (query.trim() === '') {
            // Show all terms or filtered by category
            if (this.currentCategory === 'all') {
                this.renderTerms(this.terms);
            } else {
                const terms = await this.getTermsByCategory(this.currentCategory);
                this.renderTerms(terms);
            }
        } else {
            // Search terms
            const terms = await this.searchTerms(query);
            this.renderTerms(terms);
        }
    }

    /**
     * Filter by category
     */
    async filterByCategory(categoryId) {
        this.currentCategory = categoryId;
        this.renderCategories();

        if (categoryId === 'all') {
            if (this.searchQuery) {
                const terms = await this.searchTerms(this.searchQuery);
                this.renderTerms(terms);
            } else {
                this.renderTerms(this.terms);
            }
        } else {
            const terms = await this.getTermsByCategory(categoryId);
            this.renderTerms(terms);
        }
    }
}

// Create global instance
const glossarySystem = new GlossarySystem();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    glossarySystem.initialize();
});
