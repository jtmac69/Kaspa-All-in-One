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

### Build Output Detection

The Dockerfile automatically detects the build output directory from the upstream repository. It checks for common JavaScript build output directories in this order:
1. `dist/` - Vite, Webpack, Rollup
2. `build/` - Create React App, many React projects
3. `out/` - Next.js
4. `public/` - Some static site generators

This ensures compatibility even if the upstream repository changes its build tooling.

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
