FROM golang:1.23-alpine AS builder

# Build argument for version/branch
ARG STRATUM_VERSION=master

WORKDIR /build

# Install git and build dependencies
RUN apk add --no-cache git build-base

# Clone the kaspa-stratum-bridge repository
RUN echo "Cloning kaspa-stratum-bridge version: ${STRATUM_VERSION}" && \
    git clone --depth 1 --branch ${STRATUM_VERSION} https://github.com/aglov413/kaspa-stratum-bridge.git . || \
    git clone https://github.com/aglov413/kaspa-stratum-bridge.git . && \
    echo "Repository cloned successfully"

# Download dependencies
RUN go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o kaspa-stratum ./cmd/kaspabridge

FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata netcat-openbsd

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /build/kaspa-stratum .

# Create non-root user
RUN addgroup -g 1001 -S kaspa && \
    adduser -u 1001 -S kaspa -G kaspa && \
    chown -R kaspa:kaspa /app

USER kaspa

# Expose stratum port
EXPOSE 5555

# Health check - verify stratum port is listening
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD nc -z localhost 5555 || exit 1

# Default configuration
ENV KASPA_RPC_SERVER=kaspa-node:16111
ENV STRATUM_PORT=5555
ENV LOG_LEVEL=info
ENV MIN_SHARE_DIFF=4
ENV EXTRA_NONCE_SIZE=0

# Run the stratum bridge
CMD ["./kaspa-stratum"]