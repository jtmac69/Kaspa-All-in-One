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
│  │  - Profile Selection                                    │ │
│  │  - Configuration Forms                                  │ │
│  │  - Progress Tracking                                    │ │
│  │  - Validation Display                                   │ │
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
│  │  - /ws/wizard/progress (WebSocket)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Installation Engine                                    │ │
│  │  - System Requirements Checker                         │ │
│  │  - Docker Compose Manager                              │ │
│  │  - Configuration Generator                             │ │
│  │  - Service Health Monitor                              │ │
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
}

interface ProfileSelection {
  profiles: Profile[];
  selectedProfiles: string[];
  conflicts: string[];
  totalResources: ResourceRequirements;
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
  category: string;
}

interface InstallationConfig {
  profiles: string[];
  environment: Record<string, string>;
  network: NetworkConfig;
  advanced: AdvancedConfig;
}
```

#### 5. Installation Progress Component
**Purpose**: Real-time installation progress display

**Interface**:
```typescript
interface InstallationProgress {
  phase: 'preparing' | 'building' | 'starting' | 'validating' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  logs: LogEntry[];
  services: ServiceStatus[];
  estimatedTimeRemaining: number;
}

interface ServiceStatus {
  name: string;
  status: 'pending' | 'building' | 'starting' | 'healthy' | 'unhealthy' | 'error';
  message: string;
  url?: string;
}
```

#### 6. Validation Results Component
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
  }[];
  
  dependencies: string[];
  conflicts: string[];
  
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
  };
  
  documentation: {
    setupGuide: string;
    troubleshooting: string;
  };
}
```

## User Interface Design

### Wizard Steps

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
- Tabbed interface (Basic, Network, Advanced)
- Form fields with validation
- Password generator for secure fields
- Configuration preview (generated .env)
- Import/Export configuration

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
- Service health check results
- Access URLs for each service
- Quick action buttons (View Dashboard, View Logs)
- Troubleshooting links for failed services

#### Step 8: Complete
- Success message
- Service access information
- Next steps guide
- Links to documentation
- "Go to Dashboard" button

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

## Testing Strategy

### Unit Tests
- Component rendering
- State management
- Form validation
- API client functions
- Configuration generation

### Integration Tests
- API endpoint responses
- WebSocket communication
- Docker API integration
- File system operations
- Configuration persistence

### End-to-End Tests
- Complete wizard flow
- Profile selection and installation
- Error handling and recovery
- Multi-browser compatibility
- Responsive design validation

### Performance Tests
- Page load time (<2 seconds)
- API response time (<500ms)
- WebSocket latency (<100ms)
- Installation progress updates (real-time)

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

## Deployment

### Standalone Mode
- Wizard runs on port 3000 before main installation
- Accessible via http://localhost:3000/wizard
- Automatically starts on first run
- Redirects to dashboard after completion

### Integrated Mode
- Wizard accessible from dashboard
- Can re-run for reconfiguration
- Preserves existing configuration
- Backup before changes

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
