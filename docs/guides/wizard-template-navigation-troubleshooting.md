# Wizard Template Navigation Troubleshooting Guide

## Overview

This guide provides troubleshooting information for developers working with the wizard template-profile navigation system. It covers common issues, debugging techniques, and resolution strategies.

## Quick Diagnostic Tools

### State Inspector

Add this to your browser console for immediate state inspection:

```javascript
function inspectWizardState() {
  const state = stateManager.getState();
  
  console.group('🔍 Wizard State Inspector');
  console.table({
    'Current Step': state.currentStep,
    'Step ID': getStepId(state.currentStep),
    'Navigation Path': state.navigationPath || 'Not set',
    'Selected Template': state.selectedTemplate || 'None',
    'Template Applied': state.templateApplied || false,
    'Selected Profiles': state.selectedProfiles?.join(', ') || 'None',
    'Navigation History': state.navigationHistory?.join(' → ') || 'Empty'
  });
  
  const validation = stateManager.validateStateConsistency();
  console.log('State Validation:', validation);
  
  if (!validation.valid) {
    console.error('❌ State Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ State Warnings:', validation.warnings);
  }
  
  console.groupEnd();
}

// Usage: inspectWizardState()
```

### Navigation Tracer

Enable detailed navigation logging:

```javascript
// Add to main.js or navigation.js
function enableNavigationTracing() {
  document.addEventListener('stepEntry', (event) => {
    console.log(`[NAV] 📍 Step ${event.detail.stepNumber} (${event.detail.stepId})`);
    console.log(`[NAV] 🧭 Path: ${stateManager.get('navigationPath') || 'unset'}`);
    console.log(`[NAV] 📚 History: ${stateManager.get('navigationHistory')?.join(' → ') || 'empty'}`);
  });
  
  // Override navigation functions to add logging
  const originalNextStep = nextStep;
  window.nextStep = function() {
    console.log('[NAV] ➡️ Next step requested');
    return originalNextStep.apply(this, arguments);
  };
  
  const originalPreviousStep = previousStep;
  window.previousStep = function() {
    console.log('[NAV] ⬅️ Previous step requested');
    return originalPreviousStep.apply(this, arguments);
  };
}

// Usage: enableNavigationTracing()
```

## Common Issues and Solutions

### 1. Navigation Stuck on Templates Step

#### Symptoms
- User clicks "Use Template" but nothing happens
- Continue button remains disabled
- No navigation to Configuration step

#### Diagnosis
```javascript
// Check template application status
console.log('Template applied:', stateManager.get('templateApplied'));
console.log('Selected template:', stateManager.get('selectedTemplate'));
console.log('Navigation path:', stateManager.get('navigationPath'));

// Check for JavaScript errors
console.log('Recent errors:', window.onerror);
```

#### Common Causes and Solutions

**Cause 1: Template application failed silently**
```javascript
// Check browser network tab for failed API calls
// Look for errors in template application

// Solution: Enable fallback
if (window.templateSelection) {
  window.templateSelection.enableCustomSetupFallback();
}
```

**Cause 2: Navigation path not set**
```javascript
// Check navigation path
const path = stateManager.get('navigationPath');
if (!path) {
  // Force set navigation path
  stateManager.setNavigationPath('template');
  stateManager.set('templateApplied', true);
}
```

**Cause 3: State inconsistency**
```javascript
// Validate and recover state
const validation = stateManager.validateStateConsistency();
if (!validation.valid) {
  const recovery = stateManager.recoverFromInvalidState();
  console.log('Recovery result:', recovery);
}
```

### 2. Back Navigation Goes to Wrong Step

#### Symptoms
- Back button from Configuration goes to wrong step
- Navigation history seems corrupted
- Unexpected step transitions

#### Diagnosis
```javascript
// Check current navigation context
const currentStep = stateManager.get('currentStep');
const navigationPath = stateManager.get('navigationPath');
const history = stateManager.get('navigationHistory');

console.log('Current step:', currentStep);
console.log('Navigation path:', navigationPath);
console.log('History:', history);

// Check expected back target
if (currentStep === 6) { // Configuration step
  const expectedTarget = navigationPath === 'template' ? 4 : 5;
  console.log('Expected back target:', expectedTarget);
}
```

