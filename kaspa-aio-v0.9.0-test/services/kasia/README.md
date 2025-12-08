# Kasia Messaging App Integration

This directory contains the integration configuration for the Kasia messaging application within the Kaspa All-in-One project.

## Integration Approach

### 🎯 Clean External Integration

Instead of copying the Kasia source code into our repository, this integration:

1. **Clones at Build Time**: The Dockerfile clones the Kasia repository during Docker build
2. **No Code Duplication**: Our repository stays clean without external source code
3. **Version Control**: Configurable version/branch selection via build args
4. **Automatic Updates**: Rebuilding pulls the latest code from upstream

### 🔧 Configuration Options

#### Option 1: Official Docker Image (Recommended)
```yaml
kasia-app:
  image: kkluster/kasia:latest  # Use official image when available
```

#### Option 2: Build from Source (Current)
```yaml
kasia-app:
  build:
    context: ./services/kasia
    args:
      KASIA_VERSION: main  # or specific tag/branch
```

#### Option 3: Git Submodule (Alternative)
```bash
# Add as submodule (if preferred)
git submodule add https://github.com/K-Kluster/Kasia.git services/kasia/source
```

## Usage

### Building with Specific Version
```bash
# Build with specific version
docker build --build-arg KASIA_VERSION=v0.6.2 -t kasia-app services/kasia/

# Build with latest main branch (default)
docker build -t kasia-app services/kasia/
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

1. **Automatic Updates**: Rebuild the Docker image to get latest code
   ```bash
   docker-compose build kasia-app
   ```

2. **Version Pinning**: Use specific versions for stability
   ```bash
   docker build --build-arg KASIA_VERSION=v0.6.2 -t kasia-app services/kasia/
   ```

3. **Monitoring Upstream**: Watch the [Kasia repository](https://github.com/K-Kluster/Kasia) for updates

### Benefits of This Approach

✅ **No Code Duplication**: Our repo stays clean  
✅ **Always Fresh**: Builds pull latest upstream code  
✅ **Version Flexibility**: Can pin to specific versions  
✅ **Easy Maintenance**: No manual sync required  
✅ **Upstream Tracking**: Easy to follow Kasia development  

### Considerations

⚠️ **Build Dependencies**: Requires internet access during build  
⚠️ **Build Complexity**: Kasia has complex WASM build requirements  
⚠️ **Upstream Changes**: Breaking changes in Kasia could affect builds  

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