const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ConfigurationAnalyzer {
    constructor() {
        this.suggestions = [];
        this.analysisCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Define suggestion types and their priorities
        this.suggestionTypes = {
            'performance': { priority: 'high', category: 'Performance' },
            'security': { priority: 'critical', category: 'Security' },
            'optimization': { priority: 'medium', category: 'Optimization' },
            'configuration': { priority: 'medium', category: 'Configuration' },
            'resource': { priority: 'high', category: 'Resource Management' },
            'indexer': { priority: 'medium', category: 'Indexer Optimization' }
        };
    }

    async analyzeConfiguration() {
        try {
            // Check cache first
            const cacheKey = 'full_analysis';
            const cached = this.analysisCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.data;
            }

            this.suggestions = [];

            // Analyze different aspects of the configuration
            await Promise.all([
                this.analyzeProfileConfiguration(),
                this.analyzeResourceUsage(),
                this.analyzeIndexerConfiguration(),
                this.analyzeSecurityConfiguration(),
                this.analyzePerformanceConfiguration(),
                this.analyzeWalletConfiguration(),
                this.analyzeNetworkConfiguration()
            ]);

            // Sort suggestions by priority and impact
            this.suggestions.sort((a, b) => {
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                
                const aPriorityScore = priorityOrder[a.priority] || 0;
                const bPriorityScore = priorityOrder[b.priority] || 0;
                
                if (aPriorityScore !== bPriorityScore) {
                    return bPriorityScore - aPriorityScore;
                }
                
                const aImpactScore = impactOrder[a.impact] || 0;
                const bImpactScore = impactOrder[b.impact] || 0;
                
                return bImpactScore - aImpactScore;
            });

            const result = {
                suggestions: this.suggestions,
                totalSuggestions: this.suggestions.length,
                criticalSuggestions: this.suggestions.filter(s => s.priority === 'critical').length,
                highPrioritySuggestions: this.suggestions.filter(s => s.priority === 'high').length,
                categories: this.groupSuggestionsByCategory(),
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.analysisCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            throw new Error(`Failed to analyze configuration: ${error.message}`);
        }
    }

    async analyzeProfileConfiguration() {
        try {
            const currentProfiles = await this.getCurrentProfiles();
            const runningServices = await this.getRunningServices();

            // Check for profile optimization opportunities
            if (currentProfiles.includes('kaspa-user-applications') && 
                (currentProfiles.includes('indexer-services') || runningServices.includes('k-indexer'))) {
                
                // Check if apps are using local indexers
                const indexerConnections = await this.checkIndexerConnections();
                
                if (indexerConnections.usingPublicIndexers) {
                    this.addSuggestion({
                        id: 'switch-to-local-indexers',
                        type: 'optimization',
                        title: 'Switch to Local Indexers',
                        description: 'Your applications are using public indexers while you have local indexers running. Switching to local indexers will improve performance and reduce external dependencies.',
                        impact: 'high',
                        effort: 'low',
                        wizardContext: {
                            mode: 'reconfigure',
                            focus: 'indexer-connections',
                            suggestedChanges: {
                                'KASIA_INDEXER_URL': 'http://kasia-indexer:8080',
                                'K_SOCIAL_INDEXER_URL': 'http://k-indexer:8080'
                            }
                        },
                        benefits: [
                            'Faster response times',
                            'Reduced external dependencies',
                            'Better reliability',
                            'Lower bandwidth usage'
                        ]
                    });
                }
            }

            // Check for missing complementary profiles
            if (currentProfiles.includes('kaspa-user-applications') && 
                !currentProfiles.includes('indexer-services')) {
                
                this.addSuggestion({
                    id: 'add-indexer-services',
                    type: 'configuration',
                    title: 'Add Indexer Services Profile',
                    description: 'You have user applications but no local indexers. Adding indexer services will improve performance and reduce reliance on external services.',
                    impact: 'medium',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'add-profile',
                        profile: 'indexer-services'
                    },
                    benefits: [
                        'Local data processing',
                        'Improved performance',
                        'Better control over data'
                    ]
                });
            }

            // Check for developer mode opportunities
            if (currentProfiles.length > 1 && !currentProfiles.includes('developer-mode')) {
                this.addSuggestion({
                    id: 'enable-developer-mode',
                    type: 'configuration',
                    title: 'Enable Developer Mode',
                    description: 'With multiple profiles active, developer mode would provide useful tools like Portainer and pgAdmin for system management.',
                    impact: 'low',
                    effort: 'low',
                    wizardContext: {
                        mode: 'add-profile',
                        profile: 'developer-mode'
                    },
                    benefits: [
                        'Container management with Portainer',
                        'Database administration with pgAdmin',
                        'Better debugging capabilities'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze profile configuration:', error.message);
        }
    }

    async analyzeResourceUsage() {
        try {
            const resourceMetrics = await this.getResourceMetrics();
            const dockerLimits = await this.getDockerResourceLimits();

            // Check for high resource usage
            if (resourceMetrics.memory > 85) {
                this.addSuggestion({
                    id: 'high-memory-usage',
                    type: 'resource',
                    title: 'High Memory Usage Detected',
                    description: `System memory usage is at ${resourceMetrics.memory.toFixed(1)}%. Consider optimizing services or adding resource limits.`,
                    impact: 'high',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'resource-optimization',
                        focus: 'memory'
                    },
                    benefits: [
                        'Prevent system freezes',
                        'Improve stability',
                        'Better resource allocation'
                    ]
                });
            }

            // Check for services without resource limits
            const servicesWithoutLimits = await this.getServicesWithoutResourceLimits(dockerLimits);
            if (servicesWithoutLimits.length > 0) {
                this.addSuggestion({
                    id: 'add-resource-limits',
                    type: 'resource',
                    title: 'Add Resource Limits to Services',
                    description: `${servicesWithoutLimits.length} services are running without resource limits. This can lead to resource contention.`,
                    impact: 'medium',
                    effort: 'low',
                    wizardContext: {
                        mode: 'resource-limits',
                        services: servicesWithoutLimits
                    },
                    benefits: [
                        'Prevent resource hogging',
                        'Better system stability',
                        'Predictable performance'
                    ]
                });
            }

            // Check CPU usage patterns
            if (resourceMetrics.cpu > 80) {
                this.addSuggestion({
                    id: 'high-cpu-usage',
                    type: 'performance',
                    title: 'High CPU Usage Detected',
                    description: `CPU usage is at ${resourceMetrics.cpu.toFixed(1)}%. Consider optimizing services or scaling resources.`,
                    impact: 'high',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'performance-optimization',
                        focus: 'cpu'
                    },
                    benefits: [
                        'Improved responsiveness',
                        'Better system performance',
                        'Reduced bottlenecks'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze resource usage:', error.message);
        }
    }

    async analyzeIndexerConfiguration() {
        try {
            const runningServices = await this.getRunningServices();
            const indexerServices = ['k-indexer', 'simply-kaspa-indexer', 'kasia-indexer'];
            const runningIndexers = indexerServices.filter(service => runningServices.includes(service));

            if (runningIndexers.length > 0) {
                // Check indexer sync status
                const syncStatus = await this.checkIndexerSyncStatus(runningIndexers);
                
                for (const indexer of runningIndexers) {
                    const status = syncStatus[indexer];
                    if (status && !status.synced) {
                        this.addSuggestion({
                            id: `indexer-sync-${indexer}`,
                            type: 'performance',
                            title: `${indexer} Not Synced`,
                            description: `The ${indexer} service is not fully synced with the Kaspa network. This may affect application performance.`,
                            impact: 'medium',
                            effort: 'low',
                            wizardContext: {
                                mode: 'service-management',
                                service: indexer,
                                action: 'restart'
                            },
                            benefits: [
                                'Up-to-date blockchain data',
                                'Improved application performance',
                                'Accurate transaction information'
                            ]
                        });
                    }
                }

                // Check for database optimization opportunities
                if (runningServices.includes('indexer-db')) {
                    const dbOptimization = await this.checkDatabaseOptimization();
                    if (dbOptimization.needsOptimization) {
                        this.addSuggestion({
                            id: 'optimize-indexer-database',
                            type: 'performance',
                            title: 'Optimize Indexer Database',
                            description: 'The indexer database could benefit from optimization to improve query performance.',
                            impact: 'medium',
                            effort: 'medium',
                            wizardContext: {
                                mode: 'database-optimization',
                                service: 'indexer-db'
                            },
                            benefits: [
                                'Faster query responses',
                                'Reduced resource usage',
                                'Better indexer performance'
                            ]
                        });
                    }
                }
            }

        } catch (error) {
            console.warn('Failed to analyze indexer configuration:', error.message);
        }
    }

    async analyzeSecurityConfiguration() {
        try {
            const envConfig = await this.getEnvironmentConfig();
            
            // Check for default passwords
            const defaultPasswords = this.checkForDefaultPasswords(envConfig);
            if (defaultPasswords.length > 0) {
                this.addSuggestion({
                    id: 'change-default-passwords',
                    type: 'security',
                    title: 'Change Default Passwords',
                    description: `${defaultPasswords.length} services are using default passwords. This is a security risk.`,
                    impact: 'high',
                    effort: 'low',
                    wizardContext: {
                        mode: 'security-hardening',
                        focus: 'passwords',
                        services: defaultPasswords
                    },
                    benefits: [
                        'Improved security',
                        'Reduced attack surface',
                        'Better access control'
                    ]
                });
            }

            // Check for SSL/TLS configuration
            if (!envConfig.ENABLE_SSL && !envConfig.HTTPS_ENABLED) {
                this.addSuggestion({
                    id: 'enable-ssl',
                    type: 'security',
                    title: 'Enable SSL/TLS',
                    description: 'SSL/TLS is not enabled. This means data is transmitted unencrypted.',
                    impact: 'high',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'ssl-configuration'
                    },
                    benefits: [
                        'Encrypted data transmission',
                        'Better security',
                        'Protection against eavesdropping'
                    ]
                });
            }

            // Check for exposed ports
            const exposedPorts = await this.checkExposedPorts();
            if (exposedPorts.unnecessary.length > 0) {
                this.addSuggestion({
                    id: 'secure-exposed-ports',
                    type: 'security',
                    title: 'Secure Exposed Ports',
                    description: `${exposedPorts.unnecessary.length} ports are unnecessarily exposed to the host network.`,
                    impact: 'medium',
                    effort: 'low',
                    wizardContext: {
                        mode: 'port-security',
                        ports: exposedPorts.unnecessary
                    },
                    benefits: [
                        'Reduced attack surface',
                        'Better network security',
                        'Improved isolation'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze security configuration:', error.message);
        }
    }

    async analyzePerformanceConfiguration() {
        try {
            const kaspaNodeStatus = await this.getKaspaNodeStatus();
            
            // Check Kaspa node sync status
            if (kaspaNodeStatus && !kaspaNodeStatus.isSynced) {
                this.addSuggestion({
                    id: 'kaspa-node-sync',
                    type: 'performance',
                    title: 'Kaspa Node Not Synced',
                    description: 'The Kaspa node is not fully synced with the network. This affects all dependent services.',
                    impact: 'high',
                    effort: 'low',
                    wizardContext: {
                        mode: 'node-optimization',
                        action: 'sync-check'
                    },
                    benefits: [
                        'Up-to-date blockchain data',
                        'Better service performance',
                        'Accurate network information'
                    ]
                });
            }

            // Check for performance optimizations
            const performanceMetrics = await this.getPerformanceMetrics();
            if (performanceMetrics.slowQueries > 0) {
                this.addSuggestion({
                    id: 'optimize-database-queries',
                    type: 'performance',
                    title: 'Optimize Database Queries',
                    description: `${performanceMetrics.slowQueries} slow database queries detected. Optimization could improve performance.`,
                    impact: 'medium',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'query-optimization'
                    },
                    benefits: [
                        'Faster response times',
                        'Reduced resource usage',
                        'Better user experience'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze performance configuration:', error.message);
        }
    }

    async analyzeWalletConfiguration() {
        try {
            const walletStatus = await this.getWalletStatus();
            
            if (!walletStatus.configured) {
                this.addSuggestion({
                    id: 'configure-wallet',
                    type: 'configuration',
                    title: 'Configure Kaspa Wallet',
                    description: 'No wallet is configured. Setting up a wallet enables transaction management through the dashboard.',
                    impact: 'low',
                    effort: 'low',
                    wizardContext: {
                        mode: 'wallet-setup'
                    },
                    benefits: [
                        'Transaction management',
                        'Balance monitoring',
                        'Address generation'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze wallet configuration:', error.message);
        }
    }

    async analyzeNetworkConfiguration() {
        try {
            const networkConfig = await this.getNetworkConfiguration();
            
            // Check for network optimization opportunities
            if (networkConfig.usingDefaultNetworks) {
                this.addSuggestion({
                    id: 'optimize-docker-networks',
                    type: 'optimization',
                    title: 'Optimize Docker Networks',
                    description: 'Services are using default Docker networks. Custom networks can improve performance and security.',
                    impact: 'low',
                    effort: 'medium',
                    wizardContext: {
                        mode: 'network-optimization'
                    },
                    benefits: [
                        'Better network isolation',
                        'Improved performance',
                        'Enhanced security'
                    ]
                });
            }

        } catch (error) {
            console.warn('Failed to analyze network configuration:', error.message);
        }
    }

    addSuggestion(suggestion) {
        const suggestionType = this.suggestionTypes[suggestion.type] || { priority: 'low', category: 'Other' };
        
        this.suggestions.push({
            ...suggestion,
            priority: suggestion.priority || suggestionType.priority,
            category: suggestionType.category,
            timestamp: new Date().toISOString(),
            score: this.calculateSuggestionScore(suggestion)
        });
    }

    calculateSuggestionScore(suggestion) {
        const priorityScores = { 'critical': 100, 'high': 75, 'medium': 50, 'low': 25 };
        const impactScores = { 'high': 30, 'medium': 20, 'low': 10 };
        const effortScores = { 'low': 20, 'medium': 10, 'high': 5 }; // Lower effort = higher score
        
        const priorityScore = priorityScores[suggestion.priority] || 0;
        const impactScore = impactScores[suggestion.impact] || 0;
        const effortScore = effortScores[suggestion.effort] || 0;
        
        return priorityScore + impactScore + effortScore;
    }

    groupSuggestionsByCategory() {
        const categories = {};
        
        this.suggestions.forEach(suggestion => {
            if (!categories[suggestion.category]) {
                categories[suggestion.category] = [];
            }
            categories[suggestion.category].push(suggestion);
        });
        
        return categories;
    }

    // Helper methods to gather system information
    async getCurrentProfiles() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}" | grep -E "(kasia|k-social|k-indexer|simply-kaspa|portainer|pgadmin|archive)"');
            const runningServices = stdout.trim().split('\n').filter(s => s);
            
            const profiles = new Set(['core']); // Core is always active
            
            if (runningServices.some(s => s.includes('kasia') || s.includes('k-social') || s.includes('kaspa-explorer'))) {
                profiles.add('kaspa-user-applications');
            }
            
            if (runningServices.some(s => s.includes('k-indexer') || s.includes('simply-kaspa-indexer'))) {
                profiles.add('indexer-services');
            }
            
            if (runningServices.some(s => s.includes('archive'))) {
                profiles.add('archive-node');
            }
            
            if (runningServices.some(s => s.includes('stratum'))) {
                profiles.add('mining');
            }
            
            if (runningServices.some(s => s.includes('portainer') || s.includes('pgadmin'))) {
                profiles.add('developer-mode');
            }
            
            return Array.from(profiles);
        } catch (error) {
            return ['core'];
        }
    }

    async getRunningServices() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
            return stdout.trim().split('\n').filter(s => s);
        } catch (error) {
            return [];
        }
    }

    async checkIndexerConnections() {
        try {
            const envConfig = await this.getEnvironmentConfig();
            
            // Check if apps are configured to use local indexers
            const usingPublicIndexers = 
                (envConfig.KASIA_INDEXER_URL && envConfig.KASIA_INDEXER_URL.includes('api.kaspa')) ||
                (envConfig.K_SOCIAL_INDEXER_URL && envConfig.K_SOCIAL_INDEXER_URL.includes('api.kaspa'));
            
            return { usingPublicIndexers };
        } catch (error) {
            return { usingPublicIndexers: false };
        }
    }

    async getResourceMetrics() {
        try {
            const [cpuInfo, memInfo] = await Promise.all([
                execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").catch(() => ({ stdout: '0' })),
                execAsync("free | grep Mem | awk '{print ($3/$2) * 100.0}'").catch(() => ({ stdout: '0' }))
            ]);

            return {
                cpu: parseFloat(cpuInfo.stdout.trim()) || 0,
                memory: parseFloat(memInfo.stdout.trim()) || 0
            };
        } catch (error) {
            return { cpu: 0, memory: 0 };
        }
    }

    async getDockerResourceLimits() {
        try {
            const { stdout } = await execAsync(
                "docker inspect $(docker ps -q) --format '{{.Name}}\t{{.HostConfig.Memory}}\t{{.HostConfig.CpuQuota}}' 2>/dev/null || echo ''"
            );

            const limits = new Map();
            if (stdout.trim()) {
                stdout.trim().split('\n').forEach(line => {
                    const [name, memory, cpuQuota] = line.split('\t');
                    if (name) {
                        limits.set(name.replace('/', ''), {
                            memory: parseInt(memory) || null,
                            cpu: parseInt(cpuQuota) || null
                        });
                    }
                });
            }

            return limits;
        } catch (error) {
            return new Map();
        }
    }

    async getServicesWithoutResourceLimits(dockerLimits) {
        const runningServices = await this.getRunningServices();
        return runningServices.filter(service => {
            const limits = dockerLimits.get(service);
            return !limits || (!limits.memory && !limits.cpu);
        });
    }

    async checkIndexerSyncStatus(indexers) {
        const status = {};
        
        for (const indexer of indexers) {
            try {
                // This would need to be implemented based on each indexer's API
                // For now, return a placeholder
                status[indexer] = { synced: true };
            } catch (error) {
                status[indexer] = { synced: false, error: error.message };
            }
        }
        
        return status;
    }

    async checkDatabaseOptimization() {
        try {
            // This would check database performance metrics
            // For now, return a placeholder
            return { needsOptimization: false };
        } catch (error) {
            return { needsOptimization: false };
        }
    }

    async getEnvironmentConfig() {
        try {
            const envContent = await fs.readFile('/app/.env', 'utf-8');
            const config = {};
            
            envContent.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, ...valueParts] = line.split('=');
                    if (key) {
                        config[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });
            
            return config;
        } catch (error) {
            return {};
        }
    }

    checkForDefaultPasswords(envConfig) {
        const defaultPasswords = ['password', 'admin', '123456', 'postgres'];
        const passwordFields = Object.keys(envConfig).filter(key => 
            key.toUpperCase().includes('PASSWORD') || key.toUpperCase().includes('PASS')
        );
        
        return passwordFields.filter(field => 
            defaultPasswords.includes(envConfig[field]?.toLowerCase())
        );
    }

    async checkExposedPorts() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Ports}}"');
            const unnecessary = [];
            
            stdout.trim().split('\n').forEach(line => {
                const [name, ports] = line.split('\t');
                if (ports && ports.includes('0.0.0.0:')) {
                    // Check if this port exposure is necessary
                    // This is a simplified check - in practice, you'd have more sophisticated logic
                    if (!name.includes('nginx') && !name.includes('dashboard')) {
                        unnecessary.push({ service: name, ports });
                    }
                }
            });
            
            return { unnecessary };
        } catch (error) {
            return { unnecessary: [] };
        }
    }

    async getKaspaNodeStatus() {
        try {
            // This would connect to the Kaspa node RPC
            // For now, return a placeholder
            return { isSynced: true };
        } catch (error) {
            return { isSynced: false };
        }
    }

    async getPerformanceMetrics() {
        try {
            // This would check for slow queries and performance issues
            // For now, return a placeholder
            return { slowQueries: 0 };
        } catch (error) {
            return { slowQueries: 0 };
        }
    }

    async getWalletStatus() {
        try {
            // This would check if a wallet is configured
            // For now, return a placeholder
            return { configured: false };
        } catch (error) {
            return { configured: false };
        }
    }

    async getNetworkConfiguration() {
        try {
            const { stdout } = await execAsync('docker network ls --format "{{.Name}}"');
            const networks = stdout.trim().split('\n');
            
            return {
                usingDefaultNetworks: networks.includes('bridge') && networks.length <= 3
            };
        } catch (error) {
            return { usingDefaultNetworks: true };
        }
    }

    // Clear cache when configuration changes
    clearCache() {
        this.analysisCache.clear();
    }

    // Get suggestions for a specific category
    getSuggestionsByCategory(category) {
        return this.suggestions.filter(s => s.category === category);
    }

    // Get suggestions by priority
    getSuggestionsByPriority(priority) {
        return this.suggestions.filter(s => s.priority === priority);
    }
}

module.exports = ConfigurationAnalyzer;