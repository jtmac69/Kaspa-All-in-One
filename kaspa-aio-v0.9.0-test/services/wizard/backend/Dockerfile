FROM node:18-alpine

WORKDIR /app

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy application code
COPY backend/src/ ./src/

# Copy frontend files
COPY frontend/public/ ./public/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]
