const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

const execAsync = promisify(exec);

class LogManager extends EventEmitter {
    constructor() {
        super();
        this.activeStreams = new Map(); // Track active log streams
        this.logCache = new Map(); // Cache recent logs
        this.maxCacheSize = 1000; // Max lines per service
        this.logDownloadDir = '/app/data/log-downloads';
        this.severityLevels = {
            'TRACE': { level: 0, color: '#6b7280' },
            'DEBUG': { level: 1, color: '#3b82f6' },
            'INFO': { level: 2, color: '#10b981' },
            'WARN': { level: 3, color: '#f59e0b' },
            'ERROR': { level: 4, color: '#ef4444' },
            'FATAL': { level: 5, color: '#dc2626' }
        };
        
        this.ensureDownloadDirectory();
    }

    async ensureDownloadDirectory() {
        try {
            await fs.mkdir(this.logDownloadDir, { recursive: true });
        } catch (error) {
            console.warn('Failed to create log download directory:', error.message);
        }
    }

    async getServiceLogs(serviceName, options = {}) {
        try {
            const {
                lines = 100,
                since = null,
                until = null,
                follow = false,
                timestamps = true
            } = options;

            let dockerCommand = `docker logs`;
            
            if (timestamps) dockerCommand += ' -t';
            if (lines) dockerCommand += ` --tail=${lines}`;
            if (since) dockerCommand += ` --since="${since}"`;
            if (until) dockerCommand += ` --until="${until}"`;
            if (follow) dockerCommand += ' -f';
            
            dockerCommand += ` ${serviceName}`;

            if (follow) {
                // For streaming logs, use spawn
                return this.streamLogs(serviceName, dockerCommand);
            } else {
                // For static logs, use exec
                const { stdout, stderr } = await execAsync(dockerCommand, {
                    timeout: 30000,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                });

                const logs = this.parseLogOutput(stdout + stderr);
                
                // Cache the logs
                this.updateLogCache(serviceName, logs);
                
                return {
                    success: true,
                    logs,
                    service: serviceName,
                    totalLines: logs.length,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            throw new Error(`Failed to get logs for ${serviceName}: ${error.message}`);
        }
    }

    async streamLogs(serviceName, dockerCommand) {
        try {
            // Stop existing stream if any
            await this.stopLogStream(serviceName);

            const logProcess = spawn('sh', ['-c', dockerCommand]);
            const streamId = `${serviceName}_${Date.now()}`;
            
            this.activeStreams.set(serviceName, {
                process: logProcess,
                streamId,
                startTime: new Date().toISOString(),
                lineCount: 0
            });

            logProcess.stdout.on('data', (data) => {
                const logs = this.parseLogOutput(data.toString());
                this.updateLogCache(serviceName, logs);
                
                // Emit log events for real-time streaming
                logs.forEach(log => {
                    this.emit('log', {
                        service: serviceName,
                        streamId,
                        ...log
                    });
                });

                // Update line count
                const stream = this.activeStreams.get(serviceName);
                if (stream) {
                    stream.lineCount += logs.length;
                }
            });

            logProcess.stderr.on('data', (data) => {
                const logs = this.parseLogOutput(data.toString());
                logs.forEach(log => {
                    this.emit('log', {
                        service: serviceName,
                        streamId,
                        ...log,
                        isError: true
                    });
                });
            });

            logProcess.on('close', (code) => {
                this.emit('streamClosed', {
                    service: serviceName,
                    streamId,
                    exitCode: code
                });
                this.activeStreams.delete(serviceName);
            });

            logProcess.on('error', (error) => {
                this.emit('streamError', {
                    service: serviceName,
                    streamId,
                    error: error.message
                });
                this.activeStreams.delete(serviceName);
            });

            return {
                success: true,
                streamId,
                service: serviceName,
                message: 'Log streaming started',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to start log stream for ${serviceName}: ${error.message}`);
        }
    }

    async stopLogStream(serviceName) {
        const stream = this.activeStreams.get(serviceName);
        if (stream && stream.process) {
            try {
                stream.process.kill('SIGTERM');
                this.activeStreams.delete(serviceName);
                return true;
            } catch (error) {
                console.warn(`Failed to stop log stream for ${serviceName}:`, error.message);
                return false;
            }
        }
        return true;
    }

    async stopAllLogStreams() {
        const results = [];
        for (const serviceName of this.activeStreams.keys()) {
            const success = await this.stopLogStream(serviceName);
            results.push({ service: serviceName, success });
        }
        return results;
    }

    parseLogOutput(output) {
        const lines = output.split('\n').filter(line => line.trim());
        return lines.map(line => this.parseLogLine(line));
    }

    parseLogLine(line) {
        // Parse Docker log format: timestamp container_output
        const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
        
        let timestamp = null;
        let message = line;
        
        if (timestampMatch) {
            timestamp = timestampMatch[1];
            message = timestampMatch[2];
        }

        // Parse severity level from message
        const severity = this.extractSeverityLevel(message);
        
        return {
            timestamp: timestamp || new Date().toISOString(),
            message: message.trim(),
            severity: severity.level,
            severityName: severity.name,
            color: severity.color,
            raw: line
        };
    }

    extractSeverityLevel(message) {
        const upperMessage = message.toUpperCase();
        
        // Check for common log level patterns
        for (const [levelName, levelInfo] of Object.entries(this.severityLevels)) {
            const patterns = [
                `[${levelName}]`,
                `${levelName}:`,
                ` ${levelName} `,
                `"level":"${levelName.toLowerCase()}"`,
                `level=${levelName.toLowerCase()}`
            ];
            
            if (patterns.some(pattern => upperMessage.includes(pattern))) {
                return {
                    level: levelInfo.level,
                    name: levelName,
                    color: levelInfo.color
                };
            }
        }

        // Default to INFO if no level detected
        return {
            level: this.severityLevels.INFO.level,
            name: 'INFO',
            color: this.severityLevels.INFO.color
        };
    }

    updateLogCache(serviceName, logs) {
        if (!this.logCache.has(serviceName)) {
            this.logCache.set(serviceName, []);
        }

        const cache = this.logCache.get(serviceName);
        cache.push(...logs);

        // Trim cache if it exceeds max size
        if (cache.length > this.maxCacheSize) {
            cache.splice(0, cache.length - this.maxCacheSize);
        }
    }

    getCachedLogs(serviceName, limit = null) {
        const cache = this.logCache.get(serviceName) || [];
        return limit ? cache.slice(-limit) : cache;
    }

    async searchLogs(serviceName, query, options = {}) {
        try {
            const {
                caseSensitive = false,
                regex = false,
                lines = 1000,
                since = null
            } = options;

            // Get logs to search
            const logsResult = await this.getServiceLogs(serviceName, { lines, since });
            const logs = logsResult.logs;

            // Perform search
            const searchResults = logs.filter(log => {
                let searchText = log.message;
                let searchQuery = query;

                if (!caseSensitive) {
                    searchText = searchText.toLowerCase();
                    searchQuery = searchQuery.toLowerCase();
                }

                if (regex) {
                    try {
                        const regexPattern = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
                        return regexPattern.test(searchText);
                    } catch (error) {
                        // If regex is invalid, fall back to string search
                        return searchText.includes(searchQuery);
                    }
                } else {
                    return searchText.includes(searchQuery);
                }
            });

            return {
                success: true,
                results: searchResults,
                query,
                totalMatches: searchResults.length,
                totalSearched: logs.length,
                service: serviceName,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to search logs for ${serviceName}: ${error.message}`);
        }
    }

    async filterLogsBySeverity(serviceName, severityLevel, options = {}) {
        try {
            const { lines = 1000 } = options;
            const logsResult = await this.getServiceLogs(serviceName, { lines });
            const logs = logsResult.logs;

            const minLevel = this.severityLevels[severityLevel.toUpperCase()]?.level;
            if (minLevel === undefined) {
                throw new Error(`Invalid severity level: ${severityLevel}`);
            }

            const filteredLogs = logs.filter(log => log.severity >= minLevel);

            return {
                success: true,
                logs: filteredLogs,
                severityFilter: severityLevel,
                totalFiltered: filteredLogs.length,
                totalLogs: logs.length,
                service: serviceName,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to filter logs by severity for ${serviceName}: ${error.message}`);
        }
    }

    async getMultiServiceLogs(serviceNames, options = {}) {
        try {
            const { lines = 100, mergeByTime = true } = options;
            const results = [];

            // Get logs from all services
            for (const serviceName of serviceNames) {
                try {
                    const logsResult = await this.getServiceLogs(serviceName, { lines });
                    results.push({
                        service: serviceName,
                        logs: logsResult.logs,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        service: serviceName,
                        logs: [],
                        success: false,
                        error: error.message
                    });
                }
            }

            if (mergeByTime) {
                // Merge and sort all logs by timestamp
                const allLogs = [];
                results.forEach(result => {
                    if (result.success) {
                        result.logs.forEach(log => {
                            allLogs.push({
                                ...log,
                                service: result.service
                            });
                        });
                    }
                });

                allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                return {
                    success: true,
                    logs: allLogs,
                    services: serviceNames,
                    merged: true,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    success: true,
                    results,
                    services: serviceNames,
                    merged: false,
                    timestamp: new Date().toISOString()
                };
            }

        } catch (error) {
            throw new Error(`Failed to get multi-service logs: ${error.message}`);
        }
    }

    async downloadLogs(serviceName, options = {}) {
        try {
            const {
                format = 'txt',
                lines = null,
                since = null,
                until = null
            } = options;

            // Get logs
            const logsResult = await this.getServiceLogs(serviceName, { lines, since, until });
            const logs = logsResult.logs;

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${serviceName}_logs_${timestamp}.${format}`;
            const filepath = path.join(this.logDownloadDir, filename);

            // Format logs based on requested format
            let content;
            if (format === 'json') {
                content = JSON.stringify(logs, null, 2);
            } else {
                // Default to plain text
                content = logs.map(log => 
                    `${log.timestamp} [${log.severityName}] ${log.message}`
                ).join('\n');
            }

            // Write to file
            await fs.writeFile(filepath, content);

            return {
                success: true,
                filename,
                filepath,
                size: content.length,
                format,
                service: serviceName,
                logCount: logs.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to download logs for ${serviceName}: ${error.message}`);
        }
    }

    async getActiveStreams() {
        const streams = [];
        for (const [serviceName, stream] of this.activeStreams.entries()) {
            streams.push({
                service: serviceName,
                streamId: stream.streamId,
                startTime: stream.startTime,
                lineCount: stream.lineCount,
                isActive: true
            });
        }
        return streams;
    }

    async getLogStatistics(serviceName, options = {}) {
        try {
            const { lines = 1000 } = options;
            const logsResult = await this.getServiceLogs(serviceName, { lines });
            const logs = logsResult.logs;

            const stats = {
                totalLines: logs.length,
                severityBreakdown: {},
                timeRange: {
                    earliest: null,
                    latest: null
                },
                averageMessageLength: 0,
                service: serviceName,
                timestamp: new Date().toISOString()
            };

            // Calculate severity breakdown
            Object.keys(this.severityLevels).forEach(level => {
                stats.severityBreakdown[level] = 0;
            });

            let totalMessageLength = 0;
            let earliestTime = null;
            let latestTime = null;

            logs.forEach(log => {
                stats.severityBreakdown[log.severityName]++;
                totalMessageLength += log.message.length;

                const logTime = new Date(log.timestamp);
                if (!earliestTime || logTime < earliestTime) {
                    earliestTime = logTime;
                }
                if (!latestTime || logTime > latestTime) {
                    latestTime = logTime;
                }
            });

            stats.averageMessageLength = logs.length > 0 ? totalMessageLength / logs.length : 0;
            stats.timeRange.earliest = earliestTime?.toISOString() || null;
            stats.timeRange.latest = latestTime?.toISOString() || null;

            return stats;

        } catch (error) {
            throw new Error(`Failed to get log statistics for ${serviceName}: ${error.message}`);
        }
    }

    // Clean up old log files
    async cleanupOldLogFiles(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
        try {
            const files = await fs.readdir(this.logDownloadDir);
            const cutoff = Date.now() - maxAge;
            let deletedCount = 0;

            for (const file of files) {
                const filepath = path.join(this.logDownloadDir, file);
                const stats = await fs.stat(filepath);
                
                if (stats.mtime.getTime() < cutoff) {
                    await fs.unlink(filepath);
                    deletedCount++;
                }
            }

            return {
                success: true,
                deletedFiles: deletedCount,
                message: `Cleaned up ${deletedCount} old log files`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to cleanup old log files'
            };
        }
    }
}

module.exports = LogManager;