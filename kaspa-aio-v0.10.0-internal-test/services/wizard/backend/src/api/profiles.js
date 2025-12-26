/**
 * Profiles API - Legacy Compatibility Layer
 * 
 * This file maintains backward compatibility while delegating to the new modular API system.
 * All endpoints have been moved to focused modules in the ./profiles/ directory.
 * 
 * API REFACTORING COMPLETE:
 * - Basic Operations: ./profiles/basic.js (~80 lines)
 * - Template Management: ./profiles/templates.js (~200 lines)
 * - Validation Logic: ./profiles/validation.js (~150 lines)
 * - Profile Addition: ./profiles/addition.js (~120 lines)
 * - Profile Removal: ./profiles/removal.js (~250 lines)
 * - Main Router: ./profiles/index.js (~30 lines)
 * 
 * Total: ~830 lines split into 6 focused files (was 850+ lines in 1 file)
 * Context reduction: Targeted reading by endpoint category
 * 
 * ENDPOINT ORGANIZATION:
 * 
 * Basic Operations (/):
 * - GET / - Get all profiles
 * - GET /:id - Get specific profile
 * - GET /developer-mode/features - Get developer mode features
 * - POST /developer-mode/apply - Apply developer mode
 * 
 * Templates (/templates):
 * - GET /templates/all - Get all templates
 * - GET /templates/category/:category - Get templates by category
 * - GET /templates/usecase/:useCase - Get templates by use case
 * - GET /templates/:id - Get specific template
 * - POST /templates/search - Search templates by tags
 * - POST /templates/recommendations - Get template recommendations
 * - POST /templates/:id/apply - Apply template configuration
 * - POST /templates/:id/validate - Validate template
 * - POST /templates - Create custom template
 * - DELETE /templates/:id - Delete custom template
 * 
 * Validation (/):
 * - POST /validate - Validate profile selection
 * - POST /validate-selection - Comprehensive validation
 * - POST /validation-report - Get detailed validation report
 * - POST /requirements - Calculate resource requirements
 * - POST /dependencies - Resolve profile dependencies
 * - POST /dependency-graph - Build dependency graph
 * - POST /circular-dependencies - Detect circular dependencies
 * - POST /startup-order - Get service startup order
 * 
 * Addition (/):
 * - POST /validate-addition - Validate profile addition
 * - POST /integration-options - Get integration options
 * - POST /add - Add profile to existing installation
 * 
 * Removal (/):
 * - POST /validate-removal - Validate profile removal
 * - POST /remove/confirm - Confirm profile removal with impact
 * - POST /remove - Remove profile from installation
 * - GET /:id/data-options - Get data removal options
 * - GET /:id/removal-impact - Get detailed removal impact
 */

// Export the modular router system
module.exports = require('./profiles/index');