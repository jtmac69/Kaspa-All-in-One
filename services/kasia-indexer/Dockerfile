FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application (if build script exists)
RUN npm run build 2>/dev/null || echo "No build script found, skipping build step"

FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl postgresql-client

# Copy built application
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S kasia && \
    adduser -u 1001 -S kasia -G kasia

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R kasia:kasia /app

USER kasia

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV KASPA_NODE_URL=http://kaspa-node:16111
ENV DATABASE_URL=postgresql://kasia:password@kasia-db:5432/kasia

# Wait for database script
COPY --chown=kasia:kasia wait-for-db.sh /app/
RUN chmod +x /app/wait-for-db.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./wait-for-db.sh && npm start"]