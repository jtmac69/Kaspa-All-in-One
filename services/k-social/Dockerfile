FROM node:25-alpine AS builder

# Build arguments for version control
# Set to "latest" to automatically fetch the most recent release tag
# Set to a specific tag (e.g., "v1.0.0") to pin to that version
# Set to "master" to use the development branch
ARG K_SOCIAL_VERSION=latest

# Install build dependencies (including curl and jq for GitHub API)
RUN apk add --no-cache python3 make g++ git curl jq

# Fetch the latest release tag if K_SOCIAL_VERSION is "latest"
# Otherwise use the specified version
RUN if [ "$K_SOCIAL_VERSION" = "latest" ]; then \
      echo "Fetching latest release from GitHub..." && \
      LATEST_TAG=$(curl -s https://api.github.com/repos/thesheepcat/K/releases/latest | jq -r '.tag_name // empty') && \
      if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then \
        echo "No releases found, checking for tags..." && \
        LATEST_TAG=$(curl -s https://api.github.com/repos/thesheepcat/K/tags | jq -r '.[0].name // empty') && \
        if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then \
          echo "No tags found, falling back to master branch" && \
          LATEST_TAG="master"; \
        fi; \
      fi && \
      echo "Using version: $LATEST_TAG" && \
      git clone --depth 1 --branch "$LATEST_TAG" https://github.com/thesheepcat/K.git /app; \
    else \
      echo "Using specified version: $K_SOCIAL_VERSION" && \
      git clone --depth 1 --branch "$K_SOCIAL_VERSION" https://github.com/thesheepcat/K.git /app; \
    fi

# Save the version used for reference
RUN cd /app && echo "K_SOCIAL_VERSION=$(git describe --tags --always 2>/dev/null || echo 'unknown')" > /app/.version

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

# Copy version info for debugging
COPY --from=builder /app/.version /usr/share/nginx/html/.version

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
