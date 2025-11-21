# Resource Checker Integration

## Overview

The Resource Checker is an intelligent system resource detection and recommendation engine integrated into the Kaspa All-in-One Installation Wizard. It helps users make informed decisions about which deployment profiles to use based on their system's capabilities.

## Features

### 1. Resource Detection

Automatically detects system resources across different operating systems:

- **Memory (RAM)**
  - Total system RAM
  - Available RAM
  - Docker memory limits (if applicable)
  - OS-specific detection (Linux `/proc/meminfo`, macOS `sysctl`, Windows `wmic`)

- **CPU**
  - Number of cores
  - CPU model
  - CPU speed

- **Disk Space**
  - Total disk space
  - Available disk space
  - Disk type detection (SSD vs HDD)
  - OS-specific detection methods

- **Docker Limits**
  - Docker memory limits
  - Docker Desktop vs Docker Engine detection

### 2. Component Requirements Database

Comprehensive requirements for all Kaspa All-in-One components:

| Component | Min RAM | Recommended RAM | Min Disk | Min CPU |
|-----------|---------|-----------------|----------|---------|
| Dashboard | 0.1 GB | 0.256 GB | 0.1 GB | 1 |
| Kaspa Node (Syncing) | 4 GB | 8 GB | 50 GB | 2 |
| Kaspa Node (Synced) | 2 GB | 4 GB | 50 GB | 2 |
| Kasia Indexer | 1 GB | 2 GB | 10 GB | 1 |
| K-Social Indexer | 1 GB | 2 GB | 20 GB | 1 |
| Simply Kaspa Indexer | 1 GB | 2 GB | 30 GB | 1 |
| TimescaleDB | 2 GB | 4 GB | 50 GB | 2 |
| Archive Database | 4 GB | 8 GB | 200 GB | 4 |
| Nginx | 0.05 GB | 0.128 GB | 0.01 GB | 1 |

### 3. Profile Requirements Database

Pre-defined deployment profiles with resource requirements:

| Profile | Min RAM | Recommended RAM | Min Disk | Suitable For |
|---------|---------|-----------------|----------|--------------|
| Core | 0.512 GB | 1 GB | 1 GB | All systems |
| Core + Remote Node | 1 GB | 2 GB | 2 GB | Systems with <8GB RAM |
| Core + Local Node | 8 GB | 12 GB | 60 GB | Systems with 8GB+ RAM |
| Explorer | 12 GB | 16 GB | 150 GB | Systems with 16GB+ RAM |
| Production | 16 GB | 20 GB | 200 GB | Systems with 16GB+ RAM |
| Archive | 24 GB | 32 GB | 500 GB | Systems with 32GB+ RAM |
| Mining | 10 GB | 12 GB | 60 GB | Systems with 12GB+ RAM |

### 4. Compatibility Analysis

Provides compatibility ratings for components and profiles:

- **Optimal**: System exceeds recommended requirements
- **Recommended**: System meets recommended requirements
- **Possible**: System meets minimum requirements (may have performance issues)
- **Not Recommended**: System does not meet minimum requirements

### 5. Intelligent Recommendations

Generates recommendations based on detected resources:

- **Primary Recommendation**: Best profile for the system
- **Alternative Profiles**: Other suitable options
- **Warnings**: Critical issues (insufficient RAM, disk space, etc.)
- **Suggestions**: Optimization tips (upgrade RAM, use SSD, increase Docker limits)

### 6. Auto-Configuration

Automatically generates optimal configuration:

- Profile selection
- Remote vs local node decision
- Environment variables
- Resource limits
- Docker memory limits

## API Endpoints

### GET /api/resource-check

Detect system resources.

**Response:**
```json
{
  "success": true,
  "resources": {
    "platform": "darwin",
    "memory": {
      "total": 17179869184,
      "free": 8589934592,
      "totalGB": "16.00",
      "freeGB": "8.00",
      "availableGB": "8.00"
    },
    "cpu": {
      "count": 8,
      "model": "Apple M1",
      "speed": 2400
    },
    "disk": {
      "total": 500000000000,
      "free": 250000000000,
      "totalGB": "465.66",
      "freeGB": "232.83",
      "type": "SSD"
    },
    "docker": {
      "memoryLimit": 17179869184,
      "memoryLimitGB": "16.00",
      "hasLimit": true
    }
  },
  "timestamp": "2025-11-20T12:00:00.000Z"
}
```

### GET /api/resource-check/requirements

Get component and profile requirements database.

