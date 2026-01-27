const express = require('express');
const router = express.Router();

/**
 * Simple Template API - Bypasses ProfileManager circular reference issues
 * Provides direct template data without complex object relationships
 * 
 * Updated for Phase 1, Step 3: New 8-profile architecture with 12 templates
 */

/**
 * Valid profile IDs (NEW - 8 granular profiles)
 */
const VALID_PROFILES = [
  'kaspa-node',
  'kasia-app',
  'k-social-app',
  'kaspa-explorer-bundle',
  'kasia-indexer',
  'k-indexer-bundle',
  'kaspa-archive-node',
  'kaspa-stratum'
];

/**
 * Legacy profile IDs (for backward compatibility)
 */
const LEGACY_PROFILES = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];

/**
 * Profile ID migration mapping
 */
const PROFILE_ID_MIGRATION = {
  'core': 'kaspa-node',
  'kaspa-user-applications': ['kasia-app', 'k-social-app'],
  'indexer-services': ['kasia-indexer', 'k-indexer-bundle'],
  'archive-node': 'kaspa-archive-node',
  'mining': 'kaspa-stratum'
};

/**
 * Check if a profile ID is valid (includes legacy support)
 */
function isValidProfile(profileId) {
  return VALID_PROFILES.includes(profileId) || LEGACY_PROFILES.includes(profileId);
}

/**
 * Migrate legacy profile ID to new profile ID(s)
 */
function migrateProfileId(profileId) {
  if (VALID_PROFILES.includes(profileId)) {
    return profileId;
  }
  return PROFILE_ID_MIGRATION[profileId] || profileId;
}

/**
 * Migrate array of profile IDs (flattens arrays)
 */
function migrateProfileIds(profileIds) {
  const result = [];
  for (const id of profileIds) {
    const migrated = migrateProfileId(id);
    if (Array.isArray(migrated)) {
      result.push(...migrated);
    } else {
      result.push(migrated);
    }
  }
  return [...new Set(result)]; // Remove duplicates
}

/**
 * Profile dependencies
 * Format: { profileId: { requires: [...], requiresAny: boolean } }
 */
const PROFILE_DEPENDENCIES = {
  // Stratum requires a local node (either standard or archive)
  'kaspa-stratum': {
    requires: ['kaspa-node', 'kaspa-archive-node'],
    requiresAny: true,  // Only ONE of these is needed
    message: 'Kaspa Stratum requires a local Kaspa node (standard or archive)'
  }
};

/**
 * Profile prerequisites (soft dependencies - recommended but not required)
 * These profiles work better with a node but can use remote
 */
const PROFILE_PREREQUISITES = {
  'kasia-indexer': {
    recommends: ['kaspa-node', 'kaspa-archive-node'],
    recommendsAny: true,
    canUseRemote: true,
    remoteConfigKey: 'REMOTE_KASPA_NODE_WRPC_URL'
  },
  'k-indexer-bundle': {
    recommends: ['kaspa-node', 'kaspa-archive-node'],
    recommendsAny: true,
    canUseRemote: true,
    remoteConfigKey: 'REMOTE_KASPA_NODE_WRPC_URL'
  },
  'kaspa-explorer-bundle': {
    recommends: ['kaspa-node', 'kaspa-archive-node'],
    recommendsAny: true,
    canUseRemote: true,
    remoteConfigKey: 'REMOTE_KASPA_NODE_WRPC_URL'
  }
};

/**
 * Profile conflicts (mutually exclusive profiles)
 */
const PROFILE_CONFLICTS = {
  'kaspa-node': ['kaspa-archive-node'],
  'kaspa-archive-node': ['kaspa-node']
};

/**
 * Check if profile selection has conflicts
 */
