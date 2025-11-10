# Simply Kaspa Indexer - Quick Start Guide

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 100GB+ storage for full indexing

## Quick Start

### 1. Start the Indexer (Explorer Profile)

```bash
# From the project root directory
docker-compose --profile explorer up -d

# This will start:
# - Kaspa node
# - TimescaleDB (indexer-db)
# - Simply Kaspa indexer
```

### 2. Check Status

```bash
# Check if services are running
docker-compose --profile explorer ps

# Check indexer health
curl http://localhost:3005/health

# View indexer logs
docker logs simply-kaspa-indexer -f
```

### 3. Access the API

```bash
# Get network statistics
curl http://localhost:3005/api/stats

# Get recent blocks
curl http://localhost:3005/api/blocks?limit=10

# Get address information
curl http://localhost:3005/api/addresses/kaspa:qz7ulu4c25dh7fzec9zjyrmlhnkzrg4wmf89q7gzr3gfrsj3uz6xjceef60sd
```

## Indexing Modes

### Full Mode (Default)

```bash
# Full blockchain indexing with all transaction details
SIMPLY_INDEXER_MODE=full docker-compose --profile explorer up -d
```

### Light Mode

```bash
# Blocks and transaction summaries only
SIMPLY_INDEXER_MODE=light docker-compose --profile explorer up -d
```

### Archive Mode

```bash
# Full indexing with extended retention
docker-compose --profile archive up -d
```

### Personal Mode

```bash
# User-specific indexing with custom retention
SIMPLY_INDEXER_MODE=personal docker-compose --profile explorer up -d
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Indexing mode
SIMPLY_INDEXER_MODE=full

# TimescaleDB settings
SIMPLY_COMPRESSION_AGE_HOURS=2
SIMPLY_BATCH_SIZE=1000
SIMPLY_CHUNK_INTERVAL=30

# Retention (0 = keep forever)
SIMPLY_RETENTION_DAYS=0

# Performance
SIMPLY_LOG_LEVEL=info
SIMPLY_CACHE_SIZE=1000
```

## Building from Source

### Using Build Script

```bash
cd services/simply-kaspa-indexer

# Build with default settings
./build.sh

# Build with TimescaleDB optimizations
./build.sh timescaledb

# Build for personal mode
./build.sh personal

# Build specific version
./build.sh version v1.0.0
```

### Using Docker Compose

```bash
# Build and start
docker-compose --profile explorer build simply-kaspa-indexer
docker-compose --profile explorer up -d simply-kaspa-indexer
```

## Monitoring

### Check Indexing Progress

```bash
# Connect to database
docker exec -it indexer-db psql -U indexer -d simply_kaspa

# Check block count
SELECT COUNT(*) FROM blocks;

# Check transaction count
SELECT COUNT(*) FROM transactions;

# Check compression statistics
SELECT * FROM blockchain_compression_stats;

# Check performance metrics
SELECT * FROM blockchain_performance_metrics;
```

### View Metrics

```bash
# Prometheus metrics
curl http://localhost:3005/metrics

# Health check
curl http://localhost:3005/health
```

## Testing

### Run Integration Tests

```bash
# Full test suite
./test-simply-kaspa-indexer.sh

# Test specific mode
./test-simply-kaspa-indexer.sh --mode personal

# Keep containers running after test
./test-simply-kaspa-indexer.sh --no-cleanup
```

## Troubleshooting

### Indexer Not Starting

```bash
# Check logs
docker logs simply-kaspa-indexer

# Check database connection
docker exec simply-kaspa-indexer pg_isready -h indexer-db -p 5432

# Check Kaspa node
curl -X POST http://localhost:16111 -H "Content-Type: application/json" -d '{"method":"ping","params":{}}'
```

### Slow Indexing

```bash
# Increase batch size
SIMPLY_BATCH_SIZE=2000 docker-compose --profile explorer up -d

# Check database performance
docker exec -it indexer-db psql -U indexer -d simply_kaspa -c "SELECT * FROM blockchain_performance_metrics;"
```

### High Memory Usage

```bash
# Reduce batch size
SIMPLY_BATCH_SIZE=500 docker-compose --profile explorer up -d

# Enable compression sooner
SIMPLY_COMPRESSION_AGE_HOURS=1 docker-compose --profile explorer up -d
```

## Stopping and Cleanup

### Stop Services

```bash
# Stop indexer only
docker-compose --profile explorer stop simply-kaspa-indexer

# Stop all explorer services
docker-compose --profile explorer down
```

### Full Cleanup

```bash
# Stop and remove containers
docker-compose --profile explorer down

# Remove volumes (WARNING: deletes all data)
docker-compose --profile explorer down -v
```

## Advanced Usage

### Custom Configuration

Edit configuration files in `services/simply-kaspa-indexer/`:

- `timescaledb-config.toml` - TimescaleDB settings
- `batch-processor-config.toml` - Batch processing settings
- `personal-indexer-config.toml` - Personal indexer settings

Then rebuild:

```bash
docker-compose --profile explorer build simply-kaspa-indexer
docker-compose --profile explorer up -d simply-kaspa-indexer
```

### Database Backup

```bash
# Backup database
docker exec indexer-db pg_dump -U indexer simply_kaspa > simply_kaspa_backup.sql

# Restore database
docker exec -i indexer-db psql -U indexer simply_kaspa < simply_kaspa_backup.sql
```

### Performance Tuning

```bash
# Increase worker processes
docker-compose --profile explorer up -d --scale simply-kaspa-indexer=2

# Adjust chunk intervals (requires rebuild)
SIMPLY_CHUNK_INTERVAL=15 docker-compose --profile explorer build simply-kaspa-indexer
```

## API Examples

### Get Recent Blocks

```bash
curl http://localhost:3005/api/blocks?limit=10&sort=desc
```

### Get Block by Hash

```bash
curl http://localhost:3005/api/blocks/00000000000000000000000000000000000000000000000000000000000000000
```

### Get Transactions

```bash
curl http://localhost:3005/api/transactions?limit=10&from=2024-01-01&to=2024-01-31
```

### Get Address Information

```bash
curl http://localhost:3005/api/addresses/kaspa:qz7ulu4c25dh7fzec9zjyrmlhnkzrg4wmf89q7gzr3gfrsj3uz6xjceef60sd
```

### Get Address Transactions

```bash
curl http://localhost:3005/api/addresses/kaspa:qz7ulu4c25dh7fzec9zjyrmlhnkzrg4wmf89q7gzr3gfrsj3uz6xjceef60sd/transactions
```

### Get Network Statistics

```bash
curl http://localhost:3005/api/stats
```

### Get Real-time Metrics

```bash
curl http://localhost:3005/api/stats/realtime
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/supertypo/simply-kaspa-indexer/issues
- Kaspa Discord: https://discord.gg/kaspa
- Documentation: See README.md for detailed information

## Next Steps

1. Explore the API endpoints
2. Set up monitoring with Prometheus/Grafana
3. Configure retention policies for your use case
4. Optimize performance based on your hardware
5. Set up automated backups

For more detailed information, see the full README.md file.
