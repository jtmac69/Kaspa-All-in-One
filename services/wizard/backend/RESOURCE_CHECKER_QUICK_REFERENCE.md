# Resource Checker Quick Reference

## Quick Start

### Detect Resources

```javascript
const ResourceChecker = require('./src/utils/resource-checker');
const checker = new ResourceChecker();

const resources = await checker.detectResources();
console.log(`RAM: ${resources.memory.totalGB} GB`);
console.log(`CPU: ${resources.cpu.count} cores`);
console.log(`Disk: ${resources.disk.freeGB} GB free`);
```

### Get Recommendations

```javascript
const recommendations = checker.generateRecommendations(resources);
console.log(`Recommended: ${recommendations.primary.profile}`);
console.log(`Use Remote Node: ${recommendations.primary.useRemoteNode}`);
```

### Auto-Configure

```javascript
const config = await checker.generateAutoConfiguration(resources);
console.log(`Profile: ${config.profile}`);
console.log(`Env Vars:`, config.envVars);
```

### Check Compatibility

```javascript
// Check component
const compat = checker.checkComponentCompatibility(resources, 'kaspa-node-sync');
console.log(`Rating: ${compat.rating}`); // optimal, recommended, possible, not-recommended

// Check profile
const profileCompat = checker.checkProfileCompatibility(resources, 'explorer');
console.log(`Rating: ${profileCompat.rating}`);
```

## API Endpoints

### Detect Resources
```bash
GET /api/resource-check
```

### Get Requirements
```bash
GET /api/resource-check/requirements
```

### Get Recommendations
```bash
POST /api/resource-check/recommend
# Optional body: { "resources": {...} }
```

### Auto-Configure
```bash
POST /api/resource-check/auto-configure
# Optional body: { "resources": {...} }
```

### Check Component
```bash
POST /api/resource-check/check-component
# Body: { "component": "kaspa-node-sync", "resources": {...} }
```

### Check Profile
```bash
POST /api/resource-check/check-profile
# Body: { "profile": "explorer", "resources": {...} }
```

## Component Keys

- `dashboard` - Dashboard
- `kaspa-node-sync` - Kaspa Node (Syncing)
- `kaspa-node-synced` - Kaspa Node (Synced)
- `kasia-indexer` - Kasia Indexer
- `k-indexer` - K-Social Indexer
- `simply-kaspa-indexer` - Simply Kaspa Indexer
- `timescaledb` - TimescaleDB
- `archive-db` - Archive Database
- `nginx` - Nginx
- `kasia-app` - Kasia App
- `k-social-app` - K-Social App
- `kaspa-stratum` - Kaspa Stratum Bridge

## Profile Keys

- `core` - Core (Dashboard only)
- `core-remote` - Core + Remote Node
- `core-local` - Core + Local Node
- `explorer` - Explorer (Indexers + TimescaleDB)
- `production` - Production (Apps + Indexers)
- `archive` - Archive (Long-term storage)
- `mining` - Mining (Stratum bridge)

## Compatibility Ratings

- `optimal` - System exceeds recommended requirements
- `recommended` - System meets recommended requirements
- `possible` - System meets minimum requirements (may have issues)
- `not-recommended` - System does not meet minimum requirements

## Resource Object Structure

```javascript
{
  platform: 'darwin',
  timestamp: '2025-11-20T12:00:00.000Z',
  memory: {
    total: 17179869184,
    free: 8589934592,
    totalGB: '16.00',
    freeGB: '8.00',
    availableGB: '8.00'
  },
  cpu: {
    count: 8,
    model: 'Apple M1',
    speed: 2400
  },
  disk: {
    total: 500000000000,
    free: 250000000000,
    totalGB: '465.66',
    freeGB: '232.83',
    type: 'SSD'
  },
  docker: {
    memoryLimit: 17179869184,
    memoryLimitGB: '16.00',
    hasLimit: true
  }
}
```

## Recommendation Object Structure

```javascript
{
  primary: {
    profile: 'core-local',
    reason: 'Moderate RAM - Dashboard with local node possible',
    useRemoteNode: false
  },
  alternatives: [
    {
      profile: 'mining',
      reason: 'Mining profile also possible with your resources'
    }
  ],
  warnings: [
    'Limited disk space (50GB). Kaspa node requires 50GB+ and will grow over time.'
  ],
  suggestions: [
    'SSD recommended for better performance, especially for indexers'
  ]
}
```

## Auto-Configuration Object Structure

```javascript
{
  profile: 'core-local',
  useRemoteNode: false,
  envVars: {
    KASPA_NODE_MODE: 'local',
    KASPA_RPC_SERVER: 'kaspa-node:16110',
    KASPA_NODE_MEMORY_LIMIT: '8g'
  },
  warnings: [],
  suggestions: [
    'SSD recommended for better performance, especially for indexers'
  ]
}
```

## Frontend Integration Example

