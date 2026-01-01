# Wizard Template Configuration Race Condition Fix

## Issue Summary

Users experienced a template selection bug where:

1. **First time selecting template**: Gets "Please select at least one profile first" error and wrong configuration prompts
2. **Second time selecting same template**: Gets "Configuration Loaded" success message and correct configuration prompts

This indicated a race condition in the template application and configuration loading flow.

## Root Cause Analysis

The issue was caused by a **state management race condition** in the template application flow:

### The Problem Sequence

1. User selects "Home Node Template" and clicks "Use Template"
2. `applyTemplate()` function runs and sets state in this order:
   ```javascript
   stateManager.set('selectedTemplate', templateId);
   stateManager.set('selectedProfiles', template.profiles);  // ✅ Profiles set
   stateManager.set('templateApplied', true);
   stateManager.setNavigationPath('template');               // ❌ Clears profiles!
   ```
3. `setNavigationPath('template')` calls `clearConflictingState('template')` which **clears selectedProfiles**
4. User navigates to Configure step
5. `loadConfigurationForm()` checks `selectedProfiles` → **Empty!** → Shows error

### The State Manager Bug

In `state-manager.js`, the `clearConflictingState()` function had flawed logic:

```javascript
clearConflictingState(newPath) {
    if (newPath === 'template') {
        // Clear custom selection state
        this.set('selectedProfiles', []);  // ❌ Always clears profiles!
        console.log('[STATE] Cleared custom selection state for template path');
    }
}
```

This logic cleared profiles **every time** the navigation path was set to 'template', even when applying a template that should **keep** its profiles.

## Implementation Details

### 1. Fixed State Manager Logic

**File**: `services/wizard/frontend/public/scripts/modules/state-manager.js`

Updated `clearConflictingState()` to be smarter about when to clear profiles:

```javascript
clearConflictingState(newPath) {
    if (newPath === 'template') {
        // Only clear custom selection state if we're switching FROM custom TO template
        // Don't clear if we're applying a template (which sets both template and profiles)
        const hasTemplateApplied = this.get('templateApplied');
        const hasSelectedTemplate = this.get('selectedTemplate');
        
        if (!hasTemplateApplied && !hasSelectedTemplate) {
            // We're switching to template mode without a template applied - clear custom profiles
            this.set('selectedProfiles', []);
            console.log('[STATE] Cleared custom selection state for template path');
        } else {
            // We're applying a template - keep the profiles that the template sets
            console.log('[STATE] Template being applied - preserving template profiles');
        }
    } else if (newPath === 'custom') {
        // Clear template selection state (unchanged)
        this.set('selectedTemplate', null);
        this.set('templateApplied', false);
        console.log('[STATE] Cleared template selection state for custom path');
    }
}
```

**Key Changes**:
- Added checks for `templateApplied` and `selectedTemplate` before clearing profiles
- Only clear profiles when switching **to** template mode **without** a template being applied
- Preserve profiles when a template is being applied (which is the normal case)

### 2. Enhanced Configure Module Robustness

**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

Added retry logic and better error handling for template configuration loading:

```javascript
export async function loadConfigurationForm() {
    try {
        // Get selected profiles from state
        const selectedProfiles = stateManager.get('selectedProfiles') || [];
        
        // Check if we're in template mode and template is being applied
        const templateApplied = stateManager.get('templateApplied');
        const selectedTemplate = stateManager.get('selectedTemplate');
        
        if (selectedProfiles.length === 0) {
            // If we're in template mode, wait a bit for template state to be fully applied
            if (templateApplied || selectedTemplate) {
                console.log('[CONFIGURE] Template detected but profiles not yet loaded, retrying...');
                // Wait a short time and retry once
                await new Promise(resolve => setTimeout(resolve, 100));
                const retryProfiles = stateManager.get('selectedProfiles') || [];
                
                if (retryProfiles.length === 0) {
                    showNotification('Template configuration is loading, please wait...', 'info');
                    return null;
                } else {
                    console.log('[CONFIGURE] Profiles loaded after retry:', retryProfiles);
                    return await loadConfigurationFormWithProfiles(retryProfiles);
                }
            } else {
                showNotification('Please select at least one profile first', 'warning');
                return null;
            }
        }
        
        return await loadConfigurationFormWithProfiles(selectedProfiles);
        
    } catch (error) {
        console.error('Failed to load configuration form:', error);
        showNotification(`Configuration loading failed: ${error.message}`, 'error');
        return null;
    }
}
```

