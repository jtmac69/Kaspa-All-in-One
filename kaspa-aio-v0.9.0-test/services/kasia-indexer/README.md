# Kasia Indexer Service

This service uses the official Kasia Indexer Docker image from the K-Kluster team.

## Official Docker Image

- **Image**: `kkluster/kasia-indexer:main`
- **Repository**: [K-Kluster/kasia-indexer](https://github.com/K-Kluster/kasia-indexer)
- **Docker Hub**: [kkluster/kasia-indexer](https://hub.docker.com/r/kkluster/kasia-indexer)

## Configuration

The Kasia Indexer is configured through environment variables:

### Required Environment Variables

- `KASPA_NODE_WBORSH_URL`: WebSocket connection to Kaspa node (default: `ws://kaspa-node:17110`)
- `KASIA_INDEXER_DB_ROOT`: Data storage directory (default: `/app/data`)
- `NETWORK_TYPE`: Network type - mainnet, testnet, or devnet (default: `mainnet`)

### Optional Environment Variables

- `RUST_LOG`: Logging level - debug, info, warn, error (default: `info`)
- `RUST_BACKTRACE`: Enable Rust backtraces for debugging (default: `1`)

## Data Storage

The indexer uses file-based storage and does not require an external database. Data is persisted in a Docker volume:

- **Volume**: `kasia-indexer-data`
- **Mount Point**: `/app/data`

## Ports

- **Port 8080**: HTTP API and health check endpoint

## Health Check

The service includes a health check endpoint:

```bash
curl http://localhost:3002/health
```

## Testing

Use the dedicated test script to validate the Kasia indexer setup:

```bash
./test-kasia-indexer.sh
```

## Usage in Docker Compose

The service is part of the `explorer` profile:

```bash
# Start with explorer profile
docker compose --profile explorer up -d

# Check status
docker compose ps kasia-indexer

# View logs
docker compose logs kasia-indexer

# Stop service
docker compose stop kasia-indexer
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure Kaspa node is running and accessible
   - Verify WebSocket port 17110 is available
   - Check network connectivity between containers

2. **Data Persistence Issues**
   - Verify Docker volume permissions
   - Check available disk space
   - Monitor volume growth over time

3. **High Resource Usage**
   - Adjust RUST_LOG level to reduce logging
   - Monitor indexing performance
   - Consider resource limits if needed

### Logs and Debugging

```bash
# View detailed logs
docker compose logs -f kasia-indexer

# Check container resource usage
docker stats kasia-indexer

# Inspect data volume
docker volume inspect kaspa-aio_kasia-indexer-data
```