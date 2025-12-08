# Simply Kaspa Indexer

A high-performance blockchain indexer for Kaspa, optimized for TimescaleDB and designed to handle Kaspa's 10 blocks/second rate (864,000 blocks/day).

## Features

- **TimescaleDB Optimized**: 15-30 minute chunk intervals for optimal performance
- **Multiple Indexing Modes**: Full, light, archive, and personal indexer modes
- **High Performance**: 10-100x faster time-range queries with TimescaleDB
- **Automatic Compression**: 90%+ space savings on historical data
- **Real-time Analytics**: Continuous aggregates for network statistics
- **Personal Indexer**: User-specific data patterns and retention policies

## Architecture

The Simply Kaspa indexer processes blockchain data from a Kaspa node and stores it in a TimescaleDB database with optimized schemas for time-series data.

### Indexing Modes

1. **Full Mode** (`full`): Index all blockchain data with full transaction details
2. **Light Mode** (`light`): Index blocks and transaction summaries only
3. **Archive Mode** (`archive`): Full indexing with extended retention and maximum compression
4. **Personal Mode** (`personal`): User-specific indexing with customizable retention policies

## Configuration

### Environment Variables

- `KASPA_NODE_URL`: URL of the Kaspa node RPC endpoint (default: `http://kaspa-node:16111`)
- `DATABASE_URL`: PostgreSQL/TimescaleDB connection string
- `INDEXER_MODE`: Indexing mode - `full`, `light`, `archive`, or `personal` (default: `full`)
- `RETENTION_DAYS`: Data retention period in days (0 = keep forever, default: 0)
- `ENABLE_COMPRESSION`: Enable automatic compression (default: `true`)
- `COMPRESSION_AGE_HOURS`: Compress data older than X hours (default: 2)
- `BATCH_SIZE`: Number of blocks to process in each batch (default: 1000)
- `CHUNK_INTERVAL_MINUTES`: TimescaleDB chunk interval in minutes (default: 30)
- `LOG_LEVEL`: Logging level - `debug`, `info`, `warn`, `error` (default: `info`)

### TimescaleDB Optimizations

The indexer leverages TimescaleDB features for optimal performance:

- **Hypertables**: Automatic time-based partitioning (15-30 minute chunks)
- **Compression**: Automatic compression for data older than 1-2 hours (90%+ space savings)
- **Continuous Aggregates**: Pre-computed metrics for real-time analytics
- **Batch Processing**: 1000-record batches for optimal throughput
- **Optimized Indexes**: Strategic indexes for common query patterns

## Building

### Using Docker

```bash
# Build with default settings
docker build -t simply-kaspa-indexer .

# Build with specific version
docker build --build-arg SIMPLY_KASPA_VERSION=v1.0.0 -t simply-kaspa-indexer:v1.0.0 .
```

### Using Build Script

```bash
# Build with default settings
./build.sh

# Build with latest version
./build.sh latest

# Build specific version
./build.sh version v1.0.0

# Build with TimescaleDB optimizations
./build.sh timescaledb

# Build for personal indexer mode
./build.sh personal simply-kaspa-personal

# Production build
./build.sh prod simply-kaspa-prod
```

## Running

### Using Docker Compose

The indexer is integrated into the main docker-compose.yml with the `explorer` profile:

```bash
# Start with explorer profile (includes indexer-db and simply-kaspa-indexer)
docker-compose --profile explorer up -d

# Start with archive profile (includes archive-db and archive-indexer)
docker-compose --profile archive up -d
```

### Standalone Docker

```bash
# Full mode
docker run -d \
  -e KASPA_NODE_URL=http://kaspa-node:16111 \
  -e DATABASE_URL=postgresql://indexer:password@indexer-db:5432/simply_kaspa \
  -e INDEXER_MODE=full \
  -p 3005:3000 \
  simply-kaspa-indexer

# Personal mode with 90-day retention
docker run -d \
  -e KASPA_NODE_URL=http://kaspa-node:16111 \
  -e DATABASE_URL=postgresql://indexer:password@indexer-db:5432/simply_kaspa \
  -e INDEXER_MODE=personal \
  -e RETENTION_DAYS=90 \
  -p 3005:3000 \
  simply-kaspa-indexer
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus-compatible metrics
- `GET /api/blocks` - Query blocks with time-range filters
- `GET /api/blocks/:hash` - Get block by hash
- `GET /api/transactions` - Query transactions with filters
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/addresses/:address` - Get address information and balance
- `GET /api/addresses/:address/transactions` - Get address transaction history
- `GET /api/stats` - Get network statistics
- `GET /api/stats/realtime` - Get real-time blockchain metrics

## Performance

### TimescaleDB Performance Improvements

- **Time-range queries**: 10-100x faster than standard PostgreSQL
- **Storage efficiency**: 90%+ compression on historical data
- **Query optimization**: Continuous aggregates eliminate expensive calculations
- **Scalability**: Handles 10 blocks/second (864,000 blocks/day) efficiently

### Benchmarks

- Block indexing: ~100-200 blocks/second
- Transaction processing: ~1000-2000 transactions/second
- Query response time: <100ms for most queries
- Database size: ~50-90% smaller with compression

## Monitoring

### Health Check

```bash
curl http://localhost:3005/health
```

### Metrics

```bash
curl http://localhost:3005/metrics
```

### Database Statistics

Connect to the database and query monitoring views:

```sql
-- Compression statistics
SELECT * FROM blockchain_compression_stats;

-- Hypertable statistics
SELECT * FROM blockchain_hypertable_stats;

-- Performance metrics
SELECT * FROM blockchain_performance_metrics;

-- Personal indexer statistics
SELECT * FROM personal_indexer_stats;
```

## Troubleshooting

### Indexer Not Syncing

1. Check Kaspa node connectivity:
   ```bash
   curl -X POST http://kaspa-node:16111 -H "Content-Type: application/json" -d '{"method":"ping","params":{}}'
   ```

2. Check database connectivity:
   ```bash
   docker exec simply-kaspa-indexer pg_isready -h indexer-db -p 5432
   ```

3. Check indexer logs:
   ```bash
   docker logs simply-kaspa-indexer
   ```

### High Memory Usage

- Reduce `BATCH_SIZE` to process fewer blocks at once
- Increase `COMPRESSION_AGE_HOURS` to compress data sooner
- Enable retention policies to remove old data

### Slow Queries

- Check if compression is enabled and working
- Verify continuous aggregates are refreshing
- Review query patterns and add indexes if needed

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance
```

## License

MIT License - See LICENSE file for details

## Contributing

See CONTRIBUTING.md for contribution guidelines.

## Support

For issues and questions:
- GitHub Issues: https://github.com/supertypo/simply-kaspa-indexer/issues
- Kaspa Discord: https://discord.gg/kaspa
