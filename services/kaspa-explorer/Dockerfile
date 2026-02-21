# Kaspa Explorer Dockerfile
# Builds from https://github.com/lAmeR1/kaspa-explorer

FROM node:25-alpine AS builder

# Install git
RUN apk add --no-cache git

# Clone the repository
WORKDIR /app
RUN git clone https://github.com/lAmeR1/kaspa-explorer.git .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Find and move the build output to a consistent location
RUN if [ -d "dist" ]; then \
      echo "Found dist directory"; \
      mv dist build-output; \
    elif [ -d "build" ]; then \
      echo "Found build directory"; \
      mv build build-output; \
    elif [ -d "out" ]; then \
      echo "Found out directory"; \
      mv out build-output; \
    elif [ -d "public" ]; then \
      echo "Found public directory"; \
      mv public build-output; \
    else \
      echo "ERROR: No build output directory found!"; \
      ls -la /app/; \
      exit 1; \
    fi

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built files to nginx from our standardized location
COPY --from=builder /app/build-output /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (mapped to 3004 externally)
EXPOSE 80

# Health check - use dedicated health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
