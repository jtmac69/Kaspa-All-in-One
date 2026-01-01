const express = require('express');
const router = express.Router();

/**
 * Simple Template API - Bypasses ProfileManager circular reference issues
 * Provides direct template data without complex object relationships
 */

// Template definitions (no circular references)
const templates = {
  'beginner-setup': {
    id: 'beginner-setup',
    name: 'Beginner Setup',
    description: 'Simple setup for new users',
    longDescription: 'Perfect for users who want to get started quickly with Kaspa applications without running their own node.',
    profiles: ['kaspa-user-applications'],
    category: 'beginner',
    useCase: 'personal',
    estimatedSetupTime: '5 minutes',
    syncTime: 'Not required',
    icon: '🚀',
    config: {
      INDEXER_CHOICE: 'public',
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008
    },
    resources: {
      minMemory: 4,
      minCpu: 2,
      minDisk: 50,
      recommendedMemory: 8,
      recommendedCpu: 4,
      recommendedDisk: 200
    },
    features: [
      'Easy setup',
      'User applications',
      'Public indexers',
      'No node required'
    ],
    benefits: [
      'Quick start',
      'No complex configuration',
      'Low resource usage',
      'Immediate access'
    ],
    customizable: true,
    tags: ['beginner', 'personal', 'applications', 'public']
  },
  'full-node': {
    id: 'full-node',
    name: 'Full Node',
    description: 'Complete Kaspa node with all services',
    longDescription: 'Complete Kaspa setup with local node and indexers for maximum performance and privacy.',
    profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
    category: 'advanced',
    useCase: 'advanced',
    estimatedSetupTime: '15 minutes',
    syncTime: '2-4 hours',
    icon: '⚡',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      POSTGRES_USER: 'kaspa_user',
      TIMESCALEDB_PORT: 5432,
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008
    },
    resources: {
      minMemory: 16,
      minCpu: 4,
      minDisk: 500,
      recommendedMemory: 32,
      recommendedCpu: 8,
      recommendedDisk: 2000
    },
    features: [
      'Full node',
      'Local indexers',
      'All applications',
      'Complete privacy'
    ],
    benefits: [
      'Complete control',
      'Best performance',
      'Full privacy',
      'Network support'
    ],
    customizable: true,
    tags: ['advanced', 'node', 'indexers', 'applications']
  },
  'home-node': {
    id: 'home-node',
    name: 'Home Node',
    description: 'Basic Kaspa node for personal use',
    longDescription: 'A simple setup with just the Kaspa node running locally. Ideal for developers, enthusiasts, or anyone wanting to support the network.',
    profiles: ['core'],
    category: 'intermediate',
    useCase: 'personal',
    estimatedSetupTime: '10-15 minutes',
    syncTime: '2-4 hours',
    icon: '🏠',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet'
    },
    resources: {
      minMemory: 4,
      minCpu: 2,
      minDisk: 100,
      recommendedMemory: 8,
      recommendedCpu: 4,
      recommendedDisk: 500
    },
    features: [
      'Local Kaspa node',
      'Web dashboard',
      'Basic monitoring',
      'Wallet support'
    ],
    benefits: [
      'Support the Kaspa network',
      'Learn about blockchain technology',
      'Private node access',
      'No external dependencies'
    ],
    customizable: true,
    tags: ['intermediate', 'personal', 'node', 'wallet']
  },
  'public-node': {
    id: 'public-node',
    name: 'Public Node',
    description: 'Public-facing Kaspa node with indexer services',
    longDescription: 'A robust setup that provides public access to your Kaspa node and indexer services. Perfect for contributing to the ecosystem.',
    profiles: ['core', 'indexer-services'],
    category: 'advanced',
    useCase: 'community',
    estimatedSetupTime: '20-30 minutes',
    syncTime: '4-8 hours',
    icon: '🌐',
    config: {
      PUBLIC_NODE: 'true',
      ENABLE_MONITORING: 'true',
      ENABLE_SSL: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      POSTGRES_USER: 'kaspa_user',
      TIMESCALEDB_PORT: 5432
    },
    resources: {
      minMemory: 12,
      minCpu: 6,
      minDisk: 600,
      recommendedMemory: 24,
      recommendedCpu: 12,
      recommendedDisk: 2000
    },
    features: [
      'Public Kaspa node',
      'Local indexer services',
      'TimescaleDB database',
      'SSL/TLS encryption',
      'Advanced monitoring'
    ],
    benefits: [
      'Contribute to network infrastructure',
      'Provide reliable public endpoints',
      'Support dApp developers',
      'Enhanced data availability'
    ],
    customizable: true,
    tags: ['advanced', 'public', 'indexers', 'community']
  },
  'developer-setup': {
    id: 'developer-setup',
    name: 'Developer Setup',
    description: 'Complete development environment with debugging tools',
    longDescription: 'A comprehensive setup designed for Kaspa developers. Includes all services, development tools, and debugging features.',
    profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
    category: 'advanced',
    useCase: 'development',
    estimatedSetupTime: '30-45 minutes',
    syncTime: '4-8 hours',
    icon: '👨‍💻',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'testnet',
      POSTGRES_USER: 'dev_user',
      TIMESCALEDB_PORT: 5432,
      LOG_LEVEL: 'debug',
      ENABLE_PORTAINER: 'true',
      ENABLE_PGADMIN: 'true',
      ENABLE_LOG_ACCESS: 'true'
    },
    resources: {
      minMemory: 16,
      minCpu: 8,
      minDisk: 650,
      recommendedMemory: 32,
      recommendedCpu: 16,
      recommendedDisk: 2500
    },
    features: [
      'All Kaspa services',
      'Development tools',
      'Debug logging',
      'Portainer (Docker UI)',
      'pgAdmin (Database UI)',
      'Testnet configuration'
    ],
    benefits: [
      'Complete development environment',
      'Easy debugging and inspection',
      'Test applications safely',
      'Rapid prototyping'
    ],
    developerMode: true,
    customizable: true,
    tags: ['advanced', 'development', 'debugging', 'testnet']
  },
  'mining-setup': {
    id: 'mining-setup',
    name: 'Mining Setup',
    description: 'Kaspa node with mining stratum for solo mining',
    longDescription: 'Complete mining setup with local Kaspa node and stratum server. Perfect for solo miners who want full control.',
    profiles: ['core', 'mining'],
    category: 'advanced',
    useCase: 'mining',
    estimatedSetupTime: '20-30 minutes',
    syncTime: '2-4 hours',
    icon: '⛏️',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      STRATUM_PORT: 5555,
      MINING_ADDRESS: '',
      POOL_MODE: 'false'
    },
    resources: {
      minMemory: 6,
      minCpu: 4,
      minDisk: 110,
      recommendedMemory: 12,
      recommendedCpu: 8,
      recommendedDisk: 550
    },
    features: [
      'Local Kaspa node',
      'Mining stratum server',
      'Solo mining support',
      'Mining monitoring'
    ],
    benefits: [
      'Full mining control',
      'No pool fees',
      'Direct block rewards',
      'Mining privacy'
    ],
    customizable: true,
    tags: ['advanced', 'mining', 'stratum', 'solo']
  }
};

// GET /api/simple-templates/all - Get all templates
router.get('/all', (req, res) => {
  try {
    res.json({ templates: Object.values(templates) });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// GET /api/simple-templates/category/:category - Get templates by category
router.get('/category/:category', (req, res) => {
  try {
    const filteredTemplates = Object.values(templates).filter(template => 
      template.category === req.params.category
    );
    res.json({ templates: filteredTemplates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates by category',
      message: error.message
    });
  }
});

// POST /api/simple-templates/recommendations - Get template recommendations
router.post('/recommendations', (req, res) => {
  try {
    const { systemResources, useCase } = req.body;
    
    if (!systemResources) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'System resources are required'
      });
    }
    
    const recommendations = [];
    
    for (const template of Object.values(templates)) {
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
    
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get template recommendations',
      message: error.message
    });
  }
});

module.exports = router;