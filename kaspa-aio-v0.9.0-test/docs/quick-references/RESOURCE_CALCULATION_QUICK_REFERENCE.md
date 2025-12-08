# Resource Calculation with Deduplication - Quick Reference

## Overview

The resource calculation system intelligently calculates combined resource requirements across multiple selected profiles while deduplicating shared services like TimescaleDB, nginx, and dashboard.

## API Endpoint

### POST /api/resource-check/calculate-combined

Calculate combined resource requirements with deduplication.

**Request:**
```json
{
  "profiles": ["core", "explorer", "production"],
  "resources": { ... } // Optional - will auto-detect if not provided
}
```

**Response:**
```json
{
  "success": true,
  "profiles": ["core", "explorer", "production"],
  "requirements": {
    "minRAM": 10.5,
    "recommendedRAM": 22.0,
    "optimalRAM": 44.0,
    "minDisk": 200,
    "minCPU": 4
  },
  "services": [
    { "service": "kaspa-node", "name": "Kaspa Node", "profile": "core" },
    { "service": "timescaledb", "name": "TimescaleDB", "profile": "explorer" }
  ],
  "sharedResources": [
    {
      "service": "timescaledb",
      "name": "TimescaleDB",
      "usedBy": ["explorer", "production"],
      "resources": { "minRAM": 2, "recommendedRAM": 4, "minDisk": 50 },
      "note": "Shared by 2 profiles"
    }
  ],
  "profileBreakdown": [
    {
      "profileId": "core",
      "profileName": "Core",
      "minRAM": 4.5,
      "recommendedRAM": 8.0,
      "minDisk": 100,
      "components": [
        { "name": "Kaspa Node", "shared": false, "resources": {...} },
        { "name": "Dashboard", "shared": true, "resources": {...} }
      ]
    }
  ],
  "systemResources": {
    "ram": 16.0,
    "disk": 512.0,
    "cpu": 8,
    "dockerLimit": 16.0
  },
  "comparison": {
    "ram": {
      "required": 10.5,
      "recommended": 22.0,
      "available": 16.0,
      "meetsMin": true,
      "meetsRecommended": false,
      "shortfall": 0
    },
    "disk": { ... },
    "cpu": { ... }
  },
  "warnings": [
    {
      "type": "below_recommended_ram",
      "severity": "warning",
      "message": "RAM below recommended: 16.0GB available, 22.0GB recommended",
      "recommendation": "System will work but may experience performance issues under load"
    }
  ],
  "optimizations": [
    {
      "type": "use_remote_node",
      "priority": "high",
      "title": "Use Remote Kaspa Node",
      "description": "Switch to remote node connection to save 8-12GB RAM",
      "savings": { "ram": "8-12GB", "disk": "50GB+" },
      "action": "Replace local node profiles with core-remote profile"
    }
  ],
  "sufficient": true
}
```

## Key Features

### 1. Deduplication

Shared services are counted only once:
- **timescaledb**: Shared by multiple indexer profiles
- **nginx**: Shared by all profiles
- **dashboard**: Shared by all profiles

**Example Savings:**
- Core + Explorer without deduplication: 12.15GB
- Core + Explorer with deduplication: 9.15GB
- **Savings: 3GB (24.7%)**

### 2. Warning Types

| Type | Severity | Description |
|------|----------|-------------|
| `insufficient_ram` | critical | Available RAM < required minimum |
| `below_recommended_ram` | warning | Available RAM < recommended amount |
| `insufficient_disk` | critical | Available disk < required minimum |
| `insufficient_cpu` | warning | Available CPU cores < required |
| `docker_memory_limit` | critical | Docker limit < required RAM |

### 3. Optimization Recommendations

#### High Priority
- **use_remote_node**: Save 8-12GB RAM by using remote Kaspa node
- **use_public_indexers**: Save 8-12GB RAM by using public indexers
- **increase_docker_limit**: Increase Docker memory allocation

#### Medium Priority
- **remove_optional**: Remove optional profiles to reduce requirements
- **upgrade_ram**: Add more system RAM for optimal performance
- **upgrade_to_ssd**: Improve sync and query performance

#### Info
- **shared_resources**: Confirmation of deduplication savings

## Usage Examples

### Example 1: Check Single Profile

```bash
curl -X POST http://localhost:3000/api/resource-check/calculate-combined \
  -H "Content-Type: application/json" \
  -d '{"profiles": ["core"]}'
```