#### Solutions

**Fix navigation path**:
```javascript
// Determine correct path based on state
const templateApplied = stateManager.get('templateApplied');
const selectedProfiles = stateManager.get('selectedProfiles') || [];

if (templateApplied) {
  stateManager.setNavigationPath('template');
} else if (selectedProfiles.length > 0) {
  stateManager.setNavigationPath('custom');
}
```

**Clear corrupted history**:
```javascript
// Clear and rebuild navigation history
stateManager.clearHistory();
// History will be rebuilt as user navigates
```

### 3. Template Loading Failures

#### Symptoms
- Templates don't appear in grid
- "Loading templates..." message persists
- API errors in network tab

#### Diagnosis
```javascript
// Test API connectivity
async function testTemplateAPI() {
  try {
    const response = await fetch('/api/simple-templates/all');
    console.log('API Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Templates loaded:', data.templates?.length || 0);
    } else {
      console.error('API Error:', await response.text());
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

testTemplateAPI();
```

#### Solutions

**Enable fallback templates**:
```javascript
// Force fallback templates
if (window.templateSelection) {
  window.templateSelection.templates = window.templateSelection.getFallbackTemplates();
  window.templateSelection.renderTemplates();
}
```

**Enable custom setup fallback**:
```javascript
// Make custom setup prominent
if (window.templateSelection) {
  window.templateSelection.enableCustomSetupFallback();
}
```

### 4. State Inconsistency Errors

#### Symptoms
- Console errors about state validation
- Unexpected behavior during navigation
- Multiple paths appearing active

#### Diagnosis
```javascript
// Comprehensive state check
function diagnoseStateIssues() {
  const state = stateManager.getState();
  const validation = stateManager.validateStateConsistency();
  
  console.group('🔧 State Diagnosis');
  
  // Check for conflicting states
  if (state.navigationPath === 'template') {
    if (!state.selectedTemplate) {
      console.error('❌ Template path but no template selected');
    }
    if (!state.templateApplied) {
      console.warn('⚠️ Template selected but not applied');
    }
    if (state.selectedProfiles?.length > 0 && !state.templateApplied) {
      console.error('❌ Template path but profiles manually selected');
    }
  }
  
  if (state.navigationPath === 'custom') {
    if (state.templateApplied) {
      console.error('❌ Custom path but template is applied');
    }
    if (state.selectedProfiles?.length === 0) {
      console.warn('⚠️ Custom path but no profiles selected');
    }
  }
  
  console.log('Full validation:', validation);
  console.groupEnd();
}

diagnoseStateIssues();
```

#### Solutions

**Automatic recovery**:
```javascript
// Attempt automatic state recovery
const recovery = stateManager.recoverFromInvalidState();
console.log('Recovery result:', recovery);

if (!recovery.finalValid) {
  console.error('Automatic recovery failed:', recovery.remainingErrors);
  // Manual intervention required
}
```

**Manual state cleanup**:
```javascript
// Clear all navigation state and start fresh
stateManager.set('navigationPath', null);
stateManager.set('selectedTemplate', null);
stateManager.set('templateApplied', false);
stateManager.set('selectedProfiles', []);
stateManager.clearHistory();

// User will need to make selection again
goToStep(4); // Templates step
```

### 5. Template Application Failures

#### Symptoms
- Template selection appears to work but configuration isn't populated
- API errors during template application
- Template state shows applied but configuration is empty