function checkProfileConflicts(profileIds) {
  const conflicts = [];
  const migratedIds = migrateProfileIds(profileIds);
  
  for (const profileId of migratedIds) {
    const conflictingProfiles = PROFILE_CONFLICTS[profileId] || [];
    for (const conflictId of conflictingProfiles) {
      if (migratedIds.includes(conflictId)) {
        conflicts.push({
          profile1: profileId,
          profile2: conflictId,
          message: `${profileId} conflicts with ${conflictId} (they use the same ports)`
        });
      }
    }
  }
  
  // Remove duplicate conflicts (A conflicts B === B conflicts A)
  const uniqueConflicts = [];
  const seen = new Set();
  for (const c of conflicts) {
    const key = [c.profile1, c.profile2].sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueConflicts.push(c);
    }
  }
  
  return uniqueConflicts;
}

/**
 * Required configuration fields per profile
 */
const PROFILE_CONFIG_REQUIREMENTS = {
  'kaspa-node': ['KASPA_NETWORK'],
  'kasia-app': [],
  'k-social-app': [],
  'kaspa-explorer-bundle': [],
  'kasia-indexer': [],
  'k-indexer-bundle': [],
  'kaspa-archive-node': ['KASPA_NETWORK'],
  'kaspa-stratum': ['MINING_ADDRESS']  // User MUST provide
};

/**
 * Optional configuration fields per profile
 */
