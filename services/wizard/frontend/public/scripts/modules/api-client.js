/**
 * API Client Module
 * Handles all communication with the wizard backend
 */

const API_BASE = window.location.origin + '/api';

export const api = {
    /**
     * GET request
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || response.statusText);
            }
            return response.json();
        } catch (error) {
            console.error(`API GET ${endpoint} failed:`, error);
            throw error;
        }
    },
    
    /**
     * POST request
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || response.statusText);
            }
            return response.json();
        } catch (error) {
            console.error(`API POST ${endpoint} failed:`, error);
            throw error;
        }
    },
    
    /**
     * DELETE request
     */
    async delete(endpoint) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || response.statusText);
            }
            return response.json();
        } catch (error) {
            console.error(`API DELETE ${endpoint} failed:`, error);
            throw error;
        }
    }
};

/**
 * WebSocket Manager
 */
export class WebSocketManager {
    constructor() {
        this.socket = null;
        this.handlers = new Map();
    }
    
    connect() {
        if (this.socket?.connected) {
            return this.socket;
        }
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
        
        // Set up event handlers
        this.handlers.forEach((handler, event) => {
            this.socket.on(event, handler);
        });
        
        return this.socket;
    }
    
    on(event, handler) {
        this.handlers.set(event, handler);
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }
    
    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
