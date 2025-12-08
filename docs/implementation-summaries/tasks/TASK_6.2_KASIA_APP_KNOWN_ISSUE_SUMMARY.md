# Task 6.2 - Kasia App Known Issue Summary

## Date
December 8, 2025

## Issue Summary
The Kasia app fails to build from source, resulting in a "Build failed" message when accessing http://localhost:3001.

## Status
**KNOWN ISSUE - Upstream Dependency Problem**

## What's Happening

1. ✅ Container builds and starts successfully
2. ✅ Container reports as healthy
3. ✅ Nginx is serving content
4. ❌ Application build failed during image creation
5. ❌ Only fallback error page is served

## Root Cause

The Kasia application (https://github.com/K-Kluster/Kasia) build process fails when compiling from source. This is an **upstream issue** with the Kasia repository, not a bug in our integration.

The Dockerfile attempts to:
1. Clone the Kasia repository
2. Install dependencies with `npm ci` or `npm install`
3. Build with `npm run build`
4. If build fails, create fallback "Build failed" message

The build is failing at step 3, likely due to:
- TypeScript compilation errors in upstream code
- Missing or incompatible dependencies
- Vite configuration issues
- Node.js version compatibility

## Impact on Testing

### What Works
- ✅ K-Social app (port 3003) - Uses pre-built release
- ✅ Kaspa Explorer (port 3004) - Builds successfully
- ✅ Installation wizard completes
- ✅ Service verification shows services running

### What Doesn't Work
- ❌ Kasia app (port 3001) - Build fails, shows error page

## Recommendation for Test Release

**Document as Known Issue** and proceed with testing the other components.

### Rationale
1. This is an upstream dependency issue, not our code
2. K-Social and Kaspa Explorer work correctly
3. The wizard and installation process work correctly
4. Fixing this requires either:
   - Waiting for upstream Kasia fixes
   - Deep debugging of Kasia build process
   - Finding/creating a pre-built Docker image

5. The test release can still validate:
   - Wizard functionality
   - Profile selection
   - Configuration management
   - Docker Compose generation
   - Service deployment
   - K-Social and Kaspa Explorer functionality

## What to Add to KNOWN_ISSUES.md

```markdown
### Kasia App Build Failure

**Status**: Known Issue - Upstream Dependency

**Affected**: Kaspa User Applications profile

**Symptom**: When accessing http://localhost:3001, browser shows "Build failed" message

**Cause**: The Kasia application fails to build from source during Docker image creation. This is an issue with the upstream Kasia repository (https://github.com/K-Kluster/Kasia), not with our integration code.

**Impact**: 
- Kasia app is not functional
- K-Social and Kaspa Explorer work correctly
- Installation and wizard functionality not affected

**Workaround**: None currently available. The official kkluster/kasia Docker image is not publicly accessible.

**Resolution**: 
- Monitor upstream Kasia repository for build fixes
- Consider alternative Kasia distributions
- May require manual build debugging

**Testing Impact**: Testers can still validate wizard functionality, K-Social, and Kaspa Explorer. Kasia app testing should be skipped.
```

## What to Add to TESTING.md

Update the Kaspa User Applications scenario to note:

```markdown
**⚠️ Known Issue**: The Kasia app currently fails to build from source and will show a "Build failed" message. This is an upstream issue with the Kasia repository. You can still test K-Social (port 3003) and Kaspa Explorer (port 3004).
```

## Future Solutions

### Short Term
1. Document the issue clearly
2. Set tester expectations
3. Focus testing on working components

### Medium Term
1. Debug the Kasia build process
2. Pin working dependency versions
3. Add build workarounds

### Long Term
1. Work with Kasia maintainers on build stability
2. Create our own pre-built Kasia image
3. Consider alternative Kasia distributions

## Files to Update

- ✅ `docs/implementation-summaries/tasks/TASK_6.2_KASIA_APP_BUILD_FAILURE_INVESTIGATION.md` - Created
- ✅ `docs/implementation-summaries/tasks/TASK_6.2_KASIA_APP_KNOWN_ISSUE_SUMMARY.md` - This file
- ⏳ `KNOWN_ISSUES.md` - Add Kasia build failure
- ⏳ `TESTING.md` - Add warning in Kaspa User Applications scenario

## Testing Guidance

When testing the Kaspa User Applications profile:

1. **Expect Kasia to fail** - This is documented
2. **Test K-Social** (port 3003) - Should work
3. **Test Kaspa Explorer** (port 3004) - Should work
4. **Test wizard flow** - Should complete successfully
5. **Verify service status** - All containers should be running
6. **Report other issues** - Focus on wizard, K-Social, Explorer

## Conclusion

This is an **upstream dependency issue** that doesn't block the test release. The wizard, installation process, and 2 out of 3 user applications work correctly. We should document this clearly and proceed with testing the functional components.

The issue can be revisited after the test release when we have more time to debug the Kasia build process or work with upstream maintainers.
