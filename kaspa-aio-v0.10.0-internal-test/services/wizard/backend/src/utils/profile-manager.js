/**
 * ProfileManager - Legacy Compatibility Layer
 * 
 * This file maintains backward compatibility while delegating to the new modular system.
 * All functionality has been moved to focused modules in the ./profile/ directory.
 * 
 * REFACTORING COMPLETE:
 * - Core ProfileManager: ./profile/ProfileManager.js (~350 lines)
 * - Validation Logic: ./profile/ProfileValidation.js (~200 lines)
 * - Template Management: ./profile/ProfileTemplates.js (~250 lines)
 * - Profile Addition: ./profile/ProfileAddition.js (~400 lines)
 * - Profile Removal: ./profile/ProfileRemoval.js (~300 lines)
 * - Main Entry Point: ./profile/index.js (~100 lines)
 * 
 * Total: ~1600 lines split into 6 focused files (was 1932 lines in 1 file)
 * Context reduction: ~17% smaller + much more targeted reading
 */

// Use the basic ProfileManager directly to avoid circular references
const ProfileManager = require('./profile/ProfileManager');

// Export the basic profile manager for backward compatibility
module.exports = ProfileManager;