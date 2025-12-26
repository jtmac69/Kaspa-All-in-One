const { exec } = require('child_process');
const { promisify } = require('util');
const ServiceMonitor = require('./ServiceMonitor');

const execAsync = promisify(exec);

class ServiceController {
    constructor() {
        this.serviceMonitor = new ServiceMonitor();
        this.operationTimeout = 60000; // 60 seconds
        this.gracefulStopTimeout = 30000; // 30 seconds
        this.activeOperations = new Map(); // Track ongoing operations
    }

    async startService(serviceName, options = {}) {
        const operationId = this.generateOperationId();
        
        try {
            this.activeOperations.set(operationId, {
                type: 'start',
                service: serviceName,
                status: 'starting',
                startTime: new Date().toISOString()
            });

            // Check if service exists
            await this.validateServiceExists(serviceName);

            // Check dependencies
            const dependencyCheck = await this.checkDependencies(serviceName);
            if (!dependencyCheck.canStart) {
                throw new Error(`Cannot start ${serviceName}: ${dependencyCheck.reason}`);
            }

            // Start the service
            const result = await this.executeDockerCommand('start', serviceName);
            
            // Wait for service to be healthy (if it has health checks)
            if (options.waitForHealthy !== false) {
                await this.waitForServiceHealthy(serviceName);
            }

            this.activeOperations.set(operationId, {
                type: 'start',
                service: serviceName,
                status: 'completed',
                startTime: this.activeOperations.get(operationId).startTime,
                endTime: new Date().toISOString()
            });

            return {
                success: true,
                operationId,
                service: serviceName,
                message: `Service ${serviceName} started successfully`,
                output: result.stdout,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.activeOperations.set(operationId, {
                type: 'start',
                service: serviceName,
                status: 'failed',
                error: error.message,
                startTime: this.activeOperations.get(operationId)?.startTime,
                endTime: new Date().toISOString()
            });

            throw new Error(`Failed to start ${serviceName}: ${error.message}`);
        }
    }

    async stopService(serviceName, options = {}) {
        const operationId = this.generateOperationId();
        
        try {
            this.activeOperations.set(operationId, {
                type: 'stop',
                service: serviceName,
                status: 'stopping',
                startTime: new Date().toISOString()
            });

            // Check if service exists
            await this.validateServiceExists(serviceName);

            // Check dependents
            const dependentCheck = await this.checkDependents(serviceName);
            if (!dependentCheck.canStop && !options.force) {
                throw new Error(`Cannot stop ${serviceName}: ${dependentCheck.reason}. Use force=true to override.`);
            }

            // Stop dependents first if force is enabled
            if (options.force && dependentCheck.dependents.length > 0) {
                await this.stopDependents(dependentCheck.dependents);
            }

            // Perform graceful stop
            const result = await this.gracefulStop(serviceName, options);

            this.activeOperations.set(operationId, {
                type: 'stop',
                service: serviceName,
                status: 'completed',
                startTime: this.activeOperations.get(operationId).startTime,
                endTime: new Date().toISOString()
            });

            return {
                success: true,
                operationId,
                service: serviceName,
                message: `Service ${serviceName} stopped successfully`,
                output: result.stdout,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.activeOperations.set(operationId, {
                type: 'stop',
                service: serviceName,
                status: 'failed',
                error: error.message,
                startTime: this.activeOperations.get(operationId)?.startTime,
                endTime: new Date().toISOString()
            });

            throw new Error(`Failed to stop ${serviceName}: ${error.message}`);
        }
    }

    async restartService(serviceName, options = {}) {
        const operationId = this.generateOperationId();
        
        try {
            this.activeOperations.set(operationId, {
                type: 'restart',
                service: serviceName,
                status: 'restarting',
                startTime: new Date().toISOString()
            });

            // Check if service exists
            await this.validateServiceExists(serviceName);

            // Perform restart
            const result = await this.executeDockerCommand('restart', serviceName);
            
            // Wait for service to be healthy
            if (options.waitForHealthy !== false) {
                await this.waitForServiceHealthy(serviceName);
            }

            this.activeOperations.set(operationId, {
                type: 'restart',
                service: serviceName,
                status: 'completed',
                startTime: this.activeOperations.get(operationId).startTime,
                endTime: new Date().toISOString()
            });

            return {
                success: true,
                operationId,
                service: serviceName,
                message: `Service ${serviceName} restarted successfully`,
                output: result.stdout,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.activeOperations.set(operationId, {
                type: 'restart',
                service: serviceName,
                status: 'failed',
                error: error.message,
                startTime: this.activeOperations.get(operationId)?.startTime,
                endTime: new Date().toISOString()
            });

            throw new Error(`Failed to restart ${serviceName}: ${error.message}`);
        }
    }

    async restartAllServices(options = {}) {
        const operationId = this.generateOperationId();
        
        try {
            this.activeOperations.set(operationId, {
                type: 'restart_all',
                status: 'starting',
                startTime: new Date().toISOString()
            });

            // Get all running services
            const runningServices = await this.getRunningServices();
            
            // Determine restart order based on dependencies
            const restartOrder = this.serviceMonitor.validateStartupOrder(runningServices);
            
            const results = [];
            
            // Stop services in reverse dependency order
            const stopOrder = [...restartOrder].reverse();
            for (const serviceName of stopOrder) {
                try {
                    await this.stopService(serviceName, { force: false, waitForHealthy: false });
                    results.push({ service: serviceName, action: 'stop', success: true });
                } catch (error) {
                    results.push({ service: serviceName, action: 'stop', success: false, error: error.message });
                }
            }

            // Wait a moment for services to fully stop
            await this.sleep(2000);

            // Start services in dependency order
            for (const serviceName of restartOrder) {
                try {
                    await this.startService(serviceName, { waitForHealthy: false });
                    results.push({ service: serviceName, action: 'start', success: true });
                } catch (error) {
                    results.push({ service: serviceName, action: 'start', success: false, error: error.message });
                }
            }

            this.activeOperations.set(operationId, {
                type: 'restart_all',
                status: 'completed',
                startTime: this.activeOperations.get(operationId).startTime,
                endTime: new Date().toISOString(),
                results
            });

            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;

            return {
                success: successCount === totalCount,
                operationId,
                message: `Restarted ${successCount}/${totalCount} services successfully`,
                results,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.activeOperations.set(operationId, {
                type: 'restart_all',
                status: 'failed',
                error: error.message,
                startTime: this.activeOperations.get(operationId)?.startTime,
                endTime: new Date().toISOString()
            });

            throw new Error(`Failed to restart all services: ${error.message}`);
        }
    }

    async checkDependencies(serviceName) {
        const dependencies = this.serviceMonitor.getDependencies(serviceName);
        const dockerServices = await this.serviceMonitor.getDockerServices();
        
        const unhealthyDeps = [];
        
        for (const dep of dependencies) {
            const depContainer = dockerServices.get(dep);
            if (!depContainer || !depContainer.isRunning) {
                unhealthyDeps.push(dep);
            }
        }

        return {
            canStart: unhealthyDeps.length === 0,
            dependencies,
            unhealthyDependencies: unhealthyDeps,
            reason: unhealthyDeps.length > 0 
                ? `Dependencies not running: ${unhealthyDeps.join(', ')}`
                : 'All dependencies are healthy'
        };
    }

    async checkDependents(serviceName) {
        const dependents = this.serviceMonitor.getDependents(serviceName);
        const dockerServices = await this.serviceMonitor.getDockerServices();
        
        const runningDependents = [];
        
        for (const dependent of dependents) {
            const depContainer = dockerServices.get(dependent);
            if (depContainer && depContainer.isRunning) {
                runningDependents.push(dependent);
            }
        }

        return {
            canStop: runningDependents.length === 0,
            dependents,
            runningDependents,
            reason: runningDependents.length > 0 
                ? `Services depend on this: ${runningDependents.join(', ')}`
                : 'No running dependents'
        };
    }

    async stopDependents(dependents) {
        const results = [];
        
        for (const dependent of dependents) {
            try {
                await this.stopService(dependent, { force: true, waitForHealthy: false });
                results.push({ service: dependent, success: true });
            } catch (error) {
                results.push({ service: dependent, success: false, error: error.message });
            }
        }

        return results;
    }

    async gracefulStop(serviceName, options = {}) {
        try {
            // Try graceful stop first
            const result = await execAsync(`docker stop -t ${this.gracefulStopTimeout / 1000} ${serviceName}`, {
                timeout: this.operationTimeout
            });
            
            return result;
        } catch (error) {
            if (options.force) {
                // Force kill if graceful stop fails
                console.warn(`Graceful stop failed for ${serviceName}, forcing...`);
                return await execAsync(`docker kill ${serviceName}`, {
                    timeout: this.operationTimeout
                });
            }
            throw error;
        }
    }

    async executeDockerCommand(command, serviceName) {
        const dockerCommand = `docker ${command} ${serviceName}`;
        
        try {
            const result = await execAsync(dockerCommand, {
                timeout: this.operationTimeout
            });
            
            return result;
        } catch (error) {
            throw new Error(`Docker command failed: ${error.message}`);
        }
    }

    async validateServiceExists(serviceName) {
        try {
            await execAsync(`docker inspect ${serviceName}`, { timeout: 5000 });
        } catch (error) {
            throw new Error(`Service ${serviceName} does not exist`);
        }
    }

    async waitForServiceHealthy(serviceName, maxWaitTime = 30000) {
        const startTime = Date.now();
        const checkInterval = 2000; // 2 seconds
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const services = await this.serviceMonitor.checkAllServices();
                const service = services.find(s => s.name === serviceName);
                
                if (service && service.status === 'healthy') {
                    return true;
                }
                
                if (service && service.status === 'unhealthy') {
                    // Service is running but unhealthy, continue waiting
                    await this.sleep(checkInterval);
                    continue;
                }
                
                await this.sleep(checkInterval);
            } catch (error) {
                // Continue waiting even if health check fails
                await this.sleep(checkInterval);
            }
        }
        
        // Don't throw error, just log warning
        console.warn(`Service ${serviceName} did not become healthy within ${maxWaitTime}ms`);
        return false;
    }

    async getRunningServices() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
            return stdout.trim().split('\n').filter(name => name);
        } catch (error) {
            return [];
        }
    }

