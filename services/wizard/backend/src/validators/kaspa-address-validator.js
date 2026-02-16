/**
 * Kaspa Address Validator
 * 
 * Validates Kaspa addresses with network awareness.
 * Uses prefix checking and format validation.
 * 
 * Note: For full checksum validation, we'd need the Kaspa WASM module.
 * This validator performs structural validation sufficient for backend use.
 * Full validation happens client-side via WASM.
 */

/**
 * Network prefixes for Kaspa addresses
 */
const NETWORK_PREFIXES = {
  mainnet: 'kaspa:',
  'testnet-10': 'kaspatest:',
  'testnet-11': 'kaspatest:',
  testnet: 'kaspatest:',
  devnet: 'kaspadev:',
  simnet: 'kaspasim:'
};

/**
 * Valid address prefix patterns
 */
const VALID_PREFIXES = ['kaspa:', 'kaspatest:', 'kaspadev:', 'kaspasim:'];

/**
 * Kaspa address format regex
 * Format: prefix + bech32-encoded data (lowercase alphanumeric, excluding 1, b, i, o)
 * Bech32 uses: qpzry9x8gf2tvdw0s3jn54khce6mua7l
 * Typical length: prefix (6-11 chars) + encoded data (58-63 chars)
 */
const ADDRESS_REGEX = /^(kaspa|kaspatest|kaspadev|kaspasim):[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}$/;

/**
 * Validate a Kaspa address
 * 
 * @param {string} address - The address to validate
 * @param {Object} options - Validation options
 * @param {string} [options.network] - Expected network (mainnet, testnet, etc.)
 * @param {boolean} [options.networkAware=false] - Whether to check network prefix
 * @returns {{valid: boolean, error?: string, network?: string}}
 */
function validateKaspaAddress(address, options = {}) {
  const { network, networkAware = false } = options;

  // Basic input validation
  if (!address || typeof address !== 'string') {
    return {
      valid: false,
      error: 'Address is required'
    };
  }

  const trimmedAddress = address.trim().toLowerCase();

  // Check for valid prefix
  const hasValidPrefix = VALID_PREFIXES.some(prefix => trimmedAddress.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `Invalid address prefix. Must start with one of: ${VALID_PREFIXES.join(', ')}`
    };
  }

  // Detect network from prefix
  let detectedNetwork = null;
  for (const [net, prefix] of Object.entries(NETWORK_PREFIXES)) {
    if (trimmedAddress.startsWith(prefix)) {
      detectedNetwork = net;
      break;
    }
  }

  // Check network match if required
  if (networkAware && network) {
    const expectedPrefix = NETWORK_PREFIXES[network];
    if (expectedPrefix && !trimmedAddress.startsWith(expectedPrefix)) {
      return {
        valid: false,
        network: detectedNetwork,
        error: `Address is for ${detectedNetwork}, but configuration is set to ${network}. Please use a ${expectedPrefix} address.`
      };
    }
  }

  // Validate format with regex
  if (!ADDRESS_REGEX.test(trimmedAddress)) {
    return {
      valid: false,
      network: detectedNetwork,
      error: 'Invalid address format. Kaspa addresses use bech32 encoding (characters: qpzry9x8gf2tvdw0s3jn54khce6mua7l).'
    };
  }

  // Length validation (addresses are typically 64-75 characters total)
  if (trimmedAddress.length < 64 || trimmedAddress.length > 90) {
    return {
      valid: false,
      network: detectedNetwork,
      error: `Invalid address length: ${trimmedAddress.length}. Expected 64-90 characters.`
    };
  }

  // Passed all checks
  return {
    valid: true,
    network: detectedNetwork,
    normalizedAddress: trimmedAddress
  };
}

/**
 * Get expected prefix for a network
 * @param {string} network - Network name
 * @returns {string|null} Expected prefix or null
 */
function getNetworkPrefix(network) {
  return NETWORK_PREFIXES[network] || null;
}

/**
 * Detect network from address
 * @param {string} address - Kaspa address
 * @returns {string|null} Detected network or null
 */
function detectNetworkFromAddress(address) {
  if (!address) return null;
  
  const lower = address.toLowerCase().trim();
  
  for (const [network, prefix] of Object.entries(NETWORK_PREFIXES)) {
    if (lower.startsWith(prefix)) {
      return network;
    }
  }
  
  return null;
}

module.exports = {
  validateKaspaAddress,
  getNetworkPrefix,
  detectNetworkFromAddress,
  NETWORK_PREFIXES,
  VALID_PREFIXES
};
