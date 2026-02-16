FROM node:18-alpine

WORKDIR /app

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --only=production

# Copy application code
COPY backend/src/ ./src/

# Copy frontend files
COPY frontend/public/ ./public/

# Copy frontend node_modules for browser access
COPY frontend/node_modules/ ./public/node_modules/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]
