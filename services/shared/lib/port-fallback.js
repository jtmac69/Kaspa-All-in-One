const axios = require('axios');

/**
 * PortFallbackService - Manages Kaspa node connection with port fallback
 * 
 * This service implements the port fallback strategy defined in Requirements 3.1-3.8:
 * 1. Try configured port first
 * 2. Fallback to 16110 (standard RPC)
 * 3. Fallback to 16111 (P2P/alternative)
 * 4. Cache working port for subsequent requests
 * 5. Retry every 30 seconds when unavailable
 */
class PortFallbackService {
  constructor(options = {}) {
    this.configuredPort = options.configuredPort || 16110;
    this.fallbackPorts = [16110, 16111]; // Standard RPC ports
    this.cachedPort = null;
    this.retryInterval = options.retryInterval || 30000; // 30 seconds
    this.timeout = options.timeout || 5000; // 5 seconds for connection tests
    this.retryTimer = null;
    this.host = options.host || 'localhost';
    
    // Ensure configured port is first in fallback chain
    this.portChain = this._buildPortChain();
  }

  /**
   * Build the port chain with configured port first, then fallbacks
   * @private
   */
  _buildPortChain() {
    const chain = [this.configuredPort];
    
    // Add fallback ports that aren't already the configured port
    for (const port of this.fallbackPorts) {
      if (port !== this.configuredPort) {
        chain.push(port);
      }
    }
    
    return chain;
  }

  /**
   * Connect to Kaspa node, trying ports in order
   * @returns {Promise<ConnectionResult>} Connection result with port used
   */
  async connect() {
    // If we have a cached working port, try it first
    if (this.cachedPort) {
      try {
        const result = await this._testConnection(this.cachedPort);
        if (result.connected) {
          return result;
        } else {
          // Cached port failed, clear cache and try full chain
          this.cachedPort = null;
        }
      } catch (error) {
        // Cached port failed, clear cache and continue
        this.cachedPort = null;
      }
    }

    // Try each port in the chain
    for (const port of this.portChain) {
      try {
        const result = await this._testConnection(port);
        if (result.connected) {
          // Cache the working port
          this.cachedPort = port;
          return result;
        }
      } catch (error) {
        // Continue to next port
        continue;
      }
    }

    // All ports failed
    return {
      connected: false,
      port: null,
      error: `Failed to connect to Kaspa node on any port: ${this.portChain.join(', ')}`
    };
  }

  /**
   * Test connection to a specific port
   * @private
   * @param {number} port - Port to test
   * @returns {Promise<ConnectionResult>} Connection result
   */
  async _testConnection(port) {
    const url = `http://${this.host}:${port}`;
    
    try {
      // Test with a simple RPC call (ping or getInfo)
      const response = await axios.post(url, {
        method: 'ping',
        params: {}
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // If we get any response (even an error), the port is accessible
      return {
        connected: true,
        port: port,
        url: url
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          connected: false,
          port: port,
          error: `Connection ${error.code === 'ETIMEDOUT' ? 'timed out' : 'refused'} on port ${port}`
        };
      }
      
      // Other errors (like RPC errors) still mean the port is accessible
      if (error.response) {
        return {
          connected: true,
          port: port,
          url: url
        };
      }
      
      // For unexpected errors, treat as connection failure
      return {
        connected: false,
        port: port,
        error: `Unexpected error on port ${port}: ${error.message}`
      };
    }
  }

  /**
   * Get current working port
   * @returns {number|null} Cached working port or null
   */
  getWorkingPort() {
    return this.cachedPort;
  }

  /**
   * Get the URL for the current working port
   * @returns {string|null} URL for working port or null
   */
  getWorkingUrl() {
    if (this.cachedPort) {
      return `http://${this.host}:${this.cachedPort}`;
    }
    return null;
  }

  /**
   * Clear cached port (force re-detection)
   */
  clearCache() {
    this.cachedPort = null;
  }

  /**
   * Start automatic retry when disconnected
   * @param {Function} onConnect - Called when connection established
   */
  startRetry(onConnect) {
    // Clear any existing retry timer
    this.stopRetry();
    
    this.retryTimer = setInterval(async () => {
      try {
        const result = await this.connect();
        if (result.connected && onConnect) {
          onConnect(result);
        }
      } catch (error) {
        // Ignore errors during retry - we'll keep trying
      }
    }, this.retryInterval);
  }

  /**
   * Stop automatic retry
   */
  stopRetry() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Get the full port chain being used
   * @returns {number[]} Array of ports in order of preference
   */
  getPortChain() {
    return [...this.portChain];
  }

  /**
   * Update the configured port and rebuild the chain
   * @param {number} port - New configured port
   */
  setConfiguredPort(port) {
    this.configuredPort = port;
    this.portChain = this._buildPortChain();
    // Clear cache since configuration changed
    this.clearCache();
  }

  /**
   * Check if a specific port is in the fallback chain
   * @param {number} port - Port to check
   * @returns {boolean} True if port is in the chain
   */
  hasPort(port) {
    return this.portChain.includes(port);
  }

  /**
   * Get connection status summary
   * @returns {Object} Status summary
   */
  getStatus() {
    return {
      configuredPort: this.configuredPort,
      cachedPort: this.cachedPort,
      portChain: this.portChain,
      retryActive: this.retryTimer !== null,
      retryInterval: this.retryInterval
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopRetry();
  }
}

module.exports = PortFallbackService;