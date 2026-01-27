const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execAsync = promisify(exec);

class ServiceMonitor {
    /**
     * Profile ID migration for backward compatibility
     */
    static PROFILE_MIGRATION = {
        'core': 'kaspa-node',
        'kaspa-user-applications': ['kasia-app', 'k-social-app', 'kaspa-explorer-bundle'],
        'indexer-services': ['kasia-indexer', 'k-indexer-bundle'],
        'archive-node': 'kaspa-archive-node',
        'mining': 'kaspa-stratum'
    };

    constructor() {
        this.checkInterval = 5000; // 5 seconds
        this.retryAttempts = 3;
        this.baseRetryDelay = 1000; // 1 second
        this.maxRetryDelay = 30000; // 30 seconds
        this.serviceDefinitions = this.getServiceDefinitions();
        this.dependencyGraph = this.buildDependencyGraph();
    }

    /**
     * Get services by profile (handles legacy profile IDs)
     */
    getServicesByProfile(profileId) {
        // Handle legacy profile IDs
        const migration = ServiceMonitor.PROFILE_MIGRATION[profileId];
        if (migration) {
            const profileIds = Array.isArray(migration) ? migration : [migration];
            return this.serviceDefinitions.filter(s => profileIds.includes(s.profile));
        }
        
        return this.serviceDefinitions.filter(s => s.profile === profileId);
    }

    getServiceDefinitions() {
        return [
            // Kaspa Node
            { 
                name: 'kaspa-node', 
                displayName: 'Kaspa Node', 
                url: 'http://kaspa-node:16110', 
                type: 'grpc', 
                profile: 'kaspa-node',  // Changed from 'core'
                dependencies: [],
                healthCheckPath: null,
                critical: true
            },
            
            // Kaspa Archive Node
            { 
                name: 'kaspa-archive-node', 
                displayName: 'Kaspa Archive Node', 
                url: 'http://kaspa-archive-node:16110', 
                type: 'grpc', 
                profile: 'kaspa-archive-node',  // Changed from 'archive-node'
                dependencies: [],
                healthCheckPath: null,
                critical: true
            },
            
            // Kasia App
            { 
                name: 'kasia-app', 
                displayName: 'Kasia App', 
                url: 'http://kasia-app:3000', 
                type: 'http', 
                profile: 'kasia-app',  // Changed from 'kaspa-user-applications'
                dependencies: [],
                healthCheckPath: '/health',
                critical: false
            },
            
            // K-Social App (container name is 'k-social')
            { 
                name: 'k-social', 
                displayName: 'K-Social', 
                url: 'http://k-social:3000', 
                type: 'http', 
                profile: 'k-social-app',  // Changed from 'kaspa-user-applications'
                dependencies: [],
                healthCheckPath: '/health',
                critical: false
            },
            
            // Kaspa Explorer (part of kaspa-explorer-bundle)
            { 
                name: 'kaspa-explorer', 
                displayName: 'Kaspa Explorer', 
                url: 'http://kaspa-explorer:80', 
                type: 'http', 
                profile: 'kaspa-explorer-bundle',  // Changed from 'kaspa-user-applications'
                dependencies: ['simply-kaspa-indexer'],
                healthCheckPath: '/health',
                critical: false
            },
            
            // Simply-Kaspa Indexer (part of kaspa-explorer-bundle)
            { 
                name: 'simply-kaspa-indexer', 
                displayName: 'Simply Kaspa Indexer', 
                url: 'http://simply-kaspa-indexer:3000', 
                type: 'http', 
                profile: 'kaspa-explorer-bundle',  // Changed from 'indexer-services'
                dependencies: ['timescaledb-explorer'],
                healthCheckPath: '/health',
                critical: false
            },
            
            // TimescaleDB for Explorer (part of kaspa-explorer-bundle)
            { 
                name: 'timescaledb-explorer', 
                displayName: 'TimescaleDB (Explorer)', 
                url: 'postgresql://timescaledb-explorer:5432', 
                type: 'postgres', 
                profile: 'kaspa-explorer-bundle',
                dependencies: [],
                healthCheckPath: null,
                critical: false
            },
            
            // Kasia Indexer
            { 
                name: 'kasia-indexer', 
                displayName: 'Kasia Indexer', 
                url: 'http://kasia-indexer:8080', 
                type: 'http', 
                profile: 'kasia-indexer',  // Changed from 'kaspa-user-applications'
                dependencies: [],
                healthCheckPath: '/health',
                critical: false
            },
            
            // K-Indexer (part of k-indexer-bundle)
            { 
                name: 'k-indexer', 
                displayName: 'K-Indexer', 
                url: 'http://k-indexer:8080', 
                type: 'http', 
                profile: 'k-indexer-bundle',  // Changed from 'indexer-services'
                dependencies: ['timescaledb-kindexer'],
                healthCheckPath: '/health',
                critical: false
            },
            
            // TimescaleDB for K-Indexer (part of k-indexer-bundle)
            { 
                name: 'timescaledb-kindexer', 
                displayName: 'TimescaleDB (K-Indexer)', 
                url: 'postgresql://timescaledb-kindexer:5432', 
                type: 'postgres', 
                profile: 'k-indexer-bundle',
                dependencies: [],
                healthCheckPath: null,
                critical: false
            },
            
            // Kaspa Stratum
            { 
                name: 'kaspa-stratum', 
                displayName: 'Kaspa Stratum', 
                url: 'http://kaspa-stratum:5555', 
                type: 'stratum', 
                profile: 'kaspa-stratum',  // Changed from 'mining'
                dependencies: ['kaspa-node'],
                healthCheckPath: null,
                critical: false
            },
            
            // Management Tools
            { 
                name: 'portainer', 
                displayName: 'Portainer', 
                url: 'http://portainer:9000', 
                type: 'http', 
                profile: 'management',
                dependencies: [],
                healthCheckPath: '/api/status',
                critical: false
            },
            { 
                name: 'pgadmin', 
                displayName: 'pgAdmin', 
                url: 'http://pgadmin:80', 
                type: 'http', 
                profile: 'management',
                dependencies: [],
                healthCheckPath: '/misc/ping',
                critical: false
            }
        ];
    }

