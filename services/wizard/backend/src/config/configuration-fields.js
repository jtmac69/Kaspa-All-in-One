/**
 * Configuration Field Registry
 * 
 * Defines all available configuration fields for each profile with validation rules,
 * visibility logic, and grouping information.
 */

/**
 * @typedef {Object} ValidationRule
 * @property {string} type - Type of validation (range, pattern, required, etc.)
 * @property {*} [min] - Minimum value for range validation
 * @property {*} [max] - Maximum value for range validation
 * @property {RegExp} [pattern] - Pattern for regex validation
 * @property {string} [message] - Custom error message
 */

/**
 * @typedef {Object} ConfigField
 * @property {string} key - Environment variable key
 * @property {string} label - Human-readable label
 * @property {string} type - Field type (text, number, password, boolean, select)
 * @property {*} defaultValue - Default value
 * @property {boolean} required - Whether field is required
 * @property {ValidationRule[]} validation - Validation rules
 * @property {string} tooltip - Help text for users
 * @property {string} category - Category (basic, advanced)
 * @property {string} [group] - Group name (kaspa-node, database, network)
 * @property {string[]} [visibleForProfiles] - Profiles that should see this field
 * @property {string[]} [options] - Options for select fields
 */

/**
 * Profile-specific configuration fields
 */