**Response:**
```json
{
  "success": true,
  "components": {
    "dashboard": {
      "name": "Dashboard",
      "minRAM": 0.1,
      "recommendedRAM": 0.256,
      "optimalRAM": 0.5,
      "minDisk": 0.1,
      "minCPU": 1,
      "description": "Web-based monitoring and control interface"
    },
    ...
  },
  "profiles": {
    "core": {
      "name": "Core",
      "description": "Essential services (Dashboard, Nginx)",
      "components": ["dashboard", "nginx"],
      "minRAM": 0.512,
      "recommendedRAM": 1,
      "minDisk": 1,
      "minCPU": 1,
      "suitableFor": "All systems"
    },
    ...
  }
}
```

### POST /api/resource-check/recommend

Get recommendations for detected resources.

**Request Body (optional):**
```json
{
  "resources": { ... }
}
```

If `resources` is not provided, the API will detect them automatically.

**Response:**
```json
{
  "success": true,
  "resources": { ... },
  "recommendations": {
    "primary": {
      "profile": "core-local",
      "reason": "Moderate RAM - Dashboard with local node possible",
      "useRemoteNode": false
    },
    "alternatives": [
      {
        "profile": "mining",
        "reason": "Mining profile also possible with your resources"
      }
    ],
    "warnings": [],
    "suggestions": [
      "SSD recommended for better performance, especially for indexers"
    ]
  },
  "profileCompatibility": {
    "core": {
      "profile": "Core",
      "description": "Essential services (Dashboard, Nginx)",
      "rating": "recommended",
      "recommendation": "System meets recommended requirements. All systems",
      "checks": { ... },
      "components": ["Dashboard", "Nginx"]
    },
    ...
  }
}
```

### POST /api/resource-check/auto-configure

Generate auto-configuration based on system resources.

**Request Body (optional):**
```json
{
  "resources": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "resources": { ... },
  "config": {
    "profile": "core-local",
    "useRemoteNode": false,
    "envVars": {
      "KASPA_NODE_MODE": "local",
      "KASPA_RPC_SERVER": "kaspa-node:16110",
      "KASPA_NODE_MEMORY_LIMIT": "8g"
    },
    "warnings": [],
    "suggestions": [
      "SSD recommended for better performance, especially for indexers"
    ]
  }
}
```

### POST /api/resource-check/check-component

Check compatibility for a specific component.

**Request Body:**
```json
{
  "component": "kaspa-node-sync",
  "resources": { ... }  // optional
}
```

**Response:**
```json
{
  "success": true,
  "component": "kaspa-node-sync",
  "resources": { ... },
  "compatibility": {
    "component": "Kaspa Node (Syncing)",
    "rating": "possible",
    "recommendation": "System meets minimum requirements but may experience performance issues",
    "checks": {
      "ram": {
        "available": 8.0,
        "min": 4,
        "recommended": 8,
        "optimal": 16,
        "meetsMin": true,
        "meetsRecommended": true,
        "meetsOptimal": false
      },
      "disk": {
        "available": 232.83,
        "min": 50,
        "meetsMin": true
      },
      "cpu": {
        "available": 8,
        "min": 2,
        "meetsMin": true
      }
    },
    "notes": "High memory usage during sync, lower after completion"
  }
}
```

### POST /api/resource-check/check-profile

Check compatibility for a specific profile.

**Request Body:**
```json
{
  "profile": "explorer",
  "resources": { ... }  // optional
}
```

**Response:**
```json
{
  "success": true,
  "profile": "explorer",
  "resources": { ... },
  "compatibility": {
    "profile": "Explorer",
    "description": "Indexing services with TimescaleDB",
    "rating": "not-recommended",
    "recommendation": "System does not meet minimum requirements. Systems with 16GB+ RAM",
    "checks": {
      "ram": {
        "available": 8.0,
        "min": 12,
        "recommended": 16,
        "meetsMin": false,
        "meetsRecommended": false
      },
      "disk": {
        "available": 232.83,
        "min": 150,
        "meetsMin": true
      },
      "cpu": {
        "available": 8,
        "min": 4,
        "meetsMin": true
      }
    },
    "components": [
      "Dashboard",
      "Nginx",
      "Kaspa Node (Syncing)",
      "Kasia Indexer",
      "K-Social Indexer",
      "Simply Kaspa Indexer",
      "TimescaleDB"
    ]
  }
}
```

## Integration with System Check

The Resource Checker is integrated with the existing System Check API (`/api/system-check`). When running a full system check, the API now includes:

- Detected resources
- Recommendations
- Recommended profile
- Remote vs local node recommendation

**Example Enhanced System Check Response:**
```json
{
  "docker": { ... },
  "dockerCompose": { ... },
  "resources": { ... },
  "ports": { ... },
  "detectedResources": {
    "platform": "darwin",
    "memory": { ... },
    "cpu": { ... },
    "disk": { ... },
    "docker": { ... }
  },
  "recommendations": {
    "primary": {
      "profile": "core-local",
      "reason": "Moderate RAM - Dashboard with local node possible",
      "useRemoteNode": false
    },
    "alternatives": [ ... ],
    "warnings": [ ... ],
    "suggestions": [ ... ]
  },
  "summary": {
    "status": "success",
    "message": "All system checks passed",
    "canProceed": true,
    "recommendedProfile": "core-local",
    "useRemoteNode": false
  }
}
```

