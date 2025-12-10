# Kasia App Rustup and WASM Target Fix

## Issue

After fixing the PATH issue, the Kasia build was still failing with exit code 1 during `npm run wasm:build`:

```
[BUILD] Building kasia-app... (kasia-app)
❌ ERROR: Failed to build some services
  - kasia-app: Command failed
failed to solve: process "/bin/sh -c npm run wasm:build" did not complete successfully: exit code: 1
```

**Root Cause**: Alpine Linux's `rust` and `cargo` packages don't include:
1. `rustup` - The Rust toolchain manager
2. `wasm32-unknown-unknown` target - Required for WebAssembly compilation

The WASM build was failing because the Rust compiler couldn't target WebAssembly.

## Solution

Replaced Alpine's rust/cargo packages with a proper rustup installation:

1. **Install rustup** instead of Alpine's rust package
2. **Add wasm32 target** explicitly using `rustup target add wasm32-unknown-unknown`
3. **Install wasm-pack** after rustup is configured

## Changes Made

### File: `services/kasia/Dockerfile`

**Before**:
```dockerfile
# Install build dependencies including Rust for WASM compilation
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    bash \
    rust \
    cargo

# ...

# Install wasm-pack for WASM compilation
# Add Cargo bin to PATH so wasm-pack is available
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack
```

**After**:
```dockerfile
# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    bash

# Install Rust via rustup (needed for wasm32 target support)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# ...

# Install wasm-pack and wasm32 target for WASM compilation
RUN rustup target add wasm32-unknown-unknown && \
    cargo install wasm-pack
```

## Why This Fix Works

1. **rustup vs apk rust**:
   - Alpine's `rust` package is a minimal installation
   - `rustup` is the official Rust toolchain manager with full target support
   - `rustup` allows adding compilation targets like `wasm32-unknown-unknown`

2. **wasm32-unknown-unknown target**:
   - This is the Rust target for WebAssembly compilation
   - Required for `wasm-pack` to compile Rust code to WASM
   - Not included by default in any Rust installation

3. **Build order**:
   - Install rustup first
   - Set PATH to include Cargo binaries
   - Add wasm32 target
   - Install wasm-pack
   - Now `npm run wasm:build` can successfully compile WASM modules

## Testing

This fix should be tested by:

1. Rebuild the test release package with the updated Dockerfile
2. Extract in a clean directory
3. Run `./start-test.sh`
4. Select "Kaspa User Applications" profile
5. Verify the Kasia app builds successfully (no exit code 1)
6. Access http://localhost:3001 to confirm the app works

## Related Files

- `services/kasia/Dockerfile` - Main fix location
- `KNOWN_ISSUES.md` - Will need update after successful test

## Timeline

- **Issue 1**: Kasia building from unstable master branch → Fixed with v0.6.2
- **Issue 2**: wasm-pack command not found (exit code 127) → Fixed with PATH
- **Issue 3**: WASM build failing (exit code 1) → Fixed with rustup + wasm32 target

## Impact

- ✅ Proper Rust toolchain with rustup
- ✅ wasm32-unknown-unknown target available
- ✅ wasm-pack can compile Rust to WebAssembly
- ✅ Kasia app should build successfully
- ⚠️ Slightly longer build time due to rustup installation (~30 seconds extra)

## Build Time Impact

The rustup installation adds approximately 30-60 seconds to the Docker build:
- Downloading rustup: ~5-10 seconds
- Installing Rust stable: ~20-30 seconds
- Adding wasm32 target: ~5-10 seconds
- Installing wasm-pack: ~60-90 seconds (unchanged)

Total Kasia build time: ~3-4 minutes (was ~2-3 minutes with Alpine rust)

This is acceptable for a one-time build during installation.

## Next Steps

1. Test the build with this fix
2. If successful, update KNOWN_ISSUES.md to mark as fully resolved
3. Rebuild and redistribute test release package
4. Continue with test release validation
