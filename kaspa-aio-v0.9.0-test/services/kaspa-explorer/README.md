# Kaspa Explorer

A blockchain explorer for the Kaspa network.

## Source

This service builds from the official Kaspa Explorer repository:
- **GitHub**: https://github.com/lAmeR1/kaspa-explorer
- **License**: MIT

## Configuration

The explorer is configured through environment variables in the docker-compose.yml:

- `KASPA_NETWORK`: Network to connect to (mainnet/testnet)
- `API_BASE_URL`: Base URL for the indexer API

## Ports

- **3004**: Web interface (mapped from container port 80)

## Building

The Dockerfile clones the repository and builds the application from source.

```bash
docker build -t kaspa-explorer .
```

## Running

```bash
docker run -p 3004:80 \
  -e KASPA_NETWORK=mainnet \
  -e API_BASE_URL=https://api.kaspa.org/ \
  kaspa-explorer
```

## Integration

This service is part of the Kaspa User Applications profile and provides:
- Block explorer interface
- Transaction search
- Address lookup
- Network statistics

## Notes

- The explorer is a static web application built with modern JavaScript frameworks
- It connects to a Kaspa indexer API for blockchain data
- No database or backend is required - it's a pure frontend application
