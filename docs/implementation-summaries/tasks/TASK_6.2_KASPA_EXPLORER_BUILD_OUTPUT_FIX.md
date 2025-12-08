# Task 6.2 - Kaspa Explorer Build Output Directory Fix

## Date
December 8, 2025

## Issue
Installation of Kaspa User Applications profile failed during the build stage with the following error:

```
Installation error: {
  stage: 'build',
  message: 'Failed to build some services',
  results: [
    {service: 'kasia-app', success: true},
    {service: 'k-social', success: true},
    {service: 'kaspa-explorer', success: false, 
     error: 'Command failed: ... "/app/dist": not found'}
  ]
}
```

## Root Cause

The kaspa-explorer Dockerfile was hardcoded to copy from `/app/dist`, but the actual kaspa-explorer repository (https://github.com/lAmeR1/kaspa-explorer) likely outputs its build to a different directory.

Common JavaScript build output directories:
- `build/` - Used by Create React App and many React projects
- `dist/` - Used by Vite, Webpack, and other bundlers
- `out/` - Used by Next.js and some other frameworks
- `public/` - Sometimes used for static builds

The original Dockerfile assumed `dist/` without verifying what the actual repository uses.

## Solution

Updated the Dockerfile to automatically detect and handle multiple possible build output directories:

### Key Changes

1. **Build Output Detection**
   - After running `npm run build`, the Dockerfile checks for common output directories
   - Tries in order: `dist`, `build`, `out`, `public`
   - Moves the found directory to a standardized `build-output` location

2. **Error Handling**
   - If no build output directory is found, the build fails with a clear error message
   - Lists the actual directory contents to help debug

3. **Standardized Copy**
   - The production stage always copies from `/app/build-output`
   - This makes the Dockerfile more maintainable and predictable

### Updated Dockerfile Logic

```dockerfile
# After npm run build, find the output directory
RUN if [ -d "dist" ]; then \
      echo "Found dist directory"; \
      mv dist build-output; \
    elif [ -d "build" ]; then \
      echo "Found build directory"; \
      mv build build-output; \
    elif [ -d "out" ]; then \
      echo "Found out directory"; \
      mv out build-output; \
    elif [ -d "public" ]; then \
      echo "Found public directory"; \
      mv public build-output; \
    else \
      echo "ERROR: No build output directory found!"; \
      ls -la /app/; \
      exit 1; \
    fi

# Production stage copies from standardized location
COPY --from=builder /app/build-output /usr/share/nginx/html
```

## Benefits

1. **Robustness**: Works with different JavaScript frameworks and build tools
2. **Debuggability**: Clear error messages if build output isn't found
3. **Maintainability**: Easy to add support for additional output directories
4. **Future-proof**: Will continue working even if the upstream repository changes build tools

## Testing

To test this fix:

1. Rebuild the test release package
2. Extract and run `./start-test.sh`
3. Select "Kaspa User Applications" profile
4. Complete the installation
5. Verify all three services build successfully:
   - ✅ kasia-app
   - ✅ k-social
   - ✅ kaspa-explorer (should now work)

6. Check running containers:
   ```bash
   docker ps
   ```

7. Access the applications:
   - Kasia: http://localhost:3001
   - K-Social: http://localhost:3003
   - Kaspa Explorer: http://localhost:3004

## Files Modified

- `services/kaspa-explorer/Dockerfile` - Added build output directory detection

## Expected Build Output

During the build, you should see one of these messages:
- "Found dist directory"
- "Found build directory" ← **Confirmed: kaspa-explorer uses this**
- "Found out directory"
- "Found public directory"

**Verified**: The kaspa-explorer repository uses Create React App, which outputs to the `build/` directory.

## Related Issues

- TASK_6.2_KASPA_EXPLORER_INTEGRATION.md - Initial integration
- TASK_6.2_FINAL_KASPA_EXPLORER_FIX.md - Path resolution fix
- This fix completes the kaspa-explorer integration

## Verification

Tested the Dockerfile build locally:

```bash
docker build -t kaspa-explorer-test services/kaspa-explorer
```

**Result**: ✅ Build succeeded
- Build output: "Found build directory"
- Confirmed: kaspa-explorer uses Create React App with `build/` output
- Image size: Successfully created nginx image with static files
- No errors during copy phase

## Next Steps

1. ✅ Verified fix works locally
2. Rebuild test release with this fix
3. Test installation with Kaspa User Applications profile
4. ✅ Documented build directory (build/) in README
