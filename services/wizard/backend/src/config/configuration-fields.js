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
    // =========================================================================
    // WALLET CONNECTIVITY CONFIGURATION
    // These fields configure kaspad to accept external wallet connections
    // They do NOT manage wallet keys - that happens client-side via WASM
    // =========================================================================
    {
      key: 'WALLET_CONNECTIVITY_ENABLED',
      label: 'Enable Wallet Connectivity',
      type: 'boolean',
      defaultValue: false,
      required: false,
      validation: [],
      tooltip: 'Enable UTXO indexing and WebSocket RPC endpoints for wallet connections. Required for using external wallets (Kaspa NG, etc.) with this node.',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['kaspa-node', 'kaspa-archive-node', 'kaspa-stratum'],
      // Legacy profile support
      legacyProfiles: ['core', 'archive-node', 'mining'],
      affectsDockerCompose: true,
      dockerComposeEffect: 'Adds --utxoindex, --rpclisten-borsh, --rpclisten-json flags to kaspad',
      triggerFields: ['KASPA_NODE_WRPC_BORSH_PORT', 'KASPA_NODE_WRPC_JSON_PORT', 'WALLET_SETUP_MODE']
    },
    {
      key: 'KASPA_NODE_WRPC_BORSH_PORT',
      label: 'wRPC Borsh Port',
      type: 'number',
      defaultValue: 17110,
      required: false,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'WebSocket RPC port using Borsh binary encoding. Used by Rust SDK wallets and kaspa-cli.',
      category: 'advanced',
      group: 'wallet',
      visibleForProfiles: ['kaspa-node', 'kaspa-archive-node'],
      legacyProfiles: ['core', 'archive-node'],
      dependsOn: { field: 'WALLET_CONNECTIVITY_ENABLED', value: true },
      affectsDockerCompose: true,
      dockerComposeEffect: 'Sets --rpclisten-borsh=0.0.0.0:{port}'
    },
    {
      key: 'KASPA_NODE_WRPC_JSON_PORT',
      label: 'wRPC JSON Port',
      type: 'number',
      defaultValue: 18110,
      required: false,
      validation: [
        {
          type: 'range',
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535'
        }
      ],
      tooltip: 'WebSocket RPC port using JSON encoding. Used by web wallets and browser applications.',
      category: 'advanced',
      group: 'wallet',
      visibleForProfiles: ['kaspa-node', 'kaspa-archive-node'],
      legacyProfiles: ['core', 'archive-node'],
      dependsOn: { field: 'WALLET_CONNECTIVITY_ENABLED', value: true },
      affectsDockerCompose: true,
      dockerComposeEffect: 'Sets --rpclisten-json=0.0.0.0:{port}'
    },
    {
      key: 'WALLET_SETUP_MODE',
      label: 'Address Setup Method',
      type: 'radio',
      defaultValue: 'generate',
      required: false,
      options: [
        { 
          value: 'generate', 
          label: 'Generate a new wallet', 
          description: 'Create a new 24-word seed phrase and derive a fresh address' 
        },
        { 
          value: 'import', 
          label: 'Import existing seed phrase', 
          description: 'Use your existing 12 or 24 word mnemonic' 
        },
        { 
          value: 'manual', 
          label: "I'll provide my own address", 
          description: 'Enter an address from an external wallet (Kaspa NG, KDX, etc.)' 
        }
      ],
      validation: [
        {
          type: 'enum',
          values: ['generate', 'import', 'manual'],
          message: 'Must be one of: generate, import, manual'
        }
      ],
      tooltip: 'How to obtain the mining/receive address. Generate creates a new wallet, Import uses your existing seed, Manual lets you enter any valid Kaspa address.',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['kaspa-node', 'kaspa-archive-node', 'kaspa-stratum'],
      legacyProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_CONNECTIVITY_ENABLED', value: true },
      // CRITICAL: This field is frontend-only
      // It drives the UI state machine but is NEVER:
      // - Sent to the backend API
      // - Included in generated configuration
      // - Written to Docker Compose or .env files
      frontendOnly: true,
      // UI behavior hints
      uiHints: {
        displayAs: 'radio-cards',  // Show as large clickable cards
        showDescriptions: true,    // Show description under each option
        expandsSubflow: true       // Selecting triggers sub-flow UI
      }
    },
    // REMOVED - Security: Seed phrases should NEVER be sent to backend
    {
      key: 'WALLET_SEED_PHRASE',
      label: 'Wallet Seed Phrase (Removed)',
      type: 'textarea',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'REMOVED: Seed phrases are now handled client-side only for security',
      category: 'deprecated',
      group: 'wallet',
      visibleForProfiles: [], // Hide from all profiles
      deprecated: true,
      removed: true,
      securityRemoval: true,
      deprecatedMessage: 'Seed phrases are now handled entirely in the browser via WASM. They are never sent to the server.',
      migrationHandler: () => {
        // Do not migrate - this data should not exist in new configs
        console.warn('[ConfigMigration] WALLET_SEED_PHRASE found in config - this field is no longer used');
        return {};
      }
    },
    // REMOVED - Security: Passwords should be handled client-side only
    {
      key: 'WALLET_PASSWORD',
      label: 'Wallet Password (Removed)',
      type: 'password',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'REMOVED: Wallet encryption is now handled client-side only',
      category: 'deprecated',
      group: 'wallet',
      visibleForProfiles: [],
      deprecated: true,
      removed: true,
      securityRemoval: true,
      deprecatedMessage: 'Wallet passwords are now used only for client-side backup encryption. They are never sent to the server.',
      migrationHandler: () => ({})
    },
    // REMOVED - Security: File uploads for wallets are a security risk
    {
      key: 'WALLET_FILE',
      label: 'Wallet File (Removed)',
      type: 'file',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'REMOVED: Wallet files should be imported client-side only',
      category: 'deprecated',
      group: 'wallet',
      visibleForProfiles: [],
      deprecated: true,
      removed: true,
      securityRemoval: true,
      deprecatedMessage: 'Wallet file uploads have been removed for security. Import wallets using the client-side WASM interface.',
      migrationHandler: () => ({})
    },
    // REMOVED - Security: Private keys should NEVER be sent to backend
    {
      key: 'WALLET_PRIVATE_KEY',
      label: 'Private Key (Removed)',
      type: 'password',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'REMOVED: Private keys should never be transmitted to any server',
      category: 'deprecated',
      group: 'wallet',
      visibleForProfiles: [],
      deprecated: true,
      removed: true,
      securityRemoval: true,
      deprecatedMessage: 'Private keys are now handled entirely in the browser via WASM. They are never sent to the server.',
      migrationHandler: () => ({})
    },
    // REMOVED - Not applicable with new architecture
    {
      key: 'WALLET_PATH',
      label: 'Wallet Path (Removed)',
      type: 'text',
      defaultValue: '',
      required: false,
      validation: [],
      tooltip: 'REMOVED: No longer applicable - wallets are not stored server-side',
      category: 'deprecated',
      group: 'wallet',
      visibleForProfiles: [],
      deprecated: true,
      removed: true,
      deprecatedMessage: 'Wallet data is no longer stored on the server. Users download encrypted backups to their local machine.',
      migrationHandler: () => ({})
    },
    {
      key: 'MINING_ADDRESS',
      label: 'Mining/Receive Address',
      type: 'text',
      defaultValue: '',
      required: false, // Required only when wallet connectivity is enabled
      conditionalRequired: {
        field: 'WALLET_CONNECTIVITY_ENABLED',
        value: true,
        message: 'Mining address is required when wallet connectivity is enabled'
      },
      validation: [
        {
          type: 'kaspaAddress',
          networkAware: true,
          message: 'Must be a valid Kaspa address for the selected network'
        }
      ],
      tooltip: 'Kaspa address to receive mining rewards. This is the only wallet data stored in configuration - it\'s a public address, not a private key.',
      placeholder: 'kaspa:qr...',
      category: 'basic',
      group: 'wallet',
      visibleForProfiles: ['kaspa-node', 'kaspa-archive-node', 'kaspa-stratum'],
      legacyProfiles: ['core', 'archive-node', 'mining'],
      dependsOn: { field: 'WALLET_CONNECTIVITY_ENABLED', value: true },
      affectsDockerCompose: true,
      dockerComposeEffect: 'Sets --mining-address for kaspa-miner/stratum',
      // Data flow documentation
      populatedBy: [
        'WASM address generation (when WALLET_SETUP_MODE = generate)',
        'WASM address derivation (when WALLET_SETUP_MODE = import)',
        'Manual user input (when WALLET_SETUP_MODE = manual)'
      ],
      // Security note
      securityNote: 'This is a PUBLIC address, safe to store. Private keys and mnemonics are handled client-side only.'
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

/**
 * Migrate deprecated wallet configuration fields
 * @param {Object} config - Configuration object
 * @returns {Object} Migrated configuration with warnings
 */
function migrateWalletConfiguration(config) {
  const migrated = { ...config };
  const warnings = [];

  // Get all deprecated fields
  const allFields = [
    ...PROFILE_CONFIG_FIELDS.common,
    ...Object.values(PROFILE_CONFIG_FIELDS).flat()
  ];
  const deprecatedFields = allFields.filter(f => f.deprecated);

  for (const field of deprecatedFields) {
    if (config.hasOwnProperty(field.key) && config[field.key] !== '' && config[field.key] !== null) {
      // Log warning
      warnings.push({
        field: field.key,
        message: field.deprecatedMessage,
        action: field.removed ? 'removed' : 'migrated'
      });

      // Apply migration handler if exists
      if (field.migrationHandler) {
        const result = field.migrationHandler(config[field.key]);
        Object.assign(migrated, result);
      }

      // Remove deprecated field from config
      if (field.removed) {
        delete migrated[field.key];
      }
    }
  }

  if (warnings.length > 0) {
    console.log('[ConfigMigration] Migrated deprecated wallet fields:', warnings);
  }

  return { config: migrated, warnings };
}

module.exports = {
  PROFILE_CONFIG_FIELDS,
  FIELD_CATEGORIES,
  FIELD_GROUPS,
  migrateWalletConfiguration
};
