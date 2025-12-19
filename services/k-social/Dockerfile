FROM node:20-alpine AS builder

# Build arguments for version control
ARG K_SOCIAL_VERSION=master

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Clone K Social App repository at build time
RUN git clone --depth 1 --branch ${K_SOCIAL_VERSION} https://github.com/thesheepcat/K.git /app

WORKDIR /app

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install runtime dependencies
RUN apk add --no-cache curl gettext

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Create non-root user for nginx
RUN addgroup -g 1001 -S ksocial && \
    adduser -u 1001 -S ksocial -G ksocial

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R ksocial:ksocial /var/cache/nginx /var/log/nginx /usr/share/nginx/html

# Default indexer URL (can be overridden by environment variable)
ENV KSOCIAL_INDEXER_URL=https://indexer0.kaspatalk.net/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Use nginx's default entrypoint which handles template substitution
# The nginx:alpine image automatically processes files in /etc/nginx/templates/
# and substitutes environment variables