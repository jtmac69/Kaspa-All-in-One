/**
 * Glossary API Endpoints
 * Provides access to glossary terms, definitions, and educational content
 */

const express = require('express');
const router = express.Router();
const GlossaryManager = require('../utils/glossary-manager');

const glossaryManager = new GlossaryManager();

/**
 * GET /api/glossary/terms
 * Get all terms or search terms
 */
router.get('/terms', (req, res) => {
    try {
        const { search, category } = req.query;

        let terms;
        if (search) {
            terms = glossaryManager.searchTerms(search);
        } else if (category) {
            terms = glossaryManager.getTermsByCategory(category);
        } else {
            terms = glossaryManager.getAllTerms();
        }

        res.json({
            success: true,
            terms,
            count: Object.keys(terms).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching terms',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/terms/:id
 * Get a specific term with full details
 */
router.get('/terms/:id', (req, res) => {
    try {
        const termData = glossaryManager.getFullTermData(req.params.id);

        if (!termData) {
            return res.status(404).json({
                success: false,
                message: 'Term not found'
            });
        }

        res.json({
            success: true,
            term: termData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching term',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/terms/:id/tooltip
 * Get minimal tooltip data for a term
 */
router.get('/terms/:id/tooltip', (req, res) => {
    try {
        const tooltipData = glossaryManager.getTooltipData(req.params.id);

        if (!tooltipData) {
            return res.status(404).json({
                success: false,
                message: 'Term not found'
            });
        }

        res.json({
            success: true,
            tooltip: tooltipData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching tooltip',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/categories
 * Get all categories
 */
router.get('/categories', (req, res) => {
    try {
        const categories = glossaryManager.getAllCategories();

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/concepts
 * Get all concepts or filter by category
 */
router.get('/concepts', (req, res) => {
    try {
        const { category } = req.query;

        let concepts;
        if (category) {
            concepts = glossaryManager.getConceptsByCategory(category);
        } else {
            concepts = glossaryManager.getAllConcepts();
        }

        res.json({
            success: true,
            concepts,
            count: Object.keys(concepts).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching concepts',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/concepts/:id
 * Get a specific concept explainer
 */
router.get('/concepts/:id', (req, res) => {
    try {
        const conceptData = glossaryManager.getConceptExplainer(req.params.id);

        if (!conceptData) {
            return res.status(404).json({
                success: false,
                message: 'Concept not found'
            });
        }

        res.json({
            success: true,
            concept: conceptData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching concept',
            error: error.message
        });
    }
});

/**
 * POST /api/glossary/find-in-text
 * Find glossary terms in provided text
 */
router.post('/find-in-text', (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const foundTerms = glossaryManager.findTermsInText(text);

        res.json({
            success: true,
            terms: foundTerms,
            count: foundTerms.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error finding terms',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/popular
 * Get popular terms
 */
router.get('/popular', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const popularTerms = glossaryManager.getPopularTerms(limit);

        res.json({
            success: true,
            terms: popularTerms
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popular terms',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/beginner
 * Get beginner-friendly terms
 */
router.get('/beginner', (req, res) => {
    try {
        const beginnerTerms = glossaryManager.getBeginnerTerms();

        res.json({
            success: true,
            terms: beginnerTerms
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching beginner terms',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/statistics
 * Get glossary statistics
 */
router.get('/statistics', (req, res) => {
    try {
        const stats = glossaryManager.getStatistics();

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

/**
 * GET /api/glossary/export
 * Export entire glossary
 */
router.get('/export', (req, res) => {
    try {
        const glossaryData = glossaryManager.exportGlossary();

        res.json({
            success: true,
            glossary: glossaryData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting glossary',
            error: error.message
        });
    }
});

module.exports = router;