const PROFILE_CONFIG_OPTIONAL = {
  'kaspa-node': ['PUBLIC_NODE', 'WALLET_ENABLED', 'WALLET_MODE', 'UTXO_INDEX', 'EXTERNAL_IP'],
  'kasia-app': ['KASIA_INDEXER_MODE', 'REMOTE_KASIA_INDEXER_URL'],
  'k-social-app': ['KSOCIAL_INDEXER_MODE', 'REMOTE_KSOCIAL_INDEXER_URL'],
  'kaspa-explorer-bundle': ['SIMPLY_KASPA_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
  'kasia-indexer': ['KASIA_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
  'k-indexer-bundle': ['K_INDEXER_NODE_MODE', 'REMOTE_KASPA_NODE_WRPC_URL'],
  'kaspa-archive-node': ['PUBLIC_NODE', 'EXTERNAL_IP'],
  'kaspa-stratum': ['STRATUM_PORT', 'VAR_DIFF', 'POOL_MODE']
};

/**
 * Get default configuration values for a profile
 * @param {string} profileId - Profile ID (supports legacy IDs)
 * @returns {Object} Default configuration values
 */
function getProfileDefaults(profileId) {
  // Handle legacy profile IDs
  const migrated = migrateProfileId(profileId);
  const actualId = Array.isArray(migrated) ? migrated[0] : migrated;
  
  const defaults = {
    'kaspa-node': {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: false,
      WALLET_ENABLED: false,
      WALLET_MODE: 'none',
      UTXO_INDEX: true
    },
    'kasia-app': {
      KASIA_APP_PORT: 3001,
      KASIA_INDEXER_MODE: 'auto',
      KASIA_INDEXER_URL: 'http://kasia-indexer:8080',
      REMOTE_KASIA_INDEXER_URL: 'https://api.kasia.io',
      REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
    },
    'k-social-app': {
      KSOCIAL_APP_PORT: 3003,
      KSOCIAL_INDEXER_MODE: 'auto',
      KSOCIAL_INDEXER_URL: 'http://k-indexer:8080',
      REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/',
      KSOCIAL_NODE_MODE: 'auto',
      KSOCIAL_NODE_WRPC_URL: 'ws://kaspa-node:17110',
      REMOTE_KASPA_NODE_WRPC_URL: 'wss://wrpc.kasia.fyi'
    },
    'kaspa-explorer-bundle': {
      KASPA_EXPLORER_PORT: 3004,
      SIMPLY_KASPA_INDEXER_PORT: 3005,
      SIMPLY_KASPA_NODE_MODE: 'local',
      SIMPLY_KASPA_NODE_WRPC_URL: 'ws://kaspa-node:17110',
      TIMESCALEDB_EXPLORER_PORT: 5434,
      POSTGRES_USER_EXPLORER: 'kaspa_explorer',
      POSTGRES_DB_EXPLORER: 'simply_kaspa'
    },
    'kasia-indexer': {
      KASIA_INDEXER_PORT: 3002,
      KASIA_NODE_MODE: 'local',
      KASIA_NODE_WRPC_URL: 'ws://kaspa-node:17110'
    },
    'k-indexer-bundle': {
      K_INDEXER_PORT: 3006,
      K_INDEXER_NODE_MODE: 'local',
      K_INDEXER_NODE_WRPC_URL: 'ws://kaspa-node:17110',
      TIMESCALEDB_KINDEXER_PORT: 5433,
      POSTGRES_USER_KINDEXER: 'k_indexer',
      POSTGRES_DB_KINDEXER: 'k_indexer'
    },
    'kaspa-archive-node': {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: true,
      ARCHIVE_MODE: true,
      UTXO_INDEX: true
    },
    'kaspa-stratum': {
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
  };
  
  return defaults[actualId] || {};
}


/**
 * Template definitions (no circular references)
 * These mirror ProfileManager templates but are self-contained for API use
 */
const templates = {
  // =========================================================================
  // BEGINNER TEMPLATES (4)
  // =========================================================================
  
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
    features: ['Full Kaspa node with network sync', 'Optional wallet functionality', 'Low resource requirements', 'Foundation for other services'],
    benefits: ['Support network decentralization', 'Validate your own transactions', 'No external dependencies', 'Privacy for your operations'],
    customizable: true,
    tags: ['node', 'beginner', 'personal', 'kaspa', 'blockchain'],
    displayOrder: 1
  },

  'quick-start': {
    id: 'quick-start',
    name: 'Quick Start',
    description: 'Get started instantly with Kaspa applications using public infrastructure.',
    longDescription: 'Run both Kasia and K-Social applications locally while connecting to public indexers. This is the fastest way to experience Kaspa applications with minimal setup and resource requirements.',
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
    features: ['Both Kasia and K-Social apps', 'Uses public indexers', 'Minimal resource requirements', 'Instant setup'],
    benefits: ['Try Kaspa apps immediately', 'No infrastructure to maintain', 'Lowest resource requirements', 'Easy upgrade path'],
    customizable: true,
    tags: ['apps', 'beginner', 'quick', 'public', 'minimal'],
    displayOrder: 2
  },

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
    features: ['Kasia messaging application', 'Uses public Kasia indexer', 'Minimal resource requirements', 'No sync time required'],
    benefits: ['Simple Kasia-only setup', 'Instant messaging access', 'Very low resources', 'Easy to upgrade later'],
    customizable: true,
    tags: ['kasia', 'app', 'beginner', 'messaging', 'lite'],
    displayOrder: 3
  },

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
    features: ['K-Social decentralized social app', 'Uses public K-Social indexer', 'Minimal resource requirements', 'No sync time required'],
    benefits: ['Simple K-Social-only setup', 'Instant social access', 'Very low resources', 'Easy to upgrade later'],
    customizable: true,
    tags: ['k-social', 'app', 'beginner', 'social', 'lite'],
    displayOrder: 4
  },

  // =========================================================================
  // INTERMEDIATE TEMPLATES (4)
  // =========================================================================
  
  'kasia-suite': {
    id: 'kasia-suite',
    name: 'Kasia Suite',
    description: 'Full Kasia experience with your own local indexer.',
    longDescription: 'Run the Kasia application with your own local Kasia indexer. This provides complete independence from public infrastructure, better performance, and full privacy.',
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
    features: ['Kasia messaging application', 'Local Kasia indexer (embedded database)', 'Independence from public indexers', 'Better performance and privacy'],
    benefits: ['Full Kasia independence', 'No reliance on public infrastructure', 'Better performance', 'Complete privacy'],
    customizable: true,
    tags: ['kasia', 'indexer', 'intermediate', 'suite', 'local'],
    displayOrder: 5
  },

  'k-social-suite': {
    id: 'k-social-suite',
    name: 'K-Social Suite',
    description: 'Full K-Social experience with your own local indexer and database.',
    longDescription: 'Run the K-Social application with your own local K-Indexer and dedicated TimescaleDB database. This provides complete independence from public infrastructure.',
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
    features: ['K-Social decentralized social app', 'Local K-Indexer with TimescaleDB', 'Independence from public indexers', 'Better performance and privacy'],
    benefits: ['Full K-Social independence', 'No reliance on public infrastructure', 'Your data stays local', 'Better query performance'],
    customizable: true,
    tags: ['k-social', 'indexer', 'intermediate', 'suite', 'local', 'timescaledb'],
    displayOrder: 6
  },

  'solo-miner': {
    id: 'solo-miner',
    name: 'Solo Miner',
    description: 'Solo mining setup with your own node and stratum bridge.',
    longDescription: 'A complete solo mining setup including a Kaspa node and stratum bridge. Connect your mining hardware directly to your own node for solo mining.',
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
    features: ['Full Kaspa node', 'Stratum bridge for mining hardware', 'Solo mining (not pool)', 'Direct block rewards'],
    benefits: ['Keep all block rewards', 'No pool fees', 'Direct network participation', 'Full control over mining'],
    customizable: true,
    tags: ['mining', 'stratum', 'node', 'intermediate', 'solo'],
    requiredConfig: ['MINING_ADDRESS'],
    displayOrder: 7
  },

  'block-explorer': {
    id: 'block-explorer',
    name: 'Block Explorer',
    description: 'Run your own blockchain explorer with integrated indexer.',
    longDescription: 'A complete blockchain explorer with the Simply-Kaspa indexer and dedicated TimescaleDB database. Browse blocks, transactions, and addresses on your own infrastructure.',
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
    features: ['Full blockchain explorer UI', 'Simply-Kaspa indexer with TimescaleDB', 'Block, transaction, and address lookup', 'Independent verification capability'],
    benefits: ['Verify transactions yourself', 'No reliance on public explorers', 'Development and debugging tool', 'Complete blockchain visibility'],
    customizable: true,
    tags: ['explorer', 'indexer', 'intermediate', 'development', 'blockchain'],
    displayOrder: 8
  },

  // =========================================================================
  // ADVANCED TEMPLATES (4)
  // =========================================================================
  
  'kaspa-sovereignty': {
    id: 'kaspa-sovereignty',
    name: 'Kaspa Sovereignty',
    description: 'Complete Kaspa independence. Your own node, all apps, all indexers.',
    longDescription: 'The ultimate self-sovereign Kaspa setup. Run your own node with all applications (Kasia, K-Social, Explorer) and all their indexers locally. Complete independence from any external infrastructure.',
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
    features: ['Full Kaspa node', 'Kasia app with local indexer', 'K-Social app with local indexer + TimescaleDB', 'Full blockchain explorer', 'Complete independence'],
    benefits: ['Total sovereignty', 'Maximum privacy', 'No external dependencies', 'Best possible performance'],
    customizable: true,
    tags: ['sovereignty', 'full-stack', 'advanced', 'complete', 'independent'],
    displayOrder: 9
  },

  'archival-node': {
    id: 'archival-node',
    name: 'Archival Node',
    description: 'Non-pruning archive node storing complete blockchain history.',
    longDescription: 'A non-pruning Kaspa node that stores the complete blockchain history. Required for historical data analysis, advanced indexing operations, and infrastructure providers.',
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
    features: ['Complete blockchain history (non-pruning)', 'Suitable for historical queries', 'Required for some advanced indexer operations', 'Typically run as a public node'],
    benefits: ['Access to complete history', 'Support advanced use cases', 'Provide infrastructure for others', 'Historical analysis capability'],
    customizable: true,
    tags: ['archive', 'node', 'advanced', 'production', 'history'],
    displayOrder: 10
  },

  'archival-miner': {
    id: 'archival-miner',
    name: 'Archival Miner',
    description: 'Archive node with mining capability. Full history plus solo mining.',
    longDescription: 'Combines a non-pruning archive node with stratum bridge for mining. Useful for miners who also want to maintain complete blockchain history.',
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
    features: ['Complete blockchain history', 'Stratum bridge for mining hardware', 'Solo mining capability', 'Historical data for verification'],
    benefits: ['Mine while maintaining history', 'Research and verification', 'Maximum infrastructure capability', 'Full control'],
    customizable: true,
    tags: ['archive', 'mining', 'stratum', 'advanced', 'production'],
    requiredConfig: ['MINING_ADDRESS'],
    displayOrder: 11
  },

  'custom-setup': {
    id: 'custom-setup',
    name: 'Custom Setup',
    description: 'Build your own configuration by selecting individual profiles.',
    longDescription: 'Create a custom installation by selecting exactly which profiles you want. Choose any combination of services (respecting conflicts). Resources are calculated dynamically based on your selections.',
    profiles: [],
    category: 'advanced',
    useCase: 'development',
    estimatedSetupTime: 'Variable',
    syncTime: 'Variable',
    icon: '🛠️',
    config: {},
    resources: {
      minMemory: 0,
      minCpu: 0,
      minDisk: 0,
      recommendedMemory: 0,
      recommendedCpu: 0,
      recommendedDisk: 0
    },
    features: ['Select any combination of profiles', 'Conflict detection', 'Dependency recommendations', 'Dynamic resource calculation', 'Add or remove profiles'],
    benefits: ['Maximum flexibility', 'Exactly what you need', 'Expert-level control', 'Modify existing installations'],
    customizable: true,
    isDynamic: true,
    tags: ['custom', 'advanced', 'flexible', 'development'],
    displayOrder: 12
  }
};


