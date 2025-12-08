const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Import build configuration
const buildConfig = require('./config/build-config');

// Import API routes
const buildInfoRouter = require('./api/build-info');
const systemCheckRouter = require('./api/system-check');
const resourceCheckRouter = require('./api/resource-check');
const contentRouter = require('./api/content');
const profilesRouter = require('./api/profiles');
const configRouter = require('./api/config');
const installRouter = require('./api/install');
const reconfigureRouter = require('./api/reconfigure');
const updateRouter = require('./api/update');
const installationGuidesRouter = require('./api/installation-guides');
const errorRemediationRouter = require('./api/error-remediation');
const safetyRouter = require('./api/safety');
const diagnosticRouter = require('./api/diagnostic');
const glossaryRouter = require('./api/glossary');
const rollbackRouter = require('./api/rollback');
const fallbackRouter = require('./api/fallback');
const nodeSyncRouter = require('./api/node-sync');
const wizardStateRouter = require('./api/wizard-state');
const backupRouter = require('./api/backup');
const dashboardIntegrationRouter = require('./api/dashboard-integration');

// Import utilities
const DockerManager = require('./utils/docker-manager');
const ConfigGenerator = require('./utils/config-generator');
const BackgroundTaskManager = require('./utils/background-task-manager');
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
const backgroundTaskManager = new BackgroundTaskManager(io);

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
app.use('/api/build-info', buildInfoRouter); // Build information (test vs production)
app.use('/api/system-check', systemCheckRouter);
app.use('/api/resource-check', resourceCheckRouter);
app.use('/api/content', contentRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/config', configRouter);
app.use('/api/install', installRouter);
app.use('/api/reconfigure', reconfigureRouter); // Reconfigure routes under /api/reconfigure
app.use('/api/wizard', reconfigureRouter); // Also mount under /api/wizard for current-config and reconfigure endpoints
app.use('/api/wizard/updates', updateRouter); // Update routes under /api/wizard/updates
app.use('/api/installation-guides', installationGuidesRouter);
app.use('/api/error-remediation', errorRemediationRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/glossary', glossaryRouter);
app.use('/api/rollback', rollbackRouter);
app.use('/api/config', fallbackRouter); // Fallback routes are under /api/config
app.use('/api/node', nodeSyncRouter);
app.use('/api/wizard', wizardStateRouter);
app.use('/api/wizard/backup', backupRouter); // Backup routes under /api/wizard/backup
app.use('/api/wizard/backups', backupRouter); // Also mount under /api/wizard/backups for list endpoint
app.use('/api/wizard/rollback', backupRouter); // Rollback endpoint under /api/wizard/rollback
app.use('/api/wizard', dashboardIntegrationRouter); // Dashboard integration routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Load existing configuration for reconfiguration mode
app.get('/api/wizard/current-config', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const dotenv = require('dotenv');
    
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    const envPath = path.join(projectRoot, '.env');
    const statePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    let config = {};
    let installationState = null;
    
    // Load .env file
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      config = dotenv.parse(envContent);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'No existing configuration found',
        message: 'The .env file does not exist'
      });
    }
    
    // Load installation state
    try {
      const stateContent = await fs.readFile(statePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch {
      // State file doesn't exist, that's okay
    }
    
    res.json({
      success: true,
      config,
      installationState,
      profiles: installationState?.profiles?.selected || [],
      lastModified: installationState?.lastModified || null,
      installedAt: installationState?.installedAt || null
    });
  } catch (error) {
    console.error('Error loading current configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
      message: error.message
    });
  }
});

