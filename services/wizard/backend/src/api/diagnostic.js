const express = require('express');
const DiagnosticCollector = require('../utils/diagnostic-collector');

const router = express.Router();
const diagnosticCollector = new DiagnosticCollector();

/**
 * Common Issues Database
 * Searchable FAQ with solutions
 */
const commonIssues = [
  {
    id: 'docker-not-running',
    title: 'Docker is not running',
    keywords: ['docker', 'not running', 'daemon', 'connection refused'],
    description: 'Docker Desktop or Docker daemon is not running on your system.',
    solution: `
1. **macOS/Windows**: Open Docker Desktop application
2. **Linux**: Start Docker service:
   \`\`\`bash
   sudo systemctl start docker
   sudo systemctl enable docker
   \`\`\`
3. Verify Docker is running: \`docker ps\`
    `,
    category: 'docker'
  },
  {
    id: 'port-conflict',
    title: 'Port already in use',
    keywords: ['port', 'already in use', 'bind', 'address already in use'],
    description: 'A required port is already being used by another application.',
    solution: `
1. Find which process is using the port:
   \`\`\`bash
   # macOS/Linux
   lsof -i :PORT_NUMBER
   # Or
   netstat -tulpn | grep PORT_NUMBER
   \`\`\`
2. Stop the conflicting service or change the port in your .env file
3. Restart the installation
    `,
    category: 'network'
  },
  {
    id: 'insufficient-memory',
    title: 'Not enough memory',
    keywords: ['memory', 'ram', 'oom', 'out of memory', 'killed'],
    description: 'System does not have enough RAM to run the selected services.',
    solution: `
1. Check available memory: \`free -h\` (Linux) or Activity Monitor (macOS)
2. Close unnecessary applications
3. Consider using a lighter profile (Core instead of Production)
4. Use remote node instead of local node
5. Upgrade system RAM if possible (minimum 4GB, recommended 8GB)
    `,
    category: 'resources'
  },
  {
    id: 'disk-space',
    title: 'Insufficient disk space',
    keywords: ['disk', 'space', 'no space left', 'storage'],
    description: 'Not enough disk space for blockchain data and Docker images.',
    solution: `
1. Check available space: \`df -h\`
2. Clean up Docker: \`docker system prune -a\`
3. Remove unused files and applications
4. Consider using archive mode with retention policies
5. Minimum 100GB recommended, 500GB for full node
    `,
    category: 'resources'
  },
  {
    id: 'permission-denied',
    title: 'Permission denied',
    keywords: ['permission', 'denied', 'access denied', 'unauthorized'],
    description: 'User does not have permission to access Docker or files.',
    solution: `
1. Add user to docker group (Linux):
   \`\`\`bash
   sudo usermod -aG docker $USER
   newgrp docker
   \`\`\`
2. Check file permissions:
   \`\`\`bash
   ls -la /var/run/docker.sock
   \`\`\`
3. Restart Docker service
4. Log out and log back in
    `,
    category: 'permissions'
  },
  {
    id: 'network-connectivity',
    title: 'Network connectivity issues',
    keywords: ['network', 'connection', 'timeout', 'unreachable', 'dns'],
    description: 'Cannot connect to external services or download images.',
    solution: `
1. Check internet connection
2. Test DNS: \`ping 8.8.8.8\`
3. Check firewall settings
4. Try different DNS servers (8.8.8.8, 1.1.1.1)
5. Check proxy settings if behind corporate firewall
6. Verify Docker Hub is accessible: \`docker pull hello-world\`
    `,
    category: 'network'
  },
  {
    id: 'image-pull-failed',
    title: 'Failed to pull Docker image',
    keywords: ['pull', 'image', 'download', 'manifest', 'not found'],
    description: 'Cannot download required Docker images.',
    solution: `
1. Check internet connection
2. Verify Docker Hub is accessible
3. Check if image name/tag is correct
4. Try pulling manually: \`docker pull IMAGE_NAME\`
5. Clear Docker cache: \`docker system prune -a\`
6. Check Docker Hub rate limits (may need to login)
    `,
    category: 'docker'
  },
  {
    id: 'service-unhealthy',
    title: 'Service is unhealthy',
    keywords: ['unhealthy', 'health check', 'failing', 'not ready'],
    description: 'A service is running but failing health checks.',
    solution: `
1. Check service logs: \`docker compose logs SERVICE_NAME\`
2. Verify service dependencies are running
3. Check if ports are accessible
4. Restart the service: \`docker compose restart SERVICE_NAME\`
5. Check resource usage (CPU, memory)
6. Review service configuration in .env file
    `,
    category: 'services'
  },
  {
    id: 'sync-slow',
    title: 'Blockchain sync is very slow',
    keywords: ['sync', 'slow', 'syncing', 'blockchain', 'blocks'],
    description: 'Kaspa node is syncing but taking a very long time.',
    solution: `
1. This is normal - full sync can take 24-48 hours
2. Check internet speed and stability
3. Verify sufficient disk I/O (SSD recommended)
4. Check CPU usage is not maxed out
5. Consider using a remote node instead for faster setup
6. Monitor progress: \`docker compose logs kaspa-node\`
    `,
    category: 'blockchain'
  },
  {
    id: 'compose-version',
    title: 'Docker Compose version incompatible',
    keywords: ['compose', 'version', 'incompatible', 'unsupported'],
    description: 'Docker Compose version is too old or incompatible.',
    solution: `
1. Check version: \`docker compose version\`
2. Update Docker Desktop (includes Compose v2)
3. Or install Compose v2 plugin:
   \`\`\`bash
   # Linux
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   \`\`\`
4. Minimum version required: 2.0.0
    `,
    category: 'docker'
  }
];

