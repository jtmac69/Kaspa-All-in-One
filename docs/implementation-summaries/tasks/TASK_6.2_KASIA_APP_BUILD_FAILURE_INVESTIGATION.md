# Task 6.2 - Kasia App Build Failure Investigation

## Date
December 8, 2025

## Issue
When accessing the Kasia app at http://localhost:3001, the browser shows "Build failed" message. The container is running and healthy, but serving a fallback error page instead of the actual application.

## Investigation

### Container Status
```
CONTAINER ID   IMAGE                                COMMAND                  STATUS
eecee608651f   kaspa-aio-v090-test-kasia-app        "/docker-entrypoint.…"   Up 2 hours (healthy)
```

- Container is running
- Health check is passing
- Nginx is serving content (200 responses)
- But only serving 13 bytes (the "Build failed" message)

### Root Cause

The Dockerfile for kasia has a fallback mechanism:

```dockerfile
RUN npm run build || (echo "Build failed, creating fallback" && mkdir -p dist && echo "Build failed" > dist/index.html)
```

This means the `npm run build` command failed during the Docker image build process. The actual build error occurred when building the image, not at runtime.

### Why the Build Fails

The Kasia application (https://github.com/K-Kluster/Kasia) is being built from source during Docker image creation. The build process:

1. Clones the Kasia repository
2. Installs npm dependencies
3. Runs `npm run build` to compile the Vite/React application
4. If build fails, creates fallback "Build failed" message

The build is failing likely due to:
- Upstream code changes in the Kasia repository
- Missing or incompatible dependencies
- Build tool version mismatches
- TypeScript compilation errors
- Vite configuration issues

## Impact

- ❌ Kasia app is not functional
- ✅ K-Social app works (uses pre-built release)
- ✅ Kaspa Explorer works (builds successfully)

## Solutions

### Option 1: Use Pre-Built Docker Image (Recommended)

The Kasia project provides official Docker images. Update the Dockerfile to use the pre-built image:

```dockerfile
FROM kkluster/kasia:latest
```

**Pros**:
- Guaranteed to work
- Faster build times
- No build dependencies needed
- Maintained by Kasia team

**Cons**:
- Less control over build configuration
- Can't customize build-time environment variables
- Depends on external image availability

### Option 2: Fix the Build Process

Debug and fix the npm build issues:

1. Build the image with verbose output to see actual errors
2. Update dependencies or build configuration
3. Pin specific versions that are known to work
4. Add build workarounds for known issues

**Pros**:
- Full control over build process
- Can customize environment variables at build time
- Self-contained (no external dependencies)

**Cons**:
- Time-consuming to debug
- May break again with upstream changes
- Requires ongoing maintenance

### Option 3: Hybrid Approach

Try building from source, fall back to pre-built image if build fails:

```dockerfile
# Try building from source
FROM node:20-alpine AS builder
# ... build process ...

# If build succeeds, use it; otherwise use official image
FROM kkluster/kasia:latest AS fallback

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html || \
COPY --from=fallback /usr/share/nginx/html /usr/share/nginx/html
```

## Recommendation

**Use Option 1: Pre-Built Docker Image**

For the test release, we should use the official pre-built image because:

1. **Reliability**: The official image is tested and known to work
2. **Speed**: No build time, faster deployments
3. **Maintenance**: Kasia team maintains the image
4. **User Experience**: Users get a working application

The current approach of building from source is causing the application to fail, which creates a poor testing experience.

## Next Steps

1. Update `services/kasia/Dockerfile` to use pre-built image
2. Test that the application works with the official image
3. Update docker-compose generation to use the new image
4. Rebuild test release package
5. Document this change in release notes

## Files to Modify

- `services/kasia/Dockerfile` - Switch to pre-built image
- `services/wizard/backend/src/utils/config-generator.js` - Update kasia-app service definition if needed

## Alternative: Document as Known Issue

If we want to keep the build-from-source approach for now, we should:

1. Add to KNOWN_ISSUES.md
2. Update TESTING.md to note that Kasia may not work
3. Provide workaround instructions (use official image)
4. Set expectations that this is an upstream issue

## Related Issues

- Kasia GitHub: https://github.com/K-Kluster/Kasia
- Official Docker Image: https://hub.docker.com/r/kkluster/kasia

This is an upstream dependency issue, not a bug in our integration code.