// Wizard mode detection endpoint
app.get('/api/wizard/mode', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Get mode from URL parameter (if provided)
    const urlMode = req.query.mode;
    
    // Check for existing configuration files
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    const envPath = path.join(projectRoot, '.env');
    const statePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    let hasEnv = false;
    let hasState = false;
    let installationState = null;
    
    try {
      await fs.access(envPath);
      hasEnv = true;
    } catch {
      // .env doesn't exist
    }
    
    try {
      const stateContent = await fs.readFile(statePath, 'utf8');
      installationState = JSON.parse(stateContent);
      hasState = true;
    } catch {
      // installation-state.json doesn't exist
    }
    
    // Determine wizard mode
    let mode = 'initial'; // Default mode for fresh installation
    let reason = 'No existing configuration found';
    
    if (urlMode) {
      // URL parameter takes precedence
      if (['install', 'initial', 'reconfigure', 'reconfiguration', 'update'].includes(urlMode)) {
        mode = urlMode === 'install' ? 'initial' : urlMode === 'reconfiguration' ? 'reconfigure' : urlMode;
        reason = `Mode set via URL parameter: ${urlMode}`;
      }
    } else if (hasState && installationState) {
      // Check installation state
      if (installationState.phase === 'complete') {
        // Installation complete - allow reconfiguration
        mode = 'reconfigure';
        reason = hasEnv 
          ? 'Installation complete, configuration exists'
          : 'Installation complete (state file exists)';
      } else if (installationState.phase !== 'complete') {
        // Installation in progress or incomplete
        mode = 'initial';
        reason = 'Installation in progress or incomplete';
      }
    } else if (hasEnv) {
      // Has .env but no state - likely manual installation
      mode = 'reconfigure';
      reason = 'Configuration exists but no installation state';
    }
    
    // Get auto-start setting
    const autoStart = process.env.WIZARD_AUTO_START === 'true';
    
    res.json({
      mode,
      reason,
      autoStart,
      isFirstRun: autoStart && mode === 'initial',
      hasExistingConfig: hasEnv,
      hasInstallationState: hasState,
      installationPhase: installationState?.phase || null,
      canReconfigure: hasEnv || hasState,
      canUpdate: hasEnv && hasState && installationState?.phase === 'complete'
    });
  } catch (error) {
    console.error('Error detecting wizard mode:', error);
    res.status(500).json({
      error: 'Failed to detect wizard mode',
      message: error.message,
      mode: 'initial', // Fallback to initial mode
      reason: 'Error during detection'
    });
  }
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
      const envPath = path.resolve(__dirname, '../../../../.env');
      const saveResult = await configGenerator.saveEnvFile(envContent, envPath);

      if (!saveResult.success) {
        socket.emit('install:error', {
          stage: 'config',
          message: 'Failed to save configuration',
          error: saveResult.error
        });
        return;
      }

      // Generate and save docker-compose.yml
      const composeContent = await configGenerator.generateDockerCompose(configValidation.config, profiles);
      const composePath = path.resolve(__dirname, '../../../../docker-compose.yml');
      const composeResult = await configGenerator.saveDockerCompose(composeContent, composePath);

      if (!composeResult.success) {
        socket.emit('install:error', {
          stage: 'config',
          message: 'Failed to save docker-compose.yml',
          error: composeResult.error
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

  // Handle background task registration
  socket.on('task:register', async (data) => {
    try {
      const { type, service, config } = data;
      
      let result;
      if (type === 'node-sync') {
        result = await backgroundTaskManager.registerNodeSyncTask({
          service,
          ...config
        });
      } else if (type === 'indexer-sync') {
        result = await backgroundTaskManager.registerIndexerSyncTask({
          service,
          ...config
        });
      } else {
        result = await backgroundTaskManager.registerTask(data);
      }

      if (result.success) {
        socket.emit('task:registered', {
          taskId: result.taskId,
          task: result.task
        });
        
        // Auto-start monitoring
        await backgroundTaskManager.startMonitoring(result.taskId);
      } else {
        socket.emit('task:error', {
          error: result.error
        });
      }
    } catch (error) {
      socket.emit('task:error', {
        error: error.message
      });
    }
  });

  // Handle background task status request
  socket.on('task:status', async (data) => {
    try {
      const { taskId } = data;
      const task = backgroundTaskManager.getTask(taskId);
      
      if (task) {
        socket.emit('task:status:response', { task });
      } else {
        socket.emit('task:error', {
          error: `Task ${taskId} not found`
        });
      }
    } catch (error) {
      socket.emit('task:error', {
        error: error.message
      });
    }
  });

  // Handle get all tasks request
  socket.on('tasks:list', async () => {
    try {
      const tasks = backgroundTaskManager.getAllTasks();
      socket.emit('tasks:list:response', { tasks });
    } catch (error) {
      socket.emit('task:error', {
        error: error.message
      });
    }
  });

  // Handle task cancellation
  socket.on('task:cancel', async (data) => {
    try {
      const { taskId } = data;
      const result = await backgroundTaskManager.cancelTask(taskId);
      
      if (result.success) {
        socket.emit('task:cancelled', { taskId });
      } else {
        socket.emit('task:error', {
          error: result.error
        });
      }
    } catch (error) {
      socket.emit('task:error', {
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
  backgroundTaskManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  backgroundTaskManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