#### Diagnosis
```javascript
// Test template application
async function testTemplateApplication(templateId) {
  try {
    console.log(`Testing template application: ${templateId}`);
    
    // Test validation
    const validationResponse = await fetch(`/api/simple-templates/${templateId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const validation = await validationResponse.json();
    console.log('Validation result:', validation);
    
    if (!validation.valid) {
      console.error('Template validation failed:', validation.errors);
      return;
    }
    
    // Test application
    const applyResponse = await fetch(`/api/simple-templates/${templateId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseConfig: stateManager.get('configuration') || {}
      })
    });
    
    const applyResult = await applyResponse.json();
    console.log('Application result:', applyResult);
    
  } catch (error) {
    console.error('Template application test failed:', error);
  }
}

// Usage: testTemplateApplication('home-node')
```

#### Solutions

**Check API endpoints**:
```javascript
// Verify backend is running and endpoints are available
const endpoints = [
  '/api/simple-templates/all',
  '/api/simple-templates/home-node/validate',
  '/api/simple-templates/home-node/apply'
];

for (const endpoint of endpoints) {
  fetch(endpoint, { method: endpoint.includes('validate') || endpoint.includes('apply') ? 'POST' : 'GET' })
    .then(response => console.log(`${endpoint}: ${response.status}`))
    .catch(error => console.error(`${endpoint}: ${error.message}`));
}
```

**Manual configuration merge**:
```javascript
// If template application fails, manually merge configuration
const template = {
  id: 'home-node',
  profiles: ['core', 'kaspa-user-applications'],
  config: {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    PUBLIC_NODE: false
  }
};

// Merge with existing configuration
const existingConfig = stateManager.get('configuration') || {};
const mergedConfig = {
  ...existingConfig,
  ...template.config,
  templateId: template.id,
  templateProfiles: template.profiles
};

stateManager.set('configuration', mergedConfig);
stateManager.set('selectedTemplate', template.id);
stateManager.set('selectedProfiles', template.profiles);
stateManager.set('templateApplied', true);
stateManager.setNavigationPath('template');
```

## Debugging Techniques

### 1. Network Debugging

Monitor API calls in browser DevTools:

```javascript
// Override fetch to log all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (url.includes('/api/')) {
    console.log(`[API] 📡 ${args[1]?.method || 'GET'} ${url}`);
  }
  
  return originalFetch.apply(this, args)
    .then(response => {
      if (url.includes('/api/')) {
        console.log(`[API] ✅ ${response.status} ${url}`);
      }
      return response;
    })
    .catch(error => {
      if (url.includes('/api/')) {
        console.error(`[API] ❌ ${url}:`, error);
      }
      throw error;
    });
};
```

### 2. State Change Monitoring

Monitor all state changes:

```javascript
// Override state manager to log changes
const originalSet = stateManager.set;
stateManager.set = function(key, value) {
  console.log(`[STATE] 📝 ${key}:`, value);
  return originalSet.call(this, key, value);
};

const originalUpdate = stateManager.update;
stateManager.update = function(key, updates) {
  console.log(`[STATE] 🔄 ${key}:`, updates);
  return originalUpdate.call(this, key, updates);
};
```

### 3. Event Debugging

Monitor wizard events:

```javascript
// Log all wizard-related events
const wizardEvents = ['stepEntry', 'templateSelected', 'templateApplied', 'navigationPathChanged'];

wizardEvents.forEach(eventType => {
  document.addEventListener(eventType, (event) => {
    console.log(`[EVENT] 🎯 ${eventType}:`, event.detail);
  });
});
```

## Recovery Procedures

### Complete State Reset

When all else fails, reset the wizard to a clean state:

```javascript
function resetWizardCompletely() {
  console.log('🔄 Performing complete wizard reset');
  
  // Clear all state
  stateManager.reset();
  
  // Clear any cached data
  if (window.templateSelection) {
    window.templateSelection.templates = [];
    window.templateSelection.selectedTemplate = null;
  }
  
  // Clear UI state
  document.querySelectorAll('.wizard-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Reset to welcome step
  goToStep(1);
  
  console.log('✅ Wizard reset complete');
}
```

### Partial State Recovery

Recover specific parts of the state:

```javascript
function recoverNavigationState() {
  console.log('🔧 Recovering navigation state');
  
  const currentStep = stateManager.get('currentStep');
  const templateApplied = stateManager.get('templateApplied');
  const selectedProfiles = stateManager.get('selectedProfiles') || [];
  
  // Determine correct navigation path
  if (templateApplied) {
    stateManager.setNavigationPath('template');
    console.log('✅ Set navigation path to template');
  } else if (selectedProfiles.length > 0) {
    stateManager.setNavigationPath('custom');
    console.log('✅ Set navigation path to custom');
  } else {
    stateManager.set('navigationPath', null);
    console.log('✅ Cleared navigation path');
  }
  
  // Update UI to match state
  updateStepNumbering();
  updateProgressIndicator(currentStep);
}
```

## Performance Debugging

### Memory Leaks

Check for memory leaks in state management:

```javascript
function checkMemoryUsage() {
  const state = stateManager.getState();
  const stateSize = JSON.stringify(state).length;
  
  console.log(`State size: ${stateSize} characters`);
  console.log(`Navigation history length: ${state.navigationHistory?.length || 0}`);
  
  // Check for excessive history
  if (state.navigationHistory?.length > 50) {
    console.warn('⚠️ Navigation history is getting large, consider clearing');
    stateManager.clearHistory();
  }
  
  // Check for large configuration objects
  const configSize = JSON.stringify(state.configuration || {}).length;
  if (configSize > 10000) {
    console.warn('⚠️ Configuration object is large:', configSize, 'characters');
  }
}
```

### Performance Monitoring

Monitor navigation performance:

```javascript
function monitorNavigationPerformance() {
  const originalGoToStep = goToStep;
  
  window.goToStep = function(stepNumber) {
    const startTime = performance.now();
    
    const result = originalGoToStep.call(this, stepNumber);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`[PERF] Navigation to step ${stepNumber} took ${duration.toFixed(2)}ms`);
    
    if (duration > 100) {
      console.warn(`⚠️ Slow navigation detected: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  };
}
```

## Testing Utilities

### Mock Template API

For testing when backend is unavailable:

```javascript
function mockTemplateAPI() {
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options) {
    if (url.includes('/api/simple-templates/all')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          templates: [
            {
              id: 'test-template',
              name: 'Test Template',
              category: 'beginner',
              description: 'Test template for debugging',
              profiles: ['core', 'kaspa-user-applications'],
              resources: { minMemory: 4, minCpu: 2, minDisk: 50 },
              config: { KASPA_NODE_RPC_PORT: 16110 }
            }
          ]
        })
      });
    }
    
    if (url.includes('/validate')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          errors: [],
          warnings: []
        })
      });
    }
    
    if (url.includes('/apply')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          config: { KASPA_NODE_RPC_PORT: 16110, templateId: 'test-template' }
        })
      });
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  console.log('✅ Template API mocked for testing');
}
```

### State Validation Testing

Test state validation logic:

```javascript
function testStateValidation() {
  console.group('🧪 Testing State Validation');
  
  // Test valid template state
  stateManager.set('navigationPath', 'template');
  stateManager.set('selectedTemplate', 'test-template');
  stateManager.set('templateApplied', true);
  stateManager.set('selectedProfiles', ['core']);
  
  let validation = stateManager.validateStateConsistency();
  console.log('Valid template state:', validation.valid ? '✅' : '❌', validation);
  
  // Test invalid state (conflicting paths)
  stateManager.set('navigationPath', 'template');
  stateManager.set('selectedTemplate', null);
  
  validation = stateManager.validateStateConsistency();
  console.log('Invalid template state:', validation.valid ? '✅' : '❌', validation);
  
  // Test recovery
  const recovery = stateManager.recoverFromInvalidState();
  console.log('Recovery result:', recovery);
  
  console.groupEnd();
}
```

## Best Practices for Debugging

1. **Always check state consistency** before investigating navigation issues
2. **Use browser DevTools Network tab** to monitor API calls
3. **Enable verbose logging** during development
4. **Test with mock data** when backend is unavailable
5. **Validate assumptions** about state and navigation flow
6. **Use recovery procedures** rather than forcing state changes
7. **Monitor performance** during navigation operations
8. **Test error scenarios** to ensure proper fallback behavior

## Getting Help

When reporting issues, include:

1. **Current wizard state** (use `inspectWizardState()`)
2. **Navigation history** and current step
3. **Browser console errors** and warnings
4. **Network tab** showing API calls and responses
5. **Steps to reproduce** the issue
6. **Expected vs actual behavior**

This information will help developers quickly identify and resolve navigation issues.