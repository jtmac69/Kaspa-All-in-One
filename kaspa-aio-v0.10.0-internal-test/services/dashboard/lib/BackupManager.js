const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

class BackupManager {
    constructor() {
        const dataDir = process.env.DATA_DIR || './data';
        this.backupDir = `${dataDir}/backups`;
        this.diagnosticDir = `${dataDir}/diagnostics`;
        this.maxBackupAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        this.maxBackupCount = 10; // Keep max 10 backups
        
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.mkdir(this.diagnosticDir, { recursive: true });
        } catch (error) {
            console.warn('Failed to create backup directories:', error.message);
        }
    }

    async createBackup(options = {}) {
        try {
            const {
                includeData = false,
                includeLogs = false,
                description = 'Manual backup'
            } = options;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `backup_${timestamp}`;
            const backupPath = path.join(this.backupDir, backupId);
            
            await fs.mkdir(backupPath, { recursive: true });

            const backupManifest = {
                id: backupId,
                timestamp: new Date().toISOString(),
                description,
                version: await this.getSystemVersion(),
                includeData,
                includeLogs,
                files: [],
                checksums: {},
                size: 0
            };

            // Backup configuration files
            await this.backupConfigurationFiles(backupPath, backupManifest);

            // Backup Docker Compose files
            await this.backupDockerFiles(backupPath, backupManifest);

            // Backup installation state
            await this.backupInstallationState(backupPath, backupManifest);

            // Optionally backup data volumes
            if (includeData) {
                await this.backupDataVolumes(backupPath, backupManifest);
            }

            // Optionally backup logs
            if (includeLogs) {
                await this.backupLogs(backupPath, backupManifest);
            }

            // Calculate total size
            backupManifest.size = await this.calculateDirectorySize(backupPath);

            // Generate checksums for integrity verification
            await this.generateChecksums(backupPath, backupManifest);

            // Save manifest
            const manifestPath = path.join(backupPath, 'manifest.json');
            await fs.writeFile(manifestPath, JSON.stringify(backupManifest, null, 2));

            // Create compressed archive
            const archivePath = await this.createArchive(backupPath, backupId);

            // Clean up temporary directory
            await this.removeDirectory(backupPath);

            // Clean up old backups
            await this.cleanupOldBackups();

            return {
                success: true,
                backupId,
                archivePath,
                size: backupManifest.size,
                manifest: backupManifest,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }

    async backupConfigurationFiles(backupPath, manifest) {
        const configFiles = [
            { source: '/app/.env', dest: 'config/.env' },
            { source: '/app/docker-compose.yml', dest: 'config/docker-compose.yml' },
            { source: '/app/docker-compose.override.yml', dest: 'config/docker-compose.override.yml' }
        ];

        for (const file of configFiles) {
            try {
                const sourcePath = file.source;
                const destPath = path.join(backupPath, file.dest);
                
                // Ensure destination directory exists
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                
                // Check if source file exists
                await fs.access(sourcePath);
                
                // Copy file
                await fs.copyFile(sourcePath, destPath);
                
                manifest.files.push({
                    type: 'config',
                    source: file.source,
                    dest: file.dest,
                    size: (await fs.stat(destPath)).size
                });

            } catch (error) {
                // File doesn't exist or can't be copied - log but continue
                console.warn(`Could not backup ${file.source}:`, error.message);
            }
        }
    }

    async backupDockerFiles(backupPath, manifest) {
        try {
            const dockerDir = path.join(backupPath, 'docker');
            await fs.mkdir(dockerDir, { recursive: true });

            // Export Docker Compose configuration
            const { stdout: composeConfig } = await execAsync('docker-compose config', {
                cwd: '/app',
                timeout: 30000
            });

            const composeConfigPath = path.join(dockerDir, 'docker-compose-resolved.yml');
            await fs.writeFile(composeConfigPath, composeConfig);

            manifest.files.push({
                type: 'docker',
                source: 'docker-compose config',
                dest: 'docker/docker-compose-resolved.yml',
                size: composeConfig.length
            });

            // Export list of Docker images
            const { stdout: imagesList } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"');
            const imagesListPath = path.join(dockerDir, 'images-list.txt');
            await fs.writeFile(imagesListPath, imagesList);

            manifest.files.push({
                type: 'docker',
                source: 'docker images',
                dest: 'docker/images-list.txt',
                size: imagesList.length
            });

            // Export Docker network configuration
            const { stdout: networksList } = await execAsync('docker network ls --format "{{.Name}}\t{{.Driver}}\t{{.Scope}}"');
            const networksListPath = path.join(dockerDir, 'networks-list.txt');
            await fs.writeFile(networksListPath, networksList);

            manifest.files.push({
                type: 'docker',
                source: 'docker network ls',
                dest: 'docker/networks-list.txt',
                size: networksList.length
            });

        } catch (error) {
            console.warn('Could not backup Docker configuration:', error.message);
        }
    }

    async backupInstallationState(backupPath, manifest) {
        try {
            const stateDir = path.join(backupPath, 'state');
            await fs.mkdir(stateDir, { recursive: true });

            // Backup wizard state if it exists
            const wizardStateFiles = [
                '/app/services/wizard/backend/data/installation-state.json',
                '/app/services/wizard/backend/data/configuration.json'
            ];

            for (const stateFile of wizardStateFiles) {
                try {
                    await fs.access(stateFile);
                    const filename = path.basename(stateFile);
                    const destPath = path.join(stateDir, filename);
                    await fs.copyFile(stateFile, destPath);

                    manifest.files.push({
                        type: 'state',
                        source: stateFile,
                        dest: `state/${filename}`,
                        size: (await fs.stat(destPath)).size
                    });
                } catch (error) {
                    // File doesn't exist - continue
                }
            }

            // Create system info snapshot
            const systemInfo = await this.getSystemInfo();
            const systemInfoPath = path.join(stateDir, 'system-info.json');
            const systemInfoContent = JSON.stringify(systemInfo, null, 2);
            await fs.writeFile(systemInfoPath, systemInfoContent);

            manifest.files.push({
                type: 'state',
                source: 'system info',
                dest: 'state/system-info.json',
                size: systemInfoContent.length
            });

        } catch (error) {
            console.warn('Could not backup installation state:', error.message);
        }
    }

    async backupDataVolumes(backupPath, manifest) {
        try {
            const dataDir = path.join(backupPath, 'data');
            await fs.mkdir(dataDir, { recursive: true });

            // Get list of Docker volumes
            const { stdout: volumesList } = await execAsync('docker volume ls --format "{{.Name}}"');
            const volumes = volumesList.trim().split('\n').filter(v => v);

            for (const volume of volumes) {
                try {
                    // Create tar archive of volume data
                    const volumeArchive = path.join(dataDir, `${volume}.tar.gz`);
                    await execAsync(
                        `docker run --rm -v ${volume}:/data -v ${dataDir}:/backup alpine tar czf /backup/${volume}.tar.gz -C /data .`,
                        { timeout: 300000 } // 5 minutes timeout
                    );

                    const stats = await fs.stat(volumeArchive);
                    manifest.files.push({
                        type: 'data',
                        source: `docker volume ${volume}`,
                        dest: `data/${volume}.tar.gz`,
                        size: stats.size
                    });

                } catch (error) {
                    console.warn(`Could not backup volume ${volume}:`, error.message);
                }
            }

        } catch (error) {
            console.warn('Could not backup data volumes:', error.message);
        }
    }

    async backupLogs(backupPath, manifest) {
        try {
            const logsDir = path.join(backupPath, 'logs');
            await fs.mkdir(logsDir, { recursive: true });

            // Get list of running containers
            const { stdout: containersList } = await execAsync('docker ps --format "{{.Names}}"');
            const containers = containersList.trim().split('\n').filter(c => c);

            for (const container of containers) {
                try {
                    // Export container logs
                    const { stdout: logs } = await execAsync(`docker logs --timestamps ${container}`, {
                        timeout: 60000,
                        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
                    });

                    const logFile = path.join(logsDir, `${container}.log`);
                    await fs.writeFile(logFile, logs);

                    manifest.files.push({
                        type: 'logs',
                        source: `docker logs ${container}`,
                        dest: `logs/${container}.log`,
                        size: logs.length
                    });

                } catch (error) {
                    console.warn(`Could not backup logs for ${container}:`, error.message);
                }
            }

        } catch (error) {
            console.warn('Could not backup logs:', error.message);
        }
    }

    async createArchive(backupPath, backupId) {
        try {
            const archivePath = `${backupPath}.tar.gz`;
            await execAsync(`tar -czf "${archivePath}" -C "${path.dirname(backupPath)}" "${backupId}"`, {
                timeout: 300000 // 5 minutes
            });

            return archivePath;
        } catch (error) {
            throw new Error(`Failed to create backup archive: ${error.message}`);
        }
    }

    async generateChecksums(backupPath, manifest) {
        for (const file of manifest.files) {
            try {
                const filePath = path.join(backupPath, file.dest);
                const content = await fs.readFile(filePath);
                const checksum = crypto.createHash('sha256').update(content).digest('hex');
                manifest.checksums[file.dest] = checksum;
            } catch (error) {
                console.warn(`Could not generate checksum for ${file.dest}:`, error.message);
            }
        }
    }

    async validateBackup(backupPath) {
        try {
            // Read manifest
            const manifestPath = path.join(backupPath, 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            const validationResults = {
                valid: true,
                errors: [],
                warnings: [],
                checkedFiles: 0,
                totalFiles: manifest.files.length
            };

            // Verify each file exists and matches checksum
            for (const file of manifest.files) {
                try {
                    const filePath = path.join(backupPath, file.dest);
                    await fs.access(filePath);

                    // Verify checksum if available
                    if (manifest.checksums[file.dest]) {
                        const content = await fs.readFile(filePath);
                        const checksum = crypto.createHash('sha256').update(content).digest('hex');
                        
                        if (checksum !== manifest.checksums[file.dest]) {
                            validationResults.errors.push(`Checksum mismatch for ${file.dest}`);
                            validationResults.valid = false;
                        }
                    }

                    validationResults.checkedFiles++;
                } catch (error) {
                    validationResults.errors.push(`Missing file: ${file.dest}`);
                    validationResults.valid = false;
                }
            }

            return validationResults;

        } catch (error) {
            return {
                valid: false,
                errors: [`Failed to validate backup: ${error.message}`],
                warnings: [],
                checkedFiles: 0,
                totalFiles: 0
            };
        }
    }

    async getBackupHistory() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.endsWith('.tar.gz')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Try to extract manifest from archive to get metadata
                    try {
                        const { stdout: manifestContent } = await execAsync(
                            `tar -xzOf "${filePath}" */manifest.json`,
                            { timeout: 30000 }
                        );
                        
                        const manifest = JSON.parse(manifestContent);
                        backups.push({
                            id: manifest.id,
                            filename: file,
                            size: stats.size,
                            created: manifest.timestamp,
                            description: manifest.description,
                            version: manifest.version,
                            includeData: manifest.includeData,
                            includeLogs: manifest.includeLogs,
                            fileCount: manifest.files.length
                        });
                    } catch (error) {
                        // If we can't read manifest, create basic entry
                        backups.push({
                            id: file.replace('.tar.gz', ''),
                            filename: file,
                            size: stats.size,
                            created: stats.mtime.toISOString(),
                            description: 'Unknown',
                            version: 'Unknown',
                            includeData: false,
                            includeLogs: false,
                            fileCount: 0
                        });
                    }
                }
            }

            // Sort by creation date (newest first)
            backups.sort((a, b) => new Date(b.created) - new Date(a.created));

            return backups;

        } catch (error) {
            throw new Error(`Failed to get backup history: ${error.message}`);
        }
    }

    async createDiagnosticExport(options = {}) {
        try {
            const {
                includeLogs = true,
                includeSystemInfo = true,
                includeDockerInfo = true,
                logLines = 1000
            } = options;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const diagnosticId = `diagnostic_${timestamp}`;
            const diagnosticPath = path.join(this.diagnosticDir, diagnosticId);
            
            await fs.mkdir(diagnosticPath, { recursive: true });

            const diagnosticManifest = {
                id: diagnosticId,
                timestamp: new Date().toISOString(),
                type: 'diagnostic',
                includeLogs,
                includeSystemInfo,
                includeDockerInfo,
                files: [],
                size: 0
            };

            // System information
            if (includeSystemInfo) {
                await this.exportSystemInfo(diagnosticPath, diagnosticManifest);
            }

            // Docker information
            if (includeDockerInfo) {
                await this.exportDockerInfo(diagnosticPath, diagnosticManifest);
            }

            // Service logs
            if (includeLogs) {
                await this.exportServiceLogs(diagnosticPath, diagnosticManifest, logLines);
            }

            // Configuration files (sanitized)
            await this.exportSanitizedConfig(diagnosticPath, diagnosticManifest);

            // Calculate total size
            diagnosticManifest.size = await this.calculateDirectorySize(diagnosticPath);

            // Save manifest
            const manifestPath = path.join(diagnosticPath, 'manifest.json');
            await fs.writeFile(manifestPath, JSON.stringify(diagnosticManifest, null, 2));

            // Create compressed archive
            const archivePath = await this.createArchive(diagnosticPath, diagnosticId);

            // Clean up temporary directory
            await this.removeDirectory(diagnosticPath);

            return {
                success: true,
                diagnosticId,
                archivePath,
                size: diagnosticManifest.size,
                manifest: diagnosticManifest,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to create diagnostic export: ${error.message}`);
        }
    }

    async exportSystemInfo(diagnosticPath, manifest) {
        try {
            const systemInfo = await this.getSystemInfo();
            const systemInfoPath = path.join(diagnosticPath, 'system-info.json');
            const content = JSON.stringify(systemInfo, null, 2);
            await fs.writeFile(systemInfoPath, content);

            manifest.files.push({
                type: 'system',
                name: 'system-info.json',
                size: content.length
            });
        } catch (error) {
            console.warn('Could not export system info:', error.message);
        }
    }

    async exportDockerInfo(diagnosticPath, manifest) {
        try {
            const dockerDir = path.join(diagnosticPath, 'docker');
            await fs.mkdir(dockerDir, { recursive: true });

            // Docker version and info
            const { stdout: dockerVersion } = await execAsync('docker version --format json');
            await fs.writeFile(path.join(dockerDir, 'version.json'), dockerVersion);

            const { stdout: dockerInfo } = await execAsync('docker info --format json');
            await fs.writeFile(path.join(dockerDir, 'info.json'), dockerInfo);

            // Container status
            const { stdout: containerStatus } = await execAsync('docker ps -a --format json');
            await fs.writeFile(path.join(dockerDir, 'containers.json'), containerStatus);

            // Images
            const { stdout: images } = await execAsync('docker images --format json');
            await fs.writeFile(path.join(dockerDir, 'images.json'), images);

            // Networks
            const { stdout: networks } = await execAsync('docker network ls --format json');
            await fs.writeFile(path.join(dockerDir, 'networks.json'), networks);

            // Volumes
            const { stdout: volumes } = await execAsync('docker volume ls --format json');
            await fs.writeFile(path.join(dockerDir, 'volumes.json'), volumes);

            manifest.files.push({
                type: 'docker',
                name: 'docker/',
                size: await this.calculateDirectorySize(dockerDir)
            });

        } catch (error) {
            console.warn('Could not export Docker info:', error.message);
        }
    }

    async exportServiceLogs(diagnosticPath, manifest, logLines) {
        try {
            const logsDir = path.join(diagnosticPath, 'logs');
            await fs.mkdir(logsDir, { recursive: true });

            const { stdout: containersList } = await execAsync('docker ps --format "{{.Names}}"');
            const containers = containersList.trim().split('\n').filter(c => c);

            for (const container of containers) {
                try {
                    const { stdout: logs } = await execAsync(
                        `docker logs --timestamps --tail=${logLines} ${container}`,
                        { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
                    );

                    const logFile = path.join(logsDir, `${container}.log`);
                    await fs.writeFile(logFile, logs);

                    manifest.files.push({
                        type: 'logs',
                        name: `logs/${container}.log`,
                        size: logs.length
                    });

                } catch (error) {
                    console.warn(`Could not export logs for ${container}:`, error.message);
                }
            }

        } catch (error) {
            console.warn('Could not export service logs:', error.message);
        }
    }

    async exportSanitizedConfig(diagnosticPath, manifest) {
        try {
            const configDir = path.join(diagnosticPath, 'config');
            await fs.mkdir(configDir, { recursive: true });

            // Read and sanitize .env file
            try {
                const envContent = await fs.readFile('/app/.env', 'utf-8');
                const sanitizedEnv = this.sanitizeEnvFile(envContent);
                await fs.writeFile(path.join(configDir, '.env'), sanitizedEnv);

                manifest.files.push({
                    type: 'config',
                    name: 'config/.env',
                    size: sanitizedEnv.length
                });
            } catch (error) {
                // .env file doesn't exist or can't be read
            }

            // Copy docker-compose.yml (no sensitive data expected)
            try {
                await fs.copyFile('/app/docker-compose.yml', path.join(configDir, 'docker-compose.yml'));
                const stats = await fs.stat(path.join(configDir, 'docker-compose.yml'));
                
                manifest.files.push({
                    type: 'config',
                    name: 'config/docker-compose.yml',
                    size: stats.size
                });
            } catch (error) {
                // docker-compose.yml doesn't exist
            }

        } catch (error) {
            console.warn('Could not export sanitized config:', error.message);
        }
    }

    sanitizeEnvFile(content) {
        const lines = content.split('\n');
        const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE'];
        
        return lines.map(line => {
            if (line.trim().startsWith('#') || !line.includes('=')) {
                return line; // Keep comments and non-assignment lines
            }

            const [key, ...valueParts] = line.split('=');
            const keyUpper = key.toUpperCase();
            
            if (sensitiveKeys.some(sensitive => keyUpper.includes(sensitive))) {
                return `${key}=***REDACTED***`;
            }
            
            return line;
        }).join('\n');
    }

    async getSystemInfo() {
        try {
            const [osInfo, memInfo, diskInfo, cpuInfo] = await Promise.all([
                execAsync('uname -a').catch(() => ({ stdout: 'Unknown' })),
                execAsync('free -h').catch(() => ({ stdout: 'Unknown' })),
                execAsync('df -h').catch(() => ({ stdout: 'Unknown' })),
                execAsync('lscpu').catch(() => ({ stdout: 'Unknown' }))
            ]);

            return {
                os: osInfo.stdout.trim(),
                memory: memInfo.stdout.trim(),
                disk: diskInfo.stdout.trim(),
                cpu: cpuInfo.stdout.trim(),
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            };
        } catch (error) {
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getSystemVersion() {
        try {
            // Try to get version from package.json or git
            const packagePath = '/app/package.json';
            try {
                const packageContent = await fs.readFile(packagePath, 'utf-8');
                const packageJson = JSON.parse(packageContent);
                return packageJson.version || 'unknown';
            } catch (error) {
                // Try git
                try {
                    const { stdout } = await execAsync('git describe --tags --always', { cwd: '/app' });
                    return stdout.trim();
                } catch (gitError) {
                    return 'unknown';
                }
            }
        } catch (error) {
            return 'unknown';
        }
    }

    async calculateDirectorySize(dirPath) {
        try {
            const { stdout } = await execAsync(`du -sb "${dirPath}" | cut -f1`);
            return parseInt(stdout.trim()) || 0;
        } catch (error) {
            return 0;
        }
    }

    async removeDirectory(dirPath) {
        try {
            await execAsync(`rm -rf "${dirPath}"`);
        } catch (error) {
            console.warn(`Failed to remove directory ${dirPath}:`, error.message);
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.getBackupHistory();
            
            // Remove backups older than maxBackupAge
            const cutoff = Date.now() - this.maxBackupAge;
            let deletedCount = 0;

            for (const backup of backups) {
                const backupTime = new Date(backup.created).getTime();
                if (backupTime < cutoff || deletedCount >= this.maxBackupCount) {
                    const backupPath = path.join(this.backupDir, backup.filename);
                    try {
                        await fs.unlink(backupPath);
                        deletedCount++;
                    } catch (error) {
                        console.warn(`Failed to delete old backup ${backup.filename}:`, error.message);
                    }
                }
            }

            return { deletedCount };

        } catch (error) {
            console.warn('Failed to cleanup old backups:', error.message);
            return { deletedCount: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = BackupManager;