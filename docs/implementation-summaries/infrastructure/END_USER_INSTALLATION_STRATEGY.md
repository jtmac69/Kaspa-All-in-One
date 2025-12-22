# End-User Installation Strategy

## Overview

This document outlines the recommended approach for handling Node.js dependencies in end-user installations of the Kaspa All-in-One system, addressing the challenge of requiring users to manually install npm packages.

## Current Dependency Situation

### Wizard Backend Dependencies
- **Production**: 8 packages (express, cors, dockerode, dotenv, express-rate-limit, helmet, joi, socket.io)
- **Development**: 2 packages (axios, nodemon)
- **Node.js Requirement**: >=18.0.0

### Dashboard Dependencies
- **Production**: 10 packages (express, axios, ws, cors, express-rate-limit, helmet, joi, express-validator, dompurify, jsdom, compression)
- **Development**: 3 packages (nodemon, jest, supertest)
- **Node.js Requirement**: >=18.0.0

## Recommended Solution: Self-Contained Docker Approach

### Primary Approach: Docker-Only Installation
**Status**: ✅ Recommended for implementation

**Benefits**:
- Zero external dependencies for end users
- Consistent environment across all platforms
- No Node.js installation required on host
- Eliminates npm/yarn version conflicts
- Simplest user experience

**Implementation**:
1. Pre-build Docker images with all Node.js dependencies installed
2. Bundle images in release packages
3. Installation script loads pre-built images
4. Users only need Docker and Docker Compose

**User Experience**:
```bash
# Single command installation
curl -sSL https://releases.kaspa.org/install.sh | bash

# Or download and run
wget https://releases.kaspa.org/kaspa-aio-v1.0.0.tar.gz
tar -xzf kaspa-aio-v1.0.0.tar.gz
cd kaspa-aio-v1.0.0
./install.sh
```

### Fallback Approach: Automated Dependency Installation
**Status**: 🔄 Fallback option when Docker unavailable

**Implementation**:
1. Detect if Docker is available
2. If not available, check for Node.js >=18
3. If Node.js missing, offer to install it
4. Run `npm install` for wizard and dashboard
5. Start services using Node.js directly

## Implementation Plan

### Phase 1: Docker Image Optimization
- [ ] Create multi-stage Docker builds for wizard and dashboard
- [ ] Minimize image sizes using Alpine Linux base
- [ ] Pre-install all npm dependencies in build stage
- [ ] Test images work without external npm install

### Phase 2: Installation Script Enhancement
- [ ] Detect Docker availability and version
- [ ] Implement Docker image loading from bundled files
- [ ] Add fallback to Node.js + npm installation
- [ ] Create progress indicators and error handling

### Phase 3: Package Creation
- [ ] Bundle Docker images in release packages
- [ ] Create platform-specific installation scripts
- [ ] Generate checksums for all bundled components
- [ ] Test offline installation scenarios

### Phase 4: User Experience Polish
- [ ] Create single-command installation option
- [ ] Add interactive configuration during setup
- [ ] Implement installation validation and health checks
- [ ] Create comprehensive troubleshooting documentation

## Alternative Approaches Considered

### Option 1: Bundled Node.js Runtime
**Status**: ❌ Not recommended

**Pros**: No Docker dependency
**Cons**: 
- Large package sizes (100MB+ per platform)
- Platform-specific builds required
- Complex packaging with tools like `pkg` or `nexe`
- Still requires managing Node.js versions

### Option 2: System Node.js + Automated npm install
**Status**: ⚠️ Fallback only

**Pros**: Smaller package size
**Cons**:
- Requires internet during installation
- Vulnerable to npm registry issues
- Node.js version compatibility problems
- Slower installation process

### Option 3: Static Binary Compilation
**Status**: ❌ Not feasible

**Cons**:
- Express.js and dependencies not suitable for static compilation
- Would require major architecture changes
- Loss of flexibility and extensibility

## Technical Implementation Details

### Docker Image Structure
```dockerfile
# Multi-stage build for wizard
FROM node:18-alpine AS wizard-builder
WORKDIR /app
COPY services/wizard/backend/package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS wizard-runtime
WORKDIR /app
COPY --from=wizard-builder /app/node_modules ./node_modules
COPY services/wizard/backend ./
EXPOSE 3001
CMD ["node", "src/server.js"]
```

### Installation Script Logic
```bash
#!/bin/bash
# Detect installation method
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "✓ Docker detected - using containerized installation"
    install_with_docker
elif command -v node &> /dev/null && node --version | grep -q "v1[89]"; then
    echo "✓ Node.js 18+ detected - using native installation"
    install_with_nodejs
else
    echo "⚠ Installing Docker for optimal experience"
    install_docker_and_proceed
fi
```

### Package Structure
```
kaspa-aio-v1.0.0/
├── install.sh                 # Main installation script
├── docker-images/            # Pre-built Docker images
│   ├── kaspa-wizard.tar      # Wizard backend image
│   ├── kaspa-dashboard.tar   # Dashboard image
│   └── checksums.txt         # Image checksums
├── scripts/                  # Installation utilities
│   ├── docker-install.sh     # Docker installation
│   ├── nodejs-install.sh     # Node.js fallback
│   └── validate.sh           # Post-install validation
├── config/                   # Default configurations
│   ├── docker-compose.yml    # Service definitions
│   └── .env.example          # Environment template
└── docs/                     # Installation documentation
    ├── INSTALL.md            # Installation guide
    ├── TROUBLESHOOTING.md    # Common issues
    └── OFFLINE.md            # Offline installation
```

## Benefits of This Approach

### For End Users
- **Zero Dependencies**: Only Docker required (which most users already have)
- **One-Command Install**: Simple `curl | bash` installation
- **Offline Support**: All dependencies bundled in package
- **Cross-Platform**: Works identically on Linux, macOS, Windows
- **No Version Conflicts**: Isolated environment prevents conflicts

### For Developers
- **Consistent Environment**: Same runtime everywhere
- **Easier Support**: Fewer variables in user environments
- **Faster Releases**: No need to test multiple Node.js versions
- **Better Security**: Controlled dependency versions

### For Operations
- **Predictable Deployments**: Known working configurations
- **Easier Troubleshooting**: Standardized environment
- **Better Monitoring**: Container-based metrics
- **Simpler Updates**: Replace entire containers vs. dependency management

## Implementation Timeline

### Week 1: Docker Optimization
- Optimize Docker images for size and security
- Implement multi-stage builds
- Test image functionality

### Week 2: Installation Scripts
- Create smart installation detection
- Implement Docker and Node.js fallback paths
- Add comprehensive error handling

### Week 3: Package Integration
- Integrate with release management system
- Create bundled package format
- Test offline installation scenarios

### Week 4: Testing and Documentation
- End-to-end testing on clean systems
- Create user documentation
- Performance and security validation

## Success Criteria

- [ ] End users can install with single command
- [ ] Installation works without internet (offline mode)
- [ ] No manual Node.js or npm commands required
- [ ] Installation completes in under 5 minutes
- [ ] Works on Linux, macOS, and Windows
- [ ] Comprehensive error messages and recovery options
- [ ] Package size under 500MB
- [ ] Installation success rate >95% in testing

## Conclusion

The Docker-based approach provides the best balance of user experience, reliability, and maintainability. By bundling all dependencies in pre-built Docker images, we eliminate the complexity of Node.js dependency management for end users while maintaining flexibility for developers.

This approach aligns with modern deployment practices and provides a foundation for future enhancements like automatic updates and service orchestration.