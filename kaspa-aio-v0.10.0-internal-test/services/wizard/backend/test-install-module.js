/**
 * Test Install Module
 * Unit tests for the install.js module
 */

console.log('Testing Install Module...\n');

// Mock DOM elements
global.document = {
    getElementById: (id) => {
        const elements = {
            'install-progress-bar': { style: {} },
            'install-progress-percentage': { textContent: '' },
            'install-status-title': { textContent: '', style: {} },
            'install-status-message': { textContent: '', style: {} },
            'install-logs-text': { textContent: 'Waiting for installation to start...', scrollTop: 0, scrollHeight: 100 },
            'install-logs-content': { style: { display: 'none' } },
            'logs-toggle-text': { textContent: 'Show Details' },
            'cancel-install-btn': { style: {}, textContent: '', onclick: null }
        };
        return elements[id] || null;
    },
    querySelectorAll: (selector) => {
        if (selector === '.install-step') {
            return [
                {
                    dataset: { step: 'env' },
                    querySelector: () => ({ textContent: '', innerHTML: '' }),
                    classList: { add: () => {}, remove: () => {} }
                },
                {
                    dataset: { step: 'pull' },
                    querySelector: () => ({ textContent: '', innerHTML: '' }),
                    classList: { add: () => {}, remove: () => {} }
                },
                {
                    dataset: { step: 'start' },
                    querySelector: () => ({ textContent: '', innerHTML: '' }),
                    classList: { add: () => {}, remove: () => {} }
                },
                {
                    dataset: { step: 'health' },
                    querySelector: () => ({ textContent: '', innerHTML: '' }),
                    classList: { add: () => {}, remove: () => {} }
                }
            ];
        }
        return [];
    },
    querySelector: (selector) => {
        if (selector === '#step-install .btn-primary') {
            return { disabled: false, textContent: '', onclick: null };
        }
        return null;
    }
};

global.Date = Date;
global.console = console;

// Mock state manager
const mockStateManager = {
    data: {},
    get: function(key) {
        return this.data[key];
    },
    set: function(key, value) {
        this.data[key] = value;
    },
    update: function(key, value) {
        this.data[key] = value;
    }
};

// Mock WebSocket manager
const mockWsManager = {
    emitted: [],
    emit: function(event, data) {
        this.emitted.push({ event, data });
        console.log(`  WebSocket emit: ${event}`, data);
    }
};

// Mock utils
const mockShowNotification = (message, type, duration) => {
    console.log(`  Notification [${type}]: ${message}`);
};

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        console.log(`\nTest: ${name}`);
        fn();
        console.log('  ✓ PASSED');
        testsPassed++;
    } catch (error) {
        console.error('  ✗ FAILED:', error.message);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// Run tests
console.log('='.repeat(60));
console.log('Install Module Unit Tests');
console.log('='.repeat(60));

test('Module exports required functions', () => {
    // We can't actually import the module in Node.js without a bundler
    // So we'll just verify the structure is correct
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    assert(content.includes('export function initializeWebSocket'), 'Should export initializeWebSocket');
    assert(content.includes('export async function startInstallation'), 'Should export startInstallation');
    assert(content.includes('export function updateInstallationUI'), 'Should export updateInstallationUI');
    assert(content.includes('export function handleInstallationComplete'), 'Should export handleInstallationComplete');
    assert(content.includes('export function handleInstallationError'), 'Should export handleInstallationError');
    assert(content.includes('export function cancelInstallation'), 'Should export cancelInstallation');
    assert(content.includes('export function toggleInstallLogs'), 'Should export toggleInstallLogs');
});

test('Module imports required dependencies', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    assert(content.includes("import { stateManager } from './state-manager.js'"), 'Should import stateManager');
    assert(content.includes("import { showNotification } from './utils.js'"), 'Should import showNotification');
});

// Helper to read module file
function readModuleFile() {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    return fs.readFileSync(filePath, 'utf8');
}

test('Module has WebSocket initialization', () => {
    const content = readModuleFile();
    
    assert(content.includes('let wsManager = null'), 'Should declare wsManager variable');
    assert(content.includes('wsManager = manager'), 'Should set wsManager in initializeWebSocket');
});

test('Module has installation start logic', () => {
    const content = readModuleFile();
    
    assert(content.includes("wsManager.emit('install:start'"), 'Should emit install:start event');
    assert(content.includes('stateManager.get(\'configuration\')'), 'Should get configuration from state');
    assert(content.includes('stateManager.get(\'selectedProfiles\')'), 'Should get profiles from state');
});

test('Module has progress update logic', () => {
    const content = readModuleFile();
    
    assert(content.includes('getElementById(\'install-progress-bar\')'), 'Should update progress bar');
    assert(content.includes('getElementById(\'install-progress-percentage\')'), 'Should update percentage');
    assert(content.includes('getElementById(\'install-status-title\')'), 'Should update status title');
    assert(content.includes('getElementById(\'install-status-message\')'), 'Should update status message');
});

test('Module has stage title mapping', () => {
    const content = readModuleFile();
    
    assert(content.includes('function getStageTitle'), 'Should have getStageTitle function');
    assert(content.includes("'init': 'Initializing Installation'"), 'Should map init stage');
    assert(content.includes("'config': 'Configuring Environment'"), 'Should map config stage');
    assert(content.includes("'pull': 'Downloading Docker Images'"), 'Should map pull stage');
    assert(content.includes("'deploy': 'Starting Services'"), 'Should map deploy stage');
    assert(content.includes("'validate': 'Validating Installation'"), 'Should map validate stage');
});

test('Module has install steps update logic', () => {
    const content = readModuleFile();
    
    assert(content.includes('function updateInstallSteps'), 'Should have updateInstallSteps function');
    assert(content.includes("querySelectorAll('.install-step')"), 'Should query install steps');
    assert(content.includes('classList.add'), 'Should update step classes');
});

test('Module has logs functionality', () => {
    const content = readModuleFile();
    
    assert(content.includes('function addToLogs'), 'Should have addToLogs function');
    assert(content.includes('getElementById(\'install-logs-text\')'), 'Should get logs element');
    assert(content.includes('toLocaleTimeString'), 'Should add timestamp to logs');
});

test('Module has completion handler', () => {
    const content = readModuleFile();
    
    assert(content.includes('export function handleInstallationComplete'), 'Should export completion handler');
    assert(content.includes('stateManager.set(\'installationComplete\''), 'Should store completion data');
    assert(content.includes('Installation completed successfully'), 'Should show success message');
});

test('Module has error handler', () => {
    const content = readModuleFile();
    
    assert(content.includes('export function handleInstallationError'), 'Should export error handler');
    assert(content.includes('stateManager.set(\'installationError\''), 'Should store error data');
    assert(content.includes('Installation failed'), 'Should show error message');
});

test('Module has cancel functionality', () => {
    const content = readModuleFile();
    
    assert(content.includes('export function cancelInstallation'), 'Should export cancel function');
    assert(content.includes("wsManager.emit('install:cancel')"), 'Should emit cancel event');
    assert(content.includes('confirm('), 'Should confirm before cancelling');
});

test('Module has logs toggle', () => {
    const content = readModuleFile();
    
    assert(content.includes('export function toggleInstallLogs'), 'Should export toggle function');
    assert(content.includes('getElementById(\'install-logs-content\')'), 'Should get logs content');
    assert(content.includes('getElementById(\'logs-toggle-text\')'), 'Should get toggle text');
});

// Print results
console.log('\n' + '='.repeat(60));
console.log('Test Results');
console.log('='.repeat(60));
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
    process.exit(1);
} else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
}