    buildDependencyGraph() {
        const graph = new Map();
        
        this.serviceDefinitions.forEach(service => {
            graph.set(service.name, {
                dependencies: service.dependencies || [],
                dependents: []
            });
        });

        // Build reverse dependencies (dependents)
        this.serviceDefinitions.forEach(service => {
            service.dependencies?.forEach(dep => {
                if (graph.has(dep)) {
                    graph.get(dep).dependents.push(service.name);
                }
            });
        });

        return graph;
    }

    async getDockerServices() {
        try {
            const { stdout } = await execAsync('docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.State}}\t{{.Image}}"');
            const services = new Map();
            
            stdout.trim().split('\n').filter(line => line).forEach(line => {
                const [name, status, state, image] = line.split('\t');
                services.set(name, { 
                    status, 
                    state: state.toLowerCase(),
                    image,
                    isRunning: state.toLowerCase() === 'running'
                });
            });
            
            return services;
        } catch (error) {
            console.error('Failed to get Docker services:', error);
            return new Map();
        }
    }

    async checkAllServices() {
        const dockerServices = await this.getDockerServices();
        const results = await Promise.allSettled(
            this.serviceDefinitions.map(service => this.checkService(service, dockerServices))
        );
        
        return results.map(result => 
            result.status === 'fulfilled' ? result.value : {
                ...result.reason,
                status: 'error',
                error: result.reason.message || 'Unknown error'
            }
        );
    }

    async checkService(service, dockerInfo) {
        const containerInfo = dockerInfo.get(service.name);
        const dependencyStatus = await this.checkDependencies(service.name);
        
        if (!containerInfo) {
            return { 
                ...service, 
                status: 'stopped', 
                state: 'not_running',
                lastCheck: new Date().toISOString(),
                dependencyStatus,
                uptime: null
            };
        }

        if (!containerInfo.isRunning) {
            return { 
                ...service, 
                status: 'stopped', 
                state: containerInfo.state,
                dockerStatus: containerInfo.status,
                lastCheck: new Date().toISOString(),
                dependencyStatus,
                uptime: null
            };
        }

        try {
            const healthResult = await this.performHealthCheckWithRetry(service);
            return { 
                ...service, 
                status: 'healthy', 
                state: containerInfo.state,
                dockerStatus: containerInfo.status,
                lastCheck: new Date().toISOString(),
                dependencyStatus,
                uptime: await this.getServiceUptime(service.name),
                version: await this.getServiceVersion(service.name)
            };
        } catch (error) {
            // For kaspa-node, if container is running but RPC not responding, it's likely syncing
            const isSyncing = service.name === 'kaspa-node' && 
                             containerInfo.isRunning && 
                             (error.message.includes('Parse Error') || 
                              error.message.includes('ECONNREFUSED') ||
                              error.message.includes('timeout'));
            
            return { 
                ...service, 
                status: isSyncing ? 'syncing' : 'unhealthy',
                state: containerInfo.state,
                dockerStatus: containerInfo.status,
                error: isSyncing ? 'Node is syncing with network' : error.message, 
                lastCheck: new Date().toISOString(),
                dependencyStatus,
                uptime: await this.getServiceUptime(service.name)
            };
        }
    }

