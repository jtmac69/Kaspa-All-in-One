# Web-Based Installation Wizard Design

## Overview

The Web-Based Installation Wizard is a modern, intuitive interface that guides users through the initial setup of the Kaspa All-in-One system. It provides visual profile selection, configuration management, real-time installation progress, and post-installation validation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Installation Wizard UI (React/Vue or Vanilla JS)      │ │
│  │  - Step Navigation                                      │ │
│  │  - Profile Selection (with Installation State)         │ │
│  │  - Configuration Forms                                  │ │
│  │  - Progress Tracking                                    │ │
│  │  - Validation Display                                   │ │
│  │  - Reconfiguration Mode Interface                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Installation Wizard Backend (Node.js)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Endpoints                                          │ │
│  │  - /api/wizard/system-check                            │ │
│  │  - /api/wizard/profiles                                │ │
│  │  - /api/wizard/config                                  │ │
│  │  - /api/wizard/install                                 │ │
│  │  - /api/wizard/validate                                │ │
│  │  - /api/wizard/reconfigure                             │ │
│  │  - /api/wizard/remove-profile                          │ │
│  │  - /ws/wizard/progress (WebSocket)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Installation Engine                                    │ │
│  │  - System Requirements Checker                         │ │
│  │  - Docker Compose Manager                              │ │
│  │  - Configuration Generator                             │ │
│  │  - Service Health Monitor                              │ │
│  │  - Profile State Manager                               │ │
│  │  - Backup Manager                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Docker API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Engine                             │
│  - Container Management                                      │
│  - Image Building                                            │
│  - Network Configuration                                     │
│  - Volume Management                                         │
└─────────────────────────────────────────────────────────────┘
```

### Wizard Modes

The wizard operates in three distinct modes, each with different entry points and workflows:

#### 1. Initial Installation Mode
- **Entry Point**: Direct access to wizard (fresh system)
- **URL**: `http://localhost:3000/wizard`
- **State**: No existing configuration
- **Flow**: Welcome → System Check → Profile Selection → Configuration → Installation → Validation → Complete

#### 2. Reconfiguration Mode
- **Entry Point**: Launched from Management Dashboard
- **URL**: `http://localhost:3000/wizard?mode=reconfigure`
- **State**: Loads existing configuration from `installation-config.json`
- **Flow**: Reconfiguration Landing → Profile Management → Configuration → Apply Changes → Validation → Complete

#### 3. Update Mode
- **Entry Point**: Launched from Dashboard update notifications
- **URL**: `http://localhost:3000/wizard?mode=update&updates=[...]`
- **State**: Loads current versions and available updates
- **Flow**: Update Selection → Backup → Apply Updates → Validation → Complete

### Reconfiguration Mode Architecture

```mermaid
graph TB
    subgraph "Dashboard"
        D1[Service Status]
        D2[Configuration Suggestions]
        D3[Reconfigure Button]
    end
    
    subgraph "Wizard Reconfiguration Mode"
        W1[Landing Page]
        W2[Add Profiles]
        W3[Modify Configuration]
        W4[Remove Profiles]
        W5[Profile Selection with State]
        W6[Configuration Forms]
        W7[Apply Changes]
    end
    
    subgraph "Backend Services"
        B1[Profile State Manager]
        B2[Configuration Loader]
        B3[Backup Manager]
        B4[Docker Manager]
    end
    
    D3 --> W1
    D2 --> W1
    W1 --> W2
    W1 --> W3
    W1 --> W4
    W2 --> W5
    W3 --> W6
    W4 --> W5
    W5 --> W6
    W6 --> W7
    W7 --> B1
    W7 --> B3
    W7 --> B4
    B2 --> W5
    B2 --> W6
```

## Profile Architecture and Dependencies

### Profile System Overview

The wizard implements a flexible profile system that allows users to select combinations of services while enforcing dependencies and preventing conflicts.

#### Profile Types

1. **Core Profile** - Kaspa blockchain node
   - Can be public, private, or configured for other services
   - Optional wallet integration
   - Automatic fallback to public network if node fails

2. **Kaspa User Applications** - User-facing applications
   - Kasia, K-Social, Kaspa Explorer
   - Choice of public or local indexers
   - User-configurable public endpoints

3. **Indexer Services** - Backend indexing services
   - Shared TimescaleDB container
   - Separate databases per indexer (kasia_db, k_db, simply_kaspa_db)
   - Optional connection to local Core Profile node
   - Automatic fallback to public Kaspa network

4. **Archive Node Profile** - Non-pruning node
   - Complete blockchain history
   - Higher resource requirements
   - Similar options to Core Profile

5. **Mining Profile** - Mining infrastructure
   - Requires Core or Archive Node Profile
   - Local stratum server
   - Wallet integration

6. **Developer Mode** - Cross-cutting feature
   - Not a separate profile
   - Toggle/checkbox in any profile
   - Adds: inspection tools, log access, exposed ports, development utilities

### Dependency Resolution

#### Startup Order
Services start in dependency order:
1. **Kaspa Node** (if local Core or Archive selected)
2. **Indexer Services** (if local indexers selected)
3. **Kaspa User Applications** (apps that depend on indexers)

#### Dependency Rules
```typescript
interface DependencyRule {
  profile: string;
  requires?: string[]; // Optional dependencies
  prerequisites?: string[]; // Must have one of these
  conflicts?: string[]; // Cannot coexist with
  fallback?: FallbackStrategy;
}

const DEPENDENCY_RULES: DependencyRule[] = [
  {
    profile: 'mining',
    prerequisites: ['core', 'archive-node'], // Must select one
    message: 'Mining requires a local Kaspa node (Core or Archive)'
  },
  {
    profile: 'kaspa-user-applications',
    requires: [], // No hard requirements
    fallback: {
      type: 'public-indexers',
      message: 'Using public indexer endpoints'
    }
  },
  {
    profile: 'indexer-services',
    requires: [], // No hard requirements
    fallback: {
      type: 'public-kaspa-network',
      message: 'Indexers will connect to public Kaspa network'
    }
  }
];
```

#### Circular Dependency Prevention
```typescript
class DependencyValidator {
  validateSelection(profiles: string[]): ValidationResult {
    // Check for circular dependencies
    const graph = this.buildDependencyGraph(profiles);
    const cycles = this.detectCycles(graph);
    
    if (cycles.length > 0) {
      return {
        valid: false,
        error: 'Circular dependency detected',
        cycles: cycles
      };
    }
    
    // Check prerequisites
    for (const profile of profiles) {
      const rule = DEPENDENCY_RULES.find(r => r.profile === profile);
      if (rule?.prerequisites) {
        const hasPrerequisite = rule.prerequisites.some(p => profiles.includes(p));
        if (!hasPrerequisite) {
          return {
            valid: false,
            error: `${profile} requires one of: ${rule.prerequisites.join(', ')}`
          };
        }
      }
    }
    
    return { valid: true };
  }
  
  private detectCycles(graph: DependencyGraph): string[][] {
    // Implement cycle detection algorithm
    // Returns array of cycles found
  }
}
```

### Fallback Strategies

#### Node Failure Handling
When a local Kaspa node is configured for other services but fails health checks:

```typescript
interface NodeFailureStrategy {
  onHealthCheckFail(node: string, dependentServices: string[]): UserChoice {
    return {
      options: [
        {
          id: 'continue-public',
          label: 'Continue with public Kaspa network',
          description: 'Services will use public nodes instead',
          action: () => this.configurePublicFallback(dependentServices)
        },
        {
          id: 'troubleshoot',
          label: 'Troubleshoot local node',
          description: 'View logs and diagnostic information',
          action: () => this.showTroubleshooting(node)
        },
        {
          id: 'retry',
          label: 'Retry health check',
          description: 'Wait and check again',
          action: () => this.retryHealthCheck(node)
        }
      ],
      defaultOption: 'continue-public'
    };
  }
}
```

### Resource Calculation

#### Combined Resource Requirements
```typescript
interface ResourceCalculator {
  calculateTotalResources(profiles: string[]): ResourceRequirements {
    let total = {
      cpu: 0,
      memory: 0,
      disk: 0
    };
    
    for (const profileId of profiles) {
      const profile = PROFILES[profileId];
      total.cpu += profile.resources.minCpu;
      total.memory += profile.resources.minMemory;
      total.disk += profile.resources.minDisk;
    }
    
    // Check for shared resources (e.g., TimescaleDB used by multiple indexers)
    total = this.deduplicateSharedResources(total, profiles);
    
    return {
      minimum: total,
      recommended: this.calculateRecommended(profiles),
      available: this.getSystemResources(),
      sufficient: this.checkSufficiency(total)
    };
  }
  
  checkSufficiency(required: Resources): boolean {
    const available = this.getSystemResources();
    return (
      available.cpu >= required.cpu &&
      available.memory >= required.memory &&
      available.disk >= required.disk
    );
  }
}
```

### Developer Mode Implementation

Developer Mode is a cross-cutting feature that enhances any profile:

```typescript
interface DeveloperModeConfig {
  enabled: boolean;
  features: {
    debugLogging: boolean;      // Enable verbose logging
    exposedPorts: number[];     // Additional ports to expose
    inspectionTools: string[];  // Tools to include (portainer, pgadmin, etc.)
    logAccess: boolean;         // Direct log file access
    developmentUtilities: string[]; // Additional dev tools
  };
}

// Applied to docker-compose configuration
function applyDeveloperMode(config: DockerComposeConfig, devMode: DeveloperModeConfig): DockerComposeConfig {
  if (!devMode.enabled) return config;
  
  // Add debug logging
  if (devMode.features.debugLogging) {
    for (const service of config.services) {
      service.environment.LOG_LEVEL = 'debug';
    }
  }
  
  // Expose additional ports
  if (devMode.features.exposedPorts.length > 0) {
    for (const service of config.services) {
      service.ports.push(...devMode.features.exposedPorts);
    }
  }
  
  // Add inspection tools
  if (devMode.features.inspectionTools.includes('portainer')) {
    config.services.push(PORTAINER_SERVICE);
  }
  
  return config;
}
```

## Components and Interfaces

### Frontend Components

#### 1. Wizard Container
**Purpose**: Main container managing wizard state and step navigation