const PROFILE_CONFIG_FIELDS = {
  core: [
    {
      key: 'KASPA_NODE_RPC_PORT',
      label: 'Kaspa Node RPC Port',
      type: 'number',
      defaultValue: 16110,
      required: true,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for RPC connections to the Kaspa node',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['core']
    },
    {
      key: 'KASPA_NODE_P2P_PORT',
      label: 'Kaspa Node P2P Port',
      type: 'number',
      defaultValue: 16111,
      required: true,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for peer-to-peer connections',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['core']
    },
    {
      key: 'KASPA_NETWORK',
      label: 'Network',
      type: 'select',
      defaultValue: 'mainnet',
      required: true,
      options: ['mainnet', 'testnet'],
      validation: [
        {
          type: 'enum',
          values: ['mainnet', 'testnet'],
          message: 'Network must be either mainnet or testnet'
        }
      ],
      tooltip: 'Kaspa network to connect to (changing this requires fresh installation)',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['core']
    },
    {
      key: 'KASPA_DATA_DIR',
      label: 'Data Directory',
      type: 'text',
      defaultValue: '/data/kaspa',
      required: false,
      validation: [
        {
          type: 'path',
          message: 'Must be a valid path'
        }
      ],
      tooltip: 'Container path for Kaspa node data (Docker volume)',
      category: 'advanced',
      group: 'kaspa-node',
      visibleForProfiles: ['core']
    }
  ],

  'archive-node': [
    {
      key: 'KASPA_NODE_RPC_PORT',
      label: 'Archive Node RPC Port',
      type: 'number',
      defaultValue: 16110,
      required: true,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for RPC connections to the archive node',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['archive-node']
    },
    {
      key: 'KASPA_NODE_P2P_PORT',
      label: 'Archive Node P2P Port',
      type: 'number',
      defaultValue: 16111,
      required: true,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for peer-to-peer connections',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['archive-node']
    },
    {
      key: 'KASPA_NETWORK',
      label: 'Network',
      type: 'select',
      defaultValue: 'mainnet',
      required: true,
      options: ['mainnet', 'testnet'],
      validation: [
        {
          type: 'enum',
          values: ['mainnet', 'testnet'],
          message: 'Network must be either mainnet or testnet'
        }
      ],
      tooltip: 'Kaspa network to connect to',
      category: 'basic',
      group: 'kaspa-node',
      visibleForProfiles: ['archive-node']
    },
    {
      key: 'KASPA_ARCHIVE_DATA_DIR',
      label: 'Archive Data Directory',
      type: 'text',
      defaultValue: '/data/kaspa-archive',
      required: false,
      validation: [
        {
          type: 'path',
          message: 'Must be a valid path'
        }
      ],
      tooltip: 'Container path for archive node data (requires significant disk space)',
      category: 'advanced',
      group: 'kaspa-node',
      visibleForProfiles: ['archive-node']
    }
  ],

  'kaspa-user-applications': [
    {
      key: 'INDEXER_CONNECTION_MODE',
      label: 'Indexer Connection Mode',
      type: 'select',
      defaultValue: 'auto',
      required: true,
      options: ['auto', 'local', 'public', 'mixed'],
      validation: [
        {
          type: 'enum',
          values: ['auto', 'local', 'public', 'mixed'],
          message: 'Must be one of: auto, local, public, mixed'
        }
      ],
      tooltip: 'How applications connect to indexers: auto (detect local), local (force local), public (force public), mixed (per-service configuration)',
      category: 'basic',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'REMOTE_KASIA_INDEXER_URL',
      label: 'Kasia Indexer URL',
      type: 'text',
      defaultValue: 'https://indexer.kasia.fyi/',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^https?:\/\/.+/,
          message: 'Must be a valid HTTP or HTTPS URL'
        }
      ],
      tooltip: 'URL for Kasia indexer API (automatically set to local indexer if indexer-services profile is selected)',
      category: 'basic',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'KASIA_INDEXER_CONNECTION',
      label: 'Kasia Indexer Connection',
      type: 'select',
      defaultValue: 'auto',
      required: false,
      options: ['auto', 'local', 'public'],
      validation: [
        {
          type: 'enum',
          values: ['auto', 'local', 'public'],
          message: 'Must be one of: auto, local, public'
        }
      ],
      tooltip: 'Connection preference for Kasia indexer (only visible in mixed mode)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications'],
      dependsOn: { field: 'INDEXER_CONNECTION_MODE', value: 'mixed' }
    },
    {
      key: 'REMOTE_KSOCIAL_INDEXER_URL',
      label: 'K-Social Indexer URL',
      type: 'text',
      defaultValue: 'https://indexer0.kaspatalk.net/',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^https?:\/\/.+/,
          message: 'Must be a valid HTTP or HTTPS URL'
        }
      ],
      tooltip: 'URL for K-Social indexer API (automatically set to local indexer if indexer-services profile is selected)',
      category: 'basic',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'KSOCIAL_INDEXER_CONNECTION',
      label: 'K-Social Indexer Connection',
      type: 'select',
      defaultValue: 'auto',
      required: false,
      options: ['auto', 'local', 'public'],
      validation: [
        {
          type: 'enum',
          values: ['auto', 'local', 'public'],
          message: 'Must be one of: auto, local, public'
        }
      ],
      tooltip: 'Connection preference for K-Social indexer (only visible in mixed mode)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications'],
      dependsOn: { field: 'INDEXER_CONNECTION_MODE', value: 'mixed' }
    },
    {
      key: 'REMOTE_KASPA_NODE_WBORSH_URL',
      label: 'Kaspa Node WebSocket URL',
      type: 'text',
      defaultValue: 'wss://wrpc.kasia.fyi',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^wss?:\/\/.+/,
          message: 'Must be a valid WebSocket URL (ws:// or wss://)'
        }
      ],
      tooltip: 'WebSocket URL for Kaspa node connection (automatically set to local node if core profile is selected)',
      category: 'basic',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'KASPA_NODE_CONNECTION',
      label: 'Kaspa Node Connection',
      type: 'select',
      defaultValue: 'auto',
      required: false,
      options: ['auto', 'local', 'public'],
      validation: [
        {
          type: 'enum',
          values: ['auto', 'local', 'public'],
          message: 'Must be one of: auto, local, public'
        }
      ],
      tooltip: 'Connection preference for Kaspa node (only visible in mixed mode)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications'],
      dependsOn: { field: 'INDEXER_CONNECTION_MODE', value: 'mixed' }
    }
  ],

  'indexer-services': [
    {
      key: 'K_SOCIAL_DB_PASSWORD',
      label: 'K-Social Database Password',
      type: 'password',
      defaultValue: '',
      required: true,
      validation: [
        {
          type: 'minLength',
          min: 12,
          message: 'Password must be at least 12 characters'
        }
      ],
      tooltip: 'PostgreSQL password for K-Social database (will be auto-generated if left empty)',
      category: 'basic',
      group: 'database',
      visibleForProfiles: ['indexer-services']
    },
    {
      key: 'SIMPLY_KASPA_DB_PASSWORD',
      label: 'Simply Kaspa Database Password',
      type: 'password',
      defaultValue: '',
      required: true,
      validation: [
        {
          type: 'minLength',
          min: 12,
          message: 'Password must be at least 12 characters'
        }
      ],
      tooltip: 'PostgreSQL password for Simply Kaspa database (will be auto-generated if left empty)',
      category: 'basic',
      group: 'database',
      visibleForProfiles: ['indexer-services']
    },
    {
      key: 'K_SOCIAL_DB_PORT',
      label: 'K-Social Database Port',
      type: 'number',
      defaultValue: 5433,
      required: false,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for K-Social TimescaleDB database',
      category: 'advanced',
      group: 'database',
      visibleForProfiles: ['indexer-services']
    },
    {
      key: 'SIMPLY_KASPA_DB_PORT',
      label: 'Simply Kaspa Database Port',
      type: 'number',
      defaultValue: 5434,
      required: false,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'Port for Simply Kaspa TimescaleDB database',
      category: 'advanced',
      group: 'database',
      visibleForProfiles: ['indexer-services']
    }
  ],

  // Common fields that apply to all profiles
  common: [
    {
      key: 'EXTERNAL_IP',
      label: 'External IP Address',
      type: 'text',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
          message: 'Must be a valid IPv4 address'
        }
      ],
      tooltip: 'Your server\'s external IP address (auto-detected if left empty)',
      category: 'basic',
      group: 'network',
      // Note: Only needed for profiles that accept external connections
      // kaspa-user-applications runs behind nginx and doesn't need external IP config
      // indexer-services connect TO nodes, they don't serve as public nodes
      visibleForProfiles: ['core', 'archive-node', 'mining']
    },
    {
      key: 'PUBLIC_NODE',
      label: 'Public Node',
      type: 'boolean',
      defaultValue: false,
      required: false,
      validation: [],
      tooltip: 'Make this node publicly accessible',
      category: 'basic',
      group: 'network',
      // Only relevant for node profiles
      visibleForProfiles: ['core', 'archive-node']
    },
    {
      key: 'WALLET_ENABLED',
      label: 'Enable Wallet',
      type: 'boolean',
      defaultValue: false,
      required: false,
      validation: [],
      tooltip: 'Enable wallet functionality for this installation',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining']
    },
    {
      key: 'WALLET_MODE',
      label: 'Wallet Mode',
      type: 'select',
      defaultValue: 'create',
      required: false,
      options: ['create', 'import', 'existing'],
      validation: [
        {
          type: 'enum',
          values: ['create', 'import', 'existing'],
          message: 'Must be one of: create, import, existing'
        }
      ],
      tooltip: 'How to set up the wallet: create new, import from seed, or use existing',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_ENABLED', value: true }
    },
    {
      key: 'WALLET_SEED_PHRASE',
      label: 'Wallet Seed Phrase',
      type: 'textarea',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^(\w+\s+){11}\w+$|^(\w+\s+){23}\w+$/,
          message: 'Must be a valid 12 or 24 word seed phrase'
        }
      ],
      tooltip: 'Enter your 12 or 24 word seed phrase (only for import mode)',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_MODE', value: 'import' }
    },
    {
      key: 'WALLET_PASSWORD',
      label: 'Wallet Password',
      type: 'password',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'walletPassword',
          message: 'Wallet password must meet security requirements'
        }
      ],
      tooltip: 'Password to encrypt the wallet (leave empty for no password)',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_ENABLED', value: true }
    },
    {
      key: 'WALLET_FILE',
      label: 'Wallet File',
      type: 'file',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /\.(json|dat|wallet)$/i,
          message: 'Must be a valid wallet file (.json, .dat, or .wallet)'
        }
      ],
      tooltip: 'Upload wallet file for import (only for import mode)',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_MODE', value: 'import' }
    },
    {
      key: 'WALLET_PRIVATE_KEY',
      label: 'Private Key',
      type: 'password',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'pattern',
          pattern: /^[0-9a-fA-F]{64}$/,
          message: 'Must be a 64-character hexadecimal private key'
        }
      ],
      tooltip: 'Private key for wallet import (alternative to seed phrase)',
      category: 'advanced',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_MODE', value: 'import' }
    },
    {
      key: 'WALLET_PATH',
      label: 'Wallet Path',
      type: 'text',
      defaultValue: '/data/wallet',
      required: false,
      validation: [
        {
          type: 'path',
          message: 'Must be a valid path'
        }
      ],
      tooltip: 'Container path for wallet data storage',
      category: 'advanced',
      group: 'wallet',
      visibleForProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_ENABLED', value: true }
    },
    {
      key: 'MINING_ADDRESS',
      label: 'Mining Address',
      type: 'text',
      defaultValue: '',
      required: true,
      validation: [
        {
          type: 'kaspaAddress',
          message: 'Must be a valid Kaspa address'
        }
      ],
      tooltip: 'Kaspa address to receive mining rewards',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['mining']
    },
    {
      key: 'KASIA_INDEXER_URL',
      label: 'Kasia Indexer URL',
      type: 'text',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'url',
          protocols: ['http', 'https'],
          message: 'Must be a valid HTTP or HTTPS URL'
        }
      ],
      tooltip: 'Custom URL for Kasia indexer (for mixed indexer configurations)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'K_INDEXER_URL',
      label: 'K-Indexer URL',
      type: 'text',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'url',
          protocols: ['http', 'https'],
          message: 'Must be a valid HTTP or HTTPS URL'
        }
      ],
      tooltip: 'Custom URL for K-Indexer (for mixed indexer configurations)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'SIMPLY_KASPA_INDEXER_URL',
      label: 'Simply Kaspa Indexer URL',
      type: 'text',
      defaultValue: '',
      required: false,
      validation: [
        {
          type: 'url',
          protocols: ['http', 'https'],
          message: 'Must be a valid HTTP or HTTPS URL'
        }
      ],
      tooltip: 'Custom URL for Simply Kaspa Indexer (for mixed indexer configurations)',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'USE_PUBLIC_KASPA_NETWORK',
      label: 'Use Public Kaspa Network',
      type: 'boolean',
      defaultValue: false,
      required: false,
      validation: [],
      tooltip: 'Allow indexer services to connect to public Kaspa network when no local node is available',
      category: 'advanced',
      group: 'network',
      visibleForProfiles: ['indexer-services']
    },
    {
      key: 'MIXED_INDEXER_CONFIRMED',
      label: 'Mixed Indexer Configuration Confirmed',
      type: 'boolean',
      defaultValue: false,
      required: false,
      validation: [],
      tooltip: 'Confirmation that mixed indexer configuration (some local, some public) is intentional',
      category: 'advanced',
      group: 'indexer-endpoints',
      visibleForProfiles: ['kaspa-user-applications']
    },
    {
      key: 'CUSTOM_ENV_VARS',
      label: 'Custom Environment Variables',
      type: 'textarea',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'Additional environment variables (one per line, format: KEY=value)',
      category: 'advanced',
      group: 'advanced',
      // Available for all profiles - advanced users may need custom env vars for any service
      visibleForProfiles: ['core', 'archive-node', 'kaspa-user-applications', 'indexer-services', 'mining']
    },
    {
      key: 'CONFIGURATION_TEMPLATE',
      label: 'Configuration Template',
      type: 'select',
      defaultValue: 'custom',
      required: false,
      options: ['custom', 'home-node', 'public-node', 'developer', 'mining-rig', 'full-stack'],
      validation: [
        {
          type: 'enum',
          values: ['custom', 'home-node', 'public-node', 'developer', 'mining-rig', 'full-stack'],
          message: 'Must be a valid template'
        }
      ],
      tooltip: 'Pre-configured template to apply (will override current settings)',
      category: 'advanced',
      group: 'templates',
      visibleForProfiles: ['core', 'archive-node', 'kaspa-user-applications', 'indexer-services', 'mining']
    }
  ]
};

