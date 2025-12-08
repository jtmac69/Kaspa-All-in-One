# Kasia App Build Analysis and Solution

## Date
December 8, 2025

## Problem Statement
The Kasia application fails to build from source during Docker image creation, resulting in a "Build failed" error page when users access http://localhost:3001.

## Investigation Summary

### Attempted Solutions

#### 1. Official Docker Image (FAILED)
**Attempt**: Use pre-built `kkluster/kasia:latest` from Docker Hub
**Result**: Image does not exist
```bash
$ docker pull kkluster/kasia:latest
Error: repository does not exist or may require 'docker login'
```

#### 2. Build from Master Branch (FAILED)
**Attempt**: Build from latest `master` branch
**Result**: Build failures due to unstable code
- TypeScript compilation errors
- Dependency mismatches
- Vite configuration issues

#### 3. Build from Stable Release v0.6.2 (PARTIALLY SUCCESSFUL)
**Attempt**: Build from release tag v0.6.2
**Result**: Requires complex WASM build dependencies

**Issues Encountered**:
1. Missing `kaspa-wasm` module - requires Rust/Cargo compilation
2. Missing `cipher` module - requires WASM build
3. Complex build chain: Rust → WASM → TypeScript → Vite
4. Build script is `build:production` not `build`
5. Requires wasm-pack and Rust toolchain

**Build Requirements**:
```dockerfile
# Required dependencies
- Node.js 20+
- Rust/Cargo
- wasm-pack
- Python 3
- make, g++
- git

# Build steps required
1. npm install
2. npm run wasm:build  # Builds cipher WASM module
3. npm run build:production  # Builds main application
```

## Root Cause Analysis

The Kasia application has a complex build process that includes:

1. **WASM Compilation**: The `cipher` directory contains Rust code that must be compiled to WebAssembly
2. **kaspa-wasm Dependency**: Requires the kaspa-wasm library which is also WASM-based
3. **Multi-stage Build**: WASM → TypeScript → Vite build pipeline
4. **Build Tool Requirements**: Requires Rust toolchain, wasm-pack, and Node.js build tools

This complexity makes it difficult to build reliably in a Docker environment, especially when:
- Rust/WASM compilation can fail due to version mismatches
- Build times are long (5-10 minutes)
- Build dependencies are large (adds ~500MB to image)
- Upstream changes can break the build chain

## Recommended Solution

### Option A: Use Pre-Built Release Assets (RECOMMENDED)

If Kasia provides pre-built release assets (dist files), use those:

```dockerfile
FROM nginx:alpine

# Download pre-built release
ADD https://github.com/K-Kluster/Kasia/releases/download/v0.6.2/kasia-v0.6.2-dist.tar.gz /tmp/
RUN tar -xzf /tmp/kasia-v0.6.2-dist.tar.gz -C /usr/share/nginx/html

# Configure nginx...
```

**Status**: Need to check if release assets are available

### Option B: Build with Full WASM Support (COMPLEX)

Build from source with all dependencies:

```dockerfile
FROM node:20-alpine AS builder

# Install ALL build dependencies including Rust
RUN apk add --no-cache \
    git python3 make g++ curl bash \
    rust cargo

# Install wasm-pack
RUN cargo install wasm-pack

# Clone and build
RUN git clone --depth 1 --branch v0.6.2 https://github.com/K-Kluster/Kasia.git .
RUN npm install
RUN npm run wasm:build
RUN npm run build:production

# Production stage with nginx...
```

**Pros**: Self-contained, reproducible
**Cons**: Complex, slow builds (10+ minutes), large image, can break

### Option C: Document as Known Limitation (PRAGMATIC)

Document that Kasia app requires manual setup:

1. Mark as "Advanced" or "Optional" in wizard
2. Provide manual build instructions
3. Focus testing on K-Social and Kaspa Explorer (which work)
4. Note in KNOWN_ISSUES.md

**Pros**: Honest about limitations, focuses on what works
**Cons**: Kasia app not available out-of-box

## Decision

For the test release (v0.9.0), we recommend **Option C** with a path to **Option B**:

1. **Short term** (test release): Document as known limitation
   - Update KNOWN_ISSUES.md with detailed explanation
   - Mark Kasia as optional/advanced in wizard
   - Provide manual build instructions for advanced users
   - Focus testing on K-Social and Kaspa Explorer

2. **Medium term** (v1.0): Implement full WASM build
   - Create comprehensive Dockerfile with all dependencies
   - Test build process thoroughly
   - Document build time expectations
   - Provide pre-built images if possible

3. **Long term**: Request upstream improvements
   - Ask Kasia team to provide official Docker images
   - Request pre-built release assets (dist files)
   - Suggest simplified build process

## Implementation for Test Release

### 1. Update KNOWN_ISSUES.md

```markdown
### Kasia App Build Complexity

**Issue**: Kasia application requires complex WASM build process

**Severity**: Medium

**Impact**:
- Kasia app not available in default installation
- Requires manual build with Rust/WASM toolchain
- Build time: 10-15 minutes
- K-Social and Kaspa Explorer work correctly

**Workaround**:
- Test K-Social (port 3003) and Kaspa Explorer (port 3004) instead
- Advanced users can build manually (see services/kasia/README.md)
- Will be improved in v1.0 release

**Status**: Known Limitation - Complex upstream build requirements
```

### 2. Update services/kasia/README.md

Add detailed manual build instructions for advanced users.

### 3. Update Wizard

Mark Kasia as "Advanced" or show warning about build complexity.

### 4. Focus Testing

Direct testers to K-Social and Kaspa Explorer which work reliably.

## Files to Update

1. `KNOWN_ISSUES.md` - Add detailed explanation
2. `services/kasia/README.md` - Add manual build instructions
3. `services/kasia/Dockerfile` - Add comments explaining complexity
4. `TESTING.md` - Note that Kasia testing is optional
5. Wizard UI - Add warning/note about Kasia complexity

## Conclusion

The Kasia app build failure is due to legitimate technical complexity (WASM compilation requirements), not a simple configuration issue. For the test release, we should:

1. Be honest about the limitation
2. Focus testing on what works (K-Social, Explorer)
3. Provide path for advanced users
4. Plan proper solution for v1.0

This approach:
- Sets realistic expectations
- Doesn't block test release
- Provides value (2 out of 3 user apps work)
- Plans for future improvement

## Next Steps

1. Update documentation as outlined above
2. Test K-Social and Kaspa Explorer thoroughly
3. Create manual build guide for Kasia
4. Consider reaching out to Kasia team for:
   - Official Docker images
   - Pre-built release assets
   - Simplified build process
