/**
 * Test: Node Sync Strategy Options
 * 
 * Tests the sync strategy functionality including:
 * - handleNodeSync() - Presents sync options to user
 * - executeSyncStrategy() - Executes user's choice
 * - monitorSyncProgress() - Monitors sync with callbacks
 * - getRecommendedStrategy() - Suggests best strategy
 */

const NodeSyncManager = require('./src/utils/node-sync-manager');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    console.log(`\n${colors.cyan}━━━ ${name} ━━━${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

async function runTests() {
    const manager = new NodeSyncManager();
    let passed = 0;
    let failed = 0;

    console.log('\n' + '='.repeat(60));
    log('Node Sync Strategy Tests', 'cyan');
    console.log('='.repeat(60));

    // Test 1: Handle node sync - needs sync
    logTest('Test 1: Handle node sync when sync required');
    try {
        // Mock a node that needs sync
        const mockSyncStatus = {
            connected: true,
            synced: false,
            currentBlock: 5000000,
            targetBlock: 10000000,
            percentage: 50,
            estimatedTimeRemaining: 3600 // 1 hour
        };

        // Override getSyncStatus for testing
        const originalGetSyncStatus = manager.getSyncStatus.bind(manager);
        manager.getSyncStatus = async () => mockSyncStatus;

        const result = await manager.handleNodeSync({ host: 'localhost', port: 16110 });

        if (result.action === 'needs-sync') {
            logSuccess('Correctly identified sync requirement');
            
            if (result.options && result.options.length === 3) {
                logSuccess('Provided 3 sync strategy options');
                
                const optionIds = result.options.map(o => o.id);
                if (optionIds.includes('wait') && optionIds.includes('background') && optionIds.includes('skip')) {
                    logSuccess('All expected options present: wait, background, skip');
                } else {
                    logError('Missing expected options');
                    failed++;
                }
                
                const recommended = result.options.find(o => o.recommended);
                if (recommended) {
                    logSuccess(`Recommended strategy: ${recommended.id}`);
                } else {
                    logError('No recommended strategy marked');
                    failed++;
                }
            } else {
                logError('Did not provide 3 options');
                failed++;
            }
            
            if (result.syncStatus) {
                logSuccess('Included sync status in result');
            }
            
            passed++;
        } else {
            logError(`Expected action 'needs-sync', got '${result.action}'`);
            failed++;
        }

        // Restore original method
        manager.getSyncStatus = originalGetSyncStatus;
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 2: Handle node sync - already synced
    logTest('Test 2: Handle node sync when already synced');
    try {
        const mockSyncStatus = {
            connected: true,
            synced: true,
            currentBlock: 10000000,
            targetBlock: 10000000,
            percentage: 100,
            estimatedTimeRemaining: 0
        };

        const originalGetSyncStatus = manager.getSyncStatus.bind(manager);
        manager.getSyncStatus = async () => mockSyncStatus;

        const result = await manager.handleNodeSync({ host: 'localhost', port: 16110 });

        if (result.action === 'proceed') {
            logSuccess('Correctly identified node is already synced');
            passed++;
        } else {
            logError(`Expected action 'proceed', got '${result.action}'`);
            failed++;
        }

        manager.getSyncStatus = originalGetSyncStatus;
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 3: Handle node sync - connection error
    logTest('Test 3: Handle node sync when connection fails');
    try {
        const mockSyncStatus = {
            connected: false,
            error: 'Connection refused',
            synced: false,
            progress: 0
        };

        const originalGetSyncStatus = manager.getSyncStatus.bind(manager);
        manager.getSyncStatus = async () => mockSyncStatus;

        const result = await manager.handleNodeSync({ host: 'localhost', port: 16110 });

        if (result.action === 'error') {
            logSuccess('Correctly identified connection error');
            
            if (result.fallbackRequired) {
                logSuccess('Marked fallback as required');
            }
            
            passed++;
        } else {
            logError(`Expected action 'error', got '${result.action}'`);
            failed++;
        }

        manager.getSyncStatus = originalGetSyncStatus;
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 4: Execute "wait" strategy
    logTest('Test 4: Execute "wait" sync strategy');
    try {
        const result = await manager.executeSyncStrategy('wait', { host: 'localhost', port: 16110 });

        if (result.strategy === 'wait') {
            logSuccess('Strategy set to "wait"');
            
            if (result.action === 'monitor-sync') {
                logSuccess('Action set to monitor-sync');
            }
            
            if (result.monitoringConfig && result.monitoringConfig.blockUntilComplete) {
                logSuccess('Configured to block until complete');
            }
            
            passed++;
        } else {
            logError(`Expected strategy 'wait', got '${result.strategy}'`);
            failed++;
        }
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 5: Execute "background" strategy
    logTest('Test 5: Execute "background" sync strategy');
    try {
        const result = await manager.executeSyncStrategy('background', { host: 'localhost', port: 16110 });

        if (result.strategy === 'background') {
            logSuccess('Strategy set to "background"');
            
            if (result.action === 'background-sync') {
                logSuccess('Action set to background-sync');
            }
            
            if (result.monitoringConfig && !result.monitoringConfig.blockUntilComplete) {
                logSuccess('Configured to NOT block (background mode)');
            }
            
            if (result.fallbackConfig && result.fallbackConfig.usePublicNetwork) {
                logSuccess('Configured to use public network as fallback');
            }
            
            if (result.fallbackConfig && result.fallbackConfig.switchWhenSynced) {
                logSuccess('Configured to switch to local node when synced');
            }
            
            passed++;
        } else {
            logError(`Expected strategy 'background', got '${result.strategy}'`);
            failed++;
        }
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 6: Execute "skip" strategy
    logTest('Test 6: Execute "skip" sync strategy');
    try {
        const result = await manager.executeSyncStrategy('skip', { host: 'localhost', port: 16110 });

        if (result.strategy === 'skip') {
            logSuccess('Strategy set to "skip"');
            
            if (result.action === 'use-public') {
                logSuccess('Action set to use-public');
            }
            
            if (result.monitoringConfig && !result.monitoringConfig.enabled) {
                logSuccess('Monitoring disabled');
            }
            
            if (result.fallbackConfig && result.fallbackConfig.usePublicNetwork) {
                logSuccess('Configured to use public network');
            }
            
            if (result.fallbackConfig && !result.fallbackConfig.switchWhenSynced) {
                logSuccess('Configured to NEVER switch to local node');
            }
            
            passed++;
        } else {
            logError(`Expected strategy 'skip', got '${result.strategy}'`);
            failed++;
        }
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 7: Get recommended strategy
    logTest('Test 7: Get recommended strategy based on time');
    try {
        // < 5 minutes = wait
        const rec1 = manager.getRecommendedStrategy(240); // 4 minutes
        if (rec1 === 'wait') {
            logSuccess('Recommends "wait" for < 5 minutes');
        } else {
            logError(`Expected "wait" for 4 minutes, got "${rec1}"`);
            failed++;
        }

        // 5-60 minutes = background
        const rec2 = manager.getRecommendedStrategy(1800); // 30 minutes
        if (rec2 === 'background') {
            logSuccess('Recommends "background" for 5-60 minutes');
        } else {
            logError(`Expected "background" for 30 minutes, got "${rec2}"`);
            failed++;
        }

        // > 1 hour = skip
        const rec3 = manager.getRecommendedStrategy(7200); // 2 hours
        if (rec3 === 'skip') {
            logSuccess('Recommends "skip" for > 1 hour');
        } else {
            logError(`Expected "skip" for 2 hours, got "${rec3}"`);
            failed++;
        }

        // Unknown time = background
        const rec4 = manager.getRecommendedStrategy(null);
        if (rec4 === 'background') {
            logSuccess('Recommends "background" for unknown time');
        } else {
            logError(`Expected "background" for unknown time, got "${rec4}"`);
            failed++;
        }

        passed++;
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 8: Store and retrieve sync strategy
    logTest('Test 8: Store and retrieve sync strategy');
    try {
        const nodeKey = 'localhost:16110';
        const strategy = 'background';
        const config = { checkInterval: 10000 };

        manager.storeSyncStrategy(nodeKey, strategy, config);
        logSuccess('Stored sync strategy');

        const retrieved = manager.getSyncStrategy(nodeKey);
        if (retrieved && retrieved.strategy === strategy) {
            logSuccess('Retrieved correct strategy');
            
            if (retrieved.config && retrieved.config.checkInterval === 10000) {
                logSuccess('Retrieved correct config');
            }
            
            if (retrieved.timestamp) {
                logSuccess('Timestamp recorded');
            }
            
            passed++;
        } else {
            logError('Failed to retrieve strategy');
            failed++;
        }
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 9: Monitor sync progress (non-blocking)
    logTest('Test 9: Monitor sync progress in non-blocking mode');
    try {
        let progressCallbackCalled = false;
        let progressData = null;

        // Mock sync status that's not synced
        const originalGetSyncStatus = manager.getSyncStatus.bind(manager);
        manager.getSyncStatus = async () => ({
            connected: true,
            synced: false,
            currentBlock: 5000000,
            targetBlock: 10000000,
            percentage: 50,
            estimatedTimeRemaining: 3600
        });

        const result = await manager.monitorSyncProgress(
            {
                host: 'localhost',
                port: 16110,
                checkInterval: 100,
                blockUntilComplete: false
            },
            (progress) => {
                progressCallbackCalled = true;
                progressData = progress;
            }
        );

        if (!result.completed && result.monitoring) {
            logSuccess('Returned immediately in non-blocking mode');
            
            if (progressCallbackCalled) {
                logSuccess('Progress callback was called');
                
                if (progressData && progressData.percentage === 50) {
                    logSuccess('Progress data is correct');
                }
            }
            
            passed++;
        } else {
            logError('Did not return immediately in non-blocking mode');
            failed++;
        }

        manager.getSyncStatus = originalGetSyncStatus;
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Test 10: Invalid strategy handling
    logTest('Test 10: Handle invalid strategy');
    try {
        let errorThrown = false;
        
        try {
            await manager.executeSyncStrategy('invalid', { host: 'localhost', port: 16110 });
        } catch (error) {
            errorThrown = true;
            if (error.message.includes('Invalid sync strategy')) {
                logSuccess('Correctly threw error for invalid strategy');
            }
        }

        if (errorThrown) {
            passed++;
        } else {
            logError('Did not throw error for invalid strategy');
            failed++;
        }
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log('Test Summary', 'cyan');
    console.log('='.repeat(60));
    logSuccess(`Passed: ${passed}`);
    if (failed > 0) {
        logError(`Failed: ${failed}`);
    } else {
        log(`Failed: ${failed}`, 'reset');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