**Interface**:
```typescript
interface WizardState {
  currentStep: number;
  totalSteps: number;
  configuration: InstallationConfig;
  systemCheck: SystemCheckResult;
  installationProgress: InstallationProgress;
  validationResults: ValidationResult[];
}

interface WizardContainer {
  state: WizardState;
  nextStep(): void;
  previousStep(): void;
  goToStep(step: number): void;
  saveProgress(): void;
  loadProgress(): void;
}
```

#### 2. System Check Component
**Purpose**: Display system requirements validation

**Interface**:
```typescript
interface SystemCheckResult {
  docker: {
    installed: boolean;
    version: string;
    running: boolean;
  };
  dockerCompose: {
    installed: boolean;
    version: string;
  };
  resources: {
    cpu: { cores: number; available: boolean };
    memory: { total: number; available: number; sufficient: boolean };
    disk: { total: number; available: number; sufficient: boolean };
  };
  ports: {
    port: number;
    available: boolean;
    service: string;
  }[];
  overallStatus: 'pass' | 'warning' | 'fail';
}
```

#### 3. Profile Selection Component
**Purpose**: Visual interface for selecting deployment profiles

**Interface**:
```typescript
interface Profile {
  id: string;
  name: string;
  description: string;
  services: string[];
  dependencies: string[];
  resources: {
    minCpu: number;
    minMemory: number;
    minDisk: number;
  };
  icon: string;
  category: 'essential' | 'optional' | 'advanced';
  estimatedSyncTime?: number; // For profiles with sync requirements (e.g., Kaspa node)
}

interface ProfileSelection {
  profiles: Profile[];
  selectedProfiles: string[];
  conflicts: string[];
  totalResources: ResourceRequirements;
  estimatedInstallTime: number; // Includes sync time for nodes
}
```

#### 4. Configuration Form Component
**Purpose**: Dynamic form for service configuration

**Interface**:
```typescript
interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'boolean' | 'select';
  defaultValue: any;
  required: boolean;
  validation: ValidationRule[];
  tooltip: string;
  category: 'basic' | 'advanced';
  visibleForProfiles?: string[]; // Only show for specific profiles
  group?: string; // Group related fields (e.g., 'kaspa-node', 'database', 'network')
}

interface InstallationConfig {
  profiles: string[];
  environment: Record<string, string>;
  network: NetworkConfig;
  advanced: AdvancedConfig;
}

// Profile-specific configuration fields
const PROFILE_CONFIG_FIELDS = {
  'core': [
    {
      key: 'KASPA_NODE_RPC_PORT',
      label: 'Kaspa Node RPC Port',
      type: 'number',
      defaultValue: 16110,
      required: true,
      validation: [{ type: 'range', min: 1024, max: 65535 }],
      tooltip: 'Port for RPC connections to the Kaspa node',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_NODE_P2P_PORT',
      label: 'Kaspa Node P2P Port',
      type: 'number',
      defaultValue: 16111,
      required: true,
      validation: [{ type: 'range', min: 1024, max: 65535 }],
      tooltip: 'Port for peer-to-peer connections',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_NETWORK',
      label: 'Network',
      type: 'select',
      defaultValue: 'mainnet',
      required: true,
      options: ['mainnet', 'testnet'],
      tooltip: 'Kaspa network to connect to (changing this requires fresh installation)',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_DATA_DIR',
      label: 'Data Directory',
      type: 'text',
      defaultValue: '/data/kaspa',
      required: false,
      tooltip: 'Container path for Kaspa node data (Docker volume)',
      category: 'advanced',
      group: 'kaspa-node'
    }
  ],
  'archive-node': [
    // Same as core, but with different defaults
    {
      key: 'KASPA_NODE_RPC_PORT',
      label: 'Archive Node RPC Port',
      type: 'number',
      defaultValue: 16110,
      required: true,
      validation: [{ type: 'range', min: 1024, max: 65535 }],
      tooltip: 'Port for RPC connections to the archive node',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_NODE_P2P_PORT',
      label: 'Archive Node P2P Port',
      type: 'number',
      defaultValue: 16111,
      required: true,
      validation: [{ type: 'range', min: 1024, max: 65535 }],
      tooltip: 'Port for peer-to-peer connections',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_NETWORK',
      label: 'Network',
      type: 'select',
      defaultValue: 'mainnet',
      required: true,
      options: ['mainnet', 'testnet'],
      tooltip: 'Kaspa network to connect to',
      category: 'basic',
      group: 'kaspa-node'
    },
    {
      key: 'KASPA_ARCHIVE_DATA_DIR',
      label: 'Archive Data Directory',
      type: 'text',
      defaultValue: '/data/kaspa-archive',
      required: false,
      tooltip: 'Container path for archive node data (requires significant disk space)',
      category: 'advanced',
      group: 'kaspa-node'
    }
  ],
  'indexer-services': [
    {
      key: 'TIMESCALEDB_DATA_DIR',
      label: 'TimescaleDB Data Directory',
      type: 'text',
      defaultValue: '/data/timescaledb',
      required: false,
      tooltip: 'Container path for TimescaleDB data',
      category: 'advanced',
      group: 'database'
    }
  ]
};
```

#### 5. Installation Progress Component
**Purpose**: Real-time installation progress display

**Interface**:
```typescript
interface InstallationProgress {
  phase: 'preparing' | 'building' | 'starting' | 'syncing' | 'validating' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  logs: LogEntry[];
  services: ServiceStatus[];
  estimatedTimeRemaining: number;
  pausable: boolean; // Can user pause and resume?
  resumable: boolean; // Can installation be resumed later?
}

interface ServiceStatus {
  name: string;
  status: 'pending' | 'building' | 'starting' | 'syncing' | 'healthy' | 'unhealthy' | 'error';
  message: string;
  url?: string;
  syncProgress?: SyncProgress; // For services that require synchronization
}

interface SyncProgress {
  type: 'blockchain' | 'database' | 'indexer';
  currentBlock?: number;
  targetBlock?: number;
  percentage: number;
  estimatedTimeRemaining: number;
  canContinueInBackground: boolean; // Can sync continue after wizard closes?
}
```

#### 7. Reconfiguration Landing Component
**Purpose**: Entry point for reconfiguration mode with clear action options

**Interface**:
```typescript
interface ReconfigurationLanding {
  currentInstallation: InstallationSummary;
  availableActions: ReconfigurationAction[];
  suggestions: ConfigurationSuggestion[];
}

interface InstallationSummary {
  installedProfiles: string[];
  lastModified: string;
  version: string;
  servicesRunning: number;
  servicesTotal: number;
}

interface ReconfigurationAction {
  id: 'add-profiles' | 'modify-config' | 'remove-profiles';
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  estimatedTime: string;
}

interface ConfigurationSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  context: Record<string, any>;
}
```

#### 8. Profile State Management Component
**Purpose**: Display profiles with installation state and management options

**Interface**:
```typescript
interface ProfileWithState extends Profile {
  installationState: 'installed' | 'not-installed' | 'partial' | 'error';
  status: 'running' | 'stopped' | 'unhealthy' | 'unknown';
  version?: string;
  lastModified?: string;
  dataSize?: number;
  dependencies: ProfileDependency[];
}

interface ProfileDependency {
  profileId: string;
  type: 'required' | 'optional' | 'conflicts';
  status: 'satisfied' | 'missing' | 'conflict';
  message: string;
}

interface ProfileManagementActions {
  canModify: boolean;
  canRemove: boolean;
  canAdd: boolean;
  warnings: string[];
  dataRemovalOptions?: DataRemovalOption[];
}

interface DataRemovalOption {
  id: string;
  label: string;
  description: string;
  dataSize: number;
  recommended: boolean;
}
```

#### 9. Configuration Diff Component
**Purpose**: Show before/after comparison of configuration changes

**Interface**:
```typescript
interface ConfigurationDiff {
  changes: ConfigurationChange[];
  affectedServices: string[];
  estimatedDowntime: number;
  backupRequired: boolean;
  warnings: string[];
}

interface ConfigurationChange {
  type: 'add' | 'modify' | 'remove';
  category: 'profile' | 'environment' | 'network' | 'advanced';
  key: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  impact: 'low' | 'medium' | 'high';
}
```

#### 10. Validation Results Component
**Purpose**: Display post-installation validation results

**Interface**:
```typescript
interface ValidationResult {
  service: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: string;
  }[];
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  accessUrl?: string;
}

interface InfrastructureValidationResult {
  nginx: {
    tested: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    tests: {
      category: string;
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }[];
  };
  timescaledb: {
    tested: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    tests: {
      category: string;
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }[];
  };
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}
```

### Backend API Endpoints

#### 1. System Check API
```
GET /api/wizard/system-check
Response: SystemCheckResult
```

#### 2. Profiles API
```
GET /api/wizard/profiles
Response: Profile[]

GET /api/wizard/profiles/:id
Response: Profile
```

#### 3. Configuration API
```
POST /api/wizard/config/validate
Request: InstallationConfig
Response: { valid: boolean; errors: ValidationError[] }

POST /api/wizard/config/save
Request: InstallationConfig
Response: { success: boolean; path: string }

GET /api/wizard/config/load
Response: InstallationConfig
```

#### 4. Installation API
```
POST /api/wizard/install
Request: InstallationConfig
Response: { installationId: string; status: 'started' }

GET /api/wizard/install/:id/status
Response: InstallationProgress

POST /api/wizard/install/:id/cancel
Response: { success: boolean }
```

#### 5. Validation API
```
POST /api/wizard/validate
Request: { profiles: string[] }
Response: ValidationResult[]

GET /api/wizard/validate/service/:name
Response: ValidationResult

POST /api/wizard/validate/infrastructure
Request: { profiles: string[] }
Response: InfrastructureValidationResult
```

**Infrastructure Validation**: Runs comprehensive infrastructure tests
- **Nginx Testing**: Configuration, routing, security headers, rate limiting, SSL/TLS
- **TimescaleDB Testing**: Hypertables, compression, continuous aggregates (for explorer profile)
- **Integration**: Executes `test-nginx.sh` and `test-timescaledb.sh` scripts
- **Results**: Detailed pass/fail/warn status for each infrastructure component

