/**
 * Test WebSocket Connection
 * Tests the install module WebSocket integration
 */

const io = require('socket.io-client');

const WIZARD_URL = 'http://localhost:3000';

console.log('Testing WebSocket connection to wizard backend...\n');

// Connect to WebSocket
const socket = io(WIZARD_URL);

socket.on('connect', () => {
    console.log('✓ WebSocket connected successfully');
    console.log('  Socket ID:', socket.id);
    
    // Test installation start
    console.log('\nTesting installation start event...');
    
    const testConfig = {
        externalIp: '192.168.1.100',
        publicNode: false,
        postgresPassword: 'test-password-123',
        customEnvVars: []
    };
    
    const testProfiles = ['core'];
    
    socket.emit('install:start', {
        config: testConfig,
        profiles: testProfiles
    });
    
    console.log('✓ Emitted install:start event');
    console.log('  Config:', testConfig);
    console.log('  Profiles:', testProfiles);
});

socket.on('connect_error', (error) => {
    console.error('✗ Connection error:', error.message);
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('\n✓ WebSocket disconnected');
});

// Listen for installation events
socket.on('install:progress', (data) => {
    console.log(`\n[PROGRESS] Stage: ${data.stage}, Progress: ${data.progress}%`);
    console.log(`  Message: ${data.message}`);
    if (data.details) {
        console.log('  Details:', data.details);
    }
});

socket.on('install:complete', (data) => {
    console.log('\n✓ Installation completed!');
    console.log('  Message:', data.message);
    if (data.validation) {
        console.log('  Validation:', data.validation);
    }
    
    // Disconnect and exit
    setTimeout(() => {
        socket.disconnect();
        console.log('\nTest completed successfully!');
        process.exit(0);
    }, 1000);
});

socket.on('install:error', (data) => {
    console.error('\n✗ Installation error!');
    console.error('  Stage:', data.stage);
    console.error('  Message:', data.message);
    if (data.error) {
        console.error('  Error:', data.error);
    }
    
    // Disconnect and exit
    setTimeout(() => {
        socket.disconnect();
        console.log('\nTest failed!');
        process.exit(1);
    }, 1000);
});

// Timeout after 5 minutes
setTimeout(() => {
    console.error('\n✗ Test timeout after 5 minutes');
    socket.disconnect();
    process.exit(1);
}, 5 * 60 * 1000);

console.log('Waiting for events...');