## Usage Examples

### Frontend Integration

```javascript
// Detect resources and get recommendations
async function checkResources() {
  const response = await fetch('/api/resource-check/recommend', {
    method: 'POST'
  });
  const data = await response.json();
  
  if (data.success) {
    console.log('Recommended profile:', data.recommendations.primary.profile);
    console.log('Use remote node:', data.recommendations.primary.useRemoteNode);
    
    // Display warnings
    data.recommendations.warnings.forEach(warning => {
      console.warn(warning);
    });
    
    // Display suggestions
    data.recommendations.suggestions.forEach(suggestion => {
      console.info(suggestion);
    });
  }
}

// Auto-configure based on resources
async function autoConfigureSystem() {
  const response = await fetch('/api/resource-check/auto-configure', {
    method: 'POST'
  });
  const data = await response.json();
  
  if (data.success) {
    console.log('Auto-configuration:', data.config);
    // Apply configuration to wizard
    applyConfiguration(data.config);
  }
}

// Check specific profile compatibility
async function checkProfileCompatibility(profile) {
  const response = await fetch('/api/resource-check/check-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile })
  });
  const data = await response.json();
  
  if (data.success) {
    const compat = data.compatibility;
    console.log(`${profile}: ${compat.rating}`);
    console.log(compat.recommendation);
    
    // Show visual indicator based on rating
    if (compat.rating === 'recommended') {
      showGreenCheckmark();
    } else if (compat.rating === 'possible') {
      showYellowWarning();
    } else {
      showRedX();
    }
  }
}
```

## Testing

A test script is provided to verify the Resource Checker functionality:

```bash
node services/wizard/backend/test-resource-checker.js
```

The test script verifies:
1. Resource detection
2. Component requirements loading
3. Profile requirements loading
4. Component compatibility checking
5. Profile compatibility checking
6. Recommendation generation
7. Auto-configuration generation

## Implementation Details

### Resource Detection

The Resource Checker uses OS-specific commands to detect resources:

**Linux:**
- Memory: `/proc/meminfo`, `free`
- Disk: `df -k`
- Disk type: `/sys/block/*/queue/rotational`

**macOS:**
- Memory: `sysctl`, `vm_stat`
- Disk: `df -k`, `diskutil info`
- Disk type: `diskutil info`

**Windows/WSL:**
- Memory: `wmic`, `systeminfo`
- Disk: `wmic logicaldisk`

### Docker Limits

The Resource Checker detects Docker memory limits using:
```bash
docker info --format "{{.MemTotal}}"
```

This is important because Docker Desktop on macOS and Windows has configurable memory limits that may be lower than system RAM.

### Recommendation Algorithm

The recommendation algorithm considers:

1. **Available RAM** (most critical factor)
   - <2GB: Core only with remote node
   - 2-8GB: Core with remote node
   - 8-16GB: Core with local node
   - 16-24GB: Explorer or Production profiles
   - 24GB+: Archive profile

2. **Available Disk Space**
   - Warns if <100GB
   - Considers disk type (SSD vs HDD)

3. **Docker Limits**
   - Warns if Docker limit < system RAM
   - Suggests increasing Docker memory limit

4. **CPU Cores**
   - Minimum 2 cores for local node
   - 4+ cores for heavy profiles

## Future Enhancements

1. **Runtime Monitoring**
   - Continuous resource monitoring during installation
   - Alerts when approaching limits
   - Automatic profile downgrade suggestions

2. **Cloud Integration**
   - Detect cloud provider (AWS, GCP, Azure)
   - Recommend instance types
   - Estimate costs

3. **Performance Optimization**
   - Suggest Docker memory limits
   - Recommend swap configuration
   - Optimize based on workload

4. **Historical Data**
   - Track resource usage over time
   - Predict future requirements
   - Suggest upgrades

## Related Documentation

- [Resource Checker Feature Document](../../../docs/future-enhancements/resource-checker-feature.md)
- [Web Installation Wizard Requirements](../../../.kiro/specs/web-installation-wizard/requirements.md)
- [Non-Technical User Analysis](../../../NON_TECHNICAL_USER_ANALYSIS.md)

## Support

For issues or questions about the Resource Checker:

1. Check the test script output for diagnostic information
2. Review the API responses for detailed error messages
3. Consult the troubleshooting guide in the main documentation
4. Open an issue on GitHub with system information and error logs
