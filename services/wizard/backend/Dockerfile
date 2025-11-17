FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Copy frontend files
COPY ../frontend/public/ ./frontend/public/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]