    async performHealthCheckWithRetry(service) {
        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                await this.performHealthCheck(service);
                return; // Success
            } catch (error) {
                lastError = error;
                
                if (attempt < this.retryAttempts - 1) {
                    const delay = Math.min(
                        this.baseRetryDelay * Math.pow(2, attempt),
                        this.maxRetryDelay
                    );
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    async performHealthCheck(service) {
        const timeout = 5000;
        
        switch (service.type) {
            case 'rpc':
                return await this.checkRpcHealth(service, timeout);
            case 'http':
                return await this.checkHttpHealth(service, timeout);
            case 'tcp':
                return await this.checkTcpHealth(service, timeout);
            case 'postgres':
                return await this.checkPostgresHealth(service, timeout);
            default:
                throw new Error(`Unknown service type: ${service.type}`);
        }
    }

    async checkRpcHealth(service, timeout) {
        const response = await axios.post(service.url, {
            method: 'ping',
            params: {}
        }, { timeout });
        
        if (response.status !== 200) {
            throw new Error(`RPC health check failed with status ${response.status}`);
        }
    }

    async checkHttpHealth(service, timeout) {
        const healthUrl = service.healthCheckPath 
            ? `${service.url}${service.healthCheckPath}`
            : `${service.url}/health`;
            
        const response = await axios.get(healthUrl, { timeout });
        
        if (response.status !== 200) {
            throw new Error(`HTTP health check failed with status ${response.status}`);
        }
    }

    async checkTcpHealth(service, timeout) {
        // For TCP services, we'll try to connect to the port
        const url = new URL(service.url);
        const host = url.hostname;
        const port = url.port;
        
        return new Promise((resolve, reject) => {
            const net = require('net');
            const socket = new net.Socket();
            
            const timer = setTimeout(() => {
                socket.destroy();
                reject(new Error('TCP connection timeout'));
            }, timeout);
            
            socket.connect(port, host, () => {
                clearTimeout(timer);
                socket.destroy();
                resolve();
            });
            
            socket.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    async checkPostgresHealth(service, timeout) {
        // For PostgreSQL, we'll use docker exec to run a simple query
        const containerName = service.name;
        try {
            await execAsync(`docker exec ${containerName} pg_isready -h localhost`, { timeout });
        } catch (error) {
            throw new Error(`PostgreSQL health check failed: ${error.message}`);
        }
    }

    async checkDependencies(serviceName) {
        const dependencies = this.dependencyGraph.get(serviceName)?.dependencies || [];
        const dockerServices = await this.getDockerServices();
        
        const dependencyResults = await Promise.all(
            dependencies.map(async (depName) => {
                const depContainer = dockerServices.get(depName);
                const isHealthy = depContainer?.isRunning || false;
                
                return {
                    name: depName,
                    healthy: isHealthy,
                    required: true
                };
            })
        );
        
        return {
            allHealthy: dependencyResults.every(dep => dep.healthy),
            dependencies: dependencyResults
        };
    }

    async getServiceUptime(serviceName) {
        try {
            const { stdout } = await execAsync(`docker inspect ${serviceName} --format='{{.State.StartedAt}}'`);
            const startTime = new Date(stdout.trim());
            const uptime = Date.now() - startTime.getTime();
            return Math.floor(uptime / 1000); // Return uptime in seconds
        } catch (error) {
            return null;
        }
    }

    async getServiceVersion(serviceName) {
        try {
            const { stdout } = await execAsync(`docker inspect ${serviceName} --format='{{.Config.Image}}'`);
            const image = stdout.trim();
            const tagMatch = image.match(/:([^:]+)$/);
            return tagMatch ? tagMatch[1] : 'latest';
        } catch (error) {
            return null;
        }
    }

    validateStartupOrder(servicesToStart) {
        const sorted = this.topologicalSort(servicesToStart);
        return sorted;
    }

    topologicalSort(serviceNames) {
        const visited = new Set();
        const visiting = new Set();
        const result = [];
        
        const visit = (serviceName) => {
            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected involving ${serviceName}`);
            }
            
            if (visited.has(serviceName)) {
                return;
            }
            
            visiting.add(serviceName);
            
            const dependencies = this.dependencyGraph.get(serviceName)?.dependencies || [];
            dependencies.forEach(dep => {
                if (serviceNames.includes(dep)) {
                    visit(dep);
                }
            });
            
            visiting.delete(serviceName);
            visited.add(serviceName);
            result.push(serviceName);
        };
        
        serviceNames.forEach(serviceName => {
            if (!visited.has(serviceName)) {
                visit(serviceName);
            }
        });
        
        return result;
    }

    getDependents(serviceName) {
        return this.dependencyGraph.get(serviceName)?.dependents || [];
    }

    getDependencies(serviceName) {
        return this.dependencyGraph.get(serviceName)?.dependencies || [];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ServiceMonitor;