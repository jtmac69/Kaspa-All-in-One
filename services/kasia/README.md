# Kasia Messaging App Integration

This directory contains the integration configuration for the Kasia messaging application within the Kaspa All-in-One project.

## Integration Approach

### 🎯 Building from Stable Release (Current Implementation)

This integration builds Kasia from a specific stable release tag (v0.6.2):

1. **Stable Release**: Uses v0.6.2 release tag from GitHub
2. **Known Working Version**: This release has been tested and verified
3. **Reproducible Builds**: Same version every time
4. **No Upstream Breakage**: Pinned to stable release, not affected by master branch changes

### 🔧 Configuration Options

#### Option 1: Build from Stable Release (Current - Recommended)
```yaml
kasia-app:
  build:
    context: ./services/kasia
    dockerfile: Dockerfile
    args:
      KASIA_VERSION: v0.6.2  # Stable release tag
```

**Why this is the default:**
- ✅ Uses tested, stable release (v0.6.2)
- ✅ Reproducible builds
- ✅ Not affected by upstream master branch changes
- ✅ Known to work correctly
- ✅ Can customize build-time environment variables

**Note:** The official Docker image (`kkluster/kasia:latest`) does not exist on Docker Hub, so we build from source using a stable release tag.

#### Option 2: Build from Different Version (Alternative)
```yaml
kasia-app:
  build:
    context: ./services/kasia
    dockerfile: Dockerfile
    args:
      KASIA_VERSION: v0.7.0  # or any other release tag
```

**Caution:** Building from `master` branch or unreleased versions may fail due to:
- ⚠️ Upstream code changes breaking builds
- ⚠️ Complex WASM build requirements
- ⚠️ Dependency version mismatches
- ⚠️ TypeScript compilation errors

Always use a stable release tag (e.g., v0.6.2) for reliable builds.

## Usage

### Building from Stable Release (Default)
```bash
# Build using default stable release (v0.6.2)
docker build -t kasia-app services/kasia/

# Or use docker-compose (automatically builds)
docker-compose --profile kaspa-user-applications up -d --build

# Build with specific version
docker build --build-arg KASIA_VERSION=v0.6.2 -t kasia-app services/kasia/
```

### Testing the Build
```bash
# Run the built image
docker run -p 3001:3000 kasia-app

# Access in browser
open http://localhost:3001
```

### Environment Configuration
The application is configured via environment variables:

```bash
# Network settings
VITE_DEFAULT_KASPA_NETWORK=mainnet
VITE_ALLOWED_KASPA_NETWORKS=mainnet

# Service connections
VITE_INDEXER_MAINNET_URL=http://kasia-indexer:8080/
VITE_DEFAULT_MAINNET_KASPA_NODE_URL=ws://kaspa-node:17110

# Application settings
VITE_LOG_LEVEL=info
VITE_DISABLE_PASSWORD_REQUIREMENTS=false
```

## Maintenance Strategy

### Keeping Up-to-Date

1. **Check for New Releases**: Monitor the [Kasia releases page](https://github.com/K-Kluster/Kasia/releases)
   ```bash
   # View available releases
   curl -s https://api.github.com/repos/K-Kluster/Kasia/releases | grep tag_name
   ```

2. **Update to New Release**: Change the version in Dockerfile or build args
   ```bash
   # Update to new version
   docker build --build-arg KASIA_VERSION=v0.7.0 -t kasia-app services/kasia/
   
   # Or update in docker-compose.yml and rebuild
   docker-compose --profile kaspa-user-applications up -d --build
   ```

3. **Version Pinning**: Always use specific release tags for stability
   ```dockerfile
   ARG KASIA_VERSION=v0.6.2  # Pin to specific tested version
   ```

### Benefits of Building from Stable Release

✅ **No Code Duplication**: Our repo stays clean  
✅ **Reproducible Builds**: Same version every time  
✅ **Stable**: Not affected by master branch changes  
✅ **Tested**: Release versions are tested by Kasia team  
✅ **Customizable**: Can set build-time environment variables  
✅ **Version Control**: Easy to track which version is deployed  

### Why Not Use Master Branch

The previous approach of building from the `master` branch had these issues:
⚠️ **Build Failures**: Upstream changes broke builds frequently  
⚠️ **Unpredictable**: Master branch changes without notice  
⚠️ **Build Complexity**: WASM and TypeScript compilation issues  
⚠️ **No Stability**: Breaking changes could happen anytime  

Using stable release tags (v0.6.2, v0.7.0, etc.) eliminates these problems.  

## Development Workflow

### For Kasia Development
If you need to modify Kasia itself:

1. Fork the Kasia repository
2. Make your changes in your fork
3. Update the Dockerfile to use your fork:
   ```dockerfile
   RUN git clone https://github.com/YOUR_USERNAME/Kasia.git .
   ```
4. Submit PR to upstream Kasia repository

### For Integration Changes
For changes to the integration (environment, configuration, etc.):

1. Modify files in this directory (`services/kasia/`)
2. Test with `docker-compose build kasia-app`
3. Commit changes to this repository

## Testing

Use the provided test script to validate the integration:

```bash
./test-kasia-app.sh
```

This tests:
- Container health
- Service connectivity
- Environment configuration
- API endpoints

## Troubleshooting

### Build Issues
- Ensure Docker has internet access
- Check if Kasia repository is accessible
- Verify build dependencies are available

### Runtime Issues
- Check environment variable configuration
- Verify service dependencies (indexer, node) are running
- Review container logs: `docker logs kasia-app`

### Alternative Deployment
If build issues persist, consider:
1. Using official Kasia Docker image (when available)
2. Building Kasia locally and copying dist files
3. Using pre-built Kasia releases

## Links

- [Kasia Repository](https://github.com/K-Kluster/Kasia)
- [Kasia Documentation](https://github.com/K-Kluster/Kasia/blob/main/README.md)
- [Kasia Indexer](https://github.com/K-Kluster/kasia-indexer)