/**
 * Legacy template aliases for backward compatibility
 * These map old template IDs to new ones
 */
const LEGACY_TEMPLATE_ALIASES = {
  'beginner-setup': 'quick-start',
  'home-node': 'kaspa-node',
  'public-node': 'kaspa-node',
  'full-node': 'kaspa-sovereignty',
  'full-stack': 'kaspa-sovereignty',
  'developer-setup': 'custom-setup',
  'developer': 'custom-setup',
  'mining-rig': 'solo-miner',
  'miner-node': 'solo-miner',
  'mining-setup': 'solo-miner'
};

/**
 * Get template by ID (with legacy alias support)
 * @param {string} templateId - Template ID (supports legacy IDs)
 * @returns {Object|null} Template object or null
 */
function getTemplate(templateId) {
  // Check for direct match
  if (templates[templateId]) {
    return templates[templateId];
  }
  
  // Check for legacy alias
  const aliasedId = LEGACY_TEMPLATE_ALIASES[templateId];
  if (aliasedId && templates[aliasedId]) {
    console.warn(`Template '${templateId}' is deprecated. Use '${aliasedId}' instead.`);
    // Return the new template but with the old ID for compatibility
    return {
      ...templates[aliasedId],
      _originalId: aliasedId,
      _requestedId: templateId,
      _isLegacyAlias: true
    };
  }
  
  return null;
}