#### 6. Reconfiguration API
```
GET /api/wizard/installation-state
Response: InstallationState

POST /api/wizard/reconfigure/preview
Request: { profiles: string[], configuration: InstallationConfig }
Response: { diff: ConfigurationDiff, validation: ValidationResult[] }

POST /api/wizard/reconfigure/apply
Request: { changes: ConfigurationChange[], backupName?: string }
Response: { success: boolean, backupId: string, installationId: string }

POST /api/wizard/profile/remove
Request: { profileId: string, removeData: boolean, dataOptions: DataRemovalOption[] }
Response: { success: boolean, removedServices: string[], preservedData: string[] }

GET /api/wizard/suggestions
Response: ConfigurationSuggestion[]
```

#### 7. Profile Management API
```
GET /api/wizard/profiles/state
Response: ProfileWithState[]

POST /api/wizard/profiles/validate-removal
Request: { profileId: string }
Response: { canRemove: boolean, dependencies: string[], warnings: string[] }

POST /api/wizard/profiles/validate-addition
Request: { profileId: string, existingProfiles: string[] }
Response: { canAdd: boolean, conflicts: string[], suggestions: string[] }
```

#### 8. Backup Management API
```
GET /api/wizard/backups
Response: Backup[]

POST /api/wizard/backup/create
Request: { name: string, reason: string }
Response: { backupId: string, path: string, size: number }

POST /api/wizard/backup/restore
Request: { backupId: string }
Response: { success: boolean, restoredFiles: string[] }
```

#### 6. WebSocket Progress Stream
```
WS /ws/wizard/progress/:installationId
Events:
  - progress: InstallationProgress
  - log: LogEntry
  - service-status: ServiceStatus
  - complete: ValidationResult[]
  - error: ErrorDetails
```

## Data Models

### Installation Configuration
```typescript
interface InstallationConfig {
  version: string;
  timestamp: string;
  profiles: string[];
  
  environment: {
    // Core settings
    KASPA_NODE_P2P_PORT: number;
    KASPA_NODE_RPC_PORT: number;
    PUBLIC_NODE: boolean;
    
    // Database settings
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    
    // Service ports
    DASHBOARD_PORT: number;
    KASIA_APP_PORT: number;
    KSOCIAL_APP_PORT: number;
    
    // Network settings
    KASPA_NETWORK: 'mainnet' | 'testnet';
    
    // Advanced settings
    [key: string]: any;
  };
  
  network: {
    publicNode: boolean;
    externalIp?: string;
    sslEnabled: boolean;
    sslCertPath?: string;
    sslKeyPath?: string;
  };
  
  advanced: {
    buildFromSource: boolean;
    enableTelemetry: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    customDockerComposeFile?: string;
  };
}
```

### Profile Definition
```typescript
interface ProfileDefinition {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  category: 'essential' | 'optional' | 'advanced';
  
  services: {
    name: string;
    required: boolean;
    description: string;
    startupOrder: number; // 1=Kaspa Node, 2=Indexers, 3=Applications
  }[];
  
  dependencies: string[]; // Required profiles
  conflicts: string[]; // Incompatible profiles
  prerequisites: string[]; // Must be selected (e.g., Mining requires Core or Archive)
  
  resources: {
    minCpu: number;
    minMemory: number; // in GB
    minDisk: number; // in GB
    recommended: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
  
  configuration: {
    required: string[];
    optional: string[];
    nodeUsage?: 'local' | 'public' | 'fallback'; // For profiles that can use local or public nodes
    indexerChoice?: 'local' | 'public'; // For Kaspa User Applications
  };
  
  developerMode?: {
    enabled: boolean;
    features: string[]; // ['debug-logging', 'exposed-ports', 'inspection-tools']
  };
  
  documentation: {
    setupGuide: string;
    troubleshooting: string;
  };
}

// Specific Profile Definitions
const PROFILES = {
  core: {
    id: 'core',
    name: 'Core Profile',
    description: 'Kaspa node (public/private) with optional wallet',
    services: [
      { name: 'kaspa-node', required: true, startupOrder: 1 },
      { name: 'wallet', required: false, startupOrder: 1 }
    ],
    configuration: {
      nodeUsage: 'local', // Can be 'public', 'private', or 'for-other-services'
      fallbackToPublic: true // If node fails, other services use public network
    }
  },
  
  kaspaUserApplications: {
    id: 'kaspa-user-applications',
    name: 'Kaspa User Applications',
    description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
    services: [
      { name: 'kasia-app', required: true, startupOrder: 3 },
      { name: 'k-social-app', required: true, startupOrder: 3 },
      { name: 'kaspa-explorer', required: true, startupOrder: 3 }
    ],
    configuration: {
      indexerChoice: 'public', // Can be 'public' or 'local'
      publicEndpoints: {
        kasiaIndexer: 'https://api.kasia.io',
        kIndexer: 'https://api.k-social.io',
        simplyKaspaIndexer: 'https://api.simplykaspa.io'
      }
    },
    dependencies: [], // Optional: can add 'indexer-services' for local indexers
    prerequisites: [] // No hard requirements
  },
  
  indexerServices: {
    id: 'indexer-services',
    name: 'Indexer Services',
    description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa)',
    services: [
      { name: 'timescaledb', required: true, startupOrder: 2 },
      { name: 'kasia-indexer', required: false, startupOrder: 2 },
      { name: 'k-indexer', required: false, startupOrder: 2 },
      { name: 'simply-kaspa-indexer', required: false, startupOrder: 2 }
    ],
    configuration: {
      sharedDatabase: true, // Single TimescaleDB with separate databases per indexer
      databases: ['kasia_db', 'k_db', 'simply_kaspa_db']
    },
    dependencies: [], // Optional: can use 'core' for local node
    fallbackToPublic: true // If no local node, use public Kaspa network
  },
  
  archiveNode: {
    id: 'archive-node',
    name: 'Archive Node Profile',
    description: 'Non-pruning Kaspa node for complete history',
    services: [
      { name: 'kaspa-archive-node', required: true, startupOrder: 1 }
    ],
    resources: {
      minMemory: 16, // Higher requirements
      minDisk: 1000
    }
  },
  
  mining: {
    id: 'mining',
    name: 'Mining Profile',
    description: 'Local mining stratum pointed to local node',
    services: [
      { name: 'kaspa-stratum', required: true, startupOrder: 3 }
    ],
    prerequisites: ['core', 'archive-node'], // Requires one of these
    dependencies: [] // Will be validated during selection
  }
};
```

### Installation State Management
```typescript
interface InstallationState {
  version: string;
  installedAt: string;
  lastModified: string;
  mode: 'initial' | 'reconfiguration' | 'update';
  
  profiles: {
    selected: string[];
    configuration: Record<string, any>;
    states: Record<string, ProfileInstallationState>;
  };
  
  services: {
    name: string;
    version: string;
    status: 'running' | 'stopped' | 'error';
    profile: string;
    containerId?: string;
    dataVolumes: string[];
    ports: number[];
  }[];
  
  configuration: {
    environment: Record<string, string>;
    network: NetworkConfig;
    advanced: AdvancedConfig;
  };
  
  backups: {
    id: string;
    createdAt: string;
    reason: string;
    size: number;
  }[];
  
  history: {
    timestamp: string;
    action: 'install' | 'reconfigure' | 'update' | 'remove';
    changes: string[];
    user?: string;
  }[];
}

interface ProfileInstallationState {
  installed: boolean;
  version?: string;
  installedAt?: string;
  status: 'running' | 'stopped' | 'error' | 'partial';
  services: string[];
  dataSize?: number;
  dependencies: {
    satisfied: string[];
    missing: string[];
    conflicts: string[];
  };
}

interface Backup {
  id: string;
  name: string;
  createdAt: string;
  reason: string;
  size: number;
  files: string[];
  metadata: {
    profiles: string[];
    version: string;
    services: string[];
  };
}
```

### Reconfiguration Workflow Models
```typescript
interface ReconfigurationWorkflow {
  id: string;
  startedAt: string;
  mode: 'add-profiles' | 'modify-config' | 'remove-profiles' | 'update';
  currentStep: string;
  
  changes: {
    profiles: {
      add: string[];
      remove: string[];
      modify: string[];
    };
    configuration: ConfigurationChange[];
    services: {
      restart: string[];
      stop: string[];
      start: string[];
    };
  };
  
  validation: {
    passed: boolean;
    warnings: string[];
    errors: string[];
    conflicts: string[];
  };
  
  backup: {
    required: boolean;
    created?: string;
    backupId?: string;
  };
  
  progress: {
    phase: 'planning' | 'backing-up' | 'applying' | 'validating' | 'complete' | 'error';
    percentage: number;
    currentTask: string;
    estimatedTimeRemaining?: number;
  };
}

interface ConfigurationSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'optimization' | 'security' | 'feature' | 'maintenance';
  
  trigger: {
    type: 'service-detected' | 'configuration-mismatch' | 'update-available' | 'resource-optimization';
    context: Record<string, any>;
  };
  
  action: {
    type: 'add-profile' | 'modify-config' | 'switch-endpoint' | 'enable-feature';
    parameters: Record<string, any>;
    wizardContext?: string; // Pre-fill wizard with this context
  };
  
  impact: {
    services: string[];
    downtime: number;
    benefits: string[];
    risks: string[];
  };
}
```