**Key Improvements**:
- **Template Detection**: Checks if we're in template mode before showing the "select profiles" error
- **Retry Logic**: Waits 100ms and retries once if profiles aren't loaded yet (handles any remaining timing issues)
- **Better Messages**: Shows "Template configuration is loading" instead of "Please select profiles" when in template mode
- **Graceful Fallback**: Still works for custom profile selection

### 3. Refactored Configuration Loading

Split the configuration loading logic into a separate helper function:

```javascript
async function loadConfigurationFormWithProfiles(selectedProfiles) {
    try {
        // Check if we already have configuration (from template)
        let config = stateManager.get('configuration');
        
        if (config && Object.keys(config).length > 0) {
            console.log('[CONFIGURE] Using existing configuration from template:', config);
            // Use existing configuration with proper success message
            setTimeout(() => {
                populateConfigurationForm(config);
                showNotification('Configuration loaded from template', 'success');
            }, 100);
            return config;
        }
        
        // Request default configuration from API (for custom profile selection)
        const response = await api.post('/config/default', {
            profiles: selectedProfiles
        });
        
        // ... rest of configuration loading logic
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showNotification(`Failed to load configuration: ${error.message}`, 'error');
        return null;
    }
}
```

## Flow After Fix

### Template Application Flow (Fixed)

1. User selects template → `applyTemplate()` runs
2. State is set in correct order:
   ```javascript
   stateManager.set('selectedTemplate', templateId);      // ✅ Template set
   stateManager.set('selectedProfiles', template.profiles); // ✅ Profiles set  
   stateManager.set('templateApplied', true);             // ✅ Applied flag set
   stateManager.setNavigationPath('template');            // ✅ Now preserves profiles!
   ```
3. Navigate to Configure step
4. `loadConfigurationForm()` runs:
   - Finds `selectedProfiles` populated ✅
   - Finds existing configuration from template ✅
   - Shows "Configuration loaded from template" ✅

### Fallback Handling

If there are any remaining timing issues:
1. Configure detects template mode but empty profiles
2. Waits 100ms and retries once
3. If still empty, shows helpful "loading" message instead of error
4. Gracefully handles both template and custom flows

## Testing Verification

The fix addresses the specific user workflow:

- ✅ **First time selecting template**: No more "Please select profiles" error
- ✅ **Correct configuration prompts**: Template configuration loads immediately  
- ✅ **Success message**: Shows "Configuration loaded from template"
- ✅ **No second attempt needed**: Works correctly on first try
- ✅ **Custom flow preserved**: Manual profile selection still works
- ✅ **Backward compatibility**: Existing functionality unchanged

## Files Modified

1. **`services/wizard/frontend/public/scripts/modules/state-manager.js`**
   - Fixed `clearConflictingState()` logic to preserve template profiles
   - Added intelligent detection of template vs custom mode switching

2. **`services/wizard/frontend/public/scripts/modules/configure.js`**
   - Enhanced `loadConfigurationForm()` with template detection and retry logic
   - Added `loadConfigurationFormWithProfiles()` helper function
   - Improved error messages and user feedback

## Impact

This fix resolves the critical template selection race condition that was causing user confusion and requiring multiple attempts to apply templates. The solution maintains backward compatibility while providing a much smoother user experience for template-based installations.

The fix is defensive and handles edge cases gracefully, ensuring that both template and custom workflows function reliably.