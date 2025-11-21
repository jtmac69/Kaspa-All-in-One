const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Import API routes
const systemCheckRouter = require('./api/system-check');
const resourceCheckRouter = require('./api/resource-check');
const contentRouter = require('./api/content');
const profilesRouter = require('./api/profiles');
const configRouter = require('./api/config');
const installRouter = require('./api/install');
const reconfigureRouter = require('./api/reconfigure');
const installationGuidesRouter = require('./api/installation-guides');
const errorRemediationRouter = require('./api/error-remediation');
const safetyRouter = require('./api/safety');
const diagnosticRouter = require('./api/diagnostic');
const glossaryRouter = require('./api/glossary');
const rollbackRouter = require('./api/rollback');

// Import utilities
const DockerManager = require('./utils/docker-manager');
const ConfigGenerator = require('./utils/config-generator');
const { secureErrorHandler, requestTimeout, validateInput } = require('./middleware/security');
const { logError } = require('./utils/error-handler');

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

// Security middleware
// NOTE: CSP temporarily disabled for testing - inline onclick handlers need to be converted to event listeners
app.use(helmet({
  contentSecurityPolicy: false // Disabled for testing
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const installLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit installation attempts
  message: 'Too many installation attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/install', installLimiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(validateInput); // Validate input
app.use(requestTimeout(60000)); // 60 second timeout for requests

// Serve static files from frontend
// In Docker, frontend is at /app/public, in development it's at ../../frontend/public
const frontendPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/system-check', systemCheckRouter);
app.use('/api/resource-check', resourceCheckRouter);
app.use('/api/content', contentRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/config', configRouter);
app.use('/api/install', installRouter);
app.use('/api/reconfigure', reconfigureRouter);
app.use('/api/installation-guides', installationGuidesRouter);
app.use('/api/error-remediation', errorRemediationRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/glossary', glossaryRouter);
app.use('/api/rollback', rollbackRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Wizard mode endpoint
app.get('/api/wizard/mode', (req, res) => {
  const mode = process.env.WIZARD_MODE || 'install';
  const autoStart = process.env.WIZARD_AUTO_START === 'true';
  
  res.json({
    mode,
    autoStart,
    isFirstRun: autoStart && mode === 'install'
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

// Security middleware
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent caching of sensitive data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error with context
  logError(err, {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  
  // Use secure error handler
  secureErrorHandler(err, req, res, next);
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
