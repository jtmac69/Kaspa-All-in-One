# K-Social App Integration

This directory contains the Docker integration for the K-Social application, which provides a social media interface for the Kaspa blockchain using the K protocol.

## Overview

The K-Social app is integrated using **build-time integration** - the external repository is cloned during the Docker build process, ensuring we always have the latest code without storing external source code in our repository.

## Repository Information

- **Upstream Repository**: [thesheepcat/K](https://github.com/thesheepcat/K)
- **Integration Method**: Build-time clone during Docker build
- **Technology Stack**: React/Node.js with Nginx for serving

## Dependencies

The K-Social app has an **absolute dependency** on the K-indexer service:

- **Required Service**: K-indexer must be running and accessible
- **Configuration**: Uses `apiBaseUrl` setting to connect to K-indexer
- **Startup Order**: K-indexer → K-Social App
- **Functionality**: Cannot operate without K-indexer (all data comes from indexer APIs)

## Build Configuration

### Build Arguments

- `K_SOCIAL_VERSION`: Version/branch to build (default: master)

### Environment Variables

- `K_SOCIAL_VERSION`: Override version for build
- `DOCKER_BUILDKIT`: Enable BuildKit for better performance (recommended: 1)

## Usage

### Basic Build

```bash
# Build with default settings (master branch)
cd services/k-social
./build.sh

# Or using Docker Compose
docker-compose build k-social
```

### Version-Specific Build

```bash
# Build specific version
./build.sh version v1.2.3

# Or with environment variable
K_SOCIAL_VERSION=v1.2.3 docker-compose build k-social
```

### Development Build

```bash
# Development build with optimizations
./build.sh dev

# Latest master branch
./build.sh latest
```

### Production Build

```bash
# Production build with optimizations
./build.sh prod k-social-prod
```

## Docker Compose Integration

The service is configured in `docker-compose.yml` with the `prod` profile:

```yaml
k-social:
  build:
    context: ./services/k-social
    dockerfile: Dockerfile
    args:
      K_SOCIAL_VERSION: ${K_SOCIAL_VERSION:-master}
  container_name: k-social
  ports:
    - "${KSOCIAL_APP_PORT:-3003}:3000"
  environment:
    - KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16111}
    - KSOCIAL_INDEXER_URL=${REMOTE_KSOCIAL_INDEXER_URL:-http://k-indexer:3000}
  depends_on:
    k-indexer:
      condition: service_healthy
  profiles:
    - prod
```

## Service Dependencies

### Required Services

1. **K-indexer** (critical dependency)
   - Must be running and healthy before K-Social starts
   - Provides all data APIs for the social media functionality
   - Connection configured via `KSOCIAL_INDEXER_URL`

2. **Kaspa Node** (indirect dependency via K-indexer)
   - K-indexer connects to Kaspa node for blockchain data
   - K-Social app doesn't directly connect to Kaspa node

### Startup Sequence

```
Kaspa Node → K-indexer → K-Social App
```

## API Configuration

The K-Social app connects to K-indexer through the `apiBaseUrl` configuration:

- **Default**: Points to `http://k-indexer:3000` in Docker environment
- **External**: Can be configured to use external K-indexer instance
- **Proxy**: Nginx configuration includes API proxy to K-indexer

## Nginx Configuration

The app uses Nginx to serve the React build and proxy API requests:

- **Static Files**: Served from `/usr/share/nginx/html`
- **API Proxy**: `/api/*` requests proxied to K-indexer
- **SPA Routing**: All routes fall back to `index.html`
- **Health Check**: `/health` endpoint for container health monitoring

## Health Monitoring

- **Health Endpoint**: `http://localhost:3000/health`
- **Health Check**: Configured in Docker with 30s intervals
- **Dependencies**: Health depends on K-indexer availability

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check internet connection for repository cloning
   - Verify K_SOCIAL_VERSION exists in upstream repository
   - Check Docker BuildKit is enabled

2. **Runtime Issues**
   - Ensure K-indexer is running and healthy
   - Check `KSOCIAL_INDEXER_URL` configuration
   - Verify network connectivity between containers

3. **API Connection Issues**
   - Check K-indexer health endpoint
   - Verify API proxy configuration in nginx.conf
   - Check container network configuration

### Debugging Commands

```bash
# Check container logs
docker logs k-social

# Test K-indexer connectivity
docker exec k-social curl -f http://k-indexer:3000/health

# Check nginx configuration
docker exec k-social nginx -t

# Inspect container
docker inspect k-social
```

## Development

### Local Development

For local development, you can:

1. Clone the upstream repository manually
2. Use the build script with development mode
3. Mount local source code for faster iteration

### Testing

```bash
# Build and test
./build.sh dev
docker run --rm -p 3000:3000 k-social-dev

# Integration testing
docker-compose --profile prod up -d
curl http://localhost:3003/health
```

## Version Management

### Recommended Practices

1. **Development**: Use `master` branch for latest features
2. **Staging**: Pin to specific version tags
3. **Production**: Always use stable version tags

### Version Pinning

```bash
# Pin to specific version in .env
echo "K_SOCIAL_VERSION=v1.2.3" >> .env

# Build with pinned version
docker-compose build k-social
```

## Security Considerations

- Container runs as non-root user
- Nginx security headers configured
- No external source code stored in repository
- Regular upstream security updates via rebuilds

## Performance Optimization

- Multi-stage Docker build for smaller images
- Nginx gzip compression enabled
- Static asset caching configured
- BuildKit enabled for faster builds

## Monitoring and Metrics

- Health check endpoint for monitoring
- Nginx access logs for usage analytics
- Container resource monitoring via Docker stats
- Integration with K-indexer metrics

## Future Enhancements

- [ ] Add custom K-Social configuration injection
- [ ] Implement caching layer for improved performance
- [ ] Add metrics collection and monitoring
- [ ] Support for multiple K-indexer instances
- [ ] Enhanced error handling and fallback mechanisms