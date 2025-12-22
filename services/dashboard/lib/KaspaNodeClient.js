const axios = require('axios');

class KaspaNodeClient {
    constructor(rpcUrl = 'http://kaspa-node:16111') {
        this.rpcUrl = rpcUrl;
        this.timeout = 10000; // 10 seconds
        this.networkHeight = null;
        this.lastNetworkHeightUpdate = 0;
        this.networkHeightCacheTime = 60000; // Cache for 1 minute
    }

    async makeRpcCall(method, params = {}) {
        try {
            const response = await axios.post(this.rpcUrl, {
                method,
                params
            }, { 
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || 'Unknown error'}`);
            }

            return response.data.result || response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Kaspa node - service may be down');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Kaspa node request timed out');
            }
            throw error;
        }
    }

    async getNodeInfo() {
        const info = await this.makeRpcCall('getInfo');
        return {
            serverVersion: info.serverVersion,
            isSynced: info.isSynced,
            peerCount: info.peerCount || 0,
            networkName: info.networkName || 'mainnet',
            mempoolSize: info.mempoolSize || 0,
            hasUtxoIndex: info.hasUtxoIndex || false,
            isArchivalNode: info.isArchivalNode || false
        };
    }

    async getBlockDagInfo() {
        const blockDag = await this.makeRpcCall('getBlockDagInfo');
        return {
            virtualSelectedParentBlueScore: blockDag.virtualSelectedParentBlueScore,
            difficulty: blockDag.difficulty,
            tipHashes: blockDag.tipHashes || [],
            virtualDaaScore: blockDag.virtualDaaScore,
            pruningPointHash: blockDag.pruningPointHash,
            virtualParentHashes: blockDag.virtualParentHashes || []
        };
    }

    async getCurrentNetwork() {
        try {
            const network = await this.makeRpcCall('getCurrentNetwork');
            return network;
        } catch (error) {
            // Fallback to mainnet if the call fails
            return { networkName: 'mainnet' };
        }
    }

    async getPeerInfo() {
        try {
            const peers = await this.makeRpcCall('getPeerAddresses');
            const connectedPeers = await this.makeRpcCall('getConnectedPeerInfo');
            
            return {
                knownAddresses: peers?.addresses?.length || 0,
                connectedPeers: connectedPeers?.infos?.length || 0,
                peerDetails: connectedPeers?.infos || []
            };
        } catch (error) {
            // Return basic info if detailed peer info fails
            const nodeInfo = await this.getNodeInfo();
            return {
                knownAddresses: 0,
                connectedPeers: nodeInfo.peerCount,
                peerDetails: []
            };
        }
    }

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
                // Estimate time remaining based on sync progress
                // This is a rough estimate - actual sync speed varies
                const blocksRemaining = networkHeight - currentHeight;
                const avgBlockTime = 1; // Kaspa has ~1 second block time
                estimatedTimeRemaining = blocksRemaining * avgBlockTime;
            }
        }

        return {
            isSynced: nodeInfo.isSynced,
            currentHeight,
            networkHeight,
            progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
            estimatedTimeRemaining,
            syncState: this.determineSyncState(nodeInfo.isSynced, progress)
        };
    }

    async getNetworkHeight() {
        const now = Date.now();
        
        // Use cached network height if it's recent
        if (this.networkHeight && (now - this.lastNetworkHeightUpdate) < this.networkHeightCacheTime) {
            return this.networkHeight;
        }

        try {
            // Try to get network height from a public API or estimate
            // For now, we'll use the current node height as a baseline
            const blockDag = await this.getBlockDagInfo();
            const nodeInfo = await this.getNodeInfo();
            
            if (nodeInfo.isSynced) {
                this.networkHeight = blockDag.virtualSelectedParentBlueScore;
                this.lastNetworkHeightUpdate = now;
            } else {
                // If not synced, estimate based on time since genesis
                // This is a rough approximation
                const kaspaGenesis = new Date('2021-11-07T00:00:00Z').getTime();
                const secondsSinceGenesis = (now - kaspaGenesis) / 1000;
                const estimatedBlocks = Math.floor(secondsSinceGenesis / 1); // ~1 second per block
                this.networkHeight = Math.max(estimatedBlocks, blockDag.virtualSelectedParentBlueScore);
            }
            
            return this.networkHeight;
        } catch (error) {
            console.warn('Failed to get network height:', error.message);
            return null;
        }
    }

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

    estimateHashRate(difficulty) {
        // This is a rough estimation - actual hash rate calculation is complex
        // Kaspa uses a different difficulty algorithm than Bitcoin
        if (!difficulty || difficulty === 0) {
            return 0;
        }
        
        // Simplified hash rate estimation (this would need refinement for accuracy)
        const hashRate = difficulty * Math.pow(2, 32) / 1000000000000; // Convert to TH/s
        return Math.round(hashRate * 100) / 100; // Round to 2 decimal places
    }

    async getNodeUptime() {
        try {
            const info = await this.getNodeInfo();
            // If the node provides uptime info, use it
            // Otherwise, we'll need to track this separately
            return info.uptime || null;
        } catch (error) {
            return null;
        }
    }

    async getMempoolInfo() {
        try {
            const mempoolEntries = await this.makeRpcCall('getMempoolEntries');
            const nodeInfo = await this.getNodeInfo();
            
            return {
                transactionCount: nodeInfo.mempoolSize,
                entries: mempoolEntries?.entries || [],
                totalSize: mempoolEntries?.entries?.length || 0
            };
        } catch (error) {
            // Fallback to basic mempool info
            const nodeInfo = await this.getNodeInfo();
            return {
                transactionCount: nodeInfo.mempoolSize,
                entries: [],
                totalSize: nodeInfo.mempoolSize
            };
        }
    }

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

    // Utility method to check if node is accessible
    async ping() {
        try {
            await this.makeRpcCall('ping');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Format uptime in human-readable format
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

    // Format hash rate in human-readable format
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