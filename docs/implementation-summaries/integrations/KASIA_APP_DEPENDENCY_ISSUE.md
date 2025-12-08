# Kasia App Dependency Issue - kaspa-wasm Missing

## Date
December 8, 2025

## Issue Summary

The Kasia application build continues to fail in the test release due to a missing `kaspa-wasm` dependency in the upstream Kasia v0.6.2 repository. This is an **upstream issue** that cannot be resolved in our repository.

## Error Details

### Build Failure
```
error TS2307: Cannot find module 'kaspa-wasm' or its corresponding type declarations.
```

### Affected Files (45+ TypeScript files)
The error appears in numerous files throughout the Kasia codebase:
- `src/components/MessagesPane/Utilities/Content/HandshakeResponse.tsx`
- `src/components/Modals/NewChatForm.tsx`
- `src/service/account-service.ts`
- `src/service/wallet-storage-service.ts`
- `src/store/wallet.store.ts`
- And 40+ more files...

### Build Process
1. ✅ Rust/Cargo installation - Success
2. ✅ wasm-pack installation - Success
3. ✅ npm dependencies installation - Success
4. ✅ WASM cipher module build - Success (`npm run wasm:build`)
5. ❌ TypeScript compilation - **FAILS** (missing kaspa-wasm)
6. ❌ Vite build - Never reached

## Root Cause Analysis

### The Problem
The Kasia v0.6.2 release has TypeScript code that imports `kaspa-wasm`:
```typescript
import { ... } from 'kaspa-wasm';
```

However, `kaspa-wasm` is not:
- Listed in `package.json` dependencies
- Included in the repository
- Built as part of the build process
- Available from npm registry

### Why This Happens
The Kasia repository appears to expect `kaspa-wasm` to be available from the Kaspa core project, but:
- There's no mechanism to build or install it
- The dependency relationship is not properly configured
- The v0.6.2 release was likely not tested in a clean Docker environment

## Previous Fix Attempts

### Attempt 1: Switch to Stable Release ✅ (Partial)
- **Action**: Changed from `master` branch to `v0.6.2` release tag
- **Result**: Eliminated master branch instability, but dependency issue remains
- **File**: `services/kasia/Dockerfile`

### Attempt 2: Fix wasm-pack PATH ✅ (Successful)
- **Action**: Added Cargo bin directory to PATH
- **Result**: wasm-pack now accessible, cipher WASM builds successfully
- **File**: `services/kasia/Dockerfile`
- **Change**: `ENV PATH="/root/.cargo/bin:${PATH}"`

### Attempt 3: Build from Source ❌ (Current State)
- **Action**: Building Kasia from source in Docker
- **Result**: Fails at TypeScript compilation due to missing kaspa-wasm
- **Blocker**: Cannot proceed without kaspa-wasm dependency

## Why We Can't Fix This

This is an **upstream issue** that requires changes to the Kasia repository:

1. **Not Our Code**: The Kasia application code is from https://github.com/K-Kluster/Kasia
2. **Missing Dependency**: `kaspa-wasm` needs to be added to the Kasia repository
3. **Build Process**: The Kasia build process needs to include kaspa-wasm compilation
4. **No Docker Image**: No official Docker image exists to use as alternative

### What Would Be Needed
To fix this properly, the Kasia team would need to:
1. Add `kaspa-wasm` as a git submodule or npm dependency
2. Update build scripts to compile kaspa-wasm before TypeScript compilation
3. Publish an official Docker image, OR
4. Release a new version (v0.6.3+) with fixed dependencies

## Impact Assessment

### Services Affected
- ❌ **Kasia App (port 3001)**: Build fails, service unavailable
- ✅ **K-Social (port 3003)**: Works correctly
- ✅ **Kaspa Explorer (port 3004)**: Works correctly
- ✅ **Kaspa Node**: Works correctly
- ✅ **Indexers**: Work correctly