/**
 * Field categories for organization
 */
const FIELD_CATEGORIES = {
  basic: {
    id: 'basic',
    label: 'Basic Configuration',
    description: 'Essential settings for your installation',
    order: 1
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced Options',
    description: 'Optional advanced configuration',
    order: 2,
    collapsible: true,
    defaultCollapsed: true
  }
};

/**
 * Field groups for sectioning within categories
 */
const FIELD_GROUPS = {
  'kaspa-node': {
    id: 'kaspa-node',
    label: 'Kaspa Node Settings',
    description: 'Configuration for Kaspa blockchain node',
    icon: 'node',
    order: 1
  },
  'indexer-endpoints': {
    id: 'indexer-endpoints',
    label: 'Indexer Endpoints',
    description: 'API endpoints for blockchain indexers',
    icon: 'link',
    order: 2
  },
  network: {
    id: 'network',
    label: 'Network Configuration',
    description: 'Network and connectivity settings',
    icon: 'network',
    order: 3
  },
  database: {
    id: 'database',
    label: 'Database Configuration',
    description: 'TimescaleDB and indexer database settings',
    icon: 'database',
    order: 4
  },
  wallet: {
    id: 'wallet',
    label: 'Wallet & Mining',
    description: 'Wallet configuration and mining settings',
    icon: 'wallet',
    order: 5
  },
  templates: {
    id: 'templates',
    label: 'Configuration Templates',
    description: 'Pre-configured templates and presets',
    icon: 'template',
    order: 6
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced Settings',
    description: 'Additional configuration options',
    icon: 'settings',
    order: 7
  }
};

module.exports = {
  PROFILE_CONFIG_FIELDS,
  FIELD_CATEGORIES,
  FIELD_GROUPS
};
