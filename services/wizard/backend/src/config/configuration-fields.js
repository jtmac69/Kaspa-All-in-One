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
      key: 'REMOTE_KSOCIAL_INDEXER_URL',
      label: 'K-Social Indexer URL',
      type: 'text',
      defaultValue: 'https://indexer.kaspatalk.net/',
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
  advanced: {
    id: 'advanced',
    label: 'Advanced Settings',
    description: 'Additional configuration options',
    icon: 'settings',
    order: 5
  }
};

module.exports = {
  PROFILE_CONFIG_FIELDS,
  FIELD_CATEGORIES,
  FIELD_GROUPS
};
