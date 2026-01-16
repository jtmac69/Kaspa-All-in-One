const { ClientWrapper } = require('kaspa-rpc-client');

/**
 * Kaspa Node Client using kaspa-rpc-client library
 * Properly connects to Kaspa nodes using WebSocket RPC
 */
class KaspaNodeClient {
    constructor(options = {}) {
        // Determine hosts to connect to
        const localHost = options.host || 'localhost';
        const localPort = options.port || 16110;
        
        // Build host list with fallbacks
        this.hosts = [
            `${localHost}:${localPort}`,
            'seeder2.kaspad.net:16110', // Public fallback
            'seeder1.kaspad.net:16110'  // Additional public fallback
        ];
        
        this.wrapper = null;
        this.client = null;
        this.connected = false;
        this.connectionStatus = {
            connected: false,
            host: null,
            lastAttempt: null,
            error: null
        };
    }

    /**
     * Initialize the client wrapper
     */
    async initialize() {
        if (this.wrapper) {
            return; // Already initialized
        }

        try {
            this.wrapper = new ClientWrapper({
                hosts: this.hosts,
                verbose: false
            });
            
            await this.wrapper.initialize();
            this.client = await this.wrapper.getClient();
            
            this.connected = true;
            this.connectionStatus = {
                connected: true,
                host: this.client?.url || this.hosts[0],
                lastAttempt: new Date().toISOString(),
                error: null
            };
            
            console.log(`Kaspa RPC client connected to: ${this.connectionStatus.host}`);
        } catch (error) {
            this.connected = false;
            this.connectionStatus = {
                connected: false,
                host: null,
                lastAttempt: new Date().toISOString(),
                error: error.message
            };
            throw new Error(`Failed to initialize Kaspa RPC client: ${error.message}`);
        }
    }

    /**
     * Ensure client is initialized
     */
    async ensureConnected() {
        if (!this.wrapper || !this.client) {
            await this.initialize();
        }
        return this.client;
    }

    /**
     * Get node info
     */
    async getNodeInfo() {
        const client = await this.ensureConnected();
        
        try {
            const info = await client.getInfo();
            
            return {
                serverVersion: info.serverVersion,
                isSynced: info.isSynced,
                peerCount: info.peerCount || 0,
                connectedPeers: info.peerCount || 0, // Add connectedPeers for consistency
                networkName: info.networkName || 'mainnet',
                mempoolSize: info.mempoolSize || 0,
                hasUtxoIndex: info.hasUtxoIndex || false,
                isUtxoIndexed: info.hasUtxoIndex || false, // Add isUtxoIndexed for consistency
                isArchivalNode: false
            };
        } catch (error) {
            throw new Error(`Failed to get node info: ${error.message}`);
        }
    }

    /**
     * Get block DAG info
     */
    async getBlockDagInfo() {
        const client = await this.ensureConnected();
        
        try {
            const blockDag = await client.getBlockDagInfo();
            
            // For synced nodes, use current time as tip timestamp (close approximation)
            // For unsynced nodes, estimate from DAA score
            let tipTimestamp = null;
            
            try {
                // Check if node is synced
                const info = await client.getInfo();
                
                if (info.isSynced) {
                    // Node is synced, tip is very recent (within last few seconds)
                    tipTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds
                } else {
                    // Node is syncing, estimate from DAA score
                    // Kaspa has ~1 block per second, genesis was Nov 7, 2021
                    const kaspaGenesis = new Date('2021-11-07T00:00:00Z').getTime();
                    const daaScore = blockDag.virtualDaaScore || blockDag.virtualSelectedParentBlueScore;
                    if (daaScore) {
                        tipTimestamp = Math.floor((kaspaGenesis + (parseInt(daaScore) * 1000)) / 1000); // Convert to seconds
                    }
                }
            } catch (timestampError) {
                console.log('Could not determine tip timestamp:', timestampError.message);
                // Last fallback: use current time
                tipTimestamp = Math.floor(Date.now() / 1000);
            }
            
            return {
                virtualSelectedParentBlueScore: blockDag.virtualSelectedParentBlueScore,
                virtualSelectedParentBlueHash: blockDag.virtualSelectedParentBlueHash,
                difficulty: blockDag.difficulty,
                tipHashes: blockDag.tipHashes || [],
                virtualDaaScore: blockDag.virtualDaaScore,
                blockCount: blockDag.virtualSelectedParentBlueScore, // Use blue score as block count
                tipTimestamp: tipTimestamp, // Timestamp of the tip block (in seconds)
                pruningPointHash: blockDag.pruningPointHash,
                virtualParentHashes: blockDag.virtualParentHashes || []
            };
        } catch (error) {
            throw new Error(`Failed to get block DAG info: ${error.message}`);
        }
    }

