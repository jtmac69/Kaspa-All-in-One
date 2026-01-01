#!/bin/bash
# =============================================================================
# Repository Cleanup Script
# Removes superseded specs, debug files, backup files, and test cruft
# Created: 2026-01-01
# =============================================================================

set -e

echo "=========================================="
echo "Kaspa AIO Repository Cleanup"
echo "=========================================="
echo ""

# Track counts
DELETED_COUNT=0
SKIPPED_COUNT=0

# Function to safely delete a file
delete_file() {
    local file="$1"
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "  ✓ Deleted: $file"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    else
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    fi
}

# Function to safely delete a directory
delete_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "  ✓ Deleted directory: $dir"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    else
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    fi
}

# =============================================================================
# 1. SUPERSEDED SPECS (replaced by wizard-dashboard-unification)
# =============================================================================
echo ""
echo "1. Removing superseded specs..."
echo "   (These are replaced by wizard-dashboard-unification)"

delete_dir ".kiro/specs/wizard-template-profile-fix"
delete_dir ".kiro/specs/wizard-responsive-layout-fix"
delete_dir ".kiro/specs/management-dashboard"

# =============================================================================
# 2. ROOT-LEVEL DEBUG FILES
# =============================================================================
echo ""
echo "2. Removing root-level debug files..."

delete_file "debug-api-route.js"
delete_file "debug-dependency-validator.js"
delete_file "debug-k-indexer.sh"
delete_file "debug-profile-manager.js"

# =============================================================================
# 3. ROOT-LEVEL FIX SCRIPTS (one-time fixes already applied)
# =============================================================================
echo ""
echo "3. Removing one-time fix scripts..."

delete_file "fix-database-architecture-conflicts.sh"
delete_file "fix-k-indexer-port.js"
delete_file "fix-password-issue.js"
delete_file "fix-testing-dashboard-refs.sh"

# =============================================================================
# 4. ROOT-LEVEL TEST HTML FILES (ad-hoc test pages)
# =============================================================================
echo ""
echo "4. Removing ad-hoc test HTML files from root..."

delete_file "test-checklist-page.html"
delete_file "test-compact-spacing.html"
delete_file "test-external-resources.html"
delete_file "test-kaspa-explorer-cors-final.html"
delete_file "test-reconfiguration-landing.html"
delete_file "test-ui-changes.html"
delete_file "test-wizard-step-visibility.html"

# =============================================================================
# 5. ROOT-LEVEL TEST JS FILES
# =============================================================================
echo ""
echo "5. Removing ad-hoc test JS files from root..."

delete_file "test-external-resource-loading.js"
delete_file "test-kaspa-explorer-cors-fix.js"
delete_file "test-kaspa-explorer-fix.js"
delete_file "test-kaspa-user-apps-full-output.js"
delete_file "test-kaspa-user-apps-no-node.js"
delete_file "test-reconfiguration-implementation.js"
delete_file "regenerate-indexer-compose.js"

# =============================================================================
# 6. BACKUP FILES
# =============================================================================
echo ""
echo "6. Removing backup files..."

# .env backups
for f in .env.backup.*; do
    [ -f "$f" ] && delete_file "$f"
done

# docker-compose backups
for f in docker-compose.yml.backup.*; do
    [ -f "$f" ] && delete_file "$f"
done

# =============================================================================
# 7. WIZARD FRONTEND TEST CRUFT
# =============================================================================
echo ""
echo "7. Removing wizard frontend test files..."

# Test HTML files
delete_file "services/wizard/frontend/test-complete-validation.html"
delete_file "services/wizard/frontend/test-config-loading.html"
delete_file "services/wizard/frontend/test-configuration-ui.html"
delete_file "services/wizard/frontend/test-edit-buttons.html"
delete_file "services/wizard/frontend/test-error-handling.html"
delete_file "services/wizard/frontend/test-form-validation.html"
delete_file "services/wizard/frontend/test-install-progress.html"
delete_file "services/wizard/frontend/test-installation-stages.html"
delete_file "services/wizard/frontend/test-mode-detection.html"
delete_file "services/wizard/frontend/test-next-steps.html"
delete_file "services/wizard/frontend/test-profile-display.html"
delete_file "services/wizard/frontend/test-profile-selection-ui.html"
delete_file "services/wizard/frontend/test-resume-dialog.html"
delete_file "services/wizard/frontend/test-review-validation.html"
delete_file "services/wizard/frontend/test-review.html"
delete_file "services/wizard/frontend/test-service-status.html"
delete_file "services/wizard/frontend/test-state-manager.html"
delete_file "services/wizard/frontend/test-sync-strategy-ui.html"
delete_file "services/wizard/frontend/test-template-configuration-integration.html"
delete_file "services/wizard/frontend/test-template-selection.html"
delete_file "services/wizard/frontend/test-update-mode.html"
delete_file "services/wizard/frontend/test-websocket-integration.html"