/**
 * Get all templates (excludes legacy aliases)
 * @returns {Object[]} Array of template objects
 */
function getAllTemplates() {
  return Object.values(templates)
    .filter(t => !t._isLegacyAlias)
    .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
}

/**
 * Get templates by category
 * @param {string} category - Category filter
 * @returns {Object[]} Array of template objects
 */
function getTemplatesByCategory(category) {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Get templates by use case
 * @param {string} useCase - Use case filter
 * @returns {Object[]} Array of template objects
 */
function getTemplatesByUseCase(useCase) {
  return getAllTemplates().filter(t => t.useCase === useCase);
}

/**
 * Search templates by tags
 * @param {string[]} tags - Tags to search for
 * @returns {Object[]} Array of matching template objects
 */
function searchTemplatesByTags(tags) {
  return getAllTemplates().filter(t => 
    t.tags && t.tags.some(tag => tags.includes(tag))
  );
}

/**
 * Comprehensive template validation function
 * @param {string} templateId - Template ID to validate
 * @param {Object} systemResources - Optional system resources for compatibility check
 * @returns {Object} Validation result with errors, warnings, and fallback options
 */
function validateTemplate(templateId, systemResources = null) {
  const template = getTemplate(templateId);
  
  if (!template) {
    return {
      valid: false,
      errors: ['Template not found'],
      warnings: [],
      fallbackOptions: ['custom-setup'],
      templateId
    };
  }
  
  const errors = [];
  const warnings = [];
  const fallbackOptions = [];
  
  // 1. Warn if using legacy template ID
  if (template._isLegacyAlias) {
    warnings.push(`Template ID '${templateId}' is deprecated. Consider using '${template._originalId}' instead.`);
  }
  
  // 2. Validate template structure
  if (!template.id) {
    errors.push('Template ID is missing');
  }
  
  if (!template.name || typeof template.name !== 'string') {
    errors.push('Template name is required and must be a string');
  }
  
  if (!template.profiles || !Array.isArray(template.profiles)) {
    errors.push('Template must have profiles array');
  }
  
  // 3. Validate profile references (skip for dynamic templates)
  if (!template.isDynamic && template.profiles) {
    for (const profileId of template.profiles) {
      if (!isValidProfile(profileId)) {
        errors.push(`Template references unknown profile: ${profileId}`);
      }
    }
    
    // Check for profile conflicts
    const conflicts = checkProfileConflicts(template.profiles);
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        errors.push(conflict.message);
      }
    }
  }
  
  // 4. Check required config fields
  if (template.requiredConfig && template.requiredConfig.length > 0) {
    for (const field of template.requiredConfig) {
      if (!template.config || !template.config[field] || template.config[field] === '') {
        warnings.push(`Template requires user to provide: ${field}`);
      }
    }
  }
  
  // 5. Validate resources (if provided)
  if (systemResources && template.resources) {
    if (systemResources.memory < template.resources.minMemory) {
      warnings.push(`System has ${systemResources.memory}GB RAM, template requires ${template.resources.minMemory}GB minimum`);
      fallbackOptions.push('quick-start', 'kasia-lite', 'k-social-lite');
    }
    
    if (systemResources.disk < template.resources.minDisk) {
      warnings.push(`System has ${systemResources.disk}GB disk, template requires ${template.resources.minDisk}GB minimum`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fallbackOptions: [...new Set(fallbackOptions)],
    templateId: template._originalId || template.id,
    template
  };
}

/**
 * Enhanced configuration merging with conflict resolution
 * @param {Object} baseConfig - Base configuration
 * @param {Object} templateConfig - Template configuration
 * @param {Object} template - Full template object for context
 * @returns {Object} Merged configuration
 */
function mergeConfigurations(baseConfig, templateConfig, template) {
  const merged = { ...baseConfig };
  const conflicts = [];
  const overrides = [];
  
  // Merge template config, tracking conflicts and overrides
  for (const [key, templateValue] of Object.entries(templateConfig)) {
    if (baseConfig.hasOwnProperty(key) && baseConfig[key] !== templateValue) {
      conflicts.push({
        key,
        baseValue: baseConfig[key],
        templateValue,
        resolved: 'template-wins'
      });
      overrides.push(`${key}: ${baseConfig[key]} → ${templateValue}`);
    }
    merged[key] = templateValue;
  }
  
  // Log configuration merging details
  if (conflicts.length > 0) {
    console.log(`[CONFIG-MERGE] Configuration conflicts resolved (template wins): ${overrides.join(', ')}`);
  }
  
  // Add profile-specific defaults if not present
  if (template.profiles) {
    for (const profile of template.profiles) {
      const profileDefaults = getProfileDefaults(profile);
      for (const [key, defaultValue] of Object.entries(profileDefaults)) {
        if (!merged.hasOwnProperty(key)) {
          merged[key] = defaultValue;
          console.log(`[CONFIG-MERGE] Added profile default for ${profile}: ${key} = ${defaultValue}`);
        }
      }
    }
  }
  
  // Store merge metadata
  merged._configMergeMetadata = {
    conflicts,
    overrides,
    mergedAt: new Date().toISOString(),
    baseConfigSize: Object.keys(baseConfig).length,
    templateConfigSize: Object.keys(templateConfig).length,
    finalConfigSize: Object.keys(merged).length
  };
  
  return merged;
}

/**
 * Enhanced template application function with validation and logging
 * @param {string} templateId - Template ID to apply
 * @param {Object} baseConfig - Base configuration to merge with
 * @param {Object} systemResources - Optional system resources for validation
 * @returns {Object} Application result with success status and merged config
 */
function applyTemplate(templateId, baseConfig = {}, systemResources = null) {
  console.log(`[TEMPLATE-APPLICATION] Starting application of template: ${templateId}`);
  
  // First validate the template
  const validationResult = validateTemplate(templateId, systemResources);
  
  if (!validationResult.valid) {
    console.error(`[TEMPLATE-APPLICATION] Template validation failed for ${templateId}:`, validationResult.errors);
    return {
      success: false,
      message: `Template validation failed: ${validationResult.errors.join(', ')}`,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      fallbackOptions: validationResult.fallbackOptions,
      validationResult
    };
  }
  
  const template = validationResult.template;
  
  try {
    // Enhanced configuration merging logic
    const mergedConfig = mergeConfigurations(baseConfig, template.config, template);
    
    // Add application metadata
    const finalConfig = {
      ...mergedConfig,
      // Template metadata for tracking
      appliedTemplate: templateId,
      appliedAt: new Date().toISOString(),
      templateName: template.name,
      templateCategory: template.category,
      templateProfiles: template.profiles,
      // Configuration source tracking
      configurationSource: 'template',
      baseConfigKeys: Object.keys(baseConfig),
      templateConfigKeys: Object.keys(template.config)
    };
    
    // Log successful application
    console.log(`[TEMPLATE-APPLICATION] Successfully applied template: ${templateId}`);
    console.log(`[TEMPLATE-APPLICATION] Template profiles: ${template.profiles.join(', ')}`);
    console.log(`[TEMPLATE-APPLICATION] Configuration keys: ${Object.keys(finalConfig).length}`);
    
    if (validationResult.warnings.length > 0) {
      console.warn(`[TEMPLATE-APPLICATION] Warnings for ${templateId}:`, validationResult.warnings);
    }
    
    return {
      success: true,
      config: finalConfig,
      profiles: template.profiles,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        profiles: template.profiles,
        useCase: template.useCase
      },
      message: `Template "${template.name}" applied successfully`,
      warnings: validationResult.warnings,
      validationResult: {
        valid: true,
        warnings: validationResult.warnings,
        systemCompatibility: validationResult.systemCompatibility
      }
    };
  } catch (error) {
    console.error(`[TEMPLATE-APPLICATION] Error applying template ${templateId}:`, error);
    return {
      success: false,
      message: `Template application failed: ${error.message}`,
      errors: [error.message],
      fallbackOptions: ['custom-setup'],
      template: template ? {
        id: template.id,
        name: template.name
      } : null
    };
  }
}


