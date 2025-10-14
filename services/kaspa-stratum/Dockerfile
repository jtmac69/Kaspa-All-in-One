FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git build-base

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o kaspa-stratum ./cmd/kaspabridge

FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/kaspa-stratum .

# Create non-root user
RUN addgroup -g 1001 -S kaspa && \
    adduser -u 1001 -S kaspa -G kaspa

# Change ownership
RUN chown -R kaspa:kaspa /app
USER kaspa

# Expose stratum port
EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD nc -z localhost 5555 || exit 1

# Default configuration
ENV KASPA_RPC_SERVER=kaspa-node:16111
ENV STRATUM_PORT=5555
ENV LOG_LEVEL=info

CMD ["./kaspa-stratum"]