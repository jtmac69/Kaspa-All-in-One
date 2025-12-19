# Scenario 5: Documentation Alignment Recommendation

## Issue Identified

During testing of Scenario 5: Reconfiguration, a significant discrepancy was found between the TESTING.md documentation and the actual wizard behavior.

## Current Behavior vs. Documentation

### What Actually Happens:
1. `./start-test.sh` checks for existing state files (`.kaspa-aio/`, `.env`)
2. Prompts: "Remove existing state and start fresh? (Y/n)"
3. If user answers 'n', wizard starts normally
4. Wizard does not detect or display existing Docker containers/services
5. No sophisticated reconfiguration interface exists

### What TESTING.md Documents:
1. Sophisticated "Existing Installation Detected" screen
2. Display of currently installed services and configuration details
3. Options like "Add Services", "Modify Installation", "Reconfigure"
4. Full reconfiguration workflow with service addition/removal
5. Preservation of existing services during reconfiguration

## Root Cause

The TESTING.md documentation was written to describe an ideal reconfiguration feature that has not been implemented in the wizard backend. The current wizard focuses on fresh installations rather than modifying existing ones.

## Recommendation: Update Documentation

**Recommended Action**: Update TESTING.md Scenario 5 to reflect the current wizard behavior rather than implementing the complex reconfiguration features.

### Reasons:
1. **Test Release Scope**: v0.9.0-test should focus on testing existing functionality
2. **Implementation Complexity**: Full reconfiguration would require major wizard backend changes
3. **Testing Priority**: Current wizard features need validation before adding advanced capabilities
4. **User Expectations**: Documentation should match actual behavior to avoid confusion

## Proposed Scenario 5 Revision

Replace the current Scenario 5 with a simpler test that focuses on:

1. **State File Handling**: Test how wizard handles existing `.env` and `.kaspa-aio/` files
2. **Fresh Start Process**: Test the "start fresh" workflow when existing state is detected
3. **Container Cleanup**: Test that old containers are properly handled
4. **Data Preservation**: Test that user can choose to preserve or remove existing data

### New Scenario 5 Focus:
- **Goal**: Test wizard's handling of existing installation artifacts
- **Duration**: 10-15 minutes (reduced from 20-30)
- **Complexity**: 🟢 Beginner (reduced from 🟡 Intermediate)

## Implementation Steps

1. **Update TESTING.md**: Rewrite Scenario 5 to match current behavior
2. **Add Note**: Include note that advanced reconfiguration is planned for future releases
3. **Reference Fresh Start**: Point users to `./fresh-start.sh` for clean reinstallation
4. **Update Links**: Fix any references to the old Scenario 5 content

## Future Consideration

The documented reconfiguration features could be implemented in a future release (v1.0 or later) as an "Advanced Reconfiguration" feature, but should not block the current test release.

## Status

- **Issue**: Identified ✅
- **Recommendation**: Provided ✅
- **Implementation**: Pending user approval