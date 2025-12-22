const compression = require('compression');

/**
 * Performance Optimization Module
 * Handles various performance optimizations for the dashboard
 */

/**
 * Request queue manager to limit concurrent API requests
 */
class RequestQueue {
    constructor(maxConcurrent = 5) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    async add(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { requestFn, resolve, reject } = this.queue.shift();

        try {
            const result = await requestFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }

    getStats() {
        return {
            running: this.running,
            queued: this.queue.length,
            maxConcurrent: this.maxConcurrent
        };
    }
}

/**
 * Response caching middleware
 */
class ResponseCache {
    constructor(defaultTTL = 30000) { // 30 seconds default
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0
        };
    }

    middleware(ttl = this.defaultTTL) {
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            const key = this.generateKey(req);
            const cached = this.get(key);

            if (cached) {
                this.stats.hits++;
                return res.json(cached.data);
            }

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = (data) => {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    this.set(key, data, ttl);
                }
                return originalJson.call(res, data);
            };

            this.stats.misses++;
            next();
        };
    }

    generateKey(req) {
        return `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }

        return item;
    }

    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
        this.stats.sets++;
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }
}

/**
 * WebSocket message optimization
 */
class WebSocketOptimizer {
    constructor() {
        this.lastMessages = new Map();
        this.compressionThreshold = 1024; // Compress messages larger than 1KB
    }

    /**
     * Optimize message before sending
     */
    optimizeMessage(type, data) {
        const message = { type, data, timestamp: new Date().toISOString() };
        
        // Check if message has changed since last send
        const lastMessage = this.lastMessages.get(type);
        if (lastMessage && this.messagesEqual(lastMessage.data, data)) {
            return null; // Skip sending duplicate message
        }

        // Store current message
        this.lastMessages.set(type, message);

        // Compress large messages
        const messageStr = JSON.stringify(message);
        if (messageStr.length > this.compressionThreshold) {
            return this.compressMessage(message);
        }

        return message;
    }

    /**
     * Check if two messages are equal (shallow comparison for performance)
     */
    messagesEqual(data1, data2) {
        if (typeof data1 !== typeof data2) return false;
        if (typeof data1 !== 'object') return data1 === data2;
        
        // For objects, do a shallow comparison of key properties
        if (data1.timestamp && data2.timestamp) {
            // For timestamped data, compare other properties
            const keys1 = Object.keys(data1).filter(k => k !== 'timestamp');
            const keys2 = Object.keys(data2).filter(k => k !== 'timestamp');
            
            if (keys1.length !== keys2.length) return false;
            
            return keys1.every(key => data1[key] === data2[key]);
        }
        
        return JSON.stringify(data1) === JSON.stringify(data2);
    }

    /**
     * Compress message (simple implementation)
     */
    compressMessage(message) {
        // In a real implementation, you might use zlib compression
        // For now, we'll just remove unnecessary whitespace and optimize structure
        return {
            ...message,
            _compressed: true,
            data: this.optimizeDataStructure(message.data)
        };
    }

    /**
     * Optimize data structure for transmission
     */
    optimizeDataStructure(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.optimizeDataStructure(item));
        }
        
        if (typeof data === 'object' && data !== null) {
            const optimized = {};
            Object.keys(data).forEach(key => {
                const value = data[key];
                // Skip null/undefined values to reduce payload size
                if (value !== null && value !== undefined) {
                    optimized[key] = this.optimizeDataStructure(value);
                }
            });
            return optimized;
        }
        
        return data;
    }

    /**
     * Clear message cache
     */
    clearCache() {
        this.lastMessages.clear();
    }
}

/**
 * DOM update optimizer for frontend
 */
const DOMOptimizer = {
    /**
     * Batch DOM updates to prevent layout thrashing
     */
    batchUpdates: (updates) => {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                resolve();
            });
        });
    },

    /**
     * Debounce function for frequent updates
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function for rate limiting
     */
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Virtual scrolling for large lists
     */
    createVirtualScroller: (container, itemHeight, renderItem) => {
        let items = [];
        let scrollTop = 0;
        let containerHeight = container.clientHeight;
        
        const visibleStart = Math.floor(scrollTop / itemHeight);
        const visibleEnd = Math.min(
            visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
            items.length
        );

        return {
            setItems: (newItems) => {
                items = newItems;
                this.render();
            },
            
            render: () => {
                const fragment = document.createDocumentFragment();
                
                for (let i = visibleStart; i < visibleEnd; i++) {
                    const item = renderItem(items[i], i);
                    item.style.position = 'absolute';
                    item.style.top = `${i * itemHeight}px`;
                    fragment.appendChild(item);
                }
                
                container.innerHTML = '';
                container.appendChild(fragment);
                container.style.height = `${items.length * itemHeight}px`;
            },
            
            onScroll: (newScrollTop) => {
                scrollTop = newScrollTop;
                this.render();
            }
        };
    }
};

/**
 * Resource loading optimizer
 */
const ResourceOptimizer = {
    /**
     * Lazy load images and other resources
     */
    lazyLoad: (selector = '[data-lazy]') => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const src = element.dataset.lazy;
                    
                    if (element.tagName === 'IMG') {
                        element.src = src;
                    } else {
                        element.style.backgroundImage = `url(${src})`;
                    }
                    
                    element.removeAttribute('data-lazy');
                    observer.unobserve(element);
                }
            });
        });

        document.querySelectorAll(selector).forEach(element => {
            observer.observe(element);
        });

        return observer;
    },

    /**
     * Preload critical resources
     */
    preloadResources: (resources) => {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type || 'fetch';
            if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
            document.head.appendChild(link);
        });
    },

    /**
     * Service worker for caching (if supported)
     */
    registerServiceWorker: (swPath = '/sw.js') => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
};

/**
 * Performance monitoring
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiRequests: [],
            renderTimes: [],
            memoryUsage: [],
            errors: []
        };
        this.startTime = Date.now();
    }

    /**
     * Record API request performance
     */
    recordAPIRequest(endpoint, duration, success = true) {
        this.metrics.apiRequests.push({
            endpoint,
            duration,
            success,
            timestamp: Date.now()
        });

        // Keep only last 100 requests
        if (this.metrics.apiRequests.length > 100) {
            this.metrics.apiRequests.shift();
        }
    }

    /**
     * Record render performance
     */
    recordRenderTime(component, duration) {
        this.metrics.renderTimes.push({
            component,
            duration,
            timestamp: Date.now()
        });

        // Keep only last 50 render times
        if (this.metrics.renderTimes.length > 50) {
            this.metrics.renderTimes.shift();
        }
    }

    /**
     * Record memory usage (if available)
     */
    recordMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage.push({
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            });

            // Keep only last 20 memory readings
            if (this.metrics.memoryUsage.length > 20) {
                this.metrics.memoryUsage.shift();
            }
        }
    }

    /**
     * Get performance statistics
     */
    getStats() {
        const now = Date.now();
        const uptime = now - this.startTime;

        const apiStats = this.calculateAPIStats();
        const renderStats = this.calculateRenderStats();
        const memoryStats = this.calculateMemoryStats();

        return {
            uptime,
            api: apiStats,
            rendering: renderStats,
            memory: memoryStats,
            errors: this.metrics.errors.length
        };
    }

    calculateAPIStats() {
        const requests = this.metrics.apiRequests;
        if (requests.length === 0) return null;

        const durations = requests.map(r => r.duration);
        const successCount = requests.filter(r => r.success).length;

        return {
            total: requests.length,
            successRate: successCount / requests.length,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            maxDuration: Math.max(...durations),
            minDuration: Math.min(...durations)
        };
    }

    calculateRenderStats() {
        const renders = this.metrics.renderTimes;
        if (renders.length === 0) return null;

        const durations = renders.map(r => r.duration);

        return {
            total: renders.length,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            maxDuration: Math.max(...durations),
            minDuration: Math.min(...durations)
        };
    }

    calculateMemoryStats() {
        const memory = this.metrics.memoryUsage;
        if (memory.length === 0) return null;

        const latest = memory[memory.length - 1];
        const usagePercent = (latest.used / latest.total) * 100;

        return {
            current: latest,
            usagePercent,
            trend: memory.length > 1 ? 
                latest.used - memory[memory.length - 2].used : 0
        };
    }
}

/**
 * Compression middleware configuration
 */
const compressionOptions = {
    // Compression level (1-9, 6 is default)
    level: 6,
    
    // Minimum response size to compress
    threshold: 1024,
    
    // Filter function to determine what to compress
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        
        // Use compression filter
        return compression.filter(req, res);
    }
};

module.exports = {
    RequestQueue,
    ResponseCache,
    WebSocketOptimizer,
    DOMOptimizer,
    ResourceOptimizer,
    PerformanceMonitor,
    compressionOptions
};