// Specific Profile Definitions
const PROFILES = {
  core: {
    id: 'core',
    name: 'Core Profile',
    description: 'Kaspa node (public/private) with optional wallet',
    services: [
      { name: 'kaspa-node', required: true, startupOrder: 1 },
      { name: 'wallet', required: false, startupOrder: 1 }
    ],
    configuration: {
      nodeUsage: 'local', // Can be 'public', 'private', or 'for-other-services'
      fallbackToPublic: true // If node fails, other services use public network
    }
  },
  
  kaspaUserApplications: {
    id: 'kaspa-user-applications',
    name: 'Kaspa User Applications',
    description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
    services: [
      { name: 'kasia-app', required: true, startupOrder: 3 },
      { name: 'k-social-app', required: true, startupOrder: 3 },
      { name: 'kaspa-explorer', required: true, startupOrder: 3 }
    ],
    configuration: {
      indexerChoice: 'public', // Can be 'public' or 'local'
      publicEndpoints: {
        kasiaIndexer: 'https://api.kasia.io',
        kIndexer: 'https://api.k-social.io',
        simplyKaspaIndexer: 'https://api.simplykaspa.io'
      }
    },
    dependencies: [], // Optional: can add 'indexer-services' for local indexers
    prerequisites: [] // No hard requirements
  },
  
  indexerServices: {
    id: 'indexer-services',
    name: 'Indexer Services',
    description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa)',
    services: [
      { name: 'timescaledb', required: true, startupOrder: 2 },
      { name: 'kasia-indexer', required: false, startupOrder: 2 },
      { name: 'k-indexer', required: false, startupOrder: 2 },
      { name: 'simply-kaspa-indexer', required: false, startupOrder: 2 }
    ],
    configuration: {
      sharedDatabase: true, // Single TimescaleDB with separate databases per indexer
      databases: ['kasia_db', 'k_db', 'simply_kaspa_db']
    },
    dependencies: [], // Optional: can use 'core' for local node
    fallbackToPublic: true // If no local node, use public Kaspa network
  },
  
  archiveNode: {
    id: 'archive-node',
    name: 'Archive Node Profile',
    description: 'Non-pruning Kaspa node for complete history',
    services: [
      { name: 'kaspa-archive-node', required: true, startupOrder: 1 }
    ],
    resources: {
      minMemory: 16, // Higher requirements
      minDisk: 1000
    }
  },
  
  mining: {
    id: 'mining',
    name: 'Mining Profile',
    description: 'Local mining stratum pointed to local node',
    services: [
      { name: 'kaspa-stratum', required: true, startupOrder: 3 }
    ],
    prerequisites: ['core', 'archive-node'], // Requires one of these
    dependencies: [] // Will be validated during selection
  }
};
```

## User Interface Design

### Wizard Steps

#### Initial Installation Mode Steps

#### Step 1: Welcome
- Project introduction
- Quick overview of features
- Link to documentation
- "Get Started" button

#### Step 2: System Check
- Automated system requirements validation
- Visual indicators (✓ Pass, ⚠ Warning, ✗ Fail)
- Detailed error messages with remediation
- "Retry Check" and "Continue Anyway" options

#### Step 3: Profile Selection
- Card-based profile display
- Visual service dependency graph
- Resource requirement calculator
- Template presets (Home Node, Public Node, Developer, Full Stack)
- Custom profile builder

#### Step 4: Configuration
- **Organization**: Grouped sections (Network, Kaspa Node, Database, Advanced)
- **Profile-Specific Fields**: Only show configuration options relevant to selected profiles
  - Core/Archive Node profiles: Show RPC port, P2P port, network selection, data directory
  - Indexer Services profile: Show database configuration, data directories
  - All profiles: Show network configuration (external IP, public node toggle)
- **Basic vs Advanced**: Toggle to show/hide advanced options
  - Basic: Essential settings (ports, network, public node, database password)
  - Advanced: Data directories, custom environment variables, volume names
- **Form Validation**: Real-time validation with helpful error messages
  - Port range validation (1024-65535)
  - Port conflict detection
  - Network change warnings (mainnet ↔ testnet requires fresh install)
- **Password Generator**: Secure random password generation for database services
- **Configuration Preview**: View generated .env file before installation
- **Import/Export**: Save and load configuration files

#### Step 5: Review
- Summary of selected profiles
- Configuration overview
- Estimated installation time
- Resource usage summary
- "Start Installation" button

#### Step 6: Installation
- Progress bar with percentage
- Current step indicator
- Real-time log streaming
- Service status cards
- Cancel installation option

#### Step 7: Validation
- **Service Health Checks**: Basic connectivity and API endpoint validation
- **Infrastructure Testing**: Comprehensive infrastructure validation
  - Nginx configuration, routing, security headers, rate limiting
  - TimescaleDB hypertables, compression, continuous aggregates (explorer profile)
  - Automated execution of `test-nginx.sh` and `test-timescaledb.sh`
- **Test Results Display**: Categorized results with pass/fail/warn status
  - Configuration tests
  - Security tests
  - Performance tests
  - Database tests
- **Access URLs**: Links to each service with quick action buttons
- **Troubleshooting**: Expandable sections for failed tests with remediation steps
- **Retry Options**: Re-run failed tests or skip to completion

#### Step 8: Complete
- Success message
- Service access information
- Next steps guide
- Links to documentation
- "Go to Dashboard" button

### Reconfiguration Mode Steps

#### Step 1: Reconfiguration Landing
```
┌─────────────────────────────────────────────────────────────┐
│ Reconfiguration Options                                      │
├─────────────────────────────────────────────────────────────┤
│ Current Installation                                         │
│ • Installed: Core Profile, Kaspa User Applications          │
│ • Last Modified: 2024-12-20 14:30                          │
│ • Services Running: 5/5                                     │
├─────────────────────────────────────────────────────────────┤
│ Configuration Suggestions                                    │
│ ⚡ Local indexers available - switch apps to local          │
│    [Configure Now]                                          │
│                                                              │
│ 💡 Wallet not configured for mining                         │
│    [Configure Now]                                          │
├─────────────────────────────────────────────────────────────┤
│ What would you like to do?                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📦 Add New Profiles                                     │ │
│ │ Install additional services to your system              │ │
│ │ [Continue →]                                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⚙️ Modify Configuration                                 │ │
│ │ Change settings for installed profiles                  │ │
│ │ [Continue →]                                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🗑️ Remove Profiles                                      │ │
│ │ Uninstall services and optionally delete data          │ │
│ │ [Continue →]                                            │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Step 2: Profile Selection with Installation State
```
┌─────────────────────────────────────────────────────────────┐
│ Profile Management                                           │
├─────────────────────────────────────────────────────────────┤
│ Currently Installed                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ ✓ Core Profile   │ │ ✓ Kaspa Apps     │                  │
│ │ Status: Running  │ │ Status: Running  │                  │
│ │ Version: v0.14.0 │ │ Version: v1.2.0  │                  │
│ │ Data: 2.1 GB     │ │ Data: 150 MB     │                  │
│ │ Green Border     │ │ Green Border     │                  │
│ │ Checkmark Badge  │ │ Checkmark Badge  │                  │
│ │                  │ │                  │                  │
│ │ [Modify] [Remove]│ │ [Modify] [Remove]│                  │
│ └──────────────────┘ └──────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│ Available to Add                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ Indexer Services │ │ Mining Profile   │                  │
│ │ Not Installed    │ │ Not Installed    │                  │
│ │ Est. Size: 5 GB  │ │ Est. Size: 100MB │                  │
│ │ Gray Border      │ │ Gray Border      │                  │
│ │                  │ │                  │                  │
│ │ [Select to Add]  │ │ [Select to Add]  │                  │
│ └──────────────────┘ └──────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

#### Step 3: Configuration with Context Awareness
- **Existing Configuration Display**: Show current values for all settings
- **Change Highlighting**: Highlight fields that have been modified
- **Impact Assessment**: Show which services will be affected by changes
- **Dependency Detection**: Automatically suggest related configuration changes
- **Advanced Scenarios**:
  - Adding Indexer Services to existing Node: Show local node connection options
  - Modifying Kaspa User Apps: Detect local indexers and suggest switching
  - Wallet Configuration: Show all wallet management options (create, import, configure)

#### Step 4: Configuration Preview and Backup
```
┌─────────────────────────────────────────────────────────────┐
│ Review Changes                                               │
├─────────────────────────────────────────────────────────────┤
│ Configuration Changes                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ + Add Profile: Indexer Services                         │ │
│ │ ~ Modify: KASIA_INDEXER_URL → localhost:8081            │ │
│ │ ~ Modify: K_INDEXER_URL → localhost:8082                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Affected Services                                            │
│ • kasia-app (restart required)                              │
│ • k-social-app (restart required)                           │
│ • timescaledb (new service)                                 │
│ • kasia-indexer (new service)                               │
│                                                              │
│ Estimated Downtime: 2-3 minutes                             │
│                                                              │
│ Backup Options                                               │
│ ☑ Create backup before applying changes                     │
│ Backup Name: [auto-backup-2024-12-20-14-30    ]            │
│                                                              │
│ [Back] [Apply Changes]                                       │
└─────────────────────────────────────────────────────────────┘
```

#### Step 5: Apply Changes with Progress
- Real-time progress tracking
- Service-by-service status updates
- Rollback option if errors occur
- Log streaming for troubleshooting

#### Step 6: Validation and Completion
- Validate all services after changes
- Show before/after comparison
- Provide access to updated services
- Return to dashboard option

### Profile Removal Flow

#### Removal Confirmation Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Remove Core Profile?                                         │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Warning: Other services depend on this profile           │
│                                                              │
│ Dependent Services:                                          │
│ • Indexer Services (will switch to public network)          │
│ • Mining Profile (will be disabled)                         │
│                                                              │
│ Data Management:                                             │
│ ○ Keep data volumes (2.1 GB) - can reinstall later         │
│ ○ Delete all data - clean removal                           │
│                                                              │
│ This action will:                                            │
│ • Stop kaspa-node container                                 │
│ • Update dependent service configurations                   │
│ • Create backup before removal                              │
│                                                              │
│ [Cancel] [Remove Profile]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Elements

#### Official Kaspa Brand Colors
**Source**: https://kaspa.org/media-kit/

```css
:root {
  /* Primary Kaspa Brand Colors */
  --kaspa-blue: #70C7BA;        /* Primary brand color (teal/cyan) */
  --kaspa-dark: #49C8B5;        /* Darker teal variant */
  --kaspa-light: #9FE7DC;       /* Lighter teal variant */
  
  /* Accent Colors */
  --kaspa-purple: #7B61FF;      /* Secondary accent */
  --kaspa-gradient-start: #70C7BA;
  --kaspa-gradient-end: #49C8B5;
  
  /* Status Colors */
  --success: #7ED321;           /* Green for success states */
  --warning: #F5A623;           /* Orange for warnings */
  --error: #D0021B;             /* Red for errors */
  --info: #70C7BA;              /* Kaspa blue for info */
  
  /* Neutral Colors */
  --background: #F8F9FA;        /* Light gray background */
  --surface: #FFFFFF;           /* White surface */
  --surface-dark: #1A1A1A;      /* Dark surface (for dark mode) */
  --text: #333333;              /* Dark gray text */
  --text-secondary: #666666;    /* Medium gray text */
  --text-light: #999999;        /* Light gray text */
  --border: #E0E0E0;            /* Border color */
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);
  --gradient-accent: linear-gradient(135deg, #7B61FF 0%, #70C7BA 100%);
}
```

#### Typography
**Official Kaspa Fonts** (from media kit):
- **Headings**: "Montserrat", "Inter", sans-serif (Bold/SemiBold)
- **Body**: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Code**: "Fira Code", "JetBrains Mono", "Courier New", monospace
- **Logo**: Use official Kaspa logo SVG from media kit

#### Logo Usage
```html
<!-- Primary Logo (Light Background) -->
<img src="/assets/kaspa-logo.svg" alt="Kaspa" />

