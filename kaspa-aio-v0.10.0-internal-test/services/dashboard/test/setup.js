// Test setup file
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Mock external dependencies that require Docker or system access
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn()
}));

// Mock fs promises for file operations
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn()
  },
  // Add synchronous fs methods
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock axios for HTTP requests
jest.mock('axios');

// Global test utilities
global.mockExecAsync = (mockImplementation) => {
  const { exec } = require('child_process');
  exec.mockImplementation((command, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    const result = mockImplementation(command, options);
    if (result instanceof Error) {
      callback(result);
    } else {
      callback(null, result);
    }
  });
};

global.mockAxios = (mockImplementation) => {
  const axios = require('axios');
  Object.assign(axios, mockImplementation);
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});