/**
 * GET /api/diagnostic/collect
 * Collect all diagnostic information
 */
router.get('/collect', async (req, res) => {
  try {
    const diagnostics = await diagnosticCollector.collectAll();
    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to collect diagnostics',
      message: error.message
    });
  }
});

/**
 * GET /api/diagnostic/report
 * Generate human-readable diagnostic report
 */
router.get('/report', async (req, res) => {
  try {
    const report = await diagnosticCollector.generateReport();
    
    // Return as plain text for easy copying
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * GET /api/diagnostic/report/json
 * Generate JSON diagnostic report
 */
router.get('/report/json', async (req, res) => {
  try {
    const data = await diagnosticCollector.generateJSON();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate JSON report',
      message: error.message
    });
  }
});

/**
 * GET /api/diagnostic/issues
 * Get list of common issues
 */
router.get('/issues', (req, res) => {
  try {
    const { category, search } = req.query;
    
    let filtered = commonIssues;
    
    // Filter by category
    if (category) {
      filtered = filtered.filter(issue => issue.category === category);
    }
    
    // Search by keywords
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(issue => {
        return issue.title.toLowerCase().includes(searchLower) ||
               issue.description.toLowerCase().includes(searchLower) ||
               issue.keywords.some(kw => kw.toLowerCase().includes(searchLower));
      });
    }
    
    res.json({
      success: true,
      data: filtered,
      total: filtered.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve issues',
      message: error.message
    });
  }
});

/**
 * GET /api/diagnostic/issues/:id
 * Get specific issue details
 */
router.get('/issues/:id', (req, res) => {
  try {
    const issue = commonIssues.find(i => i.id === req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve issue',
      message: error.message
    });
  }
});

/**
 * GET /api/diagnostic/categories
 * Get list of issue categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = [...new Set(commonIssues.map(issue => issue.category))];
    const categoryCounts = {};
    
    for (const category of categories) {
      categoryCounts[category] = commonIssues.filter(i => i.category === category).length;
    }
    
    res.json({
      success: true,
      data: {
        categories,
        counts: categoryCounts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
      message: error.message
    });
  }
});

/**
 * POST /api/diagnostic/search
 * Search issues by error message or symptoms
 */
router.post('/search', (req, res) => {
  try {
    const { query, errorMessage } = req.body;
    
    if (!query && !errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'Query or error message required'
      });
    }
    
    const searchText = (query || errorMessage || '').toLowerCase();
    
    // Score each issue based on keyword matches
    const scored = commonIssues.map(issue => {
      let score = 0;
      
      // Check title match
      if (issue.title.toLowerCase().includes(searchText)) {
        score += 10;
      }
      
      // Check keyword matches
      for (const keyword of issue.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 5;
        }
      }
      
      // Check description match
      if (issue.description.toLowerCase().includes(searchText)) {
        score += 3;
      }
      
      return { ...issue, score };
    });
    
    // Filter and sort by score
    const results = scored
      .filter(issue => issue.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 results
    
    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;
