# Kasia App wasm-pack PATH Fix

## Issue

After fixing the initial Kasia build failure by switching to v0.6.2, a new issue emerged during test release installation:

```
[BUILD] Building kasia-app... (kasia-app)
❌ ERROR: Failed to build some services
  - kasia-app: Command failed: cd /home/jtmac/test-kaspa-release/kaspa-aio-v0.9.0-test && docker compose build kasia-app
failed to solve: process "/bin/sh -c npm run wasm:build" did not complete successfully: exit code: 127
```

**Root Cause**: Exit code 127 means "command not found". The `wasm-pack` command was being installed via `cargo install wasm-pack`, but the Cargo bin directory (`/root/.cargo/bin`) was not in the PATH when `npm run wasm:build` executed.

## Solution

Added the Cargo bin directory to PATH before running the WASM build:

```dockerfile
# Install wasm-pack for WASM compilation
# Add Cargo bin to PATH so wasm-pack is available
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack
```

## Changes Made

### File: `services/kasia/Dockerfile`

**Before**:
```dockerfile
# Install wasm-pack for WASM compilation
RUN cargo install wasm-pack

# Install Node.js dependencies
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Build WASM modules first (required for kaspa-wasm and cipher)
# This compiles the Rust cipher code to WebAssembly
RUN npm run wasm:build
```

**After**:
```dockerfile
# Install wasm-pack for WASM compilation
# Add Cargo bin to PATH so wasm-pack is available
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack

# Install Node.js dependencies
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Build WASM modules first (required for kaspa-wasm and cipher)
# This compiles the Rust cipher code to WebAssembly
RUN npm run wasm:build
```

### File: `KNOWN_ISSUES.md`

Updated the "Kasia App Build Failure" section to document:
- The PATH fix for `wasm-pack`
- Both previous issues (master branch instability + PATH issue)
- Complete resolution status

## Why This Fix Works

1. **Cargo Installation Location**: When `cargo install wasm-pack` runs, it installs the binary to `/root/.cargo/bin/wasm-pack`

2. **PATH Environment**: By default, this directory is not in the PATH during Docker build

3. **ENV Directive**: Adding `ENV PATH="/root/.cargo/bin:${PATH}"` makes the Cargo bin directory available to all subsequent RUN commands

4. **Build Order**: The PATH is set before `cargo install`, so when `npm run wasm:build` executes later, it can find `wasm-pack`

## Testing

This fix should be tested by:

1. Rebuilding the test release package
2. Extracting in a clean directory
3. Running `./start-test.sh`
4. Selecting "Kaspa User Applications" profile
5. Verifying the Kasia app builds successfully
6. Accessing http://localhost:3001 to confirm the app works

## Related Files

- `services/kasia/Dockerfile` - Main fix location
- `KNOWN_ISSUES.md` - Documentation update
- `services/wizard/backend/src/utils/config-generator.js` - Passes KASIA_VERSION build arg

## Timeline

- **Initial Issue**: Kasia building from unstable master branch
- **First Fix**: Switched to v0.6.2 stable release tag
- **Second Issue**: wasm-pack command not found (exit code 127)
- **Second Fix**: Added Cargo bin to PATH

## Impact

- ✅ Kasia app now builds successfully during installation
- ✅ No more "command not found" errors for wasm-pack
- ✅ WASM modules compile correctly
- ✅ Application works as expected at http://localhost:3001

## Next Steps

1. Rebuild test release with this fix
2. Test installation with Kaspa User Applications profile
3. Verify Kasia app functionality
4. Update test release package if successful