<!-- Logo with Text -->
<img src="/assets/kaspa-logo-text.svg" alt="Kaspa All-in-One" />

<!-- Icon Only (for small spaces) -->
<img src="/assets/kaspa-icon.svg" alt="Kaspa" />
```

**Logo Guidelines**:
- Minimum size: 32px height for icon, 120px width for full logo
- Clear space: Minimum 16px around logo
- Use official SVG files from https://kaspa.org/media-kit/
- Do not modify colors, proportions, or add effects

#### Component Styling (Kaspa Brand)

**Cards**:
```css
.card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(112, 199, 186, 0.1);
  border: 1px solid var(--border);
  transition: all 200ms ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(112, 199, 186, 0.2);
  transform: translateY(-2px);
}

.card-selected {
  border: 2px solid var(--kaspa-blue);
  box-shadow: 0 4px 16px rgba(112, 199, 186, 0.3);
}
```

**Buttons**:
```css
.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 200ms ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(112, 199, 186, 0.4);
}

.btn-secondary {
  background: transparent;
  color: var(--kaspa-blue);
  border: 2px solid var(--kaspa-blue);
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
}
```

**Progress Bars**:
```css
.progress-bar {
  background: var(--border);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
}

.progress-fill {
  background: var(--gradient-primary);
  height: 100%;
  transition: width 300ms ease;
  border-radius: 8px;
}
```

**Status Indicators**:
```css
.status-healthy {
  color: var(--success);
  background: rgba(126, 211, 33, 0.1);
  border: 1px solid var(--success);
}

.status-warning {
  color: var(--warning);
  background: rgba(245, 166, 35, 0.1);
  border: 1px solid var(--warning);
}

.status-error {
  color: var(--error);
  background: rgba(208, 2, 27, 0.1);
  border: 1px solid var(--error);
}

