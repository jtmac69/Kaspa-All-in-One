const fs = require('fs').promises;
const path = require('path');

/**
 * Profile ID migration mapping for backward compatibility
 * Maps old profile IDs to new profile IDs
 */
const PROFILE_ID_MIGRATION = {
  // Old ID → New ID(s)
  'core': 'kaspa-node',
  'kaspa-user-applications': ['kasia-app', 'k-social-app'],  // Split into multiple
  'indexer-services': ['kasia-indexer', 'k-indexer-bundle'], // Split into multiple
  'archive-node': 'kaspa-archive-node',
  'mining': 'kaspa-stratum'
};

/**
 * Reverse mapping: New ID → Old ID (for state file compatibility)
 */
const PROFILE_ID_REVERSE_MIGRATION = {
  'kaspa-node': 'core',
  'kasia-app': 'kaspa-user-applications',
  'k-social-app': 'kaspa-user-applications',
  'kaspa-explorer-bundle': 'kaspa-user-applications',
  'kasia-indexer': 'indexer-services',
  'k-indexer-bundle': 'indexer-services',
  'kaspa-archive-node': 'archive-node',
  'kaspa-stratum': 'mining'
};

/**
 * Template ID migration mapping for backward compatibility
 * Maps old template IDs to new template IDs
 */
const TEMPLATE_ID_MIGRATION = {
  'beginner-setup': 'quick-start',
  'home-node': 'kaspa-node',
  'public-node': 'kaspa-node',
  'full-node': 'kaspa-sovereignty',
  'full-stack': 'kaspa-sovereignty',
  'developer-setup': 'custom-setup',
  'developer': 'custom-setup',
  'mining-rig': 'solo-miner',
  'miner-node': 'solo-miner'
};

/**
 * Core ProfileManager class with essential profile and template data
 * Focused on basic profile operations and data access
 */
