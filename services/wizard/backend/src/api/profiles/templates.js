const express = require('express');
const router = express.Router();

/**
 * Template Management API Endpoints
 * Handles template operations, recommendations, and custom template management
 */
function createTemplateRoutes(profileManager) {
  
  // GET /api/profiles/templates/all - Get all templates
  router.get('/all', (req, res) => {
    try {
      const templates = profileManager.getAllTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get templates',
        message: error.message
      });
    }
  });

  // GET /api/profiles/templates/category/:category - Get templates by category
  router.get('/category/:category', (req, res) => {
    try {
      const templates = profileManager.getTemplatesByCategory(req.params.category);
      res.json({ templates });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get templates by category',
        message: error.message
      });
    }
  });

  // GET /api/profiles/templates/usecase/:useCase - Get templates by use case
  router.get('/usecase/:useCase', (req, res) => {
    try {
      const templates = profileManager.getTemplatesByUseCase(req.params.useCase);
      res.json({ templates });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get templates by use case',
        message: error.message
      });
    }
  });

  // GET /api/profiles/templates/:id - Get specific template
  router.get('/:id', (req, res) => {
    try {
      const template = profileManager.getTemplate(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template '${req.params.id}' does not exist`
        });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get template',
        message: error.message
      });
    }
  });

  // POST /api/profiles/templates/search - Search templates by tags
  router.post('/search', (req, res) => {
    try {
      const { tags } = req.body;
      
      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Tags array is required'
        });
      }
      
      const templates = profileManager.searchTemplatesByTags(tags);
      res.json({ templates });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to search templates',
        message: error.message
      });
    }
  });

  // POST /api/profiles/templates/recommendations - Get template recommendations
  router.post('/recommendations', (req, res) => {
    try {
      const { systemResources, useCase } = req.body;
      
      if (!systemResources) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'System resources are required'
        });
      }
      
      const recommendations = profileManager.getTemplateRecommendations(systemResources, useCase);
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get template recommendations',
        message: error.message
      });
    }
  });

  // POST /api/profiles/templates/:id/apply - Apply template configuration
  router.post('/:id/apply', (req, res) => {
    try {
      const { baseConfig = {} } = req.body;
      const config = profileManager.applyTemplate(req.params.id, baseConfig);
      
      res.json({ config });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to apply template',
        message: error.message
      });
    }
  });

  // POST /api/profiles/templates/:id/validate - Validate template
  router.post('/:id/validate', (req, res) => {
    try {
      const validation = profileManager.validateTemplate(req.params.id);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to validate template',
        message: error.message
      });
    }
  });

  // POST /api/profiles/templates - Create custom template
  router.post('/', (req, res) => {
    try {
      const template = profileManager.createCustomTemplate(req.body);
      const saved = profileManager.saveCustomTemplate(template);
      
      if (saved) {
        res.status(201).json({ 
          success: true, 
          template,
          message: 'Template created successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to save template',
          message: 'Template creation failed'
        });
      }
    } catch (error) {
      res.status(400).json({
        error: 'Failed to create template',
        message: error.message
      });
    }
  });

  // DELETE /api/profiles/templates/:id - Delete custom template
  router.delete('/:id', (req, res) => {
    try {
      const deleted = profileManager.deleteCustomTemplate(req.params.id);
      
      if (deleted) {
        res.json({ 
          success: true,
          message: 'Template deleted successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete template',
          message: 'Template deletion failed'
        });
      }
    } catch (error) {
      res.status(400).json({
        error: 'Failed to delete template',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createTemplateRoutes;