.status-info {
  color: var(--kaspa-blue);
  background: rgba(112, 199, 186, 0.1);
  border: 1px solid var(--kaspa-blue);
}
```

**Loading Spinners**:
```css
.spinner {
  border: 3px solid var(--border);
  border-top: 3px solid var(--kaspa-blue);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

**Toast Notifications**:
```css
.toast {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-left: 4px solid var(--kaspa-blue);
  padding: 16px;
  animation: slideIn 300ms ease;
}

.toast-success {
  border-left-color: var(--success);
}

.toast-error {
  border-left-color: var(--error);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### System Check Properties

**Property 1: Docker detection consistency**  
*For any* system state, if Docker is installed and running, then the system check SHALL report Docker as available with a valid version number  
**Validates: Requirements 1.1**

**Property 2: Resource requirement validation**  
*For any* set of selected profiles, the calculated minimum resource requirements SHALL be less than or equal to the sum of individual profile requirements (accounting for shared resources)  
**Validates: Requirements 1.3**

**Property 3: Port conflict detection**  
*For any* configuration with custom port assignments, if two services are assigned the same port, then the system check SHALL report a port conflict error  
**Validates: Requirements 1.4**

### Profile Selection Properties

**Property 4: Profile dependency completeness**  
*For any* set of selected profiles, if a profile has dependencies, then all dependency profiles SHALL be included in the selection (either explicitly or implicitly resolved)  
**Validates: Requirements 2.2**

**Property 5: Prerequisite validation**  
*For any* profile selection including Mining profile, at least one of Core Profile or Archive Node Profile SHALL be included in the selection  
**Validates: Requirements 2.7**

**Property 6: Circular dependency prevention**  
*For any* set of selected profiles, there SHALL NOT exist a circular dependency chain where profile A depends on B, B depends on C, and C depends on A  
**Validates: Requirements 2.5**

**Property 7: Resource deduplication**  
*For any* set of profiles that share a common service (e.g., TimescaleDB), the combined resource calculation SHALL count the shared service resources only once  
**Validates: Requirements 2.3**

**Property 8: Developer Mode application**  
*For any* profile selection with Developer Mode enabled, the generated configuration SHALL include debug logging, exposed ports, and development tools for all selected profiles  
**Validates: Requirements 2.8**

### Configuration Properties

**Property 9: Password generation security**  
*For any* generated password, it SHALL have sufficient entropy (minimum 32 characters, cryptographically random) to be considered secure  
**Validates: Requirements 3.4, 10.1**

**Property 10: Configuration validation completeness**  
*For any* configuration with required fields, if any required field is missing or invalid, then validation SHALL fail with a specific error message  
**Validates: Requirements 3.3**

**Property 11: TimescaleDB database separation**  
*For any* configuration with Indexer Services profile selected, the generated configuration SHALL create separate databases (kasia_db, k_db, simply_kaspa_db) within the shared TimescaleDB instance  
**Validates: Requirements 3.6**

**Property 12: Fallback configuration**  
*For any* configuration where Core Profile is selected with "for other services" option, if the local node fails health checks, then the configuration SHALL automatically fallback to public Kaspa network endpoints  
**Validates: Requirements 3.7**

**Property 13: Profile-specific configuration visibility**  
*For any* configuration form, only configuration fields relevant to the selected profiles SHALL be displayed to the user  
**Validates: Requirements 3.12**

**Property 14: Kaspa node port configuration**  
*For any* configuration with Core Profile or Archive Node Profile selected, the wizard SHALL provide editable fields for RPC port (default 16110) and P2P port (default 16111)  
**Validates: Requirements 3.9**

**Property 15: Network selection availability**  
*For any* configuration with Core Profile or Archive Node Profile selected, the wizard SHALL provide a network selection option with mainnet and testnet choices  
**Validates: Requirements 3.10**

**Property 16: Data directory configuration**  
*For any* profile with persistent data requirements, the wizard SHALL allow configuration of data directory locations or Docker volume names in the advanced section  
**Validates: Requirements 3.11**

### Network Configuration Properties

**Property 17: Port uniqueness**  
*For any* valid configuration, no two services SHALL be assigned the same port number  
**Validates: Requirements 4.2**

**Property 18: Port range validation**  
*For any* custom port configuration, the port number SHALL be within the valid range (1024-65535)  
**Validates: Requirements 4.6**

**Property 19: External IP detection**  
*For any* system with network connectivity, the external IP detection SHALL return either a valid IPv4/IPv6 address or a clear error message  
**Validates: Requirements 4.3**

**Property 20: Network change warning**  
*For any* configuration where the network selection is changed from mainnet to testnet or vice versa, the wizard SHALL display a warning about data incompatibility  
**Validates: Requirements 4.7**

### Installation Progress Properties

**Property 21: Progress monotonicity**  
*For any* installation process, the progress percentage SHALL never decrease (monotonically increasing from 0% to 100%)  
**Validates: Requirements 5.1**

**Property 22: Service startup ordering**  
*For any* installation with multiple profiles, services SHALL start in dependency order: Kaspa Node (order 1), Indexer Services (order 2), Applications (order 3)  
**Validates: Requirements 14.1**

**Property 23: Error message specificity**  
*For any* installation error, the error message SHALL include the specific service name, error type, and at least one troubleshooting suggestion  
**Validates: Requirements 5.5, 8.1, 8.2**

### Validation Properties

**Property 24: Health check dependency order**  
*For any* post-installation validation, health checks SHALL be performed in dependency order (nodes before indexers before applications)  
**Validates: Requirements 6.1**

**Property 25: Database connectivity verification**  
*For any* installation with TimescaleDB, validation SHALL verify that all configured databases (kasia_db, k_db, simply_kaspa_db) are accessible and initialized  
**Validates: Requirements 6.2**

**Property 26: API endpoint reachability**  
*For any* running service with an API endpoint, validation SHALL successfully connect to the endpoint or report a specific connectivity error  
**Validates: Requirements 6.3**

**Property 27: Fallback option availability**  
*For any* validation where Core Profile node fails health checks and dependent services exist, the wizard SHALL offer at least two options: continue with public network or troubleshoot  
**Validates: Requirements 6.6**

### Configuration Persistence Properties

**Property 28: Configuration round-trip**  
*For any* valid configuration, saving to .env and installation-config.json then loading SHALL produce an equivalent configuration  
**Validates: Requirements 7.1, 7.2**

**Property 29: Backup before modification**  
*For any* reconfiguration operation, a timestamped backup SHALL be created in .kaspa-backups/ before any configuration files are modified  
**Validates: Requirements 7.4, 13.4**

**Property 30: Configuration loading idempotence**  
*For any* saved configuration, loading it multiple times SHALL produce the same wizard state  
**Validates: Requirements 7.3**

### Wizard Flow Properties

**Property 31: Step progression validation**  
*For any* wizard step transition, if the current step validation fails, then progression to the next step SHALL be prevented  
**Validates: Requirements 11.5**

**Property 32: State persistence**  
*For any* wizard state at any step, saving and then loading the state SHALL restore the wizard to the same step with the same selections  
**Validates: Requirements 11.3**

**Property 33: Navigation consistency**  
*For any* wizard step, clicking "Back" then "Next" SHALL return to the same step without losing data  
**Validates: Requirements 11.2**

### Reconfiguration Properties

**Property 34: Configuration loading in reconfigure mode**  
*For any* existing installation, launching wizard in reconfigure mode SHALL pre-populate all form fields with current configuration values  
**Validates: Requirements 13.1, 13.3**

**Property 35: Rollback availability**  
*For any* failed update or reconfiguration, a rollback option SHALL be available that restores the most recent backup  
**Validates: Requirements 13.8**

### Dependency Management Properties

**Property 36: Startup order calculation**  
*For any* set of selected profiles, the calculated startup order SHALL ensure that no service starts before its dependencies are healthy  
**Validates: Requirements 14.3**

**Property 37: Circular dependency detection**  
*For any* profile selection, if a circular dependency exists, then profile validation SHALL fail with an error identifying the cycle  
**Validates: Requirements 14.2**

**Property 38: Fallback configuration generation**  
*For any* dependency service failure during startup, if fallback is available, then the wizard SHALL generate a valid fallback configuration using public endpoints  
**Validates: Requirements 14.5**

### Security Properties

**Property 39: Password masking**  
*For any* password input field, the default display state SHALL mask the password characters  
**Validates: Requirements 10.2**

**Property 40: Sensitive data exclusion from logs**  
*For any* log output (browser console or backend logs), passwords and API keys SHALL NOT appear in plain text  
**Validates: Requirements 10.4**

**Property 41: HTTPS preference**  
*For any* backend communication, if HTTPS is available, then the wizard SHALL use HTTPS instead of HTTP  
**Validates: Requirements 10.3**

## Error Handling

### Error Categories

1. **System Requirement Errors**
   - Docker not installed
   - Insufficient resources
   - Port conflicts
   - Permission issues

2. **Configuration Errors**
   - Invalid input values
   - Missing required fields
   - Conflicting settings

3. **Installation Errors**
   - Docker build failures
   - Container startup failures
   - Network connectivity issues
   - Database initialization failures

4. **Validation Errors**
   - Service health check failures
   - API endpoint unreachable
   - Database connection failures
   - Infrastructure test failures (nginx, TimescaleDB)

### Error Handling Strategy

```typescript
interface ErrorHandler {
  category: ErrorCategory;
  severity: 'critical' | 'error' | 'warning' | 'info';
  message: string;
  details: string;
  troubleshooting: TroubleshootingStep[];
  retryable: boolean;
  autoRetry: boolean;
  maxRetries: number;
}

interface TroubleshootingStep {
  title: string;
  description: string;
  command?: string;
  link?: string;
}
```

## Infrastructure Testing Integration

### Overview
The wizard integrates comprehensive infrastructure testing to validate the installation beyond basic service health checks. This ensures that nginx and TimescaleDB are properly configured and performing optimally.

### Test Scripts Integration

#### Nginx Testing (`test-nginx.sh`)
**Executed**: After nginx container starts
**Tests**: 25+ comprehensive tests including:
- Configuration syntax validation
- HTTP/HTTPS connectivity
- Security headers (X-Frame-Options, CSP, etc.)
- Rate limiting functionality
- Gzip compression
- WebSocket support
- Upstream health checks

#### TimescaleDB Testing (`test-timescaledb.sh`)
**Executed**: After TimescaleDB starts (explorer profile only)
**Tests**: 25+ comprehensive tests including:
- TimescaleDB extension validation
- Hypertables configuration
- Compression policies
- Continuous aggregates
- Backup/restore capability
- Query performance

### Implementation

```typescript
// Backend validation engine
class InfrastructureValidator {
  async validateNginx(): Promise<TestResult> {
    const result = await this.executeTestScript('./test-nginx.sh');
    return this.parseTestOutput(result);
  }
  
  async validateTimescaleDB(): Promise<TestResult> {
    const result = await this.executeTestScript('./test-timescaledb.sh');
    return this.parseTestOutput(result);
  }
  
  async validateAll(profiles: string[]): Promise<InfrastructureValidationResult> {
    const results = {
      nginx: await this.validateNginx(),
      timescaledb: profiles.includes('explorer') 
        ? await this.validateTimescaleDB()
        : { tested: false, skipped: true }
    };
    
    return this.aggregateResults(results);
  }
  
  private parseTestOutput(output: string): TestResult {
    // Parse test script output format:
    // [SUCCESS] ✓ Test Name: Message
    // [ERROR] ✗ Test Name: Message
    // [WARN] ⚠ Test Name: Message
    
    const tests = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('[SUCCESS]') || line.includes('[ERROR]') || line.includes('[WARN]')) {
        tests.push(this.parseTestLine(line));
      }
    }
    
    return {
      totalTests: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length,
      warnings: tests.filter(t => t.status === 'warn').length,
      tests
    };
  }
}
```

### UI Display

The validation step displays infrastructure test results in categorized sections:

```
┌─────────────────────────────────────────────────────────┐
│ Infrastructure Validation                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ✓ Nginx Configuration (25/25 tests passed)              │
│   ├─ ✓ Configuration Tests (3/3)                        │
│   ├─ ✓ Security Tests (7/7)                             │
│   ├─ ✓ Performance Tests (4/4)                          │
│   └─ ✓ Infrastructure Tests (7/7)                       │
│                                                           │
│ ✓ TimescaleDB Configuration (25/25 tests passed)        │
│   ├─ ✓ Extension & Initialization (3/3)                 │
│   ├─ ✓ Hypertables & Compression (7/7)                  │
│   ├─ ✓ Data Operations (4/4)                            │
│   └─ ✓ Backup & Restore (3/3)                           │
│                                                           │
│ [View Detailed Results] [Retry Failed Tests]            │
└─────────────────────────────────────────────────────────┘
```

### Benefits

1. **Comprehensive Validation**: Goes beyond basic health checks
2. **Early Problem Detection**: Identifies configuration issues immediately
3. **Detailed Diagnostics**: Provides specific failure information
4. **User Confidence**: Users know their installation is fully validated
5. **Troubleshooting**: Clear guidance on fixing issues

## Testing Strategy

### Unit Tests
- Component rendering
- State management
- Form validation
- API client functions
- Configuration generation
- Infrastructure test result parsing

### Integration Tests
- API endpoint responses
- WebSocket communication
- Docker API integration
- File system operations
- Configuration persistence
- Infrastructure test script execution

### End-to-End Tests
- Complete wizard flow
- Profile selection and installation
- Error handling and recovery
- Multi-browser compatibility
- Responsive design validation
- Infrastructure validation workflow

### Performance Tests
- Page load time (<2 seconds)
- API response time (<500ms)
- WebSocket latency (<100ms)
- Installation progress updates (real-time)
- Infrastructure test execution time (<2 minutes)

## Security Considerations

### Frontend Security
- Input sanitization
- XSS prevention
- CSRF protection
- Secure password handling
- No sensitive data in localStorage

### Backend Security
- API authentication (if multi-user)
- Rate limiting
- Input validation
- Secure file operations
- Docker socket access control

### Configuration Security
- Encrypted password storage
- Secure random generation
- File permission management
- SSL/TLS certificate validation

## Wizard-Dashboard Integration

### Integration Architecture

The wizard and dashboard work together to provide a complete lifecycle management experience:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Workflows                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Fresh Installation:                                         │
│  User → Wizard → Configuration → Installation → Dashboard   │
│                                                               │
│  Reconfiguration:                                            │
│  Dashboard → "Reconfigure" → Wizard (loads config) → Apply  │
│                                                               │
│  Updates:                                                    │
│  Dashboard → "Updates Available" → Wizard → Apply Updates   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Wizard Modes

#### Initial Installation Mode
- Fresh system, no existing configuration
- Full wizard flow from system check to completion
- Generates new configuration files
- Creates initial docker-compose setup
- Redirects to dashboard on completion

#### Reconfiguration Mode
- Launched from dashboard "Reconfigure" button
- Loads existing configuration from `.env` and `installation-config.json`
- Allows modification of profiles and settings
- Backs up existing configuration before changes
- Applies changes and restarts affected services

#### Update Mode
- Launched from dashboard "Apply Updates" button
- Shows available service updates with version info
- Allows selective update of individual services
- Each service handles its own data migration
- Provides rollback option if update fails

### Node Synchronization Management

#### Synchronization Strategy

Kaspa nodes require blockchain synchronization which can take considerable time (hours to days depending on network and hardware). The wizard handles this gracefully:

**Synchronization Phases:**
1. **Initial Sync** - Node downloads and validates blockchain
2. **Background Sync** - Continues while wizard allows progression
3. **Dependent Service Wait** - Services requiring synced node wait for completion

**User Experience:**
```typescript
interface NodeSyncStrategy {
  // Option 1: Wait for full sync before proceeding
  waitForFullSync: {
    enabled: boolean;
    showProgress: boolean;
    allowPause: boolean;
    estimatedTime: number;
  };
  
  // Option 2: Continue in background, proceed with other services
  backgroundSync: {
    enabled: boolean;
    notifyOnComplete: boolean;
    dependentServicesWait: boolean; // Services needing synced node wait
  };
  
  // Option 3: Skip node sync, use public network
  skipSync: {
    enabled: boolean;
    fallbackToPublic: boolean;
    message: string;
  };
}
```

**Implementation:**
```typescript
class NodeSyncManager {
  async handleNodeSync(node: string): Promise<SyncDecision> {
    // Start node
    await this.startNode(node);
    
    // Check sync status
    const syncStatus = await this.getSyncStatus(node);
    
    if (syncStatus.synced) {
      return { action: 'proceed', message: 'Node already synced' };
    }
    
    // Present options to user
    const choice = await this.promptUser({
      title: 'Kaspa Node Synchronization',
      message: `The Kaspa node needs to sync with the blockchain. This may take several hours.`,
      estimatedTime: syncStatus.estimatedTimeRemaining,
      options: [
        {
          id: 'wait',
          label: 'Wait for sync to complete',
          description: 'Wizard will show progress and wait',
          recommended: false
        },
        {
          id: 'background',
          label: 'Continue in background',
          description: 'Node syncs while wizard proceeds. Services needing synced node will wait.',
          recommended: true
        },
        {
          id: 'skip',
          label: 'Skip and use public network',
          description: 'Other services will use public Kaspa nodes',
          recommended: false
        }
      ]
    });
    
    return this.executeChoice(choice, node);
  }
  
  async monitorBackgroundSync(node: string): Promise<void> {
    // Monitor sync in background
    const interval = setInterval(async () => {
      const status = await this.getSyncStatus(node);
      
      // Update wizard state
      await this.updateWizardState({
        nodeSyncProgress: status.percentage,
        nodeSyncComplete: status.synced
      });
      
      // Notify dependent services
      if (status.synced) {
        await this.notifyDependentServices(node);
        clearInterval(interval);
      }
    }, 10000); // Check every 10 seconds
  }
  