class ProfileManager {
  constructor() {
    this.profiles = {
      // =========================================================================
      // PROFILE 1: kaspa-node (Beginner)
      // =========================================================================
      'kaspa-node': {
        id: 'kaspa-node',
        name: 'Kaspa Node',
        description: 'Standard pruning Kaspa node with optional wallet',
        services: [
          { name: 'kaspa-node', required: true, startupOrder: 1, description: 'Kaspa blockchain node daemon' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: ['kaspa-archive-node'],
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 100,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 200
        },
        ports: [16110, 16111, 17110],
        configuration: {
          required: ['KASPA_NETWORK'],
          optional: ['PUBLIC_NODE', 'WALLET_ENABLED', 'WALLET_MODE', 'UTXO_INDEX', 'EXTERNAL_IP'],
          defaults: {
            KASPA_NETWORK: 'mainnet',
            KASPA_NODE_RPC_PORT: 16110,
            KASPA_NODE_P2P_PORT: 16111,
            KASPA_NODE_WRPC_PORT: 17110,
            PUBLIC_NODE: false,
            WALLET_ENABLED: false,
            WALLET_MODE: 'none',
            UTXO_INDEX: true
          }
        },
        category: 'beginner'
      },

      // =========================================================================
      // PROFILE 2: kasia-app (Beginner)
      // =========================================================================
      'kasia-app': {
        id: 'kasia-app',
        name: 'Kasia Application',
        description: 'Kasia messaging app (can use public or local indexer)',
        services: [
          { name: 'kasia-app', required: true, startupOrder: 3, description: 'Kasia web application' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: [],
        resources: {
          minMemory: 1,
          minCpu: 1,
          minDisk: 5,
          recommendedMemory: 2,
          recommendedCpu: 2,
          recommendedDisk: 10
        },
        ports: [3001],
        configuration: {
          required: [],
          optional: ['KASIA_INDEXER_MODE', 'REMOTE_KASIA_INDEXER_URL', 'REMOTE_KASPA_NODE_WRPC_URL'],
          defaults: {
            KASIA_APP_PORT: 3001,
            KASIA_INDEXER_MODE: 'auto',
            KASIA_INDEXER_URL: 'http://kasia-indexer:8080',
            REMOTE_KASIA_INDEXER_URL: 'https://api.kasia.io',
            REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
          },
          publicIndexerAvailable: true,
          publicIndexerUrl: 'https://api.kasia.io'
        },
        category: 'beginner'
      },

      // =========================================================================
      // PROFILE 3: k-social-app (Beginner)
      // =========================================================================
      'k-social-app': {
        id: 'k-social-app',
        name: 'K-Social Application',
        description: 'K-Social decentralized social app (can use public or local indexer)',
        services: [
          { name: 'k-social', required: true, startupOrder: 3, description: 'K-Social web application' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: [],
        resources: {
          minMemory: 1,
          minCpu: 1,
          minDisk: 5,
          recommendedMemory: 2,
          recommendedCpu: 2,
          recommendedDisk: 10
        },
        ports: [3003],
        configuration: {
          required: [],
          optional: ['KSOCIAL_INDEXER_MODE', 'REMOTE_KSOCIAL_INDEXER_URL', 'REMOTE_KASPA_NODE_WRPC_URL'],
          defaults: {
            KSOCIAL_APP_PORT: 3003,
            KSOCIAL_INDEXER_MODE: 'auto',
            KSOCIAL_INDEXER_URL: 'http://k-indexer:8080',
            REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/',
            KSOCIAL_NODE_MODE: 'auto',
            KSOCIAL_NODE_WRPC_URL: 'ws://kaspa-node:17110',
            REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
          },
          publicIndexerAvailable: true,
          publicIndexerUrl: 'https://indexer0.kaspatalk.net/'
        },
        category: 'beginner',
        // Note: Docker container name is 'k-social', not 'k-social-app'
        dockerServiceName: 'k-social'
      },

      // =========================================================================
      // PROFILE 4: kaspa-explorer-bundle (Intermediate)
      // =========================================================================
      'kaspa-explorer-bundle': {
        id: 'kaspa-explorer-bundle',
        name: 'Kaspa Explorer',
        description: 'Blockchain explorer with integrated Simply-Kaspa indexer and TimescaleDB',
        services: [
          { name: 'kaspa-explorer', required: true, startupOrder: 4, description: 'Kaspa blockchain explorer UI' },
          { name: 'simply-kaspa-indexer', required: true, startupOrder: 3, description: 'Simply-Kaspa blockchain indexer' },
          { name: 'timescaledb-explorer', required: true, startupOrder: 2, description: 'TimescaleDB for explorer data' }
        ],
        dependencies: [],
        prerequisites: [],  // Recommends kaspa-node but can use remote
        conflicts: [],
        resources: {
          minMemory: 8,
          minCpu: 2,
          minDisk: 300,
          recommendedMemory: 16,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        ports: [3004, 3005, 5434],
        configuration: {
          required: [],
          optional: ['SIMPLY_KASPA_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
          defaults: {
            KASPA_EXPLORER_PORT: 3004,
            SIMPLY_KASPA_INDEXER_PORT: 3005,
            SIMPLY_KASPA_NODE_MODE: 'local',
            SIMPLY_KASPA_NODE_WRPC_URL: 'ws://kaspa-node:17110',
            TIMESCALEDB_EXPLORER_PORT: 5434,
            POSTGRES_USER_EXPLORER: 'kaspa_explorer',
            POSTGRES_DB_EXPLORER: 'simply_kaspa'
          },
          publicIndexerAvailable: false,  // No public Simply-Kaspa indexer!
          bundledServices: ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer']
        },
        category: 'intermediate',
        isBundle: true
      },

      // =========================================================================
      // PROFILE 5: kasia-indexer (Intermediate)
      // =========================================================================
      'kasia-indexer': {
        id: 'kasia-indexer',
        name: 'Kasia Indexer',
        description: 'Kasia indexer with embedded database (no external DB required)',
        services: [
          { name: 'kasia-indexer', required: true, startupOrder: 2, description: 'Kasia blockchain indexer' }
        ],
        dependencies: [],
        prerequisites: [],  // Recommends kaspa-node but can use remote
        conflicts: [],
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 200,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 400
        },
        ports: [3002],
        configuration: {
          required: [],
          optional: ['KASIA_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
          defaults: {
            KASIA_INDEXER_PORT: 3002,
            KASIA_NODE_MODE: 'local',
            KASIA_NODE_WRPC_URL: 'ws://kaspa-node:17110'
          },
          embeddedDatabase: true  // Kasia indexer has built-in database
        },
        category: 'intermediate'
      },

      // =========================================================================
      // PROFILE 6: k-indexer-bundle (Intermediate)
      // =========================================================================
      'k-indexer-bundle': {
        id: 'k-indexer-bundle',
        name: 'K-Indexer',
        description: 'K-Indexer for K-Social with dedicated TimescaleDB',
        services: [
          { name: 'k-indexer', required: true, startupOrder: 3, description: 'K-Social blockchain indexer' },
          { name: 'timescaledb-kindexer', required: true, startupOrder: 2, description: 'TimescaleDB for K-Indexer' }
        ],
        dependencies: [],
        prerequisites: [],  // Recommends kaspa-node but can use remote
        conflicts: [],
        resources: {
          minMemory: 8,
          minCpu: 2,
          minDisk: 300,
          recommendedMemory: 16,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        ports: [3006, 5433],
        configuration: {
          required: [],
          optional: ['K_INDEXER_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
          defaults: {
            K_INDEXER_PORT: 3006,
            K_INDEXER_NODE_MODE: 'local',
            K_INDEXER_NODE_WRPC_URL: 'ws://kaspa-node:17110',
            TIMESCALEDB_KINDEXER_PORT: 5433,
            POSTGRES_USER_KINDEXER: 'k_indexer',
            POSTGRES_DB_KINDEXER: 'k_indexer'
          },
          bundledServices: ['k-indexer', 'timescaledb-kindexer']
        },
        category: 'intermediate',
        isBundle: true
      },

      // =========================================================================
      // PROFILE 7: kaspa-archive-node (Advanced)
      // =========================================================================
      'kaspa-archive-node': {
        id: 'kaspa-archive-node',
        name: 'Kaspa Archive Node',
        description: 'Non-pruning archive node storing complete blockchain history',
        services: [
          { name: 'kaspa-archive-node', required: true, startupOrder: 1, description: 'Kaspa archive node daemon' }
        ],
        dependencies: [],
        prerequisites: [],
        conflicts: ['kaspa-node'],  // Mutually exclusive - same ports
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 1000,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 5000
        },
        ports: [16110, 16111, 17110],
        configuration: {
          required: ['KASPA_NETWORK'],
          optional: ['PUBLIC_NODE', 'EXTERNAL_IP'],
          defaults: {
            KASPA_NETWORK: 'mainnet',
            KASPA_NODE_RPC_PORT: 16110,
            KASPA_NODE_P2P_PORT: 16111,
            KASPA_NODE_WRPC_PORT: 17110,
            PUBLIC_NODE: true,
            ARCHIVE_MODE: true,
            UTXO_INDEX: true
          }
        },
        category: 'advanced'
      },

      // =========================================================================
      // PROFILE 8: kaspa-stratum (Advanced)
      // =========================================================================
      'kaspa-stratum': {
        id: 'kaspa-stratum',
        name: 'Kaspa Stratum Bridge',
        description: 'Stratum bridge for connecting mining hardware',
        services: [
          { name: 'kaspa-stratum', required: true, startupOrder: 2, description: 'Stratum mining bridge' }
        ],
        dependencies: [],
        prerequisites: ['kaspa-node', 'kaspa-archive-node'],  // Requires ONE of these
        prerequisitesMode: 'any',  // Only ONE prerequisite needed, not all
        conflicts: [],
        resources: {
          minMemory: 2,
          minCpu: 2,
          minDisk: 10,
          recommendedMemory: 4,
          recommendedCpu: 4,
          recommendedDisk: 20
        },
        ports: [5555],
        configuration: {
          required: ['MINING_ADDRESS'],  // User MUST provide
          optional: ['STRATUM_PORT', 'EXTRA_NONCE_SIZE', 'MIN_SHARE_DIFF', 'VAR_DIFF', 'POOL_MODE'],
          defaults: {
            STRATUM_PORT: 5555,
            KASPA_NODE_RPC_URL: 'http://kaspa-node:16110',
            EXTRA_NONCE_SIZE: 0,
            MIN_SHARE_DIFF: 4,
            VAR_DIFF: true,
            SHARES_PER_MIN: 20,
            VAR_DIFF_STATS: false,
            BLOCK_WAIT_TIME: 500,
            POOL_MODE: false
          }
        },
        category: 'advanced'
      }
    };

    this.templates = {
      // =========================================================================
      // BEGINNER TEMPLATES (4)
      // =========================================================================

      // Template 1: kaspa-node
      'kaspa-node': {
        id: 'kaspa-node',
        name: 'Kaspa Node',
        description: 'Run your own Kaspa node and contribute to network decentralization.',
        longDescription: 'A standard pruning Kaspa node that syncs with the network and validates transactions. Includes optional wallet functionality. This is the foundation for most Kaspa setups and the recommended starting point for beginners.',
        profiles: ['kaspa-node'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '10 minutes',
        syncTime: '2-4 hours',
        icon: '🖥️',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NODE_WRPC_PORT: 17110,
          PUBLIC_NODE: false,
          WALLET_ENABLED: false,
          UTXO_INDEX: true
        },
        resources: {
          minMemory: 4,
          minCpu: 2,
          minDisk: 100,
          recommendedMemory: 8,
          recommendedCpu: 4,
          recommendedDisk: 200
        },
        features: [
          'Full Kaspa node with network sync',
          'Optional wallet functionality',
          'Low resource requirements',
          'Foundation for other services'
        ],
        benefits: [
          'Support network decentralization',
          'Validate your own transactions',
          'No external dependencies',
          'Privacy for your operations'
        ],
        customizable: true,
        tags: ['node', 'beginner', 'personal', 'kaspa', 'blockchain'],
        displayOrder: 1
      },

      // Template 2: quick-start
      'quick-start': {
        id: 'quick-start',
        name: 'Quick Start',
        description: 'Get started instantly with Kaspa applications using public infrastructure.',
        longDescription: 'Run both Kasia and K-Social applications locally while connecting to public indexers. This is the fastest way to experience Kaspa applications with minimal setup and resource requirements. Ideal for users who want to try the ecosystem before committing to running their own infrastructure.',
        profiles: ['kasia-app', 'k-social-app'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '5 minutes',
        syncTime: 'Not required',
        icon: '🚀',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASIA_APP_PORT: 3001,
          KASIA_INDEXER_MODE: 'public',
          REMOTE_KASIA_INDEXER_URL: 'https://api.kasia.io',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi',
          KSOCIAL_APP_PORT: 3003,
          KSOCIAL_INDEXER_MODE: 'public',
          REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/'
        },
        resources: {
          minMemory: 2,
          minCpu: 1,
          minDisk: 10,
          recommendedMemory: 4,
          recommendedCpu: 2,
          recommendedDisk: 20
        },
        features: [
          'Both Kasia and K-Social apps',
          'Uses public indexers (no local infrastructure)',
          'Minimal resource requirements',
          'Instant setup - no sync time'
        ],
        benefits: [
          'Try Kaspa apps immediately',
          'No infrastructure to maintain',
          'Lowest resource requirements',
          'Easy upgrade path to full setup'
        ],
        customizable: true,
        tags: ['apps', 'beginner', 'quick', 'public', 'minimal'],
        displayOrder: 2
      },

      // Template 3: kasia-lite
      'kasia-lite': {
        id: 'kasia-lite',
        name: 'Kasia Lite',
        description: 'Run the Kasia messaging app using public infrastructure.',
        longDescription: 'The Kasia application for Kaspa messaging and wallet functionality, connecting to public indexers. Perfect for users who want Kasia without running their own indexer infrastructure.',
        profiles: ['kasia-app'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '5 minutes',
        syncTime: 'Not required',
        icon: '💬',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASIA_APP_PORT: 3001,
          KASIA_INDEXER_MODE: 'public',
          REMOTE_KASIA_INDEXER_URL: 'https://api.kasia.io',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
        },
        resources: {
          minMemory: 1,
          minCpu: 1,
          minDisk: 5,
          recommendedMemory: 2,
          recommendedCpu: 2,
          recommendedDisk: 10
        },
        features: [
          'Kasia messaging application',
          'Uses public Kasia indexer',
          'Minimal resource requirements',
          'No sync time required'
        ],
        benefits: [
          'Simple Kasia-only setup',
          'Instant messaging access',
          'Very low resources',
          'Easy to upgrade later'
        ],
        customizable: true,
        tags: ['kasia', 'app', 'beginner', 'messaging', 'lite'],
        displayOrder: 3
      },

      // Template 4: k-social-lite
      'k-social-lite': {
        id: 'k-social-lite',
        name: 'K-Social Lite',
        description: 'Run the K-Social decentralized social app using public infrastructure.',
        longDescription: 'The K-Social decentralized social media application, connecting to public indexers. Perfect for users who want to participate in Kaspa social features without running their own indexer infrastructure.',
        profiles: ['k-social-app'],
        category: 'beginner',
        useCase: 'personal',
        estimatedSetupTime: '5 minutes',
        syncTime: 'Not required',
        icon: '👥',
        config: {
          KASPA_NETWORK: 'mainnet',
          KSOCIAL_APP_PORT: 3003,
          KSOCIAL_INDEXER_MODE: 'public',
          REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
        },
        resources: {
          minMemory: 1,
          minCpu: 1,
          minDisk: 5,
          recommendedMemory: 2,
          recommendedCpu: 2,
          recommendedDisk: 10
        },
        features: [
          'K-Social decentralized social app',
          'Uses public K-Social indexer',
          'Minimal resource requirements',
          'No sync time required'
        ],
        benefits: [
          'Simple K-Social-only setup',
          'Instant social access',
          'Very low resources',
          'Easy to upgrade later'
        ],
        customizable: true,
        tags: ['k-social', 'app', 'beginner', 'social', 'lite'],
        displayOrder: 4
      },

      // =========================================================================
      // INTERMEDIATE TEMPLATES (4)
      // =========================================================================

      // Template 5: kasia-suite
      'kasia-suite': {
        id: 'kasia-suite',
        name: 'Kasia Suite',
        description: 'Full Kasia experience with your own local indexer.',
        longDescription: 'Run the Kasia application with your own local Kasia indexer. This provides complete independence from public infrastructure, better performance, and full privacy. The Kasia indexer uses an embedded database, keeping setup relatively simple.',
        profiles: ['kasia-app', 'kasia-indexer'],
        category: 'intermediate',
        useCase: 'personal',
        estimatedSetupTime: '15 minutes',
        syncTime: '2-6 hours',
        icon: '💬🔧',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASIA_APP_PORT: 3001,
          KASIA_INDEXER_MODE: 'local',
          KASIA_INDEXER_URL: 'http://kasia-indexer:8080',
          KASIA_INDEXER_PORT: 3002,
          KASIA_NODE_MODE: 'public',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
        },
        resources: {
          minMemory: 5,
          minCpu: 2,
          minDisk: 205,
          recommendedMemory: 10,
          recommendedCpu: 4,
          recommendedDisk: 410
        },
        features: [
          'Kasia messaging application',
          'Local Kasia indexer (embedded database)',
          'Independence from public indexers',
          'Better performance and privacy'
        ],
        benefits: [
          'Full Kasia independence',
          'No reliance on public infrastructure',
          'Better performance',
          'Complete privacy'
        ],
        customizable: true,
        tags: ['kasia', 'indexer', 'intermediate', 'suite', 'local'],
        displayOrder: 5
      },

      // Template 6: k-social-suite
      'k-social-suite': {
        id: 'k-social-suite',
        name: 'K-Social Suite',
        description: 'Full K-Social experience with your own local indexer and database.',
        longDescription: 'Run the K-Social application with your own local K-Indexer and dedicated TimescaleDB database. This provides complete independence from public infrastructure, better performance, and full privacy for your social interactions.',
        profiles: ['k-social-app', 'k-indexer-bundle'],
        category: 'intermediate',
        useCase: 'personal',
        estimatedSetupTime: '20 minutes',
        syncTime: '4-12 hours',
        icon: '👥🔧',
        config: {
          KASPA_NETWORK: 'mainnet',
          KSOCIAL_APP_PORT: 3003,
          KSOCIAL_INDEXER_MODE: 'local',
          KSOCIAL_INDEXER_URL: 'http://k-indexer:8080',
          K_INDEXER_PORT: 3006,
          K_INDEXER_NODE_MODE: 'public',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi',
          TIMESCALEDB_KINDEXER_PORT: 5433,
          POSTGRES_USER_KINDEXER: 'k_indexer',
          POSTGRES_DB_KINDEXER: 'k_indexer'
        },
        resources: {
          minMemory: 9,
          minCpu: 2,
          minDisk: 305,
          recommendedMemory: 18,
          recommendedCpu: 4,
          recommendedDisk: 510
        },
        features: [
          'K-Social decentralized social app',
          'Local K-Indexer with TimescaleDB',
          'Independence from public indexers',
          'Better performance and privacy'
        ],
        benefits: [
          'Full K-Social independence',
          'No reliance on public infrastructure',
          'Your data stays local',
          'Better query performance'
        ],
        customizable: true,
        tags: ['k-social', 'indexer', 'intermediate', 'suite', 'local', 'timescaledb'],
        displayOrder: 6
      },

      // Template 7: solo-miner
      'solo-miner': {
        id: 'solo-miner',
        name: 'Solo Miner',
        description: 'Solo mining setup with your own node and stratum bridge.',
        longDescription: 'A complete solo mining setup including a Kaspa node and stratum bridge. Connect your mining hardware directly to your own node for solo mining. Requires providing your own mining address for block rewards.',
        profiles: ['kaspa-node', 'kaspa-stratum'],
        category: 'intermediate',
        useCase: 'mining',
        estimatedSetupTime: '15 minutes',
        syncTime: '2-4 hours',
        icon: '⛏️',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NODE_WRPC_PORT: 17110,
          PUBLIC_NODE: false,
          WALLET_ENABLED: true,
          UTXO_INDEX: true,
          STRATUM_PORT: 5555,
          MINING_ADDRESS: '',
          EXTRA_NONCE_SIZE: 0,
          MIN_SHARE_DIFF: 4,
          VAR_DIFF: true,
          SHARES_PER_MIN: 20,
          BLOCK_WAIT_TIME: 500,
          POOL_MODE: false
        },
        resources: {
          minMemory: 6,
          minCpu: 2,
          minDisk: 110,
          recommendedMemory: 12,
          recommendedCpu: 4,
          recommendedDisk: 220
        },
        features: [
          'Full Kaspa node',
          'Stratum bridge for mining hardware',
          'Solo mining (not pool)',
          'Direct block rewards'
        ],
        benefits: [
          'Keep all block rewards',
          'No pool fees',
          'Direct network participation',
          'Full control over mining'
        ],
        customizable: true,
        tags: ['mining', 'stratum', 'node', 'intermediate', 'solo'],
        requiredConfig: ['MINING_ADDRESS'],
        displayOrder: 7
      },

      // Template 8: block-explorer
      'block-explorer': {
        id: 'block-explorer',
        name: 'Block Explorer',
        description: 'Run your own blockchain explorer with integrated indexer.',
        longDescription: 'A complete blockchain explorer with the Simply-Kaspa indexer and dedicated TimescaleDB database. Browse blocks, transactions, and addresses on your own infrastructure. Essential for developers building on Kaspa or users who want to verify transactions independently.',
        profiles: ['kaspa-explorer-bundle'],
        category: 'intermediate',
        useCase: 'development',
        estimatedSetupTime: '20 minutes',
        syncTime: '6-24 hours',
        icon: '🔍',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_EXPLORER_PORT: 3004,
          SIMPLY_KASPA_INDEXER_PORT: 3005,
          SIMPLY_KASPA_NODE_MODE: 'public',
          REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi',
          TIMESCALEDB_EXPLORER_PORT: 5434,
          POSTGRES_USER_EXPLORER: 'kaspa_explorer',
          POSTGRES_DB_EXPLORER: 'simply_kaspa'
        },
        resources: {
          minMemory: 8,
          minCpu: 2,
          minDisk: 300,
          recommendedMemory: 16,
          recommendedCpu: 4,
          recommendedDisk: 500
        },
        features: [
          'Full blockchain explorer UI',
          'Simply-Kaspa indexer with TimescaleDB',
          'Block, transaction, and address lookup',
          'Independent verification capability'
        ],
        benefits: [
          'Verify transactions yourself',
          'No reliance on public explorers',
          'Development and debugging tool',
          'Complete blockchain visibility'
        ],
        customizable: true,
        tags: ['explorer', 'indexer', 'intermediate', 'development', 'blockchain'],
        displayOrder: 8
      },

      // =========================================================================
      // ADVANCED TEMPLATES (4)
      // =========================================================================

      // Template 9: kaspa-sovereignty
      'kaspa-sovereignty': {
        id: 'kaspa-sovereignty',
        name: 'Kaspa Sovereignty',
        description: 'Complete Kaspa independence. Your own node, all apps, all indexers.',
        longDescription: 'The ultimate self-sovereign Kaspa setup. Run your own node with all applications (Kasia, K-Social, Explorer) and all their indexers locally. Complete independence from any external infrastructure. This is for users who want total control and privacy over their Kaspa experience.',
        profiles: ['kaspa-node', 'kasia-app', 'kasia-indexer', 'k-social-app', 'k-indexer-bundle', 'kaspa-explorer-bundle'],
        category: 'advanced',
        useCase: 'personal',
        estimatedSetupTime: '30 minutes',
        syncTime: '12-48 hours',
        icon: '👑',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NODE_WRPC_PORT: 17110,
          PUBLIC_NODE: false,
          WALLET_ENABLED: true,
          UTXO_INDEX: true,
          KASIA_APP_PORT: 3001,
          KASIA_INDEXER_MODE: 'local',
          KASIA_INDEXER_URL: 'http://kasia-indexer:8080',
          KASIA_INDEXER_PORT: 3002,
          KASIA_NODE_MODE: 'local',
          KASIA_NODE_WRPC_URL: 'ws://kaspa-node:17110',
          KSOCIAL_APP_PORT: 3003,
          KSOCIAL_INDEXER_MODE: 'local',
          KSOCIAL_INDEXER_URL: 'http://k-indexer:8080',
          K_INDEXER_PORT: 3006,
          K_INDEXER_NODE_MODE: 'local',
          K_INDEXER_NODE_WRPC_URL: 'ws://kaspa-node:17110',
          TIMESCALEDB_KINDEXER_PORT: 5433,
          POSTGRES_USER_KINDEXER: 'k_indexer',
          POSTGRES_DB_KINDEXER: 'k_indexer',
          KASPA_EXPLORER_PORT: 3004,
          SIMPLY_KASPA_INDEXER_PORT: 3005,
          SIMPLY_KASPA_NODE_MODE: 'local',
          SIMPLY_KASPA_NODE_WRPC_URL: 'ws://kaspa-node:17110',
          TIMESCALEDB_EXPLORER_PORT: 5434,
          POSTGRES_USER_EXPLORER: 'kaspa_explorer',
          POSTGRES_DB_EXPLORER: 'simply_kaspa'
        },
        resources: {
          minMemory: 26,
          minCpu: 2,
          minDisk: 910,
          recommendedMemory: 52,
          recommendedCpu: 4,
          recommendedDisk: 1620
        },
        features: [
          'Full Kaspa node (your own)',
          'Kasia app with local indexer',
          'K-Social app with local indexer + TimescaleDB',
          'Full blockchain explorer with indexer + TimescaleDB',
          'Complete independence from external services'
        ],
        benefits: [
          'Total sovereignty over your Kaspa experience',
          'Maximum privacy',
          'No external dependencies',
          'Best possible performance'
        ],
        customizable: true,
        tags: ['sovereignty', 'full-stack', 'advanced', 'complete', 'independent'],
        displayOrder: 9
      },

      // Template 10: archival-node
      'archival-node': {
        id: 'archival-node',
        name: 'Archival Node',
        description: 'Non-pruning archive node storing complete blockchain history.',
        longDescription: 'A non-pruning Kaspa node that stores the complete blockchain history. Required for historical data analysis, advanced indexing operations, and infrastructure providers. Significantly higher storage requirements than a standard node.',
        profiles: ['kaspa-archive-node'],
        category: 'advanced',
        useCase: 'production',
        estimatedSetupTime: '15 minutes',
        syncTime: '24-72 hours',
        icon: '🗄️',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NODE_WRPC_PORT: 17110,
          PUBLIC_NODE: true,
          ARCHIVE_MODE: true,
          UTXO_INDEX: true,
          EXTERNAL_IP: ''
        },
        resources: {
          minMemory: 16,
          minCpu: 8,
          minDisk: 1000,
          recommendedMemory: 32,
          recommendedCpu: 16,
          recommendedDisk: 5000
        },
        features: [
          'Complete blockchain history (non-pruning)',
          'Suitable for historical queries',
          'Required for some advanced indexer operations',
          'Typically run as a public node'
        ],
        benefits: [
          'Access to complete history',
          'Support advanced use cases',
          'Provide infrastructure for others',
          'Historical analysis capability'
        ],
        customizable: true,
        tags: ['archive', 'node', 'advanced', 'production', 'history'],
        displayOrder: 10
      },

      // Template 11: archival-miner
      'archival-miner': {
        id: 'archival-miner',
        name: 'Archival Miner',
        description: 'Archive node with mining capability. Full history plus solo mining.',
        longDescription: 'Combines a non-pruning archive node with stratum bridge for mining. Useful for miners who also want to maintain complete blockchain history for research or verification purposes. Highest resource requirements of any template.',
        profiles: ['kaspa-archive-node', 'kaspa-stratum'],
        category: 'advanced',
        useCase: 'production',
        estimatedSetupTime: '20 minutes',
        syncTime: '24-72 hours',
        icon: '🗄️⛏️',
        config: {
          KASPA_NETWORK: 'mainnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111,
          KASPA_NODE_WRPC_PORT: 17110,
          PUBLIC_NODE: false,
          ARCHIVE_MODE: true,
          UTXO_INDEX: true,
          STRATUM_PORT: 5555,
          MINING_ADDRESS: '',
          EXTRA_NONCE_SIZE: 0,
          MIN_SHARE_DIFF: 4,
          VAR_DIFF: true,
          SHARES_PER_MIN: 20,
          BLOCK_WAIT_TIME: 500,
          POOL_MODE: false
        },
        resources: {
          minMemory: 18,
          minCpu: 8,
          minDisk: 1010,
          recommendedMemory: 36,
          recommendedCpu: 16,
          recommendedDisk: 5020
        },
        features: [
          'Complete blockchain history (non-pruning)',
          'Stratum bridge for mining hardware',
          'Solo mining capability',
          'Historical data for verification'
        ],
        benefits: [
          'Mine while maintaining history',
          'Research and verification',
          'Maximum infrastructure capability',
          'Full control'
        ],
        customizable: true,
        tags: ['archive', 'mining', 'stratum', 'advanced', 'production'],
        requiredConfig: ['MINING_ADDRESS'],
        displayOrder: 11
      },

      // Template 12: custom-setup
      'custom-setup': {
        id: 'custom-setup',
        name: 'Custom Setup',
        description: 'Build your own configuration by selecting individual profiles.',
        longDescription: 'Create a custom installation by selecting exactly which profiles you want. Choose any combination of services (respecting conflicts). In reconfiguration mode, you can also remove existing profiles. Resources are calculated dynamically based on your selections.',
        profiles: [],  // Dynamically selected by user
        category: 'advanced',
        useCase: 'development',
        estimatedSetupTime: 'Variable',
        syncTime: 'Variable',
        icon: '🛠️',
        config: {},  // Dynamically configured based on selections
        resources: {
          minMemory: 0,  // Calculated dynamically
          minCpu: 0,
          minDisk: 0,
          recommendedMemory: 0,
          recommendedCpu: 0,
          recommendedDisk: 0
        },
        features: [
          'Select any combination of profiles',
          'Conflict detection (kaspa-node vs kaspa-archive-node)',
          'Dependency recommendations shown',
          'Dynamic resource calculation',
          'Reconfiguration: add OR remove profiles'
        ],
        benefits: [
          'Maximum flexibility',
          'Exactly what you need',
          'Expert-level control',
          'Modify existing installations'
        ],
        customizable: true,
        isDynamic: true,  // Special flag for custom setup
        tags: ['custom', 'advanced', 'flexible', 'development'],
        displayOrder: 12
      }
    };

    // =========================================================================
    // LEGACY TEMPLATE ALIASES (for backward compatibility)
    // =========================================================================
    // These are references to new templates, allowing old template IDs to work
    this.templates['beginner-setup'] = this._createLegacyAlias('beginner-setup', 'quick-start');
    this.templates['home-node'] = this._createLegacyAlias('home-node', 'kaspa-node');
    this.templates['public-node'] = this._createLegacyAlias('public-node', 'kaspa-node');
    this.templates['full-node'] = this._createLegacyAlias('full-node', 'kaspa-sovereignty');
    this.templates['full-stack'] = this._createLegacyAlias('full-stack', 'kaspa-sovereignty');
    this.templates['developer-setup'] = this._createLegacyAlias('developer-setup', 'custom-setup');
    this.templates['developer'] = this._createLegacyAlias('developer', 'custom-setup');
    this.templates['mining-rig'] = this._createLegacyAlias('mining-rig', 'solo-miner');
    this.templates['miner-node'] = this._createLegacyAlias('miner-node', 'solo-miner');
    this.templates['mining-setup'] = this._createLegacyAlias('mining-setup', 'solo-miner');

    // Developer Mode features
    this.developerModeFeatures = {
      debugLogging: true,
      exposedPorts: [9000, 5050],
      inspectionTools: ['portainer', 'pgadmin'],
      logAccess: true,
      developmentUtilities: []
    };
  }

  // =========================================================================
  // Legacy Template Alias Helper
  // =========================================================================

  /**
   * Create a legacy template alias that points to a new template
   * @private
   */
  _createLegacyAlias(oldId, newId) {
    const newTemplate = this.templates[newId];
    if (!newTemplate) {
      console.warn(`Cannot create legacy alias '${oldId}' -> '${newId}': target template not found`);
      return null;
    }
    
    return {
      ...newTemplate,
      id: oldId,  // Keep old ID for compatibility
      _isLegacyAlias: true,
      _aliasOf: newId,
      _deprecationWarning: `Template '${oldId}' is deprecated. Please use '${newId}' instead.`
    };
  }

  // =========================================================================
  // Migration Helper Methods
  // =========================================================================

  /**
   * Migrate old template ID to new template ID
   * @param {string} oldTemplateId - Old template ID
   * @returns {string} New template ID
   */
  migrateTemplateId(oldTemplateId) {
    // Check if it's already a new template ID
    const template = this.templates[oldTemplateId];
    if (template && !template._isLegacyAlias) {
      return oldTemplateId;
    }
    
    // Check migration mapping
    if (TEMPLATE_ID_MIGRATION[oldTemplateId]) {
      return TEMPLATE_ID_MIGRATION[oldTemplateId];
    }
    
    // Unknown template ID
    return oldTemplateId;
  }

  /**
   * Check if a template ID is a legacy (deprecated) ID
   * @param {string} templateId - Template ID to check
   * @returns {boolean} True if this is a legacy template ID
   */
  isLegacyTemplateId(templateId) {
    const template = this.templates[templateId];
    return template && template._isLegacyAlias === true;
  }

  /**
   * Migrate old profile ID to new profile ID(s)
   * @param {string} oldProfileId - Old profile ID
   * @returns {string|string[]} New profile ID(s)
   */
  migrateProfileId(oldProfileId) {
    if (this.profiles[oldProfileId]) {
      // Already a valid new profile ID
      return oldProfileId;
    }
    
    const migration = PROFILE_ID_MIGRATION[oldProfileId];
    if (migration) {
      return migration;
    }
    
    // Unknown profile ID
    console.warn(`Unknown profile ID for migration: ${oldProfileId}`);
    return oldProfileId;
  }

  /**
   * Migrate an array of old profile IDs to new profile IDs
   * @param {string[]} oldProfileIds - Array of old profile IDs
   * @returns {string[]} Array of new profile IDs (flattened)
   */
  migrateProfileIds(oldProfileIds) {
    const newIds = [];
    
    for (const oldId of oldProfileIds) {
      const migrated = this.migrateProfileId(oldId);
      if (Array.isArray(migrated)) {
        newIds.push(...migrated);
      } else {
        newIds.push(migrated);
      }
    }
    
    // Remove duplicates
    return [...new Set(newIds)];
  }

  /**
   * Check if a profile ID is an old (legacy) ID
   * @param {string} profileId - Profile ID to check
   * @returns {boolean} True if this is a legacy profile ID
   */
  isLegacyProfileId(profileId) {
    return PROFILE_ID_MIGRATION.hasOwnProperty(profileId) && !this.profiles[profileId];
  }

  /**
   * Get the Docker service name for a profile
   * Some profiles have different Docker service names than profile IDs
   * @param {string} profileId - Profile ID
   * @returns {string} Docker service name
   */
  getDockerServiceName(profileId) {
    const profile = this.profiles[profileId];
    if (!profile) return profileId;
    
    // Check if profile has a custom Docker service name
    if (profile.dockerServiceName) {
      return profile.dockerServiceName;
    }
    
    // Default: use profile ID
    return profileId;
  }

  /**
   * Get all services for a profile (handles bundles)
   * @param {string} profileId - Profile ID
   * @returns {string[]} Array of service names
   */
  getProfileServices(profileId) {
    const profile = this.profiles[profileId];
    if (!profile) return [];
    
    return profile.services.map(s => 
      typeof s === 'object' ? s.name : s
    );
  }

  /**
   * Check if a profile is a bundle (contains multiple services)
   * @param {string} profileId - Profile ID
   * @returns {boolean} True if profile is a bundle
   */
  isBundle(profileId) {
    const profile = this.profiles[profileId];
    return profile && profile.isBundle === true;
  }

  /**
   * Get profile IDs by category
   * @param {string} category - Category filter (beginner, intermediate, advanced)
   * @returns {string[]} Array of profile IDs
   */
  getProfilesByCategory(category) {
    return Object.values(this.profiles)
      .filter(p => p.category === category)
      .map(p => p.id);
  }

  // =========================================================================
  // Basic Profile Access Methods (with legacy support)
  // =========================================================================

  getProfile(profileId) {
    // First check if it's a valid new profile ID
    if (this.profiles[profileId]) {
      return this.profiles[profileId];
    }
    
    // Check if it's a legacy profile ID that needs migration
    if (this.isLegacyProfileId(profileId)) {
      const migratedId = this.migrateProfileId(profileId);
      // If migration returns array, return first profile (for backward compat)
      const newId = Array.isArray(migratedId) ? migratedId[0] : migratedId;
      console.warn(`Legacy profile ID '${profileId}' accessed. Please update to '${newId}'`);
      return this.profiles[newId];
    }
    
    return null;
  }

  getAllProfiles() {
    return Object.values(this.profiles);
  }

  getTemplate(templateId) {
    const template = this.templates[templateId];
    
    if (!template) {
      return null;
    }
    
    // Log deprecation warning for legacy aliases
    if (template._isLegacyAlias) {
      console.warn(template._deprecationWarning);
    }
    
    return template;
  }

  getAllTemplates() {
    return Object.values(this.templates)
      .filter(t => !t._isLegacyAlias)  // Exclude legacy aliases
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }

  // =========================================================================
  // Dependency Resolution (with legacy support)
  // =========================================================================

  resolveProfileDependencies(profileIds) {
    const resolved = new Set();
    const stack = [...profileIds];
    
    while (stack.length > 0) {
      const profileId = stack.pop();
      
      // Skip if already resolved
      if (resolved.has(profileId)) continue;
      
      // Handle legacy profile IDs
      let actualProfileId = profileId;
      if (this.isLegacyProfileId(profileId)) {
        const migrated = this.migrateProfileId(profileId);
        // If migration returns array, add all to stack
        if (Array.isArray(migrated)) {
          stack.push(...migrated);
          continue;
        }
        actualProfileId = migrated;
      }
      
      const profile = this.profiles[actualProfileId];
      if (!profile) {
        console.warn(`Profile '${actualProfileId}' not found during dependency resolution`);
        continue;
      }
      
      resolved.add(actualProfileId);
      
      // Add dependencies to stack
      if (profile.dependencies && profile.dependencies.length > 0) {
        for (const dep of profile.dependencies) {
          if (!resolved.has(dep)) {
            stack.push(dep);
          }
        }
      }
    }
    
    return Array.from(resolved);
  }

  // Basic startup order calculation
  getStartupOrder(profileIds) {
    const allProfiles = this.resolveProfileDependencies(profileIds);
    const services = [];
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const service of profile.services) {
        services.push({
          ...service,
          profile: profileId,
          profileName: profile.name
        });
      }
    }
    
    return services.sort((a, b) => {
      if (a.startupOrder !== b.startupOrder) {
        return a.startupOrder - b.startupOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // =========================================================================
  // Profile Validation Methods
  // =========================================================================

  validateProfileSelection(profileIds) {
    const errors = [];
    const warnings = [];
    
    // Migrate any legacy profile IDs first
    const migratedIds = this.migrateProfileIds(profileIds);
    
    // Check if core profile or archive-node is included (one is required for some setups)
    const allProfiles = this.resolveProfileDependencies(migratedIds);
    const hasNodeProfile = allProfiles.includes('kaspa-node') || allProfiles.includes('kaspa-archive-node');
    
    // Note: With new granular profiles, node is not always required
    // Apps can use public indexers without a local node
    
    // Check prerequisites for each profile
    for (const profileId of migratedIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      if (profile.prerequisites && profile.prerequisites.length > 0) {
        const prerequisitesMode = profile.prerequisitesMode || 'any';
        
        if (prerequisitesMode === 'any') {
          // Only ONE prerequisite needed
          const hasPrerequisite = profile.prerequisites.some(prereq => 
            allProfiles.includes(prereq)
          );
          
          if (!hasPrerequisite) {
            errors.push({
              type: 'missing_prerequisite',
              profile: profileId,
              message: `${profile.name} requires one of: ${profile.prerequisites.map(p => this.profiles[p]?.name || p).join(', ')}`
            });
          }
        } else {
          // All prerequisites needed
          for (const prereq of profile.prerequisites) {
            if (!allProfiles.includes(prereq)) {
              errors.push({
                type: 'missing_prerequisite',
                profile: profileId,
                message: `${profile.name} requires ${this.profiles[prereq]?.name || prereq}`
              });
            }
          }
        }
      }
    }
    
    // Check for profile conflicts
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile || !profile.conflicts) continue;
      
      for (const conflictId of profile.conflicts) {
        if (allProfiles.includes(conflictId)) {
          errors.push({
            type: 'profile_conflict',
            message: `${profile.name} conflicts with ${this.profiles[conflictId]?.name || conflictId}`
          });
        }
      }
    }
    
    // Check resource requirements
    const requirements = this.calculateResourceRequirements(migratedIds);
    if (requirements.minMemory > 32) {
      warnings.push({
        type: 'high_resources',
        message: `Selected profiles require ${requirements.minMemory}GB RAM - ensure your system has sufficient resources`
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolvedProfiles: allProfiles,
      requirements
    };
  }

  detectCircularDependencies(profileIds) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (profileId, path = []) => {
      if (recursionStack.has(profileId)) {
        const cycleStart = path.indexOf(profileId);
        cycles.push(path.slice(cycleStart).concat(profileId));
        return;
      }
      
      if (visited.has(profileId)) {
        return;
      }
      
      visited.add(profileId);
      recursionStack.add(profileId);
      path.push(profileId);
      
      const profile = this.profiles[profileId];
      if (profile && profile.dependencies) {
        for (const dep of profile.dependencies) {
          dfs(dep, [...path]);
        }
      }
      
      recursionStack.delete(profileId);
    };
    
    for (const profileId of profileIds) {
      dfs(profileId);
    }
    
    return cycles;
  }

  detectConflicts(profileIds) {
    const conflicts = [];
    const allProfiles = this.resolveProfileDependencies(profileIds);
    const portMap = new Map();
    
    for (const profileId of allProfiles) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const port of profile.ports) {
        if (portMap.has(port)) {
          conflicts.push({
            type: 'port',
            port,
            profiles: [portMap.get(port), profileId],
            message: `Port ${port} is used by both ${portMap.get(port)} and ${profileId}`
          });
        } else {
          portMap.set(port, profileId);
        }
      }
    }
    
    return conflicts;
  }

  // =========================================================================
  // Template-related Methods
  // =========================================================================

  getTemplatesByCategory(category) {
    return Object.values(this.templates)
      .filter(t => !t._isLegacyAlias && t.category === category)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }

  getTemplatesByUseCase(useCase) {
    return Object.values(this.templates)
      .filter(t => !t._isLegacyAlias && t.useCase === useCase)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }

  searchTemplatesByTags(tags) {
    return Object.values(this.templates)
      .filter(t => !t._isLegacyAlias && t.tags && t.tags.some(tag => tags.includes(tag)))
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }

  applyTemplate(templateId, baseConfig = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Merge template config with base config (template takes precedence)
    const mergedConfig = { ...baseConfig, ...template.config };

    // Apply developer mode if template specifies it
    if (template.developerMode) {
      return this.applyDeveloperMode(mergedConfig, true);
    }

    return mergedConfig;
  }

  validateTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Warn if using legacy template
    if (template._isLegacyAlias) {
      warnings.push(template._deprecationWarning);
    }

    // Validate that all profiles in template exist (with migration support)
    for (const profileId of template.profiles) {
      // Check if profile exists directly
      if (this.profiles[profileId]) {
        continue;
      }
      
      // Check if it's a legacy profile ID that can be migrated
      if (this.isLegacyProfileId(profileId)) {
        warnings.push(`Template uses legacy profile ID '${profileId}'`);
        continue;
      }
      
      // Profile truly doesn't exist
      errors.push(`Template references unknown profile: ${profileId}`);
    }

    // Profile conflict checking
    if (errors.length === 0 && template.profiles.length > 0) {
      const migratedProfiles = this.migrateProfileIds(template.profiles);
      const conflicts = this.checkProfileConflicts(migratedProfiles);
      if (conflicts.length > 0) {
        errors.push(...conflicts.map(c => `Profile conflict: ${c.profile1} conflicts with ${c.profile2}`));
      }
    }

    // Check required config fields
    if (template.requiredConfig && template.requiredConfig.length > 0) {
      for (const field of template.requiredConfig) {
        if (!template.config[field] || template.config[field] === '') {
          warnings.push(`Template requires user to provide: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      template
    };
  }

  getTemplateRecommendations(systemResources, useCase) {
    const templates = Object.values(this.templates);
    const recommendations = [];

    for (const template of templates) {
      let score = 0;
      let suitability = 'suitable';
      const reasons = [];

      // Check resource compatibility
      if (systemResources.memory >= template.resources.recommendedMemory) {
        score += 3;
        reasons.push('Meets recommended memory requirements');
      } else if (systemResources.memory >= template.resources.minMemory) {
        score += 1;
        reasons.push('Meets minimum memory requirements');
      } else {
        suitability = 'insufficient';
        reasons.push(`Requires ${template.resources.minMemory}GB RAM (you have ${systemResources.memory}GB)`);
      }

      if (systemResources.cpu >= template.resources.recommendedCpu) {
        score += 2;
      } else if (systemResources.cpu >= template.resources.minCpu) {
        score += 1;
      }

      if (systemResources.disk >= template.resources.recommendedDisk) {
        score += 2;
      } else if (systemResources.disk >= template.resources.minDisk) {
        score += 1;
      }

      // Use case matching
      if (template.useCase === useCase) {
        score += 5;
        reasons.push('Perfect match for your use case');
      }

      // Category bonus for beginners
      if (useCase === 'personal' && template.category === 'beginner') {
        score += 2;
        reasons.push('Beginner-friendly');
      }

      recommendations.push({
        template,
        score,
        suitability,
        reasons,
        recommended: score >= 5 && suitability === 'suitable'
      });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  createCustomTemplate(templateData) {
    const { id, name, description, profiles, config, metadata = {} } = templateData;

    // Validate required fields
    if (!id || !name || !description || !profiles || !config) {
      throw new Error('Missing required template fields: id, name, description, profiles, config');
    }

    // Validate profiles exist (with migration support)
    for (const profileId of profiles) {
      if (!this.profiles[profileId] && !this.isLegacyProfileId(profileId)) {
        throw new Error(`Unknown profile: ${profileId}`);
      }
    }

    // Calculate resources based on selected profiles (with migration)
    const migratedProfiles = this.migrateProfileIds(profiles);
    const resources = this.calculateResourceRequirements(migratedProfiles);

    const template = {
      id,
      name,
      description,
      longDescription: metadata.longDescription || description,
      profiles,
      category: metadata.category || 'custom',
      useCase: metadata.useCase || 'custom',
      estimatedSetupTime: metadata.estimatedSetupTime || 'Variable',
      syncTime: metadata.syncTime || 'Variable',
      icon: metadata.icon || '⚙️',
      config,
      resources,
      features: metadata.features || [],
      benefits: metadata.benefits || [],
      customizable: true,
      custom: true,
      createdAt: new Date().toISOString(),
      tags: metadata.tags || ['custom']
    };

    return template;
  }

  saveCustomTemplate(template) {
    if (!template.id) {
      throw new Error('Template must have an ID');
    }

    this.templates[template.id] = template;
    return true;
  }

  deleteCustomTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    if (!template.custom) {
      throw new Error('Cannot delete built-in templates');
    }

    delete this.templates[templateId];
    return true;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  checkProfileConflicts(profileIds) {
    const conflicts = [];
    
    for (const profileId of profileIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;
      
      for (const conflictId of profile.conflicts || []) {
        if (profileIds.includes(conflictId)) {
          conflicts.push({ profile1: profileId, profile2: conflictId });
        }
      }
    }
    
    return conflicts;
  }

  calculateResourceRequirements(profileIds) {
    // Migrate any legacy profile IDs first
    const migratedIds = this.migrateProfileIds(profileIds);
    
    let minMemory = 0;
    let minCpu = 0;
    let minDisk = 0;
    let recommendedMemory = 0;
    let recommendedCpu = 0;
    let recommendedDisk = 0;

    for (const profileId of migratedIds) {
      const profile = this.profiles[profileId];
      if (!profile) continue;

      minMemory += profile.resources.minMemory;
      minCpu = Math.max(minCpu, profile.resources.minCpu);
      minDisk += profile.resources.minDisk;
      recommendedMemory += profile.resources.recommendedMemory;
      recommendedCpu = Math.max(recommendedCpu, profile.resources.recommendedCpu);
      recommendedDisk += profile.resources.recommendedDisk;
    }

    return {
      minMemory,
      minCpu,
      minDisk,
      recommendedMemory,
      recommendedCpu,
      recommendedDisk
    };
  }

  // =========================================================================
  // Developer Mode Features
  // =========================================================================

  getDeveloperModeFeatures() {
    return { ...this.developerModeFeatures };
  }

  applyDeveloperMode(config, enabled = false) {
    if (!enabled) {
      return config;
    }

    const devConfig = { ...config };
    
    if (this.developerModeFeatures.debugLogging) {
      devConfig.LOG_LEVEL = 'debug';
    }
    
    if (this.developerModeFeatures.inspectionTools) {
      devConfig.ENABLE_PORTAINER = 'true';
      devConfig.ENABLE_PGADMIN = 'true';
    }
    
    if (this.developerModeFeatures.logAccess) {
      devConfig.ENABLE_LOG_ACCESS = 'true';
    }
    
    return devConfig;
  }
}

// Export migration constants for use in other modules
ProfileManager.PROFILE_ID_MIGRATION = PROFILE_ID_MIGRATION;
ProfileManager.PROFILE_ID_REVERSE_MIGRATION = PROFILE_ID_REVERSE_MIGRATION;
ProfileManager.TEMPLATE_ID_MIGRATION = TEMPLATE_ID_MIGRATION;

module.exports = ProfileManager;