### Example 2: Check Multiple Profiles

```bash
curl -X POST http://localhost:3000/api/resource-check/calculate-combined \
  -H "Content-Type: application/json" \
  -d '{"profiles": ["core", "explorer", "production"]}'
```

### Example 3: With Custom Resources

```bash
curl -X POST http://localhost:3000/api/resource-check/calculate-combined \
  -H "Content-Type: application/json" \
  -d '{
    "profiles": ["core", "explorer"],
    "resources": {
      "memory": { "availableGB": "8.00" },
      "disk": { "freeGB": "100.00" },
      "cpu": { "count": 4 }
    }
  }'
```

## Frontend Integration

### Display Combined Requirements

```javascript
const response = await fetch('/api/resource-check/calculate-combined', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ profiles: selectedProfiles })
});

const data = await response.json();

// Display requirements
console.log(`RAM: ${data.requirements.minRAM}GB min, ${data.requirements.recommendedRAM}GB recommended`);
console.log(`Disk: ${data.requirements.minDisk}GB`);
console.log(`CPU: ${data.requirements.minCPU} cores`);

// Display warnings
data.warnings.forEach(warning => {
  console.warn(`[${warning.severity}] ${warning.message}`);
});

// Display shared resources
data.sharedResources.forEach(shared => {
  console.log(`${shared.name} shared by: ${shared.usedBy.join(', ')}`);
});
```

### Show Optimization Recommendations

```javascript
// Filter by priority
const highPriority = data.optimizations.filter(opt => opt.priority === 'high');
const mediumPriority = data.optimizations.filter(opt => opt.priority === 'medium');

// Display recommendations
highPriority.forEach(opt => {
  console.log(`🔴 ${opt.title}`);
  console.log(`   ${opt.description}`);
  if (opt.savings) {
    console.log(`   Savings: RAM ${opt.savings.ram}, Disk ${opt.savings.disk}`);
  }
  console.log(`   Action: ${opt.action}`);
});
```

### Check if Resources are Sufficient

```javascript
if (!data.sufficient) {
  // Show warning dialog
  showWarning('Insufficient resources for selected profiles');
  
  // Display critical warnings
  const critical = data.warnings.filter(w => w.severity === 'critical');
  critical.forEach(w => {
    showError(w.message, w.recommendation);
  });
  
  // Show optimization suggestions
  showOptimizations(data.optimizations);
}
```

## Testing

### Run Unit Tests

```bash
node services/wizard/backend/test-resource-calculation.js
```

### Run API Tests

```bash
# Start backend first
cd services/wizard/backend && npm start

# In another terminal
node services/wizard/backend/test-resource-api.js
```

## Common Scenarios

### Scenario 1: User Selects Too Many Profiles

**Input:** Core + Explorer + Production + Mining on 8GB system

**Output:**
- `sufficient: false`
- Warning: "Insufficient RAM: 8.0GB available, 16.5GB required"
- Optimization: "Use Remote Node" (saves 8-12GB)
- Optimization: "Use Public Indexers" (saves 8-12GB)

### Scenario 2: Docker Memory Limit Too Low

**Input:** Profiles requiring 12GB, Docker limited to 8GB

**Output:**
- `sufficient: false`
- Warning: "Docker memory limit (8.0GB) is below required RAM (12.0GB)"
- Optimization: "Increase Docker memory limit in Docker Desktop settings"

### Scenario 3: Optimal Resources

**Input:** Core + Explorer on 32GB system with SSD

**Output:**
- `sufficient: true`
- `comparison.ram.meetsOptimal: true`
- Optimization: "Shared Resources Detected" (info)

## Performance

- Resource detection: ~100-200ms
- Combined calculation: ~10-20ms
- Total API response: ~150-250ms

## Related Documentation

- [Profile Architecture Quick Reference](./PROFILE_ARCHITECTURE_QUICK_REFERENCE.md)
- [Dependency Validator Quick Reference](./DEPENDENCY_VALIDATOR_QUICK_REFERENCE.md)
- [Resource Calculation Implementation](../implementation-summaries/wizard/RESOURCE_CALCULATION_DEDUPLICATION.md)

## Support

For issues or questions:
1. Check warnings and optimization recommendations
2. Review system resources with `/api/resource-check`
3. Test with different profile combinations
4. Consult implementation documentation