  async getSyncStatus(node: string): Promise<SyncStatus> {
    // Query node RPC for sync status
    const rpc = await this.connectToNode(node);
    const info = await rpc.getBlockDagInfo();
    
    return {
      synced: info.isSynced,
      currentBlock: info.blockCount,
      targetBlock: info.headerCount,
      percentage: (info.blockCount / info.headerCount) * 100,
      estimatedTimeRemaining: this.estimateSyncTime(info)
    };
  }
}
```

### Wizard State Persistence

The wizard maintains persistent state to allow pausing and resuming:

```typescript
interface WizardState {
  // Installation metadata
  installationId: string;
  version: string;
  startedAt: string;
  lastActivity: string;
  
  // Current progress
  currentStep: number;
  completedSteps: string[];
  phase: 'preparing' | 'building' | 'starting' | 'syncing' | 'validating' | 'complete';
  
  // Configuration
  profiles: {
    selected: string[];
    configuration: Record<string, any>;
  };
  
  // Service states
  services: {
    name: string;
    status: 'pending' | 'building' | 'starting' | 'syncing' | 'running' | 'error';
    containerId?: string;
    syncProgress?: SyncProgress;
    startedAt?: string;
    logs: string[];
  }[];
  
  // Synchronization tracking
  syncOperations: {
    service: string;
    type: 'blockchain' | 'database' | 'indexer';
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    progress: number;
    startedAt: string;
    estimatedCompletion?: string;
    canContinueInBackground: boolean;
  }[];
  
  // User choices
  userDecisions: {
    timestamp: string;
    decision: string;
    context: string;
  }[];
  
  // Resumability
  resumable: boolean;
  resumePoint: string; // Step to resume from
  backgroundTasks: string[]; // Tasks running in background
}

// Saved to: .kaspa-aio/wizard-state.json
```

**State Persistence:**
```typescript
class WizardStatePersistence {
  private statePath = '.kaspa-aio/wizard-state.json';
  
  async saveState(state: WizardState): Promise<void> {
    state.lastActivity = new Date().toISOString();
    await fs.writeFile(this.statePath, JSON.stringify(state, null, 2));
  }
  
  async loadState(): Promise<WizardState | null> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null; // No saved state
    }
  }
  
  async canResume(): Promise<boolean> {
    const state = await this.loadState();
    if (!state) return false;
    
    // Check if state is recent (within 24 hours)
    const lastActivity = new Date(state.lastActivity);
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceActivity < 24 && state.resumable;
  }
  
  async resumeInstallation(): Promise<WizardState> {
    const state = await this.loadState();
    if (!state) throw new Error('No state to resume');
    
    // Verify services are still running
    for (const service of state.services) {
      if (service.containerId) {
        const running = await this.isContainerRunning(service.containerId);
        if (!running && service.status === 'running') {
          service.status = 'error';
          service.logs.push('Container stopped unexpectedly');
        }
      }
    }
    
    // Resume background sync operations
    for (const sync of state.syncOperations) {
      if (sync.status === 'in-progress' && sync.canContinueInBackground) {
        await this.resumeSyncMonitoring(sync.service);
      }
    }
    
    return state;
  }
}
```

**Resume UI:**
```typescript
// When wizard starts, check for resumable state
async function initializeWizard(): Promise<void> {
  const persistence = new WizardStatePersistence();
  const canResume = await persistence.canResume();
  
  if (canResume) {
    const choice = await promptUser({
      title: 'Resume Installation',
      message: 'An installation is in progress. Would you like to resume?',
      options: [
        {
          id: 'resume',
          label: 'Resume Installation',
          description: 'Continue from where you left off',
          recommended: true
        },
        {
          id: 'restart',
          label: 'Start Over',
          description: 'Begin a new installation (will stop existing services)',
          recommended: false
        }
      ]
    });
    
    if (choice === 'resume') {
      const state = await persistence.resumeInstallation();
      await continueFromState(state);
    } else {
      await cleanupExistingInstallation();
      await startNewInstallation();
    }
  } else {
    await startNewInstallation();
  }
}
```

### Background Task Management

**Services that can run in background:**
- Kaspa node synchronization
- Indexer initial sync
- Database migrations
- Image downloads

**Implementation:**
```typescript
class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  
  async startBackgroundTask(task: BackgroundTask): Promise<void> {
    this.tasks.set(task.id, task);
    
    // Save to wizard state
    await this.saveTaskToState(task);
    
    // Start monitoring
    this.monitorTask(task);
  }
  
  async monitorTask(task: BackgroundTask): Promise<void> {
    const interval = setInterval(async () => {
      const status = await task.checkStatus();
      
      // Update task progress
      task.progress = status.progress;
      task.status = status.status;
      
      // Save state
      await this.saveTaskToState(task);
      
      // Notify if complete
      if (status.complete) {
        await this.notifyTaskComplete(task);
        clearInterval(interval);
        this.tasks.delete(task.id);
      }
    }, task.checkInterval || 10000);
  }
  
  async getRunningTasks(): Promise<BackgroundTask[]> {
    return Array.from(this.tasks.values());
  }
  
  async waitForTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    return new Promise((resolve) => {
      const check = setInterval(async () => {
        const status = await task.checkStatus();
        if (status.complete) {
          clearInterval(check);
          resolve();
        }
      }, 1000);
    });
  }
}
```

### Configuration Persistence

```typescript
interface InstallationState {
  version: string;
  installedAt: string;
  lastModified: string;
  mode: 'initial' | 'reconfiguration' | 'update';
  
  profiles: {
    selected: string[];
    configuration: Record<string, any>;
  };
  
  services: {
    name: string;
    version: string;
    status: 'running' | 'stopped' | 'syncing' | 'error';
    lastUpdated: string;
    syncStatus?: {
      synced: boolean;
      progress: number;
      estimatedCompletion?: string;
    };
  }[];
  
  history: {
    timestamp: string;
    action: 'install' | 'reconfigure' | 'update';
    changes: string[];
    user: string;
  }[];
}

// Saved to: .kaspa-aio/installation-state.json
```

### Dashboard Integration Points

#### 1. Reconfiguration Link
```typescript
// Dashboard provides link to wizard with current config
interface ReconfigurationLink {
  url: string; // http://localhost:3000/wizard?mode=reconfigure
  token: string; // Security token for authentication
  currentConfig: InstallationState;
}

// Wizard loads configuration
async function loadReconfigurationState(token: string): Promise<InstallationState> {
  const state = await fetch(`/api/wizard/state?token=${token}`);
  return state.json();
}
```

#### 2. Update Management
```typescript
interface UpdateNotification {
  service: string;
  currentVersion: string;
  availableVersion: string;
  changelog: string;
  breaking: boolean;
  releaseDate: string;
}

// Dashboard shows updates, wizard applies them
async function applyUpdate(service: string, version: string): Promise<UpdateResult> {
  // Backup configuration
  await backupConfiguration();
  
  // Update docker-compose with new version
  await updateServiceVersion(service, version);
  
  // Restart service
  await restartService(service);
  
  // Verify health
  const healthy = await checkServiceHealth(service);
  
  if (!healthy) {
    // Offer rollback
    return {
      success: false,
      rollbackAvailable: true
    };
  }
  
  return { success: true };
}
```

#### 3. Service Status Sync
```typescript
// Dashboard monitors services, wizard configures them
interface ServiceStatusSync {
  // Dashboard → Wizard: Current service states
  getServiceStates(): ServiceState[];
  
  // Wizard → Dashboard: Configuration changes
  notifyConfigurationChange(changes: ConfigChange[]): void;
  
  // Bidirectional: Health check results
  updateHealthStatus(service: string, status: HealthStatus): void;
}
```

### Host-Based Execution

The wizard runs on the host system (not in a container) for both initial installation and reconfiguration:

**Rationale:**
- Can install Docker if not present
- Direct access to system resources for validation
- Can modify docker-compose files
- No chicken-and-egg problem with containers

**Implementation:**
```bash
# Wizard startup script
#!/bin/bash
# start-wizard.sh

# Detect mode
if [ -f ".kaspa-aio/installation-state.json" ]; then
    MODE="reconfigure"
else
    MODE="install"
fi

# Start wizard with appropriate mode
./services/wizard/start-wizard.sh --mode=$MODE
```

### Configuration Backup Strategy

```typescript
interface BackupManager {
  async createBackup(reason: string): Promise<Backup> {
    const timestamp = new Date().toISOString();
    const backupPath = `.kaspa-backups/${timestamp}`;
    
    // Backup configuration files
    await this.copyFiles([
      '.env',
      'docker-compose.yml',
      'docker-compose.override.yml',
      '.kaspa-aio/installation-state.json'
    ], backupPath);
    
    return {
      id: timestamp,
      path: backupPath,
      reason: reason,
      files: ['...'],
      createdAt: timestamp
    };
  }
  
  async rollback(backupId: string): Promise<void> {
    const backupPath = `.kaspa-backups/${backupId}`;
    
    // Stop services
    await this.stopServices();
    
    // Restore configuration
    await this.restoreFiles(backupPath);
    
    // Restart services
    await this.startServices();
  }
}
```

### Update Workflow

```typescript
interface UpdateWorkflow {
  // 1. Dashboard detects updates
  async checkForUpdates(): Promise<UpdateNotification[]> {
    const updates = await this.queryGitHubReleases();
    return updates.filter(u => u.availableVersion > u.currentVersion);
  }
  
  // 2. User clicks "Apply Updates" in dashboard
  // 3. Dashboard launches wizard in update mode
  launchWizardForUpdates(updates: UpdateNotification[]): void {
    const url = `http://localhost:3000/wizard?mode=update&updates=${JSON.stringify(updates)}`;
    window.open(url, '_blank');
  }
  
  // 4. Wizard shows update interface
  async showUpdateInterface(updates: UpdateNotification[]): Promise<void> {
    // Display updates with checkboxes
    // Show version info and changelogs
    // Warn about breaking changes
    // Allow selective updates
  }
  
  // 5. User selects updates and confirms
  async applySelectedUpdates(selected: string[]): Promise<UpdateResult[]> {
    const results = [];
    
    for (const service of selected) {
      // Backup before each update
      await this.backupManager.createBackup(`Before updating ${service}`);
      
      try {
        const result = await this.updateService(service);
        results.push(result);
      } catch (error) {
        // Offer rollback on failure
        results.push({
          service,
          success: false,
          error: error.message,
          rollbackAvailable: true
        });
      }
    }
    
    return results;
  }
  