// =============================================================================
// ROUTER ENDPOINTS
// =============================================================================

// GET /all - Get all templates
router.get('/all', (req, res) => {
  try {
    const allTemplates = getAllTemplates();
    res.json(allTemplates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// GET /category/:category - Get templates by category
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const categoryTemplates = getTemplatesByCategory(category);
    res.json(categoryTemplates);
  } catch (error) {
    console.error('Error getting templates by category:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// GET /usecase/:useCase - Get templates by use case
router.get('/usecase/:useCase', (req, res) => {
  try {
    const { useCase } = req.params;
    const useCaseTemplates = getTemplatesByUseCase(useCase);
    res.json(useCaseTemplates);
  } catch (error) {
    console.error('Error getting templates by use case:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// GET /:id - Get specific template
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const template = getTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// POST /search - Search templates by tags
router.post('/search', (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags array is required' });
    }
    
    const results = searchTemplatesByTags(tags);
    res.json(results);
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// POST /:id/validate - Validate template
router.post('/:id/validate', (req, res) => {
  try {
    const { id } = req.params;
    const { systemResources } = req.body;
    
    const validation = validateTemplate(id, systemResources);
    res.json(validation);
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({ error: 'Failed to validate template' });
  }
});

// GET /:id/validate - Validate template (GET version for backward compatibility)
router.get('/:id/validate', (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateTemplate(id);
    res.json(validation);
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({ error: 'Failed to validate template' });
  }
});

// POST /:id/apply - Apply template
router.post('/:id/apply', (req, res) => {
  try {
    const { id } = req.params;
    const { baseConfig, systemResources } = req.body;
    
    console.log(`[TEMPLATE-API] Applying template ${id} with base config keys: ${Object.keys(baseConfig || {}).join(', ')}`);
    
    const applicationResult = applyTemplate(id, baseConfig || {}, systemResources);
    
    if (!applicationResult.success) {
      const statusCode = applicationResult.errors && applicationResult.errors.some(e => e.includes('not found')) ? 404 : 400;
      return res.status(statusCode).json(applicationResult);
    }
    
    res.json(applicationResult);
  } catch (error) {
    console.error(`[TEMPLATE-API] Error in apply endpoint for ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: `Template application failed: ${error.message}`,
      errors: [error.message],
      fallbackOptions: ['custom-setup']
    });
  }
});

// POST /recommendations - Get template recommendations based on system resources
router.post('/recommendations', (req, res) => {
  try {
    const { systemResources, useCase } = req.body;
    console.log(`[TEMPLATE-API] Getting recommendations for use case: ${useCase}, resources:`, systemResources);
    
    if (!systemResources) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'System resources are required',
        fallbackOptions: ['custom-setup']
      });
    }
    
    const recommendations = [];
    
    for (const template of getAllTemplates()) {
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
    recommendations.sort((a, b) => b.score - a.score);
    
    const topRecommendations = recommendations.filter(r => r.recommended);
    console.log(`[TEMPLATE-API] Generated ${recommendations.length} recommendations, ${topRecommendations.length} highly recommended`);
    
    res.json({ 
      recommendations,
      topRecommendations,
      useCase,
      systemResources
    });
  } catch (error) {
    console.error('[TEMPLATE-API] Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to get template recommendations',
      message: error.message,
      fallbackOptions: ['custom-setup']
    });
  }
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;

// Also export functions for use in other modules
module.exports.templates = templates;
module.exports.VALID_PROFILES = VALID_PROFILES;
module.exports.LEGACY_PROFILES = LEGACY_PROFILES;
module.exports.PROFILE_ID_MIGRATION = PROFILE_ID_MIGRATION;
module.exports.PROFILE_CONFLICTS = PROFILE_CONFLICTS;
module.exports.PROFILE_DEPENDENCIES = PROFILE_DEPENDENCIES;
module.exports.PROFILE_PREREQUISITES = PROFILE_PREREQUISITES;
module.exports.PROFILE_CONFIG_REQUIREMENTS = PROFILE_CONFIG_REQUIREMENTS;
module.exports.PROFILE_CONFIG_OPTIONAL = PROFILE_CONFIG_OPTIONAL;
module.exports.LEGACY_TEMPLATE_ALIASES = LEGACY_TEMPLATE_ALIASES;
module.exports.getTemplate = getTemplate;
module.exports.getAllTemplates = getAllTemplates;
module.exports.getTemplatesByCategory = getTemplatesByCategory;
module.exports.getTemplatesByUseCase = getTemplatesByUseCase;
module.exports.searchTemplatesByTags = searchTemplatesByTags;
module.exports.validateTemplate = validateTemplate;
module.exports.applyTemplate = applyTemplate;
module.exports.getProfileDefaults = getProfileDefaults;
module.exports.isValidProfile = isValidProfile;
module.exports.migrateProfileId = migrateProfileId;
module.exports.migrateProfileIds = migrateProfileIds;
module.exports.checkProfileConflicts = checkProfileConflicts;
module.exports.mergeConfigurations = mergeConfigurations;