    /**
     * Get block by hash
     * @param {string} blockHash - The hash of the block to retrieve
     * @param {boolean} includeTransactions - Whether to include full transaction data
     */
    async getBlock(blockHash, includeTransactions = false) {
        const client = await this.ensureConnected();
        
        try {
            const blockRequest = {
                hash: blockHash,
                includeTransactions: includeTransactions
            };
            const response = await client.getBlock(blockRequest);
            
            // The response has { block, error } structure
            if (response.error) {
                throw new Error(response.error);
            }
            
            return response.block || response;
        } catch (error) {
            throw new Error(`Failed to get block: ${error.message}`);
        }
    }

    /**
     * Get current network
     */
    async getCurrentNetwork() {
        const client = await this.ensureConnected();
        
        try {
            const network = await client.getCurrentNetwork();
            return network;
        } catch (error) {
            return { networkName: 'mainnet' };
        }
    }

    /**
     * Get peer info
     */
    async getPeerInfo() {
        const client = await this.ensureConnected();
        
        try {
            const connectedPeers = await client.getConnectedPeerInfo();
            
            return {
                knownAddresses: 0,
                connectedPeers: connectedPeers?.infos?.length || 0,
                peerDetails: connectedPeers?.infos || []
            };
        } catch (error) {
            const nodeInfo = await this.getNodeInfo();
            return {
                knownAddresses: 0,
                connectedPeers: nodeInfo.peerCount,
                peerDetails: []
            };
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus() {
        const [nodeInfo, blockDag] = await Promise.all([
            this.getNodeInfo(),
            this.getBlockDagInfo()
        ]);

        const currentHeight = blockDag.virtualSelectedParentBlueScore;
        const networkHeight = await this.getNetworkHeight();
        
        let progress = 0;
        let estimatedTimeRemaining = null;
        
        if (networkHeight && networkHeight > 0) {
            progress = Math.min((currentHeight / networkHeight) * 100, 100);
            
            if (!nodeInfo.isSynced && progress < 100) {
                const blocksRemaining = networkHeight - currentHeight;
                const avgBlockTime = 1; // Kaspa has ~1 second block time
                estimatedTimeRemaining = blocksRemaining * avgBlockTime;
            }
        }

        return {
            isSynced: nodeInfo.isSynced,
            currentHeight,
            networkHeight,
            progress: Math.round(progress * 100) / 100,
            estimatedTimeRemaining,
            syncState: this.determineSyncState(nodeInfo.isSynced, progress)
        };
    }

    /**
     * Get network height (estimate)
     */
    async getNetworkHeight() {
        try {
            const blockDag = await this.getBlockDagInfo();
            const nodeInfo = await this.getNodeInfo();
            
            if (nodeInfo.isSynced) {
                return blockDag.virtualSelectedParentBlueScore;
            } else {
                // Estimate based on time since genesis
                const kaspaGenesis = new Date('2021-11-07T00:00:00Z').getTime();
                const secondsSinceGenesis = (Date.now() - kaspaGenesis) / 1000;
                const estimatedBlocks = Math.floor(secondsSinceGenesis / 1);
                return Math.max(estimatedBlocks, blockDag.virtualSelectedParentBlueScore);
            }
        } catch (error) {
            console.warn('Failed to get network height:', error.message);
            return null;
        }
    }

    /**
     * Determine sync state
     */
    determineSyncState(isSynced, progress) {
        if (isSynced) {
            return 'synced';
        } else if (progress > 99) {
            return 'nearly_synced';
        } else if (progress > 50) {
            return 'syncing';
        } else if (progress > 0) {
            return 'initial_sync';
        } else {
            return 'not_synced';
        }
    }

    /**
     * Get network stats
     */
    async getNetworkStats() {
        try {
            const [blockDag, nodeInfo, peerInfo] = await Promise.all([
                this.getBlockDagInfo(),
                this.getNodeInfo(),
                this.getPeerInfo()
            ]);

            return {
                blockHeight: blockDag.virtualSelectedParentBlueScore,
                difficulty: blockDag.difficulty,
                networkHashRate: this.estimateHashRate(blockDag.difficulty),
                peerCount: nodeInfo.peerCount,
                connectedPeers: peerInfo.connectedPeers,
                mempoolSize: nodeInfo.mempoolSize,
                networkName: nodeInfo.networkName,
                tipHashes: blockDag.tipHashes?.length || 0
            };
        } catch (error) {
            throw new Error(`Failed to get network stats: ${error.message}`);
        }
    }

    /**
     * Estimate hash rate from difficulty
     */
    estimateHashRate(difficulty) {
        if (!difficulty || difficulty === 0) {
            return 0;
        }
        
        const hashRate = difficulty * Math.pow(2, 32) / 1000000000000;
        return Math.round(hashRate * 100) / 100;
    }

    /**
     * Get mempool info
     */
    async getMempoolInfo() {
        const client = await this.ensureConnected();
        
        try {
            const mempoolEntries = await client.getMempoolEntries();
            const nodeInfo = await this.getNodeInfo();
            
            return {
                transactionCount: nodeInfo.mempoolSize,
                entries: mempoolEntries?.entries || [],
                totalSize: mempoolEntries?.entries?.length || 0
            };
        } catch (error) {
            const nodeInfo = await this.getNodeInfo();
            return {
                transactionCount: nodeInfo.mempoolSize,
                entries: [],
                totalSize: nodeInfo.mempoolSize
            };
        }
    }

    /**
     * Get comprehensive node status
     */
    async getComprehensiveNodeStatus() {
        try {
            const [nodeInfo, syncStatus, networkStats, mempoolInfo] = await Promise.all([
                this.getNodeInfo(),
                this.getSyncStatus(),
                this.getNetworkStats(),
                this.getMempoolInfo()
            ]);

            return {
                nodeInfo,
                syncStatus,
                networkStats,
                mempoolInfo,
                timestamp: new Date().toISOString(),
                healthy: nodeInfo.isSynced || syncStatus.progress > 0
            };
        } catch (error) {
            throw new Error(`Failed to get comprehensive node status: ${error.message}`);
        }
    }

    /**
     * Ping the node
     */
    async ping() {
        try {
            const client = await this.ensureConnected();
            await client.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            ...this.connectionStatus,
            workingHost: this.client?.url || null,
            hosts: this.hosts
        };
    }

    /**
     * Force reconnect
     */
    async forceReconnect() {
        this.wrapper = null;
        this.client = null;
        this.connected = false;
        
        try {
            await this.initialize();
            return {
                connected: true,
                host: this.connectionStatus.host,
                error: null
            };
        } catch (error) {
            return {
                connected: false,
                host: null,
                error: error.message
            };
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.wrapper) {
            // kaspa-rpc-client handles cleanup internally
            this.wrapper = null;
            this.client = null;
            this.connected = false;
        }
    }

    /**
     * Format uptime
     */
    formatUptime(seconds) {
        if (!seconds || seconds < 0) {
            return 'Unknown';
        }

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Format hash rate
     */
    formatHashRate(hashRate) {
        if (!hashRate || hashRate === 0) {
            return '0 H/s';
        }

        const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
        let unitIndex = 0;
        let rate = hashRate;

        while (rate >= 1000 && unitIndex < units.length - 1) {
            rate /= 1000;
            unitIndex++;
        }

        return `${Math.round(rate * 100) / 100} ${units[unitIndex]}`;
    }
}

module.exports = KaspaNodeClient;