```javascript
// In wizard frontend
async function loadResourceCheck() {
  try {
    // Get recommendations
    const response = await fetch('/api/resource-check/recommend', {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      // Display recommended profile
      document.getElementById('recommended-profile').textContent = 
        data.recommendations.primary.profile;
      
      // Show warnings
      const warningsDiv = document.getElementById('warnings');
      data.recommendations.warnings.forEach(warning => {
        const p = document.createElement('p');
        p.className = 'warning';
        p.textContent = warning;
        warningsDiv.appendChild(p);
      });
      
      // Update profile cards with compatibility
      for (const [profile, compat] of Object.entries(data.profileCompatibility)) {
        const card = document.getElementById(`profile-${profile}`);
        card.classList.add(`rating-${compat.rating}`);
        
        // Add icon
        const icon = compat.rating === 'recommended' ? '✓' : 
                     compat.rating === 'possible' ? '⚠' : '✗';
        card.querySelector('.icon').textContent = icon;
      }
    }
  } catch (error) {
    console.error('Failed to check resources:', error);
  }
}

// Auto-configure button
async function autoConfigureSystem() {
  const response = await fetch('/api/resource-check/auto-configure', {
    method: 'POST'
  });
  const data = await response.json();
  
  if (data.success) {
    // Apply configuration
    document.getElementById('profile-select').value = data.config.profile;
    document.getElementById('use-remote-node').checked = data.config.useRemoteNode;
    
    // Set environment variables
    for (const [key, value] of Object.entries(data.config.envVars)) {
      const input = document.getElementById(`env-${key}`);
      if (input) input.value = value;
    }
    
    alert('Configuration applied! Review and proceed to installation.');
  }
}
```

## CSS for Profile Cards

```css
/* Profile card compatibility indicators */
.profile-card.rating-optimal {
  border-color: #00cc00;
}

.profile-card.rating-recommended {
  border-color: #00aa00;
}

.profile-card.rating-possible {
  border-color: #ffaa00;
}

.profile-card.rating-not-recommended {
  border-color: #cc0000;
  opacity: 0.6;
}

.profile-card .icon {
  font-size: 24px;
  margin-right: 10px;
}

.warning {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 10px;
  margin: 10px 0;
}

.suggestion {
  background-color: #d1ecf1;
  border-left: 4px solid #17a2b8;
  padding: 10px;
  margin: 10px 0;
}
```

## Testing

```bash
# Run test script
node services/wizard/backend/test-resource-checker.js

# Test API (requires backend running)
curl http://localhost:3000/api/resource-check
curl -X POST http://localhost:3000/api/resource-check/recommend
curl -X POST http://localhost:3000/api/resource-check/auto-configure

# Test specific profile
curl -X POST http://localhost:3000/api/resource-check/check-profile \
  -H "Content-Type: application/json" \
  -d '{"profile": "explorer"}'
```

## Common Use Cases

### 1. Show System Requirements on Welcome Page

```javascript
const requirements = await fetch('/api/resource-check/requirements').then(r => r.json());
displayRequirements(requirements.profiles);
```

### 2. Validate Profile Selection

```javascript
async function validateProfileSelection(profile) {
  const response = await fetch('/api/resource-check/check-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile })
  });
  const data = await response.json();
  
  if (data.compatibility.rating === 'not-recommended') {
    showWarning(`This profile requires ${data.compatibility.checks.ram.min}GB RAM but you have ${data.compatibility.checks.ram.available}GB`);
    return false;
  }
  return true;
}
```

### 3. Pre-fill Configuration Form

```javascript
async function prefillConfiguration() {
  const config = await fetch('/api/resource-check/auto-configure', {
    method: 'POST'
  }).then(r => r.json());
  
  if (config.success) {
    applyConfiguration(config.config);
  }
}
```

### 4. Show Resource Summary

```javascript
async function showResourceSummary() {
  const resources = await fetch('/api/resource-check').then(r => r.json());
  
  document.getElementById('ram-total').textContent = resources.resources.memory.totalGB + ' GB';
  document.getElementById('ram-available').textContent = resources.resources.memory.availableGB + ' GB';
  document.getElementById('cpu-cores').textContent = resources.resources.cpu.count;
  document.getElementById('disk-free').textContent = resources.resources.disk.freeGB + ' GB';
  document.getElementById('disk-type').textContent = resources.resources.disk.type;
}
```

## Troubleshooting

### Resource Detection Fails

- Check OS compatibility (Linux, macOS, Windows/WSL)
- Verify command availability (`df`, `free`, `sysctl`, etc.)
- Check permissions for system commands

### Docker Limits Not Detected

- Ensure Docker is running
- Check Docker info command: `docker info --format "{{.MemTotal}}"`
- Verify Docker Desktop settings (macOS/Windows)

### Incorrect Recommendations

- Verify resource detection is accurate
- Check component requirements in `loadComponentRequirements()`
- Review recommendation algorithm in `generateRecommendations()`

## Documentation

- Full documentation: `RESOURCE_CHECKER_INTEGRATION.md`
- Implementation summary: `RESOURCE_CHECKER_IMPLEMENTATION_SUMMARY.md`
- Feature specification: `docs/future-enhancements/resource-checker-feature.md`