### Profiles Affected
- ⚠️ **Kaspa User Applications**: Partially functional (Kasia unavailable, others work)
- ⚠️ **Development Profile**: Partially functional (Kasia unavailable, others work)
- ✅ **Core Profile**: Not affected (doesn't include Kasia)
- ✅ **Kaspa Node Only**: Not affected (doesn't include Kasia)
- ✅ **Explorer Profile**: Not affected (doesn't include Kasia)

### Testing Impact
- Testers can still test all other services
- K-Social provides similar messaging functionality
- Most test scenarios remain valid
- Only Kasia-specific testing is blocked

## Current Workarounds

### For Testers
1. **Skip Kasia**: Focus testing on other services
2. **Use K-Social**: Alternative messaging application (port 3003)
3. **Test Other Profiles**: Core, Explorer, Node profiles work fully
4. **Document Experience**: Report if Kasia absence affects workflow

### For Users
1. **Choose Profiles Without Kasia**: Select profiles that don't include Kasia
2. **Use K-Social Instead**: Provides similar messaging functionality
3. **Wait for Upstream Fix**: Monitor Kasia repository for updates

## Documentation Updates

### Files Updated
1. ✅ `KNOWN_ISSUES.md` - Updated Kasia section to reflect current state
2. ✅ `docs/implementation-summaries/integrations/KASIA_APP_DEPENDENCY_ISSUE.md` - This document

### Key Changes
- Removed "FIXED" status from Kasia issue
- Changed severity back to "High"
- Added "UPSTREAM ISSUE" status
- Documented root cause clearly
- Provided workarounds for testers
- Set realistic expectations

## Resolution Path

### Short Term (This Release)
- ✅ Document issue clearly in KNOWN_ISSUES.md
- ✅ Update test expectations in TESTING.md
- ✅ Provide workarounds for testers
- ⏳ Consider removing Kasia from default profiles

### Medium Term (Future Releases)
- Monitor Kasia repository for updates
- Test new Kasia releases when available
- Consider contributing fix to upstream if possible
- Evaluate alternative messaging applications

### Long Term (Production)
- Wait for official Kasia Docker image
- Or wait for Kasia v0.6.3+ with fixed dependencies
- Or replace with alternative messaging solution
- Or make Kasia optional/experimental

## Recommendations

### For Test Release v0.9.0
1. **Keep Current Approach**: Document as known limitation
2. **Update Test Scenarios**: Remove Kasia-specific tests
3. **Focus on Working Services**: K-Social, Explorer, Node, Indexers
4. **Set Expectations**: Clearly communicate Kasia unavailability

### For Future Releases
1. **Monitor Upstream**: Watch for Kasia repository updates
2. **Consider Alternatives**: Evaluate other messaging applications
3. **Make Optional**: Consider making Kasia an optional component
4. **Contribute Upstream**: Consider helping fix the Kasia dependency issue

## Technical Details

### Build Log Analysis
```
#14 64.55     Finished `release` profile [optimized] target(s) in 56.98s
#14 64.59 [INFO]: Installing wasm-bindgen...
#14 67.92 [INFO]: Optimizing wasm binaries with `wasm-opt`...
#14 71.21 [INFO]: :-) Done in 1m 03s
#14 71.21 [INFO]: :-) Your wasm pkg is ready to publish at /app/cipher-wasm.
```
✅ WASM cipher build succeeds

```
#15 4.996 src/components/MessagesPane/Utilities/Content/HandshakeResponse.tsx(4,30): error TS2307: Cannot find module 'kaspa-wasm' or its corresponding type declarations.
#15 4.997 src/components/Modals/NewChatForm.tsx(10,30): error TS2307: Cannot find module 'kaspa-wasm' or its corresponding type declarations.
[... 43 more similar errors ...]
#15 5.286 Command execution failed: Command failed: tsc -b && vite build
```
❌ TypeScript compilation fails

### Dockerfile Current State
```dockerfile
# Install Rust and wasm-pack
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup target add wasm32-unknown-unknown && \
    cargo install wasm-pack

# Build WASM modules (cipher builds successfully)
RUN npm run wasm:build

# Build application (fails here due to missing kaspa-wasm)
RUN npm run build:production
```

## Conclusion

The Kasia app build failure is a legitimate **upstream dependency issue** that cannot be resolved in our repository. The Kasia v0.6.2 release has incomplete dependencies and requires `kaspa-wasm` which is not available in the build context.

**This is not a bug in our test release** - it's a limitation of the upstream Kasia repository.

**Recommendation**: Document clearly, provide workarounds, and wait for upstream fix or consider alternatives.

## Related Files
- `services/kasia/Dockerfile` - Build configuration
- `KNOWN_ISSUES.md` - User-facing documentation
- `docs/implementation-summaries/integrations/KASIA_APP_BUILD_ANALYSIS.md` - Previous analysis
- `docs/implementation-summaries/integrations/KASIA_APP_BUILD_FAILURE_FIX.md` - Previous fix attempt
- `docs/implementation-summaries/integrations/KASIA_APP_WASM_PACK_PATH_FIX.md` - PATH fix

## References
- Kasia Repository: https://github.com/K-Kluster/Kasia
- Kasia v0.6.2 Release: https://github.com/K-Kluster/Kasia/releases/tag/v0.6.2
- Kaspa Core: https://github.com/kaspanet/rusty-kaspa
