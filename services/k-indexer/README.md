# K-Indexer Integration with TimescaleDB Optimizations

This directory contains the Docker integration for the K-indexer service, which indexes K protocol social media transactions on the Kaspa blockchain with advanced TimescaleDB optimizations.

## Overview

The K-indexer is integrated using **build-time integration** with comprehensive TimescaleDB enhancements for optimal performance with Kaspa's 10 blocks/second rate and social media data patterns.

## Repository Information

- **Upstream Repository**: [thesheepcat/K-indexer](https://github.com/thesheepcat/K-indexer)
- **Integration Method**: Build-time clone with TimescaleDB optimizations
- **Technology Stack**: Rust with PostgreSQL/TimescaleDB
- **Performance Target**: 10-100x query performance improvement

## TimescaleDB Enhancements

### Hypertables Configuration

- **k_posts**: 6-hour chunks (optimal for social activity patterns)
- **k_votes**: 6-hour chunks (high-frequency voting data)
- **k_user_profiles**: 1-day chunks (less frequent profile updates)
- **k_follows**: 1-day chunks (social graph relationships)
- **k_transactions**: 1-hour chunks (high-frequency transaction data)

### Compression Policies

- **Automatic Compression**: 90%+ space savings for historical data
- **k_posts/k_votes**: Compress after 24 hours
- **k_user_profiles**: Compress after 7 days
- **k_transactions**: Compress after 24 hours

### Continuous Aggregates

- **hourly_post_stats**: Real-time post analytics
- **daily_user_activity**: User engagement metrics
- **hourly_vote_stats**: Voting activity analytics
- **daily_follow_stats**: Social graph growth metrics

## Personal Indexer Features

The K-indexer includes Personal Indexer capabilities for user-specific optimization:

### User-Specific Features

- **Custom Retention Policies**: Different retention for own vs. others' data
- **Priority Indexing**: High priority for user's own content
- **Personalized Notifications**: Configurable notification preferences
- **User-Specific Indexes**: Optimized queries for individual users
- **Privacy Controls**: Content filtering and data sharing controls

### Configuration

```javascript
// Enable Personal Indexer mode
PERSONAL_INDEXER_MODE=true
USER_ADDRESS=kaspa:qr1234567890abcdef...

// Custom retention (optional)
PERSONAL_RETENTION_POSTS=2y
PERSONAL_RETENTION_VOTES=1y
```

## Batch Processing Optimization

### Batch Configuration

- **Batch Size**: 1000 records (optimal for TimescaleDB)
- **Max Wait Time**: 5 seconds for partial batches
- **Parallel Batches**: 4 concurrent batch processors
- **Retry Logic**: 3 attempts with exponential backoff

### Supported Batch Types

- **posts**: K protocol post transactions
- **votes**: Voting/reaction transactions
- **profiles**: User profile updates
- **follows**: Social graph relationships
- **transactions**: All K protocol transactions

## Build Configuration

### Build Arguments

- `K_INDEXER_VERSION`: Version/branch to build (default: master)
- `ENABLE_TIMESCALEDB`: Enable TimescaleDB optimizations (default: true)

### Environment Variables

- `K_INDEXER_VERSION`: Override version for build
- `ENABLE_TIMESCALEDB`: Enable/disable TimescaleDB features
- `PERSONAL_INDEXER_MODE`: Enable Personal Indexer features
- `BATCH_SIZE`: Batch processing size (default: 1000)
- `CHUNK_INTERVAL`: TimescaleDB chunk interval (default: 6h)

## Usage

### Basic Build

```bash
# Build with TimescaleDB optimizations
cd services/k-indexer
./build.sh

# Or using Docker Compose
docker-compose build k-indexer
```

### Specialized Builds

```bash
# TimescaleDB optimized build
./build.sh timescaledb

# Personal Indexer build
./build.sh personal

# Production build with all optimizations
./build.sh prod k-indexer-prod

# Development build
./build.sh dev
```

### Version-Specific Build

```bash
# Build specific version
./build.sh version v2.1.0

# With environment variable
K_INDEXER_VERSION=v2.1.0 docker-compose build k-indexer
```

## Docker Compose Integration

The service is configured in `docker-compose.yml` with the `explorer` profile:

```yaml
k-indexer:
  build:
    context: ./services/k-indexer
    dockerfile: Dockerfile
    args:
      K_INDEXER_VERSION: ${K_INDEXER_VERSION:-master}
  container_name: k-indexer
  ports:
    - "${KSOCIAL_INDEXER_PORT:-3004}:3000"
  environment:
    - KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16111}
    - DATABASE_URL=postgresql://${POSTGRES_USER:-indexer}:${POSTGRES_PASSWORD:-secure_password}@indexer-db:5432/ksocial
    - ENABLE_TIMESCALEDB=true
    - BATCH_SIZE=1000
    - PERSONAL_INDEXER_MODE=false
  depends_on:
    indexer-db:
      condition: service_healthy
  profiles:
    - explorer
```

## Database Configuration

### TimescaleDB Connection

- **Database**: `ksocial` database in shared `indexer-db` TimescaleDB instance
- **Schema**: Automatically created via initialization scripts
- **Connection Pool**: Optimized for high-throughput operations
- **Wait Script**: Ensures database is ready before starting

### Schema Management

The indexer uses the TimescaleDB schema defined in:
- `config/postgres/init/02-k-social-timescaledb.sql`
- Automatic hypertable creation and optimization
- Compression policies and continuous aggregates

## API Endpoints

### Core Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Performance and indexing metrics
- `GET /api/posts` - Get K protocol posts
- `GET /api/users` - Get user profiles
- `GET /api/votes` - Get voting data
- `GET /api/follows` - Get social graph data

### Personal Indexer Endpoints

- `GET /api/user/:address/posts` - User-specific posts
- `GET /api/user/:address/activity` - User activity metrics
- `GET /api/user/:address/notifications` - User notifications
- `POST /api/user/:address/config` - Update personal indexer config

## Performance Monitoring

### Metrics Collection

- **Indexing Rate**: Transactions processed per second
- **Batch Performance**: Batch processing times and success rates
- **Database Performance**: Query times and compression ratios
- **Memory Usage**: Heap and buffer usage monitoring

### Performance Targets

- **Query Performance**: 10-100x improvement over standard PostgreSQL
- **Storage Efficiency**: 50-90% reduction through compression
- **Indexing Throughput**: Handle Kaspa's 10 blocks/second rate
- **Response Times**: Sub-second API responses for most queries

## Service Dependencies

### Required Services

1. **TimescaleDB** (indexer-db)
   - Must be running and healthy before K-indexer starts
   - Provides optimized time-series database capabilities
   - Shared with other indexer services

2. **Kaspa Node**
   - Provides blockchain data via RPC/WebSocket
   - Connection configured via `KASPA_NODE_URL`

### Startup Sequence

```
TimescaleDB → Kaspa Node → K-indexer → K-Social App
```

## Health Monitoring

- **Health Endpoint**: `http://localhost:3000/health`
- **Database Check**: Validates TimescaleDB connection and schema
- **Kaspa Node Check**: Verifies blockchain node connectivity
- **Batch Processing**: Monitors batch processor health

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check internet connection for repository cloning
   - Verify K_INDEXER_VERSION exists in upstream repository
   - Ensure TimescaleDB configuration files are present

2. **Database Connection Issues**
   - Check TimescaleDB container health
   - Verify DATABASE_URL configuration
   - Check database initialization logs

3. **Performance Issues**
   - Monitor batch processing metrics
   - Check TimescaleDB compression status
   - Verify chunk interval configuration

### Debugging Commands

```bash
# Check container logs
docker logs k-indexer

# Test database connectivity
docker exec k-indexer pg_isready -h indexer-db -p 5432

# Check TimescaleDB status
docker exec indexer-db psql -U indexer -d ksocial -c "SELECT * FROM timescaledb_information.hypertables;"

# Monitor batch processing
docker exec k-indexer curl -s http://localhost:3000/metrics | grep batch
```

## Development

### Local Development

```bash
# Development build with hot reload
./build.sh dev

# Run with development database
docker-compose --profile explorer --profile development up -d
```

### Testing

```bash
# Build and test
./build.sh timescaledb
docker run --rm -p 3000:3000 k-indexer-timescaledb

# Integration testing
docker-compose --profile explorer up -d
curl http://localhost:3004/health
```

## Configuration Files

### TimescaleDB Configuration

- `timescaledb-config.toml`: Hypertable and compression settings
- `batch-processor-config.toml`: Batch processing optimization
- `personal-indexer-config.toml`: Personal Indexer features
- `wait-for-db.sh`: Database readiness script

### Environment Variables

```bash
# Core configuration
RUST_LOG=info
PORT=3000
KASPA_NODE_URL=http://kaspa-node:16111
DATABASE_URL=postgresql://indexer:password@indexer-db:5432/ksocial

# TimescaleDB optimization
ENABLE_TIMESCALEDB=true
BATCH_SIZE=1000
CHUNK_INTERVAL=6h
ENABLE_COMPRESSION=true

# Personal Indexer
PERSONAL_INDEXER_MODE=false
USER_ADDRESS=kaspa:qr...
```

## Security Considerations

- Container runs as non-root user
- Database credentials via environment variables
- No external source code stored in repository
- Regular upstream security updates via rebuilds
- Personal data isolation in Personal Indexer mode

## Performance Optimization

### TimescaleDB Optimizations

- Hypertables with optimal chunk intervals
- Automatic compression for historical data
- Continuous aggregates for real-time analytics
- Optimized indexes for common query patterns

### Application Optimizations

- Connection pooling for database efficiency
- Batch processing for high throughput
- Prepared statements for query performance
- Caching for frequently accessed data

## Monitoring and Alerting

### Key Metrics

- Indexing lag behind blockchain tip
- Batch processing success rate
- Database query performance
- Memory and CPU usage
- Compression ratios and storage usage

### Alerting Thresholds

- Indexing lag > 10 blocks
- Batch failure rate > 5%
- Query response time > 1 second
- Memory usage > 80%
- Disk usage > 90%

## Future Enhancements

- [ ] Multi-node TimescaleDB clustering
- [ ] Advanced analytics and machine learning
- [ ] Real-time streaming optimizations
- [ ] Enhanced Personal Indexer features
- [ ] Cross-chain indexing capabilities
- [ ] Advanced compression algorithms