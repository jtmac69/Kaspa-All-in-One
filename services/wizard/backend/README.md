# Kaspa Installation Wizard Backend

Backend API server for the Kaspa All-in-One Installation Wizard.

## Features

- **System Requirements Checker**: Validates Docker, Docker Compose, system resources, and port availability
- **Profile Management**: Manages deployment profiles and templates with dependency resolution
- **Configuration Management**: Generates and validates .env files with secure password generation
- **Installation Engine**: Orchestrates Docker image pulling, service building, and deployment
- **WebSocket Progress Streaming**: Real-time installation progress updates
- **Service Validation**: Health checks and status monitoring for deployed services

## API Endpoints

### System Check
- `GET /api/system-check` - Run full system check
- `GET /api/system-check/docker` - Check Docker installation
- `GET /api/system-check/docker-compose` - Check Docker Compose installation
- `GET /api/system-check/resources` - Check system resources
- `POST /api/system-check/ports` - Check port availability

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get specific profile
- `GET /api/profiles/templates/all` - Get all templates
- `GET /api/profiles/templates/:id` - Get specific template
- `POST /api/profiles/validate` - Validate profile selection
- `POST /api/profiles/requirements` - Calculate resource requirements
- `POST /api/profiles/dependencies` - Resolve profile dependencies

### Configuration
- `POST /api/config/validate` - Validate configuration
- `POST /api/config/generate` - Generate .env file content
- `POST /api/config/save` - Save configuration to .env file
- `GET /api/config/load` - Load existing configuration
- `POST /api/config/default` - Generate default configuration
- `GET /api/config/password` - Generate secure password

### Installation
- `POST /api/install/start` - Start installation process
- `POST /api/install/pull` - Pull Docker images
- `POST /api/install/build` - Build services
- `POST /api/install/deploy` - Start services
- `POST /api/install/validate` - Validate installation
- `GET /api/install/status/:service` - Get service status
- `GET /api/install/logs/:service` - Get service logs
- `POST /api/install/stop` - Stop all services

### Health
- `GET /api/health` - Health check endpoint

## WebSocket Events

### Client → Server
- `install:start` - Start installation with config and profiles
- `service:status` - Request service status
- `logs:stream` - Request log streaming

### Server → Client
- `install:progress` - Installation progress update
- `install:error` - Installation error
- `install:complete` - Installation completed
- `service:status:response` - Service status response
- `logs:data` - Log data
- `logs:error` - Log streaming error

## Development

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Access to Docker socket

### Installation

```bash
cd services/wizard/backend
npm install
```

### Running

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on port 3000 by default. You can change this by setting the `WIZARD_PORT` environment variable.

### Environment Variables

- `WIZARD_PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Docker

Build and run with Docker:

```bash
docker build -t kaspa-wizard-backend .
docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock kaspa-wizard-backend
```

## Architecture

```
backend/
├── src/
│   ├── api/              # API route handlers
│   │   ├── system-check.js
│   │   ├── profiles.js
│   │   ├── config.js
│   │   └── install.js
│   ├── utils/            # Utility modules
│   │   ├── system-checker.js
│   │   ├── profile-manager.js
│   │   ├── config-generator.js
│   │   └── docker-manager.js
│   └── server.js         # Main server with WebSocket
├── package.json
├── Dockerfile
└── README.md
```

## Security Considerations

- The backend requires access to the Docker socket for container management
- Passwords are generated using cryptographically secure random bytes
- Configuration files are backed up before overwriting
- Input validation is performed using Joi schemas
- CORS is enabled for development (should be restricted in production)

## Testing

```bash
# Run system check
curl http://localhost:3000/api/system-check

# Get all profiles
curl http://localhost:3000/api/profiles

# Generate password
curl http://localhost:3000/api/config/password
```

## License

Part of the Kaspa All-in-One project.
