const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import API routes
const systemCheckRouter = require('./api/system-check');
const profilesRouter = require('./api/profiles');
const configRouter = require('./api/config');
const installRouter = require('./api/install');

// Import utilities
const DockerManager = require('./utils/docker-manager');
const ConfigGenerator = require('./utils/config-generator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.WIZARD_PORT || 3000;
const dockerManager = new DockerManager();
const configGenerator = new ConfigGenerator();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
const frontendPath = path.join(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/system-check', systemCheckRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/config', configRouter);
app.use('/api/install', installRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle installation progress streaming
  socket.on('install:start', async (data) => {
    try {
      const { config, profiles } = data;
      
      socket.emit('install:progress', {
        stage: 'init',
        message: 'Starting installation...',
        progress: 0
      });

      // Save configuration
      const configValidation = await configGenerator.validateConfig(config);
      if (!configValidation.valid) {
        socket.emit('install:error', {
          stage: 'config',
          message: 'Invalid configuration',
          errors: configValidation.errors
        });
        return;
      }

      const envContent = await configGenerator.generateEnvFile(configValidation.config, profiles);
      const envPath = path.resolve(__dirname, '../../../.env');
      const saveResult = await configGenerator.saveEnvFile(envContent, envPath);

      if (!saveResult.success) {
        socket.emit('install:error', {
          stage: 'config',
          message: 'Failed to save configuration',
          error: saveResult.error
        });
        return;
      }

      socket.emit('install:progress', {
        stage: 'config',
        message: 'Configuration saved',
        progress: 10
      });

      // Pull images
      socket.emit('install:progress', {
        stage: 'pull',
        message: 'Pulling Docker images...',
        progress: 20
      });

      const pullResults = await dockerManager.pullImages(profiles, (progress) => {
        socket.emit('install:progress', {
          stage: 'pull',
          message: progress.message,
          progress: 20 + (progress.current / progress.total) * 30,
          details: progress
        });
      });

      const pullFailed = pullResults.some(r => !r.success);
      if (pullFailed) {
        socket.emit('install:error', {
          stage: 'pull',
          message: 'Failed to pull some images',
          results: pullResults
        });
        return;
      }

      socket.emit('install:progress', {
        stage: 'pull',
        message: 'Images pulled successfully',
        progress: 50
      });

      // Build services
      socket.emit('install:progress', {
        stage: 'build',
        message: 'Building services...',
        progress: 55
      });

      const buildResult = await dockerManager.buildServices(profiles, (progress) => {
        socket.emit('install:progress', {
          stage: 'build',
          message: progress.message,
          progress: 55 + (progress.current / progress.total) * 20,
          details: progress
        });
      });

      if (!buildResult.success) {
        socket.emit('install:error', {
          stage: 'build',
          message: 'Failed to build some services',
          results: buildResult.services
        });
        return;
      }

      socket.emit('install:progress', {
        stage: 'build',
        message: 'Services built successfully',
        progress: 75
      });

      // Start services
      socket.emit('install:progress', {
        stage: 'deploy',
        message: 'Starting services...',
        progress: 80
      });

      const deployResult = await dockerManager.startServices(profiles, (progress) => {
        socket.emit('install:progress', {
          stage: 'deploy',
          message: progress.message,
          progress: 80 + (progress.complete ? 10 : 5),
          details: progress
        });
      });

      if (!deployResult.success) {
        socket.emit('install:error', {
          stage: 'deploy',
          message: 'Failed to start services',
          error: deployResult.error
        });
        return;
      }

      socket.emit('install:progress', {
        stage: 'deploy',
        message: 'Services started',
        progress: 90
      });

      // Validate installation
      socket.emit('install:progress', {
        stage: 'validate',
        message: 'Validating installation...',
        progress: 95
      });

      // Wait a bit for services to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));

      const serviceValidation = await dockerManager.validateServices(profiles);

      socket.emit('install:progress', {
        stage: 'validate',
        message: 'Validation complete',
        progress: 100
      });

      socket.emit('install:complete', {
        message: 'Installation completed successfully',
        validation: serviceValidation
      });

    } catch (error) {
      socket.emit('install:error', {
        stage: 'unknown',
        message: 'Installation failed',
        error: error.message
      });
    }
  });

  // Handle service status requests
  socket.on('service:status', async (serviceName) => {
    try {
      const status = await dockerManager.getServiceStatus(serviceName);
      socket.emit('service:status:response', { service: serviceName, status });
    } catch (error) {
      socket.emit('service:status:error', {
        service: serviceName,
        error: error.message
      });
    }
  });

  // Handle log streaming
  socket.on('logs:stream', async (data) => {
    try {
      const { service, lines } = data;
      const result = await dockerManager.getLogs(service, lines || 100);
      socket.emit('logs:data', { service, logs: result.logs });
    } catch (error) {
      socket.emit('logs:error', {
        service: data.service,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Catch-all route to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Kaspa Installation Wizard backend running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
