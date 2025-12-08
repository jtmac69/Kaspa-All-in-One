# Kaspa Stratum Bridge

This service provides a stratum mining bridge for Kaspa, allowing miners to connect to your local Kaspa node using standard mining software.

## Overview

The Kaspa Stratum Bridge acts as a proxy between mining software (like lolMiner, BzMiner, etc.) and your Kaspa node, translating stratum protocol commands to Kaspa RPC calls.

**Repository**: [aglov413/kaspa-stratum-bridge](https://github.com/aglov413/kaspa-stratum-bridge)

## Features

- **Stratum Protocol Support**: Standard stratum mining protocol for compatibility with popular miners
- **Solo Mining**: Mine directly to your own Kaspa address without pool fees
- **Pool Connectivity**: Can also connect to mining pools if configured
- **Low Latency**: Direct connection to local Kaspa node for minimal latency
- **Configurable Difficulty**: Adjustable share difficulty for different mining setups

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KASPA_RPC_SERVER` | `kaspa-node:16111` | Kaspa node RPC endpoint |
| `STRATUM_PORT` | `5555` | Port for stratum connections |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `MIN_SHARE_DIFF` | `4` | Minimum share difficulty |
| `EXTRA_NONCE_SIZE` | `0` | Extra nonce size for mining |

### Docker Compose Configuration

The stratum bridge is included in the `prod` and `mining` profiles:

```bash
# Start with mining profile
docker-compose --profile mining up -d

# Or with production profile
docker-compose --profile prod up -d
```

## Building

### Using the Build Script

```bash
# Build with default settings (master branch)
cd services/kaspa-stratum
./build.sh

# Build specific version
./build.sh version v1.0.0

# Build for production
./build.sh prod kaspa-stratum-prod

# Build latest master
./build.sh latest
```

### Manual Docker Build

```bash
# Build with default version
docker build -t kaspa-stratum .

# Build specific version
docker build --build-arg STRATUM_VERSION=v1.0.0 -t kaspa-stratum:v1.0.0 .
```

## Usage

### Solo Mining Setup

1. **Start the Kaspa node and stratum bridge**:
   ```bash
   docker-compose --profile mining up -d
   ```

2. **Configure your mining software** to connect to:
   - **Host**: Your server IP or `localhost`
   - **Port**: `5555` (or your configured `STRATUM_PORT`)
   - **Wallet**: Your Kaspa wallet address

3. **Example miner configurations**:

   **lolMiner**:
   ```bash
   lolMiner --algo KASPA --pool <your-ip>:5555 --user <your-kaspa-address>
   ```

   **BzMiner**:
   ```bash
   bzminer -a kaspa -p stratum+tcp://<your-ip>:5555 -w <your-kaspa-address>
   ```

   **SRBMiner**:
   ```bash
   SRBMiner-MULTI --algorithm kaspa --pool <your-ip>:5555 --wallet <your-kaspa-address>
   ```

### Pool Mining Setup

To connect to a mining pool through your local node:

1. Configure the stratum bridge to connect to the pool
2. Point your miners to your local stratum bridge
3. This provides local monitoring while using pool infrastructure

## Monitoring

### Check Stratum Bridge Status

```bash
# View logs
docker logs kaspa-stratum

# Follow logs in real-time
docker logs -f kaspa-stratum

# Check if stratum port is listening
nc -zv localhost 5555
```

### Health Check

The container includes a health check that verifies the stratum port is listening:

```bash
# Check container health
docker ps --filter name=kaspa-stratum --format "table {{.Names}}\t{{.Status}}"
```

## Troubleshooting

### Stratum Bridge Won't Start

1. **Check Kaspa node is running**:
   ```bash
   docker ps | grep kaspa-node
   ```

2. **Verify RPC connectivity**:
   ```bash
   curl -X POST http://localhost:16111 -H "Content-Type: application/json" -d '{"method":"ping","params":{}}'
   ```

3. **Check logs for errors**:
   ```bash
   docker logs kaspa-stratum
   ```

### Miners Can't Connect

1. **Verify port is exposed**:
   ```bash
   netstat -an | grep 5555
   # or
   ss -tuln | grep 5555
   ```

2. **Check firewall rules**:
   ```bash
   # Allow stratum port through firewall
   sudo ufw allow 5555/tcp
   ```

3. **Test connectivity from miner machine**:
   ```bash
   telnet <server-ip> 5555
   ```

### Low Hashrate or High Rejection Rate

1. **Adjust share difficulty**:
   - Increase `MIN_SHARE_DIFF` for more powerful miners
   - Decrease for less powerful miners

2. **Check network latency**:
   - Ensure stable connection between miner and stratum bridge
   - Monitor for packet loss or high latency

3. **Verify Kaspa node is synced**:
   ```bash
   # Check sync status
   docker logs kaspa-node | grep -i sync
   ```

## Performance Optimization

### For High-Performance Mining

1. **Increase node resources**:
   - Allocate more CPU and memory to Kaspa node
   - Use SSD storage for better I/O performance

2. **Network optimization**:
   - Use wired connection instead of WiFi
   - Minimize network hops between miner and stratum bridge

3. **Stratum bridge tuning**:
   - Adjust `MIN_SHARE_DIFF` based on your total hashrate
   - Monitor logs for optimal settings

### Resource Requirements

- **CPU**: Minimal (< 1% for typical mining operations)
- **Memory**: ~50-100 MB
- **Network**: Depends on number of miners and share submission rate
- **Storage**: Minimal (logs only)

## Security Considerations

### Network Security

1. **Firewall Configuration**:
   - Only expose stratum port (5555) to trusted networks
   - Keep RPC port (16111) internal only

2. **Access Control**:
   - Use VPN for remote mining connections
   - Consider IP whitelisting for production setups

3. **Monitoring**:
   - Monitor for unusual connection patterns
   - Log all mining activity for audit purposes

### Best Practices

- **Don't expose RPC port publicly** - only stratum port should be accessible
- **Use strong wallet addresses** - verify your Kaspa address is correct
- **Monitor regularly** - check logs and mining statistics frequently
- **Keep updated** - regularly update to latest stratum bridge version

## Integration with All-in-One System

The stratum bridge integrates seamlessly with the Kaspa All-in-One system:

- **Automatic node connection**: Connects to local Kaspa node automatically
- **Profile-based deployment**: Included in `mining` and `prod` profiles
- **Health monitoring**: Integrated with system health checks
- **Log aggregation**: Logs available through dashboard

## Additional Resources

- [Kaspa Mining Guide](https://kaspa.org/mining)
- [Stratum Protocol Documentation](https://en.bitcoin.it/wiki/Stratum_mining_protocol)
- [Kaspa Stratum Bridge Repository](https://github.com/aglov413/kaspa-stratum-bridge)
- [Mining Software Comparison](https://kaspa.org/mining-software)

## Support

For issues specific to the stratum bridge, please check:
1. This README troubleshooting section
2. [Kaspa Stratum Bridge Issues](https://github.com/aglov413/kaspa-stratum-bridge/issues)
3. [Kaspa Discord](https://discord.gg/kaspa) - #mining channel

For All-in-One system integration issues, see the main project documentation.