# Test JS files
delete_file "services/wizard/frontend/test-backend-integration.js"
delete_file "services/wizard/frontend/test-backward-compatibility-validation.js"
delete_file "services/wizard/frontend/test-complete-workflow-integration.js"
delete_file "services/wizard/frontend/test-error-handling-recovery.js"
delete_file "services/wizard/frontend/test-live-api-integration.js"
delete_file "services/wizard/frontend/test-navigation-state-management.js"
delete_file "services/wizard/frontend/test-review-profile-specific.js"
delete_file "services/wizard/frontend/test-state-manager.js"
delete_file "services/wizard/frontend/test-template-configuration-integration.js"
delete_file "services/wizard/frontend/test-template-configuration-validation.js"
delete_file "services/wizard/frontend/test-template-data-handoff-validation.js"
delete_file "services/wizard/frontend/test-template-docker-compose-generation.js"
delete_file "services/wizard/frontend/test-template-installation-integration.js"

# Test runner files
delete_file "services/wizard/frontend/run-backward-compatibility-tests.js"
delete_file "services/wizard/frontend/run-complete-workflow-tests.js"
delete_file "services/wizard/frontend/run-error-handling-tests.js"
delete_file "services/wizard/frontend/run-integration-tests.js"
delete_file "services/wizard/frontend/run-navigation-tests.js"
delete_file "services/wizard/frontend/run-template-data-handoff-tests.js"
delete_file "services/wizard/frontend/run-template-installation-tests.js"

# Test result/summary markdown files
delete_file "services/wizard/frontend/BACKWARD_COMPATIBILITY_TEST_RESULTS.md"
delete_file "services/wizard/frontend/BACKWARD_COMPATIBILITY_TESTS_README.md"
delete_file "services/wizard/frontend/BACKWARD_COMPATIBILITY_VALIDATION_SUMMARY.md"
delete_file "services/wizard/frontend/COMPLETE_WORKFLOW_INTEGRATION_TESTS_README.md"
delete_file "services/wizard/frontend/ERROR_HANDLING_TESTS_README.md"
delete_file "services/wizard/frontend/NAVIGATION_TESTS_README.md"
delete_file "services/wizard/frontend/TASK_8.4_BACKWARD_COMPATIBILITY_VALIDATION_SUMMARY.md"
delete_file "services/wizard/frontend/TEMPLATE_CONFIGURATION_INTEGRATION_TEST_RESULTS.md"
delete_file "services/wizard/frontend/TEMPLATE_DATA_HANDOFF_TEST_RESULTS.md"
delete_file "services/wizard/frontend/TEMPLATE_DATA_HANDOFF_VALIDATION_SUMMARY.md"
delete_file "services/wizard/frontend/TEMPLATE_INSTALLATION_INTEGRATION_ISSUES.md"

# Backend test file
delete_file "services/wizard/backend/test-enhanced-template-api.js"

# =============================================================================
# 8. DASHBOARD SERVICE CRUFT
# =============================================================================
echo ""
echo "8. Removing dashboard service cruft..."

delete_file "services/dashboard/REFACTORING_COMPLETE.md"
delete_file "services/dashboard/TESTING_GUIDE.md"

# =============================================================================
# 9. IMPLEMENTATION SUMMARIES - DASHBOARD TEST FIXES
# =============================================================================
echo ""
echo "9. Removing redundant dashboard test fix summaries..."

delete_file "docs/implementation-summaries/dashboard/DASHBOARD_TEST_CLEANUP_FIX.md"
delete_file "docs/implementation-summaries/dashboard/DASHBOARD_TEST_FINAL_FIX.md"
delete_file "docs/implementation-summaries/dashboard/DASHBOARD_TEST_FIX.md"
delete_file "docs/implementation-summaries/dashboard/DASHBOARD_TEST_QUICKSTART.md"

# =============================================================================
# 10. ROOT CHECKLIST FILE
# =============================================================================
echo ""
echo "10. Removing root-level checklist..."

delete_file "DATABASE_PER_SERVICE_IMPLEMENTATION_CHECKLIST.md"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo "  Files/directories deleted: $DELETED_COUNT"
echo "  Already missing (skipped): $SKIPPED_COUNT"
echo ""
echo "Note: Run 'git status' to review changes before committing."
echo ""
