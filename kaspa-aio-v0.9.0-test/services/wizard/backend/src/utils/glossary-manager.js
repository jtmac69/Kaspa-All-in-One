/**
 * Glossary Manager
 * Manages glossary terms, definitions, and educational content
 */

const fs = require('fs');
const path = require('path');

class GlossaryManager {
    constructor() {
        this.glossaryPath = path.join(__dirname, '../data/glossary-content.json');
        this.glossaryData = null;
        this.loadGlossary();
    }

    /**
     * Load glossary data from JSON file
     */
    loadGlossary() {
        try {
            const data = fs.readFileSync(this.glossaryPath, 'utf8');
            this.glossaryData = JSON.parse(data);
        } catch (error) {
            console.error('Error loading glossary data:', error);
            this.glossaryData = { terms: {}, categories: {}, concepts: {} };
        }
    }

    /**
     * Get all terms
     */
    getAllTerms() {
        return this.glossaryData.terms;
    }

    /**
     * Get a specific term by ID
     */
    getTerm(termId) {
        return this.glossaryData.terms[termId] || null;
    }

    /**
     * Search terms by query
     */
    searchTerms(query) {
        if (!query || query.trim() === '') {
            return this.getAllTerms();
        }

        const searchQuery = query.toLowerCase().trim();
        const results = {};

        Object.entries(this.glossaryData.terms).forEach(([id, term]) => {
            // Search in term name
            if (term.term.toLowerCase().includes(searchQuery)) {
                results[id] = { ...term, relevance: 'high' };
                return;
            }

            // Search in short definition
            if (term.shortDefinition.toLowerCase().includes(searchQuery)) {
                results[id] = { ...term, relevance: 'medium' };
                return;
            }

            // Search in plain language explanation
            if (term.plainLanguage.toLowerCase().includes(searchQuery)) {
                results[id] = { ...term, relevance: 'medium' };
                return;
            }

            // Search in examples
            if (term.examples && term.examples.some(ex => ex.toLowerCase().includes(searchQuery))) {
                results[id] = { ...term, relevance: 'low' };
                return;
            }
        });

        return results;
    }

    /**
     * Get terms by category
     */
    getTermsByCategory(categoryId) {
        const results = {};

        Object.entries(this.glossaryData.terms).forEach(([id, term]) => {
            if (term.category === categoryId) {
                results[id] = term;
            }
        });

        return results;
    }

    /**
     * Get all categories
     */
    getAllCategories() {
        return this.glossaryData.categories;
    }

    /**
     * Get a specific category
     */
    getCategory(categoryId) {
        return this.glossaryData.categories[categoryId] || null;
    }

    /**
     * Get all concepts
     */
    getAllConcepts() {
        return this.glossaryData.concepts;
    }

    /**
     * Get a specific concept
     */
    getConcept(conceptId) {
        return this.glossaryData.concepts[conceptId] || null;
    }

    /**
     * Get concepts by category
     */
    getConceptsByCategory(categoryId) {
        const results = {};

        Object.entries(this.glossaryData.concepts).forEach(([id, concept]) => {
            if (concept.category === categoryId) {
                results[id] = concept;
            }
        });

        return results;
    }

    /**
     * Get related terms for a given term
     */
    getRelatedTerms(termId) {
        const term = this.getTerm(termId);
        if (!term || !term.relatedTerms) {
            return [];
        }

        return term.relatedTerms.map(relatedId => ({
            id: relatedId,
            ...this.getTerm(relatedId)
        })).filter(t => t.term); // Filter out any missing terms
    }

    /**
     * Get terms that appear in text (for auto-linking)
     */
    findTermsInText(text) {
        if (!text) return [];

        const textLower = text.toLowerCase();
        const foundTerms = [];

        Object.entries(this.glossaryData.terms).forEach(([id, term]) => {
            // Check if term appears in text
            const termLower = term.term.toLowerCase();
            if (textLower.includes(termLower)) {
                // Find all occurrences
                let index = textLower.indexOf(termLower);
                while (index !== -1) {
                    foundTerms.push({
                        id,
                        term: term.term,
                        position: index,
                        length: term.term.length,
                        shortDefinition: term.shortDefinition
                    });
                    index = textLower.indexOf(termLower, index + 1);
                }
            }
        });

        // Sort by position
        return foundTerms.sort((a, b) => a.position - b.position);
    }

    /**
     * Get glossary statistics
     */
    getStatistics() {
        return {
            totalTerms: Object.keys(this.glossaryData.terms).length,
            totalCategories: Object.keys(this.glossaryData.categories).length,
            totalConcepts: Object.keys(this.glossaryData.concepts).length,
            termsByCategory: Object.entries(this.glossaryData.categories).map(([id, cat]) => ({
                category: cat.name,
                count: Object.values(this.glossaryData.terms).filter(t => t.category === id).length
            })),
            conceptsByCategory: Object.entries(this.glossaryData.categories).map(([id, cat]) => ({
                category: cat.name,
                count: Object.values(this.glossaryData.concepts).filter(c => c.category === id).length
            }))
        };
    }

    /**
     * Get tooltip data for a term (minimal data for tooltips)
     */
    getTooltipData(termId) {
        const term = this.getTerm(termId);
        if (!term) return null;

        return {
            id: termId,
            term: term.term,
            shortDefinition: term.shortDefinition,
            category: term.category
        };
    }

    /**
     * Get full term data for modal display
     */
    getFullTermData(termId) {
        const term = this.getTerm(termId);
        if (!term) return null;

        return {
            id: termId,
            ...term,
            relatedTermsData: this.getRelatedTerms(termId),
            categoryData: this.getCategory(term.category)
        };
    }

    /**
     * Get concept explainer data
     */
    getConceptExplainer(conceptId) {
        const concept = this.getConcept(conceptId);
        if (!concept) return null;

        return {
            id: conceptId,
            ...concept,
            categoryData: this.getCategory(concept.category),
            relatedTermsData: concept.relatedTerms ? 
                concept.relatedTerms.map(id => this.getTooltipData(id)).filter(t => t) : 
                []
        };
    }

    /**
     * Get popular terms (terms with most related terms)
     */
    getPopularTerms(limit = 10) {
        const termsWithRelations = Object.entries(this.glossaryData.terms)
            .map(([id, term]) => ({
                id,
                ...term,
                relationCount: (term.relatedTerms || []).length
            }))
            .sort((a, b) => b.relationCount - a.relationCount)
            .slice(0, limit);

        return termsWithRelations;
    }

    /**
     * Get beginner-friendly terms (terms in specific categories)
     */
    getBeginnerTerms() {
        const beginnerCategories = ['docker', 'blockchain', 'hardware'];
        const results = {};

        Object.entries(this.glossaryData.terms).forEach(([id, term]) => {
            if (beginnerCategories.includes(term.category)) {
                results[id] = term;
            }
        });

        return results;
    }

    /**
     * Export glossary for offline use
     */
    exportGlossary() {
        return {
            terms: this.glossaryData.terms,
            categories: this.glossaryData.categories,
            concepts: this.glossaryData.concepts,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    }
}

module.exports = GlossaryManager;