  // 6. Wizard shows results and returns to dashboard
  async completeUpdate(results: UpdateResult[]): Promise<void> {
    // Log update history
    await this.logUpdateHistory(results);
    
    // Notify dashboard of changes
    await this.notifyDashboard(results);
    
    // Redirect back to dashboard
    window.location.href = '/dashboard';
  }
}
```

## Deployment

### Bootstrap Strategy: Hybrid Multi-Runtime Approach

The wizard uses a **hybrid deployment strategy** to ensure zero-dependency operation while providing enhanced features when runtimes are available. This solves the "chicken-and-egg" problem where users need the wizard to install Docker, but the wizard itself shouldn't require complex dependencies.

#### Runtime Modes (Priority Order)

**1. Static HTML Mode (Zero Dependencies)** ✅ PRIMARY
- Pure HTML/CSS/JavaScript (no build step required)
- Opens directly in browser (file:// protocol or simple HTTP server)
- Works immediately on any system with a web browser
- Guides users through manual command execution
- Generates configuration files and installation commands
- User copies/pastes commands into terminal
- **Use Case**: First-time installation, non-technical users, systems without Node.js/Python

**2. Python Backend Mode (Enhanced)** 🐍 OPTIONAL
- Lightweight Python HTTP server (usually pre-installed on Linux/macOS)
- Executes system commands automatically
- Real-time progress updates via polling
- Better UX with automated validation
- Falls back to Static Mode if Python unavailable
- **Use Case**: Technical users, automated installations, better UX

**3. Node.js Backend Mode (Full Featured)** 🚀 ADVANCED
- Full-featured Express.js backend
- WebSocket real-time progress streaming
- Advanced automation and error handling
- Can run as Docker container AFTER initial setup
- Falls back to Python or Static Mode if Node.js unavailable
- **Use Case**: Development, advanced users, post-installation reconfiguration

#### Smart Launcher

The `start-wizard.sh` script automatically detects available runtimes and launches the best available mode:

```bash
#!/bin/bash
# start-wizard.sh - Smart wizard launcher

detect_and_launch() {
    # Try Node.js first (best experience)
    if command -v node &> /dev/null; then
        echo "🚀 Starting wizard with Node.js backend..."
        node services/wizard/backend/server.js
        return 0
    fi
    
    # Fall back to Python (good experience)
    if command -v python3 &> /dev/null; then
        echo "🐍 Starting wizard with Python backend..."
        python3 services/wizard/backend/server.py
        return 0
    fi
    
    # Fall back to static HTML (basic experience)
    echo "📄 Opening wizard in browser (static mode)..."
    echo "Visit: file://$(pwd)/services/wizard/index.html"
    
    # Try to open browser automatically
    if command -v xdg-open &> /dev/null; then
        xdg-open services/wizard/index.html
    elif command -v open &> /dev/null; then
        open services/wizard/index.html
    else
        echo "Please open services/wizard/index.html in your browser"
    fi
}

detect_and_launch
```

### Deployment Modes

#### Host-Based Execution (All Modes)

**IMPORTANT**: The wizard ALWAYS runs on the host system, never in a container.

**Rationale**:
- Can install Docker if not present (chicken-and-egg problem)
- Direct access to system resources for validation
- Can modify docker-compose files and .env
- No container overhead or complexity
- Simpler PROJECT_ROOT handling (always repository root)

#### Initial Installation Mode
- Wizard runs BEFORE Docker is installed
- Accessible via http://localhost:3000
- Guides through Docker installation
- Generates configuration files
- Validates system requirements
- Automatically starts on first run
- Redirects to dashboard after completion

#### Reconfiguration Mode
- Wizard accessible from dashboard
- Runs on host (same as initial installation)
- Can re-run for reconfiguration
- Preserves existing configuration
- Backup before changes
- Full WebSocket streaming support

#### Update Mode
- Wizard accessible from dashboard
- Runs on host (same as initial installation)
- Displays available service updates
- Applies updates with automatic backup
- Handles rollback on failure

### Directory Structure

```
services/wizard/
├── index.html              # Static wizard entry point (zero dependencies)
├── wizard.js               # Pure JavaScript (no build required)
├── wizard.css              # Pure CSS styling
├── assets/                 # Images, logos, icons
├── backend/
│   ├── server.py          # Python backend (optional)
│   ├── server.js          # Node.js backend (optional)
│   └── shared/            # Shared logic between backends
├── start-wizard.sh        # Smart launcher script
└── README.md              # Documentation

# Static Mode Files (Always Available)
index.html                  # Main wizard interface
wizard.js                   # Client-side logic
wizard.css                  # Kaspa-branded styling
assets/                     # Static assets

# Python Backend (Optional Enhancement)
backend/server.py           # Flask/FastAPI server
backend/requirements.txt    # Python dependencies (minimal)

# Node.js Backend (Optional Full Features)
backend/server.js           # Express.js server
backend/package.json        # Node.js dependencies
backend/Dockerfile          # For post-installation Docker mode
```

### Feature Comparison by Mode

| Feature | Static HTML | Python Backend | Node.js Backend |
|---------|-------------|----------------|-----------------|
| Zero Dependencies | ✅ Yes | ⚠️ Needs Python | ❌ Needs Node.js |
| System Checks | ✅ Manual | ✅ Automated | ✅ Automated |
| Command Execution | ⚠️ Copy/Paste | ✅ Automated | ✅ Automated |
| Progress Updates | ⚠️ Manual Refresh | ✅ Polling | ✅ WebSocket |
| Real-time Logs | ❌ No | ⚠️ Limited | ✅ Full Streaming |
| Error Handling | ⚠️ Basic | ✅ Good | ✅ Advanced |
| Auto-Remediation | ❌ No | ⚠️ Limited | ✅ Full |
| Docker Integration | ❌ No | ✅ Yes | ✅ Full API |
| Startup Time | ⚡ Instant | ⚡ Fast | ⚡ Fast |
| Browser Support | ✅ All Modern | ✅ All Modern | ✅ All Modern |

### Implementation Priority

**Phase 1: Static HTML Wizard (Week 1-2)** - CRITICAL
- Pure HTML/CSS/JS implementation
- Zero dependencies, works immediately
- Manual command execution with copy/paste
- Configuration file generation
- Basic validation and guidance
- **Deliverable**: Fully functional wizard that works on any system

**Phase 2: Python Backend (Week 3-4)** - HIGH PRIORITY
- Optional Python server for automation
- Automatic command execution
- Progress tracking via polling
- Better error handling
- Falls back to static mode if unavailable
- **Deliverable**: Enhanced UX for most users

**Phase 3: Node.js Backend (Week 5-6)** - MEDIUM PRIORITY
- Full-featured Express.js backend
- WebSocket real-time streaming
- Advanced automation
- Docker API integration
- Can run as container post-installation
- **Deliverable**: Best-in-class UX for all features

### User Experience by Mode

**Static HTML Mode (Non-Technical User):**
```
1. User downloads Kaspa All-in-One
2. Double-clicks services/wizard/index.html
3. Wizard opens in browser
4. Wizard shows: "Let's check your system"
5. User clicks "Check Docker"
6. Wizard shows: "Docker not found. Here's how to install it:"
   [Step-by-step guide with screenshots]
7. User installs Docker, clicks "Check Again"
8. Wizard shows: "✓ Docker installed!"
9. Wizard generates commands in text box
10. User copies commands, pastes in terminal
11. User clicks "I ran the commands"
12. Wizard validates installation
13. Success! Links to dashboard
```

**Python Backend Mode (Technical User):**
```
1. User downloads Kaspa All-in-One
2. Runs: ./start-wizard.sh
3. Script detects Python, starts server
4. Browser opens automatically to http://localhost:3000
5. Wizard checks system automatically
6. Shows: "Docker not found. Install now?"
7. User clicks "Install Docker"
8. Wizard runs installation commands automatically
9. Progress bar shows real-time status
10. Wizard validates installation automatically
11. Success! Redirects to dashboard
```

**Node.js Backend Mode (Advanced User):**
```
1. User downloads Kaspa All-in-One
2. Runs: ./start-wizard.sh
3. Script detects Node.js, starts server
4. Browser opens to http://localhost:3000
5. WebSocket connects, real-time updates begin
6. Wizard checks system, shows live results
7. Auto-detects issues, offers one-click fixes
8. User clicks "Auto-Configure"
9. Wizard installs, configures, validates automatically
10. Live log streaming shows all activity
11. Success! Dashboard opens automatically
```

### Graceful Degradation

The wizard gracefully degrades based on available capabilities:

```javascript
// Feature detection in wizard.js
const capabilities = {
    backend: detectBackend(),        // 'nodejs', 'python', or 'static'
    websocket: checkWebSocket(),     // true/false
    automation: checkAutomation(),   // true/false
    realtime: checkRealtime()        // true/false
};

// Adapt UI based on capabilities
if (capabilities.backend === 'static') {
    showManualInstructions();
    enableCopyPasteMode();
} else if (capabilities.backend === 'python') {
    enableAutomation();
    usePollingUpdates();
} else if (capabilities.backend === 'nodejs') {
    enableFullAutomation();
    useWebSocketUpdates();
}
```

### Cross-Platform Compatibility

**Linux:**
- Static: ✅ Works (any browser)
- Python: ✅ Usually pre-installed
- Node.js: ⚠️ May need installation

**macOS:**
- Static: ✅ Works (Safari, Chrome, Firefox)
- Python: ✅ Pre-installed (Python 3)
- Node.js: ⚠️ May need installation

**Windows:**
- Static: ✅ Works (Edge, Chrome, Firefox)
- Python: ⚠️ Usually not pre-installed
- Node.js: ⚠️ May need installation

**Windows WSL:**
- Static: ✅ Works
- Python: ✅ Usually available
- Node.js: ⚠️ May need installation

## Future Enhancements

1. **Multi-language Support**
   - Internationalization (i18n)
   - Language selection
   - Translated documentation

2. **Advanced Features**
   - Custom service addition
   - Docker Swarm support
   - Kubernetes deployment
   - Cloud provider integration

3. **Monitoring Integration**
   - Real-time resource monitoring
   - Performance metrics
   - Alert configuration
   - Log aggregation setup

4. **Backup and Restore**
   - Configuration backup
   - Data backup scheduling
   - One-click restore
   - Migration tools
