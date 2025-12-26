const express = require('express');
const ProfileManager = require('../../utils/profile-manager');
const DependencyValidator = require('../../utils/dependency-validator');

// Import route modules
const createBasicRoutes = require('./basic');
const createTemplateRoutes = require('./templates');
const createValidationRoutes = require('./validation');
const createAdditionRoutes = require('./addition');
const createRemovalRoutes = require('./removal');

const router = express.Router();

// Initialize managers
const profileManager = new ProfileManager();
const dependencyValidator = new DependencyValidator(profileManager);

// Mount route modules
router.use('/', createBasicRoutes(profileManager, dependencyValidator));
router.use('/templates', createTemplateRoutes(profileManager));
router.use('/', createValidationRoutes(profileManager, dependencyValidator));
router.use('/', createAdditionRoutes(profileManager, dependencyValidator));
router.use('/', createRemovalRoutes(profileManager, dependencyValidator));

module.exports = router;