    async getOperationStatus(operationId) {
        return this.activeOperations.get(operationId) || null;
    }

    async getAllOperations(limit = 50) {
        const operations = Array.from(this.activeOperations.entries())
            .map(([id, op]) => ({ id, ...op }))
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit);
            
        return operations;
    }

    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clean up old operations (call periodically)
    cleanupOldOperations(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const cutoff = Date.now() - maxAge;
        
        for (const [id, operation] of this.activeOperations.entries()) {
            const operationTime = new Date(operation.startTime).getTime();
            if (operationTime < cutoff) {
                this.activeOperations.delete(id);
            }
        }
    }

    // Get service control capabilities
    async getServiceCapabilities(serviceName) {
        try {
            const dependencyCheck = await this.checkDependencies(serviceName);
            const dependentCheck = await this.checkDependents(serviceName);
            const dockerServices = await this.serviceMonitor.getDockerServices();
            const serviceInfo = dockerServices.get(serviceName);

            return {
                canStart: !serviceInfo?.isRunning && dependencyCheck.canStart,
                canStop: serviceInfo?.isRunning && dependentCheck.canStop,
                canRestart: serviceInfo?.isRunning,
                canForceStop: serviceInfo?.isRunning,
                dependencies: dependencyCheck.dependencies,
                dependents: dependentCheck.dependents,
                isRunning: serviceInfo?.isRunning || false,
                state: serviceInfo?.state || 'unknown'
            };
        } catch (error) {
            return {
                canStart: false,
                canStop: false,
                canRestart: false,
                canForceStop: false,
                dependencies: [],
                dependents: [],
                isRunning: false,
                state: 'error',
                error: error.message
            };
        }
    }
}

module.exports = ServiceController;